'use client';

import { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { FileText, ChevronRight, LayoutGrid, Monitor, Printer } from 'lucide-react';
import { useProject, DOC_PRESETS, DPI_FOR_TYPE } from '@/lib/projectContext';

/**
 * CreateNewTab.js
 *
 * Tab A: start a TRUE BLANK project.
 *  - Project name input
 *  - Document Type toggle: Web (72 DPI) vs Print (300 DPI)
 *  - Preset dropdown (presets shown depend on the type)
 *      Web   → Instagram Post, YouTube Thumbnail, Full HD, Custom
 *      Print → A4, A5, US Letter, Custom
 *  - Custom dimensions: when "Custom" is selected, width / height inputs
 *    appear with a unit selector (Px / In / Mm). The unit is for input
 *    convenience only — values are normalised to PIXELS at the active DPI
 *    before being committed to projectContext, so the canvas, fit-to-screen,
 *    and high-res export logic see consistent pixel dimensions regardless
 *    of which unit the user typed in.
 *  - Optional paper color
 *  - "Next" → /editor with mode='blank' + the chosen document type / DPI
 *
 * Implementation notes:
 *  - When the user toggles between Web and Print, we automatically reset
 *    the selected preset to the first one in the new group, so the dropdown
 *    can never end up displaying a value that isn't in its option list.
 *  - The `canvasSize` we ship to projectContext uses the preset's pixel
 *    dimensions directly (e.g. 2480×3508 for A4 print) so Studio creates
 *    the Fabric canvas at print-ready resolution from the start.
 *  - Once the user clicks Next, projectContext.mode becomes 'blank' for
 *    this session, which the landing page's <Tabs /> consumes to disable
 *    the Templates tab (you can't "start from scratch" and also pick a
 *    template — they're mutually exclusive intents).
 */

// Sentinel preset — appended to both Web and Print preset lists so the user
// can pick "Custom" from the same dropdown they'd use to pick A4 or IG Post.
const CUSTOM_PRESET = { id: 'custom', label: 'Custom Size', w: 0, h: 0, note: 'Specify width × height below' };

// Conversion to pixels at the document's DPI.
//   px → 1:1
//   in → in × dpi
//   mm → mm × dpi / 25.4   (1 inch = 25.4 mm)
function toPixels(value, unit, dpi) {
  const v = Number(value);
  if (!isFinite(v) || v <= 0) return 0;
  switch (unit) {
    case 'in': return Math.round(v * dpi);
    case 'mm': return Math.round((v * dpi) / 25.4);
    case 'px':
    default:   return Math.round(v);
  }
}

// Sensible default custom dimensions per document type. Matches what users
// most commonly want as a starting point: a square-ish canvas for web, an
// A4-portrait-ish canvas for print.
const DEFAULT_CUSTOM = {
  web:   { w: 1200, h: 1200, unit: 'px' },
  print: { w: 8.5,  h: 11,   unit: 'in' },
};

export default function CreateNewTab() {
  const router = useRouter();
  const { setProject } = useProject();

  const [name, setName] = useState('Untitled Certificate');
  const [docType, setDocType] = useState('print');         // 'web' | 'print'
  const [presetId, setPresetId] = useState(DOC_PRESETS.print[0].id);
  const [bg, setBg] = useState('#ffffff');

  // Custom-dimension state. Tracked separately from `presetId` so the user
  // doesn't lose their custom values when they tab away to a named preset
  // and come back.
  const [customW, setCustomW] = useState(DEFAULT_CUSTOM.print.w);
  const [customH, setCustomH] = useState(DEFAULT_CUSTOM.print.h);
  const [customUnit, setCustomUnit] = useState(DEFAULT_CUSTOM.print.unit);

  // The list of presets for the active document type, with "Custom" appended.
  const presets = useMemo(
    () => [...DOC_PRESETS[docType], CUSTOM_PRESET],
    [docType],
  );

  const isCustom = presetId === CUSTOM_PRESET.id;

  // The currently selected preset object, or the first one as a fallback.
  const selected = useMemo(
    () => presets.find((p) => p.id === presetId) || presets[0],
    [presets, presetId],
  );

  // When the user switches doc type, also reset their default custom
  // dimensions to something sensible for the new context (px for web,
  // inches for print) — UNLESS they've already typed values, in which
  // case we leave them alone. We detect that by comparing against the
  // previous defaults; if the current value matches some old default,
  // the user hasn't customised, so it's safe to swap.
  useEffect(() => {
    const def = DEFAULT_CUSTOM[docType];
    const allDefaultWs = Object.values(DEFAULT_CUSTOM).map((d) => d.w);
    const allDefaultHs = Object.values(DEFAULT_CUSTOM).map((d) => d.h);
    const allDefaultUnits = Object.values(DEFAULT_CUSTOM).map((d) => d.unit);

    setCustomW((prev) => allDefaultWs.includes(Number(prev)) ? def.w : prev);
    setCustomH((prev) => allDefaultHs.includes(Number(prev)) ? def.h : prev);
    setCustomUnit((prev) => allDefaultUnits.includes(prev) ? def.unit : prev);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docType]);

  const handleTypeChange = (newType) => {
    if (newType === docType) return;
    setDocType(newType);
    // If user wasn't on "Custom", switch to the new type's first preset.
    // If they WERE on "Custom", stay on "Custom" — their custom dims
    // probably still mean what they wanted, just at a new DPI.
    setPresetId((prev) =>
      prev === CUSTOM_PRESET.id ? CUSTOM_PRESET.id : DOC_PRESETS[newType][0].id,
    );
  };

  // Final pixel dimensions: either the named preset's pixels, or the
  // custom values converted to pixels at the active DPI.
  const dpi = DPI_FOR_TYPE[docType];
  const finalDims = useMemo(() => {
    if (!isCustom) return { w: selected.w, h: selected.h };
    return {
      w: toPixels(customW, customUnit, dpi),
      h: toPixels(customH, customUnit, dpi),
    };
  }, [isCustom, selected, customW, customH, customUnit, dpi]);

  // Validation: the Next button is disabled if the final dims aren't sane.
  // We require at least 1×1 pixel to avoid creating a degenerate canvas.
  // Generous upper bound (24000px ≈ 80in @ 300 DPI) prevents accidentally
  // creating a billion-pixel canvas that crashes the browser tab.
  const dimsValid = finalDims.w >= 1 && finalDims.h >= 1 &&
                    finalDims.w <= 24000 && finalDims.h <= 24000;

  const handleNext = () => {
    if (!dimsValid) return;
    const label  = isCustom
      ? `Custom · ${customW} × ${customH} ${customUnit}`
      : selected.label;
    const note   = isCustom
      ? `${finalDims.w} × ${finalDims.h} px @ ${dpi} DPI`
      : selected.note;

    const canvasSize = {
      // Mirror the legacy PAGE_SIZES shape so any existing consumers that
      // read .id / .label / .w / .h / .print continue to work unchanged.
      id: isCustom ? `custom-${docType}-${customW}x${customH}${customUnit}` : selected.id,
      label,
      w: finalDims.w,
      h: finalDims.h,
      print: note,
    };
    setProject({
      mode: 'blank',
      projectName: name.trim() || 'Untitled Certificate',
      canvasSize,
      canvasBg: bg,
      initialTemplate: null,
      importedBackground: null,
      documentType: docType,
      resolution: dpi,
    });
    router.push('/editor');
  };

  // Live preview sizing — fit the dims into a 140-px box, preserving ratio.
  const maxSide = 140;
  const previewW = finalDims.w || 1;
  const previewH = finalDims.h || 1;
  const ratio = previewW / previewH;
  const prevW = ratio >= 1 ? maxSide : maxSide * ratio;
  const prevH = ratio >= 1 ? maxSide / ratio : maxSide;

  return (
    <div className="grid md:grid-cols-2 gap-8 items-start">
      <div className="space-y-6">
        <div>
          <label className="block text-[10px] font-mono tracking-widest uppercase text-ember-50/60 mb-2">
            Project Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[#18120e] border border-ink-700 text-ember-50 font-display text-lg focus:outline-none focus:border-ember-500 transition-colors"
            placeholder="e.g. Graduation 2026"
            onKeyDown={(e) => { if (e.key === 'Enter' && dimsValid) handleNext(); }}
          />
        </div>

        {/* TYPE TOGGLE — Web vs Print. Two big tappable cards rather than a
            select, because this is the most consequential single choice on
            the landing page (decides DPI for the entire project). */}
        <div>
          <label className="block text-[10px] font-mono tracking-widest uppercase text-ember-50/60 mb-2">
            Document Type
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('web')}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left"
              style={{
                background: docType === 'web' ? 'rgba(249, 115, 22, 0.12)' : '#18120e',
                border: docType === 'web' ? '1px solid #f97316' : '1px solid #2a1f18',
                color: docType === 'web' ? '#fed7aa' : '#fef9f0',
              }}
            >
              <Monitor size={18} strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm">Web</div>
                <div className="font-mono text-[10px] tracking-widest uppercase opacity-60">
                  72 DPI · Screen
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={() => handleTypeChange('print')}
              className="flex items-center gap-3 px-4 py-3 rounded-lg transition-all text-left"
              style={{
                background: docType === 'print' ? 'rgba(249, 115, 22, 0.12)' : '#18120e',
                border: docType === 'print' ? '1px solid #f97316' : '1px solid #2a1f18',
                color: docType === 'print' ? '#fed7aa' : '#fef9f0',
              }}
            >
              <Printer size={18} strokeWidth={2} />
              <div className="flex-1 min-w-0">
                <div className="font-display text-sm">Print</div>
                <div className="font-mono text-[10px] tracking-widest uppercase opacity-60">
                  300 DPI · Print-ready
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* PRESET DROPDOWN — options swap based on the active type, plus a
            "Custom Size" sentinel that reveals the dimension inputs. */}
        <div>
          <label className="block text-[10px] font-mono tracking-widest uppercase text-ember-50/60 mb-2">
            {docType === 'web' ? 'Web Preset' : 'Print Preset'}
          </label>
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="w-full px-4 py-3 rounded-lg bg-[#18120e] border border-ink-700 text-ember-50 font-body text-sm focus:outline-none focus:border-ember-500 transition-colors"
          >
            {presets.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}{p.id === 'custom' ? '' : `  ·  ${p.note}`}
              </option>
            ))}
          </select>
          {!isCustom && (
            <p className="mt-2 text-[11px] text-ember-50/50 font-mono">
              {selected.w} × {selected.h} px @ {dpi} DPI
            </p>
          )}
        </div>

        {/* CUSTOM DIMENSIONS — only visible when "Custom Size" is selected.
            Width and Height are typed in the chosen unit (Px / In / Mm).
            We display the resolved pixel size below so the user can see
            what the unit conversion yields at the active DPI. */}
        {isCustom && (
          <div
            className="p-4 rounded-lg space-y-3"
            style={{ background: '#18120e', border: '1px solid #2a1f18' }}
          >
            <label className="block text-[10px] font-mono tracking-widest uppercase text-ember-50/60">
              Custom Dimensions
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-ember-50/40 mb-1">
                  Width
                </label>
                <input
                  type="number"
                  min="0"
                  step={customUnit === 'px' ? 1 : 0.1}
                  value={customW}
                  onChange={(e) => setCustomW(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#0f0c09] border border-ink-700 text-ember-50 text-sm font-mono focus:outline-none focus:border-ember-500"
                />
              </div>
              <div className="flex-1">
                <label className="block text-[10px] font-mono uppercase tracking-widest text-ember-50/40 mb-1">
                  Height
                </label>
                <input
                  type="number"
                  min="0"
                  step={customUnit === 'px' ? 1 : 0.1}
                  value={customH}
                  onChange={(e) => setCustomH(e.target.value)}
                  className="w-full px-3 py-2 rounded-md bg-[#0f0c09] border border-ink-700 text-ember-50 text-sm font-mono focus:outline-none focus:border-ember-500"
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono uppercase tracking-widest text-ember-50/40 mb-1">
                  Unit
                </label>
                <select
                  value={customUnit}
                  onChange={(e) => setCustomUnit(e.target.value)}
                  className="px-3 py-2 rounded-md bg-[#0f0c09] border border-ink-700 text-ember-50 text-sm font-mono focus:outline-none focus:border-ember-500"
                >
                  <option value="px">Px</option>
                  <option value="in">In</option>
                  <option value="mm">Mm</option>
                </select>
              </div>
            </div>
            <p className="text-[11px] text-ember-50/50 font-mono">
              {dimsValid
                ? <>= {finalDims.w} × {finalDims.h} px @ {dpi} DPI</>
                : <span className="text-crimson-400">Enter positive width and height (max 24,000 px on either side).</span>
              }
            </p>
          </div>
        )}

        <div>
          <label className="block text-[10px] font-mono tracking-widest uppercase text-ember-50/60 mb-2">
            Paper Color
          </label>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={bg}
              onChange={(e) => setBg(e.target.value)}
              className="w-12 h-12 rounded cursor-pointer border-0 bg-transparent"
            />
            <div className="flex gap-1.5">
              {['#ffffff', '#fdf8f0', '#fef9f0', '#fef2f2', '#18120e'].map((c) => (
                <button
                  key={c}
                  onClick={() => setBg(c)}
                  className="w-8 h-8 rounded transition-transform hover:scale-110"
                  style={{
                    background: c,
                    border: bg === c ? '2px solid #f97316' : '1px solid #2a1f18',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={!dimsValid}
          className="group flex items-center gap-3 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:scale-[1.02] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
          style={{
            background: 'linear-gradient(135deg, #dc2626, #f97316)',
            boxShadow: '0 10px 30px rgba(220, 38, 38, 0.35)',
          }}
        >
          <FileText size={16} strokeWidth={2.5} />
          Next — Open Blank Canvas
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
        </button>
      </div>

      <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-[#18120e] border border-ink-700">
        <div className="text-[10px] font-mono tracking-widest uppercase text-ember-50/40 mb-4 flex items-center gap-2">
          <LayoutGrid size={12} />
          Live Preview
        </div>
        <div
          className="shadow-2xl"
          style={{
            width: prevW,
            height: prevH,
            background: bg,
            border: '1px solid rgba(220, 38, 38, 0.35)',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
          }}
        />
        <div className="mt-4 text-center">
          <div className="font-display text-ember-50 text-sm">
            {isCustom ? `${customW} × ${customH} ${customUnit}` : selected.label}
          </div>
          <div className="font-mono text-[10px] tracking-widest uppercase text-ember-50/40 mt-1">
            {isCustom ? `${finalDims.w} × ${finalDims.h} px` : selected.note}
          </div>
          <div className="font-mono text-[10px] tracking-widest uppercase text-ember-400/60 mt-1">
            {docType === 'web' ? 'WEB · 72 DPI' : 'PRINT · 300 DPI'}
          </div>
        </div>
      </div>
    </div>
  );
}
