'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileJson, Image as ImageIcon, X, ChevronRight } from 'lucide-react';
import { useProject, PAGE_SIZES } from '@/lib/projectContext';
import SafeImage from '@/components/SafeImage';

/**
 * ImportTab.js
 *
 * Tab C: upload external file (JSON or image) to use as the starting point.
 *  - JSON: parsed as an Elite Certify template (same shape as internal templates)
 *          — validated lightly (must have `elements` array).
 *  - Image (PNG/JPG/SVG): loaded as a background image in the editor, so the
 *          user can overlay text/placeholders on top.
 *
 * Supports click-to-browse AND drag-and-drop.
 */
export default function ImportTab() {
  const router = useRouter();
  const { setProject } = useProject();
  const inputRef = useRef(null);
  const [preview, setPreview] = useState(null); // { kind: 'image'|'json', name, data, size? }
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = (file) => {
    if (!file) return;
    setError(null);

    const isJson = file.type === 'application/json' || /\.json$/i.test(file.name);
    const isImage = file.type.startsWith('image/');

    if (!isJson && !isImage) {
      setError('Unsupported file type. Use JSON or an image (PNG/JPG/SVG).');
      return;
    }

    const reader = new FileReader();

    if (isJson) {
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!parsed.elements && !parsed.canvas) {
            setError('This JSON does not look like an Elite Certify template. Expected an `elements` or `canvas` field.');
            return;
          }
          setPreview({ kind: 'json', name: file.name, data: parsed });
        } catch (err) {
          setError('Could not parse JSON: ' + err.message);
        }
      };
      reader.readAsText(file);
    } else {
      reader.onload = (e) => {
        const dataUrl = e.target.result;
        // Get natural dimensions to pick a sensible canvas size
        const img = new Image();
        img.onload = () => {
          setPreview({
            kind: 'image',
            name: file.name,
            data: dataUrl,
            size: { w: img.naturalWidth, h: img.naturalHeight },
          });
        };
        img.onerror = () => {
          setError('Could not read that image. Try a different file.');
        };
        img.src = dataUrl;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files?.[0]);
  };

  const handleConfirm = () => {
    if (!preview) return;

    if (preview.kind === 'json') {
      // The JSON might be a full template (with elements[]) or a saved canvas
      // (with canvas: toJSON() output). Both are handled by Studio's load logic.
      setProject({
        mode: 'template',
        projectName: preview.data.name || preview.name.replace(/\.json$/i, ''),
        canvasSize: PAGE_SIZES.find((s) => s.id === 'custom-landscape') || PAGE_SIZES[0],
        canvasBg: preview.data.bg || '#ffffff',
        initialTemplate: preview.data,
        importedBackground: null,
      });
    } else {
      // For images, pick the closest size preset to the image's natural aspect ratio.
      const imgRatio = preview.size.w / preview.size.h;
      const best = [...PAGE_SIZES].sort((a, b) => {
        return Math.abs((a.w / a.h) - imgRatio) - Math.abs((b.w / b.h) - imgRatio);
      })[0];
      setProject({
        mode: 'import',
        projectName: preview.name.replace(/\.[^.]+$/, ''),
        canvasSize: best,
        canvasBg: '#ffffff',
        initialTemplate: null,
        importedBackground: preview.data,
      });
    }
    router.push('/editor');
  };

  return (
    <div>
      {!preview && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-all ${
            dragOver
              ? 'border-ember-500 bg-ember-500/5'
              : 'border-ink-700 hover:border-ember-500/60'
          }`}
        >
          <div
            className="w-16 h-16 mx-auto mb-4 rounded-xl flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #dc2626, #f97316)' }}
          >
            <Upload size={28} color="#fff" strokeWidth={1.75} />
          </div>
          <div className="font-display text-xl text-ember-50 mb-2">
            Drop a file to import
          </div>
          <div className="text-sm text-ember-50/60 mb-4">
            Or click to browse your computer
          </div>
          <div className="flex items-center justify-center gap-3 text-[10px] font-mono tracking-widest uppercase text-ember-50/40">
            <span className="flex items-center gap-1.5">
              <FileJson size={12} /> JSON template
            </span>
            <span>·</span>
            <span className="flex items-center gap-1.5">
              <ImageIcon size={12} /> PNG · JPG · SVG
            </span>
          </div>
          <input
            ref={inputRef}
            type="file"
            accept=".json,application/json,image/*"
            onChange={(e) => handleFile(e.target.files?.[0])}
            className="hidden"
          />
        </div>
      )}

      {preview && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: '#18120e', border: '1px solid #2a1f18' }}
              >
                {preview.kind === 'json'
                  ? <FileJson size={16} className="text-ember-400" />
                  : <ImageIcon size={16} className="text-ember-400" />}
              </div>
              <div>
                <div className="text-sm text-ember-50 font-medium">{preview.name}</div>
                <div className="text-[10px] font-mono tracking-widest uppercase text-ember-50/40 mt-0.5">
                  {preview.kind === 'json'
                    ? 'JSON template · will load as editable layers'
                    : `Image · ${preview.size.w} × ${preview.size.h} px · will load as background`}
                </div>
              </div>
            </div>
            <button
              onClick={() => { setPreview(null); setError(null); }}
              className="text-ember-50/50 hover:text-ember-50 transition-colors p-2"
              title="Clear"
            >
              <X size={16} />
            </button>
          </div>

          {preview.kind === 'image' && (
            <SafeImage
              src={preview.data}
              alt="Import preview"
              fit="contain"
              rounded
              className="w-full h-72"
            />
          )}

          {preview.kind === 'json' && (
            <div
              className="rounded-xl p-4 font-mono text-[11px] text-ember-50/70 max-h-72 overflow-auto"
              style={{ background: '#18120e', border: '1px solid #2a1f18' }}
            >
              <pre>{JSON.stringify(preview.data, null, 2).slice(0, 800)}{JSON.stringify(preview.data).length > 800 ? '\n…' : ''}</pre>
            </div>
          )}

          <button
            onClick={handleConfirm}
            className="group flex items-center gap-3 px-6 py-3 rounded-lg text-white font-semibold transition-all hover:scale-[1.02]"
            style={{
              background: 'linear-gradient(135deg, #dc2626, #f97316)',
              boxShadow: '0 10px 30px rgba(220, 38, 38, 0.35)',
            }}
          >
            Use This Import
            <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" strokeWidth={2.5} />
          </button>
        </div>
      )}

      {error && (
        <div className="mt-4 p-3 rounded-lg bg-crimson-900/30 border border-crimson-600/50 text-sm text-crimson-200">
          {error}
        </div>
      )}
    </div>
  );
}
