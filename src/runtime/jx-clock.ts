/**
 * JellyBox's frame clock, parked while its scenes are at rest.
 *
 * JellyBox's optics (src/vendor/jellybox/renderer/optics.js, kept byte for
 * byte) asks for the next frame on every frame, even when the scene has said
 * there is nothing to draw (`getScene` returned null). On a page at rest that
 * was 60 empty callbacks a second, forever, for each canvas.
 *
 * vite.config.ts hands that one module this file's requestAnimationFrame and
 * cancelAnimationFrame in place of the window's, in dev and in the build. The
 * renderer's own code does not change:
 *
 *   - `jellyx.ts` tells the clock how each scene answered, live or frozen
 *   - a frame asked for right after a frozen answer is held, not scheduled
 *   - `wake()` schedules every held frame; `jx.ts` calls it whenever the X's
 *     state changes (the pointer, focus, the entrance, the closing, Jelly)
 *
 * A live scene keeps its loop exactly as JellyBox wrote it.
 */

export interface Scene {
  /** the last answer was "nothing to draw" */
  frozen: boolean;
  /** the frame asked for after that answer, waiting for `wake()` */
  held: FrameRequestCallback | null;
  /** the id handed back for the held frame (negative, so it never matches a real one) */
  id: number;
  /** the real id once a held frame has been scheduled */
  real: number;
}

const scenes: Scene[] = [];
let asking: Scene | null = null;
let seq = 0;
let clearing = false;

const forget = () => {
  asking = null;
  clearing = false;
};

/** A new scene for the clock to watch. */
export function scene(): Scene {
  const s: Scene = { frozen: false, held: null, id: 0, real: 0 };
  scenes.push(s);
  return s;
}

/**
 * The scene just answered. The renderer asks for its next frame in the same
 * task, straight after, so that request belongs to this scene. The note is
 * dropped at the end of the task either way.
 */
export function asked(s: Scene, frozen: boolean): void {
  s.frozen = frozen;
  asking = s;
  if (!clearing) {
    clearing = true;
    queueMicrotask(forget);
  }
}

/** The renderer's requestAnimationFrame: held while its scene is frozen. */
export function requestAnimationFrame(cb: FrameRequestCallback): number {
  const s = asking;
  asking = null;
  if (s && s.frozen) {
    s.held = cb;
    s.real = 0;
    s.id = -++seq;
    return s.id;
  }
  return window.requestAnimationFrame(cb);
}

/** The renderer's cancelAnimationFrame: a held frame is simply dropped. */
export function cancelAnimationFrame(id: number): void {
  if (id >= 0) return window.cancelAnimationFrame(id);
  for (const s of scenes) {
    if (s.id !== id) continue;
    s.held = null;
    if (s.real) window.cancelAnimationFrame(s.real);
    s.real = 0;
    s.id = 0;
  }
}

/** Something changed: every held frame runs on the next frame. */
export function wake(): void {
  for (const s of scenes) {
    const cb = s.held;
    if (!cb) continue;
    s.held = null;
    s.frozen = false;
    s.real = window.requestAnimationFrame(cb);
  }
}

/** For the checks: how many scenes are parked right now. */
export const parked = (): number => scenes.filter((s) => s.held).length;
