import { useEffect, type RefObject } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { MotionPathPlugin } from "gsap/MotionPathPlugin";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import Lenis from "lenis";
import { heroChromeAt, mountHeroMotion } from "./hero-motion";
import { hideInk, inkParts, writeInk } from "./ink-motion";

/** Slow and weighty, like a watch case closing: the CSS twin is cubic-bezier(.77,0,.18,1). */
const EASE = "expo.inOut";
const DESKTOP = "(min-width: 901px)";
/** ms after navigation start; past this the intro could not finish before the CSS failsafe. */
const INTRO_DEADLINE = 2200;
/** The preloader's full sequence plays once per session. */
const SESSION_KEY = "opus:preloader";
/** The aperture: the CSS twin of EASE, as the panels part. */
const APERTURE = "M0,0 C0.77,0 0.18,1 1,1";
/** The preloader holds here until fonts and the pen are ready... */
const PRELOADER_HOLD = 2.9;
/** ...but opens by this time, so it is gone by 4.5s. */
const PRELOADER_OPEN_BY = 3.2;
const PRELOADER_OPEN = 1.3;

const sessionFlag = {
  get: () => {
    try {
      return window.sessionStorage.getItem(SESSION_KEY) === "seen";
    } catch {
      return false;
    }
  },
  set: () => {
    try {
      window.sessionStorage.setItem(SESSION_KEY, "seen");
    } catch {
      // Storage may be unavailable (private modes); the full intro plays again.
    }
  },
};

/** Time at which an ease reaches a given progress (bisection). */
const timeAt = (ease: (t: number) => number, progress: number) => {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2;
    if (ease(mid) < progress) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};
/** The header's height: where section tones are probed, and the anchor scroll offset. */
const HEADER_HEIGHT = 72;
/** In-page scrolls land below the header, with a long, soft settle. */
const SCROLL_TO = {
  offset: -80,
  duration: 1.4,
  easing: (t: number) => 1 - Math.pow(1 - t, 4),
  // Links in the menu are followed while it is still closing (Lenis stopped).
  force: true,
};
/** Upward travel (px) after the hero before the header returns. */
const REVEAL_THRESHOLD = 10;

type StepHandler = (step: number) => void;

/** Script is written left to right; the negative insets leave room for its swashes. */
const INK_HIDDEN = "inset(-40% 104% -40% -6%)";
const INK_SHOWN = "inset(-40% -6% -40% -6%)";

/** Reveals a <Script> with a writing mask, a gold ink dot riding its leading edge. */
const writeScript = (script: Element, scrollTrigger?: ScrollTrigger.Vars, duration = 1.9) => {
  const text = script.querySelector(".script-text");
  const ink = script.querySelector(".script-ink");
  return gsap
    .timeline({ defaults: { ease: "power2.inOut" }, ...(scrollTrigger && { scrollTrigger }) })
    .fromTo(text, { clipPath: INK_HIDDEN }, { clipPath: INK_SHOWN, duration }, 0)
    .fromTo(ink, { xPercent: -100, autoAlpha: 0 }, { xPercent: 0, duration }, 0)
    .to(ink, { autoAlpha: 1, duration: 0.25, ease: "none" }, 0)
    .to(ink, { autoAlpha: 0, duration: 0.5, ease: "power1.out" }, duration - 0.4);
};

/**
 * Every scroll effect and pointer flourish on the page lives in this one
 * scoped gsap.matchMedia lifecycle, synchronized with Lenis. Without motion
 * preference, only the header state runs (instantly) and the CSS fallback
 * layout stands.
 */
export function useProductMotion(
  root: RefObject<HTMLDivElement | null>,
  onCraftStep: StepHandler,
  onPaperStep: StepHandler,
  onColorStep: StepHandler,
) {
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    gsap.registerPlugin(ScrollTrigger, DrawSVGPlugin, MotionPathPlugin, SplitText, CustomEase);
    ScrollTrigger.config({ ignoreMobileResize: true });

    const media = gsap.matchMedia();
    let lenis: Lenis | undefined;
    // Lenis rests while the preloader runs or a dialog (menu, reservation) is open.
    const locks = { preloader: false, dialog: false };
    const syncLock = () => {
      if (!lenis) return;
      if (locks.preloader || locks.dialog) lenis.stop();
      else lenis.start();
    };
    const dialogs = new MutationObserver(() => {
      locks.dialog = Boolean(element.querySelector("dialog[open]"));
      syncLock();
    });
    dialogs.observe(element, { subtree: true, attributes: true, attributeFilter: ["open"] });
    // The intro plays once per mount, not again when a breakpoint flips.
    let introPlayed = false;
    const tick = (time: number) => lenis?.raf(time * 1000);
    const select = <T extends Element = HTMLElement>(selector: string) =>
      element.querySelector<T>(selector);
    const selectAll = (selector: string) =>
      Array.from(element.querySelectorAll<HTMLElement>(selector));

    /* ---- Smooth scrolling: one Lenis, driven by GSAP's ticker ---- */
    // Its own matchMedia entry: created once, and torn down only if the visitor
    // switches to reduced motion (native scrolling), never when a breakpoint
    // flips, so it is never duplicated.
    media.add("(prefers-reduced-motion: no-preference)", () => {
      lenis = new Lenis({
        lerp: 0.085,
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1,
        syncTouch: false,
        anchors: SCROLL_TO,
        autoRaf: false,
      });
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);
      syncLock();
      return () => {
        gsap.ticker.remove(tick);
        gsap.ticker.lagSmoothing(500, 33);
        lenis?.destroy();
        lenis = undefined;
      };
    });

    media.add(
      {
        // gsap.matchMedia only runs when a condition matches; `always` keeps the
        // header and preloader handled on small screens with reduced motion.
        always: "all",
        desktop: DESKTOP,
        // From here up the pen writes the hero signature itself (see hero-layout.ts).
        wide: "(min-width: 700px)",
        motion: "(prefers-reduced-motion: no-preference)",
        finePointer: "(hover: hover) and (pointer: fine)",
      },
      (context) => {
        const { desktop, wide, motion, finePointer } = context.conditions ?? {};
        const cleanups: (() => void)[] = [];
        const listen = <E extends Event>(
          target: EventTarget,
          type: string,
          handler: (event: E) => void,
        ) => {
          const listener = handler as EventListener;
          target.addEventListener(type, listener, { passive: true });
          cleanups.push(() => target.removeEventListener(type, listener));
        };
        const flag = (target: Element | null, name: string, on = true) => {
          target?.toggleAttribute(name, on);
          cleanups.push(() => target?.removeAttribute(name));
        };
        const cleanup = () => cleanups.forEach((undo) => undo());

        /* ---- Header: static over the hero, gone at its exit, back on scroll up ---- */
        // Called last in either branch, so the tone triggers measure after every pin.
        const mountHeader = () => {
          const header = select(".nav");
          if (!header) return;
          let visible = true;
          let pastHero = false;

          const setVisible = (show: boolean, slide = false) => {
            if (show === visible) return;
            visible = show;
            header.toggleAttribute("data-hidden", !show);
            header.toggleAttribute("inert", !show);
            if (show) header.removeAttribute("aria-hidden");
            else header.setAttribute("aria-hidden", "true");
            if (!motion) {
              gsap.set(header, { opacity: show ? 1 : 0 });
            } else if (show) {
              gsap.fromTo(
                header,
                { y: slide ? -8 : 0 },
                { opacity: 1, y: 0, duration: 0.4, ease: "power2.out", overwrite: true },
              );
            } else {
              // No slide on the way out: the hero wipe should read as one clean cut.
              gsap.to(header, { opacity: 0, duration: 0.15, ease: "none", overwrite: true });
            }
          };
          cleanups.push(() => {
            gsap.killTweensOf(header);
            header.style.removeProperty("opacity");
            header.style.removeProperty("transform");
            ["data-hidden", "inert", "aria-hidden"].forEach((name) => header.removeAttribute(name));
            header.classList.remove("nav--dark");
          });

          // Hide at the same point the hero's exit transition takes over (65% of
          // the hero). Measured as a plain scroll position: with `trigger: ".hero"`
          // ScrollTrigger would push the start back by the length of the hero's pin.
          const hero = select(".hero");
          ScrollTrigger.create({
            start: () => (hero ? hero.offsetTop + hero.offsetHeight * 0.65 : 0),
            end: "max",
            onEnter: () => {
              pastHero = true;
              setVisible(false);
            },
            onLeaveBack: () => {
              pastHero = false;
              setVisible(true);
            },
          });

          // Past the hero: hide while reading down, return after a deliberate scroll up.
          let lastScroll = window.scrollY;
          let upTravel = 0;
          ScrollTrigger.create({
            start: 0,
            end: "max",
            onUpdate: (self) => {
              const current = self.scroll();
              const delta = current - lastScroll;
              lastScroll = current;
              if (!pastHero || delta > 0) {
                upTravel = 0;
                if (pastHero) setVisible(false);
              } else if (delta < 0) {
                upTravel -= delta;
                if (upTravel > REVEAL_THRESHOLD) setVisible(true, true);
              }
            },
          });

          // Inert normally keeps focus out; if anything still lands inside, show it.
          listen(header, "focusin", () => setVisible(true));

          // Ink text over light sections, white over dark ones.
          selectAll("[data-header]").forEach((section) => {
            ScrollTrigger.create({
              trigger: section,
              start: `top ${HEADER_HEIGHT}px`,
              end: `bottom ${HEADER_HEIGHT}px`,
              onToggle: (self) => {
                if (self.isActive) {
                  header.classList.toggle("nav--dark", section.dataset["header"] === "light");
                }
              },
            });
          });
        };

        /* ---- Coffret hotspots: pressed state in every mode (zoom comes with motion) ---- */
        const dots = selectAll(".coffret-dot");
        let onPress: ((dot: HTMLElement | null) => void) | undefined;
        dots.forEach((dot) => {
          listen(dot, "click", () => {
            const pressed = dot.getAttribute("aria-pressed") === "true";
            dots.forEach((other) => other.setAttribute("aria-pressed", "false"));
            dot.setAttribute("aria-pressed", String(!pressed));
            onPress?.(pressed ? null : dot);
          });
        });
        cleanups.push(() => dots.forEach((dot) => dot.setAttribute("aria-pressed", "false")));

        /* ---- Reduced motion: dismiss the preloader and keep the static layout ---- */
        if (!motion) {
          introPlayed = true;
          gsap.to(".preloader", { autoAlpha: 0, duration: 0.3, ease: "none" });
          mountHeader();
          return cleanup;
        }

        /* ---- Hero: intro, pointer depth, idle float, scroll-out (hero-motion.ts) ---- */
        const heroElement = select(".hero");
        const hero = heroElement
          ? mountHeroMotion({
              hero: heroElement,
              desktop: Boolean(desktop),
              follow: Boolean(wide),
              finePointer: Boolean(finePointer),
              listen,
              onCleanup: (undo) => cleanups.push(undo),
              track: (create) => context.add(create),
              scrollTo: (target) => lenis?.scrollTo(target, SCROLL_TO),
            })
          : undefined;

        /* ---- Preloader → hero intro ---- */
        // The hero writes only once fonts are in and the pen image is decoded.
        const penImage = select(".hero-pen-image") as HTMLImageElement | null;
        const ready = Promise.all([
          document.fonts?.ready,
          penImage?.decode?.().catch(() => undefined),
        ]).then(() => undefined);
        let cancelled = false;
        cleanups.push(() => (cancelled = true));
        const navChrome = ".nav > .nav-wordmark, .nav .nav-link, .nav > .nav-pill";

        // Builds the hero intro against the settled layout once everything is
        // ready. Scrolling during the intro completes it, so the pen and its
        // ink never part company with the scroll-out.
        const startHero = () => {
          void ready.then(() => {
            if (cancelled || !hero) return;
            context.add(() => {
              const intro = hero.play();
              const finish = () => intro.isActive() && intro.progress(1);
              lenis?.on("scroll", ({ scroll }: Lenis) => scroll > 4 && finish());
              // A resize mid-intro would leave the pen's paths stale: the
              // writing completes at once and the layout re-hangs the pen
              // (hero-layout.ts) from the word at rest.
              listen(window, "resize", finish);
              // Wordmark, then links, then the order pill (document order).
              // Explicit end values: .nav-link transitions opacity in CSS, so a
              // .from() after a revert could read a half-faded value as its end.
              gsap.fromTo(
                navChrome,
                { autoAlpha: 0, y: 12 },
                {
                  autoAlpha: 1,
                  y: 0,
                  duration: 0.9,
                  stagger: 0.06,
                  ease: "expo.out",
                  delay: heroChromeAt,
                },
              );
            });
          });
        };

        // A late hydration (slow network) has already kept the ink screen up
        // too long for the full ceremony: it gets the short fade instead.
        const lateStart = performance.now() > INTRO_DEADLINE;
        const preloader = select(".preloader");
        if (introPlayed) {
          // A breakpoint flipped after the intro: everything is in place.
          hero?.settle();
          gsap.set(preloader, { autoAlpha: 0 });
        } else if (lateStart || sessionFlag.get()) {
          // Seen this session (or late): a short fade, then the pen writes.
          introPlayed = true;
          hero?.prepare();
          gsap.set(navChrome, { autoAlpha: 0 });
          if (preloader) preloader.style.animation = "none";
          gsap.to(preloader, { autoAlpha: 0, duration: 0.6, ease: "power2.inOut" });
          gsap.delayedCall(0.3, startHero);
        } else if (preloader) {
          locks.preloader = true;
          syncLock();
          cleanups.push(() => {
            locks.preloader = false;
            syncLock();
          });
          hero?.prepare();
          gsap.set(navChrome, { autoAlpha: 0 });
          // The motion takes over from the CSS failsafe.
          preloader.style.animation = "none";
          cleanups.push(() => preloader.style.removeProperty("animation"));

          const aperture = CustomEase.create("opus-aperture", APERTURE);
          const line = select(".preloader-line");
          const crest = selectAll(".preloader-crest > *");
          const sequence = gsap.timeline();
          let gateOpen = false;
          sequence
            .set([".preloader-upper", line], { visibility: "visible" })
            .set(crest, { strokeDashoffset: 1 })
            .set(".preloader-wordmark", { yPercent: 110 })
            .set(".preloader-tagline", { autoAlpha: 0 })
            // A 6px gold drop swells at the centre...
            .fromTo(
              line,
              { scaleX: 0, scaleY: 0 },
              {
                scaleX: 6 / (line?.offsetWidth || 440),
                scaleY: 1,
                duration: 0.6,
                ease: "power2.out",
              },
              0,
            )
            // ...and stretches into a hairline, 220px each side.
            .to(line, { scaleX: 1, scaleY: 1 / 6, duration: 1.1, ease: "expo.inOut" }, 0.6)
            .to(
              crest,
              { strokeDashoffset: 0, duration: 1.2, stagger: 0.05, ease: "power2.inOut" },
              1.45,
            )
            .to(".preloader-wordmark", { yPercent: 0, duration: 1, ease: "expo.out" }, 1.85)
            .to(".preloader-tagline", { autoAlpha: 1, duration: 0.9, ease: "power1.out" }, 2.1)
            .addLabel("open", PRELOADER_HOLD)
            // Hold until fonts and the pen are ready (or the deadline passes).
            .call(() => void (gateOpen || sequence.pause()), undefined, "open")
            .call(() => (introPlayed = true), undefined, "open")
            .to(line, { autoAlpha: 0, duration: 0.35, ease: "power1.out" }, "open")
            .to(
              ".preloader-panel--top",
              { yPercent: -100, duration: PRELOADER_OPEN, ease: aperture },
              "open",
            )
            .to(
              ".preloader-panel--bottom",
              { yPercent: 100, duration: PRELOADER_OPEN, ease: aperture },
              "open",
            )
            // The pen comes in when the aperture is 40% open.
            .call(startHero, undefined, `open+=${PRELOADER_OPEN * timeAt(aperture, 0.4)}`)
            .call(
              () => {
                locks.preloader = false;
                syncLock();
              },
              undefined,
              "open+=1",
            )
            .set(preloader, { autoAlpha: 0 }, `open+=${PRELOADER_OPEN}`)
            .call(sessionFlag.set, undefined, `open+=${PRELOADER_OPEN}`);

          const open = () => {
            if (gateOpen) return;
            gateOpen = true;
            if (sequence.paused()) sequence.play();
          };
          void ready.then(open);
          const deadline = window.setTimeout(open, PRELOADER_OPEN_BY * 1000);
          cleanups.push(() => window.clearTimeout(deadline));
        }

        /* ---- Overture: the ivory curtain rises over the pinned hero ---- */
        if (desktop) {
          gsap.fromTo(
            ".overture",
            { clipPath: "inset(14% 8% 0% 8%)" },
            {
              clipPath: "inset(0% 0% 0% 0%)",
              ease: "none",
              scrollTrigger: {
                trigger: ".overture",
                start: "top bottom",
                end: "top top",
                scrub: 1.2,
              },
            },
          );
        }

        /* ---- Overture: words fill from stone to ink ---- */
        const tokens = getComputedStyle(element);
        gsap.fromTo(
          ".overture-word",
          { color: tokens.getPropertyValue("--stone").trim() },
          {
            color: tokens.getPropertyValue("--ink").trim(),
            stagger: 0.1,
            ease: "none",
            scrollTrigger: {
              trigger: ".overture-text",
              start: "top 78%",
              end: "bottom 40%",
              scrub: 1.2,
            },
          },
        );
        gsap.from(".overture-est", {
          autoAlpha: 0,
          y: 16,
          duration: 1.6,
          ease: EASE,
          scrollTrigger: { trigger: ".overture-est", start: "top 92%" },
        });

        /* ---- Headings rise from their masks; quiet copy settles in ---- */
        selectAll("[data-reveal='lines']").forEach((heading) => {
          gsap.from(heading.querySelectorAll(".line-mask > span"), {
            yPercent: 110,
            duration: 1.6,
            stagger: 0.18,
            ease: EASE,
            scrollTrigger: { trigger: heading, start: "top 88%" },
          });
        });
        // Quiet paragraphs rise line by line from their masks, re-split on resize.
        selectAll("[data-split]").forEach((block) => {
          SplitText.create(block, {
            type: "lines",
            mask: "lines",
            autoSplit: true,
            onSplit: (self) =>
              gsap.from(self.lines, {
                yPercent: 110,
                duration: 1.6,
                stagger: 0.12,
                ease: EASE,
                scrollTrigger: { trigger: block, start: "top 90%" },
              }),
          });
        });
        selectAll(
          ".opener, .section-lede, .section-note, .manifesto-copy, .audience, .journal-copy, .coffret-item, .certificate-copy, .newsletter",
        ).forEach((block) => {
          if (block.hasAttribute("data-split")) return;
          gsap.from(block, {
            autoAlpha: 0,
            y: 28,
            duration: 1.6,
            ease: EASE,
            scrollTrigger: { trigger: block, start: "top 90%" },
          });
        });

        /* ---- Script: written in once on arrival, or with the scroll ---- */
        selectAll(".script[data-write]").forEach((script) => {
          // The pinned craft chapters write their note themselves (below).
          if (desktop && script.closest(".craft")) return;
          writeScript(
            script,
            script.dataset["write"] === "scrub"
              ? { trigger: script, start: "top 88%", end: "top 52%", scrub: 1.2 }
              : { trigger: script, start: "top 88%" },
          );
        });

        /* ---- Images: a slow unveiling from an 8% inset, settling from 1.08 ---- */
        selectAll("[data-reveal='image']").forEach((frame) => {
          const reveal = gsap.timeline({
            defaults: { duration: 1.8, ease: "power3.out" },
            scrollTrigger: { trigger: frame, start: "top 85%" },
          });
          reveal.fromTo(
            frame,
            { clipPath: "inset(8% 8% 8% 8%)" },
            { clipPath: "inset(0% 0% 0% 0%)" },
            0,
          );
          const zoom = frame.querySelector(".frame-zoom");
          if (zoom && !frame.classList.contains("craft-figure--nib"))
            reveal.fromTo(zoom, { scale: 1.08 }, { scale: 1 }, 0);
        });

        /* ---- Craft: pinned chapters crossfading through horizontal blinds ---- */
        if (desktop) {
          const craft = select(".craft");
          flag(craft, "data-pinned");
          const copies = selectAll(".craft-copy");
          const figures = selectAll(".craft-figure");
          const blinds = selectAll(".craft-blind");
          const span = 2; // timeline units per chapter
          const swapAt = 0.68; // all blinds closed
          gsap.set([...copies.slice(1), ...figures.slice(1)], { autoAlpha: 0 });
          gsap.set(blinds, { scaleY: 0 });
          const chapters = gsap.timeline({
            defaults: { ease: EASE },
            scrollTrigger: {
              trigger: ".craft",
              start: "top top",
              end: () => `+=${window.innerHeight * copies.length * 1.1}`,
              pin: true,
              scrub: 1.2,
              invalidateOnRefresh: true,
              onUpdate: () => {
                const step = Math.floor((chapters.time() + 0.5 - swapAt) / span);
                onCraftStep(gsap.utils.clamp(0, copies.length - 1, step));
              },
            },
          });
          chapters.to(
            ".craft-rail-fill",
            { scaleY: 1, ease: "none", duration: span * copies.length },
            0,
          );
          figures.forEach((figure, index) => {
            const image = figure.querySelector("img");
            if (!image) return;
            chapters.fromTo(
              image,
              { scale: index === 0 ? 1 : 1.16 },
              {
                scale: index === 0 ? 1.05 : 1,
                ease: "none",
                duration: span + 1.2,
                immediateRender: index === 0,
              },
              Math.max(0, index * span - 1.2),
            );
          });
          for (let index = 1; index < copies.length; index++) {
            const at = index * span - 0.5;
            chapters
              .to(copies[index - 1] ?? [], { autoAlpha: 0, y: -24, duration: 0.45 }, at)
              .fromTo(
                blinds,
                { scaleY: 0, transformOrigin: "50% 0%" },
                { scaleY: 1, duration: 0.4, stagger: 0.025, immediateRender: false },
                at,
              )
              .set(figures[index - 1] ?? [], { autoAlpha: 0 }, at + swapAt)
              .set(figures[index] ?? [], { autoAlpha: 1 }, at + swapAt)
              .fromTo(
                blinds,
                { scaleY: 1, transformOrigin: "50% 100%" },
                { scaleY: 0, duration: 0.4, stagger: 0.025, immediateRender: false },
                at + swapAt + 0.02,
              )
              .fromTo(
                copies[index] ?? [],
                { autoAlpha: 0, y: 24 },
                { autoAlpha: 1, y: 0, duration: 0.5, immediateRender: false },
                at + swapAt + 0.08,
              );
            // A margin note, written over the image as its chapter arrives.
            const note = figures[index]?.querySelector(".script");
            if (note) chapters.add(writeScript(note, undefined, 1.2), at + swapAt + 0.3);
          }
        }

        /* ---- Manifesto: a slow word-by-word reveal ---- */
        gsap.fromTo(
          ".manifesto-word",
          { opacity: 0.14 },
          {
            opacity: 1,
            stagger: 0.1,
            ease: "none",
            scrollTrigger: {
              trigger: ".manifesto-statement",
              start: "top 82%",
              end: "bottom 30%",
              scrub: 1.6,
            },
          },
        );

        /* ---- Pinned steps: scroll drives the step; buttons scroll to their step ---- */
        const pinSteps = (
          trigger: string,
          length: number,
          buttons: string,
          onStep: StepHandler,
        ) => {
          const steps = selectAll(buttons).length || 4;
          const pinned = ScrollTrigger.create({
            trigger,
            start: "top top",
            end: () => `+=${window.innerHeight * length}`,
            pin: true,
            invalidateOnRefresh: true,
            onUpdate: (self) => onStep(Math.min(steps - 1, Math.floor(self.progress * steps))),
          });
          selectAll(buttons).forEach((button, index) => {
            listen(button, "click", () => {
              const target = pinned.start + (pinned.end - pinned.start) * ((index + 0.5) / steps);
              lenis?.scrollTo(target, { duration: 1.8 });
            });
          });
        };
        if (desktop) pinSteps(".paper", 2.6, ".paper-step", onPaperStep);
        pinSteps(".collection", desktop ? 2.6 : 1.3, ".collection .swatch", onColorStep);

        /* ---- Coffret: pinned, closed then open, its contents pointed out ---- */
        const stagePin = select(".coffret-stage-pin");
        const photos = select(".coffret-photos");
        if (desktop && stagePin && photos) {
          const closed = select(".coffret-photo--closed");
          const opened = select(".coffret-open");
          const bloom = select(".coffret-bloom");
          const spots = selectAll(".coffret-hotspot");
          const leaders = selectAll(".coffret-leader");
          const leaderOf = (spot: HTMLElement) =>
            leaders.find((leader) => leader.dataset["spot"] === spot.dataset["spot"]);
          const labelOf = (spot: HTMLElement) => spot.querySelector(".coffret-label");
          const dotOf = (spot: HTMLElement) => spot.querySelector(".coffret-dot");

          gsap.set(closed, { autoAlpha: 1 });
          gsap.set(opened, { autoAlpha: 0 });
          // Opacity only (not visibility): the hotspots stay reachable by keyboard.
          gsap.set(spots.map(dotOf), { opacity: 0, scale: 0.4 });
          gsap.set(spots.map(labelOf), { opacity: 0, y: 8 });
          gsap.set(leaders, { drawSVG: "0% 0%" });

          // b) a cinematic crossfade (the photographs are different angles, so
          // no lid is faked): a scale settle and a breath of white midway;
          // c) then the hotspots, one by one, each drawing its leader.
          const reveal = gsap
            .timeline({ paused: true })
            .to(opened, { autoAlpha: 1, duration: 1.2, ease: "sine.inOut" }, 0)
            .fromTo(opened, { scale: 1.04 }, { scale: 1, duration: 1.8, ease: "power2.out" }, 0)
            .to(bloom, { opacity: 0.15, duration: 0.6, ease: "sine.in" }, 0)
            .to(bloom, { opacity: 0, duration: 0.6, ease: "sine.out" }, 0.6)
            .to(closed, { autoAlpha: 0, duration: 0.5, ease: "none" }, 0.7);
          spots.forEach((spot, index) => {
            const at = 1.1 + index * 0.35;
            reveal
              .to(dotOf(spot), { opacity: 1, scale: 1, duration: 0.7, ease: "power3.out" }, at)
              .to(
                leaderOf(spot) ?? [],
                { drawSVG: "0% 100%", duration: 0.9, ease: "power2.inOut" },
                at + 0.1,
              )
              .to(
                labelOf(spot),
                { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" },
                at + 0.45,
              );
          });

          // a) a slow push-in on the closed coffret while the stage is pinned.
          let shown = false;
          gsap.fromTo(
            closed,
            { scale: 1 },
            {
              scale: 1.04,
              ease: "none",
              scrollTrigger: {
                trigger: stagePin,
                start: "top top",
                end: () => `+=${window.innerHeight * 1.4}`,
                pin: true,
                scrub: 1.2,
                invalidateOnRefresh: true,
                // Played and reversed in time, not scrubbed: a crossfade reads as
                // cinematic only at its own pace.
                onUpdate: (self) => {
                  if (self.progress > 0.38 && !shown) {
                    shown = true;
                    reveal.play();
                  } else if (self.progress < 0.3 && shown) {
                    shown = false;
                    reveal.reverse();
                  }
                },
              },
            },
          );
          // Tabbing into the hotspots shows them at once.
          listen(stagePin, "focusin", () => {
            shown = true;
            reveal.progress(1);
          });

          // Hover, focus or press: the stage leans in towards the object.
          let pressed: HTMLElement | null = null;
          const zoom = (dot: HTMLElement | null) => {
            const spot = dot?.closest<HTMLElement>(".coffret-hotspot") ?? null;
            const x = spot?.style.getPropertyValue("--x") ?? "50%";
            const y = spot?.style.getPropertyValue("--y") ?? "50%";
            gsap.to(photos, {
              scale: spot ? 1.15 : 1,
              transformOrigin: `${x} ${y}`,
              duration: 1.2,
              ease: "expo.out",
              overwrite: "auto",
            });
            spots.forEach((other) => {
              const dim = spot !== null && other !== spot;
              gsap.to([other, leaderOf(other) ?? []], {
                opacity: dim ? 0.12 : 1,
                duration: 0.6,
                ease: "power2.out",
                overwrite: "auto",
              });
            });
          };
          const release = () => zoom(pressed);
          onPress = (dot) => {
            pressed = dot;
            zoom(dot);
          };
          dots.forEach((dot) => {
            listen(dot, "pointerenter", () => zoom(dot));
            listen(dot, "focus", () => zoom(dot));
            listen(dot, "pointerleave", release);
            listen(dot, "blur", release);
          });
          cleanups.push(() => (onPress = undefined));
        }

        /* ---- The journal: floats closed, opens, and its lines are written ---- */
        const journalFigure = select(".journal-figure");
        if (journalFigure) {
          const closedBook = select(".journal-closed");
          const float = select(".journal-float");
          const shadow = select(".journal-shadow");
          const openBook = select(".journal-open");
          const lines = selectAll(".journal-line");
          gsap.set(closedBook, { autoAlpha: 1 });
          gsap.set(openBook, { autoAlpha: 0, scale: 0.96 });
          lines.forEach((line) =>
            gsap.set(line, { "--ink": line.style.getPropertyValue("--ink-from") }),
          );
          // A slow float, ±5px over 6s; the shadow tightens as the book rises.
          const drift = gsap
            .timeline({ repeat: -1, yoyo: true, defaults: { duration: 3, ease: "sine.inOut" } })
            .fromTo(float, { y: 5 }, { y: -5 }, 0)
            .fromTo(shadow, { scaleX: 1, opacity: 0.3 }, { scaleX: 0.9, opacity: 0.2 }, 0);
          const opening = gsap
            .timeline({ paused: true })
            // Two different shapes: the closed book leaves first and the open one
            // arrives as it goes, so the crossfade never reads as a double exposure.
            .to(closedBook, { autoAlpha: 0, scale: 1.03, duration: 0.6, ease: "sine.in" }, 0)
            .to(openBook, { autoAlpha: 1, duration: 1, ease: "sine.out" }, 0.45)
            .to(openBook, { scale: 1, duration: 1.4, ease: "power2.out" }, 0.45)
            .call(() => void drift.pause(), undefined, 1.4)
            .to(shadow, { scaleX: 1.1, opacity: 0.3, duration: 1.4, ease: "power2.out" }, 0);
          // Each printed line is written in along its baseline, left to right.
          lines.forEach((line, index) => {
            opening.to(
              line,
              {
                "--ink": line.style.getPropertyValue("--ink-to"),
                duration: 0.9,
                ease: "sine.inOut",
              },
              1.5 + index * 0.25,
            );
          });
          ScrollTrigger.create({
            trigger: journalFigure,
            start: "center 62%",
            once: true,
            onEnter: () => opening.play(),
          });
        }

        /* ---- The certificate: signed as it comes into view ---- */
        const signature = select<SVGSVGElement>(".certificate-ink");
        if (signature) {
          const parts = inkParts(signature);
          hideInk(parts);
          ScrollTrigger.create({
            trigger: ".certificate",
            start: "top 70%",
            once: true,
            // Built on arrival, so its speed is measured at the rendered size.
            onEnter: () => context.add(() => writeInk(parts).play()),
          });
        }

        /* ---- Atelier: frames drift at different speeds ---- */
        if (desktop) {
          selectAll(".atelier-item").forEach((item) => {
            const speed = Number(item.dataset["speed"] ?? 0);
            const travel = { trigger: item, start: "top bottom", end: "bottom top", scrub: 1.2 };
            gsap.fromTo(
              item,
              { y: speed * 400 },
              { y: -speed * 400, ease: "none", scrollTrigger: travel },
            );
            const image = item.querySelector(".atelier-image");
            if (!image) return;
            gsap.fromTo(
              image,
              { yPercent: -5, scale: 1.12 },
              { yPercent: 5, scale: 1.12, ease: "none", scrollTrigger: travel },
            );
          });
        }

        /* ---- Pointer: magnetic primary buttons ---- */
        if (finePointer) {
          selectAll("[data-magnetic]").forEach((button) => {
            const pullX = gsap.quickTo(button, "x", { duration: 0.8, ease: "power3.out" });
            const pullY = gsap.quickTo(button, "y", { duration: 0.8, ease: "power3.out" });
            // data-magnetic="6": the furthest the button may follow, in px.
            const reach = Number(button.dataset["magnetic"]) || Infinity;
            const pull = (offset: number) => gsap.utils.clamp(-reach, reach, offset * 0.3);
            listen<PointerEvent>(button, "pointermove", (event) => {
              const rect = button.getBoundingClientRect();
              pullX(pull(event.clientX - rect.left - rect.width / 2));
              pullY(pull(event.clientY - rect.top - rect.height / 2));
            });
            listen(button, "pointerleave", () => {
              pullX(0);
              pullY(0);
            });
          });
        }

        mountHeader();

        /* ---- Measure once more when fonts and images have settled ---- */
        // So the pinned sections (paper story, collection, coffret) line up.
        ScrollTrigger.sort();
        let measured = true;
        cleanups.push(() => (measured = false));
        const loaded =
          document.readyState === "complete"
            ? Promise.resolve()
            : new Promise<void>((resolve) =>
                window.addEventListener("load", () => resolve(), { once: true }),
              );
        void Promise.all([document.fonts?.ready, loaded]).then(
          () => measured && ScrollTrigger.refresh(),
        );

        return cleanup;
      },
      element,
    );

    return () => {
      dialogs.disconnect();
      media.revert();
      lenis?.destroy();
      lenis = undefined;
      gsap.ticker.remove(tick);
    };
  }, [root, onCraftStep, onPaperStep, onColorStep]);
}
