/**
 * Lattice geometry — the modular crosshair field the redesign rests on.
 *
 * One idea, stated once: every frame on a screen has its four corners land
 * exactly on a lattice point, so a component's corner mark is never drawn. It
 * is the background peg at that intersection, switched on. That is why the
 * numbers below are not decoration — if a frame's corner misses a point, the
 * whole system stops meaning anything.
 *
 * A lattice is six numbers. `cols × rows` cells of `step` px sit in a CSS grid
 * whose origin is `-step/2` from the first point, so each cell's CENTER is a
 * lattice point rather than its corner. That offset is the whole reason
 * nothing clips: a point at x = 0 would be half off the canvas, whereas
 * centering puts the first point a half step in and the last a half step from
 * the far edge.
 *
 * MODULE ARITHMETIC. 1920 and 1080 share the divisors 120, 60, 40, 30 and 24.
 * Every step here comes from that set, which is what makes the grid divide the
 * canvas evenly. 96 and 64 look like reasonable modules and are not: neither
 * divides 1080, and both leave a partial row. `assertLattice` refuses them.
 */

import { STAGE } from './layout.ts';

export interface LatticeCfg {
  /** Debug name, used in assertion messages. */
  readonly id: string;
  /** Grid pitch in design px. Must divide both stage axes. */
  readonly step: number;
  readonly cols: number;
  readonly rows: number;
  /**
   * Every `major`th point is on the module and drawn heavier. The offset is
   * the residue that qualifies: on 2a `stride 3, offset 2` puts majors at
   * columns 2, 5, 8 … which are x = 120, 240, 360 …
   */
  readonly major: number;
  readonly majorOffset: number;
  /** Resting glyph size, and the size a major is drawn at. */
  readonly micro: number;
  readonly majorSize: number;
}

/**
 * Screen 2a — the menu. Step 40, majors every third point, so the visible grid
 * reads at the 120px module while the ambient field is three times finer.
 */
export const LAT_MENU: LatticeCfg = {
  id: '2a menu',
  step: 40,
  cols: 47,
  rows: 26,
  major: 3,
  majorOffset: 2,
  micro: 10,
  majorSize: 16,
};

/**
 * Screen 2b — the product designs index. Step 30, majors every second point,
 * so the visible grid is the 60px module. Denser than 2a because the mosaic's
 * blocks are half the size of the menu's channel cells and need a finer ruler.
 */
export const LAT_INDEX: LatticeCfg = {
  id: '2b index',
  step: 30,
  cols: 63,
  rows: 35,
  major: 2,
  majorOffset: 1,
  micro: 9,
  majorSize: 13,
};

/** Grid origin in design px: a half step back from the first point. */
export const latticeOrigin = (c: LatticeCfg): { x: number; y: number } => ({
  x: c.step / 2,
  y: c.step / 2,
});

/** The design-px position of the point at (col, row). */
export const pointX = (c: LatticeCfg, col: number): number => c.step / 2 + c.step * col + c.step / 2;
export const pointY = (c: LatticeCfg, row: number): number => c.step / 2 + c.step * row + c.step / 2;

/**
 * The nearest lattice index to a design-px coordinate, or -1 when it is not on
 * a point. `tol` is generous by a quarter step because corners are read back
 * from `getBoundingClientRect()` through the stage's fractional scale, so an
 * exact equality test would fail on rounding alone.
 */
export function colAt(c: LatticeCfg, x: number, tol = 0.5): number {
  const i = Math.round((x - c.step) / c.step);
  if (i < 0 || i >= c.cols) return -1;
  return Math.abs(pointX(c, i) - x) <= tol ? i : -1;
}

export function rowAt(c: LatticeCfg, y: number, tol = 0.5): number {
  const i = Math.round((y - c.step) / c.step);
  if (i < 0 || i >= c.rows) return -1;
  return Math.abs(pointY(c, i) - y) <= tol ? i : -1;
}

/** True when this point sits on the module. */
export const isMajor = (c: LatticeCfg, col: number, row: number): boolean =>
  col % c.major === c.majorOffset % c.major && row % c.major === c.majorOffset % c.major;

/**
 * Every invariant the field depends on, checked at module load in dev.
 *
 * These are cheap and they are the difference between "the lattice looks a bit
 * off" and a one-line diagnosis. A step that does not divide the stage leaves a
 * partial row; a cols/rows count that does not span the stage leaves a bare
 * band at the edge.
 */
export function assertLattice(c: LatticeCfg): string[] {
  const bad: string[] = [];
  if (STAGE.w % c.step !== 0) bad.push(`${c.id}: step ${c.step} does not divide ${STAGE.w}`);
  if (STAGE.h % c.step !== 0) bad.push(`${c.id}: step ${c.step} does not divide ${STAGE.h}`);
  if (c.cols * c.step > STAGE.w) bad.push(`${c.id}: ${c.cols} cols overflow the stage`);
  if (c.rows * c.step > STAGE.h) bad.push(`${c.id}: ${c.rows} rows overflow the stage`);
  // The field should reach within one step of each far edge, or there is a
  // visible bare margin the design did not ask for.
  if (STAGE.w - c.cols * c.step > c.step) bad.push(`${c.id}: ${c.cols} cols leave a bare column`);
  if (STAGE.h - c.rows * c.step > c.step) bad.push(`${c.id}: ${c.rows} rows leave a bare row`);
  return bad;
}

/**
 * A frame whose four corners must land on points. `layout.ts` holds the real
 * tables; this is the shape they take and the checker below is what proves it.
 */
export interface Frame {
  readonly id: string;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

/**
 * The system's one invariant, as a function: every corner of every frame maps
 * to an integer lattice index. Returns the offenders, so a caller can fail a
 * build or log a warning rather than discovering it by eye.
 */
export function offLatticeCorners(c: LatticeCfg, frames: readonly Frame[]): string[] {
  const bad: string[] = [];
  for (const f of frames) {
    const corners: [number, number][] = [
      [f.x, f.y],
      [f.x + f.w, f.y],
      [f.x, f.y + f.h],
      [f.x + f.w, f.y + f.h],
    ];
    for (const [x, y] of corners) {
      if (colAt(c, x) < 0 || rowAt(c, y) < 0) bad.push(`${c.id}/${f.id}: corner ${x},${y}`);
    }
  }
  return bad;
}
