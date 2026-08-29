import React, { useState } from 'react';
import {
  FileSpreadsheet,
  FileCode,
  Download,
  X,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  Layers,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface ReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ReportsModal: React.FC<ReportsModalProps> = ({ isOpen, onClose }) => {
  const { isDaylight } = useTheme();
  const [reportType, setReportType] = useState<'INCIDENT_SUMMARY' | 'FLEET_AUDIT' | 'COMPREHENSIVE'>('COMPREHENSIVE');
  const [format, setFormat] = useState<'json' | 'csv'>('json');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleDownload = () => {
    setIsExporting(true);
    const link = document.createElement('a');
    link.href = `/api/system/reports/generate?format=${format}`;
    link.download = `seemadrishti_operational_dossier_${Date.now()}.${format}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      setIsExporting(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div
        className={`w-full max-w-lg rounded-lg border p-6 backdrop-blur-md relative shadow-2xl ${
          isDaylight
            ? 'bg-white border-slate-300 text-slate-900'
            : 'bg-[#030712] border-cyan-500/30 text-white shadow-[0_0_50px_rgba(6,182,212,0.15)]'
        }`}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <FileSpreadsheet className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-mono tracking-wider">TACTICAL REPORT GENERATOR</h2>
            <p className="text-xs text-slate-400 font-mono">SEEMADRISHTI AI // Official Intelligence Dossier Export</p>
          </div>
        </div>

        <div className="space-y-4 font-mono text-xs">
          {/* Report Scope */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">REPORT SCOPE</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'COMPREHENSIVE', label: 'Full Dossier' },
                { id: 'INCIDENT_SUMMARY', label: 'Incidents & Threats' },
                { id: 'FLEET_AUDIT', label: 'Fleet & Hardware' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setReportType(t.id as any)}
                  className={`p-2.5 rounded border text-center transition ${
                    reportType === t.id
                      ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 font-bold'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Export Format */}
          <div>
            <label className="block text-slate-400 mb-1.5 font-semibold">EXPORT FORMAT</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setFormat('json')}
                className={`p-3 rounded border flex items-center justify-center gap-2 transition ${
                  format === 'json'
                    ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <FileCode className="w-4 h-4" />
                <span>JSON DOSSIER</span>
              </button>
              <button
                onClick={() => setFormat('csv')}
                className={`p-3 rounded border flex items-center justify-center gap-2 transition ${
                  format === 'csv'
                    ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>CSV SPREADSHEET</span>
              </button>
            </div>
          </div>

          {/* Metadata Preview */}
          <div className="p-3 rounded bg-slate-900/60 border border-slate-800 space-y-1.5 text-slate-400">
            <div className="flex justify-between">
              <span>Classification:</span>
              <span className="text-amber-400 font-bold">OFFICIAL USE ONLY // LAW ENFORCEMENT</span>
            </div>
            <div className="flex justify-between">
              <span>Authority:</span>
              <span className="text-slate-200">Team IQ100 Command</span>
            </div>
            <div className="flex justify-between">
              <span>Cryptographic Seal:</span>
              <span className="text-emerald-400">SHA-256 Checksum Validated</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
            >
              CANCEL
            </button>
            <button
              disabled={isExporting}
              onClick={handleDownload}
              className="px-5 py-2 rounded bg-cyan-500 hover:bg-cyan-400 text-black font-bold flex items-center gap-2 transition"
            >
              <Download className="w-4 h-4" />
              <span>{isExporting ? 'EXPORTING...' : 'EXPORT DOSSIER'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
