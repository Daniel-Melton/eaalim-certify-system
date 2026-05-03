'use client';

import { useRef, useState } from 'react';
import { parseCSV } from '@/lib/csvParser';
import { resolveExportMultiplier } from '@/lib/imageScaling';
import { X, Download, Upload, Sparkles, Check, Play, FileText, FileDown } from 'lucide-react';

/**
 * ExportModal.js
 *
 * Export formats:
 *
 *   SINGLE
 *     - PNG — high-resolution 2× raster (existing)
 *     - PDF — vector-wrapped PNG inside a single PDF page sized to
 *             match the canvas aspect ratio. Opens and prints cleanly.
 *
 *   BULK (one record per row from a CSV)
 *     - PNG ZIP — one PNG per row, packaged into a .zip (existing)
 *     - PDF ZIP — one PDF per row, packaged into a .zip
 *     - Multi-page PDF — all rows combined into ONE pdf, one page per
 *                        certificate. Best for printing a whole batch.
 *
 * PDF generation
 * --------------
 *  We use the jsPDF UMD build from cdnjs — loaded on-demand the first
 *  time the user clicks a PDF export, so it doesn't inflate the initial
 *  bundle. The canvas is rendered to a PNG data URL first (at 2×), then
 *  embedded into a jsPDF page sized 1:1 with the canvas pixels (points-
 *  based, but Fabric canvases are pixel-accurate so a px→pt mapping at
 *  72 dpi is fine for on-screen and prints well).
 *
 * Props:
 *  - canvasRef: ref to Canvas imperative API
 *  - onClose: () => void
 */
export default function ExportModal({ canvasRef, onClose }) {
  const [csvData, setCsvData] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState('');
  // Output scale factor (1×/2×/3×/4×). Multiplies the rendered pixel
  // dimensions of the export — at 4× a 1080² canvas exports 4320². Vector
  // content (text, shapes, paths) re-rasterises crisply; bitmap images use
  // the high-quality smoothing path configured in Canvas.exportPNG.
  const [scale, setScale] = useState(2);
  const fileRef = useRef(null);

  const handleCsvPick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const parsed = parseCSV(ev.target.result);
      setCsvData(parsed);
    };
    reader.readAsText(file);
  };

  const loadDemo = () => {
    setCsvData({
      headers: ['full_name', 'course_title', 'date'],
      rows: [
        { full_name: 'Amelia Chen', course_title: 'Advanced Typography', date: 'March 15, 2026' },
        { full_name: 'Mateo Reyes', course_title: 'Advanced Typography', date: 'March 15, 2026' },
        { full_name: 'Priya Krishnamurthy', course_title: 'Advanced Typography', date: 'March 15, 2026' },
        { full_name: 'Jonas Weber', course_title: 'Advanced Typography', date: 'March 15, 2026' },
        { full_name: 'Fatima Al-Rashid', course_title: 'Advanced Typography', date: 'March 15, 2026' },
      ],
    });
  };

  // ---- library loaders (on-demand) ---------------------------------------

  const ensureJSZip = async () => {
    if (typeof window === 'undefined') return null;
    if (window.JSZip) return window.JSZip;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.JSZip;
  };

  const ensureJsPDF = async () => {
    if (typeof window === 'undefined') return null;
    // Prefer the installed npm package (jspdf is listed in package.json);
    // fall back to CDN if the module isn't available for some reason.
    try {
      const mod = await import('jspdf');
      const JsPDF = mod.jsPDF || mod.default?.jsPDF || mod.default || mod;
      if (JsPDF) return JsPDF;
    } catch (err) {
      // fall through to CDN
    }
    if (window.jspdf && window.jspdf.jsPDF) return window.jspdf.jsPDF;
    if (window.jsPDF) return window.jsPDF;
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return window.jspdf?.jsPDF || window.jsPDF;
  };

  // ---- helpers -----------------------------------------------------------

  const dataUrlToBlob = (dataUrl) => {
    const [meta, b64] = dataUrl.split(',');
    const mime = meta.match(/data:(.*?);/)[1];
    const bin = atob(b64);
    const len = bin.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: mime });
  };

  /**
   * Build a jsPDF document whose page is sized to match the canvas
   * (landscape if wider-than-tall, portrait otherwise) and stamp the
   * given PNG data URL onto it at full-bleed. Returns the jsPDF instance.
   *
   * We use units of 'pt' (points = 1/72 in). Since Fabric works in CSS
   * pixels, and 1 CSS px ≈ 1 pt at screen DPI, we pass canvas dimensions
   * directly. The embedded PNG is generated at 2× for print quality and
   * scaled down to fit the 1× page, so effective output is ~144 dpi.
   */
  const makePdfFromDataUrl = (JsPDF, dataUrl, pxW, pxH) => {
    const orientation = pxW >= pxH ? 'landscape' : 'portrait';
    const pdf = new JsPDF({
      orientation,
      unit: 'pt',
      format: [pxW, pxH],
      compress: true,
    });
    pdf.addImage(dataUrl, 'PNG', 0, 0, pxW, pxH);
    return pdf;
  };

  // ---- single exports ----------------------------------------------------

  const exportSinglePNG = () => {
    const m = resolveExportMultiplier(scale);
    const dataUrl = canvasRef.current?.exportPNG(m);
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.download = `certificate@${m}x.png`;
    link.href = dataUrl;
    link.click();
  };

  const exportSinglePDF = async () => {
    setIsExporting(true);
    setPhase('Loading PDF engine…');
    try {
      const JsPDF = await ensureJsPDF();
      if (!JsPDF) throw new Error('Failed to load jsPDF');

      const m = resolveExportMultiplier(scale);
      setPhase(`Rendering canvas @ ${m}×…`);
      const dataUrl = canvasRef.current?.exportPNG(m);
      if (!dataUrl) throw new Error('Canvas render failed');

      // PDF page size matches the canvas's intrinsic pixel dimensions
      // (in points) — i.e. the physical size doesn't change with scale.
      // The embedded PNG just carries more pixel data for sharper print.
      const c = canvasRef.current?.getCanvas?.();
      const pxW = c?.getWidth?.() || 1200;
      const pxH = c?.getHeight?.() || 800;

      setPhase('Building PDF…');
      const pdf = makePdfFromDataUrl(JsPDF, dataUrl, pxW, pxH);
      pdf.save('certificate.pdf');
    } catch (err) {
      console.error('PDF export failed:', err);
      setPhase('PDF export failed — see console');
      // Leave the phase visible briefly so the user knows
      await new Promise((r) => setTimeout(r, 1500));
    }
    setIsExporting(false);
    setProgress(0);
    setPhase('');
  };

  // ---- bulk exports ------------------------------------------------------

  /**
   * Generic bulk runner. `makeFilePerRow(i, row, dataUrl) → { name, blob }`
   * is called once per CSV row; the returned file is added to the zip.
   * For the multi-page PDF mode we take a different code path (below).
   */
  const runBulkZip = async (makeFilePerRow, zipName) => {
    if (!csvData || csvData.rows.length === 0) return;
    setIsExporting(true);
    setProgress(0);
    setPhase('Preparing…');

    const JSZip = await ensureJSZip();
    if (!JSZip) { setIsExporting(false); setPhase('Failed to load zip library'); return; }

    const zip = new JSZip();
    const total = csvData.rows.length;
    const m = resolveExportMultiplier(scale);

    for (let i = 0; i < total; i++) {
      const row = csvData.rows[i];
      setPhase(`Rendering ${i + 1} of ${total} @ ${m}×…`);
      await new Promise((r) => setTimeout(r, 10));
      try {
        const dataUrl = await canvasRef.current?.renderWithData(row, m);
        if (dataUrl) {
          const { name, blob } = await makeFilePerRow(i, row, dataUrl);
          zip.file(name, blob);
        }
      } catch (err) {
        console.error('Render failed for row', i, err);
      }
      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setPhase('Compressing ZIP…');
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = zipName;
    link.click();
    URL.revokeObjectURL(url);

    setIsExporting(false);
    setProgress(0);
    setPhase('');
    onClose && onClose();
  };

  const safeRowName = (row, i) =>
    (row[csvData.headers[0]] || `certificate_${i + 1}`)
      .toString()
      .replace(/[^a-z0-9]/gi, '_')
      .slice(0, 60);

  const exportBulkPNG = () =>
    runBulkZip(
      async (i, row, dataUrl) => ({
        name: `${safeRowName(row, i)}.png`,
        blob: dataUrlToBlob(dataUrl),
      }),
      'certificates.zip'
    );

  const exportBulkPDFZip = async () => {
    const JsPDF = await ensureJsPDF();
    if (!JsPDF) { setPhase('Failed to load PDF engine'); return; }
    const c = canvasRef.current?.getCanvas?.();
    const pxW = c?.getWidth?.() || 1200;
    const pxH = c?.getHeight?.() || 800;

    return runBulkZip(
      async (i, row, dataUrl) => {
        const pdf = makePdfFromDataUrl(JsPDF, dataUrl, pxW, pxH);
        const blob = pdf.output('blob');
        return { name: `${safeRowName(row, i)}.pdf`, blob };
      },
      'certificates-pdf.zip'
    );
  };

  /**
   * Multi-page PDF: every row becomes one page in a single PDF file.
   * Uses its own loop (not runBulkZip) because we're building one
   * document, not many files.
   */
  const exportBulkPDFCombined = async () => {
    if (!csvData || csvData.rows.length === 0) return;
    setIsExporting(true);
    setProgress(0);
    setPhase('Loading PDF engine…');

    const JsPDF = await ensureJsPDF();
    if (!JsPDF) { setIsExporting(false); setPhase('Failed to load PDF engine'); return; }

    const c = canvasRef.current?.getCanvas?.();
    const pxW = c?.getWidth?.() || 1200;
    const pxH = c?.getHeight?.() || 800;

    const orientation = pxW >= pxH ? 'landscape' : 'portrait';
    const pdf = new JsPDF({
      orientation,
      unit: 'pt',
      format: [pxW, pxH],
      compress: true,
    });

    const total = csvData.rows.length;
    const m = resolveExportMultiplier(scale);
    for (let i = 0; i < total; i++) {
      const row = csvData.rows[i];
      setPhase(`Rendering page ${i + 1} of ${total} @ ${m}×…`);
      await new Promise((r) => setTimeout(r, 10));
      try {
        const dataUrl = await canvasRef.current?.renderWithData(row, m);
        if (dataUrl) {
          if (i > 0) pdf.addPage([pxW, pxH], orientation);
          pdf.addImage(dataUrl, 'PNG', 0, 0, pxW, pxH);
        }
      } catch (err) {
        console.error('Render failed for row', i, err);
      }
      setProgress(Math.round(((i + 1) / total) * 100));
    }

    setPhase('Saving PDF…');
    pdf.save('certificates.pdf');

    setIsExporting(false);
    setProgress(0);
    setPhase('');
    onClose && onClose();
  };

  return (
    <div className="modal-backdrop" onClick={() => !isExporting && onClose && onClose()}>
      <div
        className="modal-panel"
        style={{ width: 640 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-700">
          <div>
            <div className="section-label mb-1">EXPORT</div>
            <h2 className="panel-heading">Generate Certificates</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isExporting}
            className="text-ember-200/40 hover:text-ember-400 transition-colors disabled:opacity-30"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 100px)' }}>
          {isExporting ? (
            <div className="py-10 text-center">
              <div className="font-display italic text-2xl mb-2 text-ember-50">
                Generating certificates…
              </div>
              <div className="font-mono text-xs text-ember-50/50 tracking-widest uppercase mb-6">
                {phase || `${progress}% complete`}
              </div>
              <div className="progress-track max-w-md mx-auto">
                <div className="progress-fill" style={{ width: `${progress}%` }} />
              </div>
              <div className="mt-3 font-mono text-xs text-ember-400">{progress}%</div>
            </div>
          ) : (
            <>
              {/* SCALE — output upscale factor. Applies to every export below
                  (single PNG/PDF and all bulk paths). 1× exports the canvas
                  at its authored pixel size; 4× quadruples width and height
                  for a 16× pixel-area boost. PDFs keep their physical page
                  size — only the embedded raster gets denser. */}
              <div
                className="p-4 mb-4 rounded-xl"
                style={{ background: '#18120e', border: '1px solid #2a1f18' }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="section-label">Output Scale</div>
                  <div className="font-mono text-[10px] text-ember-50/50 tracking-widest uppercase">
                    {scale}× · {scale * scale}× pixel area
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((s) => (
                    <button
                      key={s}
                      onClick={() => setScale(s)}
                      className="py-2 rounded-lg text-sm font-semibold transition-all"
                      style={{
                        background: scale === s
                          ? 'linear-gradient(135deg, rgba(220,38,38,0.2), rgba(249,115,22,0.15))'
                          : '#2a1f18',
                        border: scale === s
                          ? '1px solid #f97316'
                          : '1px solid #3a2a20',
                        color: scale === s ? '#fed7aa' : '#fef9f0',
                      }}
                    >
                      {s}×
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-ember-50/50 font-mono leading-relaxed">
                  {scale === 1 && 'Original resolution. Smallest file size.'}
                  {scale === 2 && 'Recommended for screen sharing and standard prints.'}
                  {scale === 3 && 'High-fidelity prints. ~2× file size of 2×.'}
                  {scale === 4 && 'Poster / large-format print. Big files — be patient.'}
                </p>
              </div>

              {/* Single */}
              <div
                className="p-4 mb-4 rounded-xl"
                style={{ background: '#18120e', border: '1px solid #2a1f18' }}
              >
                <div className="section-label mb-2">Single Certificate</div>
                <p className="text-xs text-ember-50/60 mb-4 leading-relaxed">
                  Download the current canvas at {scale}× resolution. Choose PNG
                  for sharing online, or PDF for printing.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={exportSinglePNG}
                    className="py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: '#2a1f18',
                      border: '1px solid #3a2a20',
                      color: '#fed7aa',
                    }}
                  >
                    <Download size={14} />
                    Download PNG
                  </button>
                  <button
                    onClick={exportSinglePDF}
                    className="py-3 rounded-lg font-semibold text-sm flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: 'linear-gradient(135deg, rgba(220,38,38,0.15), rgba(249,115,22,0.1))',
                      border: '1px solid rgba(249,115,22,0.4)',
                      color: '#fed7aa',
                    }}
                  >
                    <FileDown size={14} />
                    Download PDF
                  </button>
                </div>
              </div>

              {/* Bulk */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: 'linear-gradient(135deg, rgba(249,115,22,0.08), transparent)',
                  border: '1px solid rgba(249,115,22,0.4)',
                }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={14} className="text-ember-400" />
                  <div className="section-label" style={{ color: '#fb923c' }}>
                    Bulk Generation
                  </div>
                </div>
                <p className="text-xs text-ember-50/70 mb-4 leading-relaxed">
                  Import a CSV where column headers match your <code className="chip" style={{ padding: '1px 5px' }}>{'{{placeholders}}'}</code>.
                  Each row generates one certificate.
                </p>

                {csvData ? (
                  <>
                    <div
                      className="p-3 mb-3 rounded-lg flex items-center gap-3"
                      style={{ background: '#18120e' }}
                    >
                      <Check size={16} className="text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-ember-50">
                          {csvData.rows.length} records ready
                        </div>
                        <div className="text-[10px] font-mono text-ember-50/50 mt-1 truncate">
                          Fields: {csvData.headers.join(', ')}
                        </div>
                      </div>
                      <button
                        onClick={() => setCsvData(null)}
                        className="text-ember-50/40 hover:text-crimson-400 flex-shrink-0"
                      >
                        <X size={14} />
                      </button>
                    </div>

                    <div className="section-label mb-2" style={{ color: '#fb923c' }}>
                      Choose Output Format
                    </div>
                    <div className="flex flex-col gap-2">
                      <button
                        onClick={exportBulkPNG}
                        className="w-full py-3 rounded-lg text-sm font-bold tracking-wider flex items-center justify-center gap-2 transition-all"
                        style={{
                          background: 'linear-gradient(135deg, #dc2626, #f97316)',
                          color: '#fff',
                          boxShadow: '0 6px 20px rgba(220, 38, 38, 0.35)',
                        }}
                      >
                        <Play size={14} strokeWidth={2.5} />
                        Generate {csvData.rows.length} PNGs (ZIP)
                      </button>
                      <button
                        onClick={exportBulkPDFZip}
                        className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                        style={{
                          background: '#2a1f18',
                          border: '1px solid #3a2a20',
                          color: '#fed7aa',
                        }}
                      >
                        <FileDown size={14} />
                        Generate {csvData.rows.length} PDFs (ZIP)
                      </button>
                      <button
                        onClick={exportBulkPDFCombined}
                        className="w-full py-3 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                        style={{
                          background: '#2a1f18',
                          border: '1px solid #3a2a20',
                          color: '#fed7aa',
                        }}
                      >
                        <FileText size={14} />
                        Combine into one PDF ({csvData.rows.length} pages)
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
                      style={{
                        background: 'transparent',
                        border: '1px solid #3a2a20',
                        color: '#fed7aa',
                      }}
                    >
                      <Upload size={14} />
                      Upload CSV
                    </button>
                    <button
                      onClick={loadDemo}
                      className="py-3 px-4 rounded-lg text-sm flex items-center justify-center gap-2 transition-all"
                      style={{
                        background: 'transparent',
                        border: '1px solid #3a2a20',
                        color: '#fed7aa',
                      }}
                    >
                      <Sparkles size={14} />
                      Demo Data
                    </button>
                  </div>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleCsvPick}
                  className="hidden"
                />
              </div>

              <div className="mt-5 p-3 text-[11px] text-ember-50/50 leading-relaxed">
                <FileText size={11} className="inline mr-1 -mt-0.5" />
                <strong className="text-ember-50/70">CSV format:</strong> first row must
                contain column headers (e.g. <code className="chip" style={{ padding: '1px 5px' }}>full_name</code>),
                matching your canvas placeholders. Exports render at {scale}× scale (set above).
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
