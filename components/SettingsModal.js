'use client';

import { useRef, useState } from 'react';
import { useBranding } from '@/lib/brandingContext';
import { X, Upload, RotateCcw, Check } from 'lucide-react';

/**
 * SettingsModal.js
 * Global branding panel. Lets the user change:
 *  - App Title (persisted via BrandingContext -> localStorage)
 *  - Brand Logo (persisted as data URL)
 */
export default function SettingsModal({ onClose }) {
  const { appTitle, logoSrc, updateTitle, updateLogo } = useBranding();
  const [titleDraft, setTitleDraft] = useState(appTitle);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef(null);

  const handleLogoPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => updateLogo(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (titleDraft.trim()) updateTitle(titleDraft.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  const resetLogo = () => updateLogo(null);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ width: 520 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-700">
          <div>
            <div className="section-label mb-1">GLOBAL</div>
            <h2 className="panel-heading">Branding Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-ember-200/40 hover:text-ember-400 transition-colors"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
          {/* App title */}
          <div>
            <label className="section-label block mb-2">App Title</label>
            <p className="text-xs text-ember-50/60 mb-3 leading-relaxed">
              Change the name shown across the studio header and splash screen.
            </p>
            <input
              type="text"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              className="input-field w-full"
              placeholder="Elite Certify"
              maxLength={40}
            />
          </div>

          {/* Logo */}
          <div>
            <label className="section-label block mb-2">Brand Logo</label>
            <p className="text-xs text-ember-50/60 mb-3 leading-relaxed">
              Upload a square logo. Shows on the splash screen and in the header.
            </p>

            <div className="flex items-center gap-4">
              <div
                className="w-20 h-20 rounded-xl overflow-hidden flex items-center justify-center flex-shrink-0"
                style={{
                  background: logoSrc
                    ? 'transparent'
                    : 'linear-gradient(135deg, #dc2626, #f97316)',
                  boxShadow: logoSrc ? 'none' : '0 8px 24px rgba(220, 38, 38, 0.25)',
                  border: logoSrc ? '1px solid #3a2a20' : 'none',
                }}
              >
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt="Brand logo"
                    className="w-full h-full"
                    style={{ objectFit: 'contain' }}
                  />
                ) : (
                  <span className="text-white font-display text-2xl font-bold italic">E</span>
                )}
              </div>

              <div className="flex-1 flex flex-col gap-2">
                <button
                  onClick={() => fileRef.current?.click()}
                  className="tool-btn justify-center"
                  style={{ background: '#2a1f18', borderColor: '#3a2a20' }}
                >
                  <Upload size={13} />
                  {logoSrc ? 'Replace Logo' : 'Upload Logo'}
                </button>
                {logoSrc && (
                  <button
                    onClick={resetLogo}
                    className="tool-btn justify-center text-crimson-400 hover:text-crimson-300"
                    style={{ background: 'transparent', borderColor: '#3a2a20' }}
                  >
                    <RotateCcw size={13} />
                    Reset to Default
                  </button>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoPick}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* Info */}
          <div
            className="p-3 rounded-lg text-xs text-ember-50/60 leading-relaxed"
            style={{ background: '#18120e', border: '1px solid #2a1f18' }}
          >
            Settings are stored locally on this device. They persist across sessions
            but don't sync to other browsers.
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-ink-700">
          <span className="text-[10px] font-mono tracking-widest text-ember-50/40 uppercase">
            Autosaves · Logo applies instantly
          </span>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white flex items-center gap-2 transition-all"
            style={{
              background: saved
                ? 'linear-gradient(135deg, #16a34a, #15803d)'
                : 'linear-gradient(135deg, #dc2626, #f97316)',
              boxShadow: '0 4px 16px rgba(220, 38, 38, 0.35)',
            }}
          >
            {saved ? <Check size={14} /> : null}
            {saved ? 'Saved' : 'Save Title'}
          </button>
        </div>
      </div>
    </div>
  );
}
