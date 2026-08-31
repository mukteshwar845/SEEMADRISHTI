import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';

interface SecurityContextType {
  // Device Protection Settings (matching user's reference design)
  pinLockEnabled: boolean;
  setPinLockEnabled: (enabled: boolean) => void;
  hasPinSet: boolean;
  setAppPin: (pin: string) => boolean;
  verifyPin: (pin: string) => boolean;
  
  biometricEnabled: boolean;
  setBiometricEnabled: (enabled: boolean) => void;
  
  hideSensitiveData: boolean;
  setHideSensitiveData: (hide: boolean) => void;
  
  screenshotProtection: boolean;
  setScreenshotProtection: (protect: boolean) => void;
  
  twoStepVerification: boolean;
  setTwoStepVerification: (twoStep: boolean) => void;
  
  autoLockMinutes: number; // 1, 5, 15, 30, or 0 (Never)
  setAutoLockMinutes: (mins: number) => void;
  
  // Screen Lock State & Controls
  isScreenLocked: boolean;
  lockNow: () => void;
  unlockScreen: (pin: string) => boolean;
  unlockWithBiometric: () => boolean;

  // PIN Change Modal Trigger
  isPinModalOpen: boolean;
  setIsPinModalOpen: (open: boolean) => void;
}

const SecurityContext = createContext<SecurityContextType | undefined>(undefined);

const STORAGE_KEYS = {
  PIN_ENABLED: 'seemadrishti_sec_pin_enabled',
  PIN_HASH: 'seemadrishti_sec_pin_hash',
  BIOMETRIC: 'seemadrishti_sec_biometric',
  HIDE_SENSITIVE: 'seemadrishti_sec_hide_sensitive',
  SCREENSHOT_PROTECT: 'seemadrishti_sec_screenshot_protect',
  TWO_STEP: 'seemadrishti_sec_two_step',
  AUTOLOCK_MINS: 'seemadrishti_sec_autolock_mins',
};

// Simple cryptographic hash simulation for client PIN storage with salt
function hashPin(pin: string): string {
  const salt = 'SEEMADRISHTI_MIL_SALT_2026';
  let hash = 0;
  const str = pin + salt;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return hash.toString(16);
}

export const SecurityProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pinLockEnabled, setPinLockEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.PIN_ENABLED) === 'true';
    } catch {
      return false;
    }
  });

  const [pinHash, setPinHash] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.PIN_HASH) || null;
    } catch {
      return null;
    }
  });

  const [biometricEnabled, setBiometricEnabledState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.BIOMETRIC) === 'true';
    } catch {
      return false;
    }
  });

  const [hideSensitiveData, setHideSensitiveDataState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.HIDE_SENSITIVE) === 'true';
    } catch {
      return false;
    }
  });

  const [screenshotProtection, setScreenshotProtectionState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.SCREENSHOT_PROTECT) === 'true';
    } catch {
      return false;
    }
  });

  const [twoStepVerification, setTwoStepVerificationState] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TWO_STEP) === 'true';
    } catch {
      return false;
    }
  });

  const [autoLockMinutes, setAutoLockMinutesState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AUTOLOCK_MINS);
      return saved ? parseInt(saved, 10) : 5;
    } catch {
      return 5;
    }
  });

  const [isScreenLocked, setIsScreenLocked] = useState<boolean>(false);
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);

  // Set & persist PIN lock toggle
  const setPinLockEnabled = (enabled: boolean) => {
    setPinLockEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.PIN_ENABLED, String(enabled));
    } catch {}
    if (enabled && !pinHash) {
      setIsPinModalOpen(true);
    }
  };

  const setBiometricEnabled = (enabled: boolean) => {
    setBiometricEnabledState(enabled);
    try {
      localStorage.setItem(STORAGE_KEYS.BIOMETRIC, String(enabled));
    } catch {}
  };

  const setHideSensitiveData = (hide: boolean) => {
    setHideSensitiveDataState(hide);
    try {
      localStorage.setItem(STORAGE_KEYS.HIDE_SENSITIVE, String(hide));
    } catch {}
  };

  const setScreenshotProtection = (protect: boolean) => {
    setScreenshotProtectionState(protect);
    try {
      localStorage.setItem(STORAGE_KEYS.SCREENSHOT_PROTECT, String(protect));
    } catch {}
  };

  const setTwoStepVerification = (twoStep: boolean) => {
    setTwoStepVerificationState(twoStep);
    try {
      localStorage.setItem(STORAGE_KEYS.TWO_STEP, String(twoStep));
    } catch {}
  };

  const setAutoLockMinutes = (mins: number) => {
    setAutoLockMinutesState(mins);
    try {
      localStorage.setItem(STORAGE_KEYS.AUTOLOCK_MINS, String(mins));
    } catch {}
  };

  const setAppPin = (pin: string): boolean => {
    if (!/^\d{6}$/.test(pin)) return false;
    const h = hashPin(pin);
    setPinHash(h);
    try {
      localStorage.setItem(STORAGE_KEYS.PIN_HASH, h);
    } catch {}
    return true;
  };

  const verifyPin = useCallback(
    (pin: string): boolean => {
      if (!pinHash) return true; // if no PIN configured, pass
      return hashPin(pin) === pinHash;
    },
    [pinHash]
  );

  const lockNow = () => {
    setIsScreenLocked(true);
  };

  const unlockScreen = (pin: string): boolean => {
    if (verifyPin(pin)) {
      setIsScreenLocked(false);
      return true;
    }
    return false;
  };

  const unlockWithBiometric = (): boolean => {
    if (biometricEnabled) {
      setIsScreenLocked(false);
      return true;
    }
    return false;
  };

  // Idle Timer for Auto-Lock
  useEffect(() => {
    if (!pinLockEnabled || autoLockMinutes <= 0) return;

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsScreenLocked(true);
      }, autoLockMinutes * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'mousedown', 'touchstart', 'scroll'];
    events.forEach((ev) => window.addEventListener(ev, resetTimer));

    resetTimer();

    return () => {
      clearTimeout(timeoutId);
      events.forEach((ev) => window.removeEventListener(ev, resetTimer));
    };
  }, [pinLockEnabled, autoLockMinutes]);

  // Sensitive Data Shield & Screenshot Protection DOM attributes
  useEffect(() => {
    const root = document.documentElement;
    if (hideSensitiveData) {
      root.classList.add('hide-sensitive-mode');
    } else {
      root.classList.remove('hide-sensitive-mode');
    }

    if (screenshotProtection) {
      root.classList.add('screenshot-protection-active');
    } else {
      root.classList.remove('screenshot-protection-active');
    }
  }, [hideSensitiveData, screenshotProtection]);

  return (
    <SecurityContext.Provider
      value={{
        pinLockEnabled,
        setPinLockEnabled,
        hasPinSet: Boolean(pinHash),
        setAppPin,
        verifyPin,
        biometricEnabled,
        setBiometricEnabled,
        hideSensitiveData,
        setHideSensitiveData,
        screenshotProtection,
        setScreenshotProtection,
        twoStepVerification,
        setTwoStepVerification,
        autoLockMinutes,
        setAutoLockMinutes,
        isScreenLocked,
        lockNow,
        unlockScreen,
        unlockWithBiometric,
        isPinModalOpen,
        setIsPinModalOpen,
      }}
    >
      {children}
    </SecurityContext.Provider>
  );
};

export const useSecurity = (): SecurityContextType => {
  const context = useContext(SecurityContext);
  if (!context) {
    throw new Error('useSecurity must be used within a SecurityProvider');
  }
  return context;
};
