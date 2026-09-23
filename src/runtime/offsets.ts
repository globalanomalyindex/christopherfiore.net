/**
 * Two systems move a button, and they write two different CSS properties so
 * they never overwrite each other (README §7.5):
 *
 *   transform   the magnetic pull, and nothing else
 *   translate   the seams, and nothing else
 *
 * Each one also has to know what the OTHER has done, to find where the button
 * would be at rest: the magnet measures from the untransformed center, and the
 * seams measure a unit's resting x. These two maps are how they tell each
 * other, instead of stashing numbers on the elements.
 */

/** The magnet's current offset, per button, in px. */
export const PULL = new WeakMap<Element, readonly [number, number]>();

/** The seams' current horizontal offset, per unit, in px. */
export const SEAM_X = new WeakMap<Element, number>();

const reduce =
  typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;

/** Read live, so switching the OS setting takes effect without a reload. */
export const reducedMotion = (): boolean => !!reduce?.matches;
