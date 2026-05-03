'use client';

/**
 * WorkspaceBackground.js
 *
 * Artistic backdrop for the canvas area: a grid of miniature "certificate"
 * tiles rendered in pure SVG/CSS, heavily blurred with low opacity. Sits
 * behind the canvas and behind the particle layer, producing a museum-wall
 * vibe. Every tile is a stylised approximation of one of our 7 premium
 * templates — borders, seals, signatures — so the aesthetic echoes the app's
 * own design system.
 *
 * Zero runtime cost: all SVG/CSS, no animation, no JS state.
 *
 * Also exports `getWorkspaceFitScale` — the math behind the editor's
 * "Fit to Screen" zoom. The workspace area (the scrollable container that
 * wraps the zoom transform) is the bounding context; fitting the canvas
 * into it keeps large formats like A4 (2480×3508 @ 300 DPI) visible
 * without horizontal scroll on common viewports.
 */

/**
 * Compute a fit-to-screen zoom factor.
 *
 *   containerRect : DOMRect (or any { width, height }) of the visible
 *                   workspace area, typically from getBoundingClientRect().
 *   canvasW, canvasH: the design-time pixel dimensions of the document
 *                     (e.g. 2480 × 3508 for A4 @ 300 DPI).
 *
 * Options:
 *   padding   : pixels of breathing room subtracted from EACH side of the
 *               container before fitting (default 40). Keeps a small margin
 *               around the canvas instead of edge-to-edge cramming.
 *   minScale  : floor for the result (default 0.05).
 *   maxScale  : ceiling for the result (default 1). Never zoom in past 100%
 *               on small documents — that produces a blurry upscale.
 *
 * Returns a number suitable for `transform: scale()`.
 */
export function getWorkspaceFitScale(containerRect, canvasW, canvasH, opts = {}) {
  const padding   = opts.padding   ?? 40;
  const minScale  = opts.minScale  ?? 0.05;
  const maxScale  = opts.maxScale  ?? 1;

  const cw = Math.max(1, (containerRect?.width  || 0) - padding * 2);
  const ch = Math.max(1, (containerRect?.height || 0) - padding * 2);

  if (!canvasW || !canvasH) return 1;

  const sx = cw / canvasW;
  const sy = ch / canvasH;
  const fit = Math.min(sx, sy);

  if (!isFinite(fit) || fit <= 0) return minScale;
  return Math.max(minScale, Math.min(maxScale, fit));
}

const TILES = [
  // variety of color + accent combinations echoing our premium templates
  { bg: '#fef9f0', accent: '#991b1b',   second: '#dc2626', rotate: -4, scale: 1.0 },
  { bg: '#fff7ed', accent: '#c2410c',   second: '#f97316', rotate: 3,  scale: 0.95 },
  { bg: '#fef2f2', accent: '#7f1d1d',   second: '#dc2626', rotate: -2, scale: 1.05 },
  { bg: '#fffbf5', accent: '#dc2626',   second: '#f97316', rotate: 5,  scale: 0.9 },
  { bg: '#fdf6e3', accent: '#7c2d12',   second: '#f97316', rotate: -6, scale: 1.02 },
  { bg: '#f97316', accent: '#fff7ed',   second: '#fed7aa', rotate: 2,  scale: 0.88 },
  { bg: '#fdf8f0', accent: '#7f1d1d',   second: '#f97316', rotate: -3, scale: 1.0 },
  { bg: '#dc2626', accent: '#fff7ed',   second: '#fed7aa', rotate: 4,  scale: 0.92 },
  { bg: '#fef9f0', accent: '#991b1b',   second: '#dc2626', rotate: -5, scale: 1.08 },
  { bg: '#fff7ed', accent: '#7c2d12',   second: '#f97316', rotate: 6,  scale: 0.95 },
  { bg: '#fef2f2', accent: '#7f1d1d',   second: '#dc2626', rotate: -1, scale: 1.0 },
  { bg: '#fffbf5', accent: '#c2410c',   second: '#f97316', rotate: 3,  scale: 0.97 },
];

function CertificateTile({ bg, accent, second, rotate, scale }) {
  return (
    <div
      style={{
        background: bg,
        transform: `rotate(${rotate}deg) scale(${scale})`,
        boxShadow: '0 24px 60px rgba(0,0,0,0.35), 0 4px 12px rgba(0,0,0,0.25)',
        borderRadius: 6,
        aspectRatio: '1.414 / 1',
        width: '100%',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* double border */}
      <div
        style={{
          position: 'absolute',
          inset: 6,
          border: `1.5px solid ${accent}`,
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 12,
          border: `0.5px solid ${second}`,
          borderRadius: 2,
        }}
      />
      {/* title block (centered horizontal bars approximating text) */}
      <div style={{ position: 'absolute', top: '18%', left: '18%', right: '18%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
        <div style={{ height: 3, width: '40%', background: accent, borderRadius: 1 }} />
        <div style={{ height: 8, width: '70%', background: accent, borderRadius: 1, marginTop: 4 }} />
        <div style={{ height: 3, width: '30%', background: second, borderRadius: 1, marginTop: 4 }} />
      </div>
      {/* name block */}
      <div
        style={{
          position: 'absolute',
          top: '46%',
          left: '12%',
          right: '12%',
          height: 14,
          background: accent,
          opacity: 0.85,
          borderRadius: 2,
        }}
      />
      {/* subtitle lines */}
      <div
        style={{
          position: 'absolute',
          top: '65%',
          left: '20%',
          right: '20%',
          height: 3,
          background: second,
          opacity: 0.6,
          borderRadius: 1,
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '71%',
          left: '30%',
          right: '30%',
          height: 3,
          background: second,
          opacity: 0.5,
          borderRadius: 1,
        }}
      />
      {/* seal circle */}
      <div
        style={{
          position: 'absolute',
          right: '10%',
          bottom: '12%',
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${second}, ${accent})`,
          border: `1px solid ${accent}`,
        }}
      />
      {/* signature line */}
      <div
        style={{
          position: 'absolute',
          left: '10%',
          bottom: '18%',
          width: '35%',
          height: 1,
          background: accent,
          opacity: 0.6,
        }}
      />
    </div>
  );
}

export default function WorkspaceBackground() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {/* Blurred certificates tile grid */}
      <div
        style={{
          position: 'absolute',
          inset: '-8%',
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: 48,
          padding: 36,
          filter: 'blur(26px) saturate(1.15)',
          opacity: 0.28,
        }}
      >
        {TILES.map((t, i) => (
          <CertificateTile key={i} {...t} />
        ))}
      </div>

      {/* Warm vignette so tiles fade into the dark workspace color */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse at center, rgba(15,13,11,0.35) 0%, rgba(15,13,11,0.85) 60%, rgba(15,13,11,0.98) 100%)',
        }}
      />
    </div>
  );
}
