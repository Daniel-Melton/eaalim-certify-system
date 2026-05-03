'use client';

import { useEffect, useState } from 'react';
import {
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight,
  Copy, Trash2, ArrowUp, ArrowDown, ChevronsUp, ChevronsDown,
  Lock, Unlock, Pencil,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  FlipHorizontal, FlipVertical,
} from 'lucide-react';
import { useCustomFonts } from '@/lib/customFontsContext';

/**
 * ContextualToolbar.js
 *
 * Context-aware horizontal ribbon. When a text object is selected, a
 * "Rich Text" button appears — click it to open the RichTextOverlay for
 * MS-Word-style per-character formatting (bold/italic/underline/color on
 * individual words or characters).
 *
 * A Lock toggle is always shown on the right, for every selectable object.
 * When the object is locked, every OTHER control in the ribbon is disabled
 * (the lock toggle itself stays enabled so the user can unlock).
 *
 * Props:
 *  - selected      : Fabric object (or null)
 *  - canvasRef     : imperative canvas ref
 *  - onOpenRichText: () => void (opens the RichTextOverlay from parent)
 */

const ENGLISH_FONTS = [
  'Playfair Display', 'Fraunces', 'Cormorant Garamond', 'Montserrat', 'Inter', 'JetBrains Mono',
];
const SIGNATURE_FONTS = [
  'Great Vibes', 'Alex Brush', 'Pinyon Script', 'Parisienne', 'Dancing Script',
];

export default function ContextualToolbar({ selected, canvasRef, onOpenRichText }) {
  const [draft, setDraft] = useState({});
  const { fonts: customFonts } = useCustomFonts();

  useEffect(() => {
    if (!selected) { setDraft({}); return; }

    const firstLeaf = (obj) => {
      if (!obj) return null;
      if (obj._objects && obj._objects.length) return firstLeaf(obj._objects[0]);
      return obj;
    };
    const src = (selected.type === 'group' && selected._objects?.length)
      ? firstLeaf(selected)
      : selected;

    setDraft({
      fontSize: selected.fontSize,
      fontFamily: selected.fontFamily,
      fill: src.fill,
      stroke: src.stroke,
      strokeWidth: src.strokeWidth,
      fontWeight: selected.fontWeight,
      fontStyle: selected.fontStyle,
      underline: selected.underline,
      textAlign: selected.textAlign,
      charSpacing: selected.charSpacing,
      opacity: selected.opacity ?? 1,
      isLocked: !!selected.isLocked,
      flipX: !!selected.flipX,
      flipY: !!selected.flipY,
    });
  }, [selected]);

  const apply = (patch) => {
    setDraft((d) => ({ ...d, ...patch }));
    canvasRef.current?.updateSelected(patch);
  };

  const toggleLock = () => {
    if (!selected) return;
    // Multi-select: lock/unlock every child individually. Decide direction
    // based on the majority — if any child is currently unlocked, lock all;
    // otherwise unlock all. (Mixed states resolve to "lock all" first,
    // which matches the expectation of someone reaching for the lock
    // toggle on a mixed selection.)
    if (selected.type === 'activeSelection' && typeof selected.getObjects === 'function') {
      const children = selected.getObjects();
      const anyUnlocked = children.some((c) => !c.isLocked);
      const target = anyUnlocked; // true => lock all, false => unlock all
      children.forEach((c) => {
        if (c.id) canvasRef.current?.setLocked?.(c.id, target);
      });
      return;
    }
    if (!selected.id) return;
    canvasRef.current?.toggleLocked(selected.id);
  };

  // Empty toolbar when nothing is selected
  if (!selected) {
    return (
      <div className="ribbon-top">
        <span className="section-label">READY</span>
        <span className="ribbon-sep" />
        <span className="text-xs text-ember-50/40">
          Select an element to edit its properties · Double-click text to edit inline
        </span>
      </div>
    );
  }

  const type = selected.type;
  const isMulti = type === 'activeSelection';
  const multiCount = isMulti && typeof selected.getObjects === 'function'
    ? selected.getObjects().length
    : 0;
  // Type checks intentionally evaluate to false for activeSelection — we
  // don't render text/shape controls for a heterogeneous selection. The
  // user can still flip, align, duplicate, delete, and adjust opacity for
  // the whole group, plus any z-order action.
  const isText = !isMulti && (type === 'i-text' || type === 'textbox' || type === 'text');
  const isShape = !isMulti && (type === 'rect' || type === 'circle' || type === 'triangle' || type === 'polygon');
  const isVector = !isMulti && (type === 'path' || type === 'group');
  const isImage = !isMulti && type === 'image';
  const locked = !!draft.isLocked;

  // Shorthand: wrap a disabled-when-locked prop helper
  const disabledCls = locked ? 'opacity-40 pointer-events-none' : '';

  return (
    <div className="ribbon-top">
      <span className="section-label">
        {isMulti
          ? <>MULTI <span className="ml-1 text-ember-400">· {multiCount} SELECTED</span></>
          : (isText ? 'TEXT' : isShape ? 'SHAPE' : isVector ? 'VECTOR' : isImage ? 'IMAGE' : 'OBJECT')}
        {locked && !isMulti && <span className="ml-1 text-ember-400">· LOCKED</span>}
      </span>
      <span className="ribbon-sep" />

      {/* Multi-select hint — explains what's available so the user doesn't
          search for type-specific controls that have intentionally been
          stripped. Sits in place of the per-type editing block. */}
      {isMulti && (
        <span className="text-xs text-ember-50/60">
          Move, flip, align, duplicate, or delete the whole selection — Ctrl/Cmd-click an item to remove it from the set.
        </span>
      )}
      {/* Text-specific controls */}
      {isText && (
        <div className={`flex items-center gap-1 ${disabledCls}`}>
          <select
            value={draft.fontFamily || 'Playfair Display'}
            onChange={(e) => apply({ fontFamily: e.target.value })}
            className="input-field"
            style={{ minWidth: 160 }}
          >
            <optgroup label="— Serif —">
              {ENGLISH_FONTS.filter((f) => ['Playfair Display', 'Fraunces', 'Cormorant Garamond'].includes(f)).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </optgroup>
            <optgroup label="— Sans —">
              <option value="Montserrat">Montserrat</option>
              <option value="Inter">Inter</option>
              <option value="JetBrains Mono">JetBrains Mono</option>
            </optgroup>
            <optgroup label="— Arabic —">
              <option value="Cairo">Cairo</option>
              <option value="Amiri">Amiri</option>
            </optgroup>
            <optgroup label="— Signature —">
              {SIGNATURE_FONTS.map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </optgroup>
            {customFonts.length > 0 && (
              <optgroup label="— Your Fonts —">
                {customFonts.map((f) => (
                  <option key={f.family} value={f.family}>{f.family}</option>
                ))}
              </optgroup>
            )}
          </select>

          <input
            type="number"
            value={draft.fontSize || 24}
            onChange={(e) => apply({ fontSize: parseInt(e.target.value) || 12 })}
            className="input-field"
            style={{ width: 64 }}
            min="6"
            max="400"
          />

          <span className="ribbon-sep" />

          <button
            className={`tool-btn ${draft.fontWeight >= 600 ? 'active' : ''}`}
            onClick={() => apply({ fontWeight: draft.fontWeight >= 600 ? 400 : 700 })}
            title="Bold"
          >
            <Bold size={14} />
          </button>
          <button
            className={`tool-btn ${draft.fontStyle === 'italic' ? 'active' : ''}`}
            onClick={() => apply({ fontStyle: draft.fontStyle === 'italic' ? 'normal' : 'italic' })}
            title="Italic"
          >
            <Italic size={14} />
          </button>
          <button
            className={`tool-btn ${draft.underline ? 'active' : ''}`}
            onClick={() => apply({ underline: !draft.underline })}
            title="Underline"
          >
            <Underline size={14} />
          </button>

          <span className="ribbon-sep" />

          {[
            { v: 'left', I: AlignLeft },
            { v: 'center', I: AlignCenter },
            { v: 'right', I: AlignRight },
          ].map((a) => (
            <button
              key={a.v}
              className={`tool-btn ${draft.textAlign === a.v ? 'active' : ''}`}
              onClick={() => apply({ textAlign: a.v })}
              title={a.v}
            >
              <a.I size={14} />
            </button>
          ))}

          <span className="ribbon-sep" />

          <label className="text-[10px] font-mono tracking-widest uppercase text-ember-50/50">
            Color
          </label>
          <input
            type="color"
            value={typeof draft.fill === 'string' ? draft.fill : '#18120e'}
            onChange={(e) => apply({ fill: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
          />

          <span className="ribbon-sep" />

          <label className="text-[10px] font-mono tracking-widest uppercase text-ember-50/50">
            Spacing
          </label>
          <input
            type="number"
            value={draft.charSpacing || 0}
            onChange={(e) => apply({ charSpacing: parseInt(e.target.value) || 0 })}
            className="input-field"
            style={{ width: 72 }}
            step="50"
          />

          <span className="ribbon-sep" />

          {/* Rich Text editor — the key new UI hook for requirement #3.
             Ignores the disabled wrapper via e.stopPropagation on click
             isn't needed because this whole block is already gated by
             `locked`; if the object is locked, the whole text group is
             pointer-events:none and the user can't click this button. */}
          <button
            className="tool-btn"
            onClick={() => onOpenRichText && onOpenRichText()}
            title="Open rich text editor — format individual words or characters"
            style={{
              background: 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(249,115,22,0.15))',
              border: '1px solid rgba(249,115,22,0.4)',
              color: '#fed7aa',
            }}
          >
            <Pencil size={13} />
            Rich Text
          </button>
        </div>
      )}

      {/* Shape / vector controls */}
      {(isShape || isVector) && (
        <div className={`flex items-center gap-1 ${disabledCls}`}>
          <label className="text-[10px] font-mono tracking-widest uppercase text-ember-50/50">
            Fill
          </label>
          <input
            type="color"
            value={(typeof draft.fill === 'string' && draft.fill) ? draft.fill : '#f97316'}
            onChange={(e) => apply({ fill: e.target.value })}
            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
          />
          <button
            className={`tool-btn ${(!draft.fill || draft.fill === '' || draft.fill === null) ? 'active' : ''}`}
            onClick={() => apply({ fill: '' })}
            title="No fill (transparent)"
          >
            None
          </button>

          <span className="ribbon-sep" />

          <label className="text-[10px] font-mono tracking-widest uppercase text-ember-50/50">
            Stroke
          </label>
          <input
            type="color"
            value={(typeof draft.stroke === 'string' && draft.stroke) ? draft.stroke : '#18120e'}
            onChange={(e) => apply({ stroke: e.target.value, strokeWidth: draft.strokeWidth || 1 })}
            className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
          />
          <button
            className={`tool-btn ${(!draft.stroke || draft.stroke === '' || draft.stroke === null) ? 'active' : ''}`}
            onClick={() => apply({ stroke: '', strokeWidth: 0 })}
            title="No stroke"
          >
            None
          </button>
          <input
            type="number"
            value={draft.strokeWidth || 0}
            onChange={(e) => apply({ strokeWidth: parseInt(e.target.value) || 0 })}
            className="input-field"
            style={{ width: 60 }}
            min="0"
            max="50"
          />
        </div>
      )}

      {/* Canvas-alignment controls — available for every non-text object
          (shapes, vectors, images). Aligns the selection's bounding box to
          the canvas edge indicated by each icon. Disabled while the object
          is locked. Left / center / right = horizontal; top / middle /
          bottom = vertical. */}
      {(isShape || isVector || isImage || isMulti) && (
        <>
          <span className="ribbon-sep" />
          <div className={`flex items-center gap-1 ${disabledCls}`}>
            <label className="text-[10px] font-mono tracking-widest uppercase text-ember-50/50 mr-1">
              Align
            </label>
            <button
              className="tool-btn"
              onClick={() => canvasRef.current?.alignSelected('left')}
              title="Align left to canvas"
            >
              <AlignStartVertical size={14} />
            </button>
            <button
              className="tool-btn"
              onClick={() => canvasRef.current?.alignSelected('center')}
              title="Align horizontal center to canvas"
            >
              <AlignCenterVertical size={14} />
            </button>
            <button
              className="tool-btn"
              onClick={() => canvasRef.current?.alignSelected('right')}
              title="Align right to canvas"
            >
              <AlignEndVertical size={14} />
            </button>
            <span className="ribbon-sep" />
            <button
              className="tool-btn"
              onClick={() => canvasRef.current?.alignSelected('top')}
              title="Align top to canvas"
            >
              <AlignStartHorizontal size={14} />
            </button>
            <button
              className="tool-btn"
              onClick={() => canvasRef.current?.alignSelected('middle')}
              title="Align vertical middle to canvas"
            >
              <AlignCenterHorizontal size={14} />
            </button>
            <button
              className="tool-btn"
              onClick={() => canvasRef.current?.alignSelected('bottom')}
              title="Align bottom to canvas"
            >
              <AlignEndHorizontal size={14} />
            </button>
          </div>

          {/* FLIP — horizontal / vertical mirror. Toggles Fabric's flipX /
              flipY props via canvasRef.flipSelected; bounds and z-order
              are preserved. Available for shapes, vectors, and images
              (text intentionally excluded — mirrored letters read as
              gibberish in almost every realistic use case). The
              `active` style reflects the current flip state so users
              can see at a glance which axes are flipped. We mirror the
              flip into local `draft` state on click so the active style
              updates immediately — Fabric mutates the object in place,
              so React would otherwise have no signal to re-render. */}
          <span className="ribbon-sep" />
          <div className={`flex items-center gap-1 ${disabledCls}`}>
            <label className="text-[10px] font-mono tracking-widest uppercase text-ember-50/50 mr-1">
              Flip
            </label>
            <button
              className={`tool-btn ${!isMulti && draft.flipX ? 'active' : ''}`}
              onClick={() => {
                canvasRef.current?.flipSelected('horizontal');
                if (!isMulti) setDraft((d) => ({ ...d, flipX: !d.flipX }));
              }}
              title="Flip horizontal (mirror left-right)"
            >
              <FlipHorizontal size={14} />
            </button>
            <button
              className={`tool-btn ${!isMulti && draft.flipY ? 'active' : ''}`}
              onClick={() => {
                canvasRef.current?.flipSelected('vertical');
                if (!isMulti) setDraft((d) => ({ ...d, flipY: !d.flipY }));
              }}
              title="Flip vertical (mirror top-bottom)"
            >
              <FlipVertical size={14} />
            </button>
          </div>
        </>
      )}

      {isImage && (
        <span className={`text-xs text-ember-50/60 font-mono ${disabledCls}`}>
          {Math.round(selected.getScaledWidth?.() || selected.width)} × {Math.round(selected.getScaledHeight?.() || selected.height)}
          <span className="ml-2 text-ember-400/70">aspect-locked · drag a corner to resize</span>
        </span>
      )}

      {/* Opacity — universal (disabled when locked) */}
      <span className="ribbon-sep" />
      <div className={`flex items-center gap-2 ${disabledCls}`}>
        <label className="text-[10px] font-mono tracking-widest uppercase text-ember-50/50">
          Opacity
        </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={draft.opacity ?? 1}
          onChange={(e) => apply({ opacity: parseFloat(e.target.value) })}
          style={{ width: 80 }}
        />
      </div>

      {/* Right-side universal actions */}
      <div className="ml-auto flex items-center gap-1">
        {/* Z-order (disabled when locked) */}
        <div className={`flex items-center gap-1 ${disabledCls}`}>
          <button className="tool-btn" onClick={() => canvasRef.current?.sendToBack()} title="Send to back">
            <ChevronsDown size={14} />
          </button>
          <button className="tool-btn" onClick={() => canvasRef.current?.sendBackward()} title="Send backward">
            <ArrowDown size={14} />
          </button>
          <button className="tool-btn" onClick={() => canvasRef.current?.bringForward()} title="Bring forward">
            <ArrowUp size={14} />
          </button>
          <button className="tool-btn" onClick={() => canvasRef.current?.bringToFront()} title="Bring to front">
            <ChevronsUp size={14} />
          </button>
        </div>

        <span className="ribbon-sep" />

        {/* LOCK TOGGLE — always enabled, even when locked (otherwise user
            could never unlock from here). This is the canvas-side twin of
            the LayerPanel lock icon; toggling either updates both. */}
        <button
          className={`tool-btn ${locked ? 'active' : ''}`}
          onClick={toggleLock}
          title={locked ? 'Unlock element' : 'Lock element (prevents editing)'}
          style={locked ? { color: '#fb923c', borderColor: 'rgba(249,115,22,0.4)' } : {}}
        >
          {locked ? <Lock size={14} strokeWidth={2.5} /> : <Unlock size={14} />}
          <span className="ml-1">{locked ? 'Locked' : 'Lock'}</span>
        </button>

        <span className="ribbon-sep" />

        {/* Duplicate / Delete (disabled when locked) */}
        <div className={`flex items-center gap-1 ${disabledCls}`}>
          <button className="tool-btn" onClick={() => canvasRef.current?.duplicateSelected()} title="Duplicate">
            <Copy size={14} />
          </button>
          <button
            className="tool-btn text-crimson-400 hover:text-crimson-300"
            onClick={() => canvasRef.current?.deleteSelected()}
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
