import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PRODUCT, hero, images } from "./content";
import { useHeroLayout } from "./hero-layout";
import { InkWord } from "./ink-word";
import { Picture } from "./picture";
import { scriptSignature } from "./script-signature";

// Drop a film at src/assets/hero-film.mp4 and it plays behind the scene;
// without one, the layered gradient carries the hero on its own.
const films = import.meta.glob<string>("../../assets/hero-film.mp4", {
  eager: true,
  query: "?url",
  import: "default",
});
const film = Object.values(films)[0];

/** The signature's box, in em of the word (1em = 1000 font units), for sizing it. */
const [, , sigW = 0, sigH = 0] = scriptSignature.viewBox;
const signatureGeometry = {
  "--sig-box-w": sigW / 1000,
  "--sig-box-h": sigH / 1000,
} as CSSProperties;

/** Plays the film while the hero is on screen and the tab is visible, unless paused. */
function useFilm(paused: boolean) {
  const video = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const element = video.current;
    if (!element) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let onScreen = true;
    const sync = () => {
      if (paused || reduced || !onScreen || document.hidden) element.pause();
      else void element.play().catch(() => {});
    };
    const observer = new IntersectionObserver(([entry]) => {
      onScreen = entry?.isIntersecting ?? true;
      sync();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [paused]);
  return video;
}

/**
 * The pen signs the Maison's name. Maison green, guilloché, a breathing shaft
 * of light, and a single centred column: the house line, the signature
 * "Opus" in champagne ink, the line, a gold rule and the two actions. The
 * pen writes the signature, then lifts away to rest upper right, clear of
 * every word (hero-layout.ts finds the spot). Static and complete without
 * scripts or with reduced motion.
 *
 * The pen is a stack of wrappers the size of the cutout, each owning one kind
 * of transform so tweens never contend: scroll > pointer > idle float >
 * write (follows the ink, carries the shadows) > lift (between strokes) > the
 * pen (wobble). Its realism layers are all clipped to the cutout's silhouette.
 */
export function Hero({ onReserve }: { onReserve: () => void }) {
  const [paused, setPaused] = useState(false);
  const video = useFilm(paused);
  const section = useRef<HTMLElement>(null);
  useHeroLayout(section);

  return (
    <section
      ref={section}
      className="hero"
      id="top"
      data-header="dark"
      data-film={film ? "" : undefined}
      aria-labelledby="hero-title"
      style={signatureGeometry}
    >
      <div className="hero-backdrop" aria-hidden="true">
        {film && (
          <>
            <video
              ref={video}
              className="hero-film"
              src={film}
              muted
              loop
              playsInline
              preload="metadata"
            />
            <div className="hero-film-veil" />
          </>
        )}
        <div className="hero-guilloche" />
        <div className="hero-shaft">
          <div className="hero-shaft-light" />
        </div>
        <div className="hero-vignette" />
      </div>

      <div className="hero-stage">
        <div className="hero-pen-scroll">
          <div className="hero-pen-parallax">
            <div className="hero-pen-float">
              <div className="hero-pen-write">
                <div className="hero-shadows" aria-hidden="true">
                  <span className="hero-shadow hero-shadow--ambient" />
                  <span className="hero-shadow hero-shadow--contact" />
                </div>
                <div className="hero-pen-lift">
                  <div className="hero-pen">
                    <Picture
                      image={images.penUncapped}
                      className="hero-pen-image"
                      alt={`${PRODUCT}, uncapped: a brushed-steel barrel, black grip and engraved steel nib, resting after signing the Maison's name`}
                      priority
                    />
                    <span className="hero-pen-tint" aria-hidden="true" />
                    <span className="hero-pen-rim" aria-hidden="true" />
                    <span className="hero-specular" aria-hidden="true">
                      <span className="hero-specular-line" />
                    </span>
                    <span className="hero-sheen" aria-hidden="true">
                      <span className="hero-sheen-band" />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="hero-column">
        <InkWord data={scriptSignature} className="hero-signature" routes />
        <h1 id="hero-title" className="display hero-title">
          <span className="sr-only">{hero.title}</span>
          <span className="hero-title-visual" aria-hidden="true">
            <span className="line-mask hero-line">
              <span>{hero.lines[0]}</span>
            </span>{" "}
            <span className="line-mask hero-line">
              <span>{hero.lines[1]}</span>
            </span>
          </span>
        </h1>
        <div className="hero-actions">
          <a className="link-discover hero-action" href="#overture" data-magnetic="6">
            Discover
          </a>
          <button
            type="button"
            className="btn-lux hero-action"
            onClick={onReserve}
            data-magnetic="6"
          >
            <span>Reserve yours</span>
          </button>
        </div>
      </div>

      <div className="hero-foot">
        <p className="hero-caption">{hero.caption}</p>
        <a className="hero-scroll" href="#overture" aria-label="Scroll to the overture">
          <span className="hero-scroll-line" aria-hidden="true" />
        </a>
        {film && (
          <button
            type="button"
            className="hero-film-toggle"
            aria-label={paused ? "Play film" : "Pause film"}
            aria-pressed={paused}
            onClick={() => setPaused((value) => !value)}
          >
            <span className={paused ? "icon-play" : "icon-pause"} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Fine pointers only: a gold ring over the resting pen. */}
      <div className="hero-cursor" aria-hidden="true">
        <span>Discover</span>
      </div>
    </section>
  );
}
