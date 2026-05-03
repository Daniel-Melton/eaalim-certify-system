'use client';

import { useEffect, useRef, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import { applyFreeTransform, computeFit, computeBackgroundFit, configureHighQualityRendering } from '@/lib/imageScaling';
import { toggleFlip, FLIP_KEYS } from '@/lib/shapes';
import { getWorkspaceFitScale } from '@/components/WorkspaceBackground';

/**
 * Canvas.js — v1.2
 *
 * Changes from v1.1:
 *
 *  - TEXT is now Fabric.Textbox (not IText). Textbox is "Area Type":
 *    the width is fixed, the text wraps to fit, and Enter produces manual
 *    line breaks. Narrowing the width reflows automatically. This is the
 *    Photoshop/Illustrator behavior requested.
 *
 *  - IMAGES use applyFreeTransform() (new). All 8 handles visible, side
 *    handles stretch independently, corner handles are free by default
 *    and proportional only when Shift is held — industry convention.
 *
 *  - The `styles` per-character object is still persisted and still
 *    rendered by Fabric natively. Textbox has the same `styles` schema
 *    as IText, so nothing changes for rich-text serialization.
 *
 *  - New imperative methods:
 *      enterTextEdit(id)  — start in-place text editing on id
 *      exitTextEdit()     — leave editing mode
 *      getObjectById(id)  — for the DOM overlay to read bounds
 *      clearCanvas()      — hard reset, no seed objects (used by 'blank' mode)
 *
 * Serialization: EXTRA_PROPS list covers isLocked, styles, richText, id.
 */

const EXTRA_PROPS = ['id', 'selectable', 'editable', 'placeholder', 'isLocked', 'styles', 'richText'];

const Canvas = forwardRef(function Canvas(
  { width = 1200, height = 600, bg = '#ffffff', onSelectionChange, onObjectsChange, onHistoryChange, onTextEditingChange },
  ref
) {
  const canvasElRef = useRef(null);
  const fabricRef = useRef(null);
  const [isReady, setIsReady] = useState(false);

  const historyRef = useRef({ past: [], future: [] });
  const suspendHistoryRef = useRef(false);

  // Photoshop-style movement helpers.
  //
  // dragLockRef tracks the drag-start position of the active object so that
  // when Shift is held during an object:moving event we can compare the
  // accumulated dx/dy against the start point and lock motion to whichever
  // axis has the larger delta — i.e. constrain the drag to perfectly
  // horizontal or perfectly vertical movement.
  //
  // We pin the lock axis on the FIRST shifted move event in a drag (rather
  // than re-evaluating on every mousemove) once the cursor has travelled
  // past a small dead zone. Otherwise tiny diagonal jitter on the first
  // pixel of motion would arbitrarily decide the axis. After the axis is
  // pinned for that drag, releasing Shift mid-drag clears the pin and
  // restores free motion; pressing Shift again pins the axis afresh.
  const dragLockRef = useRef({
    active: false,
    startLeft: 0,
    startTop:  0,
    axis: null,   // 'x' | 'y' | null (null = not yet pinned this drag)
  });

  const emitHistory = useCallback(() => {
    if (onHistoryChange) {
      onHistoryChange({
        canUndo: historyRef.current.past.length > 1,
        canRedo: historyRef.current.future.length > 0,
      });
    }
  }, [onHistoryChange]);

  const snapshot = useCallback(() => {
    if (!fabricRef.current) return null;
    return JSON.stringify(fabricRef.current.toJSON(EXTRA_PROPS));
  }, []);

  const pushHistory = useCallback(() => {
    if (suspendHistoryRef.current || !fabricRef.current) return;
    const snap = snapshot();
    if (!snap) return;
    const h = historyRef.current;
    if (h.past[h.past.length - 1] === snap) return;
    h.past.push(snap);
    if (h.past.length > 5) h.past.shift();
    h.future = [];
    emitHistory();
  }, [snapshot, emitHistory]);

  const emitObjects = useCallback(() => {
    if (!fabricRef.current || !onObjectsChange) return;
    const objects = fabricRef.current.getObjects().map((obj, idx) => ({
      id: obj.id || `obj_${idx}`,
      type: obj.type,
      text: obj.text,
      zIndex: idx,
      isLocked: !!obj.isLocked,
      ref: obj,
    }));
    onObjectsChange(objects);
  }, [onObjectsChange]);

  // --------------------------------------------------------------------------
  // LOCK HELPERS
  // --------------------------------------------------------------------------
  const applyLockState = (obj, locked) => {
    if (!obj) return;
    obj.isLocked = !!locked;
    obj.selectable = !locked;
    obj.evented = !locked;
    obj.lockMovementX = !!locked;
    obj.lockMovementY = !!locked;
    obj.lockScalingX = !!locked;
    obj.lockScalingY = !!locked;
    obj.lockRotation = !!locked;
    obj.hasControls = !locked;
    obj.hasBorders = !locked;
    obj.hoverCursor = locked ? 'not-allowed' : 'move';
    if (obj.type === 'i-text' || obj.type === 'textbox') {
      obj.editable = !locked;
    }
  };

  // --------------------------------------------------------------------------
  // INIT
  // --------------------------------------------------------------------------
  useEffect(() => {
    let fabric;
    let mounted = true;

    (async () => {
      const mod = await import('fabric');
      fabric = mod.fabric || mod.default || mod;
      if (!mounted) return;

      const canvas = new fabric.Canvas(canvasElRef.current, {
        width,
        height,
        backgroundColor: bg,
        preserveObjectStacking: true,
        selection: true,
      });

      // Switch the canvas's 2D context to bilinear/bicubic resampling so
      // upscaled exports (2×/3×/4×) stay crisp rather than blocky. Has to
      // happen post-construction since Fabric creates the offscreen canvas
      // lazily.
      configureHighQualityRendering(canvas);

      fabric.Object.prototype.set({
        borderColor: '#f97316',
        cornerColor: '#ffffff',
        cornerStrokeColor: '#dc2626',
        cornerSize: 11,
        cornerStyle: 'circle',
        transparentCorners: false,
        borderScaleFactor: 1.5,
        padding: 4,
        centeredRotation: true,
        rotatingPointOffset: 32,
      });

      if (fabric.Object.prototype.controls && fabric.Object.prototype.controls.mtr) {
        const mtr = fabric.Object.prototype.controls.mtr;
        mtr.sizeX = 18;
        mtr.sizeY = 18;
        mtr.touchSizeX = 32;
        mtr.touchSizeY = 32;
        mtr.offsetY = -32;
        mtr.render = function (ctx, left, top) {
          ctx.save();
          ctx.translate(left, top);
          ctx.fillStyle = '#ffffff';
          ctx.strokeStyle = '#dc2626';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.fillStyle = '#f97316';
          ctx.beginPath();
          ctx.arc(0, 0, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        };
      }

      fabricRef.current = canvas;
      setIsReady(true);

      historyRef.current = { past: [snapshot()], future: [] };
      emitHistory();

      // EVENTS
      const onMod = () => { pushHistory(); emitObjects(); };
      canvas.on('object:modified', onMod);
      canvas.on('object:added', () => {
        emitObjects();
        if (!suspendHistoryRef.current) pushHistory();
      });
      canvas.on('object:removed', () => { pushHistory(); emitObjects(); });

      // Forward in-progress transforms (scaling/moving/rotating) to the
      // parent so DOM overlays can track Fabric geometry in real time.
      // We reuse the onTextEditingChange callback as a generic "something
      // visible on the canvas just changed" tick — the overlay only cares
      // about the target's left/top/width/height/angle.
      const onTransform = () => {
        if (onTextEditingChange) onTextEditingChange(canvas.getActiveObject() || null);
      };
      canvas.on('object:moving', onTransform);
      canvas.on('object:scaling', onTransform);
      canvas.on('object:rotating', onTransform);

      const guardSelection = (obj) => {
        if (obj && obj.isLocked) {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          return null;
        }
        return obj;
      };

      // Selection handlers
      //
      // For a single object: e.selected = [obj]; canvas.getActiveObject() === obj.
      // For a multi-select (ActiveSelection): e.selected = [child1, child2, …],
      //   while canvas.getActiveObject() returns the ActiveSelection wrapper.
      // We surface the WRAPPER, not the first child, so consumers can
      // distinguish "single text box" from "multi-select including a text
      // box" — the latter has type === 'activeSelection' and its own
      // getObjects() iteration.
      canvas.on('selection:created', () => {
        const active = canvas.getActiveObject();
        onSelectionChange && onSelectionChange(guardSelection(active));
      });
      canvas.on('selection:updated', () => {
        const active = canvas.getActiveObject();
        onSelectionChange && onSelectionChange(guardSelection(active));
      });
      canvas.on('selection:cleared', () => onSelectionChange && onSelectionChange(null));

      // Text editing state — the overlay needs to know when a textbox is
      // live so it can position itself over the right object.
      canvas.on('text:editing:entered', (e) => {
        if (onTextEditingChange) onTextEditingChange(e.target || null);
      });
      canvas.on('text:editing:exited', () => {
        if (onTextEditingChange) onTextEditingChange(null);
      });

      // Ctrl/Cmd + click = multi-select
      canvas.on('mouse:down', (opt) => {
        const e = opt.e;
        if (!e) return;
        const isMod = e.ctrlKey || e.metaKey;
        if (!isMod) return;
        const target = opt.target;
        if (!target || target.isLocked) { e.preventDefault?.(); return; }

        const active = canvas.getActiveObject();
        const buildSelection = (objs) => {
          const usable = objs.filter((o) => !o.isLocked);
          if (usable.length === 0) canvas.discardActiveObject();
          else if (usable.length === 1) canvas.setActiveObject(usable[0]);
          else {
            const sel = new fabric.ActiveSelection(usable, { canvas });
            canvas.setActiveObject(sel);
          }
          canvas.requestRenderAll();
        };

        if (active && active.type === 'activeSelection') {
          const members = active.getObjects();
          const idx = members.indexOf(target);
          if (idx >= 0) {
            const remaining = members.filter((_, i) => i !== idx);
            canvas.discardActiveObject();
            buildSelection(remaining);
          } else {
            canvas.discardActiveObject();
            buildSelection([...members, target]);
          }
          e.preventDefault?.();
          e.stopPropagation?.();
        } else if (active && active !== target) {
          canvas.discardActiveObject();
          buildSelection([active, target]);
          e.preventDefault?.();
          e.stopPropagation?.();
        }
      });

      // Double-click to enter text edit
      canvas.on('mouse:dblclick', (opt) => {
        const t = opt.target;
        if (!t || t.isLocked) return;
        if (t.type === 'textbox' || t.type === 'i-text' || t.type === 'text') {
          canvas.setActiveObject(t);
          if (t.enterEditing) {
            t.enterEditing();
            if (t.selectAll) t.selectAll();
          }
        }
      });

      // ----------------------------------------------------------------------
      // SHIFT-CONSTRAINED DRAG  (Photoshop-style axis lock)
      //
      // Workflow:
      //   mouse:down on a draggable target → record its starting left/top.
      //   object:moving → if Shift is held, snap motion to the dominant axis
      //                   relative to the recorded start point.
      //   mouse:up → clear state for the next drag.
      //
      // We override `target.left` / `target.top` directly (not via .set())
      // because Fabric's internal move handler has already mutated those
      // values for this frame — we just clamp one of them back to the
      // original value to nullify motion on the locked-out axis.
      // ----------------------------------------------------------------------
      canvas.on('mouse:down', (opt) => {
        const target = opt.target;
        if (!target || target.isLocked) {
          dragLockRef.current.active = false;
          return;
        }
        // Don't engage drag-lock when the user clicks a control handle
        // (resize / rotate); only object body drags qualify.
        if (target.__corner) {
          dragLockRef.current.active = false;
          return;
        }
        dragLockRef.current = {
          active: true,
          startLeft: target.left || 0,
          startTop:  target.top  || 0,
          axis: null,
        };
      });

      canvas.on('object:moving', (opt) => {
        const e = opt.e;
        const target = opt.target;
        if (!target || !dragLockRef.current.active) return;

        if (!e || !e.shiftKey) {
          // Shift released mid-drag → reset axis pin so re-pressing Shift
          // re-evaluates against the up-to-date cursor position.
          dragLockRef.current.axis = null;
          return;
        }

        const dx = (target.left || 0) - dragLockRef.current.startLeft;
        const dy = (target.top  || 0) - dragLockRef.current.startTop;

        // Pin the axis on the first shifted move that exceeds a small dead
        // zone (3 px) so submillimetre jitter doesn't lock the wrong axis.
        if (!dragLockRef.current.axis) {
          if (Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
          dragLockRef.current.axis = Math.abs(dx) >= Math.abs(dy) ? 'x' : 'y';
        }

        if (dragLockRef.current.axis === 'x') {
          // Lock vertical motion → keep top at its starting value.
          target.top = dragLockRef.current.startTop;
        } else {
          // Lock horizontal motion → keep left at its starting value.
          target.left = dragLockRef.current.startLeft;
        }
        target.setCoords();
      });

      canvas.on('mouse:up', () => {
        dragLockRef.current.active = false;
        dragLockRef.current.axis = null;
      });

      emitObjects();
    })();

    return () => {
      mounted = false;
      if (fabricRef.current) {
        try { fabricRef.current.dispose(); } catch {}
        fabricRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    c.setWidth(width);
    c.setHeight(height);
    c.renderAll();
  }, [width, height]);

  useEffect(() => {
    const c = fabricRef.current;
    if (!c) return;
    c.setBackgroundColor(bg, () => c.renderAll());
  }, [bg]);

  // --------------------------------------------------------------------------
  // KEYBOARD NUDGING  (Photoshop-style)
  //
  //   Arrow keys           → 1px in that direction
  //   Shift + Arrow keys   → 10px in that direction
  //
  // Works whenever an object is selected on the canvas, EXCEPT when:
  //   * the user is typing in an <input>/<textarea>/contentEditable element
  //   * the user is mid-text-editing a Fabric Textbox/IText (so arrows still
  //     move the text caret as expected)
  //   * the active object is locked
  //
  // We attach the listener to `window` (the Fabric canvas isn't focusable
  // on its own) and use `e.preventDefault()` so the page doesn't scroll on
  // arrow press while we're nudging.
  // --------------------------------------------------------------------------
  useEffect(() => {
    if (!isReady) return;

    const isFormElement = (el) => {
      if (!el) return false;
      const tag = el.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (el.isContentEditable) return true;
      return false;
    };

    let nudgeHistoryTimer = null;

    const onKeyDown = (e) => {
      const c = fabricRef.current;
      if (!c) return;

      // Bail if focus is in a form control or anything contentEditable —
      // arrow keys there mean "move caret", not "nudge selection".
      if (isFormElement(document.activeElement)) return;

      const obj = c.getActiveObject();
      if (!obj || obj.isLocked) return;

      // If a Fabric textbox is currently in edit mode, let the caret move.
      if (obj.isEditing) return;

      let dx = 0;
      let dy = 0;
      switch (e.key) {
        case 'ArrowLeft':  dx = -1; break;
        case 'ArrowRight': dx =  1; break;
        case 'ArrowUp':    dy = -1; break;
        case 'ArrowDown':  dy =  1; break;
        default: return;
      }

      const step = e.shiftKey ? 10 : 1;
      dx *= step;
      dy *= step;

      e.preventDefault();

      obj.set({
        left: (obj.left || 0) + dx,
        top:  (obj.top  || 0) + dy,
      });
      obj.setCoords();
      c.requestRenderAll();

      // Coalesce rapid key-repeat into a single history entry. A held-down
      // arrow key fires ~30 keydowns/sec; without coalescing we'd burn
      // through the (5-deep) undo stack in under a second. Wait 250ms of
      // quiet before snapshotting.
      if (nudgeHistoryTimer) clearTimeout(nudgeHistoryTimer);
      nudgeHistoryTimer = setTimeout(() => {
        c.fire('object:modified', { target: obj });
        nudgeHistoryTimer = null;
      }, 250);
    };

    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      if (nudgeHistoryTimer) clearTimeout(nudgeHistoryTimer);
    };
  }, [isReady]);

  // --------------------------------------------------------------------------
  // IMPERATIVE API
  // --------------------------------------------------------------------------
  useImperativeHandle(ref, () => ({
    getCanvas: () => fabricRef.current,

    /**
     * Return the IDs of all currently-selected objects as an array.
     *
     * Single selection → [id].
     * Multi-select (Ctrl/Cmd-click) → [id1, id2, ...] for every child of
     *   the active ActiveSelection wrapper.
     * Nothing selected → [].
     *
     * Useful for any consumer that wants to reason about the selection set
     * as a flat list rather than poking at Fabric's wrapper object — e.g.
     * the LayerPanel highlighting all selected rows, or a future "align
     * selected to each other" feature.
     */
    getSelectedIds: () => {
      const c = fabricRef.current;
      if (!c) return [];
      const obj = c.getActiveObject();
      if (!obj) return [];
      if (obj.type === 'activeSelection' && typeof obj.getObjects === 'function') {
        return obj.getObjects().map((o) => o.id).filter(Boolean);
      }
      return obj.id ? [obj.id] : [];
    },

    getObjectById: (id) => {
      const c = fabricRef.current;
      if (!c) return null;
      return c.getObjects().find((o) => o.id === id) || null;
    },

    // TEXT is now Textbox — area-type with auto wrap and manual line breaks.
    addText: async (text = 'New Text', options = {}) => {
      const { fabric } = await import('fabric').then(m => ({ fabric: m.fabric || m.default || m }));
      const c = fabricRef.current;
      if (!c) return;
      const obj = new fabric.Textbox(text, {
        left: options.left ?? c.getWidth() / 2,
        top: options.top ?? c.getHeight() / 2,
        width: options.width ?? 400,      // fixed width → text wraps to fit
        fontSize: options.fontSize ?? 32,
        fontFamily: options.fontFamily ?? 'Playfair Display',
        fill: options.fill ?? '#18120e',
        originX: 'center',
        originY: 'center',
        textAlign: options.textAlign ?? 'center',
        fontWeight: options.fontWeight ?? 400,
        fontStyle: options.fontStyle ?? 'normal',
        splitByGrapheme: true,            // better for mixed scripts incl. Arabic
        ...options,
      });
      obj.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      obj.isLocked = false;
      c.add(obj);
      c.setActiveObject(obj);
      c.renderAll();
      return obj;
    },

    addRect: async (options = {}) => {
      const { fabric } = await import('fabric').then(m => ({ fabric: m.fabric || m.default || m }));
      const c = fabricRef.current;
      if (!c) return;
      const obj = new fabric.Rect({
        left: options.left ?? 100,
        top: options.top ?? 100,
        width: options.width ?? 200,
        height: options.height ?? 100,
        fill: options.fill ?? '#f97316',
        stroke: options.stroke ?? null,
        strokeWidth: options.strokeWidth ?? 0,
        originX: 'left',
        originY: 'top',
        ...options,
      });
      obj.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      obj.isLocked = false;
      c.add(obj);
      c.setActiveObject(obj);
      c.renderAll();
    },

    addCircle: async (options = {}) => {
      const { fabric } = await import('fabric').then(m => ({ fabric: m.fabric || m.default || m }));
      const c = fabricRef.current;
      if (!c) return;
      const obj = new fabric.Circle({
        left: options.left ?? 100,
        top: options.top ?? 100,
        radius: options.radius ?? 50,
        fill: options.fill ?? '#dc2626',
        stroke: options.stroke ?? null,
        strokeWidth: options.strokeWidth ?? 0,
        originX: 'left',
        originY: 'top',
        ...options,
      });
      obj.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      obj.isLocked = false;
      c.add(obj);
      c.setActiveObject(obj);
      c.renderAll();
    },

    addSvg: async (svgString, options = {}) => {
      const mod = await import('fabric');
      const fabric = mod.fabric || mod.default || mod;
      const c = fabricRef.current;
      if (!c) return;
      return new Promise((resolve) => {
        fabric.loadSVGFromString(svgString, (objects, opts) => {
          const obj = fabric.util.groupSVGElements(objects, opts);
          const targetW = options.width || 120;
          const targetH = options.height || 120;
          obj.set({
            left: options.left ?? c.getWidth() / 2 - targetW / 2,
            top: options.top ?? c.getHeight() / 2 - targetH / 2,
            scaleX: targetW / (obj.width || targetW),
            scaleY: targetH / (obj.height || targetH),
            angle: options.angle || 0,
            originX: options.originX || 'left',
            originY: options.originY || 'top',
            centeredRotation: true,
          });
          if (options.fill) {
            const recolor = (o) => {
              if (o._objects) o._objects.forEach(recolor);
              else if (o.set) o.set({ fill: options.fill });
            };
            recolor(obj);
          }
          obj.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          obj.isLocked = false;
          c.add(obj);
          c.setActiveObject(obj);
          c.renderAll();
          resolve(obj);
        });
      });
    },

    // ASPECT-RATIO-PRESERVING images.
    //
    // The image is placed at its natural aspect ratio — no stretching,
    // no distortion, ever. By default we fit it into ~60% of the
    // canvas's smaller dimension (using computeFit's 'contain' mode),
    // which gives users a reasonable starting size for both landscape
    // and portrait images. The user can then freely scale via the 4
    // corner handles (see applyFreeTransform), always proportionally.
    //
    // If the caller explicitly passes `width`, that becomes the longer
    // edge of the placed image — same ratio-preserving rule applies.
    addImage: async (url, options = {}) => {
      const mod = await import('fabric');
      const fabric = mod.fabric || mod.default || mod;
      const c = fabricRef.current;
      if (!c) return;
      return new Promise((resolve) => {
        fabric.Image.fromURL(url, (img) => {
          const naturalW = img.width || 1;
          const naturalH = img.height || 1;

          let scale;
          if (options.width) {
            // Caller-specified: treat `width` as the longer edge target.
            scale = options.width / Math.max(naturalW, naturalH);
          } else {
            // Fit into ~60% of the canvas using 'contain' (longer edge
            // scales to fit; aspect ratio preserved). This makes images
            // feel "full sized" in the canvas without overflowing.
            const boxW = c.getWidth() * 0.6;
            const boxH = c.getHeight() * 0.6;
            const fit = computeFit(naturalW, naturalH, boxW, boxH, 'contain');
            scale = fit.scale;
          }

          const finalW = naturalW * scale;
          const finalH = naturalH * scale;

          img.set({
            left: options.left ?? c.getWidth() / 2 - finalW / 2,
            top: options.top ?? c.getHeight() / 2 - finalH / 2,
            originX: options.originX || 'left',
            originY: options.originY || 'top',
            ...options,
            // Force uniform scale even if `options` passed overrides —
            // images must stay at their natural aspect ratio.
            scaleX: scale,
            scaleY: scale,
          });
          img.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          img.isLocked = false;
          applyFreeTransform(img);
          c.add(img);
          c.setActiveObject(img);
          c.renderAll();
          resolve(img);
        }, { crossOrigin: 'anonymous' });
      });
    },

    addBackgroundImage: async (url) => {
      const mod = await import('fabric');
      const fabric = mod.fabric || mod.default || mod;
      const c = fabricRef.current;
      if (!c) return;
      return new Promise((resolve) => {
        fabric.Image.fromURL(url, (img) => {
          const cw = c.getWidth();
          const ch = c.getHeight();
          const fit = computeBackgroundFit(img.width, img.height, cw, ch, 'cover');
          img.set({
            left: fit.offsetX,
            top: fit.offsetY,
            scaleX: fit.scale,
            scaleY: fit.scale,
            selectable: true,
            originX: 'left',
            originY: 'top',
          });
          img.id = `obj_bg_${Date.now()}`;
          img.isLocked = false;
          applyFreeTransform(img);
          c.add(img);
          c.sendToBack(img);
          c.renderAll();
          resolve(img);
        }, { crossOrigin: 'anonymous' });
      });
    },

    // Hard reset — used by Studio when mode === 'blank'.
    // No seed objects, no default text. Only the background color.
    clearCanvas: (bgColor) => {
      const c = fabricRef.current;
      if (!c) return;
      suspendHistoryRef.current = true;
      c.clear();
      c.setBackgroundColor(bgColor || '#ffffff', () => c.renderAll());
      suspendHistoryRef.current = false;
      historyRef.current = { past: [snapshot()], future: [] };
      emitHistory();
      emitObjects();
    },

    /**
     * Load a template into the canvas.
     *
     * `substitutions` is an OPTIONAL map of LOAD-TIME placeholder values.
     * Currently the Studio supplies `{{brand}}` (← BrandingContext.appTitle)
     * and `{{project_name}}` (← ProjectContext.projectName). These are
     * substituted right here so the user immediately sees their brand /
     * project name on the canvas instead of the literal `{{brand}}` token.
     *
     * The CSV-bulk placeholders (`{{full_name}}`, `{{course_title}}`,
     * `{{date}}`, `{{instructor}}`) are intentionally NOT in this map —
     * those stay as visible tokens until export, where renderWithData
     * substitutes one row at a time. Anything not in the map is left
     * untouched, so adding new load-time placeholders is a one-line
     * change in Studio.js (no schema migration needed).
     */
    loadTemplate: async (template, substitutions = {}) => {
      const mod = await import('fabric');
      const fabric = mod.fabric || mod.default || mod;
      const c = fabricRef.current;
      if (!c) return;

      // Build a single regex from the substitution keys. Compiled once
      // outside the per-element loop so we don't pay regex-construction
      // cost for every text node — most templates have ~15 text elements
      // and this loop is hot during template switches.
      const subKeys = Object.keys(substitutions || {});
      const subRegex = subKeys.length
        ? new RegExp('\\{\\{(' + subKeys.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|') + ')\\}\\}', 'g')
        : null;
      const applySubs = (str) => {
        if (!subRegex || typeof str !== 'string') return str;
        return str.replace(subRegex, (_, k) => substitutions[k] ?? `{{${k}}}`);
      };

      suspendHistoryRef.current = true;
      c.clear();
      c.setBackgroundColor(template.bg || '#ffffff', () => c.renderAll());

      for (const el of template.elements || []) {
        let obj;
        if (el.type === 'text') {
          // Templates authored as IText are loaded as Textbox so they
          // get area-type wrapping for free. width defaults to 600 if
          // the template didn't specify (older templates).
          obj = new fabric.Textbox(applySubs(el.text || ''), {
            left: el.left, top: el.top,
            width: el.width || 600,
            fontSize: el.fontSize ?? 24,
            fontFamily: el.fontFamily ?? 'Playfair Display',
            fill: el.fill ?? '#18120e',
            fontWeight: el.fontWeight ?? 400,
            fontStyle: el.fontStyle ?? 'normal',
            textAlign: el.textAlign ?? 'left',
            charSpacing: el.charSpacing ?? 0,
            originX: el.originX ?? 'left',
            originY: el.originY ?? 'top',
            angle: el.angle || 0,
            splitByGrapheme: true,
          });
          if (el.styles) obj.styles = el.styles;
        } else if (el.type === 'rect') {
          obj = new fabric.Rect({
            left: el.left, top: el.top,
            width: el.width, height: el.height,
            fill: el.fill === 'transparent' ? null : (el.fill ?? '#f97316'),
            stroke: el.stroke,
            strokeWidth: el.strokeWidth ?? 0,
            originX: el.originX ?? 'left',
            originY: el.originY ?? 'top',
            angle: el.angle || 0,
          });
        } else if (el.type === 'circle') {
          obj = new fabric.Circle({
            left: el.left, top: el.top,
            radius: el.radius ?? 50,
            fill: el.fill, stroke: el.stroke,
            strokeWidth: el.strokeWidth ?? 0,
            originX: el.originX ?? 'left',
            originY: el.originY ?? 'top',
            angle: el.angle || 0,
          });
        } else if (el.type === 'svg' && el.svg) {
          // Inline SVG → Fabric group. Used by the new high-end templates
          // for gold flourish corners, geometric accents, and other
          // vector flourishes too involved to express as primitive rects.
          //
          // We loadSVGFromString synchronously-via-promise inside the
          // existing for…of so the for-loop respects element ordering
          // (z-order in the canvas matches template order). Since this
          // path is async, we pre-build a Promise array and await all
          // before rendering — handled by collecting into svgPromises and
          // resolving below.
          //
          // But wait: we're already inside a for-of that doesn't await
          // the existing primitives. To keep the implementation simple
          // and ordering correct, we await the SVG load here and add
          // immediately. That blocks the loop until the SVG is parsed,
          // which keeps z-order deterministic.
          obj = await new Promise((resolve) => {
            fabric.loadSVGFromString(el.svg, (objects, opts) => {
              const group = fabric.util.groupSVGElements(objects, opts);
              const w = el.width  || group.width  || 100;
              const h = el.height || group.height || 100;
              group.set({
                left: el.left ?? 0,
                top:  el.top  ?? 0,
                scaleX: w / (group.width  || w),
                scaleY: h / (group.height || h),
                originX: el.originX ?? 'left',
                originY: el.originY ?? 'top',
                angle: el.angle || 0,
              });
              if (el.fill) {
                // Recolour every leaf path with the supplied fill so the
                // template author can shift hue centrally rather than
                // editing the SVG strings themselves.
                const recolour = (o) => {
                  if (o._objects) o._objects.forEach(recolour);
                  else if (o.set) o.set({ fill: el.fill });
                };
                recolour(group);
              }
              resolve(group);
            });
          });
        }
        if (obj) {
          obj.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
          applyLockState(obj, !!el.isLocked);
          c.add(obj);
        }
      }
      c.renderAll();
      suspendHistoryRef.current = false;
      historyRef.current = { past: [snapshot()], future: [] };
      emitHistory();
      emitObjects();
    },

    setBackgroundColor: (color) => {
      const c = fabricRef.current;
      if (!c) return;
      c.setBackgroundColor(color, () => c.renderAll());
      pushHistory();
    },

    setDimensions: (w, h) => {
      const c = fabricRef.current;
      if (!c) return;
      c.setWidth(w);
      c.setHeight(h);
      c.renderAll();
    },

    /**
     * Compute the zoom factor that fits the entire canvas into the given
     * container rect. Pure math, no side effects — Studio applies the
     * result by setting its own zoom state. Defers to getWorkspaceFitScale
     * so the math stays in one place (WorkspaceBackground.js owns it).
     *
     * Returns null if no canvas is mounted.
     */
    fitToScreen: (containerRect, opts) => {
      const c = fabricRef.current;
      if (!c) return null;
      return getWorkspaceFitScale(
        containerRect,
        c.getWidth(),
        c.getHeight(),
        opts,
      );
    },

    deleteSelected: () => {
      const c = fabricRef.current;
      if (!c) return;
      const obj = c.getActiveObject();
      if (!obj) return;

      // ActiveSelection: Fabric wraps the children in a transient object;
      // calling c.remove(activeSelection) removes the wrapper but leaves
      // the children on the canvas. Iterate the children explicitly,
      // skipping any that are individually locked.
      if (obj.type === 'activeSelection' && typeof obj.getObjects === 'function') {
        const children = obj.getObjects().filter((child) => !child.isLocked);
        if (children.length === 0) return;

        // Suspend per-child history so the bulk delete lands as ONE undo
        // step rather than N. We re-emit at the end.
        suspendHistoryRef.current = true;
        c.discardActiveObject();
        children.forEach((child) => c.remove(child));
        suspendHistoryRef.current = false;

        c.requestRenderAll();
        pushHistory();
        emitObjects();
        return;
      }

      if (obj.isLocked) return;
      c.remove(obj);
      c.discardActiveObject();
      c.renderAll();
    },

    duplicateSelected: () => {
      const c = fabricRef.current;
      if (!c) return;
      const obj = c.getActiveObject();
      if (!obj || obj.isLocked) return;
      obj.clone((clone) => {
        clone.set({ left: (obj.left || 0) + 20, top: (obj.top || 0) + 20 });
        clone.id = `obj_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        clone.isLocked = false;
        if (clone.type === 'image') applyFreeTransform(clone);
        c.add(clone);
        c.setActiveObject(clone);
        c.renderAll();
      }, EXTRA_PROPS);
    },

    bringForward: () => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getActiveObject();
      if (obj && !obj.isLocked) { c.bringForward(obj); pushHistory(); emitObjects(); }
    },
    sendBackward: () => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getActiveObject();
      if (obj && !obj.isLocked) { c.sendBackwards(obj); pushHistory(); emitObjects(); }
    },
    bringToFront: () => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getActiveObject();
      if (obj && !obj.isLocked) { c.bringToFront(obj); pushHistory(); emitObjects(); }
    },
    sendToBack: () => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getActiveObject();
      if (obj && !obj.isLocked) { c.sendToBack(obj); pushHistory(); emitObjects(); }
    },

    reorderObjects: (newOrder) => {
      const c = fabricRef.current; if (!c) return;
      const byId = {};
      c.getObjects().forEach(o => { byId[o.id] = o; });
      newOrder.forEach((id, idx) => {
        const obj = byId[id];
        if (!obj) return;
        c.moveTo(obj, idx);
      });
      c.renderAll();
      pushHistory();
      emitObjects();
    },

    selectObject: (id) => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getObjects().find(o => o.id === id);
      if (obj && !obj.isLocked) {
        c.setActiveObject(obj);
        c.renderAll();
      }
    },

    // LOCK API
    setLocked: (id, locked) => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getObjects().find(o => o.id === id);
      if (!obj) return;
      applyLockState(obj, locked);
      if (locked && c.getActiveObject() === obj) c.discardActiveObject();
      c.requestRenderAll();
      pushHistory();
      emitObjects();
    },

    toggleLocked: (id) => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getObjects().find(o => o.id === id);
      if (!obj) return;
      applyLockState(obj, !obj.isLocked);
      if (obj.isLocked && c.getActiveObject() === obj) c.discardActiveObject();
      c.requestRenderAll();
      pushHistory();
      emitObjects();
    },

    // TEXT EDIT API — used by the DOM overlay to start/stop live editing
    enterTextEdit: (id) => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getObjects().find(o => o.id === id);
      if (!obj || obj.isLocked) return;
      if (obj.type === 'textbox' || obj.type === 'i-text') {
        c.setActiveObject(obj);
        obj.enterEditing?.();
        obj.selectAll?.();
      }
    },
    exitTextEdit: () => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getActiveObject();
      if (obj?.exitEditing) obj.exitEditing();
    },

    // RICH TEXT API
    applyRichText: (id, { text, styles, richText, width }) => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getObjects().find(o => o.id === id);
      if (!obj) return;
      if (obj.type !== 'textbox' && obj.type !== 'i-text' && obj.type !== 'text') return;
      const patch = {};
      if (text != null) patch.text = text;
      if (width != null) patch.width = width;
      if (Object.keys(patch).length) obj.set(patch);
      obj.styles = styles || {};
      obj.richText = richText || null;
      obj.dirty = true;
      obj.setCoords();
      c.requestRenderAll();
      pushHistory();
      emitObjects();
    },

    undo: () => {
      const h = historyRef.current;
      const c = fabricRef.current;
      if (!c || h.past.length <= 1) return;
      const current = h.past.pop();
      h.future.unshift(current);
      if (h.future.length > 5) h.future.pop();
      const prev = h.past[h.past.length - 1];
      suspendHistoryRef.current = true;
      c.loadFromJSON(prev, () => {
        c.getObjects().forEach((o) => {
          if (o.type === 'image') applyFreeTransform(o);
          applyLockState(o, !!o.isLocked);
        });
        c.renderAll();
        suspendHistoryRef.current = false;
        emitHistory();
        emitObjects();
      });
    },

    redo: () => {
      const h = historyRef.current;
      const c = fabricRef.current;
      if (!c || h.future.length === 0) return;
      const next = h.future.shift();
      h.past.push(next);
      if (h.past.length > 5) h.past.shift();
      suspendHistoryRef.current = true;
      c.loadFromJSON(next, () => {
        c.getObjects().forEach((o) => {
          if (o.type === 'image') applyFreeTransform(o);
          applyLockState(o, !!o.isLocked);
        });
        c.renderAll();
        suspendHistoryRef.current = false;
        emitHistory();
        emitObjects();
      });
    },

    updateSelected: (patch) => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getActiveObject();
      if (!obj || obj.isLocked) return;

      const COLOR_KEYS = ['fill', 'stroke', 'strokeWidth'];
      const hasColorPatch = COLOR_KEYS.some((k) => k in patch);
      const applyToObject = (target, p) => {
        const normalized = { ...p };
        if ('fill' in normalized && (normalized.fill === null || normalized.fill === 'none')) normalized.fill = '';
        if ('stroke' in normalized && (normalized.stroke === null || normalized.stroke === 'none')) normalized.stroke = '';
        target.set(normalized);
      };

      if (hasColorPatch && (obj.type === 'group' || obj._objects)) {
        const colorPatch = {};
        const otherPatch = {};
        Object.keys(patch).forEach((k) => {
          if (COLOR_KEYS.includes(k)) colorPatch[k] = patch[k];
          else otherPatch[k] = patch[k];
        });
        const recurse = (g) => {
          if (g._objects && g._objects.length) {
            g._objects.forEach((child) => { recurse(child); applyToObject(child, colorPatch); });
          }
        };
        recurse(obj);
        if (Object.keys(otherPatch).length) applyToObject(obj, otherPatch);
        applyToObject(obj, colorPatch);
      } else {
        applyToObject(obj, patch);
      }

      obj.setCoords();
      obj.dirty = true;
      c.requestRenderAll();
      pushHistory();
    },

    /**
     * Align the active selection relative to the canvas bounds.
     *
     * edge:
     *   'left'   → pins the selection's left edge to canvas left (x = 0)
     *   'center' → horizontal center of selection = canvas center
     *   'right'  → pins the selection's right edge to canvas right
     *   'top'    → pins the selection's top edge to canvas top (y = 0)
     *   'middle' → vertical center of selection = canvas center
     *   'bottom' → pins the selection's bottom edge to canvas bottom
     *
     * Works for single objects, groups, and active multi-selections. For
     * an activeSelection, the whole group is shifted — individual members
     * keep their relative positions. Locked objects are ignored (we never
     * move a locked element).
     *
     * We use Fabric's bounding rect (which accounts for scale and rotation)
     * via getBoundingRect(true, true) so diagonal-rotated objects still
     * align visually against the canvas edge the user sees, not their
     * unrotated AABB.
     */
    alignSelected: (edge) => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getActiveObject();
      if (!obj || obj.isLocked) return;

      const cw = c.getWidth();
      const ch = c.getHeight();
      const bounds = obj.getBoundingRect(true, true);

      let dx = 0;
      let dy = 0;
      switch (edge) {
        case 'left':   dx = 0 - bounds.left; break;
        case 'center': dx = (cw - bounds.width) / 2 - bounds.left; break;
        case 'right':  dx = cw - (bounds.left + bounds.width); break;
        case 'top':    dy = 0 - bounds.top; break;
        case 'middle': dy = (ch - bounds.height) / 2 - bounds.top; break;
        case 'bottom': dy = ch - (bounds.top + bounds.height); break;
        default: return;
      }

      obj.set({
        left: (obj.left || 0) + dx,
        top:  (obj.top  || 0) + dy,
      });
      obj.setCoords();
      c.requestRenderAll();
      pushHistory();
      emitObjects();
    },

    /**
     * Flip the active selection across the given axis ('horizontal' | 'vertical').
     * Toggles the corresponding `flipX` / `flipY` Fabric prop in place — Fabric
     * mirrors the object at render time without altering its left/top/width/
     * height bounds, so layer order, alignment, and dimensions all remain
     * stable. Locked objects are ignored. Persists through undo/redo because
     * Fabric serializes flipX/flipY by default in toJSON().
     */
    flipSelected: (axis) => {
      const c = fabricRef.current; if (!c) return;
      const obj = c.getActiveObject();
      if (!obj || obj.isLocked) return;

      const key = FLIP_KEYS[axis];
      if (!key) return;

      // For an active multi-selection, flip each child individually so each
      // element mirrors about its own center, matching the Photoshop / Figma
      // expectation. (Toggling on the ActiveSelection wrapper alone would
      // mirror the whole group as a unit, which is rarely what you want.)
      if (obj.type === 'activeSelection' && typeof obj.forEachObject === 'function') {
        obj.forEachObject((child) => {
          if (!child.isLocked) toggleFlip(child, axis);
        });
      } else {
        toggleFlip(obj, axis);
      }

      obj.setCoords();
      obj.dirty = true;
      c.requestRenderAll();
      pushHistory();
      emitObjects();
    },

    /**
     * Export the canvas as a PNG data URL at `multiplier`× the canvas's
     * intrinsic pixel size. Re-applies the high-quality rendering hint
     * before each export — Fabric's `toDataURL` builds a fresh offscreen
     * canvas internally, but inheriting smoothing from the source context
     * works on every browser we support.
     *
     *   1× → as-authored, no upscale
     *   2× → 4× the pixel area (default; matches the previous behaviour)
     *   3× → 9× the pixel area
     *   4× → 16× the pixel area (best for poster-size print)
     */
    exportPNG: (multiplier = 2) => {
      const c = fabricRef.current; if (!c) return null;
      configureHighQualityRendering(c);
      c.discardActiveObject();
      c.renderAll();
      return c.toDataURL({ format: 'png', multiplier });
    },

    renderWithData: async (rowData, multiplier = 2) => {
      const c = fabricRef.current; if (!c) return null;
      configureHighQualityRendering(c);
      const originals = [];
      c.getObjects().forEach(obj => {
        if ((obj.type === 'textbox' || obj.type === 'i-text' || obj.type === 'text') && obj.text) {
          originals.push({ obj, text: obj.text });
          const replaced = obj.text.replace(/\{\{(\w+)\}\}/g, (_, k) => rowData[k] ?? `{{${k}}}`);
          obj.set('text', replaced);
        }
      });
      c.discardActiveObject();
      c.renderAll();
      const dataUrl = c.toDataURL({ format: 'png', multiplier });
      originals.forEach(({ obj, text }) => obj.set('text', text));
      c.renderAll();
      return dataUrl;
    },

    saveAsTemplate: () => {
      const c = fabricRef.current; if (!c) return null;
      return {
        bg: c.backgroundColor,
        width: c.getWidth(),
        height: c.getHeight(),
        canvas: c.toJSON(EXTRA_PROPS),
      };
    },

    loadFromTemplate: (tpl) => {
      const c = fabricRef.current; if (!c) return;
      suspendHistoryRef.current = true;
      if (tpl.width && tpl.height) {
        c.setWidth(tpl.width);
        c.setHeight(tpl.height);
      }
      c.loadFromJSON(tpl.canvas, () => {
        c.setBackgroundColor(tpl.bg || '#ffffff', () => c.renderAll());
        c.getObjects().forEach((o) => {
          if (o.type === 'image') applyFreeTransform(o);
          applyLockState(o, !!o.isLocked);
        });
        suspendHistoryRef.current = false;
        historyRef.current = { past: [snapshot()], future: [] };
        emitHistory();
        emitObjects();
      });
    },
  }), [pushHistory, snapshot, emitHistory, emitObjects]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, boxShadow: '0 30px 80px rgba(0,0,0,0.55)' }}>
      <canvas ref={canvasElRef} />
    </div>
  );
});

export default Canvas;
