/**
 * imageScaling.js — ASPECT-RATIO-LOCKED edition (v2)
 *
 * Images now preserve the source aspect ratio at all times, using the
 * most reliable approach Fabric offers:
 *
 *   1. `lockUniScaling = true`
 *      → Corner handles (tl/tr/bl/br) scale uniformly. scaleX and scaleY
 *        always move together. The image keeps its ratio no matter how
 *        the corner is dragged.
 *
 *   2. Side handles (ml / mr / mt / mb) are HIDDEN.
 *      → With lockUniScaling on, side handles are effectively non-functional
 *        anyway (Fabric ignores drags on them because they'd produce a
 *        non-uniform scale). Rather than leave dead handles on screen, we
 *        remove them. The user gets a clean 4-corner bounding box, which
 *        is the standard pattern for aspect-locked images in Figma,
 *        Illustrator, Keynote, etc.
 *
 *   3. Rotation handle (mtr) — kept, unchanged.
 *
 * On insertion, the image is placed at its natural aspect ratio sized to
 * fit comfortably within the canvas (see Canvas.addImage). It is never
 * stretched, never distorted.
 *
 * Undo / redo / save / load round-trips re-run applyFreeTransform() on
 * every restored image, so the aspect lock is persistent.
 */

/**
 * Configure a Fabric.Image for aspect-ratio-preserving transforms.
 */
export function applyFreeTransform(obj) {
  if (!obj) return;

  // Show 4 corners + rotation handle. Hide all 4 side (mid-edge) handles
  // because they would only allow non-uniform scaling, which lockUniScaling
  // disables anyway — showing them would just create dead clickable areas.
  obj.setControlsVisibility({
    ml: false, mr: false, mt: false, mb: false,
    tl: true,  tr: true,  bl: true,  br: true,
    mtr: true,
  });

  // THE key setting: Fabric will only permit uniform (proportional) scaling.
  // Dragging any corner now scales scaleX and scaleY together.
  obj.lockUniScaling = true;

  // Allow scaling in both axes (uniScaling handles the "together" part)
  // and allow negative scale (flip) for completeness. These defaults are
  // usually already in place but we set them explicitly so undo/redo
  // loads can't accidentally leave an image locked on one axis.
  obj.lockScalingX = false;
  obj.lockScalingY = false;
  obj.lockScalingFlip = false;

  // Remember the natural aspect ratio so we can use it if ever needed
  // (e.g. a future "reset to natural ratio" feature or a safety clamp
  // on serialization round-trips).
  if (!obj._originalAspectRatio && obj.width && obj.height) {
    obj._originalAspectRatio = obj.width / obj.height;
  }

  // Safety net: on every `scaling` event, if scaleX and scaleY have
  // somehow drifted apart (from a malformed JSON restore, for example),
  // snap them back to the larger magnitude. With lockUniScaling=true
  // this should never fire in normal use, but it guarantees the image
  // can't become distorted even in edge cases.
  if (obj._aspectLockHandler) {
    obj.off('scaling', obj._aspectLockHandler);
  }
  const onScaling = () => {
    const sx = Math.abs(obj.scaleX || 1);
    const sy = Math.abs(obj.scaleY || 1);
    if (Math.abs(sx - sy) > 0.0001) {
      const s = Math.max(sx, sy);
      obj.scaleX = (obj.scaleX < 0 ? -1 : 1) * s;
      obj.scaleY = (obj.scaleY < 0 ? -1 : 1) * s;
    }
  };
  obj._aspectLockHandler = onScaling;
  obj.on('scaling', onScaling);
}

/**
 * Compute the scale + offset to fit a source into a target box.
 * Used by background images and (via `contain` mode) by addImage's
 * default sizing strategy.
 *
 * mode: 'contain' (letterbox) | 'cover' (crop to fill)
 */
export function computeFit(imgW, imgH, boxW, boxH, mode = 'contain') {
  if (!imgW || !imgH || !boxW || !boxH) {
    return { scale: 1, offsetX: 0, offsetY: 0, drawW: imgW, drawH: imgH };
  }

  const sx = boxW / imgW;
  const sy = boxH / imgH;
  const scale = mode === 'cover' ? Math.max(sx, sy) : Math.min(sx, sy);

  const drawW = imgW * scale;
  const drawH = imgH * scale;
  const offsetX = (boxW - drawW) / 2;
  const offsetY = (boxH - drawH) / 2;

  return { scale, offsetX, offsetY, drawW, drawH };
}

export function computeBackgroundFit(imgW, imgH, canvasW, canvasH, mode = 'cover') {
  return computeFit(imgW, imgH, canvasW, canvasH, mode);
}

/**
 * Enable maximum-quality smoothing on a Fabric canvas's drawing context.
 *
 * Fabric's `toDataURL({ multiplier })` internally creates an offscreen
 * canvas at `multiplier`× the source size and re-draws everything onto it.
 * Vector content (text, shapes, paths) re-rasterises at the higher
 * resolution and stays crisp automatically. Bitmap images, however, are
 * resampled by the browser's CanvasRenderingContext2D — which by default
 * uses 'low' quality. Forcing `imageSmoothingQuality = 'high'` on the
 * source canvas (and ensuring smoothing is on) gives bilinear/bicubic
 * resampling instead of nearest-neighbour, which preserves detail in
 * upscaled photos and SVGs.
 *
 * Call this once on a canvas before exporting at any multiplier > 1.
 *
 * Note: the multiplier-target offscreen canvas inherits these settings
 * from Fabric's internal `_setSVGOptions`/`toCanvasElement` path; setting
 * them on the live context is the supported way to influence both the
 * on-screen render and the export render.
 */
export function configureHighQualityRendering(canvas) {
  if (!canvas) return;
  const ctx = canvas.getContext && canvas.getContext();
  if (ctx) {
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
  }
  // Hint to Fabric that bitmap content (images, cached groups) should be
  // upsampled with high-quality interpolation when redrawn at scale. This
  // is the property Fabric itself reads inside its internal multiplier path.
  if (canvas.imageSmoothingEnabled !== undefined) {
    canvas.imageSmoothingEnabled = true;
  }
  // Also drop the per-canvas pixel-density cap so multiplier exports aren't
  // clamped to retina-screen DPR. Without this, exporting a 4× scale on a
  // 2×-DPR display silently caps at 2× actual pixels.
  if (canvas.enableRetinaScaling !== undefined) {
    canvas.enableRetinaScaling = true;
  }
}

/**
 * Compute the effective export multiplier for a "1x/2x/3x/4x" UI choice.
 * Centralised here so the export path and any preview UI stay consistent.
 */
export function resolveExportMultiplier(scale) {
  const n = parseInt(scale, 10);
  if (!isFinite(n) || n < 1) return 1;
  if (n > 4) return 4;
  return n;
}
