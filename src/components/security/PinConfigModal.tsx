import React, { useState } from 'react';
import { Shield, Key, CheckCircle, AlertCircle, X, Lock } from 'lucide-react';
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
    <div className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4 font-mono text-slate-200">
      <div className="w-full max-w-md backdrop-blur-2xl bg-slate-950/75 border border-cyan-500/40 rounded-3xl p-7 shadow-[0_20px_60px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(0,240,255,0.25)] relative overflow-hidden">
        {/* Glow ambient highlight */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={handleClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-3.5 mb-5 pb-4 border-b border-white/[0.10]">
          <div className="p-3 rounded-2xl bg-cyan-500/15 border border-cyan-400/50 text-cyan-300 shadow-[0_0_15px_rgba(0,240,255,0.3)]">
            <Key size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              CONFIGURE APP PIN LOCK
            </h3>
            <p className="text-xs text-slate-400">
              Set a 6-digit military clearance security PIN
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-500/50 rounded-xl flex items-center gap-2 text-rose-300 text-xs shadow-[0_0_15px_rgba(244,63,94,0.25)]">
            <AlertCircle size={14} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-500/50 rounded-xl flex items-center gap-2 text-emerald-300 text-xs shadow-[0_0_15px_rgba(16,185,129,0.25)]">
            <CheckCircle size={14} className="shrink-0" />
            <span>App PIN lock successfully encrypted and enabled.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
              New 6-Digit PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full px-4 py-3 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-400 text-center tracking-[0.45em] font-mono text-xl text-cyan-300 placeholder-slate-600 outline-none transition-all shadow-inner focus:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 font-mono">
              Confirm 6-Digit PIN
            </label>
            <input
              type="password"
              maxLength={6}
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full px-4 py-3 rounded-xl bg-black/45 backdrop-blur-md border border-white/15 focus:border-cyan-400 text-center tracking-[0.45em] font-mono text-xl text-cyan-300 placeholder-slate-600 outline-none transition-all shadow-inner focus:shadow-[0_0_15px_rgba(0,240,255,0.3)]"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={handleClose}
              className="tactical-btn-3d px-4 py-2.5 rounded-xl border border-white/15 hover:bg-white/10 text-xs font-bold text-slate-300 uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="tactical-btn-3d px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-black text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(0,240,255,0.4)] cursor-pointer"
            >
              Save PIN
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
