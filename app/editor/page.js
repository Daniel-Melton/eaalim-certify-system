'use client';

import Studio from '@/components/Studio';

/**
 * /editor route — the design workspace.
 *
 * Studio reads the project config (name, canvas size, initial template,
 * imported background) from ProjectContext. If the user navigates here
 * directly without going through the landing page, Studio falls back to
 * its defaults (landscape, blank canvas) — see Studio.js.
 */
export default function EditorPage() {
  return <Studio />;
}
