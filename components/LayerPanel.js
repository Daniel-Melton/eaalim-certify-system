'use client';

import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Type, Square, Circle as CircleIcon, Image as ImageIcon, Shapes,
  GripVertical, Trash2, Lock, Unlock,
} from 'lucide-react';

/**
 * LayerPanel.js
 *
 * Drag-and-drop layer reordering + lock/unlock toggle.
 *
 * Visual order is top-to-bottom (highest layer first). Fabric's z-order is
 * bottom-to-top (index 0 = back). We reverse for display, then reverse again
 * before handing the new order back to the canvas.
 *
 * Locked layers:
 *  - show a filled Lock icon (in ember orange)
 *  - are rendered at reduced opacity
 *  - cannot be dragged (drag listeners are not attached)
 *  - cannot be deleted from the panel (button is hidden)
 *  - clicking the row does NOT select (selecting a locked object is a no-op
 *    in Canvas.js anyway, but we also suppress it here for instant feedback)
 *
 * Selection highlighting:
 *  - Accepts EITHER `selectedId` (a single id) for legacy callers OR
 *    `selectedIds` (an array) for multi-select callers. Both produce the
 *    same row-highlight; using the array form lights up multiple rows when
 *    the user has Ctrl/Cmd-clicked several elements on the canvas.
 *
 * Props:
 *  - objects: [{ id, type, text, zIndex, isLocked }]
 *  - selectedId?: string | null              (single-select, legacy)
 *  - selectedIds?: string[]                  (multi-select, preferred)
 *  - onSelect(id)
 *  - onReorder(newOrderBottomToTop: string[])
 *  - onDelete(id)
 *  - onToggleLock(id)
 */
export default function LayerPanel({ objects, selectedId, selectedIds, onSelect, onReorder, onDelete, onToggleLock }) {
  // Normalise the "what's selected" view into a Set for O(1) lookups.
  // selectedIds (array form) takes precedence; if the array is missing or
  // empty, fall back to the single-id form. Empty Set ⇒ nothing highlighted.
  const selectedSet = (() => {
    if (Array.isArray(selectedIds) && selectedIds.length) return new Set(selectedIds);
    if (selectedId) return new Set([selectedId]);
    return new Set();
  })();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const displayOrder = [...objects].reverse();

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIdx = displayOrder.findIndex((o) => o.id === active.id);
    const newIdx = displayOrder.findIndex((o) => o.id === over.id);
    if (oldIdx === -1 || newIdx === -1) return;

    // Locked layers can't be moved, and can't be the drop target either
    if (displayOrder[oldIdx]?.isLocked || displayOrder[newIdx]?.isLocked) return;

    const newDisplay = arrayMove(displayOrder, oldIdx, newIdx);
    const newCanonical = [...newDisplay].reverse().map((o) => o.id);
    onReorder && onReorder(newCanonical);
  };

  if (!objects || objects.length === 0) {
    return (
      <div className="p-4">
        <div className="section-label mb-2">Canvas Layers</div>
        <p className="text-xs text-ember-200/50">
          No elements on the canvas yet. Add text, shapes, or templates to see them here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 fade-in-panel">
      <div className="section-label mb-3">Layer Order · Drag to Reorder</div>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={displayOrder.map((o) => o.id)} strategy={verticalListSortingStrategy}>
          <div className="flex flex-col gap-2">
            {displayOrder.map((obj) => (
              <SortableLayerItem
                key={obj.id}
                obj={obj}
                isSelected={selectedSet.has(obj.id)}
                onSelect={() => onSelect && onSelect(obj.id)}
                onDelete={() => onDelete && onDelete(obj.id)}
                onToggleLock={() => onToggleLock && onToggleLock(obj.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
      <p className="mt-4 text-[10px] text-ember-200/40 font-mono tracking-wider uppercase">
        Top of list = front of canvas · <Lock size={9} className="inline -mt-0.5" /> = locked (uneditable)
      </p>
    </div>
  );
}

function SortableLayerItem({ obj, isSelected, onSelect, onDelete, onToggleLock }) {
  // If locked, don't attach drag listeners — the row can still be clicked
  // on to show the lock icon, but can't be grabbed and moved.
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id: obj.id, disabled: obj.isLocked });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : (obj.isLocked ? 0.65 : 1),
  };

  const iconFor = (type) => {
    if (type === 'i-text' || type === 'textbox' || type === 'text') return Type;
    if (type === 'rect') return Square;
    if (type === 'circle') return CircleIcon;
    if (type === 'image') return ImageIcon;
    if (type === 'group' || type === 'path') return Shapes;
    return Shapes;
  };
  const Icon = iconFor(obj.type);

  const label = (obj.type === 'i-text' || obj.type === 'textbox' || obj.type === 'text')
    ? (obj.text?.substring(0, 28) || 'Text')
    : obj.type === 'rect' ? 'Rectangle'
    : obj.type === 'circle' ? 'Circle'
    : obj.type === 'image' ? 'Image'
    : obj.type === 'group' ? 'Vector'
    : obj.type;

  const handleRowClick = () => {
    // Locked items don't select — give the user immediate feedback without
    // a round-trip through Fabric.
    if (obj.isLocked) return;
    onSelect && onSelect();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`layer-item ${isSelected ? 'active' : ''} ${isDragging ? 'dragging' : ''} ${obj.isLocked ? 'locked' : ''}`}
      onClick={handleRowClick}
    >
      {/* Drag handle — disabled when locked */}
      <div
        {...(obj.isLocked ? {} : attributes)}
        {...(obj.isLocked ? {} : listeners)}
        className={`${obj.isLocked ? 'cursor-not-allowed text-ember-200/20' : 'cursor-grab text-ember-200/40 hover:text-ember-400'} flex-shrink-0`}
        onClick={(e) => e.stopPropagation()}
        title={obj.isLocked ? 'Unlock to reorder' : 'Drag to reorder'}
      >
        <GripVertical size={14} />
      </div>

      <Icon size={13} className="text-ember-400/70 flex-shrink-0" />

      <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap text-ember-50/85">
        {label}
      </span>

      {/* Lock toggle */}
      <button
        onClick={(e) => { e.stopPropagation(); onToggleLock && onToggleLock(); }}
        className={`flex-shrink-0 transition-colors p-1 rounded ${
          obj.isLocked
            ? 'text-ember-400 hover:text-ember-300'
            : 'text-ember-200/30 hover:text-ember-200'
        }`}
        title={obj.isLocked ? 'Unlock layer' : 'Lock layer'}
      >
        {obj.isLocked ? <Lock size={12} strokeWidth={2.5} /> : <Unlock size={12} />}
      </button>

      {/* Delete — hidden for locked layers so they can't be accidentally trashed */}
      {!obj.isLocked && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete && onDelete(); }}
          className="text-ember-200/30 hover:text-crimson-500 transition-colors flex-shrink-0"
          title="Delete layer"
        >
          <Trash2 size={12} />
        </button>
      )}
    </div>
  );
}
