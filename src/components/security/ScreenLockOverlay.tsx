import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Lock,
  Unlock,
  Fingerprint,
  AlertCircle,
  Delete,
  Shield,
  LogOut,
  Sparkles,
  Keyboard,
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
      // Auto-focus container for keyboard events
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
      // Direct number keys (0-9)
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
      className="fixed inset-0 z-[9999] bg-[#020409]/95 backdrop-blur-2xl flex flex-col items-center justify-between p-6 select-none font-mono text-slate-200 outline-none"
    >
      {/* Top Banner */}
      <div className="w-full max-w-md flex items-center justify-between pt-4">
        <div className="flex items-center gap-2">
          <SeemadrishtiLogo className="w-6 h-6 text-cyan-400" />
          <span className="text-xs font-black tracking-widest text-cyan-400">
            SEEMADRISHTI DEFENSE LOCK
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-rose-950/80 border border-rose-500/40 text-[10px] text-rose-300 font-bold">
          <Lock size={12} className="text-rose-400" />
          <span>TERMINAL LOCKED</span>
        </div>
      </div>

      {/* Center Unlock Pad */}
      <div className="w-full max-w-sm flex flex-col items-center">
        {/* Operator Badge */}
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="w-16 h-16 rounded-2xl border-2 border-cyan-500/40 bg-cyan-950/40 flex items-center justify-center shadow-[0_0_30px_rgba(0,240,255,0.2)] mb-3">
            <Shield size={32} className="text-cyan-400" />
          </div>
          <h2 className="text-base font-black text-white tracking-wider">
            {user?.name || 'Authorized Operator'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            [{user?.role || 'Surveillance Unit'}] &bull; {user?.assigned_sector || 'Border Command'}
          </p>
        </div>

        {/* 6-Digit PIN Indicator Dots */}
        <div
          className={`flex items-center gap-3.5 mb-5 transition-transform ${
            isShaking ? 'animate-bounce text-rose-500' : ''
          }`}
        >
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const isFilled = index < enteredPin.length;
            return (
              <div
                key={index}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'bg-cyan-400 border-cyan-300 shadow-[0_0_12px_#00f0ff] scale-110'
                    : 'border-slate-700 bg-black/40'
                }`}
              />
            );
          })}
        </div>

        {/* Keyboard Input Guide Badge */}
        <div className="flex items-center gap-1.5 text-[10px] text-cyan-400/80 mb-4 bg-cyan-950/40 border border-cyan-500/30 px-3 py-1 rounded-full font-mono shadow-xs">
          <Keyboard size={12} className="text-cyan-300 animate-pulse" />
          <span>TYPE PIN (0-9) ON KEYBOARD OR CLICK KEYPAD</span>
        </div>

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 px-3 py-1.5 rounded-lg bg-rose-950/70 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-shake">
            <AlertCircle size={14} className="shrink-0 text-rose-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* 3x4 Keypad Grid */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => {
            const isPressed = activeKey === digit;
            return (
              <button
                key={digit}
                type="button"
                onClick={() => handleDigit(digit)}
                className={`h-14 rounded-2xl border text-lg font-black transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center ${
                  isPressed
                    ? 'border-cyan-400 bg-cyan-500 text-black scale-95 shadow-[0_0_15px_#00f0ff]'
                    : 'border-slate-800 bg-slate-900/60 hover:bg-cyan-950/50 hover:border-cyan-500/40 text-white active:scale-90'
                }`}
              >
                {digit}
              </button>
            );
          })}

          {/* Biometric Unlock (Bottom Left) */}
          <button
            type="button"
            onClick={handleBiometricClick}
            disabled={!biometricEnabled}
            className={`h-14 rounded-2xl border flex items-center justify-center transition-all cursor-pointer active:scale-90 ${
              biometricEnabled
                ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-400 hover:bg-emerald-900/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]'
                : 'border-slate-800 bg-slate-950/40 text-slate-600 opacity-40 cursor-not-allowed'
            }`}
            title={biometricEnabled ? 'Quick Biometric Unlock' : 'Biometric unlock disabled'}
          >
            <Fingerprint size={24} />
          </button>

          {/* Zero (Bottom Center) */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className={`h-14 rounded-2xl border text-lg font-black transition-all cursor-pointer shadow-[0_4px_12px_rgba(0,0,0,0.5)] flex items-center justify-center ${
              activeKey === '0'
                ? 'border-cyan-400 bg-cyan-500 text-black scale-95 shadow-[0_0_15px_#00f0ff]'
                : 'border-slate-800 bg-slate-900/60 hover:bg-cyan-950/50 hover:border-cyan-500/40 text-white active:scale-90'
            }`}
          >
            0
          </button>

          {/* Backspace (Bottom Right) */}
          <button
            type="button"
            onClick={handleBackspace}
            className={`h-14 rounded-2xl border text-slate-300 hover:text-rose-300 transition-all cursor-pointer flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.5)] ${
              activeKey === 'backspace'
                ? 'border-rose-400 bg-rose-500 text-white scale-95 shadow-[0_0_15px_rgba(244,63,94,0.6)]'
                : 'border-slate-800 bg-slate-900/60 hover:bg-rose-950/40 hover:border-rose-500/40 active:scale-90'
            }`}
            title="Backspace (or press Backspace on keyboard)"
          >
            <Delete size={20} />
          </button>
        </div>
      </div>

      {/* Bottom Emergency / Logout action */}
      <div className="w-full max-w-md pb-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <span className="text-[10px] text-slate-500">
          Default Dev PIN: <code className="text-cyan-400">123456</code> (or your configured 6 digits)
        </span>

        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-rose-400 hover:text-rose-300 transition-colors cursor-pointer text-xs font-bold uppercase tracking-wider"
        >
          <LogOut size={13} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};
