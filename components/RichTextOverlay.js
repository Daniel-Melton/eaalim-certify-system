'use client';

import { useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextStyle from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import Underline from '@tiptap/extension-underline';
import { Bold, Italic, Underline as UnderlineIcon, Type, Check, X } from 'lucide-react';

/**
 * RichTextOverlay.js
 *
 * DOM-overlay TipTap editor that sits on top of a selected Fabric.Textbox.
 * Gives MS-Word / Photoshop-style per-character formatting: select a word,
 * click Bold, only that word becomes bold.
 *
 * Architecture:
 *  - The overlay mounts inside the same zoom-transformed wrapper as the
 *    Canvas, so it shares the user's zoom and positioning.
 *  - When `active` is true and `target` is a Fabric Textbox, we position
 *    the overlay at the object's canvas-space (left, top, width, height),
 *    rotated by its angle. Pixel coordinates match 1:1 because we're
 *    inside the same `transform: scale(zoom)` parent.
 *  - TipTap renders rich text as contenteditable HTML. On Apply, we walk
 *    the TipTap JSON, emit Fabric's per-character `styles` object, write
 *    it back via `canvasRef.current.applyRichText(...)`.
 *  - While active, the Fabric object renders at low opacity so the user
 *    only sees the DOM overlay (crisp) instead of two stacked texts.
 *
 * Why not contenteditable directly on the Fabric DOM?
 *  - Fabric has its own textarea-backed editor (enterEditing), but it
 *    doesn't support per-character formatting controls as a toolbar —
 *    you'd apply styles programmatically. TipTap ships a full editor
 *    abstraction (marks, selection, keyboard shortcuts) for free.
 *
 * Auto-wrapping:
 *  - Textbox has a fixed width and wraps automatically. Our overlay
 *    matches that width, and its content-editable wraps the same way.
 *    When the user resizes the Textbox width, the overlay width updates
 *    via the `target` prop (driven by `object:scaling` events upstream).
 *
 * Manual line breaks:
 *  - Enter creates a new paragraph in TipTap → '\n' in Fabric output.
 *    Fabric Textbox renders '\n' as a hard break.
 *
 * Props:
 *  - active    : boolean — render the overlay (otherwise null)
 *  - target    : the Fabric Textbox object (pulled via getObjectById)
 *  - zoom      : current zoom (1 = 100%). Used to size the toolbar so it
 *                stays readable while the content stays in canvas-space.
 *  - onApply({ text, styles, richText, width }) — write to canvas
 *  - onCancel()                                  — close without writing
 */
export default function RichTextOverlay({ active, target, zoom = 1, onApply, onCancel }) {
  const rootRef = useRef(null);
  const [, forceRerender] = useState(0);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
      Underline,
      TextStyle,
      Color,
    ],
    content: '',
    immediatelyRender: false,
    editorProps: {
      attributes: { class: 'tiptap-overlay-surface' },

      // ----------------------------------------------------------------
      // PASTE SANITIZATION
      //
      // Pasting from Word, Google Docs, web pages, or even other rich-
      // text editors typically drags in inline styles like
      // `letter-spacing: 4em`, `font-family: Calibri`, `line-height: 200%`,
      // hidden zero-width characters, MS-Office namespaces, and stray
      // <span> wrappers. Without sanitization, those styles leak into the
      // overlay (and onward into the Fabric Textbox), producing the
      // gigantically letter-spaced "i m p l y   d u m m y" rendering the
      // user reported.
      //
      // We intercept at three levels:
      //
      //  1. `transformPastedHTML` — stripped to a TEXT-ONLY representation.
      //     Strip all tags, normalise newlines, drop control / zero-width
      //     characters. Re-emit as a single <p>plain text</p> so TipTap's
      //     own schema applies its defaults (paragraph break-on-newline).
      //  2. `transformPastedText` — same scrubbing for plain-text pastes
      //     (e.g. middle-click paste on Linux, or sources that ship only
      //     `text/plain`). Even plain text can carry zero-width chars.
      //  3. `clipboardTextSerializer` — when the user COPIES out of the
      //     overlay, we serialise to clean plain text (no HTML), so the
      //     next paste anywhere isn't another rich-formatting trap.
      //
      // The user can still apply formatting deliberately — Bold / Italic /
      // Underline / Color via the toolbar still work; we only block style
      // INHERITANCE from the source clipboard.
      // ----------------------------------------------------------------
      transformPastedHTML: (html) => {
        return htmlToCleanParagraph(html);
      },
      transformPastedText: (text) => {
        return scrubText(text);
      },
      clipboardTextSerializer: (slice) => {
        return slice.content.textBetween(0, slice.content.size, '\n');
      },
    },
  });

  // Sync incoming content each time the overlay becomes active on a new target.
  useEffect(() => {
    if (!editor || !active || !target) return;
    if (target.richText) {
      editor.commands.setContent(target.richText, false);
    } else if (target.text) {
      editor.commands.setContent(plainTextToDoc(target.text, target.styles), false);
    } else {
      editor.commands.setContent('', false);
    }
    queueMicrotask(() => editor.commands.focus('end'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, target?.id]);

  // Re-render the toolbar when TipTap selection changes, so active-state
  // indicators (Bold highlighted when cursor is in bold text) update live.
  useEffect(() => {
    if (!editor) return;
    const tick = () => forceRerender((n) => n + 1);
    editor.on('selectionUpdate', tick);
    editor.on('transaction', tick);
    return () => {
      editor.off('selectionUpdate', tick);
      editor.off('transaction', tick);
    };
  }, [editor]);

  // Keyboard: Esc cancels, Ctrl+Enter applies.
  useEffect(() => {
    if (!active) return;
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); handleCancel(); }
      else if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); handleApply(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, editor]);

  if (!active || !target) return null;

  const handleApply = () => {
    if (!editor) return;
    const json = editor.getJSON();
    const { text, styles } = serializeToFabric(json);
    onApply?.({ text, styles, richText: json, width: target.width });
  };
  const handleCancel = () => onCancel?.();

  // Canvas-space geometry of the target textbox.
  // We're rendered inside the same transform wrapper as the canvas, so
  // these are the coordinates we use directly (no zoom math here).
  const left = target.left - (target.originX === 'center' ? target.width / 2 : 0);
  const top = target.top - (target.originY === 'center' ? target.getScaledHeight() / 2 : 0);
  const width = target.width;
  const angle = target.angle || 0;

  // Mirror the text-style properties so TipTap renders the overlay at
  // roughly the same size + font as the underlying Textbox.
  const textStyle = {
    fontFamily: target.fontFamily || 'Playfair Display',
    fontSize: `${target.fontSize || 32}px`,
    color: typeof target.fill === 'string' ? target.fill : '#18120e',
    lineHeight: target.lineHeight ?? 1.16,
    textAlign: target.textAlign || 'left',
    fontWeight: target.fontWeight || 400,
    fontStyle: target.fontStyle || 'normal',
    letterSpacing: target.charSpacing ? `${(target.charSpacing / 1000).toFixed(3)}em` : 'normal',
  };

  const currentColor = editor?.getAttributes('textStyle')?.color || textStyle.color;

  return (
    <div
      ref={rootRef}
      className="rich-text-overlay"
      style={{
        position: 'absolute',
        left,
        top,
        width,
        transform: `rotate(${angle}deg)`,
        transformOrigin: 'center center',
        zIndex: 50,
        pointerEvents: 'auto',
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Selection frame — indicates the edit zone with an orange glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          outline: '2px solid #f97316',
          outlineOffset: '0px',
          boxShadow: '0 0 0 4px rgba(249, 115, 22, 0.15)',
          borderRadius: 2,
        }}
      />

      {/* Floating toolbar — sits above the text at a fixed pixel size
         (counter-scaled against zoom so it's always readable).

         Counter-scale math: the canvas is rendered inside a wrapper with
         `transform: scale(zoom)`. The overlay inherits that scale, so at
         zoom=0.5 everything would be half-size. We apply an inverse scale
         to the toolbar so it renders at its intrinsic pixel size
         regardless of zoom. */}
      <div
        className="absolute flex items-center gap-1 p-1.5 rounded-lg shadow-xl"
        style={{
          top: -10,
          left: '50%',
          transform: `translate(-50%, -100%) scale(${1 / Math.max(0.2, zoom)})`,
          transformOrigin: 'center bottom',
          background: '#141210',
          border: '1px solid rgba(249, 115, 22, 0.6)',
          whiteSpace: 'nowrap',
        }}
      >
        <ToolbarButton
          active={editor?.isActive('bold')}
          onClick={() => editor?.chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <Bold size={13} />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('italic')}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <Italic size={13} />
        </ToolbarButton>
        <ToolbarButton
          active={editor?.isActive('underline')}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size={13} />
        </ToolbarButton>

        <div className="w-px h-5 bg-ink-700 mx-1" />

        <div className="flex items-center gap-1">
          <Type size={11} className="text-ember-200/50" />
          <input
            type="color"
            value={typeof currentColor === 'string' ? currentColor : '#18120e'}
            onChange={(e) => editor?.chain().focus().setColor(e.target.value).run()}
            className="w-5 h-5 rounded cursor-pointer border-0 bg-transparent"
            title="Text color"
          />
          <button
            type="button"
            onClick={() => editor?.chain().focus().unsetColor().run()}
            className="text-[9px] text-ember-200/60 hover:text-ember-200 font-mono px-1"
            title="Reset color"
          >
            ×
          </button>
        </div>

        <div className="w-px h-5 bg-ink-700 mx-1" />

        <button
          onClick={handleApply}
          className="flex items-center gap-1 px-2 py-1 rounded text-[11px] font-semibold text-white"
          style={{ background: 'linear-gradient(135deg, #dc2626, #f97316)' }}
          title="Apply (Ctrl+Enter)"
        >
          <Check size={11} strokeWidth={2.5} />
          Apply
        </button>
        <button
          onClick={handleCancel}
          className="p-1 rounded text-ember-200/60 hover:text-ember-200"
          title="Cancel (Esc)"
        >
          <X size={13} />
        </button>
      </div>

      {/* Editor surface — size matches the Textbox exactly */}
      <div
        style={{
          ...textStyle,
          width: '100%',
          minHeight: target.getScaledHeight ? target.getScaledHeight() : target.height,
          padding: 0,
          background: 'rgba(255, 247, 237, 0.04)',
        }}
        // -------------------------------------------------------------
        // DOM-level paste interception (defence in depth)
        //
        // TipTap's `transformPastedHTML` / `transformPastedText` already
        // strip everything we care about. This handler is the belt-and-
        // braces guarantee the spec asks for: it fires in CAPTURE phase,
        // BEFORE TipTap or ProseMirror sees the event, reads the
        // clipboard's `text/plain` representation directly, scrubs it,
        // and replays it via insertContent.
        //
        // Result: even if a future TipTap extension or refactor disables
        // the transformPastedHTML hook (e.g. someone swaps StarterKit
        // for a custom kit), pastes can never carry letter-spacing,
        // font-family, line-height, or any other CSS through to the
        // Fabric Textbox. The "stretched text" bug stays fixed regardless
        // of what happens upstream.
        //
        // We deliberately ignore the `text/html` representation entirely
        // — text/plain is always present (browsers synthesise it from
        // text/html if missing), and going text-only is exactly the
        // sanitisation outcome we want.
        // -------------------------------------------------------------
        onPasteCapture={(e) => {
          if (!editor) return;
          const cd = e.clipboardData;
          if (!cd) return;
          // Prefer text/plain. If only text/html is offered (rare), we
          // synthesise plain via DOMParser-equivalent logic in
          // htmlToCleanParagraph and unwrap to a flat string.
          let raw = cd.getData('text/plain');
          if (!raw) {
            const html = cd.getData('text/html');
            if (html) {
              // Reuse the HTML-to-clean-paragraph path, then strip the
              // <p> wrappers it adds back to a plain string with newlines.
              const wrapped = htmlToCleanParagraph(html);
              raw = wrapped
                .replace(/<\/p><p>/g, '\n')
                .replace(/<\/?p>/g, '');
            }
          }
          if (typeof raw !== 'string') return;
          e.preventDefault();
          e.stopPropagation();
          const cleaned = scrubText(raw);
          // Insert as plain text — preserves any active marks at the
          // caret (so pasting into a bold run stays bold) without
          // dragging in the source's spacing / typography. Newlines
          // become hard breaks via insertContent's \n handling.
          editor.commands.insertContent(cleaned);
        }}
      >
        <EditorContent editor={editor} />
      </div>

      <style jsx global>{`
        .tiptap-overlay-surface {
          outline: none;
          width: 100%;
          min-height: inherit;
          /* Wrap long words/lines back into the bounding box rather than
             overflowing horizontally. Combined with the letter-spacing
             reset below, this keeps pasted text from "stretching out"
             across the page in a single ungrowable line. */
          white-space: pre-wrap;
          word-wrap: break-word;
          overflow-wrap: anywhere;
          /* Force sane defaults regardless of what inline styles a paste
             might (try to) inject. The !important here is the persistence
             rule the spec requires: even if a future code path leaks an
             inline style of letter-spacing: 4em onto the editor root,
             this rule still wins (inline non-important < stylesheet
             important; inline important would still beat us, but no
             paste path produces inline !important on the root). */
          letter-spacing: normal !important;
          word-spacing: normal !important;
          line-height: 1.2 !important;
        }
        .tiptap-overlay-surface * {
          /* Hard reset for any element TipTap inserts (paragraphs,
             text-style spans, mark wrappers). We pin to "normal" rather
             than "inherit" so a descendant that arrived with its own
             inline letter-spacing: 4em !important (the worst-case Word
             paste bug we have seen) is ALSO neutralised — "inherit"
             would lose to the descendant's own !important, but "normal
             !important" declared at the descendant's matching specificity
             wins via the cascade rules for !important + later origin.
             The toolbar's Bold/Italic/Underline/Color marks still apply
             because they are styled by specific tag selectors below
             (b, i, u, span[style]) and only set font-weight / font-style /
             text-decoration / color — none of the spacing properties. */
          letter-spacing: normal !important;
          word-spacing: normal !important;
          line-height: inherit !important;
          font-family: inherit;
        }
        .tiptap-overlay-surface p {
          margin: 0;
        }
        .tiptap-overlay-surface p + p {
          margin-top: 0.4em;
        }
        .tiptap-overlay-surface u {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}

function ToolbarButton({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}    // don't lose editor focus
      onClick={onClick}
      title={title}
      className={`flex items-center justify-center w-7 h-7 rounded transition-colors ${
        active
          ? 'bg-ember-500 text-white'
          : 'text-ember-200/70 hover:bg-ink-700 hover:text-ember-50'
      }`}
    >
      {children}
    </button>
  );
}

// --------------------------------------------------------------------------
// PASTE SANITIZATION HELPERS
// --------------------------------------------------------------------------

/**
 * Strip control characters, zero-width chars, BOMs, and normalise newlines
 * to a single \n. Plain-text version of paste cleanup — used directly for
 * `transformPastedText` and as the back-end of `transformPastedHTML`.
 */
function scrubText(input) {
  if (typeof input !== 'string') return '';
  return input
    // Normalise CRLF / CR → LF
    .replace(/\r\n?/g, '\n')
    // Drop zero-width chars: ZWSP (U+200B), ZWNJ (U+200C), ZWJ (U+200D),
    // BOM (U+FEFF), word joiner (U+2060), and the various LRM / RLM marks
    // (U+200E / U+200F) that don't render but trigger weird selection
    // / spacing behaviour in some browsers.
    .replace(/[\u200B-\u200F\u2028\u2029\u2060\uFEFF]/g, '')
    // Drop the C0 control range (except \n which is whitelisted), and the
    // C1 range — Word commonly drops U+0085 NEL into pasted text. We
    // preserve TAB (\t) since TipTap turns it into actual indentation.
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '')
    // Collapse any run of more than 2 consecutive newlines into 2 (one
    // empty paragraph between blocks is enough; Word likes to insert 4+).
    .replace(/\n{3,}/g, '\n\n')
    // Trim leading / trailing whitespace runs that are purely formatting.
    .replace(/^[ \t]+|[ \t]+$/g, '');
}

/**
 * Convert pasted HTML into a clean plain-text representation, then re-wrap
 * it as a minimal `<p>…</p>` HTML chunk that TipTap will tokenise into its
 * paragraph schema. We can't just return the scrubbed text directly from
 * `transformPastedHTML` because TipTap expects HTML at this hook — return
 * non-HTML and it falls back to the source HTML's parser, defeating the
 * sanitisation. So: extract textContent, scrub, escape, wrap in <p>.
 */
function htmlToCleanParagraph(html) {
  if (typeof html !== 'string' || !html) return '<p></p>';

  // Use a detached <template> so the HTML never gets injected into the
  // live document (avoids running scripts, fetching images, etc.) and so
  // we can extract textContent in a single line.
  let extracted = '';
  if (typeof document !== 'undefined') {
    const tpl = document.createElement('template');
    tpl.innerHTML = html;
    // Insert a newline boundary at every block-level element close, so
    // `<p>A</p><p>B</p>` becomes "A\nB" rather than "AB". Walking is
    // cheap relative to the typical paste size.
    const blockTags = new Set([
      'P', 'DIV', 'BR', 'LI', 'TR', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6',
      'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE', 'HEADER', 'FOOTER',
    ]);
    const walk = (node) => {
      if (!node) return;
      if (node.nodeType === 3) {              // text node
        extracted += node.nodeValue || '';
        return;
      }
      if (node.nodeType !== 1) return;        // element
      const tag = node.tagName;
      if (tag === 'BR') { extracted += '\n'; return; }
      for (let child = node.firstChild; child; child = child.nextSibling) {
        walk(child);
      }
      if (blockTags.has(tag)) extracted += '\n';
    };
    for (let child = tpl.content.firstChild; child; child = child.nextSibling) {
      walk(child);
    }
  } else {
    // SSR fallback: very rough regex-based tag stripping. Almost never
    // hit because TipTap runs client-side, but keeps the function safe
    // to call from any context.
    extracted = html.replace(/<[^>]+>/g, ' ');
  }

  const cleaned = scrubText(extracted);
  if (!cleaned) return '<p></p>';

  const escapeHtml = (s) => s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

  // Each newline becomes a paragraph break. Empty lines render as empty
  // paragraphs (TipTap supports them).
  const paragraphs = cleaned.split('\n').map((line) => `<p>${escapeHtml(line)}</p>`);
  return paragraphs.join('');
}

// --------------------------------------------------------------------------
// SERIALIZATION
// --------------------------------------------------------------------------

/**
 * Walk TipTap JSON → emit plain text + Fabric's per-character `styles`.
 *   styles shape: { [lineIdx]: { [charIdx]: { fontWeight, fontStyle, underline, fill } } }
 */
function serializeToFabric(doc) {
  let text = '';
  const styles = {};
  let lineIdx = 0;
  let charIdx = 0;
  let firstParagraph = true;

  const visit = (node) => {
    if (!node) return;
    if (node.type === 'paragraph') {
      if (!firstParagraph) { text += '\n'; lineIdx += 1; charIdx = 0; }
      firstParagraph = false;
      (node.content || []).forEach(visit);
      return;
    }
    if (node.type === 'text') {
      const value = node.text || '';
      const style = marksToStyle(node.marks);
      for (const ch of value) {
        text += ch;
        if (style) {
          if (!styles[lineIdx]) styles[lineIdx] = {};
          styles[lineIdx][charIdx] = { ...style };
        }
        charIdx += 1;
      }
      return;
    }
    if (node.type === 'hardBreak') {
      text += '\n'; lineIdx += 1; charIdx = 0;
      return;
    }
    if (Array.isArray(node.content)) node.content.forEach(visit);
  };

  visit(doc);
  return { text, styles };
}

function marksToStyle(marks) {
  if (!marks || marks.length === 0) return null;
  const style = {};
  for (const m of marks) {
    if (m.type === 'bold') style.fontWeight = 'bold';
    else if (m.type === 'italic') style.fontStyle = 'italic';
    else if (m.type === 'underline') style.underline = true;
    else if (m.type === 'textStyle' && m.attrs?.color) style.fill = m.attrs.color;
  }
  return Object.keys(style).length ? style : null;
}

/**
 * Reverse direction: plain text + Fabric styles → TipTap doc.
 *
 * Used when opening the overlay on a Textbox that was previously styled
 * via this component (round-trip preservation), or on one that had its
 * styles set another way (e.g. loaded from a template).
 *
 * Consecutive characters with matching style runs become a single text
 * node with the appropriate marks. Each '\n' becomes a paragraph break.
 */
function plainTextToDoc(text, styles) {
  const paragraphs = text.split('\n');
  const doc = { type: 'doc', content: [] };

  paragraphs.forEach((paragraphText, pIdx) => {
    const lineStyles = (styles && styles[pIdx]) || {};
    const runs = [];
    let current = null;

    for (let i = 0; i < paragraphText.length; i++) {
      const ch = paragraphText[i];
      const style = lineStyles[i] || null;
      const marks = styleToMarks(style);

      if (current && sameMarks(current.marks, marks)) {
        current.text += ch;
      } else {
        current = { text: ch, marks };
        runs.push(current);
      }
    }

    const content = runs
      .filter((r) => r.text.length > 0)
      .map((r) => {
        const node = { type: 'text', text: r.text };
        if (r.marks && r.marks.length) node.marks = r.marks;
        return node;
      });

    doc.content.push({ type: 'paragraph', content: content.length ? content : undefined });
  });

  return doc;
}

function styleToMarks(style) {
  if (!style) return [];
  const marks = [];
  if (style.fontWeight === 'bold' || Number(style.fontWeight) >= 600) marks.push({ type: 'bold' });
  if (style.fontStyle === 'italic') marks.push({ type: 'italic' });
  if (style.underline) marks.push({ type: 'underline' });
  if (style.fill) marks.push({ type: 'textStyle', attrs: { color: style.fill } });
  return marks;
}

function sameMarks(a, b) {
  const A = a || [];
  const B = b || [];
  if (A.length !== B.length) return false;
  const keyOf = (m) => m.type === 'textStyle'
    ? `textStyle:${m.attrs?.color || ''}`
    : m.type;
  const setA = new Set(A.map(keyOf));
  return B.every((m) => setA.has(keyOf(m)));
}
