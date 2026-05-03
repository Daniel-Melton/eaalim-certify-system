'use client';

import { useState } from 'react';
import { Award, ChevronRight, Sparkles } from 'lucide-react';
import { useBranding } from '@/lib/brandingContext';
import ParticleBackground from './ParticleBackground';

/**
 * OpeningScreen.js
 *
 * The very first screen the user sees on arrival. This sits in front of
 * the tabbed landing workspace (`/`) and transitions out when the user
 * clicks the CTA.
 *
 * Layout (as specified):
 *   ┌──────────────────────────────────────────┐
 *   │                                          │
 *   │              [ LOGO  ]                   │  ← top-middle
 *   │                                          │
 *   │            COMPANY NAME                  │  ← bold
 *   │           Certificate Designer           │  ← app name
 *   │                                          │
 *   │                                          │
 *   │             [ Get Started ]              │
 *   │                                          │
 *   │       Made with 💗 : Ahmad Ismael        │  ← bottom-middle, bouncing heart
 *   └──────────────────────────────────────────┘
 *
 * The company name comes from the branding context (`appTitle`, default
 * "Elite Certify"). The app name is "Certificate Designer" — the product
 * tagline used throughout the rest of the UI.
 *
 * The heart emoji next to Ahmad's name has a subtle bounce animation
 * defined in globals.css (.heart-bounce).
 */
export default function OpeningScreen({ onEnter }) {
  const { appTitle, logoSrc } = useBranding();
  const [leaving, setLeaving] = useState(false);

  const handleEnter = () => {
    // Fade-out transition before swapping to the tabbed landing. The
    // timeout matches the `.opening-root.leaving` CSS transition duration.
    setLeaving(true);
    setTimeout(() => onEnter && onEnter(), 650);
  };

  return (
    <div className={`opening-root ${leaving ? 'leaving' : ''}`}>
      {/* Ambient particle layer — same subtle background used on splash
          and landing, so the transition into the tabs feels continuous. */}
      <div className="opening-particles">
        <ParticleBackground count={55} connectDistance={150} speed={1.4} />
      </div>

      {/* Radial vignette so the center content reads cleanly against the
          particle field without being washed out. */}
      <div className="opening-vignette" />

      {/* ============ TOP-MIDDLE: logo + company + app name ============ */}
      <div className="opening-header">
        <div className={`opening-logo-frame ${logoSrc ? 'has-logo' : ''}`}>
          {logoSrc ? (
            <img src={logoSrc} alt="Brand logo" />
          ) : (
            <Award size={54} color="#ffffff" strokeWidth={1.5} />
          )}
        </div>

        {/* Company name — bold, primary visual weight */}
        <h1 className="opening-company">{appTitle}</h1>

        {/* App name — smaller, italic serif subheading */}
        <p className="opening-appname">Certificate Designer</p>
      </div>

      {/* ============ CENTER: call-to-action ============ */}
      <div className="opening-cta-wrap">
        <button className="opening-cta" onClick={handleEnter}>
          <Sparkles size={16} strokeWidth={2.5} />
          Get Started
          <ChevronRight size={16} strokeWidth={2.5} />
        </button>
      </div>

      {/* ============ BOTTOM-MIDDLE: programmer credit ============ */}
      <div className="opening-credit">
        <span>Made with </span>
        <span className="heart-bounce" aria-label="love">💗</span>
        <span> : </span>
        <strong>Ahmad Ismael</strong>
      </div>
    </div>
  );
}
