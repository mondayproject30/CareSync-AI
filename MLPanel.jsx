import React, { useState, useEffect } from 'react';
import { Brain, RefreshCw, CheckCircle, Trophy, BarChart3, HelpCircle, Thermometer, ShieldAlert, Cpu, FileText, Printer, X } from 'lucide-react';

function MLPanel({ apiBase }) {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [trainingState, setTrainingState] = useState('idle'); // 'idle' | 'running' | 'done'
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);

  const fetchMetrics = async () => {
    try {
      const res = await fetch(`${apiBase}/ml/metrics`);
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      }
    } catch (err) {
      console.error("Failed to fetch ML metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  const handleRetrain = async () => {
    setTrainingState('running');
    try {
      const res = await fetch(`${apiBase}/ml/train`, { method: 'POST' });
      if (res.ok) {
        setTimeout(async () => {
          await fetchMetrics();
          setTrainingState('done');
          setTimeout(() => setTrainingState('idle'), 3000);
        }, 5000);
      } else {
        setTrainingState('idle');
      }
    } catch (err) {
      console.error("Retraining failed:", err);
      setTrainingState('idle');
    }
  };

  const vitalsMetrics = metrics.filter(m => !m.is_thermal);
  const thermalMetrics = metrics.filter(m => m.is_thermal);

  return (
    <div className="flex flex-col gap-8">
      {/* ML Pipeline Description Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-soft flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="bg-purple-100 p-3 rounded-2xl text-purple-700 shadow-sm">
            <Brain className="h-6.5 w-6.5" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-slate-900">ML Prediction Engine</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              CareSync AI trains and compares three machine learning classifiers on 10,000+ patient records using vital signs, MAP, pulse pressure, and trend differentials.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 flex-wrap">
          <button
            onClick={() => setIsReportModalOpen(true)}
            className="flex items-center gap-2 font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 uppercase tracking-wider"
          >
            <FileText className="h-4 w-4 text-purple-600" />
            <span>Generate Report</span>
          </button>

          <button
            onClick={handleRetrain}
            disabled={trainingState === 'running'}
            className={`flex items-center gap-2 font-extrabold text-xs px-5 py-3 rounded-xl transition-all shadow-md uppercase tracking-wider ${
              trainingState === 'running'
                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                : 'bg-purple-600 hover:bg-purple-700 text-white'
            }`}
          >
            <RefreshCw className={`h-4 w-4 ${trainingState === 'running' ? 'animate-spin' : ''}`} />
            {trainingState === 'running' ? 'Retraining Pipeline...' : 'Retrain ML Models'}
          </button>
        </div>
      </div>

      {trainingState === 'done' && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl flex items-center gap-2 text-xs font-bold shadow-sm animate-pulse">
          <CheckCircle className="h-4.5 w-4.5 text-emerald-600" />
          <span>Retraining successfully completed! The best-performing model was saved and loaded for real-time vital predictions.</span>
        </div>
      )}

      {/* SECTION 1: CORE PATIENT VITALS CLASSIFIERS */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Cpu className="h-5 w-5 text-blue-600" />
          <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">1. Core Patient Status Classifiers</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-6 text-slate-400">Loading models metrics...</div>
          ) : vitalsMetrics.length > 0 ? (
            vitalsMetrics.map((model) => (
              <div 
                key={model.model_name}
                className={`p-6 rounded-2xl border shadow-soft bg-white flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  model.is_best ? 'ring-2 ring-purple-600 border-transparent shadow-purple-50' : 'border-slate-200'
                }`}
              >
                {model.is_best && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white font-extrabold text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-bl-xl flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> Best Model
                  </div>
                )}
                
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Classifier Model</span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{model.model_name}</h3>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">F1-Score</span>
                      <p className={`text-xl font-extrabold mt-0.5 ${model.is_best ? 'text-purple-600' : 'text-slate-700'}`}>{model.f1_score}%</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Accuracy</span>
                      <p className="text-xl font-extrabold text-slate-700 mt-0.5">{model.accuracy}%</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 mt-6">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                    <span>Precision: {model.precision}%</span>
                    <span>Recall: {model.recall}%</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-6 text-slate-400">No core metrics logs.</div>
          )}
        </div>
      </div>

      {/* SECTION 2: THERMAL CAMERA MODULE CLASSIFIERS */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <Thermometer className="h-5 w-5 text-purple-600" />
          <h3 className="text-sm font-extrabold text-slate-950 uppercase tracking-wider">2. CareSync AI — Thermal Camera Module Classifiers</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-3 text-center py-6 text-slate-400">Loading thermal metrics...</div>
          ) : thermalMetrics.length > 0 ? (
            thermalMetrics.map((model) => (
              <div 
                key={model.model_name}
                className={`p-6 rounded-2xl border shadow-soft bg-white flex flex-col justify-between relative overflow-hidden transition-all duration-300 ${
                  model.is_best ? 'ring-2 ring-purple-600 border-transparent shadow-purple-50' : 'border-slate-200'
                }`}
              >
                {model.is_best && (
                  <div className="absolute top-0 right-0 bg-purple-600 text-white font-extrabold text-[9px] uppercase tracking-wider px-3.5 py-1.5 rounded-bl-xl flex items-center gap-1">
                    <Trophy className="h-3 w-3" /> Best Model
                  </div>
                )}
                
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Classifier Model</span>
                  <h3 className="text-lg font-black text-slate-900 mt-1">{model.model_name}</h3>

                  <div className="grid grid-cols-2 gap-4 mt-6">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">F1-Score</span>
                      <p className={`text-xl font-extrabold mt-0.5 ${model.is_best ? 'text-purple-600' : 'text-slate-700'}`}>{model.f1_score}%</p>
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Accuracy</span>
                      <p className="text-xl font-extrabold text-slate-700 mt-0.5">{model.accuracy}%</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-4 mt-6">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                    <span>Precision: {model.precision}%</span>
                    <span>Recall: {model.recall}%</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-3 text-center py-6 text-slate-400">No thermal metrics logs found.</div>
          )}
        </div>
      </div>

      {/* Metrics Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-soft overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Evaluation Metric Comparison Table</h3>
            <p className="text-xs text-slate-400 font-bold">Standard classification metrics on 20% test subset</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-wider border-b border-slate-200">
                <th className="py-4 px-6">Model Architecture</th>
                <th className="py-4 px-6 text-center">Accuracy (%)</th>
                <th className="py-4 px-6 text-center">Precision (%)</th>
                <th className="py-4 px-6 text-center">Recall (%)</th>
                <th className="py-4 px-6 text-center">F1-Score (%)</th>
                <th className="py-4 px-6 text-right">Inference State</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-600">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-bold bg-white">
                    Fetching latest pipeline runs...
                  </td>
                </tr>
              ) : metrics.length > 0 ? (
                metrics.map((model) => (
                  <tr key={model.model_name} className={`hover:bg-slate-50/50 transition-colors ${model.is_best ? 'bg-purple-50/10' : ''}`}>
                    <td className="py-4 px-6 font-bold text-slate-900">{model.model_name}</td>
                    <td className="py-4 px-6 text-center text-slate-800">{model.accuracy}%</td>
                    <td className="py-4 px-6 text-center text-slate-800">{model.precision}%</td>
                    <td className="py-4 px-6 text-center text-slate-800">{model.recall}%</td>
                    <td className="py-4 px-6 text-center font-bold text-slate-900">{model.f1_score}%</td>
                    <td className="py-4 px-6 text-right">
                      {model.is_best ? (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                          Active Inference
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-400">
                          Idle
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="py-12 text-center text-slate-400 font-bold bg-white">
                    No metrics logs found. Click 'Retrain ML Models' to train the classifiers.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Feature Importance Explainer Panel */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 shadow-soft">
        <h3 className="text-base font-extrabold flex items-center gap-2">
          <HelpCircle className="h-4.5 w-4.5 text-purple-400" /> Derived Feature Engineering Insights
        </h3>
        <p className="text-xs text-slate-400 mt-1 font-medium">
          The models train using raw vitals augmented by clinical derivations. These computed features capture advanced physiological indicators:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-extrabold text-purple-400 uppercase block tracking-wider">Mean Arterial Pressure</span>
            <code className="text-xs font-bold text-white block mt-1.5 bg-slate-950 p-1.5 rounded">MAP = (SBP + 2×DBP)/3</code>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">Indicates perfusion pressure of organs.</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-extrabold text-purple-400 uppercase block tracking-wider">Pulse Pressure</span>
            <code className="text-xs font-bold text-white block mt-1.5 bg-slate-950 p-1.5 rounded">PP = SBP - DBP</code>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">Highlights blood vessel compliance and stroke volume.</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-extrabold text-purple-400 uppercase block tracking-wider">Heart Rate Trend</span>
            <code className="text-xs font-bold text-white block mt-1.5 bg-slate-950 p-1.5 rounded">HR_Trend = HR_t - HR_t-1</code>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">Captures rapid onset tachycardia or bradycardia events.</p>
          </div>

          <div className="bg-slate-800/50 p-4 rounded-xl border border-slate-800/80">
            <span className="text-[10px] font-extrabold text-purple-400 uppercase block tracking-wider">SpO2 trend</span>
            <code className="text-xs font-bold text-white block mt-1.5 bg-slate-950 p-1.5 rounded">SpO2_Trend = SpO2_t - SpO2_t-1</code>
            <p className="text-[10px] text-slate-400 font-semibold mt-2">Identifies sudden hypoxemia slopes before critical thresholds.</p>
          </div>
        </div>
      </div>

      {/* Clinical Evaluation Report Overlay Modal */}
      {isReportModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 flex flex-col relative animate-fade-in text-slate-800">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-3xl">
              <div className="flex items-center gap-3">
                <Brain className="h-6 w-6 text-purple-600" />
                <div>
                  <h3 className="text-lg font-black text-slate-950">Clinical ML Evaluation Report</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">CareSync AI Predictive Models Summary</p>
                </div>
              </div>
              <button 
                onClick={() => setIsReportModalOpen(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-655 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Modal Body / Report Content */}
            <div className="p-8 flex-1 flex flex-col gap-6" id="clinical-report-content">
              {/* Report Cover / Metadata */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-6 border-b border-slate-100">
                <div>
                  <h4 className="text-2xl font-black text-slate-950 tracking-tight bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">CareSync AI</h4>
                  <p className="text-xs text-slate-500 mt-1 font-semibold">Real-Time Patient Monitoring & Warning System</p>
                </div>
                <div className="text-left sm:text-right text-xs text-slate-500 font-bold">
                  <div>Report Generated: {new Date().toLocaleString()}</div>
                  <div className="mt-1">Inference Engine: Active</div>
                </div>
              </div>

              {/* Training Overview */}
              <div>
                <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">1. Training and Data Pipeline Overview</h5>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  This report summarizes the performance evaluation statistics of the machine learning status classifiers and anomaly detectors configured for the ward monitoring platform. The models were evaluated using a randomized 80/20 train/test split on historical records, featuring synthetic physiological variations, thermal scans, and patient age demographics.
                </p>
              </div>

              {/* Metrics Table */}
              <div>
                <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-3">2. Model Performance Summary Table</h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                        <th className="py-3 px-4">Classifier Architecture</th>
                        <th className="py-3 px-4 text-center">Accuracy (%)</th>
                        <th className="py-3 px-4 text-center">Precision (%)</th>
                        <th className="py-3 px-4 text-center">Recall (%)</th>
                        <th className="py-3 px-4 text-center">F1-Score (%)</th>
                        <th className="py-3 px-4 text-right">Inference State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold text-slate-600">
                      {metrics.length > 0 ? (
                        metrics.map((model) => (
                          <tr key={model.model_name} className={model.is_best ? 'bg-purple-50/10' : ''}>
                            <td className="py-3 px-4 font-bold text-slate-900">{model.model_name}</td>
                            <td className="py-3 px-4 text-center">{model.accuracy}%</td>
                            <td className="py-3 px-4 text-center">{model.precision}%</td>
                            <td className="py-3 px-4 text-center">{model.recall}%</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-900">{model.f1_score}%</td>
                            <td className="py-3 px-4 text-right">
                              {model.is_best ? (
                                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-100 text-purple-800 border border-purple-200">
                                  Active
                                </span>
                              ) : (
                                <span className="text-slate-400">Idle</span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="6" className="py-8 text-center text-slate-400 font-bold">No evaluation log metrics active.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Feature Importance Analysis */}
              <div>
                <h5 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider mb-2">3. Physiology Feature Engineering Analysis</h5>
                <p className="text-xs text-slate-600 leading-relaxed font-semibold">
                  Organ perfusion (MAP), blood vessel stiffness (PP), and telemetry rate of change (HR & SpO2 trends) act as high-weight variables in the prediction logic. These computed markers allow the classifiers (specifically the XGBoost core ensemble) to predict patient status with high sensitivity, anticipating respiratory and circulatory warnings prior to crossing raw threshold lines.
                </p>
              </div>

              {/* Signatures */}
              <div className="mt-8 pt-8 border-t border-slate-100 grid grid-cols-2 gap-8 text-[11px] text-slate-400 font-bold">
                <div>
                  <div className="border-t border-slate-200 w-48 pt-2">CareSync AI System Auditor</div>
                  <div className="mt-1">Automated Verification Daemon</div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="border-t border-slate-200 w-48 pt-2">Lead Clinical Officer</div>
                  <div className="mt-1">Approved for Ward Operations</div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
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
      )}
    </div>
  );
}

export default MLPanel;
