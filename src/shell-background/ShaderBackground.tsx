'use client';

import { lazy, Suspense, useEffect, useRef, useState } from 'react';

import { type Rgb, type ShaderPalette, type ShaderTint, tintShaderPalette } from './shader.ts';

const ShaderCanvas = lazy(() => import('./ShaderCanvas.tsx').then(module => ({ default: module.ShaderCanvas })));

const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

/** The custom properties the palette is read from, each with the colour role it falls back to. */
export const SHADER_BACKGROUND_PROPERTIES = {
  base: ['--shell-background-base', '--background'],
  blob1: ['--shell-background-blob-1', '--brand-light'],
  blob2: ['--shell-background-blob-2', '--accent'],
} as const;

const FALLBACK: Rgb = [255, 255, 255];

/** Any CSS colour the browser understands → channels, by painting one pixel. `null` when it is not a colour. */
const toRgb = (value: string): Rgb | null => {
  const text = value.trim();
  if (text === '') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const context = canvas.getContext('2d', { willReadFrequently: true });
  if (!context) return null;
  context.fillStyle = '#000';
  context.fillStyle = text;
  context.fillRect(0, 0, 1, 1);
  const [red = 0, green = 0, blue = 0] = context.getImageData(0, 0, 1, 1).data;
  return [red, green, blue];
};

/** The palette from the custom properties as `element` sees them (so `.dark` on any ancestor applies). */
const readPalette = (element: HTMLElement): ShaderPalette => {
  const style = window.getComputedStyle(element);
  const read = (names: readonly string[]) => {
    for (const name of names) {
      const rgb = toRgb(style.getPropertyValue(name));
      if (rgb) return rgb;
    }
    return FALLBACK;
  };
  return { base: read(SHADER_BACKGROUND_PROPERTIES.base), blobs: [read(SHADER_BACKGROUND_PROPERTIES.blob1), read(SHADER_BACKGROUND_PROPERTIES.blob2)] };
};

const supportsWebGl = (): boolean => {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl');
  gl?.getExtension('WEBGL_lose_context')?.loseContext();
  return gl !== null;
};

const samePalette = (left: ShaderPalette | null, right: ShaderPalette): boolean =>
  left !== null && JSON.stringify(left) === JSON.stringify(right);

export interface ShaderBackgroundProps {
  /** Colours over the default blobs (a themed area's brand colours, as channels). */
  tint?: ShaderTint;
  /** Dark blending; default: whether the element sits inside `.dark`, followed live. */
  dark?: boolean;
  /** No input for this long → the frame holds (default 60 s). */
  idleAfterMs?: number;
  className?: string;
}

/**
 * An animated background behind the whole page (pass it as `AppShell.background`): soft colour blobs drifting over the
 * base colour, read from `--shell-background-base`, `--shell-background-blob-1` and `--shell-background-blob-2` (falling
 * back to `--background`, `--brand-light`, `--accent`), re-read when `.dark` changes on `<html>` or `<body>`. A separate
 * entry: a host that does not import it pays nothing. The WebGL part loads lazily after hydration; without WebGL or
 * with `prefers-reduced-motion` nothing is drawn and the page background shows. The server renders an empty, fixed,
 * `aria-hidden` layer (`data-shell-background`), so hydration matches. The page background must sit on `<html>` (or
 * the body must be transparent), or it covers the layer.
 */
export const ShaderBackground = ({ tint, dark: darkProp, idleAfterMs = 60_000, className }: ShaderBackgroundProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [state, setState] = useState<{ palette: ShaderPalette; dark: boolean } | null>(null);
  const [reducedMotion, setReducedMotion] = useState(true);
  const primary = tint?.primary ?? null;
  const secondary = tint?.secondary ?? null;

  useEffect(() => {
    const query = window.matchMedia(REDUCED_MOTION_QUERY);
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supportsWebGl()) return;
    const update = () => {
      const dark = darkProp ?? host.closest('.dark') !== null;
      const defaults = readPalette(host);
      const palette = primary || secondary ? tintShaderPalette(defaults, { primary, secondary }, dark) : defaults;
      setState(current => (current && current.dark === dark && samePalette(current.palette, palette) ? current : { palette, dark }));
    };
    update();
    const observer = new MutationObserver(update);
    for (const element of [document.documentElement, document.body]) observer.observe(element, { attributes: true, attributeFilter: ['class', 'style', 'data-theme'] });
    return () => observer.disconnect();
    // the tint arrives as channels; compare them by value
  }, [darkProp, primary?.join(','), secondary?.join(',')]);

  return (
    <div ref={hostRef} aria-hidden data-shell-background="" className={className ?? 'pointer-events-none fixed inset-0 -z-10'}>
      {state && !reducedMotion && (
        <Suspense fallback={null}>
          <ShaderCanvas palette={state.palette} dark={state.dark} idleAfterMs={idleAfterMs} className="size-full" />
        </Suspense>
      )}
    </div>
  );
};
