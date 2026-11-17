/**
 * The WebGL program of the animated background: a full-screen quad whose fragment shader lays two soft colour blobs
 * over a base colour. Each blob orbits, is warped by sin / cos distortion and by a displacement texture (generated
 * here, no asset), and is blended into the base (multiplied on a light background, screened on a dark one).
 */

export type Rgb = readonly [number, number, number];

/** The colours of one scheme: the base and the two blobs (0–255 channels). */
export interface ShaderPalette {
  base: Rgb;
  blobs: readonly [Rgb, Rgb];
}

export const VERTEX_SOURCE = 'attribute vec3 aPosition;void main(){vec4 p=vec4(aPosition,1.0);p.xy=p.xy*2.0-1.0;gl_Position=p;}';

export const FRAGMENT_SOURCE = `#ifdef GL_ES
precision highp float;
#endif
uniform vec2 u_resolution; uniform float u_time; uniform float u_rand;
uniform vec3 u_bg;
uniform vec3 u_col1; uniform float u_opacity1;
uniform vec3 u_col2; uniform float u_opacity2;
uniform float u_b1_radius; uniform float u_b2_radius;
uniform float u_blur; uniform float u_distort;
uniform float u_bx; uniform float u_by; uniform int u_blend;
uniform sampler2D u_displace; uniform float u_displace_scale;
uniform float u_b1_fx; uniform float u_b1_fy; uniform float u_b1_ox; uniform float u_b1_oy;
uniform float u_b2_fx; uniform float u_b2_fy; uniform float u_b2_ox; uniform float u_b2_oy;
float blob(vec2 st,vec2 c,float r,float b){return 1.0-smoothstep(r,r+b,distance(st,c)*2.0);}
vec3 blendScreen(vec3 a,vec3 b){return a+b-a*b;}
vec3 blendMultiply(vec3 a,vec3 b){return a*b;}
vec3 blend(vec3 a,vec3 b){if(u_blend==1)return blendMultiply(a,b);return blendScreen(a,b);}
void main(){
  vec2 uv=gl_FragCoord.xy/u_resolution.xy;
  float t=u_time+u_rand;
  float aspect=u_resolution.x/u_resolution.y;
  vec2 dispUv=vec2(uv.x,0.5+(uv.y-0.5)/aspect);
  vec2 td=texture2D(u_displace,dispUv).rg-0.5;
  vec2 st1=uv; st1.x+=cos(t*.30+st1.x*4.)*.21*sin(t*.40+st1.y*8.)*.29*u_distort; st1.y+=sin(t*.10+st1.x*7.)*.37*cos(t*.60+st1.y*5.)*.12*u_distort;
  vec2 st2=uv; st2.x+=cos(t*.45+st2.x*5.)*.18*sin(t*.35+st2.y*6.)*.24*u_distort; st2.y+=sin(t*.20+st2.x*9.)*.29*cos(t*.55+st2.y*4.)*.16*u_distort;
  st1+=td*u_displace_scale;
  st2+=td*u_displace_scale;
  vec2 c1=vec2(u_bx+cos(t*u_b1_fx)*u_b1_ox,u_by+sin(t*u_b1_fy)*u_b1_oy);
  vec2 c2=vec2(u_bx+cos(t*u_b2_fx)*u_b2_ox,u_by+sin(t*u_b2_fy)*u_b2_oy);
  vec3 color=u_bg/255.0;
  color=mix(color,blend(color,u_col1/255.0),blob(st1,c1,u_b1_radius,u_blur)*u_opacity1);
  color=mix(color,blend(color,u_col2/255.0),blob(st2,c2,u_b2_radius,u_blur)*u_opacity2);
  gl_FragColor=vec4(color,1.0);
}`;

/**
 * Every time frequency in the shader is a multiple of 0.01, so the animation repeats every 2π / 0.01 time units;
 * wrapping the time there is seamless and keeps it small for 32-bit floats. A new frequency must stay a multiple of 0.01.
 */
export const SHADER_TIME_PERIOD = 200 * Math.PI;

/** Motion and shape: soft, slow, low contrast. */
export const SHADER_MOTION = {
  speed: 8.8,
  blur: 2.6,
  distort: 3.5,
  bx: 0.5,
  by: 0.5,
  displaceScale: 2.2,
  blob1: { radius: 0.25, fx: 0.33, fy: 0.61, ox: 0.28, oy: 0.4, opacity: 1 },
  blob2: { radius: 0.18, fx: 0.21, fy: 0.17, ox: 0.38, oy: 0.42, opacity: 0.6 },
} as const;

/** Render budget: quarter resolution, at most 512 px wide, at most 20 frames per second. */
export const SHADER_RENDER = { renderScale: 0.25, maxRenderWidth: 512, maxFps: 20 } as const;

const UNIFORM_NAMES = [
  'resolution', 'time', 'rand', 'bg', 'col1', 'opacity1', 'col2', 'opacity2', 'b1_radius', 'b2_radius', 'blur', 'distort',
  'bx', 'by', 'blend', 'displace', 'displace_scale', 'b1_fx', 'b1_fy', 'b1_ox', 'b1_oy', 'b2_fx', 'b2_fy', 'b2_ox', 'b2_oy',
] as const;

export type UniformMap = Record<(typeof UNIFORM_NAMES)[number], WebGLUniformLocation | null>;

const compileShader = (gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null => {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
};

/** Compiles and links the program and binds the full-screen quad; `null` when the driver refuses (no background). */
export const initShaderProgram = (gl: WebGLRenderingContext): { program: WebGLProgram; uniforms: UniformMap } | null => {
  const vertex = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SOURCE);
  const fragment = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SOURCE);
  const program = gl.createProgram();
  if (!vertex || !fragment || !program) return null;
  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);
  const position = gl.getAttribLocation(program, 'aPosition');
  const buffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const uniforms = Object.fromEntries(UNIFORM_NAMES.map(name => [name, gl.getUniformLocation(program, `u_${name}`)])) as UniformMap;
  return { program, uniforms };
};

/** Smooth value noise, tileable over `size`, as RG bytes (B 255, A 255): the displacement field. Deterministic. */
export const displacementPixels = (size = 128, cells = 8): Uint8Array => {
  // a fixed pseudo-random lattice (xorshift), so every visit draws the same field
  let seed = 0x9e3779b9;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return ((seed >>> 0) % 1000) / 1000;
  };
  const lattice = [0, 1].map(() => Array.from({ length: cells * cells }, random));
  const smooth = (value: number) => value * value * (3 - 2 * value);
  const sample = (grid: number[], x: number, y: number) => {
    const x0 = Math.floor(x) % cells;
    const y0 = Math.floor(y) % cells;
    const x1 = (x0 + 1) % cells;
    const y1 = (y0 + 1) % cells;
    const fx = smooth(x - Math.floor(x));
    const fy = smooth(y - Math.floor(y));
    const top = (grid[y0 * cells + x0] ?? 0) * (1 - fx) + (grid[y0 * cells + x1] ?? 0) * fx;
    const bottom = (grid[y1 * cells + x0] ?? 0) * (1 - fx) + (grid[y1 * cells + x1] ?? 0) * fx;
    return top * (1 - fy) + bottom * fy;
  };
  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const u = (x / size) * cells;
      const v = (y / size) * cells;
      pixels[index] = Math.round(sample(lattice[0] as number[], u, v) * 255);
      pixels[index + 1] = Math.round(sample(lattice[1] as number[], u, v) * 255);
      pixels[index + 2] = 255;
      pixels[index + 3] = 255;
    }
  }
  return pixels;
};

/** The displacement texture (generated value noise, repeating). */
export const createDisplacementTexture = (gl: WebGLRenderingContext, size = 128): WebGLTexture | null => {
  const texture = gl.createTexture();
  if (!texture) return null;
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, size, size, 0, gl.RGBA, gl.UNSIGNED_BYTE, displacementPixels(size));
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  return texture;
};

/** Sets every per-frame uniform. A light background multiplies its blobs in, a dark one screens them. */
export const setShaderUniforms = (
  gl: WebGLRenderingContext,
  uniforms: UniformMap,
  canvas: HTMLCanvasElement,
  palette: ShaderPalette,
  dark: boolean,
  frame: { time: number; rand: number; texture: WebGLTexture }
): void => {
  const { blob1, blob2 } = SHADER_MOTION;
  gl.uniform2fv(uniforms.resolution, [canvas.width, canvas.height]);
  gl.uniform1f(uniforms.time, frame.time);
  gl.uniform1f(uniforms.rand, frame.rand);
  gl.uniform3fv(uniforms.bg, palette.base);
  gl.uniform3fv(uniforms.col1, palette.blobs[0]);
  gl.uniform1f(uniforms.opacity1, blob1.opacity);
  gl.uniform3fv(uniforms.col2, palette.blobs[1]);
  gl.uniform1f(uniforms.opacity2, blob2.opacity);
  gl.uniform1f(uniforms.b1_radius, blob1.radius);
  gl.uniform1f(uniforms.b2_radius, blob2.radius);
  gl.uniform1f(uniforms.blur, SHADER_MOTION.blur);
  gl.uniform1f(uniforms.distort, SHADER_MOTION.distort);
  gl.uniform1f(uniforms.bx, SHADER_MOTION.bx);
  gl.uniform1f(uniforms.by, SHADER_MOTION.by);
  gl.uniform1i(uniforms.blend, dark ? 0 : 1);
  gl.uniform1f(uniforms.displace_scale, SHADER_MOTION.displaceScale);
  gl.uniform1f(uniforms.b1_fx, blob1.fx);
  gl.uniform1f(uniforms.b1_fy, blob1.fy);
  gl.uniform1f(uniforms.b1_ox, blob1.ox);
  gl.uniform1f(uniforms.b1_oy, blob1.oy);
  gl.uniform1f(uniforms.b2_fx, blob2.fx);
  gl.uniform1f(uniforms.b2_fy, blob2.fy);
  gl.uniform1f(uniforms.b2_ox, blob2.ox);
  gl.uniform1f(uniforms.b2_oy, blob2.oy);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, frame.texture);
  gl.uniform1i(uniforms.displace, 0);
};

/** `weight` of `color`, the rest `other`. */
export const mixRgb = (color: Rgb, other: Rgb, weight: number): Rgb => [
  Math.round(color[0] * weight + other[0] * (1 - weight)),
  Math.round(color[1] * weight + other[1] * (1 - weight)),
  Math.round(color[2] * weight + other[2] * (1 - weight)),
];

/** Colours a themed area lays over the default blobs; a missing one keeps the default. */
export interface ShaderTint {
  primary?: Rgb | null;
  secondary?: Rgb | null;
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

/**
 * The default palette tinted for a themed area: the primary tint as the first blob, the secondary as the second, washed
 * out to a low saturation (light: mostly white, multiplied in; dark: mostly black, screened in). Dark keeps the
 * default second blob.
 */
export const tintShaderPalette = (defaults: ShaderPalette, tint: ShaderTint, dark: boolean): ShaderPalette =>
  dark
    ? { base: defaults.base, blobs: [tint.primary ? mixRgb(tint.primary, BLACK, 0.1) : defaults.blobs[0], defaults.blobs[1]] }
    : {
        base: defaults.base,
        blobs: [tint.primary ? mixRgb(tint.primary, WHITE, 0.08) : defaults.blobs[0], tint.secondary ? mixRgb(tint.secondary, WHITE, 0.12) : defaults.blobs[1]],
      };
