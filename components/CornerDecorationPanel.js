'use client';

import { useRef, useState } from 'react';
import { CORNER_DECORATIONS } from '@/lib/shapes';
import { Upload, Palette } from 'lucide-react';

/**
 * CornerDecorationPanel.js
 * UI for applying SVG decorations to one or all canvas corners.
 *
 * Corner layout:
 *   TL ─────────────── TR
 *   │                  │
 *   │    rectangle     │
 *   │                  │
 *   BL ─────────────── BR
 *
 * The base decoration SVG is designed in "top-left" orientation.
 * For other corners we rotate: TR = 90°, BR = 180°, BL = 270°.
 *
 * Props:
 *  - canvasRef: ref with addSvg(svg, {...})
 *  - canvasSize: { w, h } from Studio — used to position decorations at actual corners
 */

const PRESET_COLORS = [
  '#dc2626', '#f97316', '#7f1d1d', '#18120e', '#fff7ed', '#fed7aa',
];

const CORNER_SIZE = 120;   // visible size on canvas
const CORNER_INSET = 20;   // margin from canvas edge

export default function CornerDecorationPanel({ canvasRef, canvasSize }) {
  // Which corners are selected. { tl, tr, bl, br }
  const [corners, setCorners] = useState({ tl: true, tr: false, bl: false, br: false });
  const [allCorners, setAllCorners] = useState(false);
  const [color, setColor] = useState('#dc2626');
  const [customDecorations, setCustomDecorations] = useState([]);
  const fileRef = useRef(null);

  const toggleCorner = (key) => {
    if (allCorners) return;
    setCorners((c) => ({ ...c, [key]: !c[key] }));
  };

  const toggleAll = () => {
    const next = !allCorners;
    setAllCorners(next);
    if (next) setCorners({ tl: true, tr: true, bl: true, br: true });
  };

  const activeCorners = () => {
    if (allCorners) return ['tl', 'tr', 'bl', 'br'];
    return Object.keys(corners).filter((k) => corners[k]);
  };

  const handleImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      // Strip any inline scripts for safety
      const cleaned = text.replace(/<script[\s\S]*?<\/script>/gi, '');
      const id = `custom_${Date.now()}`;
      setCustomDecorations((prev) => [
        ...prev,
        { id, name: file.name.replace(/\.svg$/i, ''), svg: cleaned },
      ]);
    };
    reader.readAsText(file);
  };

  // Wrap a decoration SVG in a group that applies the brand color via currentColor
  // then compute position + rotation per corner.
  //
  // The base SVG is designed facing "top-left" (opening points into the canvas
  // from the TL corner). For each other corner we rotate so the decoration's
  // opening continues to face inward:
  //   TL:   0°   (opens toward bottom-right)
  //   TR:  90°   (opens toward bottom-left)
  //   BR: 180°   (opens toward top-left)
  //   BL: 270°   (opens toward top-right)
  //
  // We place each decoration with origin 'center' so rotation happens in-place
  // and the shape sits flush against its corner regardless of angle.
  const applyDecoration = async (deco) => {
    const picked = activeCorners();
    if (picked.length === 0) return;

    const { w: cw, h: ch } = canvasSize || { w: 1200, h: 600 };
    const half = CORNER_SIZE / 2;
    const margin = CORNER_INSET + half; // distance from canvas edge to decoration center

    // Center-point of each corner where the decoration will be placed.
    const placements = {
      tl: { left: margin,        top: margin,        angle: 0   },
      tr: { left: cw - margin,   top: margin,        angle: 90  },
      br: { left: cw - margin,   top: ch - margin,   angle: 180 },
      bl: { left: margin,        top: ch - margin,   angle: 270 },
    };

    for (const corner of picked) {
      const p = placements[corner];
      await canvasRef.current?.addSvg(deco.svg, {
        left: p.left,
        top: p.top,
        width: CORNER_SIZE,
        height: CORNER_SIZE,
        angle: p.angle,
        originX: 'center',
        originY: 'center',
        fill: color,
      });
    }
  };

  const renderPreview = (svg) => (
    <div
      className="w-full h-full flex items-center justify-center"
      style={{ color }}
      dangerouslySetInnerHTML={{
        __html: svg.replace('<svg ', '<svg style="width:100%;height:100%;" '),
      }}
    />
  );

  return (
    <div className="p-4 fade-in-panel">
      {/* ===== 4-corner frame picker ===== */}
      <div className="section-label mb-2">Select Corners</div>
      <p className="text-[11px] text-ember-50/50 mb-4 leading-relaxed">
        Tap one or more corner dots, or enable "All Corners" to apply a decoration
        to every corner at once.
      </p>

      <div className="corner-picker-frame" style={{ width: 180 }}>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-[10px] font-mono tracking-widest uppercase text-ember-50/30">
            Canvas
          </span>
        </div>
        {/* Dots */}
        <div
          className={`corner-dot tl ${corners.tl ? 'selected' : ''}`}
          onClick={() => toggleCorner('tl')}
          title="Top-left"
        >
          <CornerIcon which="tl" />
        </div>
        <div
          className={`corner-dot tr ${corners.tr ? 'selected' : ''}`}
          onClick={() => toggleCorner('tr')}
          title="Top-right"
        >
          <CornerIcon which="tr" />
        </div>
        <div
          className={`corner-dot bl ${corners.bl ? 'selected' : ''}`}
          onClick={() => toggleCorner('bl')}
          title="Bottom-left"
        >
          <CornerIcon which="bl" />
        </div>
        <div
          className={`corner-dot br ${corners.br ? 'selected' : ''}`}
          onClick={() => toggleCorner('br')}
          title="Bottom-right"
        >
          <CornerIcon which="br" />
        </div>
      </div>

      <button
        onClick={toggleAll}
        className={`all-corners-btn mt-2 ${allCorners ? 'active' : ''}`}
      >
        {allCorners ? '✓ All Corners Selected' : 'Apply to All 4 Corners'}
      </button>

      {/* ===== Color ===== */}
      <div className="section-label mt-6 mb-2 flex items-center gap-2">
        <Palette size={11} /> Decoration Color
      </div>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="color"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="w-9 h-9 rounded cursor-pointer border-0 bg-transparent"
        />
        <input
          type="text"
          value={color}
          onChange={(e) => setColor(e.target.value)}
          className="input-field flex-1 font-mono"
        />
      </div>
      <div className="flex gap-1.5">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setColor(c)}
            className="w-6 h-6 rounded cursor-pointer transition-transform hover:scale-110"
            style={{
              background: c,
              border: color === c ? '2px solid #f97316' : '1px solid #3a2a20',
            }}
            title={c}
          />
        ))}
      </div>

      {/* ===== Decoration grid ===== */}
      <div className="section-label mt-6 mb-3">Built-in Decorations</div>
      <div className="grid grid-cols-3 gap-2">
        {CORNER_DECORATIONS.map((d) => (
          <button
            key={d.id}
            onClick={() => applyDecoration(d)}
            title={d.name}
            className="aspect-square rounded-lg transition-all hover:scale-105"
            style={{
              background: '#18120e',
              border: '1px solid #2a1f18',
              padding: 8,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f97316')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#2a1f18')}
          >
            {renderPreview(d.svg)}
          </button>
        ))}
      </div>

      {/* ===== Import SVG ===== */}
      <div className="section-label mt-6 mb-3">Import External SVG</div>
      <button
        onClick={() => fileRef.current?.click()}
        className="w-full py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
        style={{
          background: 'transparent',
          border: '1px dashed #3a2a20',
          color: '#fed7aa',
        }}
      >
        <Upload size={14} />
        Upload SVG Decoration
      </button>
      <input
        ref={fileRef}
        type="file"
        accept=".svg,image/svg+xml"
        onChange={handleImport}
        className="hidden"
      />

      {customDecorations.length > 0 && (
        <>
          <div className="section-label mt-5 mb-3">Your Imports</div>
          <div className="grid grid-cols-3 gap-2">
            {customDecorations.map((d) => (
              <button
                key={d.id}
                onClick={() => applyDecoration(d)}
                title={d.name}
                className="aspect-square rounded-lg relative"
                style={{
                  background: '#18120e',
                  border: '1px solid #2a1f18',
                  padding: 8,
                }}
              >
                {renderPreview(d.svg)}
                <span
                  className="absolute top-1 right-1 text-[8px] font-mono px-1 rounded"
                  style={{ background: '#f97316', color: '#18120e' }}
                >
                  NEW
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-[10px] font-mono tracking-widest uppercase text-ember-50/30">
        Active: {activeCorners().length === 0 ? 'None' : activeCorners().join(' · ').toUpperCase()}
      </p>
    </div>
  );
}

// Tiny visual indicator inside each corner dot showing its position
function CornerIcon({ which }) {
  const rotate = {
    tl: 0, tr: 90, br: 180, bl: 270,
  }[which];
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" style={{ transform: `rotate(${rotate}deg)` }}>
      <path d="M2 12 L2 4 Q2 2 4 2 L12 2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
    </svg>
  );
}
