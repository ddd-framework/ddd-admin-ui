'use client';

import { useEffect, useRef } from 'react';

import {
  createDisplacementTextureFrom,
  DISPLACEMENT_IMAGE_SIZE,
  displacementMean,
  displacementPixels,
  initShaderProgram,
  NEUTRAL_DISPLACEMENT_CENTER,
  SHADER_MOTION,
  SHADER_RENDER,
  SHADER_TIME_PERIOD,
  type ShaderLook,
  setShaderUniforms,
  type ShaderPalette,
  type UniformMap,
} from './shader.ts';

const CONTEXT_ATTRIBUTES: WebGLContextAttributes = { depth: false, stencil: false, antialias: false, powerPreference: 'low-power' };
const ACTIVITY_EVENTS = ['pointermove', 'pointerdown', 'keydown', 'wheel', 'touchstart', 'scroll'] as const;
/** A host image as square RGBA bytes (resampled to `size`, a power of two); `null` when it cannot be read (no CORS). */
const loadDisplacementImage = (url: string, size: number): Promise<Uint8Array | null> =>
  new Promise(resolve => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return resolve(null);
        context.drawImage(image, 0, 0, size, size);
        const data = context.getImageData(0, 0, size, size).data;
        resolve(new Uint8Array(data.buffer.slice(0)));
      } catch {
        resolve(null);
      }
    };
    image.onerror = () => resolve(null);
    image.src = url;
  });

export interface ShaderCanvasProps {
  palette: ShaderPalette;
  dark: boolean;
  /** No input for this long → the frame holds until the next input. */
  idleAfterMs: number;
  /** Displacement field and blob opacities (`ShaderLook`); absent values keep the defaults. */
  look?: ShaderLook;
  /** Holds the current frame (no animation) until it turns `false`. */
  paused?: boolean;
  /** Side of the texture a host image is resampled to (a power of two; default 256). */
  imageSize?: number;
  /**
   * With `look.displacementImage`: draw nothing until the image has loaded (default `false`: the generated field shows
   * meanwhile). An image that cannot be read falls back to the generated field.
   */
  waitForImage?: boolean;
  /** Called once the first frame is drawn (the canvas shows something). */
  onFirstDraw?: () => void;
  className?: string;
}

/**
 * The animated canvas: fixed behind the viewport, a quarter of the resolution (at most 512 px wide), at most 20 frames
 * per second. The loop runs only while it can be seen and the viewer is active: a hidden tab, a lost context or
 * `idleAfterMs` without input hold the last frame; it resumes with an immediate draw. A palette change redraws.
 * Browser-only; loaded lazily by `ShaderBackground`.
 */
export const ShaderCanvas = ({
  palette,
  dark,
  idleAfterMs,
  look,
  paused = false,
  imageSize = DISPLACEMENT_IMAGE_SIZE,
  waitForImage = false,
  onFirstDraw,
  className,
}: ShaderCanvasProps) => {
  const onFirstDrawRef = useRef(onFirstDraw);
  onFirstDrawRef.current = onFirstDraw;
  const hostRef = useRef<HTMLDivElement | null>(null);
  const paletteRef = useRef({ palette, dark, look });
  paletteRef.current = { palette, dark, look };
  const pausedRef = useRef(paused);
  pausedRef.current = paused;
  const displacementCells = look?.displacementCells;
  const displacementImage = look?.displacementImage;
  const redrawRef = useRef<(() => void) | null>(null);
  const syncRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    // a fresh canvas per run: a canvas keeps a lost context for good (Strict Mode re-runs the effect)
    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    host.appendChild(canvas);
    const gl = canvas.getContext('webgl', CONTEXT_ATTRIBUTES) as WebGLRenderingContext | null;
    if (!gl) {
      canvas.remove();
      return;
    }

    let program: WebGLProgram | null = null;
    let uniforms: UniformMap | null = null;
    let texture: WebGLTexture | null = null;
    // the field's bytes and its mean: the generated field until a host image has loaded
    let field: { size: number; pixels: Uint8Array } = { size: 128, pixels: displacementPixels(128, displacementCells ?? 8) };
    let fieldMean = displacementMean(field.pixels);
    const buildTexture = () => {
      if (texture) gl.deleteTexture(texture);
      texture = createDisplacementTextureFrom(gl, field.size, field.pixels);
      return texture !== null;
    };
    const buildResources = () => {
      const built = initShaderProgram(gl);
      if (!built) return false;
      program = built.program;
      uniforms = built.uniforms;
      texture = null;
      return buildTexture();
    };
    if (!buildResources()) {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
      return;
    }

    const randSeed = Math.random() * 100;
    const minFrameMs = 1000 / SHADER_RENDER.maxFps - 4;
    const resize = () => {
      let width = Math.max(1, Math.round(canvas.clientWidth * SHADER_RENDER.renderScale));
      let height = Math.max(1, Math.round(canvas.clientHeight * SHADER_RENDER.renderScale));
      if (width > SHADER_RENDER.maxRenderWidth) {
        height = Math.max(1, Math.round((height * SHADER_RENDER.maxRenderWidth) / width));
        width = SHADER_RENDER.maxRenderWidth;
      }
      if (canvas.width === width && canvas.height === height) return false;
      canvas.width = width;
      canvas.height = height;
      return true;
    };
    resize();

    let elapsedBeforeRunMs = 0;
    let runStartedAt: number | null = null;
    let lastDrawn = 0;
    let frame = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;
    let contextLost = false;
    let idle = false;
    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    const elapsedMs = () => elapsedBeforeRunMs + (runStartedAt === null ? 0 : performance.now() - runStartedAt);

    // `waitForImage`: nothing is drawn until the host image is in (or could not be read)
    let fieldPending = Boolean(displacementImage) && waitForImage;
    let drawnOnce = false;
    const draw = () => {
      if (contextLost || !texture || !uniforms || fieldPending) return;
      lastDrawn = performance.now();
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      const current = paletteRef.current;
      setShaderUniforms(gl, uniforms, canvas, current.palette, current.dark, {
        time: (elapsedMs() * 0.0001 * SHADER_MOTION.speed) % SHADER_TIME_PERIOD,
        rand: randSeed,
        texture,
        look: current.look,
        center: current.look?.displacementZeroMean ? fieldMean : NEUTRAL_DISPLACEMENT_CENTER,
      });
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      if (!drawnOnce) {
        drawnOnce = true;
        onFirstDrawRef.current?.();
      }
    };
    const render = () => {
      frame = 0;
      if (cancelled || contextLost) return;
      draw();
      timeout = setTimeout(() => {
        timeout = undefined;
        frame = requestAnimationFrame(render);
      }, Math.max(0, lastDrawn + minFrameMs - performance.now()));
    };
    const stop = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (timeout !== undefined) clearTimeout(timeout);
      timeout = undefined;
      if (runStartedAt !== null) {
        elapsedBeforeRunMs = elapsedMs();
        runStartedAt = null;
      }
    };
    const sync = () => {
      if (cancelled || contextLost || idle || pausedRef.current || document.visibilityState !== 'visible') {
        stop();
        return;
      }
      if (runStartedAt !== null) return;
      runStartedAt = performance.now();
      render();
    };
    const armIdleTimer = () => {
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        idle = true;
        sync();
      }, idleAfterMs);
    };
    const onActivity = () => {
      armIdleTimer();
      if (idle) {
        idle = false;
        sync();
      }
    };
    redrawRef.current = () => {
      if (runStartedAt === null) draw();
    };
    syncRef.current = () => {
      sync();
      if (runStartedAt === null) draw();
    };
    if (displacementImage) {
      void loadDisplacementImage(displacementImage, imageSize).then(pixels => {
        if (cancelled) return;
        fieldPending = false;
        if (pixels) {
          field = { size: imageSize, pixels };
          fieldMean = displacementMean(pixels);
          if (!contextLost) buildTexture();
        }
        if (runStartedAt === null) draw();
      });
    }
    const observer = new ResizeObserver(() => {
      if (resize() && runStartedAt === null) draw();
    });
    observer.observe(canvas);
    const onContextLost = (event: Event) => {
      event.preventDefault();
      contextLost = true;
      sync();
    };
    const onContextRestored = () => {
      if (cancelled) return;
      contextLost = false;
      if (!buildResources()) return;
      sync();
      draw();
    };

    document.addEventListener('visibilitychange', sync);
    for (const type of ACTIVITY_EVENTS) window.addEventListener(type, onActivity, { passive: true });
    canvas.addEventListener('webglcontextlost', onContextLost);
    canvas.addEventListener('webglcontextrestored', onContextRestored);
    armIdleTimer();
    sync();
    if (runStartedAt === null) draw();

    return () => {
      cancelled = true;
      redrawRef.current = null;
      syncRef.current = null;
      stop();
      if (idleTimer !== undefined) clearTimeout(idleTimer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', sync);
      for (const type of ACTIVITY_EVENTS) window.removeEventListener(type, onActivity);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      canvas.removeEventListener('webglcontextrestored', onContextRestored);
      if (program) gl.deleteProgram(program);
      if (texture) gl.deleteTexture(texture);
      // browsers cap live contexts: hand this one back now
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      canvas.remove();
    };
  }, [idleAfterMs, displacementCells, displacementImage, imageSize, waitForImage]);

  // `paused` holds the frame; turning it off resumes the loop
  useEffect(() => {
    void paused;
    syncRef.current?.();
  }, [paused]);

  // a palette change on a held frame redraws it in the new colours
  const lookSignature = `${look?.displacementScale}/${look?.blob1Opacity}/${look?.blob2Opacity}/${look?.displacementZeroMean}`;
  useEffect(() => {
    void palette;
    void dark;
    void lookSignature;
    redrawRef.current?.();
  }, [palette, dark, lookSignature]);

  return <div ref={hostRef} aria-hidden data-shell-background-canvas="" className={className} />;
};
