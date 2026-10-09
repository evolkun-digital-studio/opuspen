import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { insidePolygon, layoutHero, penPolygon } from "./hero-layout";
import {
  NIB_ORIGIN,
  NIB_TRANSFORM_ORIGIN,
  hideInk,
  inkParts,
  sweepInk,
  writeInk,
  type InkPace,
} from "./ink-motion";

type Listen = <E extends Event>(
  target: EventTarget,
  type: string,
  handler: (event: E) => void,
) => void;

type HeroMotionOptions = {
  hero: HTMLElement;
  desktop: boolean;
  /** Wide enough for the pen to write the signature itself (not stacked). */
  follow: boolean;
  finePointer: boolean;
  listen: Listen;
  onCleanup: (undo: () => void) => void;
  /** Runs a function inside the matchMedia context, so what it creates is reverted with it. */
  track: (create: () => void) => void;
  scrollTo: (target: string) => void;
};

export type HeroMotion = {
  /** Hide everything the intro will bring in. Call before the preloader opens. */
  prepare: () => void;
  /** The intro, built against the settled layout. Starts the idle loops when done. */
  play: () => gsap.core.Timeline;
  /** No intro: everything is already in place; start the idle loops and parallax. */
  settle: () => void;
};

/** When the intro reaches the header, in seconds after the hero starts. */
export const heroChromeAt = 1.2;

/**
 * A signature on a contract: unhurried. 360px/s along the stroke, a short
 * settle as the nib touches down, a soft ease-out at each stroke's end, a
 * deliberate lift between the "O" and "pus".
 */
const SIGNING: InkPace = {
  speed: 360,
  wet: 1.6,
  settle: 0.12,
  tail: 0.1,
  wobble: 0.5,
  // About 0.35s in all between strokes: up, a short glide, down.
  lift: { rise: 8, tilt: 2, up: 0.12, down: 0.1 },
  gap: 0.35,
};
/** Nothing moves faster than the writing. */
const CALM_SPEED = SIGNING.speed;

/**
 * The hero's whole motion lifecycle, mounted inside useProductMotion's
 * gsap.matchMedia callback. Each pen wrapper owns one kind of transform:
 * .hero-pen-scroll (scroll-out) > -parallax (pointer) > -float (idle)
 * > -write (follows the ink; carries the shadows) > -lift > .hero-pen (wobble).
 */
export function mountHeroMotion({
  hero,
  desktop,
  follow,
  finePointer,
  listen,
  onCleanup,
  track,
  scrollTo,
}: HeroMotionOptions): HeroMotion {
  const one = <T extends Element = HTMLElement>(selector: string) =>
    hero.querySelector<T>(selector);
  const all = <T extends Element = HTMLElement>(selector: string) =>
    Array.from(hero.querySelectorAll<T>(selector));

  const scrollLayer = one(".hero-pen-scroll");
  const parallax = one(".hero-pen-parallax");
  const float = one(".hero-pen-float");
  const write = one(".hero-pen-write");
  const lift = one(".hero-pen-lift");
  const pen = one(".hero-pen");
  const image = one(".hero-pen-image");
  const shadows = one(".hero-shadows");
  const sheenBand = one(".hero-sheen-band");
  const specular = one(".hero-specular-line");
  const shaft = one(".hero-shaft");
  const guilloche = one(".hero-guilloche");
  const svg = one<SVGSVGElement>(".hero-signature");
  const ink = svg ? inkParts(svg) : null;
  const lines = all(".hero-title .line-mask > span");
  const actions = all(".hero-action");
  const foot = all(".hero-caption, .hero-scroll, .hero-film-toggle");
  const penLayers = [write, lift, pen].filter(Boolean) as HTMLElement[];
  gsap.set([lift, pen], { transformOrigin: NIB_TRANSFORM_ORIGIN });

  /* ---- At rest: idle float, sheen; they start once the pen has settled ---- */
  const idle = gsap
    .timeline({ paused: true })
    .to(float, { y: -5, duration: 1.5, ease: "sine.out" })
    .to(float, { y: 5, duration: 3, ease: "sine.inOut", yoyo: true, repeat: -1 });
  // A soft band of light crosses the barrel, perpendicular to it, now and then.
  const sheen = gsap
    .timeline({ paused: true, repeat: -1, repeatDelay: 9 })
    .fromTo(
      sheenBand,
      { xPercent: -40, yPercent: 38, autoAlpha: 1 },
      { xPercent: 40, yPercent: -38, duration: 5.5, ease: "sine.inOut" },
    );
  // Pointer depth is off until the pen rests, then fades in over a second.
  const depth = { amount: 0 };
  let settled = false;
  let onScreen = true;
  // CSS reads [data-paused] to hold the guilloché and the breathing light.
  const syncIdle = () => {
    const run = onScreen && !document.hidden;
    hero.toggleAttribute("data-paused", !run);
    if (settled) {
      idle.paused(!run);
      sheen.paused(!run);
    }
  };
  listen(document, "visibilitychange", syncIdle);
  onCleanup(() => {
    hero.removeAttribute("data-paused");
    idle.kill();
    sheen.kill();
    gsap.killTweensOf(depth);
  });

  const settle = () => {
    settled = true;
    gsap.set(penLayers, { clearProps: "willChange" });
    gsap.to(depth, { amount: 1, duration: 1, ease: "sine.inOut" });
    syncIdle();
  };

  /* ---- Pointer: the resting pen at ±12px, its shadows the other way ---- */
  if (desktop && finePointer) {
    const quick = (target: Element | null, property: string, duration = 0.9) =>
      gsap.quickTo(target, property, { duration, ease: "power3.out" });
    const penX = quick(parallax, "x");
    const penY = quick(parallax, "y");
    const penTurn = quick(parallax, "rotation");
    const shadowX = quick(shadows, "x");
    const shadowY = quick(shadows, "y");
    const lightX = quick(shaft, "x");
    const lightY = quick(shaft, "y");
    // The highlight slides across the barrel as the light seems to move.
    const glintX = quick(specular, "xPercent", 1.6);
    const glintY = quick(specular, "yPercent", 1.6);
    const lean = (x: number, y: number) => {
      const nx = x * depth.amount;
      const ny = y * depth.amount;
      penX(nx * 24);
      penY(ny * 24);
      penTurn(nx * 1.2);
      shadowX(nx * -14);
      shadowY(ny * -10);
      lightX(nx * 24);
      lightY(ny * 24);
      glintX(nx * 3 * 0.51);
      glintY(nx * 3 * 0.86);
    };

    // The ring shows only over the pen itself (its silhouette), at rest.
    const cursor = one(".hero-cursor");
    gsap.set(cursor, { xPercent: -50, yPercent: -50, autoAlpha: 0, scale: 0.6 });
    const cursorX = gsap.quickTo(cursor, "x", { duration: 0.45, ease: "power3.out" });
    const cursorY = gsap.quickTo(cursor, "y", { duration: 0.45, ease: "power3.out" });
    let ringShown = false;
    const ring = (show: boolean) => {
      if (show === ringShown) return;
      ringShown = show;
      hero.toggleAttribute("data-ring", show);
      gsap.to(cursor, {
        autoAlpha: show ? 1 : 0,
        scale: show ? 1 : 0.6,
        duration: show ? 0.6 : 0.4,
        ease: show ? "power3.out" : "power2.out",
        overwrite: "auto",
      });
    };
    const overPen = (event: PointerEvent) => {
      if (!settled || !image) return false;
      const box = image.getBoundingClientRect();
      return insidePolygon([event.clientX, event.clientY], penPolygon(box));
    };
    onCleanup(() => hero.removeAttribute("data-ring"));

    listen<PointerEvent>(hero, "pointermove", (event) => {
      const rect = hero.getBoundingClientRect();
      cursorX(event.clientX - rect.left);
      cursorY(event.clientY - rect.top);
      ring(overPen(event));
      lean(
        (event.clientX - rect.left) / rect.width - 0.5,
        (event.clientY - rect.top) / rect.height - 0.5,
      );
    });
    listen(hero, "pointerleave", () => {
      lean(0, 0);
      ring(false);
    });
    listen<PointerEvent>(hero, "click", (event) => {
      if (overPen(event)) scrollTo("#overture");
    });
    onCleanup(() => gsap.killTweensOf(cursor));
  }

  /* ---- Scroll-out: the pen rises a little, the signature leaves last ---- */
  const out = { trigger: hero, start: "top top", end: "bottom top", scrub: 1.2 };
  gsap.to(scrollLayer, {
    rotation: 2, // a touch flatter; the pen is only ever moved, never scaled
    y: () => window.innerHeight * -0.16,
    ease: "none",
    scrollTrigger: { ...out, invalidateOnRefresh: true },
  });
  gsap.to([...all(".hero-title .line-mask"), one(".hero-actions"), one(".hero-foot")], {
    autoAlpha: 0,
    y: -40,
    ease: "none",
    scrollTrigger: { ...out, end: "45% top" },
  });
  gsap.to(svg, {
    autoAlpha: 0,
    y: -24,
    ease: "none",
    scrollTrigger: { ...out, start: "20% top", end: "70% top" },
  });
  // Green to ink, so the curtain into the Overture reads as one gesture.
  gsap.fromTo(hero, { "--hero-dusk": 0 }, { "--hero-dusk": 1, ease: "none", scrollTrigger: out });

  if (desktop) {
    ScrollTrigger.create({
      trigger: hero,
      start: "top top",
      end: "bottom top",
      pin: true,
      pinSpacing: false,
    });
  }
  // Plain scroll positions: with `trigger: hero` the pin would push this back.
  ScrollTrigger.create({
    start: 0,
    end: () => hero.offsetTop + hero.offsetHeight,
    onToggle: (self) => {
      onScreen = self.isActive;
      syncIdle();
    },
  });

  /* ---- Intro ---- */
  const prepare = () => {
    gsap.set([shaft, guilloche], { autoAlpha: 0 });
    gsap.set(lines, { yPercent: 110 });
    gsap.set([...actions, ...foot], { autoAlpha: 0, y: 8 });
    gsap.set(write, { autoAlpha: 0 });
    if (ink) hideInk(ink);
  };

  /** Distance (px) from a screen point to the nib's resting point. */
  const distanceToRest = (point: DOMPoint) => {
    const box = scrollLayer?.getBoundingClientRect();
    if (!box) return 0;
    const restX = box.left + box.width * NIB_ORIGIN[0];
    const restY = box.top + box.height * NIB_ORIGIN[1];
    return Math.hypot(point.x - restX, point.y - restY);
  };

  const play = () => {
    // Measured now, against the settled layout: where the pen rests.
    layoutHero(hero);
    let timeline!: gsap.core.Timeline;
    track(() => {
      timeline = gsap.timeline();
      timeline
        .to(shaft, { autoAlpha: 1, duration: 2.4, ease: "power2.out" }, 0)
        .to(guilloche, { autoAlpha: 1, duration: 3, ease: "power2.out" }, 0);

      let at = 0.6;
      if (ink && write && lift && pen && follow) {
        // a) The pen glides in from the upper right, lifted, and sets the nib
        //    down on the first point of the "O".
        gsap.set(penLayers, { willChange: "transform" });
        gsap.set(lift, { y: -SIGNING.lift.rise, rotation: SIGNING.lift.tilt });
        gsap.set(shadows, { scale: 1.08, opacity: 0.8 });
        timeline.to(write, { autoAlpha: 1, duration: 0.6, ease: "power1.out" }, 0.3);
        if (ink.enter) {
          timeline.fromTo(
            write,
            { x: 0, y: 0 },
            {
              motionPath: {
                path: ink.enter,
                align: ink.enter,
                alignOrigin: [...NIB_ORIGIN],
                autoRotate: false,
              },
              // sine.out peaks at π/2 × its average speed: over this short arc
              // that stays under the writing speed (expo.out would not).
              duration: 1.8,
              ease: "sine.out",
              immediateRender: false,
            },
            0.3,
          );
        }
        timeline
          .to(lift, { y: 0, rotation: 0, duration: 0.25, ease: "power2.in" }, 2.1)
          .to(shadows, { scale: 1, opacity: 1, duration: 0.25, ease: "power2.in" }, 2.1);
        at = 2.35;

        // b) The signature, ink and nib on one timeline.
        const writing = writeInk(ink, { write, lift, body: pen, shadows }, SIGNING);
        timeline.add(writing.paused(false), at);
        at += writing.duration() - SIGNING.wet; // the last fresh ink settles on its own

        // c) Lift, then glide to rest, never faster than the writing
        //    (power3 is quartic: power3.inOut peaks at four times its average speed).
        const lastNib = ink.strokes[ink.strokes.length - 1]?.nib;
        const end = lastNib?.getPointAtLength(lastNib.getTotalLength());
        const matrix = lastNib?.getScreenCTM();
        const endPoint = end && matrix ? new DOMPoint(end.x, end.y).matrixTransform(matrix) : null;
        const glide = Math.max(1.6, endPoint ? (4 * distanceToRest(endPoint)) / CALM_SPEED : 1.6);
        timeline
          .add(sweepInk(ink, 3), at)
          .to(lift, { y: -10, rotation: 2, duration: 0.4, ease: "power2.out" }, at)
          .to(shadows, { scale: 1.08, opacity: 0.8, duration: 0.4, ease: "power2.out" }, at)
          .to(write, { x: 0, y: 0, duration: glide, ease: "power3.inOut" }, at + 0.4)
          .to(lift, { y: 0, rotation: 0, duration: 0.6, ease: "sine.inOut" }, at + glide)
          .to(shadows, { scale: 1, opacity: 1, duration: 0.6, ease: "sine.inOut" }, at + glide);
        at += 0.4 + glide;
      } else if (ink) {
        // Stacked: the signature writes itself at the same pace; then the pen
        // fades in at rest above it.
        const writing = writeInk(ink, undefined, SIGNING);
        timeline.add(writing.paused(false), at);
        at += writing.duration() - SIGNING.wet;
        timeline
          .add(sweepInk(ink, 3), at)
          .to(write, { autoAlpha: 1, duration: 1.4, ease: "power2.out" }, at);
        at += 0.8;
      } else {
        timeline.to(write, { autoAlpha: 1, duration: 1.4, ease: "power2.out" }, at);
      }

      // d) The line rises and the actions arrive.
      timeline
        .to(lines, { yPercent: 0, duration: 1.4, stagger: 0.12, ease: "power3.out" }, at)
        .to(
          actions,
          { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: "power2.out" },
          at + 0.6,
        )
        .to(foot, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.1, ease: "power2.out" }, at + 0.8)
        .call(settle, undefined, at + 1.6);
    });
    return timeline;
  };

  return { prepare, play, settle };
}
