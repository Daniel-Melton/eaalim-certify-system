'use client';

import { createContext, useContext, useState, useEffect } from 'react';

/**
 * ThemeContext.js
 *
 * App-wide light / dark theme toggle. The active theme is written to
 *
 *   document.documentElement.setAttribute('data-theme', 'light' | 'dark')
 *
 * which lets globals.css override structural colors via a single
 * `[data-theme="light"] { ... }` block. The choice is persisted in
 * localStorage under the key `ec:theme`.
 *
 * On first mount we hydrate from localStorage; if nothing is stored we
 * default to 'dark' (the original palette). The initial `useState` value
 * is 'dark' too so there's no flash of the wrong theme during SSR.
 *
 * The crimson/ember brand accents stay the same in both themes — only
 * the "shell" colors (backgrounds, panel fills, borders, body text)
 * swap. This keeps brand identity consistent while giving users a
 * genuinely readable light mode.
 */

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  // Hydrate persisted preference on mount.
  //
  // We use a VERSIONED key (`ec:theme:v2`) so that any previously-stored
  // preference under the old key (`ec:theme`) is ignored — everyone
  // starts fresh on dark. Once a user explicitly toggles, their choice
  // is saved under the new key and respected on reload.
  //
  // If you ever want to force a reset again in the future, just bump
  // the version in the key (v2 -> v3, etc.).
  useEffect(() => {
    try {
      const stored = localStorage.getItem('ec:theme:v2');
      if (stored === 'light' || stored === 'dark') {
        setTheme(stored);
      }
    } catch {}
  }, []);

  // Reflect the current theme on <html> so CSS can target it
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const updateTheme = (next) => {
    setTheme(next);
    try { localStorage.setItem('ec:theme:v2', next); } catch {}
  };

  const toggleTheme = () => updateTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <ThemeContext.Provider value={{ theme, setTheme: updateTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
}
