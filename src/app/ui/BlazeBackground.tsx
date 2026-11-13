import { useEffect, useRef } from 'react'

/**
 * Embers rising from the bottom of the pane, behind everything else. Opt-in:
 * `App` mounts this only when its `embers` prop is on.
 *
 * The fire pass of canvasui.dev's **Blaze** (`npx shadcn add @canvas-ui/blaze-react`),
 * and only that. Blaze proper wraps its children in a `<canvas layoutsubtree>`
 * and redraws them through the shader so the heat bends the text — Chrome's
 * experimental html-in-canvas API, which Obsidian's Electron does not ship.
 * Without it Blaze draws the fire *over* the content, which is not a
 * background; and with it every page would live inside a canvas, which no
 * `MarkdownRenderer`, scroller or Obsidian control here was written for. So the
 * content stays in the DOM, untouched, and this canvas sits under it.
 *
 * **It never positions against the window.** It is `absolute` inside
 * `.my-dnd-vault`, which `isolation: isolate` makes the stacking context, so
 * `z-index: -1` puts it above the pane's background and below every page.
 * Anything with a background of its own covers it, which is the intent.
 *
 * Cost is bounded three ways: the canvas renders at half the device pixel ratio
 * (Blaze's own fire target is half size too), the loop stops while the tab is
 * hidden — Obsidian `display: none`s a background tab, which the intersection
 * observer sees — and `prefers-reduced-motion` freezes it on one frame. Each tab
 * mounts its own `App`, so each visible tab is one WebGL context.
 *
 * Without WebGL 2 — jsdom, an old GPU, a lost context — it renders an empty
 * canvas and nothing else happens.
 */
export function BlazeBackground() {
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    return startBlaze(canvas)
  }, [])

  return <canvas ref={ref} className="my-dnd-vault__blaze" aria-hidden />
}

/** Blaze's defaults, minus the distortion that needs html-in-canvas. */
const OPTIONS = {
  height: 0.97,
  speed: 1,
  sparks: 0.5,
  sparkDensity: 1.5,
  sparkSize: 1,
  layers: 4,
  smoke: 0.5,
  glow: 1.5,
  sparkColor: [1, 0.4, 0.05],
  smokeColor: [1, 0.43, 0.1],
} as const

/** Half the device pixel ratio, capped at 1: embers are soft, and this runs every frame. */
const pixelRatio = (): number => Math.min(window.devicePixelRatio || 1, 2) / 2

function startBlaze(canvas: HTMLCanvasElement): (() => void) | undefined {
  // jsdom defines no WebGL at all, and asking it for a context logs "not
  // implemented" into every UI test.
  if (typeof WebGL2RenderingContext === 'undefined') return
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    depth: false,
    stencil: false,
    antialias: false,
    premultipliedAlpha: true,
  })
  if (!gl || gl.isContextLost()) return

  const program = link(gl, VERT, FIRE_FRAG)
  if (!program) return
  const uniform = (name: string) => gl.getUniformLocation(program.program, name)

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  gl.enableVertexAttribArray(0)
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)

  gl.useProgram(program.program)
  gl.uniform1f(uniform('uHeight'), OPTIONS.height)
  gl.uniform1f(uniform('uSparks'), OPTIONS.sparks)
  gl.uniform1f(uniform('uSparkDensity'), OPTIONS.sparkDensity)
  gl.uniform1f(uniform('uSparkSize'), OPTIONS.sparkSize)
  gl.uniform1i(uniform('uLayers'), OPTIONS.layers)
  gl.uniform1f(uniform('uSmoke'), OPTIONS.smoke)
  gl.uniform1f(uniform('uGlow'), OPTIONS.glow)
  gl.uniform3f(uniform('uSparkColor'), ...OPTIONS.sparkColor)
  gl.uniform3f(uniform('uSmokeColor'), ...OPTIONS.smokeColor)
  const uResolution = uniform('uResolution')
  const uTime = uniform('uTime')

  const resize = () => {
    const ratio = pixelRatio()
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio))
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio))
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width
      canvas.height = height
    }
  }

  let time = 0
  let last = performance.now()
  let raf = 0
  let running = false
  let visible = true
  let destroyed = false
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')

  const render = () => {
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.uniform2f(uResolution, canvas.width, canvas.height)
    gl.uniform1f(uTime, time)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  const frame = (now: number) => {
    if (destroyed || !visible) {
      running = false
      return
    }
    // Clamped, so a tab coming back after an hour does not jump the embers.
    const delta = Math.min((now - last) / 1000, 1 / 30)
    last = now
    if (!motion.matches) time += delta * OPTIONS.speed
    render()
    if (motion.matches) {
      running = false
      return
    }
    raf = requestAnimationFrame(frame)
  }

  const start = () => {
    if (destroyed || running || !visible) return
    running = true
    last = performance.now()
    raf = requestAnimationFrame(frame)
  }

  resize()
  start()

  const sized = new ResizeObserver(() => {
    resize()
    start()
  })
  sized.observe(canvas)
  const shown = new IntersectionObserver(entries => {
    visible = entries.at(-1)?.isIntersecting ?? true
    start()
  })
  shown.observe(canvas)
  motion.addEventListener('change', start)

  return () => {
    destroyed = true
    cancelAnimationFrame(raf)
    sized.disconnect()
    shown.disconnect()
    motion.removeEventListener('change', start)
    gl.deleteBuffer(quad)
    gl.deleteProgram(program.program)
    gl.deleteShader(program.vertex)
    gl.deleteShader(program.fragment)
  }
}

function link(gl: WebGL2RenderingContext, vertexText: string, fragmentText: string) {
  const compile = (type: number, text: string) => {
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, text)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error('[my-dnd-vault] blaze shader:', gl.getShaderInfoLog(shader))
    }
    return shader
  }
  const vertex = compile(gl.VERTEX_SHADER, vertexText)
  const fragment = compile(gl.FRAGMENT_SHADER, fragmentText)
  const program = gl.createProgram()
  gl.attachShader(program, vertex)
  gl.attachShader(program, fragment)
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program)
    gl.deleteShader(vertex)
    gl.deleteShader(fragment)
    return null
  }
  return { program, vertex, fragment }
}

const VERT = `#version 300 es
precision highp float;
layout(location = 0) in vec2 aPos;
out vec2 vUv;
void main () {
  vUv = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}`

/**
 * Blaze's fire pass, verbatim but for the last line: Blaze writes this into a
 * framebuffer and its main pass draws it at 0.85 alpha, so that is folded in
 * here and there is no second pass.
 */
const FIRE_FRAG = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 outColor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uHeight;
uniform float uSparks;
uniform float uSparkDensity;
uniform float uSparkSize;
uniform int uLayers;
uniform float uSmoke;
uniform float uGlow;
uniform vec3 uSparkColor;
uniform vec3 uSmokeColor;

#define MOVE_DIR vec2(0.0, -1.0)
#define MOVE_SPEED 0.5

float hash1_2 (vec2 x) {
  return fract(sin(dot(x, vec2(52.127, 61.2871))) * 521.582);
}

vec2 hash2_2 (vec2 x) {
  return fract(sin(x * mat2(20.52, 24.1994, 70.291, 80.171)) * 492.194);
}

vec2 noise2_2 (vec2 uv) {
  vec2 f = smoothstep(0.0, 1.0, fract(uv));
  vec2 uv00 = floor(uv);
  vec2 v00 = hash2_2(uv00);
  vec2 v01 = hash2_2(uv00 + vec2(0.0, 1.0));
  vec2 v10 = hash2_2(uv00 + vec2(1.0, 0.0));
  vec2 v11 = hash2_2(uv00 + 1.0);
  return mix(mix(v00, v01, f.y), mix(v10, v11, f.y), f.x);
}

vec3 permute (vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }

float snoise (vec2 v) {
  const vec4 C = vec4(0.211324865405187, 0.366025403784439,
    -0.577350269189626, 0.024390243902439);
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod(i, 289.0);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}

float fbm (vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    v += a * snoise(p);
    p = mat2(1.6, 1.2, -1.2, 1.6) * p + 11.7;
    a *= 0.5;
  }
  return v * 0.5 + 0.5;
}

float smokeField (vec2 p, float t) {
  vec2 rise = vec2(-t * 0.03, -t * 0.22);
  vec2 q = vec2(
    fbm(p + rise),
    fbm(p + rise * 0.85 + vec2(5.2, 1.3)));
  return fbm(p + 0.55 * q + rise);
}

vec2 rotate2 (vec2 point, float deg) {
  float s = sin(deg);
  float c = cos(deg);
  return mat2(s, c, -c, s) * point;
}

vec2 voronoiPoint (vec2 root, float deg) {
  vec2 point = hash2_2(root) - 0.5;
  float s = sin(deg);
  float c = cos(deg);
  point = mat2(s, c, -c, s) * point * 0.66;
  point += root + 0.5;
  return point;
}

vec2 randomAround (vec2 point, vec2 range, vec2 uv) {
  return point + (hash2_2(uv) - 0.5) * range;
}

vec3 fireParticles (vec2 uv, vec2 originalUV) {
  vec3 particles = vec3(0.0);
  vec2 rootUV = floor(uv);
  float deg = uTime * 0.6 * (hash1_2(rootUV) - 0.5) * 2.0;
  vec2 pointUV = voronoiPoint(rootUV, deg);
  float size = 0.002 * uSparkSize;

  vec2 tempUV = uv + vec2(
    snoise(uv * 1.8 + uTime * 0.55),
    snoise(uv * 1.8 - uTime * 0.4 + 7.3)) * 0.06;

  float dist = length(rotate2(tempUV - pointUV, 0.7)
    * randomAround(vec2(0.5, 1.6), vec2(0.25, 0.2), rootUV));
  float distBloom = length(rotate2(tempUV - pointUV, 0.7)
    * randomAround(vec2(0.5, 0.8), vec2(0.3, 0.1), rootUV));

  particles += (1.0 - smoothstep(size * 0.6, size * 3.0, dist)) * uSparkColor * 1.5;
  particles += pow(1.0 - smoothstep(0.0, size * 6.0, distBloom), 3.0) * uSparkColor * 0.8;

  float border = (hash1_2(rootUV) - 0.5) * 2.0;
  float disappear = 1.0 - smoothstep(border, border + 0.5, originalUV.y);
  border = (hash1_2(rootUV + 0.214) - 1.8) * 0.7;
  float appear = smoothstep(border, border + 0.4, originalUV.y);

  return particles * disappear * appear;
}

vec3 layeredParticles (vec2 uv, float sizeMod, float alphaMod, int layers, float smoke) {
  vec3 particles = vec3(0.0);
  float size = 1.0;
  float alpha = 1.0;
  vec2 offset = vec2(0.0);
  for (int i = 0; i < layers; i++) {
    vec2 noiseOffset = (noise2_2(uv * size * 2.0 + 0.5) - 0.5) * 0.15;
    vec2 bokehUV = (uv * size * uSparkDensity + uTime * MOVE_DIR * MOVE_SPEED)
      + offset + noiseOffset;
    particles += fireParticles(bokehUV, uv) * alpha
      * (1.0 - smoothstep(0.0, 1.0, smoke) * (float(i) / float(layers)));
    offset += hash2_2(vec2(alpha, alpha)) * 10.0;
    alpha *= alphaMod;
    size *= sizeMod;
  }
  return particles;
}

void main () {
  vec2 uv = vUv;

  float zone = clamp(uHeight, 0.02, 1.0);
  float fy = uv.y / zone;

  if (fy > 1.0) {
    outColor = vec4(0.0);
    return;
  }

  float aspect = uResolution.x / uResolution.y;
  vec2 fireUv = vec2((uv.x - 0.5) * aspect * 3.2, mix(-0.7, 1.6, fy));

  float smokeIntensity = 0.0;
  if (uSmoke > 0.001) {
    smokeIntensity = smokeField(fireUv * vec2(0.4, 0.55), uTime);
    smokeIntensity = smoothstep(0.42, 1.15, smokeIntensity);
    smokeIntensity *= pow(1.0 - smoothstep(-1.0, 1.6, fireUv.y), 1.5);
  }
  vec3 smoke = smokeIntensity * uSmokeColor * 0.8 * uSmoke;

  vec3 particles = vec3(0.0);
  if (uSparks > 0.001) {
    particles = layeredParticles(fireUv, 1.01, 0.9, uLayers, smokeIntensity) * uSparks;
  }

  float fade = 1.0 - smoothstep(0.55, 1.0, fy);
  vec3 glow = uSmokeColor * 0.05 * uGlow * pow(1.0 - fy, 2.0);
  vec3 fire = (particles + smoke) * fade + glow;

  outColor = vec4(fire, clamp(max(fire.r, max(fire.g, fire.b)) * 0.85, 0.0, 1.0));
}`
