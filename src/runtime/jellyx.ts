/**
 * JellyBox's own optics, as a lazy chunk.
 *
 * The X and the Jelly lineage card are rendered by JellyBox itself: its
 * `createOptics` (three.js MeshPhysicalMaterial with JellyBox's density field,
 * pocket, jelly response and cast) and its state pigments (`createJellyPalette`,
 * the Spectral.js mix). The source is vendored in `src/vendor/jellybox/`
 * (globalanomalyindex/jellybox @ 92538fd, MIT). Nothing here redraws the
 * material: it only says where each body sits and what state it is in.
 *
 * Loaded after the page has been seen, on a desktop pointer with WebGL, and
 * never on a phone: a finger covers the disc, and JellyBox's own CSS skin is
 * the honest fallback everywhere else (see `jx.ts`).
 *
 * Three things the renderer needs that reading its source turned up:
 *   - bubbles ignore `arrival`; they read `opacity`
 *   - the jelly dents under the pointer only if the scene has `pointer`
 *   - its DPR is capped at 1.3 for small scenes, so the scene is described
 *     `k` times larger than its CSS box and the backing store comes out native
 */

import { createOptics, type OpticsController } from '../vendor/jellybox/renderer/optics.js';
import { createJellyPalette } from '../vendor/jellybox/color.js';

export interface Body {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  r?: number;
  hover?: boolean;
  pressed?: boolean;
  feedback?: number;
  assistX?: number;
  assistY?: number;
  /** display colour, from `pigmentAt` */
  color: string;
  opacity?: number;
}

export interface State {
  width: number;
  height: number;
  reduced?: boolean;
  motion?: number;
  pointer?: { x: number; y: number } | null;
  bodies: Body[];
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255) as [number, number, number];

/** JellyBox's renderer caps DPR at 1.3 for small scenes; describe the scene this much larger so the pixels are native. */
export const sceneScale = (): number => clamp((window.devicePixelRatio || 1) / 1.3, 1, 2);

/** JellyBox's state pigment at strength k: 0.68 at rest, 0.88 highlighted, 1 pressed. */
export const pigmentAt = (pigment: string, k: number): string => createJellyPalette('#c9e2ed', pigment).sample(clamp(k, 0, 1));

/** Mount JellyBox's renderer on `canvas`. `get` returns null to freeze: the canvas keeps its last picture and costs nothing. */
export function mount(canvas: HTMLCanvasElement, get: () => State | null, onFrame?: () => void): OpticsController {
  const k = sceneScale();
  return createOptics(canvas, {
    getScene() {
      const s = get();
      if (!s) return null;
      const W = s.width * k;
      const H = s.height * k;
      return {
        dpr: Math.min(window.devicePixelRatio || 1, 2),
        width: W,
        height: H,
        reducedMotion: !!s.reduced,
        params: { motion: s.motion ?? 0.95 },
        pointer: s.pointer ? { x: s.pointer.x * k, y: s.pointer.y * k, visible: true } : { x: 0, y: 0, visible: false },
        buttons: [],
        contrastTargets: [],
        panel: null,
        bubbles: s.bodies.map((b) => ({
          x: b.x * k,
          y: b.y * k,
          width: b.w * k,
          height: b.h * k,
          cornerRadius: (b.r ?? Math.min(b.w, b.h) / 2) * k,
          id: b.id,
          kind: 'control',
          attached: false,
          layer: 1,
          clip: { x: 0, y: 0, width: W, height: H },
          hover: b.hover ? 1 : 0,
          pressed: b.pressed ? 1 : 0,
          feedback: b.feedback,
          assistX: (b.assistX ?? 0) * k,
          assistY: (b.assistY ?? 0) * k,
          assistStrength: b.assistX != null ? 1 : 0,
          grouped: false,
          selected: false,
          flow: null,
          color: rgb(b.color),
          colorSampled: true,
          opacity: clamp(b.opacity ?? 1, 0, 1),
        })),
      };
    },
    onAfterRender: onFrame,
    onError(message) {
      canvas.dataset.jxError = message;
    },
  });
}
