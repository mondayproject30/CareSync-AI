import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  LayoutDashboard, 
  Bell, 
  Brain, 
  UserRound, 
  Play, 
  Pause, 
  RefreshCw, 
  ShieldAlert,
  Stethoscope,
  UserCheck,
  Volume2,
  VolumeX,
  FileText,
  Printer,
  X
} from 'lucide-react';
import Dashboard from './screens/Dashboard';
import PatientDetails from './screens/PatientDetails';
import AlertCenter from './screens/AlertCenter';
import MLPanel from './screens/MLPanel';
import DoctorPortal from './screens/DoctorPortal';
import Login from './screens/Login';
import { auth, signOut, onAuthStateChanged } from './firebase';

const API_BASE = 'http://127.0.0.1:8000/api';

const Logo = ({ className = "h-8 w-8" }) => (
  <svg className={className} viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="logo-grad" x1="0" y1="0" x2="0" y2="100" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stopColor="#00c6ff" />
        <stop offset="100%" stopColor="#0072ff" />
      </linearGradient>
    </defs>
    <path 
      d="M 44 15 h 12 a 8 8 0 0 1 8 8 v 13 h 13 a 8 8 0 0 1 8 8 v 12 a 8 8 0 0 1 -8 8 h -13 v 13 a 8 8 0 0 1 -8 8 h -12 a 8 8 0 0 1 -8 -8 v -13 h -13 a 8 8 0 0 1 -8 -8 v -12 a 8 8 0 0 1 8 -8 h 13 v -13 a 8 8 0 0 1 8 -8 z" 
      fill="url(#logo-grad)" 
    />
    <path 
      d="M 25 50 H 42 L 47 38 L 51 64 L 55 36 L 59 50 H 75" 
      stroke="white" 
      strokeWidth="4.5" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
    />
  </svg>
);


function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedPatientId, setSelectedPatientId] = useState(null);
  
  // Auth State
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  
  // Data State
  const [patients, setPatients] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [summary, setSummary] = useState({
    total_patients: 0,
    stable_count: 0,
    warning_count: 0,
    high_alert_count: 0,
    critical_count: 0
  });
  const [simulatorStatus, setSimulatorStatus] = useState({ running: true, interval_sec: 10 });
  const [loading, setLoading] = useState(true);

  // Audio Alert State
  const [isMuted, setIsMuted] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [mlMetrics, setMlMetrics] = useState([]);

  // Synthesize clinical chime using browser Web Audio API
  const playAlertSound = () => {
    if (isMuted) return;
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      const playTone = (freq, time, duration) => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, time);
        
        gainNode.gain.setValueAtTime(0.06, time);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        
        osc.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        
        osc.start(time);
        osc.stop(time + duration);
      };

      // Play dual-tone clinical chime (A5 followed by C6)
      const now = audioCtx.currentTime;
      playTone(880, now, 0.15); // A5 note (880 Hz)
      playTone(1046.5, now + 0.08, 0.30); // C6 note (1046.5 Hz)
    } catch (err) {
      console.warn("Web Audio API blocked or not supported:", err);
    }
  };

  const prevAlertsRef = useRef([]);

  // Play audio warning when a new active critical alert is added
  useEffect(() => {
    // Only compare if we already have a baseline alerts list loaded
    if (prevAlertsRef.current && prevAlertsRef.current.length > 0) {
      const activeCriticals = alerts.filter(a => a.status === 'Active' && a.priority === 'Critical');
      const hasNewCritical = activeCriticals.some(incoming => 
        !prevAlertsRef.current.some(existing => existing.id === incoming.id)
      );
      if (hasNewCritical) {
        playAlertSound();
      }
    }
    prevAlertsRef.current = alerts;
  }, [alerts, isMuted]);

  // Unlock browser audio context on first user interaction to comply with autoplay policy
  useEffect(() => {
    const unlockAudio = () => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          const tempCtx = new AudioContextClass();
          if (tempCtx.state === 'suspended') {
            tempCtx.resume().then(() => {
              tempCtx.close();
            });
          } else {
            tempCtx.close();
          }
        }
      } catch (err) {
        console.warn("Failed to unlock audio context:", err);
      }
      window.removeEventListener('click', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    return () => window.removeEventListener('click', unlockAudio);
  }, []);

  // Fetch all dashboard data
  const fetchData = async () => {
    try {
      // Fetch Patients
      const patientsRes = await fetch(`${API_BASE}/patients`);
      if (patientsRes.ok) {
        const patientsData = await patientsRes.json();
        setPatients(patientsData);
      }

      // Fetch Alerts
      const alertsRes = await fetch(`${API_BASE}/alerts?status=ActiveOnly`);
      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setAlerts(alertsData);
      }

      // Fetch Summary
      const summaryRes = await fetch(`${API_BASE}/dashboard/stats`);
      if (summaryRes.ok) {
        const summaryData = await summaryRes.json();
        setSummary(summaryData);
      }

      // Fetch Simulator Status
      const simRes = await fetch(`${API_BASE}/simulator/status`);
      if (simRes.ok) {
        const simData = await simRes.json();
        setSimulatorStatus(simData);
      }

      // Fetch ML Metrics
      const mlRes = await fetch(`${API_BASE}/ml/metrics`);
      if (mlRes.ok) {
        const mlData = await mlRes.json();
        setMlMetrics(mlData);
      }
    } catch (error) {
      console.error("Error fetching data from API:", error);
    } finally {
      setLoading(false);
    }
  };

  // Monitor Authentication State
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Initial and periodic fetch
  useEffect(() => {
    if (!user) return;
    fetchData();
    const interval = setInterval(fetchData, 3000); // Poll every 3 seconds for real-time feel
    return () => clearInterval(interval);
  }, [user]);

  const handleSignOut = () => {
    signOut(auth);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0b1329] flex flex-col items-center justify-center gap-4 font-sans">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-slate-700 border-t-blue-500 animate-spin"></div>
          <Activity className="h-5 w-5 text-blue-500 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="text-sm font-semibold text-slate-400 animate-pulse">
          Establishing secure clinical session...
        </p>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  // Action: Toggle Simulator
  const handleToggleSimulator = async () => {
    try {
      const res = await fetch(`${API_BASE}/simulator/toggle?running=${!simulatorStatus.running}`, {
        method: 'POST'
      });
      if (res.ok) {
        const data = await res.json();
        setSimulatorStatus(data);
      }
    } catch (err) {
      console.error("Failed to toggle simulator:", err);
    }
  };

  // Action: Force a simulation step manually
  const handleForceStep = async () => {
    try {
      const res = await fetch(`${API_BASE}/simulator/step`, { method: 'POST' });
      if (res.ok) {
        fetchData();
      }
    } catch (err) {
      console.error("Failed to trigger step:", err);
    }
  };

  const handleSelectPatient = (patientId) => {
    setSelectedPatientId(patientId);
    setActiveTab('details');
  };

  const activeAlertsCount = alerts.filter(a => a.status !== 'Resolved').length;
  const criticalAlertsCount = alerts.filter(a => a.status === 'Active' && a.priority === 'Critical').length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* 5-Second Identification Rule: Flashing Red Alert Bar for Critical Vitals */}
      {criticalAlertsCount > 0 && (
        <div className="bg-red-600 text-white py-2 px-4 flex items-center justify-between text-sm font-semibold animate-pulse-critical z-50 sticky top-0">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 animate-bounce" />
            <span>CRITICAL ALERT: {criticalAlertsCount} patient(s) have life-threatening vital signs! Immediate medical response required.</span>
          </div>
          <button 
            onClick={() => setActiveTab('alerts')}
            className="bg-white text-red-700 px-3 py-1 rounded text-xs hover:bg-red-50 transition-colors uppercase tracking-wider font-bold shadow-sm"
          >
            Go to Alert Center
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 py-4 px-6 flex items-center justify-between shadow-sm sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center drop-shadow hover:scale-105 transition-all">
            <Logo className="h-10 w-10" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-slate-900">CareSync AI</h1>
            <p className="text-xs text-slate-500 font-medium">Real-Time Patient Monitoring & Warning System</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Simulation Control Board */}
          <div className="flex items-center gap-3 bg-slate-100 p-1.5 rounded-xl border border-slate-200">
            <div className="px-3 py-1">
              <span className="text-xs font-bold text-slate-600 uppercase tracking-wider block">Simulator</span>
              <span className="text-[10px] font-semibold text-slate-500">1 Step = 15 Mins</span>
            </div>
            <button
              onClick={handleToggleSimulator}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm ${
                simulatorStatus.running
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white'
              }`}
            >
              {simulatorStatus.running ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {simulatorStatus.running ? 'Pause' : 'Start'}
            </button>
            <button
              onClick={handleForceStep}
              title="Force next time step immediately"
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 p-1.5 rounded-lg shadow-sm"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Audio Alert Control */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            title={isMuted ? "Unmute alert sounds" : "Mute alert sounds"}
            className={`flex items-center justify-center p-2.5 rounded-xl border transition-all shadow-sm active:scale-95 ${
              isMuted 
                ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-600' 
                : 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
            }`}
          >
            {isMuted ? <VolumeX className="h-4 w-4 shrink-0" /> : <Volume2 className="h-4 w-4 shrink-0" />}
          </button>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs font-extrabold text-slate-900 block">
                {user.displayName || user.email.split('@')[0]}
              </span>
              <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                {user.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              className="bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm flex items-center gap-1 active:scale-95"
            >
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 bg-white border-r border-slate-200 flex flex-col p-4 gap-2 shrink-0">
          <nav className="flex flex-col gap-1.5">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <LayoutDashboard className="h-5 w-5" />
              <span>Ward Dashboard</span>
            </button>

            <button
              onClick={() => {
                if (selectedPatientId) {
                  setActiveTab('details');
                } else {
                  // If none selected, default to first patient or alert
                  if (patients.length > 0) {
                    setSelectedPatientId(patients[0].id);
                    setActiveTab('details');
                  }
                }
              }}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'details'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <UserRound className="h-5 w-5" />
              <span>Patient Details</span>
            </button>

            <button
              onClick={() => setActiveTab('alerts')}
              className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'alerts'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5" />
                <span>Alert Center</span>
              </div>
              {activeAlertsCount > 0 && (
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-extrabold shadow-sm ${
                  criticalAlertsCount > 0 ? 'bg-red-500 text-white animate-pulse' : 'bg-amber-500 text-white'
                }`}>
                  {activeAlertsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('doctor')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'doctor'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Stethoscope className="h-5 w-5" />
              <span>Doctor Portal</span>
            </button>

            <button
              onClick={() => setActiveTab('ml')}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'ml'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
            >
              <Brain className="h-5 w-5" />
              <span>ML Classifier Metrics</span>
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all text-slate-600 hover:bg-slate-50 hover:text-slate-900 border border-dashed border-slate-200 mt-1 bg-slate-50/30"
            >
              <FileText className="h-5 w-5 text-purple-600 animate-pulse" />
              <span>Generate Report</span>
            </button>
          </nav>

          {/* Connected Server Indicator */}
          <div className="mt-auto border-t border-slate-100 pt-4 px-4">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Server Status</span>
            </div>
            <p className="text-[10px] font-semibold text-emerald-600 mt-1">Connected: http://127.0.0.1:8000</p>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-96 gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-4 border-slate-200 border-t-blue-600 animate-spin"></div>
                <Activity className="h-5 w-5 text-blue-600 absolute inset-0 m-auto animate-pulse" />
              </div>
              <p className="text-sm font-semibold text-slate-500 animate-pulse">
                Booting CareSync AI models & seeding database...
              </p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <Dashboard 
                  patients={patients} 
                  summary={summary} 
                  onSelectPatient={handleSelectPatient} 
                />
              )}
              {activeTab === 'details' && (
                <PatientDetails 
                  patientId={selectedPatientId} 
                  patientsList={patients}
                  onSelectPatient={setSelectedPatientId}
                  apiBase={API_BASE}
                />
              )}
              {activeTab === 'alerts' && (
                <AlertCenter 
                  apiBase={API_BASE} 
                  onSelectPatient={handleSelectPatient}
                  refreshGlobal={fetchData}
                  activeAlerts={alerts}
                />
              )}
              {activeTab === 'doctor' && (
                <DoctorPortal 
                  apiBase={API_BASE} 
                  onSelectPatient={handleSelectPatient}
                  refreshGlobal={fetchData}
                  activeAlerts={alerts}
                />
              )}
              {activeTab === 'ml' && (
                <MLPanel 
                  apiBase={API_BASE} 
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Clinical & System Performance Report Overlay Modal */}
      {isReportModalOpen && (
        <>
          {/* Visual Screen Modal Overlay */}
          <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 no-print text-slate-800">
            <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col relative animate-fade-in">
              {/* Header */}
              <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
                <div className="flex items-center gap-3">
                  <Logo className="h-7 w-7" />
                  <div>
                    <h3 className="text-lg font-black text-slate-950">Clinical ML & System Performance Report</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CareSync AI Medical System Status</p>
                  </div>
                </div>
                <button 
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Document Body */}
              <div className="p-8 flex-1 flex flex-col gap-6">
                {/* 1. Header Metadata */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
                  <div>
                    <h4 className="text-2xl font-black text-slate-950 tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">CareSync AI</h4>
                    <p className="text-xs text-slate-500 mt-1 font-semibold">Real-Time Patient Monitoring & Warning System</p>
                  </div>
                  <div className="text-left sm:text-right text-xs text-slate-500 font-bold">
                    <div>Report Generated: {new Date().toLocaleString()}</div>
                    <div className="mt-1">Inference Engine State: Active</div>
                  </div>
                </div>

                {/* 2. Ward Statistics */}
                <div>
                  <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">1. Live Ward Telemetry Summary</h5>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Patients</span>
                      <span className="text-2xl font-black text-slate-800 mt-1 block">{summary.total_patients}</span>
                    </div>
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                      <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider block">Stable</span>
                      <span className="text-2xl font-black text-emerald-700 mt-1 block">{summary.stable_count}</span>
                    </div>
                    <div className="bg-amber-50 p-4 rounded-xl border border-amber-100 text-center">
                      <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider block">Warnings</span>
                      <span className="text-2xl font-black text-amber-700 mt-1 block">{summary.warning_count}</span>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-xl border border-orange-100 text-center">
                      <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider block">High Alerts</span>
                      <span className="text-2xl font-black text-orange-700 mt-1 block">{summary.high_alert_count}</span>
                    </div>
                    <div className="bg-red-50 p-4 rounded-xl border border-red-100 text-center">
                      <span className="text-[10px] font-bold text-red-600 uppercase tracking-wider block">Criticals</span>
                      <span className="text-2xl font-black text-red-700 mt-1 block">{summary.critical_count}</span>
                    </div>
                  </div>
                </div>

                {/* 3. Active Alerts List */}
                <div>
                  <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">2. Active Incident Alert Queue</h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-4">Timestamp</th>
                          <th className="py-2.5 px-4">Patient Name</th>
                          <th className="py-2.5 px-4">Ward / Bed</th>
                          <th className="py-2.5 px-4">Alert Cause</th>
                          <th className="py-2.5 px-4 text-center">Severity</th>
                          <th className="py-2.5 px-4 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                        {alerts.length > 0 ? (
                          alerts.map((alert) => (
                            <tr key={alert.id} className={alert.priority === 'Critical' ? 'bg-red-50/10' : ''}>
                              <td className="py-2.5 px-4">{new Date(alert.timestamp).toLocaleTimeString()}</td>
                              <td className="py-2.5 px-4 font-bold text-slate-900">{alert.patient_name}</td>
                              <td className="py-2.5 px-4">Ward {alert.ward_no}</td>
                              <td className="py-2.5 px-4 text-slate-800">{alert.alert_type}</td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  alert.priority === 'Critical' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {alert.priority}
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-right uppercase text-[10px] font-extrabold text-slate-500">{alert.status}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-6 text-center text-slate-400 font-bold">No active patient alerts. Ward status stable.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. ML Models Summary */}
                <div>
                  <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">3. Classifier Metrics Summary</h5>
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                          <th className="py-2.5 px-4">Classifier Architecture</th>
                          <th className="py-2.5 px-4 text-center">Accuracy (%)</th>
                          <th className="py-2.5 px-4 text-center">Precision (%)</th>
                          <th className="py-2.5 px-4 text-center">Recall (%)</th>
                          <th className="py-2.5 px-4 text-center">F1-Score (%)</th>
                          <th className="py-2.5 px-4 text-right">Inference State</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                        {mlMetrics.length > 0 ? (
                          mlMetrics.map((model) => (
                            <tr key={model.model_name} className={model.is_best ? 'bg-purple-50/10' : ''}>
                              <td className="py-2.5 px-4 font-bold text-slate-900">{model.model_name}</td>
                              <td className="py-2.5 px-4 text-center">{model.accuracy}%</td>
                              <td className="py-2.5 px-4 text-center">{model.precision}%</td>
                              <td className="py-2.5 px-4 text-center">{model.recall}%</td>
                              <td className="py-2.5 px-4 text-center font-bold text-slate-900">{model.f1_score}%</td>
                              <td className="py-2.5 px-4 text-right text-purple-705 font-extrabold text-[10px]">
                                {model.is_best ? 'ACTIVE INFERENCE' : 'IDLE'}
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="py-6 text-center text-slate-400 font-bold">No evaluation log metrics active.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Signatures */}
                <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-8 text-[11px] text-slate-400 font-bold">
                  <div>
                    <div className="border-t border-slate-200 w-48 pt-2">CareSync AI System Auditor</div>
                    <div className="mt-1 font-semibold">Automated Verification Daemon</div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <div className="border-t border-slate-200 w-48 pt-2">Lead Clinical Officer</div>
                    <div className="mt-1 font-semibold">Approved for Ward Operations</div>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 sticky bottom-0 bg-white z-10 rounded-b-3xl">
                <button
                  onClick={() => setIsReportModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-bold transition-all shadow-sm"
                >
                  Close
                </button>
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-extrabold transition-all shadow-md"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print / Save PDF</span>
                </button>
              </div>
            </div>
          </div>

          {/* Hidden Print Container specifically targeted by print CSS */}
          <div id="clinical-report-print-root" className="hidden">
            <div className="flex flex-col gap-6 text-black">
              {/* Header */}
              <div className="flex justify-between items-center pb-6 border-b-2 border-black">
                <div>
                  <h1 className="text-3xl font-black tracking-tight text-black">CareSync AI</h1>
                  <p className="text-sm font-semibold text-slate-700 mt-1">Real-Time Patient Monitoring & Warning System</p>
                </div>
                <div className="text-right text-xs font-bold text-slate-700">
                  <div>Report Generated: {new Date().toLocaleString()}</div>
                  <div>Inference Engine: Active</div>
                </div>
              </div>

              {/* live stats */}
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">1. Live Ward Telemetry Summary</h3>
                <div className="grid grid-cols-5 gap-4 text-center my-4">
                  <div className="border border-black p-3 rounded">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">Total Patients</span>
                    <span className="text-xl font-black mt-1 block">{summary.total_patients}</span>
                  </div>
                  <div className="border border-black p-3 rounded">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">Stable</span>
                    <span className="text-xl font-black mt-1 block">{summary.stable_count}</span>
                  </div>
                  <div className="border border-black p-3 rounded">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">Warnings</span>
                    <span className="text-xl font-black mt-1 block">{summary.warning_count}</span>
                  </div>
                  <div className="border border-black p-3 rounded">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">High Alerts</span>
                    <span className="text-xl font-black mt-1 block">{summary.high_alert_count}</span>
                  </div>
                  <div className="border border-black p-3 rounded">
                    <span className="text-[10px] font-bold uppercase tracking-wider block">Criticals</span>
                    <span className="text-xl font-black mt-1 block">{summary.critical_count}</span>
                  </div>
                </div>
              </div>

              {/* alerts */}
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">2. Active Incident Alert Queue</h3>
                <table className="w-full text-left border-collapse text-xs border border-black my-4">
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold uppercase tracking-wider border-b border-black">
                      <th className="py-2 px-3 border border-black">Timestamp</th>
                      <th className="py-2 px-3 border border-black">Patient Name</th>
                      <th className="py-2 px-3 border border-black">Ward / Bed</th>
                      <th className="py-2 px-3 border border-black">Alert Cause</th>
                      <th className="py-2 px-3 text-center border border-black">Severity</th>
                      <th className="py-2 px-3 text-right border border-black">Status</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold">
                    {alerts.length > 0 ? (
                      alerts.map((alert) => (
                        <tr key={alert.id}>
                          <td className="py-2 px-3 border border-black">{new Date(alert.timestamp).toLocaleTimeString()}</td>
                          <td className="py-2 px-3 border border-black font-bold">{alert.patient_name}</td>
                          <td className="py-2 px-3 border border-black">Ward {alert.ward_no}</td>
                          <td className="py-2 px-3 border border-black">{alert.alert_type}</td>
                          <td className="py-2 px-3 text-center border border-black">{alert.priority}</td>
                          <td className="py-2 px-3 text-right border border-black">{alert.status}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-6 text-center font-bold border border-black">No active patient alerts. Ward status stable.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* models */}
              <div>
                <h3 className="text-sm font-extrabold uppercase tracking-wider mb-2 border-b border-slate-300 pb-1">3. Classifier Metrics Summary</h3>
                <table className="w-full text-left border-collapse text-xs border border-black my-4">
                  <thead>
                    <tr className="bg-slate-100 text-black font-bold uppercase tracking-wider border-b border-black">
                      <th className="py-2 px-3 border border-black">Classifier Architecture</th>
                      <th className="py-2 px-3 text-center border border-black">Accuracy (%)</th>
                      <th className="py-2 px-3 text-center border border-black">Precision (%)</th>
                      <th className="py-2 px-3 text-center border border-black">Recall (%)</th>
                      <th className="py-2 px-3 text-center border border-black">F1-Score (%)</th>
                      <th className="py-2 px-3 text-right border border-black">Inference State</th>
                    </tr>
                  </thead>
                  <tbody className="font-semibold">
                    {mlMetrics.length > 0 ? (
                      mlMetrics.map((model) => (
                        <tr key={model.model_name}>
                          <td className="py-2 px-3 border border-black font-bold">{model.model_name}</td>
                          <td className="py-2 px-3 text-center border border-black">{model.accuracy}%</td>
                          <td className="py-2 px-3 text-center border border-black">{model.precision}%</td>
                          <td className="py-2 px-3 text-center border border-black">{model.recall}%</td>
                          <td className="py-2 px-3 text-center border border-black font-bold">{model.f1_score}%</td>
                          <td className="py-2 px-3 text-right border border-black">{model.is_best ? 'ACTIVE INFERENCE' : 'IDLE'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="6" className="py-6 text-center font-bold border border-black">No metrics logs loaded.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Signatures */}
              <div className="mt-16 pt-8 grid grid-cols-2 gap-12 text-xs font-bold text-black">
                <div>
                  <div className="border-t border-black w-48 pt-2">CareSync AI System Auditor</div>
                  <div className="mt-1">Automated Verification Daemon</div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="border-t border-black w-48 pt-2">Lead Clinical Officer</div>
                  <div className="mt-1">Approved for Ward Operations</div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
