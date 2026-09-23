"""
Trace the handwritten signature into the two vector layers the home page needs.

    python3 -m venv .venv && .venv/bin/pip install scipy scikit-image potracer pillow
    .venv/bin/python scripts/trace-signature.py \
        _handoff/signature/scanned_handwriting_text.png src/data/signature.json

The source is a transparent PNG, ink in the alpha channel. Two layers come out:

  outline   the ink itself, traced with potrace. This is what the page shows,
            so the signature is exactly the hand that drew it, crisp at any
            size, and a few kB instead of a raster.

  strokes   the pen's path: the skeleton of the ink, walked into strokes in
            writing order and direction. Nothing paints these. They are the
            animated mask that "writes" the outline in, so they only have to
            be in the right order and cover every inked pixel, which the script
            checks before it writes anything.

It refuses to write the file if the outline drifts from the source or the
strokes leave any ink uncovered.
"""

import json
import math
import os
import sys
import tempfile
from collections import defaultdict

import numpy as np
import potrace
from PIL import Image, ImageDraw
from scipy import ndimage
from skimage.morphology import skeletonize

SRC, OUT = sys.argv[1], sys.argv[2]
# The debug plate (ink grey, missed ink red, pen paths blue, numbered in order)
# goes to the temp dir, never next to the data.
DEBUG = os.path.join(tempfile.gettempdir(), "signature.debug.png")

alpha = np.asarray(Image.open(SRC).convert("RGBA"))[..., 3].astype(float) / 255.0
ink = alpha >= 0.5

# Crop to the ink, with room for the round ends of the widest stroke.
dist = ndimage.distance_transform_edt(ink)
radius = float(np.percentile(dist[skeletonize(ink)], 99))
pad = int(math.ceil(radius)) + 6
ys, xs = np.where(ink)
x0, y0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
x1, y1 = min(ink.shape[1], xs.max() + pad + 1), min(ink.shape[0], ys.max() + pad + 1)
ink, alpha, dist = ink[y0:y1, x0:x1], alpha[y0:y1, x0:x1], dist[y0:y1, x0:x1]
H, W = ink.shape

# ------------------------------------------------------------------ outline

# potracer reads low values as ink, the way a scan is dark on light, so it gets
# the inverse. Its points are objects with .x and .y.
bitmap = potrace.Bitmap(~ink)
plist = bitmap.trace(turdsize=4, alphamax=1.0, opticurve=True, opttolerance=0.2)


def fmt(v):
    s = f"{v:.1f}"
    return s[:-2] if s.endswith(".0") else s


parts = []
for curve in plist:
    parts.append(f"M{fmt(curve.start_point.x)} {fmt(curve.start_point.y)}")
    for seg in curve.segments:
        if seg.is_corner:
            parts.append(f"L{fmt(seg.c.x)} {fmt(seg.c.y)}L{fmt(seg.end_point.x)} {fmt(seg.end_point.y)}")
        else:
            c1, c2, e = seg.c1, seg.c2, seg.end_point
            parts.append(f"C{fmt(c1.x)} {fmt(c1.y)} {fmt(c2.x)} {fmt(c2.y)} {fmt(e.x)} {fmt(e.y)}")
    parts.append("Z")
outline = "".join(parts)

# ------------------------------------------------------------------ skeleton graph

skel = skeletonize(ink)
N8 = [(-1, -1), (-1, 0), (-1, 1), (0, -1), (0, 1), (1, -1), (1, 0), (1, 1)]
pts = set(zip(*np.where(skel)))


def nbrs(p):
    y, x = p
    return [(y + dy, x + dx) for dy, dx in N8 if (y + dy, x + dx) in pts]


deg = {p: len(nbrs(p)) for p in pts}
nodes = {p for p in pts if deg[p] != 2}

# Walk every edge between nodes (endpoints and junctions) into a pixel chain.
edges, seen = [], set()
for n in nodes:
    for m in nbrs(n):
        if (n, m) in seen:
            continue
        chain, prev, cur = [n, m], n, m
        seen.add((n, m))
        while cur not in nodes:
            nxt = [q for q in nbrs(cur) if q != prev and q not in chain[-3:]]
            if not nxt:
                break
            prev, cur = cur, nxt[0]
            chain.append(cur)
        seen.add((chain[-1], chain[-2]))
        edges.append(chain)
# Closed loops with no node at all (an "o" drawn as one ring).
covered = {p for c in edges for p in c}
for p in pts - covered:
    if p in covered:
        continue
    ring, prev, cur = [p], None, p
    while True:
        nxt = [q for q in nbrs(cur) if q != prev and q not in ring[-3:]]
        if not nxt or nxt[0] == p:
            break
        prev, cur = cur, nxt[0]
        ring.append(cur)
        if len(ring) > 20000:
            break
    ring.append(p)
    covered.update(ring)
    edges.append(ring)


def length(c):
    return sum(math.hypot(a[0] - b[0], a[1] - b[1]) for a, b in zip(c, c[1:]))


# Prune spurs: the twigs a skeleton grows at corners and crossings. A spur
# never leaves the blob of ink around the junction it grows from, so it is only
# cut when it is shorter than the ink is thick at that junction. A real stroke
# tail (the p's descender, the r's lead-in) reaches past that and is kept.
def prune(edges):
    changed = True
    while changed:
        changed = False
        ends = defaultdict(int)
        for c in edges:
            ends[c[0]] += 1
            ends[c[-1]] += 1
        keep = []
        for c in edges:
            a, b = c[0], c[-1]
            if (ends[a] == 1) != (ends[b] == 1):
                junction = b if ends[a] == 1 else a
                if length(c) < dist[junction] + 2:
                    changed = True
                    continue
            keep.append(c)
        edges = keep
    return edges


edges = prune(edges)

# ------------------------------------------------------------------ pen order

Y, X = 0, 1


def direction(chain, at_start, k=8):
    """Unit tangent leaving the chain's start (or arriving at its end)."""
    seg = chain[: k + 1] if at_start else chain[-(k + 1):]
    a, b = seg[0], seg[-1]
    dx, dy = b[X] - a[X], b[Y] - a[Y]
    n = math.hypot(dx, dy) or 1.0
    return dx / n, dy / n


# Group edges into pieces of ink that touch (a word piece, a letter, a dot).
parent = {}


def find(p):
    while parent.setdefault(p, p) != p:
        parent[p] = parent[parent[p]]
        p = parent[p]
    return p


for c in edges:
    parent[find(c[0])] = find(c[-1])
pieces = defaultdict(list)
for i, c in enumerate(edges):
    pieces[find(c[0])].append(i)

# Pieces left to right by where they start, which is how the name is written.
# The slant puts each i's dot just right of its stem, so plain left-to-right
# order dots every i as soon as its stem is down, the way a hand does.
def span(ids):
    xs = [p[X] for i in ids for p in edges[i]]
    return min(xs)


sequence = sorted(pieces.values(), key=span)


def start_score(p):
    """Where a pen puts down first: to the left, and above. Stems are pulled
    down, and a C starts at its top, not its tail."""
    return p[X] + 0.5 * p[Y]


strokes = []
for ids in sequence:
    todo = set(ids)
    # Start at the leftmost loose end if there is one, else the leftmost point.
    ends = defaultdict(int)
    for i in ids:
        ends[edges[i][0]] += 1
        ends[edges[i][-1]] += 1
    loose = [p for p, k in ends.items() if k == 1]
    heading = None
    if loose:
        pen = min(loose, key=start_score)
    elif len(ids) == 1 and edges[ids[0]][0] == edges[ids[0]][-1]:
        # A closed ring (an o): start at its top and go counterclockwise,
        # which on screen means heading left from the top.
        ring = edges[ids[0]][:-1]
        top = min(range(len(ring)), key=lambda k: (ring[k][Y], ring[k][X]))
        ring = ring[top:] + ring[:top]
        if ring[min(6, len(ring) - 1)][X] > ring[0][X]:
            ring = [ring[0]] + ring[1:][::-1]
        edges[ids[0]] = ring + [ring[0]]
        pen = ring[0]
    else:
        pen = min((p for i in ids for p in edges[i]), key=start_score)
    stroke = []
    while todo:
        # Edges touching the pen, preferring the straightest continuation.
        touching = []
        for i in todo:
            c = edges[i]
            if c[0] == pen:
                touching.append((i, c))
            elif c[-1] == pen:
                touching.append((i, c[::-1]))
        if touching:
            def turn(item):
                if heading is None:
                    return 0
                dx, dy = direction(item[1], True)
                return -(dx * heading[0] + dy * heading[1])
            i, c = min(touching, key=turn)
            todo.discard(i)
            stroke.extend(c if not stroke else c[1:])
            heading = direction(c, False)
            pen = c[-1]
            continue
        # Dead end: lift the pen and put it down at the nearest unwritten end.
        if stroke:
            strokes.append(stroke)
        stroke, heading = [], None
        best = min(
            ((i, c) for i in todo for c in (edges[i], edges[i][::-1])),
            key=lambda ic: math.hypot(ic[1][0][X] - pen[X], ic[1][0][Y] - pen[Y]) + ic[1][0][X] * 0.05,
        )
        pen = best[1][0]
    if stroke:
        strokes.append(stroke)


def rdp(points, eps):
    # A closed ring starts and ends on the same point, so every point sits at
    # distance zero from that "line" and the whole ring would collapse. Split it.
    if len(points) > 3 and points[0] == points[-1]:
        mid = len(points) // 2
        return rdp(points[: mid + 1], eps)[:-1] + rdp(points[mid:], eps)
    if len(points) < 3:
        return points
    a, b = np.array(points[0], float), np.array(points[-1], float)
    ab = b - a
    n = np.hypot(*ab) or 1.0
    d = [abs(ab[0] * (a[1] - p[1]) - ab[1] * (a[0] - p[0])) / n for p in points]
    i = int(np.argmax(d))
    if d[i] > eps:
        return rdp(points[: i + 1], eps)[:-1] + rdp(points[i:], eps)
    return [points[0], points[-1]]


out_strokes = []
for s in strokes:
    simple = rdp([(p[X] + 0.5, p[Y] + 0.5) for p in s], 0.7)
    if len(simple) == 1:
        simple = simple * 2
    d = "M" + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in simple[:1]) + "L" + " ".join(
        f"{fmt(x)} {fmt(y)}" for x, y in simple[1:]
    )
    out_strokes.append({"d": d, "length": round(length(s), 1), "points": simple})

# ------------------------------------------------------------------ reach every tip

mask_width = 2 * radius + 5


def coverage(strokes_):
    img = Image.new("L", (W, H), 0)
    dr = ImageDraw.Draw(img)
    rr = mask_width / 2
    for s_ in strokes_:
        ps = s_["points"]
        if len(ps) > 1:
            dr.line(ps, fill=255, width=int(round(mask_width)))
        for x, y in ps:
            dr.ellipse([x - rr, y - rr, x + rr, y + rr], fill=255)
    return np.asarray(img) > 127


# A skeleton pulls back from sharp corners and hooked tips, further than the
# pen's round end reaches. Where ink is left uncovered, bend the nearest stroke
# through it: at a stroke's end that is a short extension to the tip, and in
# the middle it is a detour the pen's width hides.
for _ in range(6):
    missed, n_missed = ndimage.label(ink & ~coverage(out_strokes))
    if not n_missed:
        break
    for b in range(1, n_missed + 1):
        by, bx = np.where(missed == b)
        best = None
        for si, s_ in enumerate(out_strokes):
            for pi, (x, y) in enumerate(s_["points"]):
                dd = float(np.min(np.hypot(bx - x, by - y)))
                if best is None or dd < best[0]:
                    best = (dd, si, pi)
        _, si, pi = best
        ps = out_strokes[si]["points"]
        px, py = ps[pi]
        far = int(np.argmax(np.hypot(bx - px, by - py)))
        target = (float(bx[far]) + 0.5, float(by[far]) + 0.5)
        if pi == len(ps) - 1:
            ps.append(target)
        elif pi == 0:
            ps.insert(0, target)
        else:
            ps[pi + 1:pi + 1] = [target, (px, py)]
for s_ in out_strokes:
    ps = s_["points"]
    s_["length"] = round(sum(math.hypot(a[0] - b[0], a[1] - b[1]) for a, b in zip(ps, ps[1:])), 1)
    s_["d"] = "M" + f"{fmt(ps[0][0])} {fmt(ps[0][1])}" + "L" + " ".join(f"{fmt(x)} {fmt(y)}" for x, y in ps[1:])

# ------------------------------------------------------------------ checks

# 1. The outline must match the ink.
out_img = Image.new("L", (W, H), 0)
draw = ImageDraw.Draw(out_img)
for curve in plist:
    xy = lambda q: (q.x, q.y)
    poly = [xy(curve.start_point)]
    for seg in curve.segments:
        if seg.is_corner:
            poly += [xy(seg.c), xy(seg.end_point)]
        else:
            p0, c1, c2, e = poly[-1], xy(seg.c1), xy(seg.c2), xy(seg.end_point)
            for t in np.linspace(0, 1, 12)[1:]:
                mt = 1 - t
                poly.append(
                    (
                        mt**3 * p0[0] + 3 * mt**2 * t * c1[0] + 3 * mt * t**2 * c2[0] + t**3 * e[0],
                        mt**3 * p0[1] + 3 * mt**2 * t * c1[1] + 3 * mt * t**2 * c2[1] + t**3 * e[1],
                    )
                )
    # Holes are drawn by XOR, which is what evenodd fill does.
    layer = Image.new("L", (W, H), 0)
    ImageDraw.Draw(layer).polygon([tuple(p) for p in poly], fill=255)
    out_img = Image.fromarray(np.bitwise_xor(np.asarray(out_img), np.asarray(layer)))
traced = np.asarray(out_img) > 127
# IoU punishes thin strokes for sub-pixel edge placement, so measure how far
# any disagreement sits from the source's true edge instead.
edge = ink ^ ndimage.binary_erosion(ink)
to_edge = ndimage.distance_transform_edt(~edge)
off = to_edge[traced ^ ink]
dev_p99 = float(np.percentile(off, 99)) if off.size else 0.0
dev_max = float(off.max()) if off.size else 0.0

# 2. The pen strokes, fully drawn, must cover every inked pixel.
covered_px = coverage(out_strokes)
uncovered = int((ink & ~covered_px).sum())

# A debug plate: ink grey, uncovered ink red, pen paths blue with their order.
dbg = np.zeros((H, W, 3), np.uint8) + 255
dbg[ink] = (190, 190, 190)
dbg[ink & ~covered_px] = (230, 30, 30)
dimg = Image.fromarray(dbg)
dd = ImageDraw.Draw(dimg)
for k, s_ in enumerate(out_strokes):
    dd.line(s_["points"], fill=(40, 60, 220), width=2)
    x, y = s_["points"][0]
    dd.ellipse([x - 4, y - 4, x + 4, y + 4], fill=(0, 150, 0))
    dd.text((x + 5, y - 14), str(k), fill=(0, 120, 0))
dimg.save(DEBUG)
print("debug plate", DEBUG)

total = sum(s_["length"] for s_ in out_strokes)
print(f"crop {W}x{H} at ({x0},{y0}) · pen radius {radius:.1f}px · mask width {mask_width:.1f}px")
print(f"outline: {len(plist)} curves, {len(outline)} chars, edge deviation p99 {dev_p99:.2f}px max {dev_max:.2f}px")
print(f"strokes: {len(out_strokes)}, total length {total:.0f}px, uncovered ink px {uncovered}")

if dev_max > 2.5:
    sys.exit(f"outline drifts {dev_max:.2f}px from the source edge (> 2.5); not writing")
if uncovered > 0:
    sys.exit(f"{uncovered} inked px are not under any stroke; see {DEBUG}; not writing")

json.dump(
    {
        "source": SRC.split("/")[-1],
        "width": W,
        "height": H,
        # The ink's own bounds inside the crop. The page's viewBox is these, so
        # the first and last strokes sit exactly on the text's gutters.
        "ink": [int(np.where(ink.any(0))[0][0]), int(np.where(ink.any(1))[0][0]),
                int(np.where(ink.any(0))[0][-1]) + 1, int(np.where(ink.any(1))[0][-1]) + 1],
        "penRadius": round(radius, 2),
        "maskWidth": round(mask_width, 2),
        "outline": outline,
        "strokes": [{"d": s["d"], "length": s["length"]} for s in out_strokes],
    },
    open(OUT, "w"),
    indent=1,
)
print("wrote", OUT)
