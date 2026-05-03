'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';

/**
 * CustomFontsContext
 *
 * Manages user-imported fonts (.ttf / .otf / .woff / .woff2):
 *   - On mount, reads persisted fonts from localStorage and registers each
 *     with the browser via the FontFace API so they render on HTML + Fabric.
 *   - addFont(file): reads the file as a data URL, derives a family name from
 *     the filename, registers it, and saves it to localStorage.
 *   - removeFont(family): unregisters and removes from storage.
 *
 * Data shape in storage (key 'ec:fonts'):
 *   [{ family: 'MyFont', dataUrl: 'data:font/ttf;base64,...' }, ...]
 */

const CustomFontsContext = createContext(null);
const STORAGE_KEY = 'ec:fonts';

// Track which families we've already registered this page load so we
// don't double-register and so that removal can unregister cleanly.
const registeredFontsRef = { current: new Map() };

function guessMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'ttf') return 'font/ttf';
  if (ext === 'otf') return 'font/otf';
  if (ext === 'woff') return 'font/woff';
  if (ext === 'woff2') return 'font/woff2';
  return 'application/octet-stream';
}

function familyFromFilename(filename) {
  // "MyCoolFont-Regular.ttf" -> "MyCoolFont-Regular"
  return filename
    .replace(/\.(ttf|otf|woff2?|TTF|OTF|WOFF2?)$/i, '')
    .replace(/[^\w\-]/g, ' ')
    .trim();
}

async function registerFont(family, dataUrl) {
  if (typeof window === 'undefined') return false;
  if (registeredFontsRef.current.has(family)) return true;
  try {
    const face = new FontFace(family, `url(${dataUrl})`);
    await face.load();
    document.fonts.add(face);
    registeredFontsRef.current.set(family, face);
    return true;
  } catch (err) {
    console.error('Font registration failed:', family, err);
    return false;
  }
}

function unregisterFont(family) {
  if (typeof window === 'undefined') return;
  const face = registeredFontsRef.current.get(family);
  if (face) {
    try { document.fonts.delete(face); } catch {}
    registeredFontsRef.current.delete(family);
  }
}

export function CustomFontsProvider({ children }) {
  const [fonts, setFonts] = useState([]);
  const [loaded, setLoaded] = useState(false);

  // Load & register persisted fonts on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) { setLoaded(true); return; }
      const stored = JSON.parse(raw);
      if (!Array.isArray(stored)) { setLoaded(true); return; }

      Promise.all(
        stored.map((f) => registerFont(f.family, f.dataUrl).then((ok) => ok ? f : null))
      ).then((results) => {
        setFonts(results.filter(Boolean));
        setLoaded(true);
      });
    } catch {
      setLoaded(true);
    }
  }, []);

  const persist = useCallback((list) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch {}
  }, []);

  const addFont = useCallback(async (file, familyOverride) => {
    if (!file) return null;
    // Read as data URL
    const dataUrl = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const family = (familyOverride && familyOverride.trim()) || familyFromFilename(file.name);
    if (!family) return null;

    const ok = await registerFont(family, dataUrl);
    if (!ok) return null;

    setFonts((prev) => {
      // If a font with this family exists, replace it
      const next = prev.filter((f) => f.family !== family);
      const entry = { family, dataUrl, filename: file.name, mime: guessMimeType(file.name) };
      const list = [...next, entry];
      persist(list);
      return list;
    });
    return family;
  }, [persist]);

  const removeFont = useCallback((family) => {
    unregisterFont(family);
    setFonts((prev) => {
      const next = prev.filter((f) => f.family !== family);
      persist(next);
      return next;
    });
  }, [persist]);

  return (
    <CustomFontsContext.Provider value={{ fonts, addFont, removeFont, loaded }}>
      {children}
    </CustomFontsContext.Provider>
  );
}

export function useCustomFonts() {
  const ctx = useContext(CustomFontsContext);
  if (!ctx) throw new Error('useCustomFonts must be used inside CustomFontsProvider');
  return ctx;
}
