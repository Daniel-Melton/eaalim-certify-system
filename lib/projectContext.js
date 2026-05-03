'use client';

import { createContext, useContext, useState, useCallback } from 'react';

/**
 * projectContext.js
 *
 * Bridges the tabbed landing page (/) with the editor (/editor).
 *
 * The `mode` field is load-bearing — it's how Studio knows what the landing
 * page's *intent* was, as opposed to inferring from which fields are null.
 *
 *   mode: 'blank'    → true empty canvas. No template, no background, no
 *                      seed text. The canvas renders only the user-chosen
 *                      background color at the user-chosen dimensions.
 *   mode: 'template' → load `initialTemplate`
 *   mode: 'import'   → load `importedBackground` as a bg image on a blank canvas
 *   mode: 'default'  → user landed at /editor directly (no tab choice made);
 *                      Studio falls back to loading TEMPLATES[0] as before
 *
 * Previously, `mode` was inferred from whether initialTemplate/import were
 * null. That made "user wants blank" indistinguishable from "user refreshed
 * /editor with no state," so the blank branch accidentally seeded a default
 * template. Fixed by making intent explicit.
 *
 * --- Document Type / Resolution ---
 *
 * `documentType` selects between 'web' (72 DPI screen) and 'print' (300 DPI
 * print-ready). `resolution` is the DPI value. The Export modal reads these
 * to decide the default upscale factor and to surface the right "@ 300 DPI"
 * label everywhere consistent with what the user picked on the landing page.
 *
 * Each preset in DOC_PRESETS encodes its CANVAS PIXEL dimensions — i.e. the
 * dimensions the Fabric canvas is created at. For Web presets these are the
 * familiar 1080×1080, 1280×720, etc. For Print presets they're the 300dpi
 * pixel sizes (A4 = 2480×3508, A5 = 1748×2480, US Letter = 2550×3300).
 */

// Standard print sizes (kept for legacy consumers — Studio still references
// these, and any code path that doesn't go through the Web/Print presets
// falls back to one of these).
export const PAGE_SIZES = [
  { id: 'a4-landscape',    label: 'A4 Landscape',        w: 1123, h: 794,  print: 'A4 · 297 × 210 mm' },
  { id: 'a4-portrait',     label: 'A4 Portrait',         w: 794,  h: 1123, print: 'A4 · 210 × 297 mm' },
  { id: 'letter-landscape',label: 'US Letter Landscape', w: 1056, h: 816,  print: 'Letter · 11 × 8.5 in' },
  { id: 'letter-portrait', label: 'US Letter Portrait',  w: 816,  h: 1056, print: 'Letter · 8.5 × 11 in' },
  { id: 'custom-landscape',label: 'Wide Landscape',      w: 1200, h: 600,  print: 'Classic 2:1' },
  { id: 'custom-portrait', label: 'Tall Portrait',       w: 600,  h: 900,  print: 'Classic 2:3' },
];

/**
 * Document presets grouped by documentType.
 *
 * Each preset is `{ id, label, w, h, note }` where w/h are pixel dimensions
 * the Fabric canvas should be created at.
 *
 *   Web (72 DPI): pixel dims = the design's screen target.
 *   Print (300 DPI): pixel dims = inches × 300 (or mm × 300 / 25.4).
 *     A4         = 8.27 × 11.69 in → 2480 × 3508 px
 *     A5         = 5.83 × 8.27 in  → 1748 × 2480 px
 *     US Letter  = 8.5  × 11    in → 2550 × 3300 px
 */
export const DOC_PRESETS = {
  web: [
    { id: 'ig-post',  label: 'Instagram Post',    w: 1080, h: 1080, note: '1080 × 1080 · 1:1' },
    { id: 'yt-thumb', label: 'YouTube Thumbnail', w: 1280, h: 720,  note: '1280 × 720 · 16:9' },
    { id: 'full-hd',  label: 'Full HD',           w: 1920, h: 1080, note: '1920 × 1080 · 16:9' },
  ],
  print: [
    { id: 'a4-print',     label: 'A4',        w: 2480, h: 3508, note: 'A4 · 210 × 297 mm @ 300 DPI' },
    { id: 'a5-print',     label: 'A5',        w: 1748, h: 2480, note: 'A5 · 148 × 210 mm @ 300 DPI' },
    { id: 'letter-print', label: 'US Letter', w: 2550, h: 3300, note: 'Letter · 8.5 × 11 in @ 300 DPI' },
  ],
};

export const DPI_FOR_TYPE = { web: 72, print: 300 };

const defaultState = {
  mode: 'default',                 // 'blank' | 'template' | 'import' | 'default'
  projectName: 'Untitled Certificate',
  canvasSize: PAGE_SIZES[0],
  canvasBg: '#ffffff',             // background color for blank canvases
  initialTemplate: null,
  importedBackground: null,

  // NEW: document type / resolution metadata. Travel with the project so the
  // Export modal and metadata strips ("A4 · 300 DPI") stay consistent with
  // the choice the user made on the landing page.
  documentType: 'print',           // 'web' | 'print'
  resolution: 300,                 // DPI — 72 for web, 300 for print
};

const ProjectContext = createContext({
  ...defaultState,
  setProject: () => {},
  resetProject: () => {},
});

export function ProjectProvider({ children }) {
  const [state, setState] = useState(defaultState);

  const setProject = useCallback((patch) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const resetProject = useCallback(() => {
    setState(defaultState);
  }, []);

  return (
    <ProjectContext.Provider value={{ ...state, setProject, resetProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  return useContext(ProjectContext);
}
