'use client';

import { useState, useEffect } from 'react';

/**
 * Tabs.js
 *
 * Minimal, accessible tab group. No extra deps — uses button + ARIA.
 *
 * Props:
 *   tabs: [{ id, label, icon: Component, content: ReactNode, disabled?: boolean, disabledHint?: string }]
 *   defaultTab?: id
 *
 * Disabled tabs:
 *   - Render in a dimmed style with `cursor-not-allowed` and aria-disabled.
 *   - Cannot be activated by clicking.
 *   - If the currently-active tab transitions to disabled (e.g. the user
 *     committed to a blank-canvas project, which retroactively disables the
 *     "Use a Template" tab for this session), automatically jump to the
 *     first non-disabled tab — otherwise the panel area would render the
 *     disabled tab's content with no way to switch away.
 *   - If `disabledHint` is provided, it surfaces as the button's title /
 *     tooltip so the reason for the disable is discoverable.
 */
export default function Tabs({ tabs, defaultTab }) {
  // Resolve a sensible initial tab: prefer defaultTab if it exists AND isn't
  // disabled; otherwise fall back to the first non-disabled tab; if every
  // tab is disabled (shouldn't happen in practice), use the first one.
  const firstEnabled = tabs.find((t) => !t.disabled);
  const initialId =
    (defaultTab && tabs.find((t) => t.id === defaultTab && !t.disabled)?.id) ||
    firstEnabled?.id ||
    tabs[0]?.id;

  const [active, setActive] = useState(initialId);

  // Watch for the active tab becoming disabled and jump away if so.
  useEffect(() => {
    const current = tabs.find((t) => t.id === active);
    if (current?.disabled) {
      const fallback = tabs.find((t) => !t.disabled);
      if (fallback && fallback.id !== active) setActive(fallback.id);
    }
  }, [tabs, active]);

  const activeTab = tabs.find((t) => t.id === active) || tabs[0];

  return (
    <div>
      <div
        role="tablist"
        className="flex items-center gap-1 p-1 rounded-xl mb-6"
        style={{ background: '#18120e', border: '1px solid #2a1f18' }}
      >
        {tabs.map((t) => {
          const isActive   = t.id === active;
          const isDisabled = !!t.disabled;
          const Icon = t.icon;

          // Disabled style: dimmed, struck-through-ish via reduced opacity,
          // not-allowed cursor. We deliberately do NOT use the gradient
          // active style for a disabled tab even if it happens to be the
          // resolved active id (it can't be — the effect above forces a
          // jump — but defensive styling prevents flicker on the same
          // render that the effect runs).
          const baseClasses =
            'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all';

          let stateClasses = '';
          let inlineStyle  = {};
          if (isDisabled) {
            stateClasses = 'text-ember-50/30 cursor-not-allowed';
          } else if (isActive) {
            stateClasses = 'text-white shadow-lg';
            inlineStyle = {
              background: 'linear-gradient(135deg, #dc2626, #f97316)',
              boxShadow: '0 6px 20px rgba(220, 38, 38, 0.35)',
            };
          } else {
            stateClasses = 'text-ember-50/60 hover:text-ember-50 hover:bg-ink-700/50';
          }

          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive && !isDisabled}
              aria-disabled={isDisabled}
              aria-controls={`panel-${t.id}`}
              disabled={isDisabled}
              title={isDisabled ? (t.disabledHint || 'Unavailable for this project') : t.label}
              onClick={() => { if (!isDisabled) setActive(t.id); }}
              className={`${baseClasses} ${stateClasses}`}
              style={inlineStyle}
            >
              {Icon && <Icon size={14} strokeWidth={isActive && !isDisabled ? 2.5 : 2} />}
              {t.label}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${activeTab.id}`}
        className="animate-[lazyFadeIn_400ms_cubic-bezier(0.22,1,0.36,1)_forwards]"
      >
        {activeTab.content}
      </div>
    </div>
  );
}
