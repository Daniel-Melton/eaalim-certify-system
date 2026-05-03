'use client';

import { useState } from 'react';
import { FilePlus, LayoutGrid, Upload, Award, Sun, Moon } from 'lucide-react';
import Tabs from '@/components/landing/Tabs';
import CreateNewTab from '@/components/landing/CreateNewTab';
import TemplatesTab from '@/components/landing/TemplatesTab';
import ImportTab from '@/components/landing/ImportTab';
import ParticleBackground from '@/components/ParticleBackground';
import OpeningScreen from '@/components/OpeningScreen';
import { useBranding } from '@/lib/brandingContext';
import { useTheme } from '@/lib/themeContext';
import { useProject } from '@/lib/projectContext';

/**
 * Landing page (/).
 *
 * Flow:
 *   1. OpeningScreen — brand intro with logo, company name, app name,
 *      and an Ahmad-Ismael credit. User clicks the CTA to enter.
 *   2. Tabbed landing — pick what to do:
 *        Tab A — Create New:   project name + size picker + "Next" → /editor
 *        Tab B — Use a Template: grid of premade templates → /editor
 *        Tab C — Import:       JSON or image upload zone → /editor
 *
 * The gate is local state (`entered`) rather than routing because the
 * opening screen has no URL of its own — it's just a one-time intro for
 * this visit. On re-navigation back to `/` from /editor (via "Home"),
 * the opening screen shows again, which is the expected product behavior.
 */
export default function LandingPage() {
  const { appTitle, logoSrc } = useBranding();
  const { theme, toggleTheme } = useTheme();
  const { mode } = useProject();
  const [entered, setEntered] = useState(false);

  // If the user previously committed to a blank-canvas project this session
  // (mode === 'blank'), disable the Templates tab — "start from scratch"
  // and "use a template" are mutually exclusive intents. The user can
  // still pick another tab, but switching back into the editor with a
  // template would silently overwrite their blank-canvas project.
  // Disabling rather than hiding so the affordance remains discoverable.
  const templatesDisabled = mode === 'blank';

  const tabs = [
    { id: 'new',       label: 'Create New',        icon: FilePlus,   content: <CreateNewTab /> },
    {
      id: 'template',
      label: 'Use a Template',
      icon: LayoutGrid,
      content: <TemplatesTab />,
      disabled: templatesDisabled,
      disabledHint: 'Templates are unavailable while a blank-canvas project is in progress.',
    },
    { id: 'import',    label: 'Import a Template', icon: Upload,     content: <ImportTab /> },
  ];

  // Stage 1: opening screen
  if (!entered) {
    return <OpeningScreen onEnter={() => setEntered(true)} />;
  }

  // Stage 2: tabbed workspace picker
  return (
    <div className="relative w-screen h-screen overflow-auto flex flex-col items-center landing-root">
      {/* Ambient particle layer */}
      <div className="absolute inset-0 opacity-50 pointer-events-none">
        <ParticleBackground count={40} connectDistance={140} speed={1.2} />
      </div>

      {/* Header */}
      <header className="relative z-10 w-full max-w-5xl px-6 pt-10 pb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-11 h-11 rounded-xl overflow-hidden flex items-center justify-center"
            style={{
              background: logoSrc ? 'transparent' : 'linear-gradient(135deg, #dc2626, #f97316)',
              boxShadow: logoSrc ? 'none' : '0 0 24px rgba(249, 115, 22, 0.35)',
            }}
          >
            {logoSrc
              ? <img src={logoSrc} alt="Logo" className="w-full h-full" style={{ objectFit: 'contain' }} />
              : <Award size={22} color="#fff" strokeWidth={2} />}
          </div>
          <div>
            <div className="font-display font-semibold text-xl leading-none text-ember-50">
              {appTitle}
            </div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-ember-50/50 mt-1">
              Certificate Designer
            </div>
          </div>
        </div>

        <button
          onClick={toggleTheme}
          className="tool-btn"
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
          {theme === 'dark' ? 'Light' : 'Dark'}
        </button>
      </header>

      {/* Hero */}
      <section className="relative z-10 w-full max-w-5xl px-6 pb-8 text-center">
        <h1 className="font-display text-5xl md:text-6xl font-bold text-ember-50 leading-tight">
          Start a new <em className="not-italic" style={{
            background: 'linear-gradient(135deg, #dc2626, #f97316)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}>certificate</em>
        </h1>
        <p className="mt-4 font-display italic text-lg text-ember-50/70 max-w-xl mx-auto">
          Pick a starting point — a blank canvas, a premade template, or your own import.
        </p>
      </section>

      {/* Tabs card */}
      <section className="relative z-10 w-full max-w-5xl px-6 pb-16">
        <div
          className="rounded-2xl p-6 md:p-8"
          style={{
            background: 'rgba(20, 18, 16, 0.7)',
            border: '1px solid #2a1f18',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 40px 120px rgba(0, 0, 0, 0.5)',
          }}
        >
          <Tabs tabs={tabs} defaultTab="new" />
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 pb-6 text-center text-[11px] font-mono tracking-widest uppercase text-ember-50/40">
        Made by: <strong className="text-ember-50/80">Ahmad Ismael</strong>
      </footer>
    </div>
  );
}
