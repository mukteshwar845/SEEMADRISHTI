import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppTheme = 'military-matrix' | 'daylight-field' | 'standard';

interface ThemeContextType {
  theme: AppTheme;
  themeLabel: string;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isDaylight: boolean;
  isMilitaryMatrix: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'seemadrishti_tactical_theme_v2';

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
      if (saved === 'military-matrix' || saved === 'daylight-field' || saved === 'standard') {
        return saved;
      }
    } catch {
      // ignore
    }
    return 'military-matrix';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {
      // ignore
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'military-matrix' ? 'daylight-field' : 'military-matrix');
  };

  const isDaylight = theme === 'daylight-field' || theme === 'standard';
  const isMilitaryMatrix = theme === 'military-matrix';
  const themeLabel = isDaylight ? 'Standard (High-Visibility Daylight)' : 'Military Matrix (Tactical Dark)';

  useEffect(() => {
    const root = document.documentElement;
    const activeTheme = isDaylight ? 'daylight-field' : 'military-matrix';
    
    root.setAttribute('data-theme', activeTheme);
    root.setAttribute('data-theme-name', isDaylight ? 'standard-high-visibility' : 'military-matrix');

    if (isDaylight) {
      root.classList.add('theme-daylight', 'theme-standard');
      root.classList.remove('theme-matrix', 'theme-military');
    } else {
      root.classList.add('theme-matrix', 'theme-military');
      root.classList.remove('theme-daylight', 'theme-standard');
    }
  }, [theme, isDaylight]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeLabel,
        setTheme,
        toggleTheme,
        isDaylight,
        isMilitaryMatrix,
      }}
    >
      <div 
        id="seemadrishti-theme-wrapper" 
        className={`w-full min-h-screen transition-colors duration-300 ${isDaylight ? 'theme-daylight bg-slate-100 text-slate-900' : 'theme-matrix bg-black text-slate-100'}`}
        data-theme={isDaylight ? 'daylight-field' : 'military-matrix'}
      >
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};

