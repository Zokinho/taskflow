import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type ThemeKey = 'pink' | 'blue' | 'purple' | 'green' | 'amber' | 'teal';

interface Palette {
  label: string;
  preview: string; // color for the dot in the picker
  shades: Record<string, string>;
}

const THEMES: Record<ThemeKey, Palette> = {
  pink: {
    label: 'Pink',
    preview: '#ec4899',
    shades: {
      '50': '#fdf2f8',
      '100': '#fce7f3',
      '200': '#fbcfe8',
      '300': '#f9a8d4',
      '400': '#f472b6',
      '500': '#ec4899',
      '600': '#db2777',
      '700': '#be185d',
      '800': '#9d174d',
      '900': '#831843',
    },
  },
  blue: {
    label: 'Blue',
    preview: '#3b82f6',
    shades: {
      '50': '#eff6ff',
      '100': '#dbeafe',
      '200': '#bfdbfe',
      '300': '#93c5fd',
      '400': '#60a5fa',
      '500': '#3b82f6',
      '600': '#2563eb',
      '700': '#1d4ed8',
      '800': '#1e40af',
      '900': '#1e3a8a',
    },
  },
  purple: {
    label: 'Purple',
    preview: '#a855f7',
    shades: {
      '50': '#faf5ff',
      '100': '#f3e8ff',
      '200': '#e9d5ff',
      '300': '#d8b4fe',
      '400': '#c084fc',
      '500': '#a855f7',
      '600': '#9333ea',
      '700': '#7e22ce',
      '800': '#6b21a8',
      '900': '#581c87',
    },
  },
  green: {
    label: 'Green',
    preview: '#22c55e',
    shades: {
      '50': '#f0fdf4',
      '100': '#dcfce7',
      '200': '#bbf7d0',
      '300': '#86efac',
      '400': '#4ade80',
      '500': '#22c55e',
      '600': '#16a34a',
      '700': '#15803d',
      '800': '#166534',
      '900': '#14532d',
    },
  },
  amber: {
    label: 'Amber',
    preview: '#f59e0b',
    shades: {
      '50': '#fffbeb',
      '100': '#fef3c7',
      '200': '#fde68a',
      '300': '#fcd34d',
      '400': '#fbbf24',
      '500': '#f59e0b',
      '600': '#d97706',
      '700': '#b45309',
      '800': '#92400e',
      '900': '#78350f',
    },
  },
  teal: {
    label: 'Teal',
    preview: '#14b8a6',
    shades: {
      '50': '#f0fdfa',
      '100': '#ccfbf1',
      '200': '#99f6e4',
      '300': '#5eead4',
      '400': '#2dd4bf',
      '500': '#14b8a6',
      '600': '#0d9488',
      '700': '#0f766e',
      '800': '#115e59',
      '900': '#134e4a',
    },
  },
};

const THEME_KEYS = Object.keys(THEMES) as ThemeKey[];
const STORAGE_KEY = 'taskflow-theme';

interface ThemeContextValue {
  theme: ThemeKey;
  setTheme: (key: ThemeKey) => void;
  themeKeys: ThemeKey[];
  themes: Record<ThemeKey, Palette>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyTheme(key: ThemeKey) {
  const palette = THEMES[key];
  const root = document.documentElement;
  for (const [shade, value] of Object.entries(palette.shades)) {
    root.style.setProperty(`--color-primary-${shade}`, value);
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeKey>(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in THEMES) return stored as ThemeKey;
    return 'pink';
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const setTheme = (key: ThemeKey) => {
    localStorage.setItem(STORAGE_KEY, key);
    setThemeState(key);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, themeKeys: THEME_KEYS, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
