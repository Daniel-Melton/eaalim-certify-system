'use client';

import { BrandingProvider } from '@/lib/brandingContext';
import { CustomFontsProvider } from '@/lib/customFontsContext';
import { ProjectProvider } from '@/lib/projectContext';
import { ThemeProvider } from '@/lib/themeContext';

/**
 * Layout.js
 * Top-level shell for Elite Certify.
 * - ThemeProvider         — light / dark toggle for the whole app UI
 * - BrandingContext       — app title + logo
 * - CustomFontsContext    — user-imported fonts (registered on page load)
 * - ProjectContext        — config passed from landing page to /editor
 *                          (project name, canvas size, initial template,
 *                           imported background image)
 */
export default function Layout({ children }) {
  return (
    <ThemeProvider>
      <BrandingProvider>
        <CustomFontsProvider>
          <ProjectProvider>
            <div className="relative w-screen h-screen overflow-hidden">
              {children}
            </div>
          </ProjectProvider>
        </CustomFontsProvider>
      </BrandingProvider>
    </ThemeProvider>
  );
}
