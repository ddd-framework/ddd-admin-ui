/**
 * Colour values as stored text: hex only, in an explicit format. `hex`: `#rrggbb`. `hex-alpha`: `#rrggbb`, or
 * `#rrggbbaa` when the alpha is below 1. Input may be short (`#abc`, `#abcd`), without `#`, in any case.
 */
export type ColorValueFormat = 'hex' | 'hex-alpha';

export interface RgbaValue {
  r: number;
  g: number;
  b: number;
  /** 0–1. */
  a: number;
}

const HEX = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/** Reads a hex colour (`#abc`, `#abcd`, `#aabbcc`, `#aabbccdd`, `#` optional); `null` otherwise. */
export const parseHexColor = (text: string): RgbaValue | null => {
  const match = HEX.exec(text.trim());
  if (!match) return null;
  let digits = match[1] as string;
  if (digits.length <= 4) digits = [...digits].map(digit => digit + digit).join('');
  const channel = (index: number) => Number.parseInt(digits.slice(index, index + 2), 16);
  return { r: channel(0), g: channel(2), b: channel(4), a: digits.length === 8 ? Math.round((channel(6) / 255) * 1000) / 1000 : 1 };
};

const hex2 = (value: number) => Math.round(Math.min(255, Math.max(0, value))).toString(16).padStart(2, '0');

/** Writes `rgba` in `format` (`hex` drops the alpha), lower case unless `letterCase` is `upper`. */
export const formatHexColor = (rgba: RgbaValue, format: ColorValueFormat, letterCase: 'lower' | 'upper' = 'lower'): string => {
  const alpha = format === 'hex-alpha' && rgba.a < 1 ? hex2(rgba.a * 255) : '';
  const text = `#${hex2(rgba.r)}${hex2(rgba.g)}${hex2(rgba.b)}${alpha}`;
  return letterCase === 'upper' ? text.toUpperCase() : text;
};

/**
 * The stored form of a typed colour: `''` → `null` (no colour), a valid colour in `format` (a typed alpha is refused
 * by `hex`), `undefined` for text that is not a colour of that format.
 */
export const normalizeColorValue = (
  text: string,
  format: ColorValueFormat,
  letterCase: 'lower' | 'upper' = 'lower'
): string | null | undefined => {
  if (text.trim() === '') return null;
  const parsed = parseHexColor(text);
  if (!parsed) return undefined;
  if (format === 'hex' && parsed.a < 1) return undefined;
  return formatHexColor(parsed, format, letterCase);
};
