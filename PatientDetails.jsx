import React, { useState, useEffect } from 'react';
import { 
  Heart, 
  Thermometer, 
  Activity, 
  Wind, 
  Clock, 
  ChevronLeft,
  ArrowUpDown,
  History,
  AlertTriangle,
  UserCheck
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';

const getPatientRegionById = (pId) => {
  if (pId === "P003" || pId === "P007" || pId === "P012") return "Chest";
  if (pId === "P005" || pId === "P008" || pId === "P011") return "Abdomen";
  if (pId === "P006" || pId === "P009") return "Full Body";
  return "Forehead";
};

function PatientDetails({ patientId, patientsList, onSelectPatient, apiBase }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch patient detail
  const fetchDetail = async () => {
    if (!patientId) return;
    try {
      const res = await fetch(`${apiBase}/patients/${patientId}`);
      if (res.ok) {
        const detailData = await res.json();
        setData(detailData);
      }
    } catch (error) {
      console.error("Error fetching patient details:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchDetail();
    // Poll single patient details every 3 seconds for live updates
    const interval = setInterval(fetchDetail, 3000);
    return () => clearInterval(interval);
  }, [patientId]);

  if (!patientId) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500 font-bold">
        Please select a patient from the Ward Dashboard to view their monitoring details.
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <div className="w-8 h-8 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
        <p className="text-xs font-bold text-slate-400">Loading monitoring data...</p>
      </div>
    );
  }

  const { latest_vital, vitals_history, active_alerts } = data;

  // Formatting helper
  const formatTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: '2-digit' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Helper for metric boundaries color style
  const getVitalCardStyle = (name, val, val2 = null) => {
    let alert = 0;
    if (name === 'hr') {
      if (val < 40 || val > 130) alert = 3;
      else if ((40 <= val && val <= 49) || (111 <= val && val <= 130)) alert = 2;
      else if ((50 <= val && val <= 59) || (101 <= val && val <= 110)) alert = 1;
    } else if (name === 'spo2') {
      if (val < 90) alert = 3;
      else if (90 <= val && val <= 92) alert = 2;
      else if (93 <= val && val <= 94) alert = 1;
    } else if (name === 'bp') {
      // sbp and dbp
      const sbp = val;
      const dbp = val2;
      let sbp_a = 0;
      let dbp_a = 0;
      if (sbp < 80 || sbp > 180) sbp_a = 3;
      else if ((80 <= sbp && sbp <= 84) || (140 <= sbp && sbp <= 180)) sbp_a = 2;
      else if ((85 <= sbp && sbp <= 89) || (121 <= sbp && sbp <= 139)) sbp_a = 1;

      if (dbp < 50 || dbp > 110) dbp_a = 3;
      else if ((50 <= dbp && dbp <= 54) || (90 <= dbp && dbp <= 110)) dbp_a = 2;
      else if ((55 <= dbp && dbp <= 59) || (81 <= dbp && dbp <= 89)) dbp_a = 1;

      alert = Math.max(sbp_a, dbp_a);
    } else if (name === 'temp') {
      if (val < 35.0 || val > 39.0) alert = 3;
      else if ((35.0 <= val && val <= 35.4) || (38.1 <= val && val <= 39.0)) alert = 2;
      else if ((35.5 <= val && val <= 36.0) || (37.3 <= val && val <= 38.0)) alert = 1;
    } else if (name === 'rr') {
      if (val < 8 || val > 30) alert = 3;
      else if ((8 <= val && val <= 9) || (25 <= val && val <= 30)) alert = 2;
      else if ((10 <= val && val <= 11) || (21 <= val && val <= 24)) alert = 1;
    }

    if (alert === 3) return 'bg-red-50 border-red-200 text-red-900 animate-pulse-critical border-2';
    if (alert === 2) return 'bg-orange-50 border-orange-200 text-orange-900 border-2';
    if (alert === 1) return 'bg-amber-50 border-amber-200 text-amber-900 border';
    return 'bg-white border-slate-200 text-slate-900';
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Stable': return 'Stable Condition';
      case 'Warning': return 'Warning state - Mild Anomaly';
      case 'High Alert': return 'High Alert - Serious Conditions';
      case 'Critical': return 'Critical - Life Threatening!';
      default: return 'No Reading';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Stable': return 'bg-emerald-500 text-white';
      case 'Warning': return 'bg-amber-500 text-white';
      case 'High Alert': return 'bg-orange-500 text-white';
      case 'Critical': return 'bg-red-500 text-white animate-pulse';
      default: return 'bg-slate-400 text-white';
    }
  };

  const getHealthDialGradient = (score) => {
    if (score >= 90) return '#10B981'; // Green
    if (score >= 75) return '#F59E0B'; // Yellow
    if (score >= 50) return '#F97316'; // Orange
    return '#EF4444'; // Red
  };

  // Radial Dial calculations
  const radius = 55;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const healthScore = latest_vital ? latest_vital.health_score : 100;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  // Prepare chart data with clean timestamps
  const chartData = vitals_history.map(item => ({
    time: formatTime(item.timestamp),
    hr: item.heart_rate,
    spo2: item.spo2,
    sbp: item.systolic_bp,
    dbp: item.diastolic_bp,
    temp: item.temperature,
    rr: item.respiratory_rate,
    score: item.health_score
  }));

  return (
    <div className="flex flex-col gap-6">
      {/* Selector and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-soft">
        <div className="flex items-center gap-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Patient Monitoring Portal</h2>
            <p className="text-xs text-slate-500 font-semibold">Select and inspect active clinical vitals history</p>
          </div>
        </div>

        {/* Patient Switcher Dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500 uppercase shrink-0">Switch Patient:</span>
          <select
            value={patientId}
            onChange={(e) => onSelectPatient(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            {patientsList.map(p => (
              <option key={p.id} value={p.id}>{p.id} - {p.name} ({p.ward_no})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient Profile and Health Dial Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft flex flex-col justify-between md:col-span-2">
          <div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-md border border-blue-100 uppercase tracking-wider">
                  {data.medical_condition}
                </span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-2">{data.name}</h3>
                <p className="text-xs text-slate-400 font-bold mt-1">Patient ID: {data.id} • Ward {data.ward_no} • Bed {data.bed_no}</p>
              </div>
              <div className={`px-4 py-2 rounded-xl text-xs font-extrabold shadow-sm ${getStatusColor(latest_vital?.status)}`}>
                {latest_vital ? latest_vital.status : 'Stable'}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 border-t border-slate-100 pt-6 mt-6">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Age</span>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">{data.age} years</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Gender</span>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">{data.gender}</p>
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Bed Assignment</span>
                <p className="text-base font-extrabold text-slate-800 mt-0.5">Bed {data.bed_no}</p>
              </div>
            </div>
          </div>

          {active_alerts.length > 0 ? (
            <div className="bg-red-50 border border-red-100 rounded-xl p-3 mt-4 flex items-start gap-2.5">
              <AlertTriangle className="h-4.5 w-4.5 text-red-600 shrink-0 mt-0.5 animate-bounce" />
              <div>
                <span className="text-xs font-bold text-red-900">Active Alert:</span>
                <p className="text-[11px] font-semibold text-red-700 mt-0.5">
                  {active_alerts[0].alert_type} ({active_alerts[0].current_value})
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 mt-4 flex items-center gap-2.5 text-emerald-800">
              <UserCheck className="h-4.5 w-4.5 text-emerald-600 shrink-0" />
              <span className="text-xs font-bold">No active anomalies or warning triggers.</span>
            </div>
          )}
        </div>

        {/* Health Score Gauge Dial */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">ML Health Score</span>
          
          <div className="relative flex items-center justify-center">
            {/* SVG Progress Circle */}
            <svg width="130" height="130" className="transform -rotate-90">
              <circle
                cx="65"
                cy="65"
                r={radius}
                fill="transparent"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />
              <circle
                cx="65"
                cy="65"
                r={radius}
                fill="transparent"
                stroke={getHealthDialGradient(healthScore)}
                strokeWidth={strokeWidth}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-1000 ease-out"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-3xl font-black text-slate-900 tracking-tight">{healthScore}</span>
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">out of 100</span>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-sm font-bold text-slate-800">{getStatusText(latest_vital?.status)}</p>
            <p className="text-[10px] text-slate-400 font-bold mt-0.5">Updated: {latest_vital ? formatTime(latest_vital.timestamp) : '--:--'}</p>
          </div>
        </div>
      </div>

      {/* Vital Sign Cards Row */}
      {latest_vital && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {/* Heart Rate */}
          <div className={`p-4 rounded-xl border shadow-sm ${getVitalCardStyle('hr', latest_vital.heart_rate)}`}>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Heart Rate</span>
              <Heart className="h-4.5 w-4.5 text-red-500 animate-heartbeat" />
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{latest_vital.heart_rate}</span>
                <span className="text-[10px] font-bold text-slate-400">bpm</span>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 block mt-1">Normal: 60-100</span>
            </div>
          </div>

          {/* SpO2 */}
          <div className={`p-4 rounded-xl border shadow-sm ${getVitalCardStyle('spo2', latest_vital.spo2)}`}>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">SpO₂ Oxygen</span>
              <Wind className="h-4.5 w-4.5 text-blue-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{latest_vital.spo2}</span>
                <span className="text-[10px] font-bold text-slate-400">%</span>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 block mt-1">Normal: 95-100</span>
            </div>
          </div>

          {/* Blood Pressure */}
          <div className={`p-4 rounded-xl border shadow-sm ${getVitalCardStyle('bp', latest_vital.systolic_bp, latest_vital.diastolic_bp)}`}>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Blood Pressure</span>
              <Activity className="h-4.5 w-4.5 text-purple-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{latest_vital.systolic_bp}/{latest_vital.diastolic_bp}</span>
                <span className="text-[10px] font-bold text-slate-400">mmHg</span>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 block mt-1">Normal: 120/80</span>
            </div>
          </div>

          {/* Temperature */}
          <div className={`p-4 rounded-xl border shadow-sm ${getVitalCardStyle('temp', latest_vital.temperature)}`}>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Temperature</span>
              <Thermometer className="h-4.5 w-4.5 text-amber-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{latest_vital.temperature}</span>
                <span className="text-[10px] font-bold text-slate-400">°C</span>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 block mt-1">Normal: 36.1-37.2</span>
            </div>
          </div>

          {/* Respiratory Rate */}
          <div className={`p-4 rounded-xl border shadow-sm ${getVitalCardStyle('rr', latest_vital.respiratory_rate)}`}>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-[10px] font-bold uppercase tracking-wider">Resp. Rate</span>
              <Activity className="h-4.5 w-4.5 text-indigo-500" />
            </div>
            <div className="mt-2.5">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black">{latest_vital.respiratory_rate}</span>
                <span className="text-[10px] font-bold text-slate-400">/min</span>
              </div>
              <span className="text-[9px] font-semibold text-slate-400 block mt-1">Normal: 12-20</span>
            </div>
          </div>
        </div>
      )}

      {/* CareSync AI — Thermal Camera Telemetry Card */}
      {latest_vital && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
            <div className="flex items-center gap-2">
              <Thermometer className="h-5 w-5 text-purple-600 animate-pulse" />
              <h3 className="text-sm font-extrabold text-slate-900 uppercase tracking-wider">CareSync AI — Thermal Camera Module Insights</h3>
            </div>
            <span className="text-[10px] font-extrabold bg-purple-50 text-purple-700 px-2 py-0.5 rounded border border-purple-100 uppercase tracking-widest">
              Live Thermal Stream
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {/* Scanned Region */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Scanned Body Region</span>
              <div className="mt-2">
                <span className="text-lg font-black text-slate-800 font-sans">
                  {latest_vital.patient_id ? getPatientRegionById(latest_vital.patient_id) : 'Forehead'}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">Configured for {data.medical_condition}</span>
            </div>

            {/* Thermal Risk status (RF Classifier) */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">RF Risk Classification</span>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${
                  latest_vital.temp_status === 'Critical' ? 'bg-red-100 text-red-800 border border-red-200 animate-pulse' :
                  latest_vital.temp_status === 'Warning' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                  'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {latest_vital.temp_status || 'Normal'}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">Random Forest Prediction</span>
            </div>

            {/* Isolation Forest Outlier status */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outlier Anomaly Status</span>
              <div className="mt-2">
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  latest_vital.temp_anomaly && latest_vital.temp_anomaly !== 'Stable'
                    ? 'bg-red-100 text-red-800 border border-red-300 animate-pulse-critical'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                }`}>
                  {latest_vital.temp_anomaly || 'Stable'}
                </span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">Isolation Forest Check</span>
            </div>

            {/* LSTM Temperature Forecast */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">10-Min Future Forecast</span>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-xl font-black text-purple-700">
                  {latest_vital.temp_forecast ? latest_vital.temp_forecast.toFixed(1) : latest_vital.temperature.toFixed(1)}
                </span>
                <span className="text-xs font-bold text-purple-400">°C</span>
              </div>
              <span className="text-[9px] text-slate-400 mt-1">LSTM Sequence Prediction</span>
            </div>
          </div>
        </div>
      )}

      {/* Historical Trend Charts Section */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
            <History className="h-4.5 w-4.5 text-blue-600" /> Vitals History & Trends
          </h3>
          <p className="text-xs text-slate-400 font-bold">Comprehensive real-time telemetry analytics (last 100 entries)</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs font-semibold">
          {/* Heart Rate Chart */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Heart className="h-4 w-4 text-red-500 animate-heartbeat" /> Heart Rate Trend
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="time" stroke="#94A3B8" />
                  <YAxis stroke="#EF4444" domain={[30, 160]} label={{ value: 'bpm', angle: -90, position: 'insideLeft', offset: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="hr" stroke="#EF4444" name="Heart Rate" strokeWidth={2.5} dot={false} activeDot={{ r: 6 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Blood Pressure Chart */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-purple-500" /> Blood Pressure Trend
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="time" stroke="#94A3B8" />
                  <YAxis stroke="#8B5CF6" domain={[40, 210]} label={{ value: 'mmHg', angle: -90, position: 'insideLeft', offset: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="sbp" stroke="#8B5CF6" name="Systolic BP" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="dbp" stroke="#C084FC" name="Diastolic BP" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Oxygen & Resp Chart */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Wind className="h-4 w-4 text-blue-500" /> Oxygen (SpO₂) & Resp Rate
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="time" stroke="#94A3B8" />
                  <YAxis yAxisId="left" stroke="#3B82F6" domain={[80, 102]} label={{ value: 'SpO₂ (%)', angle: -90, position: 'insideLeft', offset: 10 }} />
                  <YAxis yAxisId="right" orientation="right" stroke="#6366F1" domain={[5, 40]} label={{ value: 'RR (/min)', angle: 90, position: 'insideRight', offset: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="spo2" stroke="#3B82F6" name="SpO₂" strokeWidth={2.5} dot={false} />
                  <Line yAxisId="right" type="monotone" dataKey="rr" stroke="#6366F1" name="Resp. Rate" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Temperature Chart */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Thermometer className="h-4 w-4 text-amber-500" /> Temperature Trend
            </h4>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                  <XAxis dataKey="time" stroke="#94A3B8" />
                  <YAxis stroke="#F59E0B" domain={[34.0, 42.0]} label={{ value: '°C', angle: -90, position: 'insideLeft', offset: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="temp" stroke="#F59E0B" name="Body Temp" strokeWidth={2.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Vitals History Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Patient Vitals History Log</h3>
            <p className="text-xs text-slate-400 font-bold">Chronological readings log of all telemetry entries</p>
          </div>
          <span className="bg-slate-100 text-slate-600 text-[10px] font-extrabold px-2.5 py-1 rounded-md border border-slate-200">
            Total Logs: {vitals_history.length}
          </span>
        </div>

        <div className="overflow-x-auto max-h-80 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200 sticky top-0">
                <th className="py-3 px-6">Timestamp</th>
                <th className="py-3 px-6">Heart Rate</th>
                <th className="py-3 px-6">SpO₂</th>
                <th className="py-3 px-6">BP (Sys/Dia)</th>
                <th className="py-3 px-6">Temp</th>
                <th className="py-3 px-6">Resp. Rate</th>
                <th className="py-3 px-6 text-center">Score</th>
                <th className="py-3 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-600">
              {vitals_history.slice().reverse().map((vital) => (
                <tr key={vital.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-6 text-slate-500">{formatDate(vital.timestamp)}</td>
                  <td className="py-3.5 px-6 font-bold">{vital.heart_rate} bpm</td>
                  <td className="py-3.5 px-6 font-bold">{vital.spo2}%</td>
                  <td className="py-3.5 px-6 font-bold">{vital.systolic_bp}/{vital.diastolic_bp} mmHg</td>
                  <td className="py-3.5 px-6 font-bold">{vital.temperature} °C</td>
                  <td className="py-3.5 px-6 font-bold">{vital.respiratory_rate}/min</td>
                  <td className="py-3.5 px-6 text-center">
                    <span className="font-extrabold text-slate-900 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded text-xs">
                      {vital.health_score}
                    </span>
                  </td>
                  <td className="py-3.5 px-6">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      vital.status === 'Stable' ? 'bg-emerald-100 text-emerald-800' :
                      vital.status === 'Warning' ? 'bg-amber-100 text-amber-800' :
                      vital.status === 'High Alert' ? 'bg-orange-100 text-orange-800' :
                      'bg-red-100 text-red-800 animate-pulse'
                    }`}>
                      {vital.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default PatientDetails;
