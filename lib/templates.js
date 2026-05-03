// Premium "Formal Excellence" templates for Elite Certify
// Each template defines a full canvas state with elements, fills, and fonts.
//
// Placeholder substitution lifecycle
// ----------------------------------
// Three placeholder vocabularies coexist:
//
//   {{brand}}        — substituted at TEMPLATE LOAD time from BrandingContext
//                      (`appTitle`). One value per project; it lives in the
//                      ribbon header. Kept on the canvas as plain text so
//                      the user can edit it per-document if they want.
//   {{project_name}} — substituted at TEMPLATE LOAD time from ProjectContext
//                      (`projectName`). Same lifecycle as {{brand}}.
//   {{full_name}},
//   {{course_title}},
//   {{date}},
//   {{instructor}}   — left in place at template load. Substituted at
//                      EXPORT time per CSV row (see Canvas.renderWithData).
//                      The user sees the literal `{{full_name}}` token in
//                      the editor and bulk-fills the field via the Data
//                      panel + CSV upload.
//
// The Studio component owns the load-time substitution map and forwards it
// to canvasRef.loadTemplate(), so adding a new placeholder vocabulary is a
// single-site change. CSV-time substitution stays in renderWithData().
//
// Template gallery
// ----------------
// The first template ('classical-gold-flourish') is the legacy / fallback
// design. The other seven span four high-fidelity style buckets, two per
// bucket where space permits, so the gallery genuinely showcases visual
// variety rather than seven variations of the same border + serif.
//
//   Modern Geometric    — sharp angles, dark backgrounds, neon accents,
//                         bold sans typography. Two designs.
//   Elegant Serif       — thin borders, floral / leaf SVG corner accents,
//                         Old Style serif typography. Two designs.
//   Minimalist Corporate — clean lines, sidebar for logo / seal, blue /
//                          slate professional palettes. Two designs.
//   Vintage Diploma     — heavy intertwined SVG border, parchment ground,
//                         calligraphy display type. One design.
//
// Every template uses the same dynamic placeholder system, so they all
// slot into the bulk-CSV generation pipeline without further work.

// ===========================================================================
// REUSABLE SVG FRAGMENTS
//
// Every flourish is authored at a 200×200 viewBox (or 400×60 for horizontal
// runs) and the template scales it to the desired pixel size. Authoring at
// a uniform viewBox keeps the loader's `scaleX = w / svg.width` math
// straightforward across templates.
// ===========================================================================

// --- Classical (template[0]) -----------------------------------------------
const CLASSICAL_CORNER_FLOURISH = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="goldGradient" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%"  stop-color="#a98443"/>
      <stop offset="50%" stop-color="#d4a85a"/>
      <stop offset="100%" stop-color="#7a5a23"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#goldGradient)" stroke-width="1.6" stroke-linecap="round">
    <path d="M20 180 Q20 100 60 60 Q100 25 180 20"/>
    <path d="M40 180 Q40 120 75 95 Q110 75 165 70"/>
    <path d="M155 25 Q170 30 168 45 Q160 55 148 50"/>
    <path d="M70 65 Q60 50 50 55 Q55 70 70 65" fill="url(#goldGradient)" stroke="none"/>
    <path d="M105 50 Q100 38 90 42 Q92 55 105 50" fill="url(#goldGradient)" stroke="none"/>
    <path d="M138 38 Q132 28 124 32 Q126 44 138 38" fill="url(#goldGradient)" stroke="none"/>
    <path d="M30 145 Q22 152 28 162 Q38 162 38 152"/>
    <circle cx="180" cy="20" r="2.5" fill="url(#goldGradient)"/>
    <circle cx="20"  cy="180" r="2.5" fill="url(#goldGradient)"/>
    <circle cx="125" cy="55" r="1.5" fill="url(#goldGradient)"/>
    <circle cx="60"  cy="130" r="1.5" fill="url(#goldGradient)"/>
  </g>
</svg>
`.trim();

const CLASSICAL_TOP_FLOURISH = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 60">
  <defs>
    <linearGradient id="goldH" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#a98443" stop-opacity="0"/>
      <stop offset="20%"  stop-color="#a98443"/>
      <stop offset="50%"  stop-color="#d4a85a"/>
      <stop offset="80%"  stop-color="#a98443"/>
      <stop offset="100%" stop-color="#a98443" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#goldH)" stroke-width="1.4" stroke-linecap="round">
    <circle cx="200" cy="30" r="6"/>
    <circle cx="200" cy="30" r="2.5" fill="url(#goldH)"/>
    <path d="M40 30 Q120 18 188 30"/>
    <path d="M212 30 Q280 18 360 30"/>
    <path d="M70 30 Q130 38 184 30"/>
    <path d="M216 30 Q270 38 330 30"/>
    <path d="M120 22 Q115 14 108 18 Q112 28 120 22" fill="url(#goldH)" stroke="none"/>
    <path d="M280 22 Q285 14 292 18 Q288 28 280 22" fill="url(#goldH)" stroke="none"/>
    <path d="M155 36 Q150 44 158 46 Q162 40 155 36" fill="url(#goldH)" stroke="none"/>
    <path d="M245 36 Q250 44 242 46 Q238 40 245 36" fill="url(#goldH)" stroke="none"/>
    <circle cx="40"  cy="30" r="1.6" fill="url(#goldH)"/>
    <circle cx="360" cy="30" r="1.6" fill="url(#goldH)"/>
  </g>
</svg>
`.trim();

// --- Modern Geometric: "Neon Vector" ---------------------------------------
// Sharp diamond cluster + thin laser bar. Magenta on near-black. Shapes are
// deliberately angular (no curves) so the design reads as architectural at
// any size.
const NEON_DIAMOND_CLUSTER = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="neonMagenta" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#f0abfc"/>
      <stop offset="60%"  stop-color="#d946ef"/>
      <stop offset="100%" stop-color="#a21caf"/>
    </linearGradient>
    <linearGradient id="neonCyan" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#67e8f9"/>
      <stop offset="100%" stop-color="#0891b2"/>
    </linearGradient>
  </defs>
  <polygon points="100,20 180,100 100,180 20,100" fill="url(#neonMagenta)"/>
  <polygon points="100,55 145,100 100,145 55,100" fill="none" stroke="#fefce8" stroke-width="1.5"/>
  <polygon points="100,85 115,100 100,115 85,100" fill="#fefce8"/>
  <polygon points="0,80 14,100 0,120" fill="url(#neonCyan)"/>
  <polygon points="200,80 186,100 200,120" fill="url(#neonCyan)"/>
</svg>
`.trim();

const NEON_LASER_BAR = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 30">
  <defs>
    <linearGradient id="laserH" x1="0" y1="0" x2="400" y2="0" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#d946ef" stop-opacity="0"/>
      <stop offset="20%"  stop-color="#d946ef"/>
      <stop offset="50%"  stop-color="#67e8f9"/>
      <stop offset="80%"  stop-color="#d946ef"/>
      <stop offset="100%" stop-color="#d946ef" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect x="0" y="13" width="400" height="2" fill="url(#laserH)"/>
  <rect x="0" y="9"  width="400" height="1" fill="url(#laserH)" opacity="0.4"/>
  <rect x="0" y="18" width="400" height="1" fill="url(#laserH)" opacity="0.4"/>
  <polygon points="6,14 14,6 22,14 14,22" fill="#d946ef"/>
  <polygon points="378,14 386,6 394,14 386,22" fill="#d946ef"/>
</svg>
`.trim();

// --- Modern Geometric: "Cyber Grid" ----------------------------------------
// Asymmetric stepped corner block on a charcoal field with a single vivid
// lime accent. Reads as engineering / technical achievement.
const CYBER_CORNER_BLOCK = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="charcoalG" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#1f2937"/>
      <stop offset="100%" stop-color="#0b0f15"/>
    </linearGradient>
  </defs>
  <polygon points="0,200 0,40 60,40 60,80 100,80 100,120 140,120 140,160 200,160 200,200"
           fill="url(#charcoalG)"/>
  <polygon points="200,160 140,160 140,120 200,120" fill="#a3e635"/>
  <line x1="60"  y1="40"  x2="60"  y2="200" stroke="#475569" stroke-width="0.5"/>
  <line x1="100" y1="80"  x2="100" y2="200" stroke="#475569" stroke-width="0.5"/>
  <line x1="140" y1="120" x2="140" y2="200" stroke="#475569" stroke-width="0.5"/>
  <circle cx="60"  cy="40"  r="2" fill="#a3e635"/>
  <circle cx="100" cy="80"  r="2" fill="#a3e635"/>
  <circle cx="140" cy="120" r="2" fill="#a3e635"/>
</svg>
`.trim();

// --- Elegant Serif: "Botanical Atelier" ------------------------------------
// Curved botanical sprig with ivy leaves. Sage-green on cream. Each leaf is
// its own filled path so the hand-drawn quality survives recolouring.
const BOTANICAL_SPRIG = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g fill="none" stroke="#5e7355" stroke-width="1.2" stroke-linecap="round">
    <path d="M30 170 Q40 110 90 80 Q140 55 170 30"/>
    <path d="M55 130 Q65 110 90 100"/>
    <path d="M85 90  Q105 75 130 70"/>
    <path d="M120 65 Q138 52 155 45"/>
  </g>
  <g fill="#7a9070">
    <path d="M50 132 Q42 116 56 110 Q66 122 50 132 Z"/>
    <path d="M85 102 Q72 92 86 80 Q98 92 85 102 Z"/>
    <path d="M120 72 Q108 60 122 50 Q134 64 120 72 Z"/>
    <path d="M150 50 Q140 38 154 32 Q166 42 150 50 Z"/>
  </g>
  <g fill="#a3b89a">
    <path d="M62 144 Q72 132 85 138 Q78 152 62 144 Z"/>
    <path d="M100 108 Q112 96 124 102 Q116 116 100 108 Z"/>
    <path d="M138 78 Q148 66 162 72 Q154 86 138 78 Z"/>
  </g>
  <circle cx="170" cy="30" r="3" fill="#dba8a8"/>
  <circle cx="170" cy="30" r="1.5" fill="#fef2f2"/>
</svg>
`.trim();

// --- Elegant Serif: "Ivoire Floral" ----------------------------------------
// Symmetrical fleur-de-lys-inspired corner ornament. Burgundy on ivory.
// Strictly classical, suitable for academic / honorary documents.
const IVOIRE_FLEUR = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g fill="#7a1f2b">
    <path d="M100 30 Q92 70 100 110 Q108 70 100 30 Z"/>
    <path d="M100 80 Q70 60 50 90 Q70 95 100 95 Z"/>
    <path d="M100 80 Q130 60 150 90 Q130 95 100 95 Z"/>
    <path d="M100 105 Q80 130 60 155 Q90 145 100 130 Q110 145 140 155 Q120 130 100 105 Z"/>
    <rect x="65" y="93" width="70" height="3" rx="1.5"/>
    <circle cx="100" cy="30"  r="2.5"/>
    <circle cx="50"  cy="90"  r="2"/>
    <circle cx="150" cy="90"  r="2"/>
  </g>
  <g fill="none" stroke="#a98443" stroke-width="0.6">
    <path d="M100 32 Q94 68 100 105 Q106 68 100 32"/>
    <path d="M65 94 L135 94"/>
  </g>
</svg>
`.trim();

// --- Vintage Diploma: "Heirloom" -------------------------------------------
// Heavy intertwined cable-knot border, sized to wrap a full corner. Designed
// to read as engraved at print sizes. Sepia stroke on parchment.
const HEIRLOOM_KNOT = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <defs>
    <linearGradient id="sepia" x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse">
      <stop offset="0%"   stop-color="#7a4a18"/>
      <stop offset="100%" stop-color="#3d2410"/>
    </linearGradient>
  </defs>
  <g fill="none" stroke="url(#sepia)" stroke-width="2.5" stroke-linecap="round">
    <path d="M10 190 Q10 60 60 30 Q120 0 190 10"/>
    <path d="M30 190 Q30 80 80 50 Q130 25 190 30"/>
    <path d="M10 170 Q70 130 110 80 Q150 30 190 10"/>
    <path d="M30 170 Q90 110 130 80 Q160 50 170 30"/>
  </g>
  <g fill="none" stroke="url(#sepia)" stroke-width="1" stroke-linecap="round">
    <path d="M70 90 L80 80"/>
    <path d="M85 75 L95 65"/>
    <path d="M100 60 L110 50"/>
    <path d="M115 45 L125 35"/>
    <path d="M50 130 L60 120"/>
    <path d="M65 115 L75 105"/>
    <circle cx="105" cy="105" r="7"/>
    <circle cx="105" cy="105" r="3" fill="url(#sepia)"/>
  </g>
  <circle cx="190" cy="10" r="4" fill="url(#sepia)"/>
  <circle cx="10" cy="190" r="4" fill="url(#sepia)"/>
</svg>
`.trim();

// --- Minimalist Corporate: "Slate Seal" ------------------------------------
// Concentric circle seal with a thin laurel-like inner ring. Used in the
// sidebar of the corporate templates so the brand mark has a "stamp" rather
// than just text.
const CORPORATE_SEAL = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200">
  <g fill="none" stroke="#cbd5e1" stroke-width="1.5">
    <circle cx="100" cy="100" r="86"/>
    <circle cx="100" cy="100" r="74"/>
  </g>
  <g fill="none" stroke="#94a3b8" stroke-width="0.8" stroke-dasharray="2 4">
    <circle cx="100" cy="100" r="62"/>
  </g>
  <g fill="#1e293b">
    <polygon points="100,55 120,90 100,75 80,90"/>
    <rect x="90" y="92" width="20" height="3"/>
    <rect x="80" y="100" width="40" height="3"/>
  </g>
  <g fill="#94a3b8">
    <rect x="99" y="14" width="2" height="8"/>
    <rect x="99" y="178" width="2" height="8"/>
    <rect x="14" y="99" width="8" height="2"/>
    <rect x="178" y="99" width="8" height="2"/>
  </g>
</svg>
`.trim();

// ===========================================================================
// TEMPLATE GALLERY
// ===========================================================================

export const TEMPLATES = [
  // -------------------------------------------------------------------------
  // 1. CLASSICAL — "Gold Flourish" (legacy / fallback)
  //
  // Kept as the first template because it's the historical default the rest
  // of the codebase loads when `mode === 'default'`. Aesthetic: Victorian /
  // academic ivory paper, double gold border, layered corner flourishes,
  // burgundy + gold serif typography.
  // -------------------------------------------------------------------------
  {
    id: 'classical-gold-flourish',
    name: 'Classical Gold Flourish',
    description: 'Double-gold border, corner filigree, formal serifs',
    orientation: 'landscape',
    bg: '#fffdf6',
    thumbnail: { bg: 'linear-gradient(135deg, #fffdf6, #f7e8c8)', accent: '#a98443' },
    elements: [
      // Triple gold border
      { type: 'rect', left: 25, top: 25, width: 1150, height: 550, fill: 'transparent', stroke: '#a98443', strokeWidth: 3 },
      { type: 'rect', left: 40, top: 40, width: 1120, height: 520, fill: 'transparent', stroke: '#d4a85a', strokeWidth: 1 },
      { type: 'rect', left: 50, top: 50, width: 1100, height: 500, fill: 'transparent', stroke: '#a98443', strokeWidth: 0.5 },

      // Corner flourishes (rotated copies so curls always face inward)
      { type: 'svg', svg: CLASSICAL_CORNER_FLOURISH, left: 125,  top: 125, width: 130, height: 130, angle: 0,   originX: 'center', originY: 'center' },
      { type: 'svg', svg: CLASSICAL_CORNER_FLOURISH, left: 1075, top: 125, width: 130, height: 130, angle: 90,  originX: 'center', originY: 'center' },
      { type: 'svg', svg: CLASSICAL_CORNER_FLOURISH, left: 1075, top: 475, width: 130, height: 130, angle: 180, originX: 'center', originY: 'center' },
      { type: 'svg', svg: CLASSICAL_CORNER_FLOURISH, left: 125,  top: 475, width: 130, height: 130, angle: 270, originX: 'center', originY: 'center' },

      // Top decorative flourish
      { type: 'svg', svg: CLASSICAL_TOP_FLOURISH, left: 600, top: 100, width: 360, height: 50, originX: 'center' },

      // Header
      { type: 'text', left: 600, top: 155, width: 1000, text: 'CERTIFICATE OF EXCELLENCE',
        fontSize: 30, fontFamily: 'Playfair Display', fill: '#7a5a23',
        fontWeight: 700, charSpacing: 600, textAlign: 'center', originX: 'center' },
      { type: 'text', left: 600, top: 200, width: 800, text: 'in recognition of distinguished achievement',
        fontSize: 14, fontFamily: 'Cormorant Garamond', fill: '#7a5a23',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Hairline divider
      { type: 'rect', left: 540, top: 235, width: 120, height: 1, fill: '#a98443', originX: 'center' },

      // Presented to
      { type: 'text', left: 600, top: 255, width: 600, text: 'this certificate is proudly presented to',
        fontSize: 12, fontFamily: 'Cormorant Garamond', fill: '#6b4520',
        charSpacing: 200, fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Name (focal element)
      { type: 'text', left: 600, top: 295, width: 1000, text: '{{full_name}}',
        fontSize: 56, fontFamily: 'Playfair Display', fill: '#18120e',
        fontWeight: 700, fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Hairline divider
      { type: 'rect', left: 540, top: 380, width: 120, height: 1, fill: '#d4a85a', originX: 'center' },

      // Recital
      { type: 'text', left: 600, top: 405, width: 800, text: 'for outstanding accomplishment in',
        fontSize: 13, fontFamily: 'Cormorant Garamond', fill: '#7a5a23',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },
      { type: 'text', left: 600, top: 435, width: 900, text: '{{course_title}}',
        fontSize: 24, fontFamily: 'Cormorant Garamond', fill: '#7a5a23',
        fontWeight: 600, textAlign: 'center', originX: 'center' },

      // Signature row
      { type: 'rect', left: 200, top: 510, width: 200, height: 1, fill: '#18120e' },
      { type: 'text', left: 300, top: 518, width: 250, text: '{{date}}',
        fontSize: 11, fontFamily: 'Cormorant Garamond', fill: '#18120e',
        textAlign: 'center', originX: 'center' },
      { type: 'text', left: 300, top: 535, width: 250, text: 'DATE OF ISSUE',
        fontSize: 9, fontFamily: 'Inter', fill: '#a98443',
        charSpacing: 400, textAlign: 'center', originX: 'center' },

      { type: 'rect', left: 800, top: 510, width: 200, height: 1, fill: '#18120e' },
      { type: 'text', left: 900, top: 516, width: 250, text: '{{instructor}}',
        fontSize: 13, fontFamily: 'Great Vibes', fill: '#18120e',
        textAlign: 'center', originX: 'center' },
      { type: 'text', left: 900, top: 535, width: 250, text: 'AUTHORIZED · {{brand}}',
        fontSize: 9, fontFamily: 'Inter', fill: '#a98443',
        charSpacing: 400, textAlign: 'center', originX: 'center' },
    ],
  },

  // =========================================================================
  // MODERN GEOMETRIC × 2
  // =========================================================================

  // -------------------------------------------------------------------------
  // 2. MODERN — "Neon Vector"
  //
  // Dark-mode background (deep ink #0b0f15) with electric magenta + cyan
  // diamond cluster as the focal accent. Bold sans (Montserrat) at scale,
  // monospace metadata. Composition is asymmetric: name flush-left, diamond
  // anchoring the right. Designed for tech / startup / hackathon-style
  // certificates where "formal" reads as "sterile" and the audience
  // expects something with edge.
  // -------------------------------------------------------------------------
  {
    id: 'modern-neon-vector',
    name: 'Modern Neon Vector',
    description: 'Dark mode, magenta neon diamonds, geometric sans display',
    orientation: 'landscape',
    bg: '#0b0f15',
    thumbnail: { bg: 'linear-gradient(135deg, #0b0f15, #581c87)', accent: '#d946ef' },
    elements: [
      // Hairline magenta inset border
      { type: 'rect', left: 30, top: 30, width: 1140, height: 540, fill: 'transparent', stroke: '#d946ef', strokeWidth: 1 },

      // Diamond cluster, top-right focal point
      { type: 'svg', svg: NEON_DIAMOND_CLUSTER, left: 1000, top: 60, width: 140, height: 140 },

      // Top label
      { type: 'text', left: 80, top: 70, width: 600, text: 'CERTIFICATE OF ACHIEVEMENT',
        fontSize: 11, fontFamily: 'Inter', fill: '#d946ef',
        fontWeight: 700, charSpacing: 800 },
      { type: 'text', left: 80, top: 92, width: 600, text: '// {{brand}}',
        fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#67e8f9',
        charSpacing: 200 },

      // Awarded preamble
      { type: 'text', left: 80, top: 200, width: 600, text: 'awarded to',
        fontSize: 14, fontFamily: 'Inter', fill: '#94a3b8',
        fontWeight: 400 },

      // Name — massive sans
      { type: 'text', left: 80, top: 230, width: 1000, text: '{{full_name}}',
        fontSize: 64, fontFamily: 'Montserrat', fill: '#fefce8',
        fontWeight: 800 },

      // Neon laser bar separator
      { type: 'svg', svg: NEON_LASER_BAR, left: 80, top: 340, width: 400, height: 30 },

      // Recital
      { type: 'text', left: 80, top: 385, width: 800, text: 'for successful completion of',
        fontSize: 13, fontFamily: 'Inter', fill: '#94a3b8' },
      { type: 'text', left: 80, top: 410, width: 1000, text: '{{course_title}}',
        fontSize: 24, fontFamily: 'Montserrat', fill: '#f0abfc',
        fontWeight: 600 },

      // Bottom row: issued / conferring / project
      { type: 'rect', left: 80, top: 510, width: 1040, height: 1, fill: '#1f2937' },

      { type: 'text', left: 80, top: 525, width: 300, text: 'ISSUED',
        fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#67e8f9',
        charSpacing: 400 },
      { type: 'text', left: 80, top: 545, width: 300, text: '{{date}}',
        fontSize: 13, fontFamily: 'Inter', fill: '#fefce8',
        fontWeight: 500 },

      { type: 'text', left: 600, top: 525, width: 300, text: 'CONFERRED BY',
        fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#67e8f9',
        charSpacing: 400 },
      { type: 'text', left: 600, top: 545, width: 300, text: '{{instructor}}',
        fontSize: 13, fontFamily: 'Inter', fill: '#fefce8',
        fontWeight: 500 },

      { type: 'text', left: 1120, top: 525, width: 300, text: 'PROJECT',
        fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#67e8f9',
        charSpacing: 400, textAlign: 'right', originX: 'right' },
      { type: 'text', left: 1120, top: 545, width: 300, text: '{{project_name}}',
        fontSize: 13, fontFamily: 'Inter', fill: '#fefce8',
        fontWeight: 500, textAlign: 'right', originX: 'right' },
    ],
  },

  // -------------------------------------------------------------------------
  // 3. MODERN — "Cyber Grid"
  //
  // Charcoal field with a stepped corner block in the bottom-right (each
  // step rendered as a discrete polygon for crispness at any export size).
  // Lime accents punctuate the steps. Inter throughout — no serifs at all.
  // Reads like a build-system dashboard or terminal HUD; appropriate for
  // technical training, programming bootcamps, security certifications.
  // -------------------------------------------------------------------------
  {
    id: 'modern-cyber-grid',
    name: 'Modern Cyber Grid',
    description: 'Charcoal field, lime accents, stepped angular composition',
    orientation: 'landscape',
    bg: '#111827',
    thumbnail: { bg: 'linear-gradient(135deg, #111827, #4d7c0f)', accent: '#a3e635' },
    elements: [
      // Top accent bar — full width, lime hairline
      { type: 'rect', left: 0, top: 0, width: 1200, height: 4, fill: '#a3e635' },

      // Stepped corner block, bottom-right
      { type: 'svg', svg: CYBER_CORNER_BLOCK, left: 920, top: 320, width: 280, height: 280 },

      // Header column
      { type: 'text', left: 70, top: 70, width: 700, text: 'CERTIFICATE',
        fontSize: 14, fontFamily: 'Inter', fill: '#a3e635',
        fontWeight: 700, charSpacing: 1000 },
      { type: 'text', left: 70, top: 95, width: 700, text: 'OF · COMPLETION',
        fontSize: 14, fontFamily: 'Inter', fill: '#94a3b8',
        fontWeight: 600, charSpacing: 1000 },

      // Issue ID — mono
      { type: 'text', left: 70, top: 135, width: 600, text: '> ID //{{date}}',
        fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#64748b',
        charSpacing: 200 },

      // Brand watermark (top-right, mono)
      { type: 'text', left: 1130, top: 70, width: 400, text: '{{brand}}',
        fontSize: 11, fontFamily: 'JetBrains Mono', fill: '#a3e635',
        charSpacing: 400, textAlign: 'right', originX: 'right' },

      // Awarded preamble
      { type: 'text', left: 70, top: 230, width: 600, text: 'AWARDED · TO',
        fontSize: 10, fontFamily: 'JetBrains Mono', fill: '#94a3b8',
        charSpacing: 600 },

      // Name
      { type: 'text', left: 70, top: 260, width: 1000, text: '{{full_name}}',
        fontSize: 56, fontFamily: 'Inter', fill: '#fefce8',
        fontWeight: 800 },

      // Lime accent stub
      { type: 'rect', left: 70, top: 360, width: 60, height: 4, fill: '#a3e635' },

      // Recital
      { type: 'text', left: 70, top: 385, width: 800, text: 'for successful completion of the program',
        fontSize: 13, fontFamily: 'Inter', fill: '#cbd5e1' },
      { type: 'text', left: 70, top: 410, width: 800, text: '{{course_title}}',
        fontSize: 26, fontFamily: 'Inter', fill: '#fefce8',
        fontWeight: 700 },

      // Bottom metadata row
      { type: 'text', left: 70, top: 530, width: 200, text: 'INSTRUCTOR',
        fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#a3e635',
        charSpacing: 400 },
      { type: 'text', left: 70, top: 550, width: 300, text: '{{instructor}}',
        fontSize: 12, fontFamily: 'Inter', fill: '#fefce8',
        fontWeight: 500 },

      { type: 'text', left: 360, top: 530, width: 200, text: 'PROGRAM',
        fontSize: 9, fontFamily: 'JetBrains Mono', fill: '#a3e635',
        charSpacing: 400 },
      { type: 'text', left: 360, top: 550, width: 400, text: '{{project_name}}',
        fontSize: 12, fontFamily: 'Inter', fill: '#fefce8',
        fontWeight: 500 },
    ],
  },

  // =========================================================================
  // ELEGANT SERIF × 2
  // =========================================================================

  // -------------------------------------------------------------------------
  // 4. ELEGANT SERIF — "Botanical Atelier"
  //
  // Cream paper, hairline sage-green frame, hand-drawn ivy sprigs in the
  // four corners (rotated copies of the same SVG so foliage curls inward).
  // Cormorant for body, Playfair italic for the focal name. Reads as
  // gallery / atelier / wellness / yoga teacher trainings.
  // -------------------------------------------------------------------------
  {
    id: 'elegant-botanical',
    name: 'Elegant Botanical Atelier',
    description: 'Sage-green ivy sprigs, hairline frame, Old Style serifs',
    orientation: 'landscape',
    bg: '#fbf7ee',
    thumbnail: { bg: 'linear-gradient(135deg, #fbf7ee, #c8d6b8)', accent: '#5e7355' },
    elements: [
      // Single hairline frame — Elegant Serif's "thin border" requirement
      { type: 'rect', left: 60, top: 60, width: 1080, height: 480, fill: 'transparent', stroke: '#5e7355', strokeWidth: 0.8 },

      // Botanical sprigs, four corners — rotated so leaves face inward
      { type: 'svg', svg: BOTANICAL_SPRIG, left: 100,  top: 100, width: 110, height: 110, angle: 0,   originX: 'center', originY: 'center' },
      { type: 'svg', svg: BOTANICAL_SPRIG, left: 1100, top: 100, width: 110, height: 110, angle: 90,  originX: 'center', originY: 'center' },
      { type: 'svg', svg: BOTANICAL_SPRIG, left: 1100, top: 500, width: 110, height: 110, angle: 180, originX: 'center', originY: 'center' },
      { type: 'svg', svg: BOTANICAL_SPRIG, left: 100,  top: 500, width: 110, height: 110, angle: 270, originX: 'center', originY: 'center' },

      // Brand mark (small, top-centred)
      { type: 'text', left: 600, top: 110, width: 400, text: '— {{brand}} —',
        fontSize: 11, fontFamily: 'Cormorant Garamond', fill: '#5e7355',
        fontStyle: 'italic', charSpacing: 400, textAlign: 'center', originX: 'center' },

      // Header
      { type: 'text', left: 600, top: 155, width: 800, text: 'Certificate of Recognition',
        fontSize: 30, fontFamily: 'Cormorant Garamond', fill: '#3a4530',
        fontWeight: 600, fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Decorative dot trinity
      { type: 'text', left: 600, top: 205, width: 200, text: '· · ·',
        fontSize: 16, fontFamily: 'Cormorant Garamond', fill: '#7a9070',
        textAlign: 'center', originX: 'center' },

      // Recital preamble
      { type: 'text', left: 600, top: 240, width: 600, text: 'with sincere appreciation, this is presented to',
        fontSize: 13, fontFamily: 'Cormorant Garamond', fill: '#5e7355',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Name — Playfair italic
      { type: 'text', left: 600, top: 280, width: 1000, text: '{{full_name}}',
        fontSize: 54, fontFamily: 'Playfair Display', fill: '#3a4530',
        fontWeight: 500, fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Hairline beneath name
      { type: 'rect', left: 540, top: 360, width: 120, height: 0.8, fill: '#5e7355', originX: 'center' },

      // Course
      { type: 'text', left: 600, top: 380, width: 800, text: 'in recognition of completion of',
        fontSize: 12, fontFamily: 'Cormorant Garamond', fill: '#5e7355',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },
      { type: 'text', left: 600, top: 410, width: 900, text: '{{course_title}}',
        fontSize: 22, fontFamily: 'Cormorant Garamond', fill: '#3a4530',
        fontWeight: 600, textAlign: 'center', originX: 'center' },

      // Signature row
      { type: 'rect', left: 230, top: 500, width: 180, height: 0.8, fill: '#3a4530' },
      { type: 'text', left: 320, top: 510, width: 220, text: '{{date}}',
        fontSize: 11, fontFamily: 'Cormorant Garamond', fill: '#3a4530',
        textAlign: 'center', originX: 'center' },
      { type: 'text', left: 320, top: 528, width: 220, text: 'date of issue',
        fontSize: 9, fontFamily: 'Cormorant Garamond', fill: '#7a9070',
        fontStyle: 'italic', charSpacing: 200, textAlign: 'center', originX: 'center' },

      { type: 'rect', left: 790, top: 500, width: 180, height: 0.8, fill: '#3a4530' },
      { type: 'text', left: 880, top: 506, width: 220, text: '{{instructor}}',
        fontSize: 14, fontFamily: 'Great Vibes', fill: '#3a4530',
        textAlign: 'center', originX: 'center' },
      { type: 'text', left: 880, top: 528, width: 220, text: 'authorised signature',
        fontSize: 9, fontFamily: 'Cormorant Garamond', fill: '#7a9070',
        fontStyle: 'italic', charSpacing: 200, textAlign: 'center', originX: 'center' },
    ],
  },

  // -------------------------------------------------------------------------
  // 5. ELEGANT SERIF — "Ivoire Floral"
  //
  // Ivory paper, double thin burgundy frame, fleur-de-lys-style ornaments
  // in the corners. Playfair Display dominates; small-caps Inter for
  // metadata labels. Reads as honorary / formal / academic recognition.
  // -------------------------------------------------------------------------
  {
    id: 'elegant-ivoire-floral',
    name: 'Elegant Ivoire Floral',
    description: 'Burgundy fleurs, double thin border, Playfair italic',
    orientation: 'landscape',
    bg: '#fcf8f1',
    thumbnail: { bg: 'linear-gradient(135deg, #fcf8f1, #fde2e4)', accent: '#7a1f2b' },
    elements: [
      // Double thin burgundy frame
      { type: 'rect', left: 50, top: 50, width: 1100, height: 500, fill: 'transparent', stroke: '#7a1f2b', strokeWidth: 1.2 },
      { type: 'rect', left: 60, top: 60, width: 1080, height: 480, fill: 'transparent', stroke: '#a98443', strokeWidth: 0.4 },

      // Fleur-de-lys corners
      { type: 'svg', svg: IVOIRE_FLEUR, left: 110,  top: 110, width: 80, height: 80, angle: 0,   originX: 'center', originY: 'center' },
      { type: 'svg', svg: IVOIRE_FLEUR, left: 1090, top: 110, width: 80, height: 80, angle: 90,  originX: 'center', originY: 'center' },
      { type: 'svg', svg: IVOIRE_FLEUR, left: 1090, top: 490, width: 80, height: 80, angle: 180, originX: 'center', originY: 'center' },
      { type: 'svg', svg: IVOIRE_FLEUR, left: 110,  top: 490, width: 80, height: 80, angle: 270, originX: 'center', originY: 'center' },

      // Brand line
      { type: 'text', left: 600, top: 100, width: 400, text: '{{brand}}',
        fontSize: 10, fontFamily: 'Inter', fill: '#7a1f2b',
        fontWeight: 600, charSpacing: 800, textAlign: 'center', originX: 'center' },

      // Header
      { type: 'text', left: 600, top: 145, width: 900, text: 'Certificate of Honour',
        fontSize: 36, fontFamily: 'Playfair Display', fill: '#7a1f2b',
        fontWeight: 600, fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Sub-header
      { type: 'text', left: 600, top: 195, width: 600, text: 'AWARDED IN RECOGNITION OF MERIT',
        fontSize: 10, fontFamily: 'Inter', fill: '#a98443',
        fontWeight: 500, charSpacing: 600, textAlign: 'center', originX: 'center' },

      // Hairline
      { type: 'rect', left: 540, top: 220, width: 120, height: 0.6, fill: '#7a1f2b', originX: 'center' },

      // Preamble
      { type: 'text', left: 600, top: 245, width: 700, text: 'this honour is conferred upon',
        fontSize: 13, fontFamily: 'Playfair Display', fill: '#6b4520',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Name
      { type: 'text', left: 600, top: 285, width: 1000, text: '{{full_name}}',
        fontSize: 60, fontFamily: 'Playfair Display', fill: '#18120e',
        fontWeight: 500, fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Hairline below name
      { type: 'rect', left: 540, top: 370, width: 120, height: 0.6, fill: '#a98443', originX: 'center' },

      // Recital
      { type: 'text', left: 600, top: 395, width: 800, text: 'for distinguished work upon',
        fontSize: 12, fontFamily: 'Playfair Display', fill: '#6b4520',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },
      { type: 'text', left: 600, top: 425, width: 900, text: '{{course_title}}',
        fontSize: 22, fontFamily: 'Playfair Display', fill: '#7a1f2b',
        fontWeight: 600, textAlign: 'center', originX: 'center' },

      // Signature row
      { type: 'rect', left: 230, top: 500, width: 180, height: 0.6, fill: '#18120e' },
      { type: 'text', left: 320, top: 510, width: 220, text: '{{date}}',
        fontSize: 11, fontFamily: 'Playfair Display', fill: '#18120e',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },
      { type: 'text', left: 320, top: 528, width: 220, text: 'DATE',
        fontSize: 8, fontFamily: 'Inter', fill: '#7a1f2b',
        fontWeight: 600, charSpacing: 400, textAlign: 'center', originX: 'center' },

      { type: 'rect', left: 790, top: 500, width: 180, height: 0.6, fill: '#18120e' },
      { type: 'text', left: 880, top: 506, width: 220, text: '{{instructor}}',
        fontSize: 14, fontFamily: 'Great Vibes', fill: '#18120e',
        textAlign: 'center', originX: 'center' },
      { type: 'text', left: 880, top: 528, width: 220, text: 'AUTHORISED',
        fontSize: 8, fontFamily: 'Inter', fill: '#7a1f2b',
        fontWeight: 600, charSpacing: 400, textAlign: 'center', originX: 'center' },
    ],
  },

  // =========================================================================
  // MINIMALIST CORPORATE × 2
  // =========================================================================

  // -------------------------------------------------------------------------
  // 6. MINIMALIST CORPORATE — "Slate Executive"
  //
  // Slate-blue left sidebar holding the corporate seal + brand mark, white
  // body for the recital. Inter throughout. Reads as enterprise / B2B /
  // training partner — the kind of certificate sent by an HR system.
  // -------------------------------------------------------------------------
  {
    id: 'corporate-slate-executive',
    name: 'Corporate Slate Executive',
    description: 'Sidebar seal, slate-blue & white, professional sans',
    orientation: 'landscape',
    bg: '#ffffff',
    thumbnail: { bg: 'linear-gradient(135deg, #1e3a5f, #ffffff)', accent: '#1e3a5f' },
    elements: [
      // Slate-blue sidebar (~28% of width)
      { type: 'rect', left: 0, top: 0, width: 340, height: 600, fill: '#1e3a5f' },

      // Subtle inner stripe near sidebar edge
      { type: 'rect', left: 340, top: 0, width: 4, height: 600, fill: '#3b82f6' },

      // Corporate seal
      { type: 'svg', svg: CORPORATE_SEAL, left: 170, top: 170, width: 200, height: 200, originX: 'center', originY: 'center' },

      // Brand mark below seal
      { type: 'text', left: 170, top: 310, width: 280, text: '{{brand}}',
        fontSize: 14, fontFamily: 'Inter', fill: '#ffffff',
        fontWeight: 700, charSpacing: 600, textAlign: 'center', originX: 'center' },
      { type: 'text', left: 170, top: 332, width: 280, text: 'CERTIFIED · TRAINING',
        fontSize: 9, fontFamily: 'Inter', fill: '#94a3b8',
        fontWeight: 500, charSpacing: 600, textAlign: 'center', originX: 'center' },

      // Sidebar footer — issue date stamp
      { type: 'rect', left: 50, top: 480, width: 240, height: 1, fill: '#475569' },
      { type: 'text', left: 170, top: 495, width: 240, text: 'ISSUED',
        fontSize: 8, fontFamily: 'Inter', fill: '#94a3b8',
        fontWeight: 600, charSpacing: 600, textAlign: 'center', originX: 'center' },
      { type: 'text', left: 170, top: 512, width: 240, text: '{{date}}',
        fontSize: 12, fontFamily: 'Inter', fill: '#ffffff',
        fontWeight: 500, textAlign: 'center', originX: 'center' },

      // ===== RIGHT BODY =====

      // Top label
      { type: 'text', left: 400, top: 90, width: 600, text: 'CERTIFICATE OF COMPLETION',
        fontSize: 11, fontFamily: 'Inter', fill: '#1e3a5f',
        fontWeight: 700, charSpacing: 800 },

      // Project / programme line
      { type: 'text', left: 400, top: 115, width: 600, text: '{{project_name}}',
        fontSize: 10, fontFamily: 'Inter', fill: '#64748b',
        fontWeight: 500, charSpacing: 200 },

      // Awarded preamble
      { type: 'text', left: 400, top: 200, width: 600, text: 'This certifies that',
        fontSize: 14, fontFamily: 'Inter', fill: '#475569',
        fontWeight: 400 },

      // Name — clean sans, left-aligned
      { type: 'text', left: 400, top: 230, width: 760, text: '{{full_name}}',
        fontSize: 48, fontFamily: 'Inter', fill: '#0f172a',
        fontWeight: 700 },

      // Slate accent stub
      { type: 'rect', left: 400, top: 320, width: 60, height: 3, fill: '#1e3a5f' },

      // Recital
      { type: 'text', left: 400, top: 340, width: 760, text: 'has successfully completed the requirements for',
        fontSize: 13, fontFamily: 'Inter', fill: '#475569' },
      { type: 'text', left: 400, top: 365, width: 760, text: '{{course_title}}',
        fontSize: 22, fontFamily: 'Inter', fill: '#1e3a5f',
        fontWeight: 600 },

      // Signature row
      { type: 'rect', left: 400, top: 490, width: 760, height: 1, fill: '#cbd5e1' },

      { type: 'text', left: 400, top: 503, width: 360, text: 'INSTRUCTOR',
        fontSize: 9, fontFamily: 'Inter', fill: '#64748b',
        fontWeight: 600, charSpacing: 500 },
      { type: 'text', left: 400, top: 522, width: 360, text: '{{instructor}}',
        fontSize: 13, fontFamily: 'Inter', fill: '#0f172a',
        fontWeight: 500 },

      { type: 'text', left: 1160, top: 503, width: 300, text: 'VERIFICATION',
        fontSize: 9, fontFamily: 'Inter', fill: '#64748b',
        fontWeight: 600, charSpacing: 500, textAlign: 'right', originX: 'right' },
      { type: 'text', left: 1160, top: 522, width: 300, text: 'ID · {{date}}',
        fontSize: 12, fontFamily: 'JetBrains Mono', fill: '#0f172a',
        fontWeight: 500, textAlign: 'right', originX: 'right' },
    ],
  },

  // -------------------------------------------------------------------------
  // 7. MINIMALIST CORPORATE — "Mineral Blue"
  //
  // Right-side sidebar variant for layout differentiation, lighter blue/
  // gray palette. The seal sits in the sidebar near the metadata stack —
  // flips the visual weight versus Slate Executive.
  // -------------------------------------------------------------------------
  {
    id: 'corporate-mineral-blue',
    name: 'Corporate Mineral Blue',
    description: 'Right sidebar, mineral palette, clean grid layout',
    orientation: 'landscape',
    bg: '#f8fafc',
    thumbnail: { bg: 'linear-gradient(135deg, #f8fafc, #3b82f6)', accent: '#2563eb' },
    elements: [
      // Right sidebar
      { type: 'rect', left: 880, top: 0, width: 320, height: 600, fill: '#dbeafe' },
      { type: 'rect', left: 876, top: 0, width: 4, height: 600, fill: '#2563eb' },

      // Sidebar header — brand
      { type: 'text', left: 1040, top: 80, width: 280, text: '{{brand}}',
        fontSize: 16, fontFamily: 'Inter', fill: '#1e40af',
        fontWeight: 700, charSpacing: 400, textAlign: 'center', originX: 'center' },
      { type: 'text', left: 1040, top: 105, width: 280, text: 'OFFICIAL · CERTIFICATION',
        fontSize: 9, fontFamily: 'Inter', fill: '#3b82f6',
        fontWeight: 500, charSpacing: 600, textAlign: 'center', originX: 'center' },

      // Hairline divider
      { type: 'rect', left: 950, top: 135, width: 180, height: 1, fill: '#3b82f6', originX: 'center' },

      // Seal
      { type: 'svg', svg: CORPORATE_SEAL, left: 1040, top: 250, width: 180, height: 180, originX: 'center', originY: 'center' },

      // Sidebar metadata
      { type: 'text', left: 1040, top: 380, width: 280, text: 'CERTIFICATE NO.',
        fontSize: 9, fontFamily: 'Inter', fill: '#1e40af',
        fontWeight: 600, charSpacing: 500, textAlign: 'center', originX: 'center' },
      { type: 'text', left: 1040, top: 400, width: 280, text: '{{date}}',
        fontSize: 13, fontFamily: 'JetBrains Mono', fill: '#0f172a',
        textAlign: 'center', originX: 'center' },

      // Bottom of sidebar — project
      { type: 'text', left: 1040, top: 480, width: 280, text: 'PROGRAMME',
        fontSize: 8, fontFamily: 'Inter', fill: '#3b82f6',
        fontWeight: 600, charSpacing: 600, textAlign: 'center', originX: 'center' },
      { type: 'text', left: 1040, top: 498, width: 280, text: '{{project_name}}',
        fontSize: 11, fontFamily: 'Inter', fill: '#0f172a',
        fontWeight: 500, textAlign: 'center', originX: 'center' },

      // ===== LEFT BODY =====

      // Top header
      { type: 'text', left: 80, top: 100, width: 700, text: 'CERTIFICATE',
        fontSize: 13, fontFamily: 'Inter', fill: '#2563eb',
        fontWeight: 700, charSpacing: 800 },
      { type: 'text', left: 80, top: 128, width: 700, text: 'of Professional Achievement',
        fontSize: 22, fontFamily: 'Inter', fill: '#0f172a',
        fontWeight: 400 },

      // Hairline rule
      { type: 'rect', left: 80, top: 170, width: 720, height: 1, fill: '#cbd5e1' },

      // Awarded
      { type: 'text', left: 80, top: 200, width: 700, text: 'PRESENTED TO',
        fontSize: 9, fontFamily: 'Inter', fill: '#64748b',
        fontWeight: 600, charSpacing: 600 },

      // Name
      { type: 'text', left: 80, top: 230, width: 760, text: '{{full_name}}',
        fontSize: 50, fontFamily: 'Inter', fill: '#1e40af',
        fontWeight: 800 },

      // Recital block
      { type: 'rect', left: 80, top: 330, width: 60, height: 3, fill: '#2563eb' },

      { type: 'text', left: 80, top: 350, width: 760, text: 'in recognition of completing the programme',
        fontSize: 13, fontFamily: 'Inter', fill: '#475569' },
      { type: 'text', left: 80, top: 378, width: 760, text: '{{course_title}}',
        fontSize: 24, fontFamily: 'Inter', fill: '#0f172a',
        fontWeight: 700 },

      { type: 'text', left: 80, top: 425, width: 760, text: 'demonstrating proficiency, dedication, and skill throughout the programme.',
        fontSize: 12, fontFamily: 'Inter', fill: '#64748b' },

      // Signature row
      { type: 'rect', left: 80, top: 510, width: 220, height: 1, fill: '#475569' },
      { type: 'text', left: 80, top: 522, width: 220, text: '{{instructor}}',
        fontSize: 13, fontFamily: 'Inter', fill: '#0f172a',
        fontWeight: 500 },
      { type: 'text', left: 80, top: 545, width: 220, text: 'INSTRUCTOR · SIGNATURE',
        fontSize: 8, fontFamily: 'Inter', fill: '#3b82f6',
        fontWeight: 600, charSpacing: 500 },

      { type: 'rect', left: 380, top: 510, width: 220, height: 1, fill: '#475569' },
      { type: 'text', left: 380, top: 522, width: 220, text: '{{date}}',
        fontSize: 13, fontFamily: 'Inter', fill: '#0f172a',
        fontWeight: 500 },
      { type: 'text', left: 380, top: 545, width: 220, text: 'DATE OF ISSUE',
        fontSize: 8, fontFamily: 'Inter', fill: '#3b82f6',
        fontWeight: 600, charSpacing: 500 },
    ],
  },

  // =========================================================================
  // VINTAGE DIPLOMA × 1
  // =========================================================================

  // -------------------------------------------------------------------------
  // 8. VINTAGE DIPLOMA — "Heirloom Parchment"
  //
  // Heavy intertwined sepia border (rotated copies of the heirloom-knot SVG
  // wrap each corner), parchment-coloured ground, Cinzel-like display via
  // Great Vibes calligraphy for the focal name, Fraunces for body. Reads
  // as university degree / fellowship / lifetime achievement —
  // ceremonial, irreplaceable, the kind of document you frame.
  // -------------------------------------------------------------------------
  {
    id: 'vintage-heirloom-diploma',
    name: 'Vintage Heirloom Diploma',
    description: 'Intertwined sepia border, parchment, calligraphy display',
    orientation: 'landscape',
    bg: '#f7eed3',
    thumbnail: { bg: 'linear-gradient(135deg, #f7eed3, #b88a4a)', accent: '#5a3814' },
    elements: [
      // Parchment vignette
      { type: 'rect', left: 0, top: 0, width: 1200, height: 600, fill: '#e8d49b', opacity: 0.18 },
      { type: 'rect', left: 80, top: 60, width: 1040, height: 480, fill: '#f7eed3' },

      // Heavy heirloom-knot border, four corners
      { type: 'svg', svg: HEIRLOOM_KNOT, left: 110,  top: 110, width: 180, height: 180, angle: 0,   originX: 'center', originY: 'center' },
      { type: 'svg', svg: HEIRLOOM_KNOT, left: 1090, top: 110, width: 180, height: 180, angle: 90,  originX: 'center', originY: 'center' },
      { type: 'svg', svg: HEIRLOOM_KNOT, left: 1090, top: 490, width: 180, height: 180, angle: 180, originX: 'center', originY: 'center' },
      { type: 'svg', svg: HEIRLOOM_KNOT, left: 110,  top: 490, width: 180, height: 180, angle: 270, originX: 'center', originY: 'center' },

      // Inner double-line frame
      { type: 'rect', left: 130, top: 110, width: 940, height: 380, fill: 'transparent', stroke: '#5a3814', strokeWidth: 2 },
      { type: 'rect', left: 140, top: 120, width: 920, height: 360, fill: 'transparent', stroke: '#7a4a18', strokeWidth: 0.5 },

      // Brand crest line
      { type: 'text', left: 600, top: 140, width: 600, text: '{{brand}} · ANNO MMXXVI',
        fontSize: 11, fontFamily: 'Fraunces', fill: '#5a3814',
        fontStyle: 'italic', charSpacing: 600, textAlign: 'center', originX: 'center' },

      // Diploma header
      { type: 'text', left: 600, top: 175, width: 800, text: 'Diploma',
        fontSize: 56, fontFamily: 'Great Vibes', fill: '#3d2410',
        textAlign: 'center', originX: 'center' },

      // Sub-header
      { type: 'text', left: 600, top: 240, width: 600, text: 'OF · ACADEMIC · DISTINCTION',
        fontSize: 11, fontFamily: 'Fraunces', fill: '#7a4a18',
        fontWeight: 600, charSpacing: 800, textAlign: 'center', originX: 'center' },

      // Decorative ornament
      { type: 'text', left: 600, top: 270, width: 200, text: '❦  ❦  ❦',
        fontSize: 14, fontFamily: 'Fraunces', fill: '#7a4a18',
        textAlign: 'center', originX: 'center' },

      // Preamble — Latinate
      { type: 'text', left: 600, top: 295, width: 700, text: 'Be it known to all who shall read these letters that',
        fontSize: 12, fontFamily: 'Fraunces', fill: '#5a3814',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Name — calligraphy
      { type: 'text', left: 600, top: 320, width: 1000, text: '{{full_name}}',
        fontSize: 60, fontFamily: 'Great Vibes', fill: '#18120e',
        textAlign: 'center', originX: 'center' },

      // Recital
      { type: 'text', left: 600, top: 395, width: 800, text: 'having faithfully completed every requirement set forth in',
        fontSize: 12, fontFamily: 'Fraunces', fill: '#5a3814',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },
      { type: 'text', left: 600, top: 420, width: 900, text: '{{course_title}}',
        fontSize: 22, fontFamily: 'Fraunces', fill: '#3d2410',
        fontWeight: 600, fontStyle: 'italic', textAlign: 'center', originX: 'center' },
      { type: 'text', left: 600, top: 452, width: 800, text: 'is hereby admitted to all the rights and privileges thereunto appertaining.',
        fontSize: 11, fontFamily: 'Fraunces', fill: '#5a3814',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },

      // Signature blocks
      { type: 'rect', left: 200, top: 510, width: 200, height: 0.8, fill: '#3d2410' },
      { type: 'text', left: 300, top: 518, width: 240, text: '{{date}}',
        fontSize: 11, fontFamily: 'Fraunces', fill: '#3d2410',
        fontStyle: 'italic', textAlign: 'center', originX: 'center' },
      { type: 'text', left: 300, top: 536, width: 240, text: 'GIVEN ON THIS DAY',
        fontSize: 8, fontFamily: 'Fraunces', fill: '#7a4a18',
        charSpacing: 400, textAlign: 'center', originX: 'center' },

      { type: 'rect', left: 800, top: 510, width: 200, height: 0.8, fill: '#3d2410' },
      { type: 'text', left: 900, top: 514, width: 240, text: '{{instructor}}',
        fontSize: 16, fontFamily: 'Great Vibes', fill: '#3d2410',
        textAlign: 'center', originX: 'center' },
      { type: 'text', left: 900, top: 536, width: 240, text: 'CHANCELLOR · {{brand}}',
        fontSize: 8, fontFamily: 'Fraunces', fill: '#7a4a18',
        charSpacing: 400, textAlign: 'center', originX: 'center' },
    ],
  },
];
