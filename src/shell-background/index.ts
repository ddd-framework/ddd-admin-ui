// The animated background: a separate entry, so a host that does not import it pays nothing; the WebGL part loads
// lazily from inside it.
export { SHADER_BACKGROUND_PROPERTIES, ShaderBackground } from './ShaderBackground.tsx';
export type { ShaderBackgroundProps } from './ShaderBackground.tsx';
export { tintShaderPalette } from './shader.ts';
export type { Rgb, ShaderLook, ShaderPalette, ShaderTint } from './shader.ts';
