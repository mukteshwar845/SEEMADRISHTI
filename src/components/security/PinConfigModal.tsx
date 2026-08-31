import React, { useState } from 'react';
import { Shield, Key, CheckCircle, AlertCircle, X } from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';

export const PinConfigModal: React.FC = () => {
  const { isPinModalOpen, setIsPinModalOpen, setAppPin, setPinLockEnabled } = useSecurity();
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isPinModalOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6 || !/^\d{6}$/.test(pin)) {
      setError('PIN must be exactly 6 numeric digits');
      return;
    }
    if (pin !== confirmPin) {
      setError('PIN and Confirmation PIN do not match');
      return;
    }

    const ok = setAppPin(pin);
    if (ok) {
      setPinLockEnabled(true);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setPin('');
        setConfirmPin('');
        setError(null);
        setIsPinModalOpen(false);
      }, 1200);
    } else {
      setError('Failed to configure PIN');
    }
  };

  const handleClose = () => {
    setIsPinModalOpen(false);
    setError(null);
    setPin('');
    setConfirmPin('');
  };

  return (
    <div className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 font-mono text-slate-200">
      <div className="w-full max-w-md bg-[#0a0f1d] border border-cyan-500/40 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,240,255,0.15)] relative">
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-800">
          <div className="p-2.5 rounded-xl bg-cyan-950/60 border border-cyan-500/40 text-cyan-400">
            <Key size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              Configure App PIN Lock
            </h3>
            <p className="text-xs text-slate-400">
              Set a 6-digit military clearance security PIN
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/50 border border-rose-500/40 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-950/50 border border-emerald-500/40 rounded-xl flex items-center gap-2 text-emerald-300 text-xs">
            <CheckCircle size={14} className="shrink-0" />
            <span>App PIN lock successfully encrypted and enabled.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              New 6-Digit PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-slate-700 focus:border-cyan-400 text-center tracking-[0.4em] font-mono text-lg text-white placeholder-slate-600 outline-none transition-colors"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              Confirm 6-Digit PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full px-4 py-2.5 rounded-xl bg-black/60 border border-slate-700 focus:border-cyan-400 text-center tracking-[0.4em] font-mono text-lg text-white placeholder-slate-600 outline-none transition-colors"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 rounded-xl border border-slate-700 hover:bg-slate-800 text-xs font-bold text-slate-300 uppercase tracking-wider transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-black text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(0,240,255,0.4)] cursor-pointer"
            >
              Save PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
