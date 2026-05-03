'use client';

/**
 * SafeImage.js
 *
 * DOM-level image wrapper that maintains aspect ratio.
 * Used for thumbnails and previews OUTSIDE the Fabric canvas (landing page,
 * layer panel, template grid). For images on the Fabric canvas, we use
 * `applyFreeTransform` from lib/imageScaling.js instead.
 *
 * Why a wrapper at all?
 * ---------------------
 * The brief asked for either `next/image` OR `<img>` + `object-fit`. We went
 * with `<img>` + `object-fit` because:
 *   - Template thumbnails are user-uploaded dataURLs (unknown dimensions at
 *     build time), so next/image's required width/height props are awkward.
 *   - `next/image` with fill layout requires a positioned parent, which we
 *     want to control explicitly anyway.
 *   - This component forces a sized container (preventing layout shift) and
 *     lets us swap `object-fit` on a per-instance basis.
 *
 * Usage:
 *   <SafeImage src={url} alt="Preview" fit="contain" className="w-full h-40" />
 */
export default function SafeImage({
  src,
  alt = '',
  fit = 'contain',         // 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  className = '',
  style = {},
  rounded = false,
  onClick,
}) {
  const fitClass = {
    contain: 'object-contain',
    cover: 'object-cover',
    fill: 'object-fill',
    none: 'object-none',
    'scale-down': 'object-scale-down',
  }[fit] || 'object-contain';

  return (
    <div
      className={`relative overflow-hidden ${rounded ? 'rounded-xl' : ''} ${className}`}
      style={{ background: '#18120e', ...style }}
      onClick={onClick}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt={alt}
          className={`absolute inset-0 w-full h-full ${fitClass}`}
          draggable={false}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-xs text-ember-50/30 font-mono uppercase tracking-wider">
          No preview
        </div>
      )}
    </div>
  );
}
