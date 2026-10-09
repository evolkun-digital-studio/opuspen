import { useEffect, type RefObject } from "react";

/**
 * Hero layout that CSS alone cannot do: fitting the column between the header
 * and the foot, and finding where the pen rests. The pen is only ever moved
 * here; its size is the stylesheet's (--pen-w) and is never changed.
 */

/** Below this width the hero stacks (the pen rests above the signature). */
export const HERO_STACKED = "(max-width: 699px)";
/** The column may be scaled down this far to fit, and no further. */
const MIN_FIT = 0.82;
/** The fixed header's height. */
const HEADER = 72;
/** Clearance around words and controls, room for the idle float and parallax. */
const CLEARANCE = 20;

/**
 * pen-uncapped.webp's silhouette (convex hull, simplified), as fractions of
 * the image: from the nib tip, up the upper edge to the cap end, and back.
 */
export const PEN_OUTLINE = [
  [0.004, 0.984],
  [0.072, 0.856],
  [0.393, 0.508],
  [0.564, 0.345],
  [0.941, 0.007],
  [0.963, 0.011],
  [0.988, 0.054],
  [0.996, 0.11],
  [0.986, 0.142],
  [0.778, 0.372],
  [0.463, 0.699],
  [0.243, 0.881],
  [0.134, 0.958],
  [0.01, 0.993],
] as const;
const NIB = [0.004, 0.984] as const;

type Point = [number, number];
type Box = { left: number; top: number; right: number; bottom: number };

/** The silhouette placed in a box. */
export const penPolygon = (box: { left: number; top: number; width: number; height: number }) =>
  PEN_OUTLINE.map(([x, y]) => [box.left + x * box.width, box.top + y * box.height] as Point);

export function insidePolygon([x, y]: Point, polygon: Point[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i] as Point;
    const [xj, yj] = polygon[j] as Point;
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

const segmentsCross = (a: Point, b: Point, c: Point, d: Point) => {
  const turn = (p: Point, q: Point, r: Point) =>
    Math.sign((q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]));
  return turn(a, b, c) !== turn(a, b, d) && turn(c, d, a) !== turn(c, d, b);
};

function polygonMeetsBox(polygon: Point[], box: Box) {
  const corners: Point[] = [
    [box.left, box.top],
    [box.right, box.top],
    [box.right, box.bottom],
    [box.left, box.bottom],
  ];
  if (polygon.some(([x, y]) => x >= box.left && x <= box.right && y >= box.top && y <= box.bottom))
    return true;
  if (corners.some((corner) => insidePolygon(corner, polygon))) return true;
  for (let i = 0; i < polygon.length; i++) {
    const a = polygon[i] as Point;
    const b = polygon[(i + 1) % polygon.length] as Point;
    for (let k = 0; k < 4; k++) {
      if (segmentsCross(a, b, corners[k] as Point, corners[(k + 1) % 4] as Point)) return true;
    }
  }
  return false;
}

/** Layout box of an element relative to an ancestor, ignoring transforms. */
function offsetBox(element: HTMLElement | SVGElement, ancestor: HTMLElement): Box {
  if (element instanceof SVGElement) {
    // An SVG has no offsetTop: measure its parent's flow position plus its own.
    const box = element.getBoundingClientRect();
    const base = ancestor.getBoundingClientRect();
    return {
      left: box.left - base.left,
      top: box.top - base.top,
      right: box.right - base.left,
      bottom: box.bottom - base.top,
    };
  }
  let top = 0;
  let left = 0;
  let node: HTMLElement | null = element;
  while (node && node !== ancestor) {
    top += node.offsetTop;
    left += node.offsetLeft;
    node = node.offsetParent as HTMLElement | null;
  }
  return { left, top, right: left + element.offsetWidth, bottom: top + element.offsetHeight };
}

const inflate = (box: Box, by: number): Box => ({
  left: box.left - by,
  top: box.top - by,
  right: box.right + by,
  bottom: box.bottom + by,
});

/** The column must fit between the header and the foot row; only it may shrink. */
function fitColumn(hero: HTMLElement) {
  const column = hero.querySelector<HTMLElement>(".hero-column");
  const foot = hero.querySelector<HTMLElement>(".hero-foot");
  if (!column || !foot) return;
  let fit = 1;
  hero.style.setProperty("--hero-fit", "1");
  for (let step = 0; step < 8; step++) {
    const box = offsetBox(column, hero);
    if ((box.top >= HEADER + 8 && box.bottom <= foot.offsetTop - 16) || fit <= MIN_FIT) break;
    fit = Math.max(MIN_FIT, fit - 0.03);
    hero.style.setProperty("--hero-fit", fit.toFixed(2));
  }
}

/**
 * The pen's resting place: its nib near (68%, 34%) of the hero (stacked:
 * (60%, 22%)), the barrel running up and right out of frame. From there it
 * moves further right and up, as little as possible, until its silhouette
 * clears the signature, the line, the actions and the header's
 * wordmark, links and order pill. The nib itself stays on screen.
 */
function placePen(hero: HTMLElement) {
  const scroll = hero.querySelector<HTMLElement>(".hero-pen-scroll");
  if (!scroll) return;
  const width = scroll.offsetWidth;
  const height = scroll.offsetHeight;
  const heroWidth = hero.clientWidth;
  const heroHeight = hero.clientHeight;
  const stacked = window.matchMedia(HERO_STACKED).matches;

  const inHero = [".hero-signature", ".hero-title", ".hero-actions"]
    .map((selector) => hero.querySelector<HTMLElement | SVGElement>(selector))
    .filter((element): element is HTMLElement | SVGElement => Boolean(element))
    .map((element) => inflate(offsetBox(element, hero), CLEARANCE));
  // The header is fixed to the viewport; at rest the hero starts at its top.
  const header = [".nav > .nav-wordmark", ".nav .nav-links", ".nav > .nav-pill"]
    .map((selector) => document.querySelector<HTMLElement>(selector))
    .filter((element): element is HTMLElement => Boolean(element && element.offsetWidth))
    .map((element) => {
      const box = element.getBoundingClientRect();
      return inflate(
        { left: box.left, top: box.top, right: box.right, bottom: box.bottom },
        CLEARANCE / 2,
      );
    });
  const obstacles = [...inHero, ...header];

  const start: Point = stacked
    ? [heroWidth * 0.6, heroHeight * 0.22]
    : [heroWidth * 0.68, heroHeight * 0.34];
  const clear = ([x, y]: Point) => {
    if (x > heroWidth - 24 || y < 24) return false; // the nib stays in view
    const polygon = penPolygon({
      left: x - NIB[0] * width,
      top: y - NIB[1] * height,
      width,
      height,
    });
    return !obstacles.some((box) => polygonMeetsBox(polygon, box));
  };

  // Nearest clear spot to the right of and above the start. Moving up costs
  // more than moving right: up, the barrel leaves the frame sooner and less of
  // the pen stays in view.
  const candidates: Point[] = [];
  for (let dx = 0; dx <= heroWidth * 0.45; dx += 8) {
    for (let dy = 0; dy <= heroHeight * 0.4; dy += 8) candidates.push([dx, dy]);
  }
  const cost = ([dx, dy]: Point) => dx ** 2 + (1.8 * dy) ** 2;
  candidates.sort((p, q) => cost(p) - cost(q));
  const found = candidates.find(([dx, dy]) => clear([start[0] + dx, start[1] - dy]));
  const [x, y] = found ? [start[0] + found[0], start[1] - found[1]] : start;
  hero.style.setProperty("--pen-x", `${x.toFixed(1)}px`);
  hero.style.setProperty("--pen-y", `${y.toFixed(1)}px`);
  hero.toggleAttribute("data-pen-clear", Boolean(found));
}

/** Fit the column, then find where the pen rests. Idempotent. */
export function layoutHero(hero: HTMLElement) {
  fitColumn(hero);
  placePen(hero);
}

/** Lays the hero out on mount, once fonts and the pen are ready, and on resize (debounced). */
export function useHeroLayout(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const hero = ref.current;
    if (!hero) return;
    let alive = true;
    let timer = 0;
    const run = () => {
      if (alive) layoutHero(hero);
    };
    run();
    const pen = hero.querySelector<HTMLImageElement>(".hero-pen-image");
    void Promise.all([document.fonts?.ready, pen?.decode?.().catch(() => undefined)]).then(run);
    const onResize = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(run, 150);
    };
    window.addEventListener("resize", onResize);
    return () => {
      alive = false;
      window.clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [ref]);
}
