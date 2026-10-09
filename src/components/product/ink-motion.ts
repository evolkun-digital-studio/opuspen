import gsap from "gsap";
import { WET_TAILS } from "./ink-data";

/** The nib tip in pen-uncapped.webp, as a fraction of the image box. */
export const NIB_ORIGIN = [0.004, 0.984] as const;
export const NIB_TRANSFORM_ORIGIN = "0.4% 98.4%";

type Stroke = {
  /** Drawn inside the mask: reveals the ink. */
  ink: SVGPathElement;
  /** The same line, rendered without paint: the pen follows it. */
  nib: SVGPathElement | null;
  /** Trailing windows of fresh ink. */
  wet: SVGPathElement[];
  /** Precomputed, in font units. */
  length: number;
};

export type InkParts = {
  svg: SVGSVGElement;
  strokes: Stroke[];
  sweep: SVGRectElement | null;
  enter: SVGPathElement | null;
  travel: SVGPathElement[];
};

/** Collects an <InkWord>'s parts and measures every stroke once. */
export function inkParts(svg: SVGSVGElement): InkParts {
  const inks = Array.from(svg.querySelectorAll<SVGPathElement>(".ink-word-stroke"));
  const nibs = Array.from(svg.querySelectorAll<SVGPathElement>(".ink-word-nib"));
  const wets = Array.from(svg.querySelectorAll<SVGPathElement>(".ink-word-wet"));
  return {
    svg,
    strokes: inks.map((ink, index) => ({
      ink,
      nib: nibs[index] ?? null,
      wet: wets.filter((path) => path.dataset["stroke"] === String(index)),
      length: ink.getTotalLength(),
    })),
    sweep: svg.querySelector<SVGRectElement>(".ink-word-sweep"),
    enter: svg.querySelector<SVGPathElement>(".ink-word-enter"),
    travel: Array.from(svg.querySelectorAll<SVGPathElement>(".ink-word-travel")),
  };
}

/** No ink yet: every stroke undrawn, no fresh ink, the sweep parked. */
export function hideInk(parts: InkParts) {
  parts.strokes.forEach((stroke) => {
    gsap.set(stroke.ink, { drawSVG: "0% 0%" });
    gsap.set(stroke.wet, { visibility: "hidden" });
  });
  gsap.set(parts.sweep, { x: 0 });
}

/** Rendered px per font unit, as laid out now. */
const scaleOf = (svg: SVGSVGElement) => {
  const matrix = svg.getScreenCTM();
  return matrix ? Math.hypot(matrix.a, matrix.b) : 1;
};

/** Shows the part [from, to] of a path (font units) with a single dash. */
const showRange = (path: SVGPathElement, length: number, from: number, to: number) => {
  if (to - from < 0.5) {
    // A zero-length dash still paints its round cap: hide it instead.
    path.style.visibility = "hidden";
    return;
  }
  path.style.visibility = "visible";
  path.style.strokeDasharray = `${to - from} ${length * 2 + 10}`;
  path.style.strokeDashoffset = `${-from}`;
};

export type InkPen = {
  /** Follows the strokes (MotionPath, aligned to the SVG). */
  write: Element;
  /** Rises and tilts between strokes. */
  lift: Element;
  /** Wobbles a fraction of a degree while the nib is down. */
  body: Element;
  /** Contact and ambient shadows: softer while the pen is lifted. */
  shadows?: Element | null;
};

/** How a hand writes: speed and the small rituals around each stroke. */
export type InkPace = {
  /** Along the stroke, in rendered px per second. */
  speed: number;
  /** Fresh ink stays brighter this long before it settles. */
  wet: number;
  /** At each stroke's start the nib touches down and the ink beads (s). */
  settle: number;
  /** Each stroke ends with an ease-out this long (s). */
  tail: number;
  /** ± degrees of wobble about the nib while it writes. */
  wobble: number;
  /** Between strokes: rise (px) and tilt (deg) over `up` s, set down over `down` s. */
  lift: { rise: number; tilt: number; up: number; down: number };
  /** Without a pen, the pause between strokes (s). */
  gap: number;
};

/** The certificate's brisk, assured hand. */
export const BRISK: InkPace = {
  speed: 520,
  wet: 1.4,
  settle: 0,
  tail: 0,
  wobble: 0.6,
  lift: { rise: 6, tilt: 2, up: 0.22, down: 0.22 },
  gap: 0.16,
};

/**
 * Lays the ink down stroke by stroke at a constant speed: after a short
 * settle (the nib touches down and the ink beads), ease "none" along the
 * stroke, then a brief ease-out whose start speed matches it, so there is no
 * jolt. With a pen, the nib follows the same paths on the same timeline (the
 * same segments, the same eases), so ink and nib never drift apart; between
 * strokes it lifts, glides (never faster than it writes) and sets down.
 * Returns a paused timeline.
 */
export function writeInk(parts: InkParts, pen?: InkPen, pace: InkPace = BRISK) {
  const unitsPerSecond = pace.speed / scaleOf(parts.svg);
  const wetUnits = pace.wet * unitsPerSecond;
  const timeline = gsap.timeline({ paused: true });
  const follow = (path: SVGPathElement, start = 0, end = 1) => ({
    path,
    align: path,
    alignOrigin: [...NIB_ORIGIN],
    autoRotate: false,
    start,
    end,
  });

  /** Lift, glide along `path`, set down; returns the time it takes. */
  const travel = (path: SVGPathElement | null | undefined, at: number) => {
    if (!pen || !path) return pace.gap;
    const { rise, tilt, up, down } = pace.lift;
    // sine.inOut peaks at π/2 × its average speed: keep that under the writing speed.
    const glide = Math.max(0.13, (path.getTotalLength() * (Math.PI / 2)) / unitsPerSecond);
    timeline
      .to(pen.lift, { y: -rise, rotation: tilt, duration: up, ease: "power2.out" }, at)
      .to(pen.write, { motionPath: follow(path), duration: glide, ease: "sine.inOut" }, at + up)
      .to(pen.lift, { y: 0, rotation: 0, duration: down, ease: "power2.in" }, at + up + glide);
    if (pen.shadows) {
      // Lifted, the shadows spread and fade a little; they settle back as it lands.
      timeline
        .to(pen.shadows, { scale: 1.08, opacity: 0.8, duration: up, ease: "power2.out" }, at)
        .to(
          pen.shadows,
          { scale: 1, opacity: 1, duration: down, ease: "power2.in" },
          at + up + glide,
        );
    }
    return up + glide + down;
  };

  let cursor = 0;
  parts.strokes.forEach((stroke, index) => {
    if (index > 0) cursor += travel(parts.travel[index - 1], cursor);
    const length = stroke.length;
    // The ink bead at touch-down, and the length the ease-out covers.
    const bead = pace.settle > 0 ? Math.min(2, length * 0.05) : 0;
    // power1.out starts at twice its average speed: matching the writing
    // speed means covering half of what constant speed would.
    const tailUnits = Math.min(length * 0.3, (unitsPerSecond * pace.tail) / 2);
    const tail = tailUnits > 0 ? pace.tail : 0;
    const body = Math.max((length - bead - tailUnits) / unitsPerSecond, 0.05);
    const start = cursor;
    const at = (units: number) => units / length;

    if (bead) {
      timeline.fromTo(
        stroke.ink,
        { drawSVG: "0 0" },
        { drawSVG: `0 ${bead}`, duration: pace.settle, ease: "sine.out", immediateRender: false },
        cursor,
      );
      cursor += pace.settle;
    }
    timeline.fromTo(
      stroke.ink,
      { drawSVG: `0 ${bead}` },
      { drawSVG: `0 ${length - tailUnits}`, duration: body, ease: "none", immediateRender: false },
      cursor,
    );
    if (pen && stroke.nib) {
      timeline.to(
        pen.write,
        {
          motionPath: follow(stroke.nib, at(bead), at(length - tailUnits)),
          duration: body,
          ease: "none",
        },
        cursor,
      );
    }
    cursor += body;
    if (tail) {
      timeline.fromTo(
        stroke.ink,
        { drawSVG: `0 ${length - tailUnits}` },
        { drawSVG: "0 100%", duration: tail, ease: "power1.out", immediateRender: false },
        cursor,
      );
      if (pen && stroke.nib) {
        timeline.to(
          pen.write,
          {
            motionPath: follow(stroke.nib, at(length - tailUnits), 1),
            duration: tail,
            ease: "power1.out",
          },
          cursor,
        );
      }
      cursor += tail;
    }

    if (pen) {
      // A slight, living wobble about the nib while it writes.
      const writing = cursor - start;
      const swings = Math.max(1, Math.round(writing / 0.5));
      timeline
        .fromTo(
          pen.body,
          { rotation: -pace.wobble },
          {
            rotation: pace.wobble,
            duration: writing / swings,
            ease: "sine.inOut",
            repeat: swings - 1,
            yoyo: true,
            immediateRender: false,
          },
          start,
        )
        .to(pen.body, { rotation: 0, duration: 0.2, ease: "sine.out" }, cursor);
    }

    // Fresh ink: windows that trail the ink's front and fall away over `wet` s.
    const front = { at: 0 };
    const showWet = () =>
      stroke.wet.forEach((path, tailIndex) => {
        const reach = (wetUnits * (tailIndex + 1)) / WET_TAILS;
        showRange(path, length, Math.max(0, front.at - reach), Math.min(front.at, length));
      });
    timeline
      .fromTo(
        front,
        { at: 0 },
        {
          at: length - tailUnits,
          duration: cursor - start - tail,
          ease: "none",
          immediateRender: false,
          onUpdate: showWet,
        },
        start,
      )
      .to(
        front,
        { at: length, duration: Math.max(tail, 0.01), ease: "power1.out", onUpdate: showWet },
        cursor - tail,
      )
      // After the stroke, the windows run on past its end until all has settled.
      .to(
        front,
        { at: length + wetUnits, duration: pace.wet, ease: "none", onUpdate: showWet },
        cursor,
      );
  });
  return timeline;
}

/** One pass of light across the finished word. */
export function sweepInk(parts: InkParts, duration = 2.4) {
  const width = parts.svg.viewBox.baseVal.width;
  return gsap.fromTo(
    parts.sweep,
    { x: 0 },
    { x: width * 1.3, duration, ease: "sine.inOut", immediateRender: false },
  );
}
