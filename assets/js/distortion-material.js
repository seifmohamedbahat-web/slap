/* Shared photo-plane shader: scroll-velocity chromatic aberration + wave
   warp, plus a hover-lift bulge. Used by the home gallery dolly and the
   listings grid. */
import { THREE } from './webgl-base.js';

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uVelocity;
  uniform float uHover;
  varying vec2 vUv;
  void main() {
    vUv = uv;
    vec3 pos = position;
    float wave = sin(uv.y * 6.28318 + uTime * 0.6) * 0.0;
    pos.z += wave;
    pos.z += uHover * (1.0 - length(uv - 0.5) * 1.3) * 14.0;
    pos.x += sin(uv.y * 3.14159) * uVelocity * 0.02;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uVelocity;
  uniform float uTime;
  uniform float uOpacity;
  uniform vec2 uPlanePx;
  uniform float uRadiusPx;
  uniform float uRounded;
  varying vec2 vUv;

  float roundedBoxSDF(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    float shift = clamp(uVelocity, -1.0, 1.0) * 0.006;
    vec2 uv = vUv;
    float warp = sin(uv.y * 10.0 + uTime * 0.8) * clamp(abs(uVelocity), 0.0, 1.0) * 0.004;
    uv.x += warp;

    float r = texture2D(uTexture, uv + vec2(shift, 0.0)).r;
    float g = texture2D(uTexture, uv).g;
    float b = texture2D(uTexture, uv - vec2(shift, 0.0)).b;
    vec3 color = vec3(r, g, b);

    float alpha = uOpacity;
    if (uRounded > 0.5) {
      vec2 p = (vUv - 0.5) * uPlanePx;
      float d = roundedBoxSDF(p, uPlanePx * 0.5, uRadiusPx);
      alpha *= 1.0 - smoothstep(-1.5, 1.5, d);
    }
    gl_FragColor = vec4(color, alpha);
  }
`;

export function createDistortionMaterial(texture, opts = {}) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uTexture: { value: texture },
      uVelocity: { value: 0 },
      uHover: { value: 0 },
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uPlanePx: { value: new THREE.Vector2(opts.width || 100, opts.height || 100) },
      uRadiusPx: { value: opts.radius || 0 },
      uRounded: { value: opts.rounded ? 1 : 0 },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
  });
}
