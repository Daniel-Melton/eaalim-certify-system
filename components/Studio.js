'use client';

import { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Layout as LayoutIcon, Type, Square, Image as ImageIcon, Hash,
  Layers as LayersIcon, Frame as FrameIcon, Undo2, Redo2,
  ZoomIn, ZoomOut, Maximize2, Download, Save, Settings, Upload,
  Plus, Circle as CircleIcon, Award, FileText, Sparkles, Home,
  Sun, Moon,
} from 'lucide-react';

import Canvas from './Canvas';
import ContextualToolbar from './ContextualToolbar';
import LayerPanel from './LayerPanel';
import CornerDecorationPanel from './CornerDecorationPanel';
import SettingsModal from './SettingsModal';
import ExportModal from './ExportModal';
import FontManagerModal from './FontManagerModal';
import RichTextOverlay from './RichTextOverlay';
import ParticleBackground from './ParticleBackground';
import WorkspaceBackground from './WorkspaceBackground';
import CanvasContextMenu from './CanvasContextMenu';
import { TEMPLATES } from '@/lib/templates';
import { SHAPES } from '@/lib/shapes';
import { useBranding } from '@/lib/brandingContext';
import { useProject } from '@/lib/projectContext';
import { useTheme } from '@/lib/themeContext';

/**
 * Studio.js — v1.2
 *
 * Key changes:
 *  - Respects ProjectContext.mode:
 *      'blank'    → clearCanvas() — truly empty, no seed text or template
 *      'template' → loadTemplate / loadFromTemplate
 *      'import'   → blank + addBackgroundImage
 *      'default'  → load TEMPLATES[0] (only if user arrived without a tab choice)
 *
 *  - Mounts <RichTextOverlay> INSIDE the zoom transform wrapper, so overlay
 *    coordinates match canvas coordinates 1:1. When overlay is active on a
 *    textbox, the Fabric object is rendered at low opacity so only the DOM
 *    overlay is visually crisp.
 *
 *  - richEditTargetId tracks which object the overlay is editing. A top-
 *    ribbon "Edit Text" button (or the contextual toolbar's Rich Text
 *    button) sets it. The overlay writes back via applyRichText().
 */
export default function Studio() {
  const router = useRouter();
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const bgInputRef = useRef(null);
  const templateInputRef = useRef(null);
  const svgInputRef = useRef(null);
  // Ref to the scrollable workspace area that wraps the zoom transform.
  // The fit-to-screen math measures this element's bounding rect to decide
  // how much to scale the canvas down so the entire design fits without
  // horizontal/vertical scroll.
  const workspaceRef = useRef(null);

  const { appTitle, logoSrc } = useBranding();
  const { theme, toggleTheme } = useTheme();
  const {
    mode,
    projectName,
    canvasSize,
    canvasBg,
    initialTemplate,
    importedBackground,
  } = useProject();

  // Default to the Templates panel for normal projects, but for blank
  // ("Start from Scratch") projects the Templates panel is hidden — open
  // on the Text panel instead, which is the most useful starting point
  // for an empty canvas. Falling back here also avoids the empty-panel
  // flash that would happen if the first render mounted on 'templates'
  // and then immediately re-rendered with that button gone.
  const [activePanel, setActivePanel] = useState(mode === 'blank' ? 'text' : 'templates');
  const [bg, setBg] = useState('#ffffff');
  const [zoom, setZoom] = useState(0.58);
  // Pan offset (in viewport pixels) applied to the zoom wrapper as a CSS
  // translate AFTER the scale. Updated by the spacebar-hand-tool and
  // implicitly used by zoom-to-cursor wheel zoom.
  const [pan, setPan] = useState({ x: 0, y: 0 });
  // Refs for pan-drag state. Refs (not state) because mousemove handlers
  // need to read these tens of times per second and React state updates
  // would force a render per mousemove tick — wasteful and laggy.
  //
  //  spaceRef.current   : true while the spacebar is held (cursor → grab)
  //  panDragRef.current : { active, startClientX, startClientY, startPanX, startPanY }
  //                        — populated on mousedown while space is held
  const spaceRef    = useRef(false);
  const panDragRef  = useRef({ active: false });
  const [zoomChrome, setZoomChrome] = useState({ space: false, panning: false });
  const [selected, setSelected] = useState(null);
  const [objects, setObjects] = useState([]);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showFonts, setShowFonts] = useState(false);
  const [customTemplates, setCustomTemplates] = useState([]);

  // Rich-text overlay editing target — id of the textbox being edited
  const [richEditTargetId, setRichEditTargetId] = useState(null);
  // Tick state to force overlay re-render when the underlying textbox
  // moves or resizes (Fabric mutates the object in place, so React has
  // no way to know — we bump a counter on object:modified).
  const [overlayTick, setOverlayTick] = useState(0);

  // Custom right-click context menu state.
  //  - ctxMenu.visible: whether to render the menu
  //  - ctxMenu.x / y  : viewport-fixed coordinates (for the menu itself)
  //  - ctxMenu.canvasPos: coordinates in canvas space (for pasting a
  //                       new text block at the click position)
  const [ctxMenu, setCtxMenu] = useState({ visible: false, x: 0, y: 0, canvasPos: null });
  // Fabric Textbox that is currently in live edit mode, or null. We track
  // this separately from `selected` because a textbox can be selected
  // without being "editing" (edit starts on double-click / Enter).
  const [editingTextTarget, setEditingTextTarget] = useState(null);

  // Derive the array of selected element IDs from the active selection.
  //   - Single object selected → [id]
  //   - Multi-select (Fabric ActiveSelection wrapper) → [id1, id2, …]
  //   - Nothing selected → []
  // Used by LayerPanel to highlight every selected row, and by the toolbar
  // to show a "MULTI · N selected" label when more than one is active.
  const selectedIds = (() => {
    if (!selected) return [];
    if (selected.type === 'activeSelection' && typeof selected.getObjects === 'function') {
      return selected.getObjects().map((o) => o.id).filter(Boolean);
    }
    return selected.id ? [selected.id] : [];
  })();

  // Load user-saved templates from localStorage
  useEffect(() => {
    try {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith('ec:tpl:'));
      const loaded = keys
        .map((k) => { try { return JSON.parse(localStorage.getItem(k)); } catch { return null; } })
        .filter(Boolean);
      setCustomTemplates(loaded);
    } catch {}
  }, []);

  // Initial load — mode-based, NOT inferred from field presence.
  useEffect(() => {
    const t = setTimeout(() => {
      // Substitutions for load-time placeholders. {{brand}} comes from the
      // BrandingContext (settable via Settings → app title), {{project_name}}
      // from the ProjectContext (settable via the landing page or the file
      // ribbon). Anything not in this map (e.g. {{full_name}}) is left as a
      // literal token for CSV-time substitution at export.
      const subs = {
        brand: appTitle || 'Elite Certify',
        project_name: projectName || '',
      };
      switch (mode) {
        case 'blank':
          // True empty canvas. The background color comes from the landing.
          setBg(canvasBg || '#ffffff');
          canvasRef.current?.clearCanvas(canvasBg || '#ffffff');
          break;
        case 'template':
          if (initialTemplate?.canvas) canvasRef.current?.loadFromTemplate(initialTemplate);
          else if (initialTemplate?.elements) canvasRef.current?.loadTemplate(initialTemplate, subs);
          setBg(initialTemplate?.bg || canvasBg || '#ffffff');
          break;
        case 'import':
          setBg(canvasBg || '#ffffff');
          canvasRef.current?.clearCanvas(canvasBg || '#ffffff');
          if (importedBackground) canvasRef.current?.addBackgroundImage(importedBackground);
          break;
        case 'default':
        default:
          // User landed at /editor directly with no tab choice — keep the
          // original behavior of showing the first internal template as a
          // demo. (If you'd rather this also be blank, change to clearCanvas.)
          canvasRef.current?.loadTemplate(TEMPLATES[0], subs);
          setBg(TEMPLATES[0].bg);
          break;
      }
    }, 400);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.target.isContentEditable) return; // TipTap is contenteditable
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault(); canvasRef.current?.undo();
      } else if (mod && (e.key.toLowerCase() === 'y' || (e.shiftKey && e.key.toLowerCase() === 'z'))) {
        e.preventDefault(); canvasRef.current?.redo();
      } else if (mod && e.key.toLowerCase() === 'd') {
        e.preventDefault(); canvasRef.current?.duplicateSelected();
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && canvasRef.current) {
        const c = canvasRef.current.getCanvas?.();
        const active = c?.getActiveObject?.();
        if (active && active.isEditing) return;
        if (active && active.isLocked) return;
        e.preventDefault();
        canvasRef.current.deleteSelected();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const onSelectionChange = useCallback((obj) => {
    setSelected(obj);
    // If selection changes away from the overlay target, close the overlay
    if (obj?.id !== richEditTargetId) setRichEditTargetId(null);
  }, [richEditTargetId]);
  const onObjectsChange = useCallback((list) => {
    setObjects(list);
    setOverlayTick((n) => n + 1);
  }, []);
  const onHistoryChange = useCallback((h) => setHistory(h), []);
  const onTextEditingChange = useCallback((target) => {
    setOverlayTick((n) => n + 1);
    // Track whichever textbox is currently in live edit mode so the
    // right-click menu knows whether Copy/Paste/Select All should operate
    // on the caret selection or on canvas objects. Fabric calls this with
    // the target on text:editing:entered and with null on :exited.
    // It's also called during object:moving/scaling with the active
    // object — in that case only treat as "editing" if isEditing is true.
    if (target && (target.type === 'textbox' || target.type === 'i-text') && target.isEditing) {
      setEditingTextTarget(target);
    } else {
      setEditingTextTarget(null);
    }
  }, []);

  const loadTemplate = (tpl) => {
    // Mirror the load-time substitution map from the initial-load effect
    // so a side-panel template pick gets the same brand / project_name
    // treatment as the landing-page entry. CSV placeholders are left
    // alone — those resolve at export time.
    const subs = {
      brand: appTitle || 'Elite Certify',
      project_name: projectName || '',
    };
    canvasRef.current?.loadTemplate(tpl, subs);
    setBg(tpl.bg || '#ffffff');
    setRichEditTargetId(null);
  };

  const addPlaceholder = (name) => {
    canvasRef.current?.addText(`{{${name}}}`, {
      fontSize: 32,
      fontFamily: 'Playfair Display',
      fontWeight: 600,
      fill: '#7f1d1d',
      width: 500,
    });
  };

  const handleImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    // No `width` override — let Canvas.addImage compute a natural-fit
    // size that preserves aspect ratio and fills a comfortable portion
    // of the canvas.
    reader.onload = (ev) => canvasRef.current?.addImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleBgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => canvasRef.current?.addBackgroundImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleExternalTemplate = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => canvasRef.current?.addBackgroundImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSvgImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result.replace(/<script[\s\S]*?<\/script>/gi, '');
      canvasRef.current?.addSvg(text, { width: 160, height: 160 });
    };
    reader.readAsText(file);
  };

  const saveCurrentAsTemplate = () => {
    const name = prompt('Name this template:', projectName);
    if (!name) return;
    const snap = canvasRef.current?.saveAsTemplate();
    if (!snap) return;
    const tpl = {
      id: 'custom_' + Date.now(),
      name,
      ...snap,
      custom: true,
      bg: snap.bg,
    };
    try {
      localStorage.setItem('ec:tpl:' + tpl.id, JSON.stringify(tpl));
      setCustomTemplates((prev) => [...prev, tpl]);
    } catch {}
  };

  // Defensive sync: if `mode` flips to 'blank' while the user is on the
  // Templates panel (in practice this only happens via in-app state
  // mutations, not normal navigation), bounce them to a panel that's
  // still visible. Without this the empty Templates content would render
  // but its rail button would be hidden, which is confusing.
  useEffect(() => {
    if (mode === 'blank' && activePanel === 'templates') {
      setActivePanel('text');
    }
  }, [mode, activePanel]);

  useEffect(() => {
    canvasRef.current?.setDimensions(canvasSize.w, canvasSize.h);
  }, [canvasSize.w, canvasSize.h]);

  // ---------------------------------------------------------------------------
  // PAN CLAMP — "Minimum Visibility" rule
  //
  // The wrapper is positioned with transform-origin: center, so at pan = (0,0)
  // the (zoomed) canvas is geometrically centred inside the workspace box.
  // Pan offsets in pixels translate the wrapper away from that centre.
  //
  // The clamp enforces two behaviours, both required by the navigation spec:
  //
  //   1. CONTAINMENT — at least MIN_VISIBLE_RATIO (10%) of the design's
  //      zoomed pixel area must remain inside the workspace viewport. The
  //      user can never fling the canvas so far in any direction that the
  //      paper disappears entirely. We compute the pan range that keeps a
  //      10% sliver visible on the trailing edge.
  //
  //   2. CENTRE-ON-ZOOM-OUT — when the zoomed canvas is SMALLER than the
  //      workspace along an axis, the user has nowhere meaningful to pan
  //      to on that axis: any non-zero offset just slides the floating
  //      canvas around dead space. We snap pan to 0 on that axis so the
  //      canvas stays centred. This is the fix for the "flies into a
  //      corner at very small zoom" symptom.
  //
  // The function is a pure transform from (rawPan, zoom, canvasW, canvasH,
  // workspaceRect) → clampedPan. We call it from every code path that
  // mutates pan: spacebar drag, wheel zoom-to-cursor, +/- zoom buttons,
  // and fit-to-screen. Keeping the math in one place means there's exactly
  // one definition of "is this off-screen?".
  // ---------------------------------------------------------------------------
  const MIN_VISIBLE_RATIO = 0.1; // 10% — task spec

  const clampPan = useCallback((rawPan, zoomLevel) => {
    const ws = workspaceRef.current;
    if (!ws) return rawPan;
    const wsRect = ws.getBoundingClientRect();
    const wsW = wsRect.width;
    const wsH = wsRect.height;
    const cw = canvasSize.w;
    const ch = canvasSize.h;
    if (!cw || !ch || !wsW || !wsH) return rawPan;

    // Zoomed pixel size of the canvas as it appears on screen.
    const zw = cw * zoomLevel;
    const zh = ch * zoomLevel;

    // CENTRE-ON-ZOOM-OUT: when the zoomed canvas fits entirely within the
    // workspace on an axis, pan on that axis must be 0 (centred). This
    // gates BEFORE the containment math below — otherwise a tiny canvas
    // would still be allowed to drift inside its own surrounding margin.
    let nx = rawPan.x;
    let ny = rawPan.y;
    if (zw <= wsW) {
      nx = 0;
    } else {
      // CONTAINMENT: with transform-origin centred, pan offset of P moves
      // the canvas centre by P pixels. The right edge sits at
      //   centreX + zw/2 + panX
      // The left edge at
      //   centreX - zw/2 + panX
      // We need at least MIN_VISIBLE_RATIO * zw to overlap the workspace
      // rect [0, wsW]. The maximum |panX| for that to hold is:
      //   maxPanX = (wsW + zw)/2 - MIN_VISIBLE_RATIO * zw
      // i.e. enough offset that 10% of the canvas still pokes into the
      // workspace from the trailing edge. Symmetric in both signs.
      const maxX = (wsW + zw) / 2 - MIN_VISIBLE_RATIO * zw;
      nx = Math.max(-maxX, Math.min(maxX, rawPan.x));
    }
    if (zh <= wsH) {
      ny = 0;
    } else {
      const maxY = (wsH + zh) / 2 - MIN_VISIBLE_RATIO * zh;
      ny = Math.max(-maxY, Math.min(maxY, rawPan.y));
    }
    return { x: nx, y: ny };
  }, [canvasSize.w, canvasSize.h]);

  // ---------------------------------------------------------------------------
  // FIT-TO-SCREEN ZOOM
  //
  // Compute a zoom factor that keeps the entire canvas visible inside the
  // workspace area, with a small breathing-room padding. The math itself
  // lives in WorkspaceBackground.getWorkspaceFitScale (re-exposed via
  // canvasRef.fitToScreen) so the fit rule is in one place.
  //
  // We auto-fit on:
  //   * canvas size change (e.g. user picks A4 instead of IG Post — without
  //     fit, A4 would be wildly off-screen at the previous zoom)
  //   * window resize
  //   * workspace container resize (e.g. side panel opens/closes)
  //
  // The user can still override via the +/- zoom buttons; auto-fit only
  // triggers on the events above. Pressing the ⛶ Fit button at any time
  // re-runs the fit explicitly.
  // ---------------------------------------------------------------------------
  const fitZoom = useCallback(() => {
    const container = workspaceRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const scale = canvasRef.current?.fitToScreen(rect);
    if (typeof scale === 'number' && isFinite(scale) && scale > 0) {
      setZoom(scale);
      // Re-centring on fit. The wrapper has transform-origin: center, and
      // pan is applied after scale, so resetting pan to 0,0 puts the
      // canvas back at the workspace's geometric center.
      setPan({ x: 0, y: 0 });
    }
  }, []);

  // Auto-fit when the canvas dimensions change. We give the layout a tick
  // (via rAF) so the workspace's bounding rect reflects any side-effects
  // of the dimension change before we measure.
  //
  // CRITICAL: this is the ONLY auto-fit trigger. Earlier versions also
  // refitted on window-resize and on every workspace ResizeObserver tick.
  // That was the source of the "zoom snaps back to 21%" bug:
  //
  //   1. user picks A4 (2480 × 3508) → fitZoom → ~0.21
  //   2. user wheel-zooms up to 0.41 → wrapper grows visually
  //   3. workspace's flex/overflow layout reflows → ResizeObserver fires
  //   4. fitZoom runs → zoom snaps back to 0.21
  //   5. (loop)
  //
  // The user's authored zoom is theirs to keep. Window resize, panel
  // toggling, double-clicking text — none of those are "user asked to
  // refit" signals. Auto-fit ONLY runs when the canvas dimensions
  // themselves change (e.g. switching from A4 to Letter). The Fit button
  // (⛶) is the explicit re-fit affordance.
  useEffect(() => {
    const id = requestAnimationFrame(() => fitZoom());
    return () => cancelAnimationFrame(id);
  }, [canvasSize.w, canvasSize.h, fitZoom]);

  // On window / workspace resize we ONLY re-clamp pan — we never touch
  // zoom. If the workspace shrinks, the existing pan offset may now
  // violate the 10%-visibility rule (the canvas got pushed off-screen
  // because the viewport contracted), so we re-run clampPan with the
  // current zoom. zoom itself is preserved.
  useEffect(() => {
    const onResize = () => {
      // Re-clamp pan against the new workspace dimensions. This neither
      // resets zoom nor recentres an in-bounds canvas; it only nudges
      // back into the 10% margin if the resize made it disappear.
      setPan((p) => clampPanRef.current(p, zoomRef.current));
    };
    window.addEventListener('resize', onResize);

    let ro = null;
    if (typeof ResizeObserver !== 'undefined' && workspaceRef.current) {
      ro = new ResizeObserver(onResize);
      ro.observe(workspaceRef.current);
    }

    return () => {
      window.removeEventListener('resize', onResize);
      if (ro) ro.disconnect();
    };
  }, []);

  // ---------------------------------------------------------------------------
  // SPACEBAR-TO-PAN  (Photoshop / Illustrator hand tool)
  //
  // While the spacebar is held:
  //   * cursor turns into 'grab' (and 'grabbing' while a drag is active)
  //   * Fabric's selection / hit-testing is suspended (skipTargetFind +
  //     selection = false), so the user can drag through objects without
  //     grabbing them by accident
  //   * mousedown + mousemove on the workspace updates `pan`, translating
  //     the entire zoom wrapper
  //
  // We intentionally swallow the spacebar event so it doesn't scroll the
  // page (default browser behaviour for Space when focus isn't on a form
  // element). Form / contentEditable focus is detected and the listener
  // bails — the user is presumably typing.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const isFormElement = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    };
    const isFabricEditing = () => {
      const c = canvasRef.current?.getCanvas?.();
      const a = c?.getActiveObject?.();
      return !!(a && a.isEditing);
    };

    const setFabricInteractionsSuspended = (suspend) => {
      const c = canvasRef.current?.getCanvas?.();
      if (!c) return;
      // Cache once so we restore exactly what was there (defensive — these
      // are the documented defaults but a future refactor might change them).
      if (suspend && !c.__panSavedInteractive) {
        c.__panSavedInteractive = {
          skipTargetFind: c.skipTargetFind,
          selection:      c.selection,
          defaultCursor:  c.defaultCursor,
          hoverCursor:    c.hoverCursor,
        };
        c.skipTargetFind = true;
        c.selection = false;
        c.defaultCursor = 'grab';
        c.hoverCursor = 'grab';
      } else if (!suspend && c.__panSavedInteractive) {
        const s = c.__panSavedInteractive;
        c.skipTargetFind = s.skipTargetFind;
        c.selection      = s.selection;
        c.defaultCursor  = s.defaultCursor;
        c.hoverCursor    = s.hoverCursor;
        delete c.__panSavedInteractive;
      }
      c.requestRenderAll();
    };

    const onKeyDown = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (isFormElement(document.activeElement)) return;
      if (isFabricEditing()) return;
      if (spaceRef.current) {
        // Repeat key — already in pan mode, just swallow the default to
        // prevent page scrolling.
        e.preventDefault();
        return;
      }
      spaceRef.current = true;
      setZoomChrome((c) => ({ ...c, space: true }));
      setFabricInteractionsSuspended(true);
      e.preventDefault();
    };
    const onKeyUp = (e) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (!spaceRef.current) return;
      spaceRef.current = false;
      panDragRef.current = { active: false };
      setZoomChrome({ space: false, panning: false });
      setFabricInteractionsSuspended(false);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Safety net: if the window loses focus mid-pan (alt-tab), the keyup
    // never fires. Reset state on blur so the user doesn't end up stuck
    // in pan mode the next time they refocus.
    const onBlur = () => {
      if (spaceRef.current) {
        spaceRef.current = false;
        panDragRef.current = { active: false };
        setZoomChrome({ space: false, panning: false });
        setFabricInteractionsSuspended(false);
      }
    };
    window.addEventListener('blur', onBlur);

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  // Pointer handlers for pan-drag. Attached to `window` rather than the
  // workspace div so a drag that leaves the workspace bounds (e.g. user
  // overshoots while flinging the canvas) doesn't drop the pan early.
  // We only ENGAGE the drag if the initial mousedown happened over the
  // workspace AND the spacebar was already held — otherwise normal
  // canvas interactions proceed unchanged.
  //
  // Implementation note: we read the current pan / zoom / clamp via refs
  // (mirrored from state on every change) rather than from React state in
  // the closure, so this effect only runs once per mount and the
  // listeners aren't reattached on every mousemove tick.
  const panRef = useRef(pan);
  useEffect(() => { panRef.current = pan; }, [pan]);
  const zoomRef = useRef(zoom);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  const clampPanRef = useRef(clampPan);
  useEffect(() => { clampPanRef.current = clampPan; }, [clampPan]);
  useEffect(() => {
    const onMouseDown = (e) => {
      if (!spaceRef.current) return;
      const ws = workspaceRef.current;
      if (!ws) return;
      // Only initiate panning when the click started inside the workspace.
      if (!ws.contains(e.target)) return;
      panDragRef.current = {
        active: true,
        startClientX: e.clientX,
        startClientY: e.clientY,
        startPanX: panRef.current.x,
        startPanY: panRef.current.y,
      };
      setZoomChrome((c) => ({ ...c, panning: true }));
      e.preventDefault();
      e.stopPropagation();
    };
    const onMouseMove = (e) => {
      if (!panDragRef.current.active) return;
      const dx = e.clientX - panDragRef.current.startClientX;
      const dy = e.clientY - panDragRef.current.startClientY;
      // Apply the containment clamp inline so the user can never drag the
      // canvas past the 10%-visibility boundary. Reading zoom + the clamp
      // via refs keeps this effect pinned to mount-time without stale
      // closure issues.
      const next = clampPanRef.current(
        {
          x: panDragRef.current.startPanX + dx,
          y: panDragRef.current.startPanY + dy,
        },
        zoomRef.current,
      );
      setPan(next);
      e.preventDefault();
    };
    const onMouseUp = () => {
      if (!panDragRef.current.active) return;
      panDragRef.current = { active: false };
      setZoomChrome((c) => ({ ...c, panning: false }));
    };
    window.addEventListener('mousedown', onMouseDown, true);  // capture
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousedown', onMouseDown, true);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // ZOOM-TO-CURSOR  (Ctrl/Cmd + wheel)
  //
  // The wrapper's transform-origin is `center center`, so a naive
  // setZoom(...) zooms toward the workspace center. To zoom toward the
  // cursor instead, we compensate with a pan offset that keeps the
  // canvas-space point under the cursor invariant across the zoom step.
  //
  //   panX' = (cx - wcx) * (1 - f) + f * panX
  //   panY' = (cy - wcy) * (1 - f) + f * panY
  //   where f = newZoom / oldZoom, (cx,cy) cursor in viewport coords,
  //   (wcx,wcy) workspace centre in viewport coords.
  //
  // We bind to the workspace via a `wheel` handler (passive: false, so
  // we can preventDefault and block the browser's pinch/zoom). The
  // multiplier is exponential (smooth) and capped to prevent OOM.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const ws = workspaceRef.current;
    if (!ws) return;

    const ZOOM_MIN = 0.05;
    const ZOOM_MAX = 32;

    const onWheel = (e) => {
      // Only zoom when the user is intentionally zooming (Ctrl / Cmd +
      // wheel). Plain wheel scrolls the workspace as before.
      if (!(e.ctrlKey || e.metaKey)) return;
      e.preventDefault();

      const rect = ws.getBoundingClientRect();
      const wcx = rect.left + rect.width  / 2;
      const wcy = rect.top  + rect.height / 2;

      // 0.0015 yields ~10% per typical wheel notch (deltaY ≈ 100). The
      // exponential form is symmetric around 1 (zoom in / zoom out feel
      // proportional rather than asymmetric).
      const factor = Math.exp(-e.deltaY * 0.0015);

      setZoom((prevZoom) => {
        const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prevZoom * factor));
        const f = next / prevZoom;
        // Atomic pan update bound to this same zoom transition. We compute
        // the cursor-anchored pan first, then run it through clampPan at
        // the NEW zoom level — otherwise a Ctrl-wheel scroll-out can
        // momentarily produce a pan that violates the 10%-visibility rule
        // or, at very small zooms, drifts the now-tiny canvas off-centre.
        // The clamp's centre-on-zoom-out branch fixes the corner-fly bug.
        setPan((prevPan) => clampPanRef.current(
          {
            x: (e.clientX - wcx) * (1 - f) + f * prevPan.x,
            y: (e.clientY - wcy) * (1 - f) + f * prevPan.y,
          },
          next,
        ));
        return next;
      });
    };

    ws.addEventListener('wheel', onWheel, { passive: false });
    return () => ws.removeEventListener('wheel', onWheel);
  }, []);

  // Open overlay for the current selection
  const openRichText = () => {
    if (!selected?.id) return;
    const type = selected.type;
    if (type !== 'textbox' && type !== 'i-text' && type !== 'text') return;
    setRichEditTargetId(selected.id);
  };

  const closeRichText = () => setRichEditTargetId(null);

  const applyRichText = ({ text, styles, richText, width }) => {
    if (!richEditTargetId) return;
    canvasRef.current?.applyRichText(richEditTargetId, { text, styles, richText, width });
    setRichEditTargetId(null);
  };

  // The live Fabric object matching richEditTargetId — used to size the overlay.
  const richEditTarget = richEditTargetId
    ? canvasRef.current?.getObjectById?.(richEditTargetId)
    : null;

  // While the overlay is active, dim the underlying Fabric object so the
  // user sees a single crisp editor (not double rendering).
  useEffect(() => {
    const c = canvasRef.current?.getCanvas?.();
    if (!c) return;
    const all = c.getObjects();
    all.forEach((o) => {
      if (richEditTargetId && o.id === richEditTargetId) {
        o._richEditOriginalOpacity = o._richEditOriginalOpacity ?? o.opacity ?? 1;
        o.set('opacity', 0.15);
      } else if (o._richEditOriginalOpacity != null) {
        o.set('opacity', o._richEditOriginalOpacity);
        delete o._richEditOriginalOpacity;
      }
    });
    c.requestRenderAll();
  }, [richEditTargetId, overlayTick]);

  const goHome = () => router.push('/');

  const VBtn = ({ panel, icon: Icon, label }) => (
    <button
      className={`vribbon-btn ${activePanel === panel ? 'active' : ''}`}
      onClick={() => setActivePanel(panel)}
    >
      <Icon size={18} strokeWidth={1.5} />
      <span>{label}</span>
    </button>
  );

  return (
    <div className="workspace-shell">
      {/* ============ TOP RIBBON ============ */}
      <header className="ribbon-top ribbon-top-studio" style={{ minHeight: 54 }}>
        <button onClick={goHome} className="tool-btn" title="Back to Home">
          <Home size={14} />
        </button>
        <span className="ribbon-sep" />

        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
            style={{
              background: logoSrc ? 'transparent' : 'linear-gradient(135deg, #dc2626, #f97316)',
              boxShadow: logoSrc ? 'none' : '0 0 16px rgba(249, 115, 22, 0.3)',
            }}
          >
            {logoSrc ? (
              <img src={logoSrc} alt="Logo" className="w-full h-full" style={{ objectFit: 'contain' }} />
            ) : (
              <Award size={18} color="#fff" strokeWidth={2} />
            )}
          </div>
          <div>
            <div className="font-display font-semibold text-base leading-none text-ember-50">
              {projectName || appTitle}
            </div>
            <div className="font-mono text-[9px] tracking-widest uppercase text-ember-50/50 mt-0.5">
              {canvasSize.label} · {canvasSize.w} × {canvasSize.h} · {mode.toUpperCase()}
            </div>
          </div>
        </div>

        <span className="ribbon-sep" />

        <button className="tool-btn" disabled={!history.canUndo} onClick={() => canvasRef.current?.undo()} title="Undo (Ctrl+Z)">
          <Undo2 size={14} />Undo
        </button>
        <button className="tool-btn" disabled={!history.canRedo} onClick={() => canvasRef.current?.redo()} title="Redo (Ctrl+Shift+Z)">
          <Redo2 size={14} />Redo
        </button>

        <span className="ribbon-sep" />

        <button
          className="tool-btn"
          onClick={() => {
            // +/- buttons zoom around the workspace centre. We re-clamp pan
            // at the new zoom so an out-zoom that drops the canvas below
            // workspace size snaps it back to centre (otherwise a residual
            // pan from a previous drag would leave the canvas drifting in
            // a corner — the symptom we're fixing).
            setZoom((z) => {
              const next = Math.max(0.05, z - 0.1);
              setPan((p) => clampPanRef.current(p, next));
              return next;
            });
          }}
        >
          <ZoomOut size={14} />
        </button>
        <span className="font-mono text-xs text-ember-50/70 w-10 text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          className="tool-btn"
          onClick={() => {
            setZoom((z) => {
              const next = Math.min(32, z + 0.1);
              setPan((p) => clampPanRef.current(p, next));
              return next;
            });
          }}
        >
          <ZoomIn size={14} />
        </button>
        <button className="tool-btn" onClick={fitZoom} title="Fit to screen">
          <Maximize2 size={14} />
        </button>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="tool-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}
            {theme === 'dark' ? 'Light' : 'Dark'}
          </button>
          <button className="tool-btn" onClick={() => setShowSettings(true)}>
            <Settings size={14} />Settings
          </button>
          <button className="tool-btn" onClick={saveCurrentAsTemplate}>
            <Save size={14} />Save
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all"
            style={{ background: 'linear-gradient(135deg, #dc2626, #f97316)', boxShadow: '0 4px 16px rgba(220, 38, 38, 0.35)' }}
          >
            <Download size={14} strokeWidth={2.5} />Export
          </button>
        </div>
      </header>

      {/* ============ MAIN BODY ============ */}
      <div className="flex-1 flex overflow-hidden">
        <nav className="vribbon">
          {/* Templates panel is hidden for blank-canvas projects — the user
              explicitly opted out of templates by picking "Start from Scratch"
              on the landing page. They can still load a saved template from
              the file menu, but the panel-rail entry is suppressed so it
              isn't a tempting wrong turn. */}
          {mode !== 'blank' && (
            <VBtn panel="templates" icon={LayoutIcon} label="TMPL" />
          )}
          <VBtn panel="text" icon={Type} label="TEXT" />
          <VBtn panel="shapes" icon={Square} label="SHAPE" />
          <VBtn panel="corners" icon={FrameIcon} label="CRNR" />
          <VBtn panel="images" icon={ImageIcon} label="IMG" />
          <VBtn panel="data" icon={Hash} label="DATA" />
          <VBtn panel="layers" icon={LayersIcon} label="LYRS" />
        </nav>

        <aside className="side-panel">
          <SidePanelContent
            active={activePanel}
            templates={TEMPLATES}
            customTemplates={customTemplates}
            onLoadTemplate={loadTemplate}
            onAddText={(opts) => canvasRef.current?.addText(opts.text, opts)}
            onAddShape={(shape) => {
              if (shape === 'rect') canvasRef.current?.addRect();
              else if (shape === 'circle') canvasRef.current?.addCircle();
              else if (shape === 'line') canvasRef.current?.addRect({ height: 2, fill: '#18120e', width: 250 });
            }}
            onAddSvg={(svg, sizeHint) =>
              canvasRef.current?.addSvg(svg, { width: sizeHint, height: sizeHint, fill: '#dc2626' })
            }
            onUploadImage={() => fileInputRef.current?.click()}
            onUploadBg={() => bgInputRef.current?.click()}
            onImportTemplate={() => templateInputRef.current?.click()}
            onImportSvg={() => svgInputRef.current?.click()}
            onAddPlaceholder={addPlaceholder}
            onOpenFontManager={() => setShowFonts(true)}
            bg={bg}
            setBg={(color) => {
              setBg(color);
              canvasRef.current?.setBackgroundColor(color);
            }}
            canvasRef={canvasRef}
            canvasSize={canvasSize}
            objects={objects}
            selectedId={selected?.id}
            selectedIds={selectedIds}
            onSelectLayer={(id) => canvasRef.current?.selectObject(id)}
            onReorderLayers={(newOrder) => canvasRef.current?.reorderObjects(newOrder)}
            onDeleteLayer={(id) => {
              canvasRef.current?.selectObject(id);
              canvasRef.current?.deleteSelected();
            }}
            onToggleLock={(id) => canvasRef.current?.toggleLocked(id)}
          />
        </aside>

        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
        <input ref={bgInputRef} type="file" accept="image/*" onChange={handleBgUpload} className="hidden" />
        <input ref={templateInputRef} type="file" accept="image/*,.pdf" onChange={handleExternalTemplate} className="hidden" />
        <input ref={svgInputRef} type="file" accept=".svg,image/svg+xml" onChange={handleSvgImport} className="hidden" />

        <main className="flex-1 flex flex-col overflow-hidden canvas-workspace">
          <ContextualToolbar
            selected={selected}
            canvasRef={canvasRef}
            onOpenRichText={openRichText}
          />

          <div
            ref={workspaceRef}
            className="flex-1 overflow-hidden relative"
            style={{
              padding: 60,
              // Pan-tool cursor affordance. The wrapper inside also sets a
              // cursor (so it survives over the Fabric canvas DOM element
              // which has its own cursor logic), but this rule covers the
              // workspace background area.
              cursor: zoomChrome.panning ? 'grabbing' : (zoomChrome.space ? 'grab' : undefined),
            }}
            onContextMenu={(e) => {
              // Intercept the browser's default context menu anywhere in
              // the workspace area (including on top of the Fabric canvas,
              // since the canvas doesn't handle right-click natively).
              //
              // We convert the click position to CANVAS COORDINATES so
              // "Paste" can drop a new text block at the exact click
              // point — not at the (unzoomed) viewport coordinate. The
              // inner wrapper is scaled by `zoom`, so divide by it.
              e.preventDefault();
              const c = canvasRef.current?.getCanvas?.();
              let canvasPos = null;
              if (c) {
                const el = c.upperCanvasEl || c.lowerCanvasEl;
                if (el) {
                  const rect = el.getBoundingClientRect();
                  // rect is already in screen pixels AFTER the zoom
                  // transform, so it reflects the on-screen canvas size.
                  canvasPos = {
                    x: (e.clientX - rect.left) / zoom,
                    y: (e.clientY - rect.top) / zoom,
                  };
                  // Clamp to canvas bounds so paste never lands off-canvas.
                  canvasPos.x = Math.max(10, Math.min(canvasPos.x, canvasSize.w - 10));
                  canvasPos.y = Math.max(10, Math.min(canvasPos.y, canvasSize.h - 10));
                }
              }
              setCtxMenu({
                visible: true,
                x: e.clientX,
                y: e.clientY,
                canvasPos,
              });
            }}
          >
            <WorkspaceBackground />
            <div style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}>
              <ParticleBackground count={50} connectDistance={130} speed={1.8} />
            </div>

            {/*
              The zoom wrapper. Canvas AND RichTextOverlay live inside it.
              Because RichTextOverlay positions itself in canvas-space (left,
              top, width, height from the Textbox), it inherits the zoom
              transform automatically and stays aligned at any zoom.

              The overlay is `position: absolute` with top:0/left:0 relative
              to the wrapper, whose origin matches the canvas DOM element's
              top-left. The inner `<canvas>` in Canvas.js is positioned at
              (0,0) within its own inline-block wrapper, so both share
              origin without extra math.
            */}
            <div
              style={{
                // Absolute positioning at workspace centre. The wrapper's
                // layout size is canvasSize.w × canvasSize.h, but because
                // it's `position: absolute`, that size NEVER drives the
                // workspace's content box. So no matter how large the
                // canvas (A4 = 2480 × 3508), the workspace's bounding
                // rect stays exactly the size of its visible viewport —
                // no scrollbars toggling on/off, no ResizeObserver
                // jitter, no zoom-snap-back loop. This is the structural
                // fix for the "zoom caps at 41% then snaps to 21%" bug.
                position: 'absolute',
                top: '50%',
                left: '50%',
                zIndex: 2,
                width: canvasSize.w,
                height: canvasSize.h,
                // Transform stack (read right-to-left = innermost first):
                //   1. scale(zoom)               — scale around centre
                //   2. translate(panX, panY)     — user pan, viewport px
                //   3. translate(-50%, -50%)     — centre the wrapper at
                //                                  the (50%, 50%) anchor,
                //                                  using its own layout size
                // With transformOrigin: center, step 1 preserves centre
                // position; step 2 offsets in viewport pixels (matches
                // the wheel-zoom math); step 3 lands the centre exactly
                // at the workspace's 50%/50% point at pan = 0.
                transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: 'center center',
                // No CSS transition on the transform — direct manipulation
                // is the convention in Figma / Photoshop / Illustrator.
                // Removing the ease (was 120ms) eliminated the visible
                // glide between intermediate pan / zoom states. The
                // accumulated state in (pan, zoom) survives every tool
                // switch since neither the spacebar key handler nor the
                // wheel handler ever resets it.
                transition: 'none',
                // While panning, force the cursor on the wrapper too so it
                // stays consistent over the canvas DOM element (which has
                // its own cursor management via Fabric).
                cursor: zoomChrome.panning ? 'grabbing' : (zoomChrome.space ? 'grab' : 'default'),
              }}
            >
              <Canvas
                ref={canvasRef}
                width={canvasSize.w}
                height={canvasSize.h}
                bg={bg}
                onSelectionChange={onSelectionChange}
                onObjectsChange={onObjectsChange}
                onHistoryChange={onHistoryChange}
                onTextEditingChange={onTextEditingChange}
              />

              {richEditTarget && (
                <RichTextOverlay
                  active={!!richEditTargetId}
                  target={richEditTarget}
                  zoom={zoom}
                  onApply={applyRichText}
                  onCancel={closeRichText}
                  // key forces remount when the user picks a different textbox
                  key={richEditTargetId + '_' + overlayTick}
                />
              )}
            </div>
          </div>

          <div className="flex items-center justify-between px-5 py-2 border-t status-bar">
            <div className="flex items-center gap-3 text-[10px] font-mono tracking-widest uppercase text-ember-50/50">
              <span>{canvasSize.w} × {canvasSize.h}</span>
              <span>·</span>
              <span>{objects.length} elements</span>
              <span>·</span>
              <span>{objects.filter((o) => o.isLocked).length} locked</span>
              {richEditTargetId && (
                <>
                  <span>·</span>
                  <span className="text-ember-400">EDITING RICH TEXT</span>
                </>
              )}
              {selected && !richEditTargetId && (
                <>
                  <span>·</span>
                  <span className="text-ember-400">
                    {selected.type?.toUpperCase()} selected
                    {selected.isLocked && ' · LOCKED'}
                  </span>
                </>
              )}
            </div>
            <div className="credit-signature">
              Made by: <strong>Ahmad Ismael</strong>
            </div>
          </div>
        </main>
      </div>

      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showExport && <ExportModal canvasRef={canvasRef} onClose={() => setShowExport(false)} />}
      {showFonts && <FontManagerModal onClose={() => setShowFonts(false)} />}

      {/* Custom right-click context menu. Rendered at the Studio root so
          it escapes any overflow:hidden parents and floats above the rest
          of the UI via a high z-index (set inside the component). */}
      {ctxMenu.visible && (
        <CanvasContextMenu
          x={ctxMenu.x}
          y={ctxMenu.y}
          canvasPos={ctxMenu.canvasPos}
          canvasRef={canvasRef}
          editingText={editingTextTarget}
          onClose={() => setCtxMenu((m) => ({ ...m, visible: false }))}
        />
      )}
    </div>
  );
}

// ============================================================================
// SIDE PANEL
// ============================================================================
function SidePanelContent(props) {
  const {
    active, templates, customTemplates, onLoadTemplate,
    onAddText, onAddShape, onAddSvg, onUploadImage, onUploadBg, onImportTemplate, onImportSvg,
    onAddPlaceholder, onOpenFontManager, bg, setBg, canvasRef, canvasSize,
    objects, selectedId, selectedIds, onSelectLayer, onReorderLayers, onDeleteLayer, onToggleLock,
  } = props;

  const titles = {
    templates: 'Templates',
    text: 'Typography',
    shapes: 'Shapes & Assets',
    corners: 'Corner Decoration',
    images: 'Images & Import',
    data: 'Dynamic Data',
    layers: 'Layers',
  };

  return (
    <div className="fade-in-panel">
      <div className="px-5 py-5 border-b border-ink-700">
        <div className="section-label mb-1">PANEL</div>
        <h2 className="panel-heading">{titles[active]}</h2>
      </div>

      {active === 'templates' && (
        <div className="p-4">
          <div className="section-label mb-3">{templates.length} Premium Templates</div>
          <div className="grid grid-cols-2 gap-2.5">
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onLoadTemplate(t)}
                className="tpl-card"
                style={{ background: t.thumbnail?.bg || '#2a1f18' }}
                title={t.description}
              >
                <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                  <div className="font-display font-bold text-lg mb-1" style={{ color: t.thumbnail?.accent || '#fff' }}>
                    {t.name.split(' ')[0]}
                  </div>
                  <div className="font-display italic text-[11px] opacity-75" style={{ color: t.thumbnail?.accent || '#fff' }}>
                    {t.name.split(' ').slice(1).join(' ')}
                  </div>
                  <div className="h-px w-8 my-2" style={{ background: t.thumbnail?.accent || '#fff' }} />
                  <div className="font-mono text-[8px] tracking-widest opacity-50" style={{ color: t.thumbnail?.accent || '#fff' }}>
                    CERTIFICATE
                  </div>
                </div>
              </button>
            ))}
          </div>

          {customTemplates.length > 0 && (
            <>
              <div className="section-label mt-6 mb-3">Your Saved</div>
              <div className="grid grid-cols-2 gap-2.5">
                {customTemplates.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => canvasRef.current?.loadFromTemplate(t)}
                    className="tpl-card"
                    style={{ background: t.bg || '#2a1f18' }}
                  >
                    <span className="absolute top-2 right-2 text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: '#f97316', color: '#18120e' }}>
                      SAVED
                    </span>
                    <div className="absolute bottom-2 left-3 right-3 font-display text-xs text-ember-50/85">
                      {t.name}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {active === 'text' && (
        <div className="p-4 space-y-3">
          <div className="section-label mb-1">Quick Add</div>
          <button
            onClick={() => onAddText({ text: 'Heading', fontFamily: 'Playfair Display', fontSize: 48, fontWeight: 700, width: 500 })}
            className="w-full p-3 rounded-xl text-left transition-all"
            style={{ background: '#18120e', border: '1px solid #2a1f18' }}
          >
            <div className="font-display text-2xl font-bold text-ember-50">Heading</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-ember-50/40 mt-1">Display Serif · Area Type</div>
          </button>
          <button
            onClick={() => onAddText({ text: 'Subheading', fontFamily: 'Fraunces', fontSize: 20, fontStyle: 'italic', width: 400 })}
            className="w-full p-3 rounded-xl text-left transition-all"
            style={{ background: '#18120e', border: '1px solid #2a1f18' }}
          >
            <div className="font-display italic text-lg text-ember-50">Subheading</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-ember-50/40 mt-1">Body Serif · Wraps automatically</div>
          </button>
          <button
            onClick={() => onAddText({ text: 'CAPTION', fontFamily: 'Inter', fontSize: 12, charSpacing: 600, fontWeight: 500, width: 300 })}
            className="w-full p-3 rounded-xl text-left transition-all"
            style={{ background: '#18120e', border: '1px solid #2a1f18' }}
          >
            <div className="text-sm tracking-[0.4em] text-ember-50 font-medium">CAPTION</div>
            <div className="text-[10px] font-mono uppercase tracking-widest text-ember-50/40 mt-1">Tracked Sans</div>
          </button>

          <div className="section-label mt-6 mb-1">Signature Scripts</div>
          <div className="space-y-2">
            {[
              { family: 'Great Vibes', label: 'Jonathan Ross' },
              { family: 'Alex Brush', label: 'Emily Carter' },
              { family: 'Pinyon Script', label: 'Charles Whitmore' },
              { family: 'Parisienne', label: 'Sophia Lee' },
            ].map((f) => (
              <button
                key={f.family}
                onClick={() => onAddText({ text: f.label, fontFamily: f.family, fontSize: 36, width: 400 })}
                className="w-full p-3 rounded-xl text-left transition-all hover:border-ember-500"
                style={{ background: '#18120e', border: '1px solid #2a1f18', fontFamily: f.family, fontSize: 22, color: '#fed7aa' }}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="section-label mt-6 mb-2">Arabic · العربية</div>
          <button
            onClick={() => onAddText({ text: 'شهادة تقدير', fontFamily: 'Cairo', fontSize: 32, width: 400 })}
            className="w-full p-3 rounded-xl text-right transition-all"
            style={{ background: '#18120e', border: '1px solid #2a1f18', fontFamily: 'Cairo', fontSize: 22, color: '#fed7aa', direction: 'rtl' }}
          >
            شهادة تقدير
          </button>

          <div className="section-label mt-6 mb-2">Custom Fonts</div>
          <button
            onClick={() => onOpenFontManager && onOpenFontManager()}
            className="w-full p-3 rounded-xl text-left transition-all flex items-center gap-3"
            style={{
              background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(249,115,22,0.1))',
              border: '1px solid rgba(249,115,22,0.4)',
              color: '#fed7aa',
            }}
          >
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: 'linear-gradient(135deg, #dc2626, #f97316)', color: '#fff', fontFamily: 'Playfair Display', fontWeight: 700, fontSize: 18 }}
            >
              Aa
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">Manage Fonts</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-ember-50/50 mt-0.5">
                Import TTF · OTF · WOFF
              </div>
            </div>
          </button>
        </div>
      )}

      {active === 'shapes' && (
        <div className="p-4">
          <div className="section-label mb-3">Basic Shapes</div>
          <div className="grid grid-cols-3 gap-2 mb-5">
            <button onClick={() => onAddShape('rect')} className="aspect-square rounded-xl flex items-center justify-center" style={{ background: '#18120e', border: '1px solid #2a1f18' }}>
              <div className="w-7 h-7 rounded bg-ember-400" />
            </button>
            <button onClick={() => onAddShape('circle')} className="aspect-square rounded-xl flex items-center justify-center" style={{ background: '#18120e', border: '1px solid #2a1f18' }}>
              <div className="w-7 h-7 rounded-full bg-ember-400" />
            </button>
            <button onClick={() => onAddShape('line')} className="aspect-square rounded-xl flex items-center justify-center" style={{ background: '#18120e', border: '1px solid #2a1f18' }}>
              <div className="w-7 h-0.5 bg-ember-400" />
            </button>
          </div>

          <div className="section-label mb-3">Canvas Background</div>
          <div className="flex items-center gap-2 mb-2">
            <input type="color" value={bg} onChange={(e) => setBg(e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
            <input type="text" value={bg} onChange={(e) => setBg(e.target.value)} className="input-field flex-1 font-mono" />
          </div>
          <div className="grid grid-cols-6 gap-1.5 mb-5">
            {['#fff7ed', '#fef2f2', '#fef9f0', '#18120e', '#7f1d1d', '#f97316'].map((c) => (
              <button
                key={c}
                onClick={() => setBg(c)}
                className="aspect-square rounded transition-transform hover:scale-110"
                style={{ background: c, border: bg === c ? '2px solid #f97316' : '1px solid #2a1f18' }}
              />
            ))}
          </div>

          <div className="section-label mb-3">Vector Library</div>
          <div className="grid grid-cols-3 gap-2">
            {SHAPES.map((s) => (
              <button
                key={s.id}
                onClick={() => onAddSvg(s.svg, s.category === 'ribbon' ? 180 : s.category === 'divider' ? 220 : 100)}
                title={s.name}
                className="aspect-square rounded-xl flex items-center justify-center transition-all"
                style={{ background: '#18120e', border: '1px solid #2a1f18', padding: 10, color: '#f97316' }}
                dangerouslySetInnerHTML={{ __html: s.svg.replace('<svg ', '<svg style="width:100%;height:100%;" ') }}
              />
            ))}
          </div>
        </div>
      )}

      {active === 'corners' && <CornerDecorationPanel canvasRef={canvasRef} canvasSize={canvasSize} />}

      {active === 'images' && (
        <div className="p-4 space-y-3">
          <button
            onClick={onUploadImage}
            className="w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all"
            style={{ background: '#18120e', border: '1px solid #2a1f18', color: '#fed7aa' }}
          >
            <Upload size={16} strokeWidth={1.5} />
            <div>
              <div className="text-sm">Upload Image</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-ember-50/40">
                PNG · JPG · SVG · Free transform
              </div>
            </div>
          </button>

          <button
            onClick={onUploadBg}
            className="w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all"
            style={{ background: '#18120e', border: '1px solid #2a1f18', color: '#fed7aa' }}
          >
            <ImageIcon size={16} strokeWidth={1.5} />
            <div>
              <div className="text-sm">Upload Background</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-ember-50/40">
                Cover-fit
              </div>
            </div>
          </button>

          <div
            className="p-4 rounded-xl"
            style={{
              background: 'linear-gradient(135deg, rgba(249,115,22,0.08), transparent)',
              border: '1px solid rgba(249,115,22,0.4)',
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={13} className="text-ember-400" />
              <div className="section-label" style={{ color: '#fb923c' }}>External Template</div>
            </div>
            <p className="text-xs text-ember-50/70 mb-3 leading-relaxed">
              Import an existing PNG/JPG/PDF design as a base layer, then overlay dynamic text
              and placeholders on top of it.
            </p>
            <button
              onClick={onImportTemplate}
              className="w-full py-2.5 px-3 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
              style={{ background: 'linear-gradient(135deg, #dc2626, #f97316)', color: '#fff', fontWeight: 600 }}
            >
              <FileText size={14} />Import External Template
            </button>
          </div>

          <button
            onClick={onImportSvg}
            className="w-full p-3 rounded-xl flex items-center gap-3 text-left transition-all"
            style={{ background: '#18120e', border: '1px dashed #3a2a20', color: '#fed7aa' }}
          >
            <Upload size={16} strokeWidth={1.5} />
            <div>
              <div className="text-sm">Import SVG</div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-ember-50/40">
                External vector shapes
              </div>
            </div>
          </button>
        </div>
      )}

      {active === 'data' && (
        <div className="p-4">
          <div className="section-label mb-2">Dynamic Placeholders</div>
          <p className="text-[11px] text-ember-50/50 mb-4 leading-relaxed">
            Tap to drop a placeholder on the canvas. During bulk export, each one is
            replaced with data from your CSV.
          </p>
          <div className="flex flex-col gap-2">
            {['full_name', 'course_title', 'date', 'issue_number', 'instructor', 'grade'].map((p) => (
              <button
                key={p}
                onClick={() => onAddPlaceholder(p)}
                className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-mono transition-all"
                style={{ background: '#18120e', border: '1px solid #2a1f18', color: '#fed7aa' }}
              >
                <span>{`{{${p}}}`}</span>
                <Plus size={13} className="text-ember-400" />
              </button>
            ))}
          </div>
          <div className="mt-6 p-3 rounded-lg text-[11px] text-ember-50/60 leading-relaxed" style={{ background: '#18120e', border: '1px solid #2a1f18' }}>
            Open <strong className="text-ember-400">Export</strong> to upload your CSV
            and generate all certificates at once.
          </div>
        </div>
      )}

      {active === 'layers' && (
        <LayerPanel
          objects={objects}
          selectedId={selectedId}
          selectedIds={selectedIds}
          onSelect={onSelectLayer}
          onReorder={onReorderLayers}
          onDelete={onDeleteLayer}
          onToggleLock={onToggleLock}
        />
      )}
    </div>
  );
}
