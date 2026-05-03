'use client';

import { useState } from 'react';
import { useBranding } from '@/lib/brandingContext';
import { Sparkles, ChevronRight, Award } from 'lucide-react';
import ParticleBackground from './ParticleBackground';

/**
 * SplashScreen.js
 * Red/White/Orange gradient splash with:
 * - Animated gradient backdrop
 * - Particle-web layer on top of the gradient, below the content
 * - Centered logo placeholder (brand logo or default)
 * - Pop-out "Certificate Designer" title
 * - Lazy-hover CTA that fades out the splash in 800ms on click
 */
export default function SplashScreen({ onStart }) {
  const { logoSrc } = useBranding();
  const [leaving, setLeaving] = useState(false);

  const handleStart = () => {
    setLeaving(true);
    setTimeout(() => onStart && onStart(), 820);
  };

  return (
    <div className={`splash-root ${leaving ? 'leaving' : ''}`}>
      <div className="splash-overlay" />
      {/* Particle-web sits above gradient, below content */}
      <ParticleBackground />

      <div className="splash-content">
        {/* Logo placeholder pulling from branding */}
        <div className={`splash-logo-frame ${logoSrc ? 'has-logo' : ''}`}>
          {logoSrc ? (
            <img src={logoSrc} alt="Brand logo" />
          ) : (
            <Award size={48} color="#ffffff" strokeWidth={1.5} />
          )}
        </div>

        <div className="splash-kicker">· Elite Certify Studio ·</div>

        <h1 className="splash-title">
          Certificate <em>Designer</em>
        </h1>

        <p className="splash-sub">
          Craft formal certificates with guilloché detail, premium typography,
          and bulk-generation workflows — all in a single elegant suite.
        </p>

        <button className="splash-cta" onClick={handleStart}>
          <Sparkles size={16} strokeWidth={2.5} />
          Start Now
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      <div className="splash-footer">
        Made by: <strong>Ahmad Ismael</strong>
      </div>
    </div>
  );
}
