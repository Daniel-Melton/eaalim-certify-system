'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const BrandingContext = createContext(null);

export function BrandingProvider({ children }) {
  const [appTitle, setAppTitle] = useState('Elite Certify');
  const [logoSrc, setLogoSrc] = useState(null);

  // Load from localStorage once on mount
  useEffect(() => {
    try {
      const t = localStorage.getItem('ec:title');
      const l = localStorage.getItem('ec:logo');
      if (t) setAppTitle(t);
      if (l) setLogoSrc(l);
    } catch {}
  }, []);

  const updateTitle = (t) => {
    setAppTitle(t);
    try { localStorage.setItem('ec:title', t); } catch {}
  };
  const updateLogo = (dataUrl) => {
    setLogoSrc(dataUrl);
    try {
      if (dataUrl) localStorage.setItem('ec:logo', dataUrl);
      else localStorage.removeItem('ec:logo');
    } catch {}
  };

  return (
    <BrandingContext.Provider value={{ appTitle, logoSrc, updateTitle, updateLogo }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  const ctx = useContext(BrandingContext);
  if (!ctx) throw new Error('useBranding must be used inside BrandingProvider');
  return ctx;
}
