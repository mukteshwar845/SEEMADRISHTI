import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Lock,
  Unlock,
  Fingerprint,
  AlertCircle,
  Delete,
  Shield,
  LogOut,
  ShieldCheck,
} from 'lucide-react';
import { useSecurity } from '../../context/SecurityContext';
import { useAuth } from '../../context/AuthContext';
import { SeemadrishtiLogo } from '../layout/SeemadrishtiLogo';

export const ScreenLockOverlay: React.FC = () => {
  const { isScreenLocked, unlockScreen, unlockWithBiometric, biometricEnabled } = useSecurity();
  const { user, logout } = useAuth();
  const [enteredPin, setEnteredPin] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isScreenLocked) {
      setEnteredPin('');
      setErrorMsg(null);
      containerRef.current?.focus();
    }
  }, [isScreenLocked]);

  const handleDigit = useCallback(
    (digit: string) => {
      setEnteredPin((prev) => {
        if (prev.length >= 6) return prev;
        const next = prev + digit;
        setErrorMsg(null);

        if (next.length === 6) {
          // Auto-validate on 6th digit
          setTimeout(() => {
            const success = unlockScreen(next);
            if (!success) {
              setErrorMsg('Invalid Security PIN. Access Denied.');
              setIsShaking(true);
              setTimeout(() => {
                setEnteredPin('');
                setIsShaking(false);
              }, 600);
            }
          }, 150);
        }
        return next;
      });
    },
    [unlockScreen]
  );

  const handleBackspace = useCallback(() => {
    setEnteredPin((prev) => {
      if (prev.length > 0) {
        setErrorMsg(null);
        return prev.slice(0, -1);
      }
      return prev;
    });
  }, []);

  // Global Physical Keyboard Listener (0-9, Backspace, Delete, Enter, Escape)
  useEffect(() => {
    if (!isScreenLocked) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
        setActiveKey(e.key);
        setTimeout(() => setActiveKey(null), 150);
        handleDigit(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        e.stopPropagation();
        setActiveKey('backspace');
        setTimeout(() => setActiveKey(null), 150);
        handleBackspace();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setEnteredPin('');
        setErrorMsg(null);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (enteredPin.length === 6) {
          const success = unlockScreen(enteredPin);
          if (!success) {
            setErrorMsg('Invalid Security PIN. Access Denied.');
            setIsShaking(true);
            setTimeout(() => {
              setEnteredPin('');
              setIsShaking(false);
            }, 600);
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown, true);
    return () => {
      window.removeEventListener('keydown', onKeyDown, true);
    };
  }, [isScreenLocked, enteredPin, handleDigit, handleBackspace, unlockScreen]);

  if (!isScreenLocked) return null;

  const handleBiometricClick = () => {
    const success = unlockWithBiometric();
    if (!success) {
      setErrorMsg('Biometric authentication unavailable or not configured.');
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className="fixed inset-0 z-[9999] bg-[#02050c]/90 backdrop-blur-2xl flex flex-col items-center justify-between p-6 select-none font-mono text-slate-200 outline-none overflow-hidden"
    >
      {/* Background Atmosphere: Subtle Radial Light & Grid */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-cyan-500/[0.05] rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#00f0ff0f_1px,transparent_1px)] [background-size:32px_32px] opacity-60" />
      </div>

      {/* Top Banner */}
      <div className="w-full max-w-md flex items-center justify-between pt-3 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-950/40 border border-cyan-500/30 backdrop-blur-md flex items-center justify-center shadow-[0_0_15px_rgba(0,240,255,0.25)] shrink-0">
            <SeemadrishtiLogo size={24} animated={true} />
          </div>
          <div className="flex flex-col">
            <span className="text-xs sm:text-sm font-black tracking-widest text-cyan-300 drop-shadow-[0_0_8px_rgba(0,240,255,0.4)] font-mono leading-tight">
              SEEMADRISHTI
            </span>
            <span className="text-[9px] font-mono tracking-[0.2em] text-cyan-400/80 uppercase font-semibold leading-tight">
              DEFENSE LOCK
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-950/40 border border-rose-500/40 text-[10px] text-rose-300 font-bold tracking-wider backdrop-blur-md shadow-[0_0_14px_rgba(244,63,94,0.2)] shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
          <Lock size={12} className="text-rose-400" />
          <span>TERMINAL LOCKED</span>
        </div>
      </div>

      {/* Center Transparent Glass Panel */}
      <div className="w-full max-w-[370px] rounded-3xl p-6 sm:p-7 bg-slate-900/35 backdrop-blur-2xl border border-cyan-500/25 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9),0_0_35px_rgba(0,240,255,0.08),inset_0_1px_2px_rgba(255,255,255,0.18)] flex flex-col items-center relative overflow-hidden my-auto z-10">
        {/* Specular Top-Edge Reflection */}
        <div className="h-[1px] w-full bg-gradient-to-r from-transparent via-cyan-400/80 to-transparent absolute top-0 left-0 shadow-[0_0_12px_#00f0ff] pointer-events-none" />

        {/* Tactical Corner Reticles */}
        <div className="absolute top-3 left-3 w-3 h-3 border-t border-l border-cyan-400/70 pointer-events-none drop-shadow-[0_0_4px_#00f0ff]" />
        <div className="absolute top-3 right-3 w-3 h-3 border-t border-r border-cyan-400/70 pointer-events-none drop-shadow-[0_0_4px_#00f0ff]" />
        <div className="absolute bottom-3 left-3 w-3 h-3 border-b border-l border-cyan-400/70 pointer-events-none drop-shadow-[0_0_4px_#00f0ff]" />
        <div className="absolute bottom-3 right-3 w-3 h-3 border-b border-r border-cyan-400/70 pointer-events-none drop-shadow-[0_0_4px_#00f0ff]" />

        {/* Operator Badge */}
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="relative mb-3 group">
            <div className="w-16 h-16 rounded-2xl border border-cyan-400/40 bg-gradient-to-b from-cyan-400/15 via-cyan-950/30 to-black/50 flex items-center justify-center shadow-[0_0_28px_rgba(0,240,255,0.25),inset_0_1px_1px_rgba(255,255,255,0.3)] backdrop-blur-xl transition-transform duration-300 group-hover:scale-105">
              <Shield size={30} className="text-cyan-300 drop-shadow-[0_0_10px_#00f0ff]" />
            </div>
            <div className="absolute -inset-1.5 border border-dashed border-cyan-400/20 rounded-2xl pointer-events-none" />
          </div>

          <h2 className="text-base font-bold text-white tracking-wider drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
            {user?.name || 'Authorized Operator'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5 tracking-wide">
            [{user?.role || 'Surveillance Unit'}] &bull; {user?.assigned_sector || 'Border Command'}
          </p>
        </div>

        {/* 6-Digit PIN Indicator Dots */}
        <div
          className={`flex items-center gap-3.5 mb-6 transition-transform ${
            isShaking ? 'animate-bounce text-rose-500' : ''
          }`}
        >
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const isFilled = index < enteredPin.length;
            return (
              <div
                key={index}
                className={`w-3.5 h-3.5 rounded-full transition-all duration-200 relative ${
                  isFilled
                    ? 'bg-cyan-400 border border-cyan-200 shadow-[0_0_14px_#00f0ff,0_0_24px_rgba(0,240,255,0.5),inset_0_1px_2px_rgba(255,255,255,0.9)] scale-110'
                    : 'border border-cyan-500/30 bg-black/50 shadow-[inset_0_1px_3px_rgba(0,0,0,0.7)]'
                }`}
              >
                {isFilled && (
                  <span className="absolute top-0.5 left-0.5 w-1 h-1 rounded-full bg-white/90" />
                )}
              </div>
            );
          })}
        </div>

        {/* Error Notification */}
        {errorMsg && (
          <div className="mb-4 px-3.5 py-1.5 rounded-xl bg-rose-950/60 backdrop-blur-md border border-rose-500/40 text-rose-200 text-xs flex items-center gap-2 shadow-[0_0_16px_rgba(244,63,94,0.3)] animate-shake">
            <AlertCircle size={14} className="shrink-0 text-rose-400" />
            <span className="font-semibold">{errorMsg}</span>
          </div>
        )}

        {/* 3x4 Transparent Glass Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => {
            const isPressed = activeKey === digit;
            return (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className={`h-14 rounded-2xl text-lg font-black transition-all cursor-pointer flex items-center justify-center backdrop-blur-md border ${
                  isPressed
                    ? 'border-cyan-300 bg-cyan-500/35 text-cyan-100 scale-95 shadow-[0_0_22px_#00f0ff,inset_0_1px_2px_rgba(255,255,255,0.4)]'
                    : 'border-white/[0.12] bg-white/[0.04] text-white hover:bg-cyan-500/15 hover:border-cyan-400/50 hover:shadow-[0_0_18px_rgba(0,240,255,0.25)] hover:text-cyan-200 active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)]'
                }`}
              >
                <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">{digit}</span>
              </button>
            );
          })}

          {/* Biometric Unlock (Bottom Left) */}
          <button
            type="button"
            onClick={handleBiometricClick}
            disabled={!biometricEnabled}
            className={`h-14 rounded-2xl border flex items-center justify-center transition-all cursor-pointer backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] ${
              biometricEnabled
                ? 'border-emerald-500/40 bg-emerald-950/25 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400/60 hover:shadow-[0_0_18px_rgba(16,185,129,0.35)] active:scale-95'
                : 'border-white/5 bg-white/[0.02] text-slate-600 opacity-35 cursor-not-allowed'
            }`}
            title={biometricEnabled ? 'Quick Biometric Unlock' : 'Biometric unlock disabled'}
          >
            <Fingerprint size={22} className={biometricEnabled ? 'drop-shadow-[0_0_8px_rgba(16,185,129,0.7)]' : ''} />
          </button>

          {/* Zero (Bottom Center) */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className={`h-14 rounded-2xl text-lg font-black transition-all cursor-pointer flex items-center justify-center backdrop-blur-md border ${
              activeKey === '0'
                ? 'border-cyan-300 bg-cyan-500/35 text-cyan-100 scale-95 shadow-[0_0_22px_#00f0ff,inset_0_1px_2px_rgba(255,255,255,0.4)]'
                : 'border-white/[0.12] bg-white/[0.04] text-white hover:bg-cyan-500/15 hover:border-cyan-400/50 hover:shadow-[0_0_18px_rgba(0,240,255,0.25)] hover:text-cyan-200 active:scale-95 shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)]'
            }`}
          >
            <span className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">0</span>
          </button>

          {/* Backspace (Bottom Right) */}
          <button
            type="button"
            onClick={handleBackspace}
            className={`h-14 rounded-2xl border transition-all cursor-pointer flex items-center justify-center backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.4),inset_0_1px_1px_rgba(255,255,255,0.15)] ${
              activeKey === 'backspace'
                ? 'border-rose-400 bg-rose-500/35 text-rose-100 scale-95 shadow-[0_0_20px_rgba(244,63,94,0.5)]'
                : 'border-white/[0.12] bg-white/[0.04] text-slate-300 hover:text-rose-300 hover:border-rose-500/40 hover:bg-rose-950/30 hover:shadow-[0_0_18px_rgba(244,63,94,0.25)] active:scale-95'
            }`}
            title="Backspace (or press Backspace on keyboard)"
          >
            <Delete size={20} className="drop-shadow-[0_0_6px_rgba(244,63,94,0.4)]" />
          </button>
        </div>
      </div>

      {/* Bottom Status & Logout Bar */}
      <div className="w-full max-w-md pb-3 flex items-center justify-between text-xs relative z-10">
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_#10b981]" />
          <span className="tracking-wider">SECURE DEFENSE TERMINAL &bull; 256-BIT</span>
        </div>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-950/25 hover:bg-rose-950/50 border border-rose-500/30 hover:border-rose-500/60 text-rose-400 hover:text-rose-200 transition-all cursor-pointer text-xs font-bold uppercase tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.15)] hover:shadow-[0_0_18px_rgba(244,63,94,0.3)]"
        >
          <LogOut size={13} className="drop-shadow-[0_0_6px_#f43f5e]" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
