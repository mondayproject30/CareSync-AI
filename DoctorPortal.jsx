import React, { useState, useEffect } from 'react';
import { 
  Stethoscope, 
  User, 
  CheckCircle, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Clock,
  UserCheck
} from 'lucide-react';

const STAFF_POOL = [
  "Dr. Sarah Jenkins", 
  "Nurse David Chen", 
  "Dr. Alex Mercer", 
  "Nurse Emily Watson", 
  "Dr. Maria Martinez",
  "Nurse Marcus Vance"
];

function DoctorPortal({ apiBase, onSelectPatient, refreshGlobal, activeAlerts = [] }) {
  const [successMsg, setSuccessMsg] = useState(null);
  const [activeDropdownAlertId, setActiveDropdownAlertId] = useState(null);

  // Doctor Workload Analytics
  const doctors = ["Dr. Sarah Jenkins", "Dr. Alex Mercer", "Dr. Maria Martinez"];
  
  const getDoctorWorkloads = () => {
    const workloads = {};
    doctors.forEach(doc => {
      workloads[doc] = 0;
    });
    activeAlerts.forEach(alert => {
      if (alert.status !== 'Resolved' && alert.assigned_staff) {
        const assignedList = alert.assigned_staff.split(',').map(s => s.trim());
        doctors.forEach(doc => {
          if (assignedList.includes(doc)) {
            workloads[doc]++;
          }
        });
      }
    });
    return workloads;
  };

  const getStaffWorkloads = () => {
    const workloads = {};
    STAFF_POOL.forEach(member => {
      workloads[member] = 0;
    });
    activeAlerts.forEach(alert => {
      if (alert.status !== 'Resolved' && alert.assigned_staff) {
        const assignedList = alert.assigned_staff.split(',').map(s => s.trim());
        assignedList.forEach(staff => {
          if (workloads[staff] !== undefined) {
            workloads[staff]++;
          }
        });
      }
    });
    return workloads;
  };

  const workloads = getDoctorWorkloads();
  const staffWorkloads = getStaffWorkloads();

  // Find the available doctor (the one with the minimum cases)
  const getAvailableDoctor = () => {
    let bestDoc = doctors[0];
    let minCount = Infinity;
    doctors.forEach(doc => {
      if (workloads[doc] < minCount) {
        minCount = workloads[doc];
        bestDoc = doc;
      }
    });
    return { name: bestDoc, count: minCount };
  };

  // Escalate and Auto-assign Doctor
  const handleAutoEscalate = async (alertId) => {
    const availableDoc = getAvailableDoctor();
    try {
      const alert = activeAlerts.find(a => a.id === alertId);
      let newStaffString = availableDoc.name;
      if (alert && alert.assigned_staff) {
        const assignedList = alert.assigned_staff.split(',').map(s => s.trim());
        if (!assignedList.includes(availableDoc.name)) {
          assignedList.push(availableDoc.name);
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
        setSuccessMsg(`System triaged: Auto-assigned ${availableDoc.name} to patient (Workload: ${availableDoc.count} cases).`);
        setTimeout(() => setSuccessMsg(null), 5000);
        refreshGlobal();
      }
    } catch (err) {
      console.error("Failed to auto-escalate alert:", err);
    }
  };

  // Manual Staff Assignment
  const handleAssignStaff = async (alertId, currentStatus, staffName) => {
    try {
      const alert = activeAlerts.find(a => a.id === alertId);
      let newStaffString = staffName;
      if (alert && alert.assigned_staff) {
        const assignedList = alert.assigned_staff.split(',').map(s => s.trim());
        if (assignedList.includes(staffName)) {
          setSuccessMsg(`${staffName} is already assigned to this case.`);
          setTimeout(() => setSuccessMsg(null), 3000);
          return;
        }
        assignedList.push(staffName);
        newStaffString = assignedList.join(', ');
      }

      const payload = { 
        status: currentStatus,
        assigned_staff: newStaffString 
      };
      
      const res = await fetch(`${apiBase}/alerts/${alertId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (res.ok) {
        setSuccessMsg(`Assigned ${staffName} to patient case.`);
        setTimeout(() => setSuccessMsg(null), 5000);
        refreshGlobal();
      }
    } catch (err) {
      console.error("Failed to assign staff:", err);
    }
  };

  // Resolve Alert Action
  const handleResolve = async (alertId) => {
    try {
      const payload = { status: 'Resolved' };
      const res = await fetch(`${apiBase}/alerts/${alertId}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        refreshGlobal();
      }
    } catch (err) {
      console.error("Failed to resolve alert:", err);
    }
  };

  const escalatedAlerts = activeAlerts.filter(a => a.status === 'Escalated');

  return (
    <div className="flex flex-col lg:flex-row gap-6">
      {/* Left Column: Alerts Triage Panel */}
      <div className="flex-1 flex flex-col gap-6">
        {/* Banner Overlay */}
        {successMsg && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl text-xs font-bold shadow-sm animate-fade-in flex items-center gap-2">
            <UserCheck className="h-4.5 w-4.5 text-emerald-600 animate-bounce" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Header Summary */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft">
          <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
            <Stethoscope className="h-5.5 w-5.5 text-blue-600" /> CareSync AI — Physician Portal
          </h2>
          <p className="text-xs text-slate-500 font-bold mt-1">
            Real-time escalation management, emergency triaging, and workload routing
          </p>
        </div>

        {/* Escalated Alerts Section */}
        <div className="flex flex-col gap-4">
          <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider flex items-center gap-2">
            <ShieldAlert className="h-4.5 w-4.5 text-red-500 animate-pulse" /> Active Escalations ({escalatedAlerts.length})
          </h3>
          {escalatedAlerts.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {escalatedAlerts.map(alert => (
                <div key={alert.id} className="bg-white p-5 rounded-2xl border-2 border-red-200 shadow-soft flex flex-col justify-between hover:border-red-300 transition-colors">
                  <div>
                    <div className="flex justify-between items-start">
                      <span className="text-[10px] font-extrabold bg-red-50 text-red-700 border border-red-200 px-2 py-0.5 rounded uppercase">
                        {alert.priority}
                      </span>
                      <span className="text-[10px] text-slate-400 font-bold">
                        {new Date(alert.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit', second: '2-digit'})}
                      </span>
                    </div>

                    <h4 className="font-extrabold text-slate-950 text-base mt-3">{alert.patient_name}</h4>
                    <p className="text-xs text-slate-400 font-bold mt-0.5">Ward {alert.ward_no} • ID: {alert.patient_id}</p>

                    <div className="bg-red-50/50 rounded-xl p-3 mt-4 border border-red-100">
                      <span className="text-[10px] font-bold text-red-900 uppercase">Alert Diagnosed</span>
                      <p className="font-extrabold text-slate-950 text-sm mt-1">{alert.alert_type}</p>
                      <p className="font-bold text-slate-600 text-xs mt-0.5">Value: {alert.current_value}</p>
                    </div>
                  </div>

                  <div className="border-t border-slate-100 pt-4 mt-4 flex items-center justify-between gap-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[60%]">
                      {alert.assigned_staff ? (
                        alert.assigned_staff.split(',').map((staff, idx) => (
                          <span key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-extrabold shadow-sm">
                            <User className="h-3 w-3 text-blue-500 animate-pulse" />
                            {staff.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400 italic text-xs">Unassigned</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 relative">
                      {/* Assign Staff Dropdown */}
                      <div className="relative">
                        <button
                          onClick={() => setActiveDropdownAlertId(activeDropdownAlertId === alert.id ? null : alert.id)}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-3 py-1.5 rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          <span>Assign Staff</span>
                        </button>
                        {activeDropdownAlertId === alert.id && (
                          <div className="absolute right-0 bottom-full mb-2 w-56 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-2">
                            <div className="px-3 py-1 border-b border-slate-100 mb-1">
                              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Available Staff</span>
                            </div>
                            <div className="max-h-48 overflow-y-auto flex flex-col">
                              {STAFF_POOL.map(staff => {
                                const load = staffWorkloads[staff] || 0;
                                return (
                                  <button
                                    key={staff}
                                    type="button"
                                    onClick={() => {
                                      handleAssignStaff(alert.id, alert.status, staff);
                                      setActiveDropdownAlertId(null);
                                    }}
                                    className="px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between w-full"
                                  >
                                    <span>{staff}</span>
                                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                                      load === 0 ? 'bg-emerald-100 text-emerald-800' : load >= 2 ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'
                                    }`}>
                                      {load} {load === 1 ? 'case' : 'cases'}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => handleResolve(alert.id)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shadow-sm transition-all"
                      >
                        Resolve Case
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-400 font-bold text-xs">
              No escalated alerts currently pending doctor review.
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Workloads & Availability */}
      <div className="w-full lg:w-80 shrink-0 flex flex-col gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft">
          <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-3 mb-4 flex items-center gap-2">
            <User className="h-4.5 w-4.5 text-blue-600" /> Physician Roster Workload
          </h3>

          <div className="flex flex-col gap-4">
            {doctors.map(doc => {
              const caseCount = workloads[doc] || 0;
              const status = caseCount === 0 ? "Available" : caseCount >= 2 ? "High Load" : "Active";
              const color = caseCount === 0 ? "bg-emerald-500 text-white" : caseCount >= 2 ? "bg-red-500 text-white animate-pulse" : "bg-amber-500 text-white";
              
              return (
                <div key={doc} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900">{doc}</h4>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Assigned Cases: {caseCount}</p>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${color}`}>
                    {status}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="bg-blue-50/50 rounded-xl p-4 mt-6 border border-blue-100 text-[11px] text-blue-800 leading-relaxed font-medium">
            <span className="font-extrabold text-blue-900 block mb-1">🤖 Quick Routing Engine</span>
            When a case is escalated, CareSync AI calculates real-time workloads. The physician with the lowest load is instantly flagged and assigned.
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorPortal;
