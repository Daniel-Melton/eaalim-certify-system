// 20+ SVG shapes organized by category
// All use currentColor so they can be recolored by Fabric fill property

export const SHAPES = [
  // Seals
  { id: 'seal-classic', name: 'Classic Seal', category: 'seal',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="50" cy="50" r="38" fill="none" stroke="currentColor" stroke-width="1"/><circle cx="50" cy="50" r="28" fill="currentColor" fill-opacity="0.12"/><path d="M50 25 L55 42 L72 42 L58 52 L63 68 L50 58 L37 68 L42 52 L28 42 L45 42 Z" fill="currentColor"/></svg>` },
  { id: 'seal-star', name: 'Star Medal', category: 'seal',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="3"/><path d="M50 20 L58 42 L82 42 L63 56 L71 78 L50 64 L29 78 L37 56 L18 42 L42 42 Z" fill="currentColor"/></svg>` },
  { id: 'seal-wax', name: 'Wax Seal', category: 'seal',
    svg: `<svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg"><path d="M40 10 L52 18 L58 30 L58 45 L48 58 L40 70 L32 58 L22 45 L22 30 L28 18 Z" fill="currentColor"/><circle cx="40" cy="40" r="20" fill="none" stroke="#fff" stroke-width="1" stroke-opacity="0.5"/><text x="40" y="46" text-anchor="middle" fill="#fff" font-family="serif" font-size="14" font-style="italic" fill-opacity="0.9">E</text></svg>` },
  { id: 'seal-laurel', name: 'Laurel Wreath', category: 'seal',
    svg: `<svg viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="2" fill="none"><path d="M30 50 Q30 20 50 15"/><path d="M30 50 Q30 80 50 85"/><path d="M90 50 Q90 20 70 15"/><path d="M90 50 Q90 80 70 85"/><ellipse cx="28" cy="30" rx="8" ry="3" transform="rotate(-30 28 30)" fill="currentColor"/><ellipse cx="28" cy="50" rx="8" ry="3" fill="currentColor"/><ellipse cx="28" cy="70" rx="8" ry="3" transform="rotate(30 28 70)" fill="currentColor"/><ellipse cx="92" cy="30" rx="8" ry="3" transform="rotate(30 92 30)" fill="currentColor"/><ellipse cx="92" cy="50" rx="8" ry="3" fill="currentColor"/><ellipse cx="92" cy="70" rx="8" ry="3" transform="rotate(-30 92 70)" fill="currentColor"/></g></svg>` },
  // Ribbons
  { id: 'ribbon-banner', name: 'Banner Ribbon', category: 'ribbon',
    svg: `<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg"><path d="M10 15 L190 15 L180 30 L190 45 L10 45 L20 30 Z" fill="currentColor"/><path d="M10 15 L0 25 L10 30 Z" fill="currentColor" fill-opacity="0.7"/><path d="M190 15 L200 25 L190 30 Z" fill="currentColor" fill-opacity="0.7"/></svg>` },
  { id: 'ribbon-award', name: 'Award Ribbon', category: 'ribbon',
    svg: `<svg viewBox="0 0 80 120" xmlns="http://www.w3.org/2000/svg"><circle cx="40" cy="40" r="30" fill="currentColor"/><circle cx="40" cy="40" r="22" fill="none" stroke="#fff" stroke-width="1" stroke-opacity="0.4"/><path d="M25 65 L15 115 L30 105 L40 115 L50 105 L65 115 L55 65 Z" fill="currentColor" fill-opacity="0.85"/><text x="40" y="47" text-anchor="middle" fill="#fff" font-family="serif" font-size="18" font-weight="bold">★</text></svg>` },
  { id: 'ribbon-tail', name: 'Tail Ribbon', category: 'ribbon',
    svg: `<svg viewBox="0 0 200 60" xmlns="http://www.w3.org/2000/svg"><path d="M20 10 L180 10 L170 30 L180 50 L20 50 L30 30 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>` },
  // Badges
  { id: 'badge-shield', name: 'Shield Badge', category: 'badge',
    svg: `<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg"><path d="M40 5 L75 15 L75 55 Q75 80 40 95 Q5 80 5 55 L5 15 Z" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="2"/><text x="40" y="60" text-anchor="middle" fill="currentColor" font-family="serif" font-size="22" font-weight="bold" font-style="italic">E</text></svg>` },
  { id: 'badge-crown', name: 'Crown Badge', category: 'badge',
    svg: `<svg viewBox="0 0 100 60" xmlns="http://www.w3.org/2000/svg"><path d="M10 50 L10 25 L25 35 L40 15 L50 30 L60 15 L75 35 L90 25 L90 50 Z" fill="currentColor"/><rect x="10" y="48" width="80" height="5" fill="currentColor"/><circle cx="40" cy="15" r="3" fill="currentColor"/><circle cx="60" cy="15" r="3" fill="currentColor"/></svg>` },
  { id: 'badge-medal', name: 'Medal Badge', category: 'badge',
    svg: `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg"><path d="M20 5 L30 30 L40 5" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="30" cy="50" r="22" fill="currentColor"/><circle cx="30" cy="50" r="16" fill="none" stroke="#fff" stroke-width="1" stroke-opacity="0.5"/><text x="30" y="57" text-anchor="middle" fill="#fff" font-family="serif" font-size="18" font-weight="bold">1</text></svg>` },
  { id: 'badge-trophy', name: 'Trophy', category: 'badge',
    svg: `<svg viewBox="0 0 60 80" xmlns="http://www.w3.org/2000/svg"><path d="M15 10 L45 10 L45 30 Q45 45 30 48 Q15 45 15 30 Z" fill="currentColor"/><path d="M15 15 Q5 15 5 25 Q5 32 15 32" fill="none" stroke="currentColor" stroke-width="2"/><path d="M45 15 Q55 15 55 25 Q55 32 45 32" fill="none" stroke="currentColor" stroke-width="2"/><rect x="25" y="48" width="10" height="10" fill="currentColor"/><rect x="15" y="58" width="30" height="6" fill="currentColor"/><rect x="10" y="64" width="40" height="6" fill="currentColor"/></svg>` },
  // Ornaments / Dividers
  { id: 'orn-flourish', name: 'Flourish', category: 'ornament',
    svg: `<svg viewBox="0 0 200 40" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.5" fill="none"><path d="M10 20 Q50 5 100 20 Q150 35 190 20"/><circle cx="100" cy="20" r="3" fill="currentColor"/><path d="M10 20 Q5 15 10 10"/><path d="M190 20 Q195 15 190 10"/></g></svg>` },
  { id: 'orn-divider', name: 'Line Divider', category: 'ornament',
    svg: `<svg viewBox="0 0 200 20" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1" fill="none"><line x1="20" y1="10" x2="85" y2="10"/><line x1="115" y1="10" x2="180" y2="10"/><circle cx="100" cy="10" r="4" fill="currentColor"/><circle cx="100" cy="10" r="8"/></g></svg>` },
  { id: 'orn-diamond', name: 'Diamond Accent', category: 'ornament',
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor"><path d="M30 5 L40 30 L30 55 L20 30 Z"/><circle cx="30" cy="30" r="3" fill="#fff"/></g></svg>` },
  { id: 'orn-triplet', name: 'Triple Diamonds', category: 'ornament',
    svg: `<svg viewBox="0 0 200 30" xmlns="http://www.w3.org/2000/svg"><g fill="currentColor"><path d="M60 5 L70 15 L60 25 L50 15 Z"/><path d="M100 5 L110 15 L100 25 L90 15 Z"/><path d="M140 5 L150 15 L140 25 L130 15 Z"/></g></svg>` },
  // Symbols
  { id: 'sym-star', name: 'Star', category: 'symbol',
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><path d="M30 5 L36 22 L54 22 L40 33 L45 50 L30 40 L15 50 L20 33 L6 22 L24 22 Z" fill="currentColor"/></svg>` },
  { id: 'sym-star-hollow', name: 'Hollow Star', category: 'symbol',
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><path d="M30 5 L36 22 L54 22 L40 33 L45 50 L30 40 L15 50 L20 33 L6 22 L24 22 Z" fill="none" stroke="currentColor" stroke-width="2"/></svg>` },
  { id: 'sym-quill', name: 'Quill', category: 'symbol',
    svg: `<svg viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"><path d="M10 50 Q15 35 30 25 Q45 15 52 8 Q50 20 40 32 Q30 44 15 52 Z" fill="currentColor"/><line x1="10" y1="50" x2="50" y2="10" stroke="#fff" stroke-width="0.5" stroke-opacity="0.4"/></svg>` },
  { id: 'sym-scroll', name: 'Scroll', category: 'symbol',
    svg: `<svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg"><rect x="10" y="15" width="60" height="30" fill="currentColor" fill-opacity="0.15" stroke="currentColor" stroke-width="1.5"/><circle cx="10" cy="30" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="70" cy="30" r="8" fill="none" stroke="currentColor" stroke-width="1.5"/><line x1="25" y1="25" x2="55" y2="25" stroke="currentColor" stroke-width="1"/><line x1="25" y1="30" x2="55" y2="30" stroke="currentColor" stroke-width="1"/><line x1="25" y1="35" x2="45" y2="35" stroke="currentColor" stroke-width="1"/></svg>` },
  // Frames
  { id: 'frm-double', name: 'Double Border', category: 'frame',
    svg: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg"><rect x="4" y="4" width="192" height="132" fill="none" stroke="currentColor" stroke-width="2"/><rect x="12" y="12" width="176" height="116" fill="none" stroke="currentColor" stroke-width="1"/></svg>` },
  { id: 'frm-ornate', name: 'Ornate Corners', category: 'frame',
    svg: `<svg viewBox="0 0 200 140" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.5" fill="none"><path d="M10 30 L10 10 L30 10"/><path d="M170 10 L190 10 L190 30"/><path d="M10 110 L10 130 L30 130"/><path d="M170 130 L190 130 L190 110"/><circle cx="10" cy="10" r="3" fill="currentColor"/><circle cx="190" cy="10" r="3" fill="currentColor"/><circle cx="10" cy="130" r="3" fill="currentColor"/><circle cx="190" cy="130" r="3" fill="currentColor"/></g></svg>` },

  // ============ NEW ORNATE DIVIDERS ============
  // Horizontal decorative flourishes inspired by classic certificate
  // ornamentation — the kind you'd drop under a heading or between
  // sections. All use currentColor so they recolor with the rest.

  // Symmetrical vine divider with a central medallion and mirrored
  // leaves spiralling outward.
  { id: 'div-vine', name: 'Vine Divider', category: 'divider',
    svg: `<svg viewBox="0 0 240 40" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M10 20 Q40 20 70 14 Q90 10 100 20"/><path d="M230 20 Q200 20 170 14 Q150 10 140 20"/><path d="M60 14 Q55 8 50 14 Q55 20 60 14" fill="currentColor" fill-opacity="0.6"/><path d="M180 14 Q185 8 190 14 Q185 20 180 14" fill="currentColor" fill-opacity="0.6"/><circle cx="120" cy="20" r="4" fill="currentColor"/><circle cx="120" cy="20" r="8"/><path d="M85 22 Q82 28 88 28" /><path d="M155 22 Q158 28 152 28" /></g></svg>` },

  // Baroque swirl divider — two mirrored S-curves meeting at a central
  // diamond accent. Mimics the cross-flourish near the bottom of the
  // reference image.
  { id: 'div-baroque', name: 'Baroque Swirl', category: 'divider',
    svg: `<svg viewBox="0 0 240 40" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M10 20 Q40 8 80 20 Q100 26 115 20"/><path d="M230 20 Q200 8 160 20 Q140 26 125 20"/><path d="M30 18 Q24 14 30 10" /><path d="M210 18 Q216 14 210 10" /><path d="M65 22 Q60 28 68 28" fill="currentColor" fill-opacity="0.55"/><path d="M175 22 Q180 28 172 28" fill="currentColor" fill-opacity="0.55"/><path d="M120 10 L126 20 L120 30 L114 20 Z" fill="currentColor"/><circle cx="10" cy="20" r="1.8" fill="currentColor"/><circle cx="230" cy="20" r="1.8" fill="currentColor"/></g></svg>` },

  // Arrow-cap flourish — a long horizontal line punctuated by a central
  // diamond and tapering arrow tips at each end.
  { id: 'div-arrow', name: 'Arrow Flourish', category: 'divider',
    svg: `<svg viewBox="0 0 240 30" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"><path d="M10 15 L105 15"/><path d="M135 15 L230 15"/><path d="M10 15 L18 11 M10 15 L18 19"/><path d="M230 15 L222 11 M230 15 L222 19"/><path d="M120 5 L128 15 L120 25 L112 15 Z" fill="currentColor"/><circle cx="100" cy="15" r="1.8" fill="currentColor"/><circle cx="140" cy="15" r="1.8" fill="currentColor"/></g></svg>` },

  // Floral medallion divider — a central stylised blossom with two
  // curving stems extending outward, ending in smaller buds.
  { id: 'div-floral', name: 'Floral Medallion', category: 'divider',
    svg: `<svg viewBox="0 0 240 50" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"><path d="M15 25 Q50 25 90 20"/><path d="M225 25 Q190 25 150 20"/><g transform="translate(120 25)"><circle cx="0" cy="0" r="3" fill="currentColor"/><ellipse cx="0" cy="-9" rx="3" ry="6" fill="currentColor" fill-opacity="0.55"/><ellipse cx="8" cy="-4" rx="6" ry="3" transform="rotate(30)" fill="currentColor" fill-opacity="0.55"/><ellipse cx="-8" cy="-4" rx="6" ry="3" transform="rotate(-30)" fill="currentColor" fill-opacity="0.55"/><ellipse cx="5" cy="7" rx="5" ry="2.5" transform="rotate(-25)" fill="currentColor" fill-opacity="0.4"/><ellipse cx="-5" cy="7" rx="5" ry="2.5" transform="rotate(25)" fill="currentColor" fill-opacity="0.4"/></g><circle cx="88" cy="20" r="2" fill="currentColor"/><circle cx="152" cy="20" r="2" fill="currentColor"/><path d="M75 22 Q70 28 78 32" /><path d="M165 22 Q170 28 162 32" /></g></svg>` },

  // Scroll flourish — a slender horizontal line that coils into
  // scroll-curls at each end, evoking the uppermost example in the
  // reference image.
  { id: 'div-scroll', name: 'Scroll Flourish', category: 'divider',
    svg: `<svg viewBox="0 0 240 30" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"><path d="M30 15 L210 15"/><path d="M30 15 Q20 15 18 10 Q16 5 22 6 Q26 7 24 12"/><path d="M210 15 Q220 15 222 10 Q224 5 218 6 Q214 7 216 12"/><path d="M30 15 Q22 15 22 22 Q22 28 28 28 Q34 28 32 22"/><path d="M210 15 Q218 15 218 22 Q218 28 212 28 Q206 28 208 22"/><circle cx="120" cy="15" r="2.5" fill="currentColor"/><path d="M115 15 L105 12 M125 15 L135 12"/></g></svg>` },
];

// Corner decoration SVGs — designed to sit in a corner
// Each is oriented as top-left; the app rotates them for other corners
export const CORNER_DECORATIONS = [
  { id: 'corner-classic', name: 'Classic',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="2" fill="none"><path d="M10 90 L10 30 Q10 10 30 10 L90 10"/><path d="M20 90 L20 40 Q20 20 40 20 L90 20"/><circle cx="30" cy="30" r="4" fill="currentColor"/></g></svg>` },
  { id: 'corner-ornate', name: 'Ornate',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.5" fill="none"><path d="M10 90 L10 20 Q10 10 20 10 L90 10"/><path d="M30 10 Q40 20 30 30 Q20 40 10 30"/><path d="M10 70 Q20 60 30 70"/><circle cx="20" cy="20" r="3" fill="currentColor"/></g></svg>` },
  { id: 'corner-flourish', name: 'Flourish',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.5" fill="none"><path d="M15 85 Q15 30 50 20 Q70 15 85 15"/><path d="M25 80 Q25 45 55 35"/><path d="M35 75 Q40 60 60 55"/><circle cx="75" cy="25" r="2.5" fill="currentColor"/><circle cx="55" cy="30" r="2" fill="currentColor"/></g></svg>` },
  { id: 'corner-geometric', name: 'Geometric',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="2" fill="none"><path d="M10 10 L40 10 L40 20 L20 20 L20 40 L10 40 Z" fill="currentColor"/><path d="M50 10 L70 10 M10 50 L10 70"/><circle cx="60" cy="20" r="2" fill="currentColor"/><circle cx="20" cy="60" r="2" fill="currentColor"/></g></svg>` },
  { id: 'corner-laurel', name: 'Laurel',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.5" fill="none"><path d="M15 85 Q20 50 45 25"/><ellipse cx="22" cy="68" rx="6" ry="2.5" transform="rotate(-45 22 68)" fill="currentColor"/><ellipse cx="30" cy="55" rx="6" ry="2.5" transform="rotate(-45 30 55)" fill="currentColor"/><ellipse cx="40" cy="40" rx="6" ry="2.5" transform="rotate(-45 40 40)" fill="currentColor"/></g></svg>` },
  { id: 'corner-minimal', name: 'Minimal',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="2" fill="none"><line x1="10" y1="50" x2="10" y2="10"/><line x1="10" y1="10" x2="50" y2="10"/></g></svg>` },

  // ============ NEW ORNATE CORNER DECORATIONS ============
  // Inspired by traditional certificate / diploma border art — scrolling
  // vines, filigree, and baroque flourishes. All oriented top-left; the
  // app rotates them for the other three corners.

  // Scrolling vine with a central rosette and a pair of inward-curling leaves.
  { id: 'corner-victorian', name: 'Victorian',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round"><path d="M12 88 Q12 50 35 35 Q55 25 85 20"/><path d="M12 88 Q30 80 35 62 Q38 48 50 45"/><path d="M35 35 Q25 28 20 18 Q28 22 32 30"/><path d="M35 62 Q28 58 24 64 Q30 68 34 64" fill="currentColor" fill-opacity="0.55"/><path d="M60 30 Q56 22 64 18 Q68 26 62 32" fill="currentColor" fill-opacity="0.55"/><circle cx="48" cy="38" r="2.5" fill="currentColor"/><circle cx="78" cy="22" r="1.8" fill="currentColor"/><circle cx="28" cy="74" r="1.8" fill="currentColor"/></g></svg>` },

  // Baroque swirl — an "S" curve with beaded terminations and secondary
  // curlicues, evoking the top-left example in the reference art.
  { id: 'corner-baroque', name: 'Baroque',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.5" fill="none" stroke-linecap="round"><path d="M10 85 Q10 45 35 25 Q55 12 88 10"/><path d="M22 70 Q30 58 22 50 Q14 58 22 70"/><path d="M45 32 Q58 24 68 32 Q58 40 45 32"/><path d="M65 18 Q72 14 78 20 Q72 24 65 18" fill="currentColor" fill-opacity="0.4"/><circle cx="18" cy="78" r="2" fill="currentColor"/><circle cx="88" cy="12" r="2" fill="currentColor"/><path d="M32 30 Q28 22 36 18" /><path d="M18 55 Q22 60 28 58" /></g></svg>` },

  // Filigree — dense, lace-like filigree. More geometric, like a cut-
  // paper frame motif.
  { id: 'corner-filigree', name: 'Filigree',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.2" fill="none" stroke-linejoin="round"><path d="M10 10 L10 85 M10 10 L85 10"/><path d="M10 25 Q22 25 22 12"/><path d="M25 10 Q25 22 12 22"/><path d="M10 45 Q28 45 28 30 Q28 20 22 22"/><path d="M45 10 Q45 28 30 28 Q20 28 22 22"/><path d="M35 35 Q40 30 48 32 Q44 40 35 35" fill="currentColor" fill-opacity="0.5"/><circle cx="22" cy="22" r="1.6" fill="currentColor"/><circle cx="10" cy="65" r="1.5" fill="currentColor"/><circle cx="65" cy="10" r="1.5" fill="currentColor"/><path d="M10 65 Q16 62 20 66"/><path d="M65 10 Q62 16 66 20"/></g></svg>` },

  // Floral — a stylised blossom at the inner corner with curving stems
  // that fade toward the canvas center. Echoes the middle-top example
  // in the first reference image.
  { id: 'corner-floral', name: 'Floral',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.3" fill="none" stroke-linecap="round"><path d="M10 90 Q15 60 40 40 Q60 25 90 15"/><path d="M20 80 Q25 55 45 48"/><g transform="translate(25 25)"><circle cx="0" cy="0" r="3.5" fill="currentColor"/><ellipse cx="0" cy="-8" rx="3" ry="5" fill="currentColor" fill-opacity="0.55"/><ellipse cx="8" cy="0" rx="5" ry="3" fill="currentColor" fill-opacity="0.55"/><ellipse cx="0" cy="8" rx="3" ry="5" fill="currentColor" fill-opacity="0.55"/><ellipse cx="-8" cy="0" rx="5" ry="3" fill="currentColor" fill-opacity="0.55"/></g><ellipse cx="55" cy="36" rx="4" ry="2" transform="rotate(-30 55 36)" fill="currentColor" fill-opacity="0.7"/><ellipse cx="75" cy="22" rx="3" ry="1.6" transform="rotate(-20 75 22)" fill="currentColor" fill-opacity="0.7"/><circle cx="45" cy="58" r="1.8" fill="currentColor"/></g></svg>` },

  // Elegant — the cleanest of the new set: a single sweeping curve with
  // three descending leaf-buds. Works well when you want decoration that
  // doesn't compete with dense cert text.
  { id: 'corner-elegant', name: 'Elegant',
    svg: `<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg"><g stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"><path d="M12 88 Q12 40 40 22 Q60 10 90 10"/><path d="M20 65 Q14 60 18 52 Q26 56 20 65" fill="currentColor" fill-opacity="0.55"/><path d="M35 40 Q28 38 30 30 Q38 32 35 40" fill="currentColor" fill-opacity="0.55"/><path d="M58 20 Q52 18 54 10 Q62 12 58 20" fill="currentColor" fill-opacity="0.55"/><circle cx="88" cy="12" r="2.2" fill="currentColor"/></g></svg>` },
];

export const CATEGORIES = ['seal', 'ribbon', 'badge', 'ornament', 'symbol', 'frame', 'divider'];

// =============================================================================
// FLIP HELPERS
// =============================================================================
//
// Flip transforms ("Flip Horizontal" / "Flip Vertical") are exposed as Fabric
// Object properties: `flipX` and `flipY`. Setting either to `true` mirrors
// the object across the corresponding axis at render time, with no change to
// the object's left/top/width/height. Fabric serializes these by default, so
// they round-trip through toJSON/loadFromJSON without anything special.
//
// We keep the keys here (rather than scattered string literals across
// Canvas.js / ContextualToolbar.js) so the toolbar buttons, the canvas
// renderer, and any future serialization-shaping code all reference the
// same source of truth.

export const FLIP_KEYS = {
  horizontal: 'flipX',
  vertical:   'flipY',
};

/**
 * Toggle a flip axis on a Fabric object in place.
 *   axis: 'horizontal' | 'vertical'
 * Returns the new flip-bool value (post-toggle), or null if the input was
 * invalid.
 *
 * Usage:
 *   import { toggleFlip } from '@/lib/shapes';
 *   const next = toggleFlip(obj, 'horizontal');
 *   obj.setCoords();
 *   canvas.requestRenderAll();
 */
export function toggleFlip(obj, axis) {
  if (!obj) return null;
  const key = FLIP_KEYS[axis];
  if (!key) return null;
  const next = !obj[key];
  obj.set(key, next);
  return next;
}
