import React, { useState, useMemo } from 'react';
import { Search, Heart, ShieldAlert, CheckCircle, HelpCircle, ArrowUpDown } from 'lucide-react';

function Dashboard({ patients, summary, onSelectPatient }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedWard, setSelectedWard] = useState('All');
  const [selectedCondition, setSelectedCondition] = useState('All');
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' | 'asc' | 'none'

  // Extract unique wards and conditions for filter options
  const wardOptions = useMemo(() => {
    const wards = patients.map(p => p.ward_no);
    return ['All', ...new Set(wards)];
  }, [patients]);

  const conditionOptions = useMemo(() => {
    const conditions = patients.map(p => p.medical_condition);
    return ['All', ...new Set(conditions)];
  }, [patients]);

  // Search, filter, and sort logic
  const filteredPatients = useMemo(() => {
    let result = [...patients];

    // Search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        p => p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term)
      );
    }

    // Ward filter
    if (selectedWard !== 'All') {
      result = result.filter(p => p.ward_no === selectedWard);
    }

    // Condition filter
    if (selectedCondition !== 'All') {
      result = result.filter(p => p.medical_condition === selectedCondition);
    }

    // Sort by Health Score
    if (sortOrder !== 'none') {
      result.sort((a, b) => {
        const scoreA = a.latest_vital ? a.latest_vital.health_score : 100;
        const scoreB = b.latest_vital ? b.latest_vital.health_score : 100;
        return sortOrder === 'asc' ? scoreA - scoreB : scoreB - scoreA;
      });
    }

    return result;
  }, [patients, searchTerm, selectedWard, selectedCondition, sortOrder]);

  const toggleSort = () => {
    setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Stable':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
            Stable
          </span>
        );
      case 'Warning':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse"></span>
            Warning
          </span>
        );
      case 'High Alert':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-orange-100 text-orange-800 border border-orange-200">
            <span className="h-1.5 w-1.5 rounded-full bg-orange-500 animate-ping"></span>
            High Alert
          </span>
        );
      case 'Critical':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-300 animate-pulse">
            <span className="h-2 w-2 rounded-full bg-red-600 animate-ping"></span>
            Critical
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-800">
            <HelpCircle className="h-3 w-3" />
            Unknown
          </span>
        );
    }
  };

  const getHealthScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-600 bg-emerald-50 border-emerald-100';
    if (score >= 75) return 'text-amber-600 bg-amber-50 border-amber-100';
    if (score >= 50) return 'text-orange-600 bg-orange-50 border-orange-100';
    return 'text-red-600 bg-red-50 border-red-100';
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '--:--';
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Summary Cards Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Patients */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft flex flex-col justify-between">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Patients</span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-slate-900">{summary.total_patients}</span>
            <span className="text-xs text-slate-400 font-semibold">Active</span>
          </div>
        </div>

        {/* Stable Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500"></div>
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <CheckCircle className="h-3.5 w-3.5" /> Stable
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-emerald-700">{summary.stable_count}</span>
            <span className="text-xs text-slate-400 font-semibold">
              {summary.total_patients > 0 ? Math.round((summary.stable_count / summary.total_patients) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Warning Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500"></div>
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider flex items-center gap-1">
            <HelpCircle className="h-3.5 w-3.5" /> Warning
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-amber-700">{summary.warning_count}</span>
            <span className="text-xs text-slate-400 font-semibold">
              {summary.total_patients > 0 ? Math.round((summary.warning_count / summary.total_patients) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* High Alert Count */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-soft flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-orange-500"></div>
          <span className="text-xs font-bold text-orange-600 uppercase tracking-wider flex items-center gap-1">
            <ShieldAlert className="h-3.5 w-3.5" /> High Alert
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-3xl font-extrabold text-orange-700">{summary.high_alert_count}</span>
            <span className="text-xs text-slate-400 font-semibold">
              {summary.total_patients > 0 ? Math.round((summary.high_alert_count / summary.total_patients) * 100) : 0}%
            </span>
          </div>
        </div>

        {/* Critical Count */}
        <div className={`p-5 rounded-2xl border shadow-soft flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
          summary.critical_count > 0 
            ? 'bg-red-50 border-red-200 animate-pulse-critical' 
            : 'bg-white border-slate-200'
        }`}>
          <div className="absolute top-0 left-0 right-0 h-1 bg-red-500"></div>
          <span className="text-xs font-bold text-red-600 uppercase tracking-wider flex items-center gap-1">
            <Heart className={`h-3.5 w-3.5 ${summary.critical_count > 0 ? 'animate-heartbeat text-red-500' : ''}`} /> Critical
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className={`text-3xl font-extrabold ${summary.critical_count > 0 ? 'text-red-700' : 'text-slate-900'}`}>{summary.critical_count}</span>
            <span className="text-xs text-slate-400 font-semibold">
              {summary.total_patients > 0 ? Math.round((summary.critical_count / summary.total_patients) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-soft flex flex-col md:flex-row gap-4 items-center justify-between">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="h-4.5 w-4.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search patient name or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-slate-50"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap w-full md:w-auto items-center gap-3">
          {/* Ward filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase">Ward:</span>
            <select
              value={selectedWard}
              onChange={(e) => setSelectedWard(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {wardOptions.map(ward => (
                <option key={ward} value={ward}>{ward}</option>
              ))}
            </select>
          </div>

          {/* Condition filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-500 uppercase">Condition:</span>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {conditionOptions.map(cond => (
                <option key={cond} value={cond}>{cond}</option>
              ))}
            </select>
          </div>

          {/* Sort trigger */}
          <button
            onClick={toggleSort}
            className="flex items-center gap-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-bold transition-all text-slate-700"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            <span>Score: {sortOrder === 'desc' ? 'High-Low' : 'Low-High'}</span>
          </button>
        </div>
      </div>

      {/* Patient Database Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-4 px-6">Patient ID</th>
                <th className="py-4 px-6">Name</th>
                <th className="py-4 px-6">Ward / Bed</th>
                <th className="py-4 px-6">Medical Condition</th>
                <th className="py-4 px-6 text-center">Health Score</th>
                <th className="py-4 px-6">ML Predicted Status</th>
                <th className="py-4 px-6">Last Updated</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-medium">
              {filteredPatients.length > 0 ? (
                filteredPatients.map((patient) => {
                  const vital = patient.latest_vital;
                  const isCritical = vital && vital.status === 'Critical';

                  return (
                    <tr 
                      key={patient.id} 
                      className={`hover:bg-slate-50 transition-colors duration-150 ${
                        isCritical 
                          ? 'bg-red-50/70 border-l-4 border-l-red-500 hover:bg-red-50' 
                          : ''
                      }`}
                    >
                      {/* Patient ID */}
                      <td className="py-4.5 px-6 font-bold text-slate-500">{patient.id}</td>
                      
                      {/* Name */}
                      <td className="py-4.5 px-6">
                        <div className="font-bold text-slate-900">{patient.name}</div>
                        <div className="text-xs text-slate-400 font-semibold">{patient.age} y/o • {patient.gender}</div>
                      </td>

                      {/* Ward / Bed */}
                      <td className="py-4.5 px-6">
                        <div className="text-slate-950 font-bold">{patient.ward_no}</div>
                        <div className="text-xs text-slate-400 font-bold">Bed {patient.bed_no}</div>
                      </td>

                      {/* Medical Condition */}
                      <td className="py-4.5 px-6">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                          {patient.medical_condition}
                        </span>
                      </td>

                      {/* Health Score */}
                      <td className="py-4.5 px-6 text-center">
                        {vital ? (
                          <span className={`inline-block px-2.5 py-1.5 rounded-xl text-sm font-extrabold border ${getHealthScoreColor(vital.health_score)}`}>
                            {vital.health_score}
                          </span>
                        ) : (
                          <span className="text-slate-400">--</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-4.5 px-6">
                        {vital ? getStatusBadge(vital.status) : getStatusBadge('Stable')}
                      </td>

                      {/* Last Updated */}
                      <td className="py-4.5 px-6 font-semibold text-slate-500">
                        {vital ? formatTimestamp(vital.timestamp) : '--:--'}
                      </td>

                      {/* Actions */}
                      <td className="py-4.5 px-6 text-right">
                        <button
                          onClick={() => onSelectPatient(patient.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all shadow-sm"
                        >
                          Monitor Vitals
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-bold bg-white">
                    No patients match the search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
