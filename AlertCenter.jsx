import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  ShieldAlert, 
  CheckCircle, 
  AlertTriangle,
  Filter,
  X
} from 'lucide-react';

function AlertCenter({ apiBase, onSelectPatient, refreshGlobal, activeAlerts = [] }) {
  const [alerts, setAlerts] = useState([]);
  const [activeTab, setActiveTab] = useState('active'); // 'active' | 'critical' | 'resolved'
  const [loading, setLoading] = useState(true);

  // Column filter state
  const [filters, setFilters] = useState({
    patientName: '',
    wardNo: '',
    alertType: '',
    currentValue: '',
    priority: '',
    status: ''
  });

  const handleFilterChange = (column, value) => {
    setFilters(prev => ({
      ...prev,
      [column]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      patientName: '',
      wardNo: '',
      alertType: '',
      currentValue: '',
      priority: '',
      status: ''
    });
  };

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  const fetchResolvedAlerts = async () => {
    try {
      const res = await fetch(`${apiBase}/alerts?status=Resolved`);
      if (res.ok) {
        const data = await res.json();
        setAlerts(data);
      }
    } catch (err) {
      console.error("Failed to fetch resolved alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    if (activeTab === 'active') {
      setAlerts(activeAlerts);
      setLoading(false);
    } else if (activeTab === 'critical') {
      setAlerts(activeAlerts.filter(a => a.priority === 'Critical'));
      setLoading(false);
    } else if (activeTab === 'resolved') {
      fetchResolvedAlerts();
    }
  }, [activeTab, activeAlerts, apiBase]);

  // Handle Alert Actions
  const handleAlertAction = async (alertId, newStatus) => {
    try {
      const payload = { status: newStatus };
      const res = await fetch(`${apiBase}/alerts/${alertId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        refreshGlobal();
        if (activeTab === 'resolved') {
          fetchResolvedAlerts();
        }
      }
    } catch (err) {
      console.error(`Failed to update alert ${alertId} to ${newStatus}:`, err);
    }
  };

  const handleAutoEscalate = async (alertId) => {
    const doctors = ["Dr. Sarah Jenkins", "Dr. Alex Mercer", "Dr. Maria Martinez"];
    
    // Count active assignments
    const counts = {};
    doctors.forEach(doc => {
      counts[doc] = 0;
    });
    
    activeAlerts.forEach(a => {
      if (a.status !== 'Resolved' && a.assigned_staff) {
        const assignedList = a.assigned_staff.split(',').map(s => s.trim());
        doctors.forEach(doc => {
          if (assignedList.includes(doc)) {
            counts[doc]++;
          }
        });
      }
    });
    
    let bestDoc = doctors[0];
    let minCount = Infinity;
    doctors.forEach(doc => {
      if (counts[doc] < minCount) {
        minCount = counts[doc];
        bestDoc = doc;
      }
    });

    try {
      const alert = activeAlerts.find(a => a.id === alertId);
      let newStaffString = bestDoc;
      if (alert && alert.assigned_staff) {
        const assignedList = alert.assigned_staff.split(',').map(s => s.trim());
        if (!assignedList.includes(bestDoc)) {
          assignedList.push(bestDoc);
          newStaffString = assignedList.join(', ');
        } else {
          newStaffString = alert.assigned_staff;
        }
      }

      const payload = { 
        status: 'Escalated', 
        assigned_staff: newStaffString 
      };
      const res = await fetch(`${apiBase}/alerts/${alertId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        refreshGlobal();
      }
    } catch (err) {
      console.error("Failed to auto-escalate alert:", err);
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'Critical':
        return 'bg-red-100 text-red-800 border-red-200 animate-pulse';
      case 'High':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const getAlertStatusBadge = (status) => {
    switch (status) {
      case 'Active':
        return 'bg-red-500 text-white font-black animate-pulse';
      case 'Acknowledged':
        return 'bg-amber-500 text-white font-bold';
      case 'Escalated':
        return 'bg-orange-600 text-white font-black animate-bounce';
      case 'Resolved':
        return 'bg-emerald-600 text-white font-bold';
      default:
        return 'bg-slate-400 text-white';
    }
  };

  const formatTimestamp = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', day: '2-digit' }) + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const criticalCount = alerts.filter(a => a.status !== 'Resolved' && a.priority === 'Critical').length;
  const activeCount = alerts.filter(a => a.status !== 'Resolved').length;

  // Filter alerts client-side dynamically based on inputs
  const filteredAlerts = alerts.filter(alert => {
    const matchesPatientName = alert.patient_name?.toLowerCase().includes(filters.patientName.toLowerCase());
    const matchesWardNo = alert.ward_no?.toLowerCase().includes(filters.wardNo.toLowerCase());
    const matchesAlertType = alert.alert_type?.toLowerCase().includes(filters.alertType.toLowerCase());
    const matchesCurrentValue = alert.current_value?.toLowerCase().includes(filters.currentValue.toLowerCase());
    const matchesPriority = filters.priority === '' || alert.priority === filters.priority;
    const matchesStatus = filters.status === '' || alert.status === filters.status;
    
    return matchesPatientName && matchesWardNo && matchesAlertType && matchesCurrentValue && matchesPriority && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Upper Status Panel */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
          <div>
            <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
              <Bell className="h-5.5 w-5.5 text-blue-600 animate-swing" /> Alert Notification Center
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-1">Real-time vital warnings, diagnosis, and escalation logs</p>
          </div>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-colors shadow-sm"
            >
              <X className="h-3.5 w-3.5" /> Clear Filters
            </button>
          )}
        </div>

        {/* Tab Selection buttons */}
        <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'active' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Active Alerts</span>
            {activeCount > 0 && activeTab !== 'active' && (
              <span className="bg-amber-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold">{activeCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('critical')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'critical' ? 'bg-red-600 text-white shadow-sm' : 'text-slate-500 hover:text-red-600'
            }`}
          >
            <ShieldAlert className="h-4 w-4" />
            <span>Critical Alerts</span>
            {criticalCount > 0 && activeTab !== 'critical' && (
              <span className="bg-red-500 text-white text-[9px] px-1.5 py-0.5 rounded-full font-extrabold animate-ping">{criticalCount}</span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'resolved' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <CheckCircle className="h-4 w-4" />
            <span>Resolved Alerts</span>
          </button>
        </div>
      </div>

      {/* Main Alert Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-4 px-6">Timestamp</th>
                <th className="py-4 px-6">Patient Name</th>
                <th className="py-4 px-6">Ward / Bed</th>
                <th className="py-4 px-6">Anomaly Type</th>
                <th className="py-4 px-6">Current Value</th>
                <th className="py-4 px-6 text-center">Priority</th>
                <th className="py-4 px-6 text-center">Status</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
              {/* Column Filters Input Row */}
              <tr className="bg-slate-50/50 border-b border-slate-200">
                <th className="py-2.5 px-6">
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-extrabold uppercase">
                    <Filter className="h-3 w-3" /> Filters
                  </div>
                </th>
                <th className="py-2.5 px-6">
                  <input
                    type="text"
                    placeholder="Filter name..."
                    value={filters.patientName}
                    onChange={(e) => handleFilterChange('patientName', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold bg-white shadow-sm"
                  />
                </th>
                <th className="py-2.5 px-6">
                  <input
                    type="text"
                    placeholder="Filter ward..."
                    value={filters.wardNo}
                    onChange={(e) => handleFilterChange('wardNo', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold bg-white shadow-sm"
                  />
                </th>
                <th className="py-2.5 px-6">
                  <input
                    type="text"
                    placeholder="Filter type..."
                    value={filters.alertType}
                    onChange={(e) => handleFilterChange('alertType', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold bg-white shadow-sm"
                  />
                </th>
                <th className="py-2.5 px-6">
                  <input
                    type="text"
                    placeholder="Filter value..."
                    value={filters.currentValue}
                    onChange={(e) => handleFilterChange('currentValue', e.target.value)}
                    className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-semibold bg-white shadow-sm"
                  />
                </th>
                <th className="py-2.5 px-6">
                  <select
                    value={filters.priority}
                    onChange={(e) => handleFilterChange('priority', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-bold bg-white text-slate-700 shadow-sm cursor-pointer"
                  >
                    <option value="">All</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Warning">Warning</option>
                    <option value="Stable">Stable</option>
                  </select>
                </th>
                <th className="py-2.5 px-6">
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-2 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-bold bg-white text-slate-700 shadow-sm cursor-pointer"
                  >
                    <option value="">All</option>
                    <option value="Active">Active</option>
                    <option value="Acknowledged">Acknowledged</option>
                    <option value="Escalated">Escalated</option>
                    <option value="Resolved">Resolved</option>
                  </select>
                </th>
                <th className="py-2.5 px-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-bold bg-white animate-pulse">
                    Refreshing alert registry...
                  </td>
                </tr>
              ) : filteredAlerts.length > 0 ? (
                filteredAlerts.map((alert) => {
                  const isCritical = alert.priority === 'Critical' && alert.status !== 'Resolved';
                  return (
                    <tr 
                      key={alert.id} 
                      className={`hover:bg-slate-50 transition-colors ${
                        isCritical 
                          ? 'bg-red-50/70 border-l-4 border-l-red-500 hover:bg-red-50' 
                          : ''
                      }`}
                    >
                      {/* Timestamp */}
                      <td className="py-4.5 px-6 text-slate-500 text-xs">{formatTimestamp(alert.timestamp)}</td>
                      
                      {/* Patient Name */}
                      <td className="py-4.5 px-6">
                        <button
                          onClick={() => onSelectPatient(alert.patient_id)}
                          className="hover:underline font-bold text-slate-900 text-left block"
                        >
                          {alert.patient_name}
                        </button>
                        <span className="text-[10px] text-slate-400 font-bold block">ID: {alert.patient_id}</span>
                      </td>

                      {/* Ward / Bed */}
                      <td className="py-4.5 px-6 text-slate-900 font-bold">
                        {alert.ward_no}
                      </td>

                      {/* Anomaly Type */}
                      <td className="py-4.5 px-6 font-extrabold text-slate-900">
                        {alert.alert_type}
                      </td>

                      {/* Current Value */}
                      <td className="py-4.5 px-6 font-bold text-slate-700">
                        {alert.current_value}
                      </td>

                      {/* Priority */}
                      <td className="py-4.5 px-6 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold border uppercase ${getPriorityStyle(alert.priority)}`}>
                          {alert.priority}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-4.5 px-6 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-extrabold uppercase tracking-wider ${getAlertStatusBadge(alert.status)}`}>
                          {alert.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4.5 px-6 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          {alert.status === 'Active' && (
                            <button
                              onClick={() => handleAlertAction(alert.id, 'Acknowledged')}
                              className="bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
                            >
                              Acknowledge
                            </button>
                          )}
                          {(alert.status === 'Active' || alert.status === 'Acknowledged') && (
                            <button
                              onClick={() => handleAutoEscalate(alert.id)}
                              className="bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
                            >
                              Escalate
                            </button>
                          )}
                          {alert.status !== 'Resolved' && (
                            <button
                              onClick={() => handleAlertAction(alert.id, 'Resolved')}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-2.5 py-1.5 rounded-lg shadow-sm transition-all"
                            >
                              Resolve
                            </button>
                          )}
                          {alert.status === 'Resolved' && (
                            <span className="text-slate-400 text-xs font-bold py-1 px-2">Archived</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-slate-400 font-bold bg-white">
                    {hasActiveFilters ? "No alerts match the active filters." : "No alerts currently registered in this register."}
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

export default AlertCenter;
