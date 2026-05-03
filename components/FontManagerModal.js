'use client';

import { useRef, useState } from 'react';
import { useCustomFonts } from '@/lib/customFontsContext';
import { X, Upload, Trash2, Check, Type } from 'lucide-react';

/**
 * FontManagerModal.js
 * UI for importing, previewing, and removing custom fonts.
 *
 * Accepts .ttf / .otf / .woff / .woff2 files. Multiple files can be dropped
 * at once. Each font is registered with the browser's FontFace API immediately
 * so previews render right away, and persisted to localStorage so they
 * survive page reloads.
 */
export default function FontManagerModal({ onClose }) {
  const { fonts, addFont, removeFont } = useCustomFonts();
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (files.length === 0) return;
    setBusy(true);
    try {
      for (const file of files) {
        const family = await addFont(file);
        if (family) setLastAdded(family);
      }
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
      setTimeout(() => setLastAdded(null), 2500);
    }
  };

  const onPick = (e) => handleFiles(e.target.files);

  const onDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        style={{ width: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-700">
          <div>
            <div className="section-label mb-1">TYPOGRAPHY</div>
            <h2 className="panel-heading">Font Manager</h2>
          </div>
          <button
            onClick={onClose}
            className="text-ember-200/40 hover:text-ember-400 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {/* Drop zone */}
          <div
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className="rounded-xl p-8 text-center cursor-pointer transition-all"
            style={{
              background: dragOver ? 'rgba(249, 115, 22, 0.1)' : '#18120e',
              border: dragOver ? '2px dashed #f97316' : '2px dashed #3a2a20',
            }}
          >
            <div className="flex items-center justify-center mb-3">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{
                  background: 'linear-gradient(135deg, #dc2626, #f97316)',
                  boxShadow: '0 8px 24px rgba(220, 38, 38, 0.3)',
                }}
              >
                <Upload size={24} color="#fff" strokeWidth={2} />
              </div>
            </div>
            <div className="font-display text-lg text-ember-50 mb-1">
              {busy ? 'Installing fonts…' : 'Drop font files here'}
            </div>
            <div className="font-mono text-[10px] tracking-widest uppercase text-ember-50/40">
              .TTF · .OTF · .WOFF · .WOFF2 · Multiple files OK
            </div>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/*"
            multiple
            onChange={onPick}
            className="hidden"
          />

          {lastAdded && (
            <div
              className="mt-4 p-3 rounded-lg flex items-center gap-2 text-sm"
              style={{
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                color: '#86efac',
              }}
            >
              <Check size={14} />
              <span>
                <strong className="font-semibold">{lastAdded}</strong> installed and ready to use
              </span>
            </div>
          )}

          {/* Font list */}
          <div className="mt-6">
            <div className="section-label mb-3 flex items-center justify-between">
              <span>Installed Fonts ({fonts.length})</span>
              {fonts.length > 0 && (
                <span className="text-ember-50/40 normal-case tracking-normal">
                  Available in the font dropdown
                </span>
              )}
            </div>

            {fonts.length === 0 ? (
              <div
                className="rounded-lg p-6 text-center text-sm text-ember-50/50"
                style={{ background: '#18120e', border: '1px solid #2a1f18' }}
              >
                <Type size={18} className="mx-auto mb-2 opacity-40" />
                No custom fonts yet. Drop some above to get started.
              </div>
            ) : (
              <div className="space-y-2">
                {fonts.map((f) => (
                  <div
                    key={f.family}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: '#18120e', border: '1px solid #2a1f18' }}
                  >
                    <div
                      className="flex-1 min-w-0"
                      style={{ fontFamily: `"${f.family}", serif` }}
                    >
                      <div
                        className="text-xl text-ember-50 truncate"
                        style={{ fontFamily: `"${f.family}", serif` }}
                      >
                        The quick brown fox
                      </div>
                      <div className="text-[10px] font-mono tracking-widest uppercase text-ember-50/40 mt-1 truncate">
                        {f.family} {f.filename ? `· ${f.filename}` : ''}
                      </div>
                    </div>
                    <button
                      onClick={() => removeFont(f.family)}
                      title={`Remove ${f.family}`}
                      className="p-2 rounded-lg text-ember-50/40 hover:text-crimson-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between px-6 py-4 border-t border-ink-700">
          <span className="text-[10px] font-mono tracking-widest text-ember-50/40 uppercase">
            Fonts persist across sessions · Saved locally
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg text-sm font-semibold text-white"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #f97316)',
              boxShadow: '0 4px 16px rgba(220, 38, 38, 0.35)',
            }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
