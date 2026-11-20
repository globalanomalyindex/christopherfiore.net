/**
 * Cells: where the type stands while a skeleton is up (Fable's call, after
 * his note on the glass pills: "i just don't like them").
 *
 * Each block of text, the label with its tag and the figure or detail, gets
 * one flat ledger cell: the band's own colour, a paler step of it, the full
 * height of the band, square. The X no longer runs behind the type at all.
 * It joins the corners of each blank stretch of the band between the cells,
 * so it is always whole and nothing ever cuts it.
 *
 * A cell is the block padded 0.25em, its sides snapped outward to the mono
 * cell. A gap under 3em, to the button's edge or to the next cell, goes into
 * the cell, so every blank left over is at least 3em wide. With no such blank
 * there are no cells and no X: only the frame, the guide and the chip.
 */

/** A text block, in the button's own px. */
export interface Block {
  x0: number;
  x1: number;
  /** a menu row's figure: its cell is the band's own figure cell, one mono cell either side */
  fig?: boolean;
}

/** A cell, in the button's own px; toL / toR: it runs to that edge of the band. */
export interface TCell {
  x0: number;
  x1: number;
  toL: boolean;
  toR: boolean;
}

/** A blank between cells; 'L' and 'R' are the band's own edges, wherever they are. */
export interface Blank {
  a: number | 'L';
  b: number | 'R';
}

export interface Lay {
  cells: TCell[];
  blanks: Blank[];
}

/** The type's blocks: the label (the word, its glitch face and its tag), and the figure or detail. */
export function blocks(b: HTMLElement, menuFig: boolean): Block[] {
  const r = b.getBoundingClientRect();
  const sc = r.width / (b.offsetWidth || r.width) || 1;
  const cell = (parseFloat(getComputedStyle(b).fontSize) || 16) / 2;
  const span = (q: DOMRect | null): [number, number] | null => (q && q.width > 0.5 ? [(q.left - r.left) / sc, (q.right - r.left) / sc] : null);
  const text = (el: Element | null): DOMRect | null => {
    if (!el || !el.textContent?.trim()) return null;
    const range = document.createRange();
    range.selectNodeContents(el);
    return range.getBoundingClientRect();
  };
  const out: Block[] = [];
  const lab: [number, number][] = [];
  b.querySelectorAll<HTMLElement>('[data-word]').forEach((w) => {
    // the resting word and, while it is up, the glitch's face and its tail
    const s1 = span(text(w));
    const s2 = span(text(w.querySelector('[data-glitch]')));
    if (s1) lab.push(s1);
    if (s2) lab.push(s2);
  });
  const tag = b.querySelector('.cs > span');
  const st = tag ? span(tag.getBoundingClientRect()) : null;
  if (st) lab.push(st);
  if (lab.length) out.push({ x0: Math.min(...lab.map((s) => s[0])), x1: Math.max(...lab.map((s) => s[1])) });
  const f = span(text(b.querySelector('.n, .l')));
  if (f) out.push(menuFig ? { x0: Math.max(0, f[0] - cell), x1: f[1] + cell, fig: true } : { x0: f[0], x1: f[1] });
  return out;
}

/**
 * Each block's own cell, unmerged, in button px: the block padded 0.25em,
 * its sides snapped outward to the mono cell. A menu row's figure keeps the
 * band's own figure cell. In the blocks' order, so the label's comes first.
 * The dress's free edge stops on these (dress.ts), so a band holds a block
 * of type whole or not at all.
 */
export function own(bl: Block[], fs: number): { x0: number; x1: number }[] {
  const cell = fs / 2;
  const pad = 0.25 * fs;
  return bl.map((k) => ({
    x0: k.fig ? k.x0 : Math.floor((k.x0 - pad) / cell + 1e-6) * cell,
    x1: k.fig ? k.x1 : Math.ceil((k.x1 + pad) / cell - 1e-6) * cell,
  }));
}

/**
 * The cells and blanks of a band from L to R (button px), for type at font
 * size `fs`. Null when no blank of 3em is left: then nothing is laid out.
 */
export function layout(bl: Block[], L: number, R: number, fs: number): Lay | null {
  const min = 3 * fs;
  const cs: TCell[] = own(bl, fs)
    .map((c) => ({ x0: Math.max(L, c.x0), x1: Math.min(R, c.x1), toL: false, toR: false }))
    .filter((c) => c.x1 > c.x0)
    .sort((p, q) => p.x0 - q.x0);
  if (!cs.length) return null;
  // a gap under 3em goes into the cell before it
  const cells: TCell[] = [cs[0]];
  for (const c of cs.slice(1)) {
    const p = cells[cells.length - 1];
    if (c.x0 - p.x1 < min) p.x1 = Math.max(p.x1, c.x1);
    else cells.push(c);
  }
  const first = cells[0];
  const last = cells[cells.length - 1];
  if (first.x0 - L < min) {
    first.x0 = L;
    first.toL = true;
  }
  if (R - last.x1 < min) {
    last.x1 = R;
    last.toR = true;
  }
  const blanks: Blank[] = [];
  if (!first.toL) blanks.push({ a: 'L', b: first.x0 });
  for (let i = 0; i < cells.length - 1; i++) blanks.push({ a: cells[i].x1, b: cells[i + 1].x0 });
  if (!last.toR) blanks.push({ a: last.x1, b: 'R' });
  return blanks.length ? { cells, blanks } : null;
}

/**
 * Where a horizontal cut may run without crossing a line of type: the
 * boundaries between the lines of the button's tallest block (the label, its
 * lines and its tag, or the figure or detail), halfway from one line's foot
 * to the next one's head, in button px from the top. Empty when that block
 * is one line.
 */
export function gaps(b: HTMLElement): number[] {
  const r = b.getBoundingClientRect();
  const sc = r.height / (b.offsetHeight || r.height) || 1;
  const lines = (rects: DOMRect[]): [number, number][] => {
    const out: [number, number][] = [];
    for (const q of rects.filter((x) => x.width > 0.5 && x.height > 0).sort((p, q) => p.top - q.top)) {
      const t = (q.top - r.top) / sc;
      const u = (q.bottom - r.top) / sc;
      const cur = out[out.length - 1];
      // the same line: it starts above the middle of the one before
      if (cur && t < (cur[0] + cur[1]) / 2) cur[1] = Math.max(cur[1], u);
      else out.push([t, u]);
    }
    return out;
  };
  const textRects = (el: Element | null): DOMRect[] => {
    if (!el || !el.textContent?.trim()) return [];
    const out: DOMRect[] = [];
    const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      // the resting word only: the glitch's face keeps its lines
      if (!n.nodeValue?.trim() || n.parentElement?.closest('[data-glitch], .sr-only')) continue;
      range.selectNodeContents(n);
      out.push(...Array.from(range.getClientRects()));
    }
    return out;
  };
  const tag = b.querySelector('.cs > span');
  const label = lines([...textRects(b.querySelector('[data-word]')), ...(tag ? [tag.getBoundingClientRect()] : [])]);
  const fig = lines(textRects(b.querySelector('.n, .l')));
  const tall = (ls: [number, number][]) => (ls.length ? ls[ls.length - 1][1] - ls[0][0] : 0);
  const block = tall(fig) > tall(label) ? fig : label;
  return block.slice(1).map((l, i) => (block[i][1] + l[0]) / 2);
}

/**
 * The blanks' X: one per blank, its corners on the frame's top and bottom
 * lines at the cell edges or the frame's corners. x0 / x1 are the frame's
 * sides now, so a band that moves takes its X with it. A blank the band has
 * squeezed under 3em fades its X out by 2em rather than draw a sliver.
 * One entry per blank, in order; op 0 draws nothing.
 */
export function xs(lay: Lay, x0: number, x1: number, fs: number): { a: number; b: number; op: number }[] {
  return lay.blanks.map((k) => {
    const a = k.a === 'L' ? x0 : Math.max(x0, k.a);
    const b = k.b === 'R' ? x1 : Math.min(x1, k.b);
    return { a, b, op: Math.max(0, Math.min(1, (b - a - 2 * fs) / fs)) };
  });
}
