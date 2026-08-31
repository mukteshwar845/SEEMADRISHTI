import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type AppTheme =
  | 'military-matrix'
  | 'daylight-field'
  | 'midnight-cyber'
  | 'obsidian-stealth'
  | 'emerald-ops';

export type AccentColor =
  | 'cyan'
  | 'emerald'
  | 'amber'
  | 'crimson'
  | 'purple'
  | 'cobalt';

export type FontFamily =
  | 'jetbrains'
  | 'sharetech'
  | 'inter'
  | 'rajdhani'
  | 'firacode';

export type TextColorCombo =
  | 'high-contrast'
  | 'amber-phosphor'
  | 'green-phosphor'
  | 'cool-frost';

export type FontScale = 'compact' | 'standard' | 'large';

interface ThemeContextType {
  theme: AppTheme;
  themeLabel: string;
  setTheme: (theme: AppTheme) => void;
  toggleTheme: () => void;
  isDaylight: boolean;
  isMilitaryMatrix: boolean;

  // Appearance Customizations
  accentColor: AccentColor;
  setAccentColor: (accent: AccentColor) => void;
  fontFamily: FontFamily;
  setFontFamily: (font: FontFamily) => void;
  textColorCombo: TextColorCombo;
  setTextColorCombo: (combo: TextColorCombo) => void;
  fontScale: FontScale;
  setFontScale: (scale: FontScale) => void;
  
  // Reset all appearance to tactical defaults
  resetAppearanceDefaults: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'seemadrishti_tactical_theme_v3';
const ACCENT_STORAGE_KEY = 'seemadrishti_accent_color_v3';
const FONT_STORAGE_KEY = 'seemadrishti_font_family_v3';
const TEXT_COMBO_STORAGE_KEY = 'seemadrishti_text_combo_v3';
const FONT_SCALE_STORAGE_KEY = 'seemadrishti_font_scale_v3';

export const ACCENT_COLOR_MAP: Record<AccentColor, { label: string; hex: string; glow: string; border: string; bg: string }> = {
  cyan: { label: 'Tactical Cyan', hex: '#00f0ff', glow: '0 0 15px rgba(0, 240, 255, 0.4)', border: 'rgba(0, 240, 255, 0.3)', bg: 'rgba(0, 240, 255, 0.1)' },
  emerald: { label: 'Matrix Emerald', hex: '#10b981', glow: '0 0 15px rgba(16, 185, 129, 0.4)', border: 'rgba(16, 185, 129, 0.3)', bg: 'rgba(16, 185, 129, 0.1)' },
  amber: { label: 'DEFCON Amber', hex: '#f59e0b', glow: '0 0 15px rgba(245, 158, 11, 0.4)', border: 'rgba(245, 158, 11, 0.3)', bg: 'rgba(245, 158, 11, 0.1)' },
  crimson: { label: 'Red Alert Crimson', hex: '#ff0055', glow: '0 0 15px rgba(255, 0, 85, 0.4)', border: 'rgba(255, 0, 85, 0.3)', bg: 'rgba(255, 0, 85, 0.1)' },
  purple: { label: 'Neon Cyber Purple', hex: '#a855f7', glow: '0 0 15px rgba(168, 85, 247, 0.4)', border: 'rgba(168, 85, 247, 0.3)', bg: 'rgba(168, 85, 247, 0.1)' },
  cobalt: { label: 'Deep Sea Cobalt', hex: '#3b82f6', glow: '0 0 15px rgba(59, 130, 246, 0.4)', border: 'rgba(59, 130, 246, 0.3)', bg: 'rgba(59, 130, 246, 0.1)' },
};

export const FONT_FAMILY_MAP: Record<FontFamily, { label: string; css: string; category: string }> = {
  jetbrains: { label: 'JetBrains Mono (Military Default)', css: "'JetBrains Mono', monospace", category: 'Monospace Code' },
  sharetech: { label: 'Share Tech Mono (Tactical HUD)', css: "'Share Tech Mono', monospace", category: 'Sci-Fi Tactical' },
  inter: { label: 'Inter (Modern High-Readability)', css: "'Inter', sans-serif", category: 'Clean Sans' },
  rajdhani: { label: 'Rajdhani (Aerospace Tech)', css: "'Rajdhani', sans-serif", category: 'Geometric Tech' },
  firacode: { label: 'Fira Code (Terminal Symbol)', css: "'Fira Code', monospace", category: 'Telemetry Code' },
};

export const TEXT_COMBO_MAP: Record<TextColorCombo, { label: string; primary: string; secondary: string; glow: string }> = {
  'high-contrast': { label: 'Pure Tactical White & Silver', primary: '#ffffff', secondary: '#94a3b8', glow: 'rgba(255,255,255,0.2)' },
  'amber-phosphor': { label: 'CRT Amber Phosphor', primary: '#fbbf24', secondary: '#d97706', glow: 'rgba(251, 191, 36, 0.3)' },
  'green-phosphor': { label: 'Radar Green Phosphor', primary: '#4ade80', secondary: '#16a34a', glow: 'rgba(74, 222, 128, 0.3)' },
  'cool-frost': { label: 'Cryo Frost Cyan', primary: '#a5f3fc', secondary: '#38bdf8', glow: 'rgba(165, 243, 252, 0.3)' },
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<AppTheme>(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme | null;
      if (['military-matrix', 'daylight-field', 'midnight-cyber', 'obsidian-stealth', 'emerald-ops'].includes(saved as any)) {
        return saved!;
      }
    } catch {}
    return 'military-matrix';
  });

  const [accentColor, setAccentColorState] = useState<AccentColor>(() => {
    try {
      const saved = localStorage.getItem(ACCENT_STORAGE_KEY) as AccentColor | null;
      if (['cyan', 'emerald', 'amber', 'crimson', 'purple', 'cobalt'].includes(saved as any)) {
        return saved!;
      }
    } catch {}
    return 'cyan';
  });

  const [fontFamily, setFontFamilyState] = useState<FontFamily>(() => {
    try {
      const saved = localStorage.getItem(FONT_STORAGE_KEY) as FontFamily | null;
      if (['jetbrains', 'sharetech', 'inter', 'rajdhani', 'firacode'].includes(saved as any)) {
        return saved!;
      }
    } catch {}
    return 'jetbrains';
  });

  const [textColorCombo, setTextColorComboState] = useState<TextColorCombo>(() => {
    try {
      const saved = localStorage.getItem(TEXT_COMBO_STORAGE_KEY) as TextColorCombo | null;
      if (['high-contrast', 'amber-phosphor', 'green-phosphor', 'cool-frost'].includes(saved as any)) {
        return saved!;
      }
    } catch {}
    return 'high-contrast';
  });

  const [fontScale, setFontScaleState] = useState<FontScale>(() => {
    try {
      const saved = localStorage.getItem(FONT_SCALE_STORAGE_KEY) as FontScale | null;
      if (['compact', 'standard', 'large'].includes(saved as any)) {
        return saved!;
      }
    } catch {}
    return 'standard';
  });

  const setTheme = (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    } catch {}
  };

  const setAccentColor = (accent: AccentColor) => {
    setAccentColorState(accent);
    try {
      localStorage.setItem(ACCENT_STORAGE_KEY, accent);
    } catch {}
  };

  const setFontFamily = (font: FontFamily) => {
    setFontFamilyState(font);
    try {
      localStorage.setItem(FONT_STORAGE_KEY, font);
    } catch {}
  };

  const setTextColorCombo = (combo: TextColorCombo) => {
    setTextColorComboState(combo);
    try {
      localStorage.setItem(TEXT_COMBO_STORAGE_KEY, combo);
    } catch {}
  };

  const setFontScale = (scale: FontScale) => {
    setFontScaleState(scale);
    try {
      localStorage.setItem(FONT_SCALE_STORAGE_KEY, scale);
    } catch {}
  };

  const resetAppearanceDefaults = () => {
    setTheme('military-matrix');
    setAccentColor('cyan');
    setFontFamily('jetbrains');
    setTextColorCombo('high-contrast');
    setFontScale('standard');
  };

  const toggleTheme = () => {
    setTheme(theme === 'military-matrix' ? 'daylight-field' : 'military-matrix');
  };

  const isDaylight = theme === 'daylight-field';
  const isMilitaryMatrix = theme === 'military-matrix';

  const themeLabelMap: Record<AppTheme, string> = {
    'military-matrix': 'Military Matrix (Tactical Dark)',
    'daylight-field': 'Daylight Field (High-Visibility)',
    'midnight-cyber': 'Midnight Cyber (Deep Indigo)',
    'obsidian-stealth': 'Obsidian Stealth (OLED Pitch Black)',
    'emerald-ops': 'Emerald Tactical Ops (Night Vision)',
  };
  const themeLabel = themeLabelMap[theme] || 'Military Matrix';

  // Apply CSS Variables and HTML root attributes dynamically
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    root.setAttribute('data-accent', accentColor);
    root.setAttribute('data-font', fontFamily);
    root.setAttribute('data-text-combo', textColorCombo);
    root.setAttribute('data-font-scale', fontScale);

    const accentMeta = ACCENT_COLOR_MAP[accentColor];
    const fontMeta = FONT_FAMILY_MAP[fontFamily];
    const textMeta = TEXT_COMBO_MAP[textColorCombo];

    root.style.setProperty('--accent-active-color', accentMeta.hex);
    root.style.setProperty('--accent-glow', accentMeta.glow);
    root.style.setProperty('--font-primary', fontMeta.css);
    root.style.setProperty('--custom-text-primary', textMeta.primary);
    root.style.setProperty('--custom-text-secondary', textMeta.secondary);

    const scalePercents = { compact: '92%', standard: '100%', large: '108%' };
    root.style.setProperty('--font-scale-percent', scalePercents[fontScale]);

    // Theme Classes
    root.classList.remove(
      'theme-daylight',
      'theme-matrix',
      'theme-cyber',
      'theme-obsidian',
      'theme-emerald'
    );
    if (theme === 'daylight-field') root.classList.add('theme-daylight');
    else if (theme === 'midnight-cyber') root.classList.add('theme-cyber');
    else if (theme === 'obsidian-stealth') root.classList.add('theme-obsidian');
    else if (theme === 'emerald-ops') root.classList.add('theme-emerald');
    else root.classList.add('theme-matrix');
  }, [theme, accentColor, fontFamily, textColorCombo, fontScale]);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeLabel,
        setTheme,
        toggleTheme,
        isDaylight,
        isMilitaryMatrix,
        accentColor,
        setAccentColor,
        fontFamily,
        setFontFamily,
        textColorCombo,
        setTextColorCombo,
        fontScale,
        setFontScale,
        resetAppearanceDefaults,
      }}
    >
      <div
        id="seemadrishti-theme-wrapper"
        className={`w-full min-h-screen transition-colors duration-300 ${
          isDaylight
            ? 'theme-daylight bg-slate-100 text-slate-900'
            : theme === 'midnight-cyber'
            ? 'bg-[#030712] text-slate-100'
            : theme === 'obsidian-stealth'
            ? 'bg-[#000000] text-slate-100'
            : theme === 'emerald-ops'
            ? 'bg-[#021009] text-emerald-100'
            : 'theme-matrix bg-[#02040a] text-slate-100'
        }`}
        style={{
          fontFamily: FONT_FAMILY_MAP[fontFamily]?.css,
        }}
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
