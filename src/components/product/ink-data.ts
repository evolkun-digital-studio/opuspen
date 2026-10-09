/** A handwritten word as built by scripts/build-script-word.mjs. */
export type InkWordData = {
  /** x, y, width, height in font units (1000/em), y down, baseline at 0. */
  viewBox: number[];
  advance: number;
  /** The thickest stem, in font units. */
  stem: number;
  /** Where the nib lifts off the connected word. */
  rest: number[];
  /** The filled glyph outline. */
  fill: string;
  /** Centre-line strokes in writing order. */
  skeleton: { d: string }[];
};

/** Wet-ink windows per stroke: three overlapping tails fade the fresh ink out. */
export const WET_TAILS = 3;

const numbers = (d: string) => (d.match(/-?\d*\.?\d+(?:e-?\d+)?/gi) ?? []).map(Number);
const startOf = (d: string): [number, number] => {
  const n = numbers(d);
  return [n[0] ?? 0, n[1] ?? 0];
};
const endOf = (d: string): [number, number] => {
  const n = numbers(d);
  return [n[n.length - 2] ?? 0, n[n.length - 1] ?? 0];
};

/** A gentle arc between two points, bowed upwards as a lifted pen travels. */
const arc = ([ax = 0, ay = 0]: number[], [bx = 0, by = 0]: number[]) => {
  const lift = Math.min(260, Math.hypot(bx - ax, by - ay) * 0.22);
  const r = (v: number) => Math.round(v * 10) / 10;
  return `M${r(ax)} ${r(ay)}Q${r((ax + bx) / 2)} ${r(Math.min(ay, by) - lift)} ${r(bx)} ${r(by)}`;
};

/**
 * The route the nib follows besides the ink: in from the upper right along a
 * gentle curve, and between strokes (lifted). Hidden paths, in the word's own
 * coordinates. After the last stroke the pen leaves for its resting place,
 * which the layout decides.
 */
export function inkRoutes(data: InkWordData) {
  const strokes = data.skeleton.map((s) => ({ start: startOf(s.d), end: endOf(s.d) }));
  const first = strokes[0]?.start ?? [0, 0];
  // A short, gentle arc in from the upper right, along the barrel's own rise
  // (about 31deg): short enough that the pen never moves faster than it writes.
  const enter = `M${first[0] + 2600} ${first[1] - 1550}Q${first[0] + 1100} ${first[1] - 1050} ${first[0]} ${first[1]}`;
  const travel = strokes.slice(1).map((s, i) => arc(strokes[i]?.end ?? s.start, s.start));
  return { enter, travel };
}
