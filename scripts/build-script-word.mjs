/**
 * Exports handwritten words set in Hiragenda as SVG data for <InkWord>:
 *
 *   - `fill`:     the filled glyph outline (opentype.js, font units, y down,
 *                 baseline at y = 0), painted in gold;
 *   - `skeleton`: centre-line paths in writing order. They are drawn as white
 *                 strokes inside an SVG <mask>, so ink appears where, and in
 *                 the order, a nib lays it down; the hero pen follows them.
 *
 * The skeleton is derived, not drawn by hand:
 *   1. rasterise the fill (non-zero winding) at 1px per font unit;
 *   2. thin it to a 1px centre line (Zhang–Suen) and measure the stem width
 *      with a distance transform;
 *   3. trace the centre line into a graph; prune short spurs, merge the knots
 *      a crossing leaves behind;
 *   4. walk it as a hand writes: the connected word from its leftmost free
 *      end, always continuing along the branch that bends least, writing
 *      short dead ends out and back on the way (the up-and-down of a t, the
 *      stem of an n); straight horizontal runs through a stem (t-bars) and
 *      dots are set aside and added afterwards, left to right;
 *   5. smooth and fit each run with cubic Béziers (Schneider's algorithm).
 *
 * A word in WORDS may carry a `fix(strokes, stem)` hook that reorders or
 * trims the derived runs (hand correction); "Opus" uses one for its "O".
 *
 *   node scripts/build-script-word.mjs [--debug <dir>]
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import opentype from "opentype.js";
import * as prettier from "prettier";
import { decompress } from "wawoff2";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const FONT = join(ROOT, "public/fonts/Hiragenda.woff2");
const OUT = join(ROOT, "src/components/product");
const PAD = 60; // font units around the ink, so nothing touches the viewBox

/** Each word becomes one module: src/components/product/<file>. Optional: `fix`. */
const WORDS = [
  // The hero: the Maison signs its name. Hand correction: the derived "O"
  // runs clockwise from its lower tail; a hand writes it the other way, from
  // the top hook, counter-clockwise (down the left, along the bottom, up the
  // right, over the top), ending in the inner tail.
  {
    file: "script-signature.ts",
    name: "scriptSignature",
    text: "Opus",
    fix: ([capital, ...rest]) => [[...capital].reverse().map((run) => [...run].reverse()), ...rest],
  },
  // The certificate of authenticity.
  { file: "script-atelier.ts", name: "scriptAtelier", text: "Atelier Opus" },
];

const debugIndex = process.argv.indexOf("--debug");
const DEBUG = debugIndex > -1 ? resolve(process.argv[debugIndex + 1] ?? "script-debug") : null;

/* ------------------------------------------------------------------------ */
/* Geometry helpers                                                          */
/* ------------------------------------------------------------------------ */
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, s) => [a[0] * s, a[1] * s];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
const len = (a) => Math.hypot(a[0], a[1]);
const dist = (a, b) => len(sub(a, b));
const unit = (a) => {
  const l = len(a);
  return l ? [a[0] / l, a[1] / l] : [0, 0];
};
const angleBetween = (a, b) => Math.acos(Math.max(-1, Math.min(1, dot(unit(a), unit(b)))));
const polyLength = (pts) => pts.reduce((sum, p, i) => (i ? sum + dist(pts[i - 1], p) : 0), 0);
const round = (v) => Math.round(v * 10) / 10;

/* ------------------------------------------------------------------------ */
/* 1. Outline → flattened contours → raster                                 */
/* ------------------------------------------------------------------------ */
function flatten(commands) {
  const contours = [];
  let current = null;
  let last = [0, 0];
  const STEPS = 16;
  for (const c of commands) {
    if (c.type === "M") {
      current = [[c.x, c.y]];
      contours.push(current);
      last = [c.x, c.y];
    } else if (c.type === "L") {
      current.push([c.x, c.y]);
      last = [c.x, c.y];
    } else if (c.type === "Q") {
      for (let i = 1; i <= STEPS; i++) {
        const t = i / STEPS;
        const m = 1 - t;
        current.push([
          m * m * last[0] + 2 * m * t * c.x1 + t * t * c.x,
          m * m * last[1] + 2 * m * t * c.y1 + t * t * c.y,
        ]);
      }
      last = [c.x, c.y];
    } else if (c.type === "C") {
      for (let i = 1; i <= STEPS; i++) {
        const t = i / STEPS;
        const m = 1 - t;
        current.push([
          m * m * m * last[0] + 3 * m * m * t * c.x1 + 3 * m * t * t * c.x2 + t * t * t * c.x,
          m * m * m * last[1] + 3 * m * m * t * c.y1 + 3 * m * t * t * c.y2 + t * t * t * c.y,
        ]);
      }
      last = [c.x, c.y];
    }
  }
  return contours;
}

/** Non-zero winding scanline fill. Returns a 0/1 grid and its origin. */
function rasterise(contours, bounds) {
  const x0 = Math.floor(bounds.x1) - 4;
  const y0 = Math.floor(bounds.y1) - 4;
  const width = Math.ceil(bounds.x2) - x0 + 5;
  const height = Math.ceil(bounds.y2) - y0 + 5;
  const grid = new Uint8Array(width * height);
  const edges = [];
  for (const contour of contours) {
    for (let i = 0; i < contour.length; i++) {
      const a = contour[i];
      const b = contour[(i + 1) % contour.length];
      if (a[1] !== b[1]) edges.push([a[0] - x0, a[1] - y0, b[0] - x0, b[1] - y0]);
    }
  }
  for (let row = 0; row < height; row++) {
    const y = row + 0.5;
    const hits = [];
    for (const [ax, ay, bx, by] of edges) {
      if ((ay <= y && by > y) || (by <= y && ay > y)) {
        hits.push([ax + ((y - ay) / (by - ay)) * (bx - ax), by > ay ? 1 : -1]);
      }
    }
    hits.sort((p, q) => p[0] - q[0]);
    let winding = 0;
    for (let i = 0; i < hits.length - 1; i++) {
      winding += hits[i][1];
      if (winding === 0) continue;
      const from = Math.max(0, Math.ceil(hits[i][0] - 0.5));
      const to = Math.min(width - 1, Math.floor(hits[i + 1][0] - 0.5));
      for (let x = from; x <= to; x++) grid[row * width + x] = 1;
    }
  }
  return { grid, width, height, x0, y0 };
}

/* ------------------------------------------------------------------------ */
/* 2. Thinning and stem width                                               */
/* ------------------------------------------------------------------------ */
// Neighbours clockwise from north: P2..P9 in Zhang–Suen's notation.
const RING = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

function thin({ grid, width, height }) {
  const img = grid.slice();
  const at = (x, y) => (x < 0 || y < 0 || x >= width || y >= height ? 0 : img[y * width + x]);
  // Only foreground pixels can change: iterate over them, not the whole grid.
  let active = [];
  for (let i = 0; i < img.length; i++) if (img[i]) active.push(i);
  const p = new Array(8);
  let changed = true;
  while (changed) {
    changed = false;
    for (const pass of [0, 1]) {
      const remove = [];
      for (const index of active) {
        const x = index % width;
        const y = (index - x) / width;
        for (let k = 0; k < 8; k++) p[k] = at(x + RING[k][0], y + RING[k][1]);
        const b = p[0] + p[1] + p[2] + p[3] + p[4] + p[5] + p[6] + p[7];
        if (b < 2 || b > 6) continue;
        let a = 0;
        for (let i = 0; i < 8; i++) if (!p[i] && p[(i + 1) % 8]) a++;
        if (a !== 1) continue;
        const [p2, , p4, , p6, , p8] = p;
        const clear =
          pass === 0
            ? p2 * p4 * p6 === 0 && p4 * p6 * p8 === 0
            : p2 * p4 * p8 === 0 && p2 * p6 * p8 === 0;
        if (clear) remove.push(index);
      }
      for (const i of remove) img[i] = 0;
      if (remove.length) {
        changed = true;
        active = active.filter((i) => img[i]);
      }
    }
  }
  // Remove staircase corners (a pixel whose two orthogonal neighbours already
  // touch diagonally), so every remaining pixel has an honest neighbour count.
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (!img[y * width + x]) continue;
      const p = RING.map(([dx, dy]) => at(x + dx, y + dy));
      const count = p.reduce((s, v) => s + v, 0);
      if (count !== 2) continue;
      for (const [i, j] of [
        [0, 2],
        [2, 4],
        [4, 6],
        [6, 0],
      ]) {
        if (p[i] && p[j]) img[y * width + x] = 0;
      }
    }
  }
  return img;
}

/** Chamfer (3-4) distance to the background, in pixels. */
function distanceTransform({ grid, width, height }) {
  const d = new Float32Array(width * height).fill(1e9);
  for (let i = 0; i < d.length; i++) if (!grid[i]) d[i] = 0;
  const pass = (ys, xs, offsets) => {
    for (const y of ys) {
      for (const x of xs) {
        const i = y * width + x;
        if (!d[i]) continue;
        for (const [dx, dy, w] of offsets) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          d[i] = Math.min(d[i], d[ny * width + nx] + w);
        }
      }
    }
  };
  const range = (n, reverse) => {
    const r = Array.from({ length: n }, (_, i) => i);
    return reverse ? r.reverse() : r;
  };
  pass(range(height), range(width), [
    [-1, 0, 3],
    [0, -1, 3],
    [-1, -1, 4],
    [1, -1, 4],
  ]);
  pass(range(height, true), range(width, true), [
    [1, 0, 3],
    [0, 1, 3],
    [1, 1, 4],
    [-1, 1, 4],
  ]);
  for (let i = 0; i < d.length; i++) d[i] /= 3;
  return d;
}

/* ------------------------------------------------------------------------ */
/* 3. Skeleton → graph                                                      */
/* ------------------------------------------------------------------------ */
function traceGraph(skel, width, height, toFont, dt) {
  const on = (x, y) => x >= 0 && y >= 0 && x < width && y < height && skel[y * width + x] === 1;
  const neighbours = (x, y) =>
    RING.map(([dx, dy]) => [x + dx, y + dy]).filter(([nx, ny]) => on(nx, ny));
  const key = (x, y) => y * width + x;

  // Nodes: endpoints and junction clusters.
  const nodeOf = new Map();
  const nodes = [];
  const pixels = [];
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) if (on(x, y)) pixels.push([x, y]);
  const isNodePixel = (x, y) => {
    const n = neighbours(x, y).length;
    return n === 1 || n >= 3 || n === 0;
  };
  for (const [x, y] of pixels) {
    if (!isNodePixel(x, y) || nodeOf.has(key(x, y))) continue;
    // Flood the cluster of touching junction pixels into one node.
    const id = nodes.length;
    const members = [];
    const stack = [[x, y]];
    nodeOf.set(key(x, y), id);
    while (stack.length) {
      const [cx, cy] = stack.pop();
      members.push([cx, cy]);
      if (neighbours(cx, cy).length === 1) continue;
      for (const [nx, ny] of neighbours(cx, cy)) {
        if (nodeOf.has(key(nx, ny)) || !isNodePixel(nx, ny) || neighbours(nx, ny).length === 1) {
          continue;
        }
        nodeOf.set(key(nx, ny), id);
        stack.push([nx, ny]);
      }
    }
    const c = members.reduce((s, p) => add(s, p), [0, 0]);
    // The stroke radius here: a spur shorter than this is a blob terminal.
    const radius = Math.max(...members.map(([mx, my]) => dt[my * width + mx]));
    nodes.push({ id, at: toFont(mul(c, 1 / members.length)), pixels: members, radius });
  }

  // Edges: walk from each node pixel through plain (degree-2) pixels.
  const edges = [];
  const walked = new Set();
  for (const node of nodes) {
    for (const [px, py] of node.pixels) {
      for (const [nx, ny] of neighbours(px, py)) {
        const nk = key(nx, ny);
        if (nodeOf.get(nk) === node.id) continue;
        if (walked.has(`${key(px, py)}>${nk}`)) continue;
        const path = [[px, py]];
        const onPath = new Set([key(px, py)]);
        let prev = [px, py];
        let cur = [nx, ny];
        while (!nodeOf.has(key(cur[0], cur[1]))) {
          path.push(cur);
          onPath.add(key(cur[0], cur[1]));
          const next = neighbours(cur[0], cur[1]).find(
            ([qx, qy]) => !(qx === prev[0] && qy === prev[1]) && !onPath.has(key(qx, qy)),
          );
          if (!next) break;
          prev = cur;
          cur = next;
        }
        path.push(cur);
        const end = nodeOf.get(key(cur[0], cur[1]));
        if (end === undefined) continue;
        const back = path[path.length - 2] ?? [px, py];
        walked.add(`${key(px, py)}>${nk}`);
        walked.add(`${key(cur[0], cur[1])}>${key(back[0], back[1])}`);
        if (end === node.id && path.length < 4) continue;
        edges.push({
          a: node.id,
          b: end,
          pts: [node.at, ...path.slice(1, -1).map(toFont), nodes[end].at],
        });
      }
    }
  }

  // A dot thins to a lone pixel or a tiny knot with no edge of its own.
  for (const n of nodes) n.isolated = !edges.some((e) => e.a === n.id || e.b === n.id);
  return { nodes, edges };
}

/**
 * Join runs through degree-2 nodes, prune short spurs, and merge the two
 * junctions a crossing splits into; repeated until nothing changes.
 */
function simplifyGraph(graph, stem) {
  let { nodes, edges } = graph;
  const degree = (id) => edges.reduce((n, e) => n + (e.a === id) + (e.b === id), 0);
  const edgeLength = (e) => polyLength(e.pts);

  // Degree-2 nodes are not junctions (thinning leaves a few): join their edges.
  const joinRuns = () => {
    let any = false;
    for (let changed = true; changed;) {
      changed = false;
      for (const node of nodes) {
        const touching = edges.filter((e) => e.a === node.id || e.b === node.id);
        if (touching.length !== 2) continue;
        const [e, f] = touching;
        if (e.a === e.b || f.a === f.b) continue;
        const ePts = e.b === node.id ? e.pts : [...e.pts].reverse();
        const fPts = f.a === node.id ? f.pts : [...f.pts].reverse();
        const from = e.b === node.id ? e.a : e.b;
        const to = f.a === node.id ? f.b : f.a;
        edges = edges.filter((g) => g !== e && g !== f);
        edges.push({ a: from, b: to, pts: [...ePts, ...fPts.slice(1)] });
        changed = any = true;
        break;
      }
    }
    return any;
  };

  // Spurs: branches from a junction to a free end that never leave the
  // junction's own blob of ink (thinning artefacts at stroke terminals).
  const pruneSpurs = () => {
    const before = edges.length;
    edges = edges.filter((e) => {
      const da = degree(e.a);
      const db = degree(e.b);
      const junction = da >= 3 && db === 1 ? nodes[e.a] : db >= 3 && da === 1 ? nodes[e.b] : null;
      return !junction || edgeLength(e) > junction.radius * 1.25 + 6;
    });
    return edges.length !== before;
  };

  // Short links between junctions: one crossing, so one node.
  const mergeCrossings = () => {
    let any = false;
    for (let changed = true; changed;) {
      changed = false;
      for (const e of edges) {
        if (e.a === e.b || degree(e.a) < 3 || degree(e.b) < 3 || edgeLength(e) > stem * 1.1) {
          continue;
        }
        const keep = nodes[e.a];
        const gone = nodes[e.b];
        keep.at = mul(add(keep.at, gone.at), 0.5);
        edges = edges.filter((f) => f !== e);
        for (const f of edges) {
          if (f.a === gone.id) f.a = keep.id;
          if (f.b === gone.id) f.b = keep.id;
          // Snap the touching ends to the merged centre.
          if (f.a === keep.id) f.pts[0] = keep.at;
          if (f.b === keep.id) f.pts[f.pts.length - 1] = keep.at;
        }
        changed = any = true;
        break;
      }
    }
    return any;
  };

  for (let pass = 0; pass < 6; pass++) {
    const changed = [joinRuns(), pruneSpurs(), joinRuns(), mergeCrossings()].some(Boolean);
    if (!changed) break;
  }
  joinRuns();
  return { nodes, edges };
}

/* ------------------------------------------------------------------------ */
/* 4. Writing order                                                         */
/* ------------------------------------------------------------------------ */
function orderStrokes(graph, stem) {
  const { nodes, edges } = graph;
  const fullDegree = (id) => edges.reduce((n, e) => n + (e.a === id) + (e.b === id), 0);

  // Crossbars: straight, near-horizontal runs from a free end through at
  // least one junction to another free end. They are crossed after the word.
  const bars = [];
  const deferred = new Set();
  const straightest = (from, i) => {
    const pts = [...(edges[i].a === from ? edges[i].pts : [...edges[i].pts].reverse())];
    const used = [i];
    let node = edges[i].a === from ? edges[i].b : edges[i].a;
    while (fullDegree(node) > 1) {
      // Tangents are taken a little away from the junction: its merged centre
      // can sit off the line.
      const n = pts.length;
      const dir = unit(sub(pts[Math.max(0, n - 6)], pts[Math.max(0, n - 50)]));
      let next = null;
      let bend = (35 * Math.PI) / 180;
      edges.forEach((e, j) => {
        if (used.includes(j) || (e.a !== node && e.b !== node)) return;
        const run = e.a === node ? e.pts : [...e.pts].reverse();
        const b = angleBetween(
          dir,
          sub(run[Math.min(50, run.length - 1)], run[Math.min(5, run.length - 2)]),
        );
        if (b < bend) {
          bend = b;
          next = { j, run, end: e.a === node ? e.b : e.a };
        }
      });
      if (!next) return null;
      used.push(next.j);
      pts.push(...next.run.slice(1));
      node = next.end;
    }
    return { pts, used };
  };
  for (const node of nodes) {
    if (fullDegree(node.id) !== 1) continue;
    const i = edges.findIndex((e) => e.a === node.id || e.b === node.id);
    if (deferred.has(i)) continue;
    const run = straightest(node.id, i);
    if (!run || run.used.length < 2) continue;
    const a = run.pts[0];
    const b = run.pts[run.pts.length - 1];
    const span = dist(a, b);
    const tilt = Math.abs(Math.atan2(b[1] - a[1], b[0] - a[0]));
    const deviation = Math.max(
      ...run.pts.map(
        (p) => Math.abs((p[0] - a[0]) * (b[1] - a[1]) - (p[1] - a[1]) * (b[0] - a[0])) / span,
      ),
    );
    if (
      span > stem * 3 &&
      Math.min(tilt, Math.PI - tilt) < (20 * Math.PI) / 180 &&
      deviation < stem * 0.7
    ) {
      run.used.forEach((j) => deferred.add(j));
      bars.push({ pts: run.pts });
    }
  }
  const main = edges.map((_, i) => i).filter((i) => !deferred.has(i));
  const at = (id) => main.filter((i) => edges[i].a === id || edges[i].b === id);
  const degree = (id) => at(id).reduce((n, i) => n + (edges[i].a === id) + (edges[i].b === id), 0);
  const other = (i, id) => (edges[i].a === id ? edges[i].b : edges[i].a);
  const visited = new Set();

  /** The edge's points leaving `from`; a loop picks the side that bends least. */
  const oriented = (i, from, dir) => {
    const e = edges[i];
    if (e.a === e.b && dir) {
      const reversed = [...e.pts].reverse();
      const bend = (pts) => angleBetween(dir, sub(pts[Math.min(10, pts.length - 1)], pts[0]));
      return bend(reversed) < bend(e.pts) ? reversed : e.pts;
    }
    return e.a === from ? e.pts : [...e.pts].reverse();
  };
  const leavingDir = (pts) => {
    let travelled = 0;
    let i = 1;
    while (i < pts.length - 1 && travelled < stem * 1.3) travelled += dist(pts[i - 1], pts[i++]);
    return unit(sub(pts[Math.min(i, pts.length - 1)], pts[0]));
  };
  const arrivingDir = (pts) => leavingDir([...pts].reverse()).map((v) => -v);

  /** From `n` along edge i through plain (degree-2) nodes; null unless it dead-ends. */
  const deadEnd = (i, n) => {
    const run = [];
    const used = [];
    let edge = i;
    let node = n;
    for (let guard = 0; guard < 12; guard++) {
      if (visited.has(edge)) return null;
      used.push(edge);
      run.push(...oriented(edge, node).slice(run.length ? 1 : 0));
      node = other(edge, node);
      if (degree(node) === 1) return { run, used, end: node };
      if (degree(node) !== 2) return null;
      edge = at(node).find((j) => !used.includes(j));
      if (edge === undefined) return null;
    }
    return null;
  };

  /** Shortest walk back over written ink to a node with unwritten ink. */
  const retrace = (start, limit) => {
    const best = new Map([[start, { cost: 0, path: [] }]]);
    const queue = [start];
    while (queue.length) {
      queue.sort((p, q) => best.get(p).cost - best.get(q).cost);
      const n = queue.shift();
      const here = best.get(n);
      if (n !== start && at(n).some((i) => !visited.has(i))) return { node: n, path: here.path };
      for (const i of at(n)) {
        if (!visited.has(i)) continue;
        const m = other(i, n);
        const cost = here.cost + polyLength(edges[i].pts);
        if (cost > limit || (best.has(m) && best.get(m).cost <= cost)) continue;
        best.set(m, { cost, path: [...here.path, [i, n]] });
        queue.push(m);
      }
    }
    return null;
  };

  const strokes = [];
  while (main.some((i) => !visited.has(i))) {
    // Begin at the leftmost free end with unwritten ink.
    const open = [
      ...new Set(main.filter((i) => !visited.has(i)).flatMap((i) => [edges[i].a, edges[i].b])),
    ];
    open.sort(
      (p, q) =>
        (degree(p) === 1) * -1e5 + nodes[p].at[0] - ((degree(q) === 1) * -1e5 + nodes[q].at[0]),
    );
    let n = open[0];
    let dir = null;
    const runs = [];
    for (;;) {
      let choices = at(n).filter((i) => !visited.has(i));
      if (!choices.length) {
        const back = retrace(n, stem * 8);
        if (!back) break;
        for (const [i, from] of back.path) runs.push(oriented(i, from));
        n = back.node;
        dir = arrivingDir(runs[runs.length - 1]);
        continue;
      }
      // A short dead end (the up-and-down of a t, the stem of an n) is
      // written out and back before the stroke moves on.
      // When every branch comes back here (dead ends, small loops), the
      // longest dead end carries the stroke on and is written last.
      if (dir && choices.length > 1) {
        const info = choices.map((i) => ({
          i,
          end: deadEnd(i, n),
          loop: edges[i].a === edges[i].b,
        }));
        const returning = info.every((c) => c.end || c.loop);
        const ends = info
          .filter((c) => c.end)
          .sort((p, q) => polyLength(p.end.run) - polyLength(q.end.run));
        const carry = returning ? ends[ends.length - 1] : null;
        const climb = ends.find((c) => c !== carry && polyLength(c.end.run) < stem * 8);
        if (climb) {
          climb.end.used.forEach((i) => visited.add(i));
          runs.push(climb.end.run, [...climb.end.run].reverse());
          dir = arrivingDir(runs[runs.length - 1]);
          continue;
        }
        if (carry && choices.length > 1) choices = choices.filter((i) => i !== carry.i);
      }
      let pick = choices[0];
      if (dir) {
        let bend = Infinity;
        for (const i of choices) {
          const b = angleBetween(dir, leavingDir(oriented(i, n, dir)));
          if (b < bend) {
            bend = b;
            pick = i;
          }
        }
      }
      const pts = oriented(pick, n, dir);
      runs.push(pts);
      visited.add(pick);
      n = other(pick, n);
      dir = arrivingDir(pts);
    }
    strokes.push(runs);
  }

  // Dots (no centre line of their own) and crossbars, left to right.
  const minX = (pts) => pts.reduce((s, p) => s + p[0], 0) / pts.length;
  const later = [
    ...nodes.filter((node) => node.isolated).map((node) => [node.at]),
    ...bars.map((c) => (c.pts[0][0] <= c.pts[c.pts.length - 1][0] ? c.pts : [...c.pts].reverse())),
  ].sort((p, q) => minX(p) - minX(q));
  for (const pts of later) strokes.push([pts]);
  return strokes;
}

/* ------------------------------------------------------------------------ */
/* 5. Smoothing and cubic fitting                                           */
/* ------------------------------------------------------------------------ */
function resample(pts, step) {
  const out = [pts[0]];
  let carry = 0;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const d = dist(a, b);
    let t = step - carry;
    while (t <= d) {
      out.push(add(a, mul(sub(b, a), t / d)));
      t += step;
    }
    carry = d - (t - step);
  }
  if (dist(out[out.length - 1], pts[pts.length - 1]) > 0.01) out.push(pts[pts.length - 1]);
  return out;
}

/** Gaussian smoothing along the run; the two ends stay where they are. */
function smooth(pts, sigma) {
  if (pts.length < 5) return pts;
  const radius = Math.ceil(sigma * 2.5);
  const weights = Array.from({ length: radius * 2 + 1 }, (_, k) =>
    Math.exp(-((k - radius) ** 2) / (2 * sigma * sigma)),
  );
  return pts.map((p, i) => {
    if (i === 0 || i === pts.length - 1) return p;
    // Shrink the window near the ends so they do not drift.
    const r = Math.min(radius, i, pts.length - 1 - i);
    let sum = [0, 0];
    let total = 0;
    for (let k = -r; k <= r; k++) {
      const w = weights[k + radius];
      sum = add(sum, mul(pts[i + k], w));
      total += w;
    }
    return mul(sum, 1 / total);
  });
}

function bezierPoint(b, t) {
  const m = 1 - t;
  return add(
    add(mul(b[0], m * m * m), mul(b[1], 3 * m * m * t)),
    add(mul(b[2], 3 * m * t * t), mul(b[3], t * t * t)),
  );
}

function fitCurve(points, maxError) {
  if (points.length < 2) return [];
  const t1 = unit(sub(points[1], points[0]));
  const t2 = unit(sub(points[points.length - 2], points[points.length - 1]));
  return fitCubic(points, t1, t2, maxError);
}

function fitCubic(points, tHat1, tHat2, error) {
  if (points.length === 2) {
    const d = dist(points[0], points[1]) / 3;
    return [[points[0], add(points[0], mul(tHat1, d)), add(points[1], mul(tHat2, d)), points[1]]];
  }
  let u = chordParameters(points);
  let bez = generateBezier(points, u, tHat1, tHat2);
  let [maxErr, split] = maxError(points, bez, u);
  if (maxErr < error) return [bez];
  if (maxErr < error * 4) {
    for (let i = 0; i < 20; i++) {
      const uPrime = u.map((v, j) => newtonRoot(bez, points[j], v));
      bez = generateBezier(points, uPrime, tHat1, tHat2);
      [maxErr, split] = maxError(points, bez, uPrime);
      if (maxErr < error) return [bez];
      u = uPrime;
    }
  }
  const centre = unit(sub(points[split - 1], points[split + 1]));
  return [
    ...fitCubic(points.slice(0, split + 1), tHat1, centre, error),
    ...fitCubic(points.slice(split), mul(centre, -1), tHat2, error),
  ];
}

function chordParameters(points) {
  const u = [0];
  for (let i = 1; i < points.length; i++) u.push(u[i - 1] + dist(points[i], points[i - 1]));
  const total = u[u.length - 1];
  return u.map((v) => v / total);
}

function generateBezier(points, u, tHat1, tHat2) {
  const first = points[0];
  const last = points[points.length - 1];
  const c = [
    [0, 0],
    [0, 0],
  ];
  const x = [0, 0];
  u.forEach((t, i) => {
    const m = 1 - t;
    const a1 = mul(tHat1, 3 * m * m * t);
    const a2 = mul(tHat2, 3 * m * t * t);
    c[0][0] += dot(a1, a1);
    c[0][1] += dot(a1, a2);
    c[1][0] += dot(a1, a2);
    c[1][1] += dot(a2, a2);
    const shortfall = sub(points[i], bezierPoint([first, first, last, last], t));
    x[0] += dot(a1, shortfall);
    x[1] += dot(a2, shortfall);
  });
  const det = c[0][0] * c[1][1] - c[1][0] * c[0][1];
  let alpha1 = det ? (x[0] * c[1][1] - x[1] * c[0][1]) / det : 0;
  let alpha2 = det ? (c[0][0] * x[1] - c[1][0] * x[0]) / det : 0;
  const segLength = dist(first, last);
  const epsilon = 1e-6 * segLength;
  if (alpha1 < epsilon || alpha2 < epsilon) alpha1 = alpha2 = segLength / 3;
  return [first, add(first, mul(tHat1, alpha1)), add(last, mul(tHat2, alpha2)), last];
}

function maxError(points, bez, u) {
  let max = 0;
  let split = Math.floor(points.length / 2);
  points.forEach((p, i) => {
    const d = dist(bezierPoint(bez, u[i]), p);
    if (d > max) {
      max = d;
      split = i;
    }
  });
  return [max, Math.min(points.length - 2, Math.max(1, split))];
}

function newtonRoot(bez, p, u) {
  const d1 = [0, 1, 2].map((i) => mul(sub(bez[i + 1], bez[i]), 3));
  const d2 = [0, 1].map((i) => mul(sub(d1[i + 1], d1[i]), 2));
  const q = bezierPoint(bez, u);
  const m = 1 - u;
  const q1 = add(add(mul(d1[0], m * m), mul(d1[1], 2 * m * u)), mul(d1[2], u * u));
  const q2 = add(mul(d2[0], m), mul(d2[1], u));
  const num = dot(sub(q, p), q1);
  const den = dot(q1, q1) + dot(sub(q, p), q2);
  return den ? u - num / den : u;
}

/** A run of points → "C" segments continuing from its first point. */
function runToPath(pts, stem) {
  const sampled = smooth(resample(pts, 3), stem * 0.22);
  return fitCurve(sampled, 2.2)
    .map(
      (b) =>
        `C${b
          .slice(1)
          .flatMap((p) => p.map(round))
          .join(" ")}`,
    )
    .join("");
}

/** Lengthen a free end along its tangent, so the round cap covers the terminal. */
function extend(pts, by, atStart) {
  if (pts.length < 3) return pts;
  if (atStart) {
    const dir = unit(sub(pts[0], pts[Math.min(6, pts.length - 1)]));
    return [add(pts[0], mul(dir, by)), ...pts];
  }
  const n = pts.length;
  const dir = unit(sub(pts[n - 1], pts[Math.max(0, n - 7)]));
  return [...pts, add(pts[n - 1], mul(dir, by))];
}

/* ------------------------------------------------------------------------ */
/* Build                                                                    */
/* ------------------------------------------------------------------------ */
const woff2 = readFileSync(FONT);
const ttf = await decompress(woff2);
const font = opentype.parse(ttf.buffer.slice(ttf.byteOffset, ttf.byteOffset + ttf.byteLength));

for (const word of WORDS) {
  const path = font.getPath(word.text, 0, 0, 1000, { kerning: true });
  const bounds = path.getBoundingBox();
  const contours = flatten(path.commands);
  const raster = rasterise(contours, bounds);
  const toFont = ([x, y]) => [x + raster.x0 + 0.5, y + raster.y0 + 0.5];

  const skel = thin(raster);
  const dt = distanceTransform(raster);
  const radii = [];
  for (let i = 0; i < skel.length; i++) if (skel[i]) radii.push(dt[i]);
  radii.sort((a, b) => a - b);
  // The thickest stem, ignoring the swollen centres of crossings.
  const stem = 2 * radii[Math.floor(radii.length * 0.95)];

  const graph = simplifyGraph(traceGraph(skel, raster.width, raster.height, toFont, dt), stem);
  let strokes = orderStrokes(graph, stem);
  if (word.fix) strokes = word.fix(strokes, stem);

  const skeleton = strokes.map((runs) => {
    const first = extend(runs[0], stem * 0.3, true);
    const lastIndex = runs.length - 1;
    const fixed = runs.map((run, i) => {
      let r = i === 0 ? first : run;
      if (i === lastIndex) r = extend(r, stem * 0.3, false);
      return r;
    });
    const length = fixed.reduce((sum, r) => sum + polyLength(r), 0);
    if (length < stem) {
      // A dot: a short dab through its centre.
      const c = mul(
        fixed.flat().reduce((s, p) => add(s, p), [0, 0]),
        1 / fixed.flat().length,
      );
      return { d: `M${round(c[0] - 4)} ${round(c[1] + 3)}L${round(c[0] + 4)} ${round(c[1] - 3)}` };
    }
    const start = fixed[0][0];
    return {
      d:
        `M${round(start[0])} ${round(start[1])}` +
        fixed.map((run) => runToPath(run, stem)).join(""),
    };
  });

  // The nib's resting place: where the first (connected) stroke lifts off.
  const firstRuns = strokes[0];
  const lastRun = firstRuns[firstRuns.length - 1];
  const rest = lastRun[lastRun.length - 1];

  const viewBox = [
    Math.floor(bounds.x1 - PAD),
    Math.floor(bounds.y1 - PAD),
    Math.ceil(bounds.x2 - bounds.x1 + PAD * 2),
    Math.ceil(bounds.y2 - bounds.y1 + PAD * 2),
  ];
  const body = {
    viewBox,
    advance: Math.round(font.getAdvanceWidth(word.text, 1000, { kerning: true })),
    stem: Math.round(stem),
    rest: rest.map(round),
    fill: path.toPathData(1),
    skeleton,
  };

  const source = `// Generated by scripts/build-script-word.mjs: do not edit by hand.
// "${word.text}" in Hiragenda, in font units (1000/em), y down, baseline at y = 0.
// \`skeleton\` holds the centre-line strokes in writing order; \`stem\` is the
// thickest stem; \`rest\` is where the nib lifts off the connected word.
import type { InkWordData } from "./ink-data";

export const ${word.name}: InkWordData = ${JSON.stringify(body)};
`;
  const target = join(OUT, word.file);
  const options = { ...(await prettier.resolveConfig(target)), filepath: target };
  writeFileSync(target, await prettier.format(source, options));
  console.log(
    `${word.text}: ${skeleton.length} strokes, stem ${Math.round(stem)}, ${graph.edges.length} edges`,
  );

  if (DEBUG) {
    mkdirSync(DEBUG, { recursive: true });
    const colours = ["#e6194b", "#3cb44b", "#4363d8", "#f58231", "#911eb4", "#46f0f0", "#f032e6"];
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox.join(" ")}" width="${viewBox[2]}" height="${viewBox[3]}">
<rect x="${viewBox[0]}" y="${viewBox[1]}" width="100%" height="100%" fill="#fff"/>
<path d="${body.fill}" fill="#ddd"/>
${graph.edges.map((e) => `<polyline points="${e.pts.map((p) => p.join(",")).join(" ")}" fill="none" stroke="#999" stroke-width="2"/>`).join("\n")}
${skeleton
  .map(
    (s, i) =>
      `<path d="${s.d}" fill="none" stroke="${colours[i % colours.length]}" stroke-width="6" stroke-opacity=".8" marker-end="url(#arrow)"/>`,
  )
  .join("\n")}
${skeleton
  .map((s, i) => {
    const [x, y] = s.d.slice(1).split(/[ CL]/).map(Number);
    return `<text x="${x - 30}" y="${y - 20}" font-size="48" fill="${colours[i % colours.length]}">${i + 1}</text>`;
  })
  .join("\n")}
<circle cx="${rest[0]}" cy="${rest[1]}" r="10" fill="#000"/>
<defs><marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="4" markerHeight="4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#000"/></marker></defs>
</svg>`;
    writeFileSync(join(DEBUG, `${word.file.replace(".ts", "")}.svg`), svg);
  }
}
