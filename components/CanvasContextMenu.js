'use client';

import { useEffect, useRef } from 'react';
import { Copy, Clipboard, MousePointer2 } from 'lucide-react';

/**
 * CanvasContextMenu.js
 *
 * Custom right-click menu surfaced by Studio when the user right-clicks
 * anywhere on the canvas area. Items:
 *
 *   Copy       — if a textbox is actively being edited, copies the current
 *                selection from the textbox to the system clipboard; if a
 *                non-editing object is selected, duplicates it (the design-
 *                tool analog of "copy") and places it at +20/+20 offset;
 *                otherwise disabled.
 *   Paste      — if a textbox is actively being edited, pastes plain text
 *                at the caret; otherwise pastes clipboard text as a new
 *                Textbox at the menu's origin position.
 *   Select All — if a textbox is actively being edited, selects all its
 *                characters; otherwise selects every unlocked object on
 *                the canvas as a single ActiveSelection.
 *
 * The menu auto-dismisses on outside click, Escape, scroll, or any action
 * taken from within it. Positioning is viewport-fixed (left/top in px).
 *
 * Props:
 *  - x, y         : viewport coordinates (pageX/pageY)
 *  - canvasRef    : imperative canvas ref from Studio
 *  - editingText  : the Fabric Textbox currently in edit mode, or null
 *  - onClose      : () => void
 *  - canvasPos    : { x, y } — right-click position in CANVAS coordinates
 *                   (used as the drop target for pasted text blocks)
 */
export default function CanvasContextMenu({
  x, y, canvasRef, editingText, onClose, canvasPos,
}) {
  const rootRef = useRef(null);

  // Outside-click / Escape / scroll handlers. We attach on next tick so
  // the same mousedown event that opened the menu doesn't immediately
  // close it.
  useEffect(() => {
    const tid = setTimeout(() => {
      const onDocMouseDown = (e) => {
        if (!rootRef.current) return;
        if (!rootRef.current.contains(e.target)) onClose();
      };
      const onKey = (e) => { if (e.key === 'Escape') onClose(); };
      const onScroll = () => onClose();
      document.addEventListener('mousedown', onDocMouseDown);
      document.addEventListener('keydown', onKey);
      window.addEventListener('scroll', onScroll, true);
      rootRef.current._cleanup = () => {
        document.removeEventListener('mousedown', onDocMouseDown);
        document.removeEventListener('keydown', onKey);
        window.removeEventListener('scroll', onScroll, true);
      };
    }, 0);
    return () => {
      clearTimeout(tid);
      if (rootRef.current?._cleanup) rootRef.current._cleanup();
    };
  }, [onClose]);

  // Determine what Copy / Paste / Select All should do in the current
  // context, and whether each item should be enabled.
  const isEditingText = !!(editingText && editingText.isEditing);
  const c = canvasRef.current?.getCanvas?.();
  const active = c?.getActiveObject?.();
  const hasSelection = !!active && !active.isLocked;
  const hasAnyUnlocked = c ? c.getObjects().some((o) => !o.isLocked) : false;

  const copyEnabled = isEditingText ? true : hasSelection;
  const selectAllEnabled = isEditingText ? true : hasAnyUnlocked;

  const handleCopy = async () => {
    try {
      if (isEditingText) {
        // Copy the selected substring from the textbox's internal caret
        // selection. Fabric Textbox tracks selectionStart/selectionEnd.
        const t = editingText;
        const start = t.selectionStart ?? 0;
        const end = t.selectionEnd ?? 0;
        const text = (t.text || '').slice(start, end);
        if (text && navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
        }
      } else {
        // Design-tool "copy" = duplicate on the canvas.
        canvasRef.current?.duplicateSelected();
      }
    } catch (err) {
      // Clipboard blocked by browser policy — silent fail is fine for a
      // design app; the user can still Ctrl+C manually.
      console.warn('Clipboard copy failed:', err);
    }
    onClose();
  };

  const handlePaste = async () => {
    try {
      if (!navigator.clipboard?.readText) { onClose(); return; }
      const text = await navigator.clipboard.readText();
      if (!text) { onClose(); return; }

      if (isEditingText) {
        // Insert at caret inside the textbox.
        const t = editingText;
        const start = t.selectionStart ?? 0;
        const end = t.selectionEnd ?? start;
        const current = t.text || '';
        const next = current.slice(0, start) + text + current.slice(end);
        t.set('text', next);
        // Move caret past the inserted text.
        const newCaret = start + text.length;
        t.selectionStart = newCaret;
        t.selectionEnd = newCaret;
        t.dirty = true;
        t.canvas?.requestRenderAll();
      } else {
        // Drop a new Textbox at the right-click position on the canvas.
        canvasRef.current?.addText(text, {
          left: canvasPos?.x ?? 100,
          top:  canvasPos?.y ?? 100,
          originX: 'left',
          originY: 'top',
          width: 400,
        });
      }
    } catch (err) {
      console.warn('Clipboard paste failed:', err);
    }
    onClose();
  };

  const handleSelectAll = () => {
    if (isEditingText) {
      const t = editingText;
      t.selectionStart = 0;
      t.selectionEnd = (t.text || '').length;
      t.canvas?.requestRenderAll();
    } else {
      // Select every unlocked object on the canvas.
      const cv = canvasRef.current?.getCanvas?.();
      if (cv) {
        // Using a dynamic import here would be async; instead we access
        // the fabric namespace through an existing object on the canvas,
        // which is the pattern the rest of the codebase uses too.
        import('fabric').then((mod) => {
          const fabric = mod.fabric || mod.default || mod;
          const all = cv.getObjects().filter((o) => !o.isLocked);
          if (all.length === 0) return;
          cv.discardActiveObject();
          if (all.length === 1) {
            cv.setActiveObject(all[0]);
          } else {
            const sel = new fabric.ActiveSelection(all, { canvas: cv });
            cv.setActiveObject(sel);
          }
          cv.requestRenderAll();
        });
      }
    }
    onClose();
  };

  // Clamp the menu so it never overflows the right / bottom viewport edge.
  const MENU_W = 200;
  const MENU_H = 160;
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1600;
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900;
  const left = Math.min(x, vw - MENU_W - 4);
  const top = Math.min(y, vh - MENU_H - 4);

  const itemBase = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '9px 12px',
    background: 'transparent',
    border: 'none',
    color: '#f5efe4',
    fontFamily: 'var(--font-body)',
    fontSize: 13,
    cursor: 'pointer',
    textAlign: 'left',
    borderRadius: 6,
  };
  const kbdStyle = {
    marginLeft: 'auto',
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    letterSpacing: '0.1em',
    color: 'rgba(245, 239, 228, 0.45)',
  };

  const MenuItem = ({ icon: Icon, label, shortcut, onClick, disabled }) => (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        ...itemBase,
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.background = '#2a1f18'; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
    >
      <Icon size={14} strokeWidth={1.75} style={{ color: '#fb923c' }} />
      <span>{label}</span>
      <span style={kbdStyle}>{shortcut}</span>
    </button>
  );

  return (
    <div
      ref={rootRef}
      role="menu"
      style={{
        position: 'fixed',
        left,
        top,
        width: MENU_W,
        zIndex: 9999,
        background: '#1f1814',
        border: '1px solid #3a2a20',
        borderRadius: 10,
        padding: 6,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(249, 115, 22, 0.08)',
        backdropFilter: 'blur(6px)',
      }}
      // Stop propagation so clicks inside the menu don't get caught by the
      // outside-click listener installed in useEffect.
      onMouseDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      <MenuItem
        icon={Copy}
        label="Copy"
        shortcut="Ctrl+C"
        onClick={handleCopy}
        disabled={!copyEnabled}
      />
      <MenuItem
        icon={Clipboard}
        label="Paste"
        shortcut="Ctrl+V"
        onClick={handlePaste}
        disabled={false /* always try; clipboard availability handled in handler */}
      />
      <div style={{ height: 1, background: '#2a1f18', margin: '4px 6px' }} />
      <MenuItem
        icon={MousePointer2}
        label="Select All"
        shortcut="Ctrl+A"
        onClick={handleSelectAll}
        disabled={!selectAllEnabled}
      />
    </div>
  );
}
