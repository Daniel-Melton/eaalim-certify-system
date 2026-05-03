'use client';

import { useRouter } from 'next/navigation';
import { Sparkles } from 'lucide-react';
import { TEMPLATES } from '@/lib/templates';
import { useProject, PAGE_SIZES } from '@/lib/projectContext';

/**
 * TemplatesTab.js
 *
 * Tab B: grid of premade internal templates. Clicking one writes it into
 * ProjectContext as `initialTemplate` and routes to /editor. The editor then
 * loads the template on mount using the existing canvasRef.loadTemplate() API.
 *
 * Canvas size is inferred from the template's own elements (all internal
 * templates are landscape 1200×600 as per lib/templates.js), so we override
 * canvasSize to the matching classic-landscape preset.
 */
export default function TemplatesTab() {
  const router = useRouter();
  const { setProject } = useProject();

  const handleSelect = (tpl) => {
    // All internal templates are authored for 1200×600 landscape (see templates.js)
    const canvasSize = PAGE_SIZES.find((s) => s.id === 'custom-landscape') || PAGE_SIZES[0];
    setProject({
      mode: 'template',
      projectName: tpl.name,
      canvasSize,
      canvasBg: tpl.bg || '#ffffff',
      initialTemplate: tpl,
      importedBackground: null,
    });
    router.push('/editor');
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={14} className="text-ember-400" />
        <span className="text-[10px] font-mono tracking-widest uppercase text-ember-50/60">
          {TEMPLATES.length} Premium Templates
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {TEMPLATES.map((t) => (
          <button
            key={t.id}
            onClick={() => handleSelect(t)}
            className="group relative aspect-[2/1] rounded-xl overflow-hidden transition-all hover:scale-[1.03] hover:shadow-ember-glow"
            style={{
              background: t.thumbnail?.bg || '#2a1f18',
              border: '1px solid #2a1f18',
            }}
            title={t.description}
          >
            <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
              <div
                className="font-display font-bold text-2xl mb-1"
                style={{ color: t.thumbnail?.accent || '#fff' }}
              >
                {t.name.split(' ')[0]}
              </div>
              <div
                className="font-display italic text-sm opacity-75 mb-2"
                style={{ color: t.thumbnail?.accent || '#fff' }}
              >
                {t.name.split(' ').slice(1).join(' ')}
              </div>
              <div
                className="h-px w-12 my-2"
                style={{ background: t.thumbnail?.accent || '#fff' }}
              />
              <div
                className="font-mono text-[9px] tracking-widest opacity-50"
                style={{ color: t.thumbnail?.accent || '#fff' }}
              >
                CERTIFICATE
              </div>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity">
              <span
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold"
                style={{ background: 'linear-gradient(135deg, #dc2626, #f97316)' }}
              >
                Open in Editor →
              </span>
            </div>

            {/* Description footer */}
            <div className="absolute bottom-0 left-0 right-0 px-3 py-1.5 bg-black/40 backdrop-blur-sm text-[10px] text-white/80 text-left truncate opacity-0 group-hover:opacity-100 transition-opacity">
              {t.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
