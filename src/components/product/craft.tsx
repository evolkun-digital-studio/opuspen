import { ROMAN, chapterNumber, craftChapters } from "./content";
import { Opener } from "./opener";
import { Picture } from "./picture";
import { Script } from "./script";

const BLINDS = 12;

/**
 * Three chapters. Stacked by default (mobile, reduced motion); on desktop the
 * motion hook sets data-pinned and crossfades them through horizontal blinds.
 */
export function Craft({ step }: { step: number }) {
  const active = craftChapters[step] ?? craftChapters[0];

  return (
    <section
      className="craft section--dark"
      id="craft"
      data-header="dark"
      aria-labelledby="craft-title"
    >
      <div className="craft-guilloche" aria-hidden="true" />
      <div className="craft-inner">
        <header className="craft-header">
          <Opener index={chapterNumber.craft} as="h2" id="craft-title">
            The craft
          </Opener>
        </header>

        <div className="craft-stage">
          <div className="craft-rail" aria-hidden="true">
            <span className="craft-rail-track">
              <span className="craft-rail-fill" />
            </span>
            <ol className="craft-rail-marks">
              {craftChapters.map((chapter, index) => (
                <li key={chapter.title} className={index === step ? "is-active" : undefined}>
                  {ROMAN[index]}
                </li>
              ))}
            </ol>
          </div>

          <div className="craft-chapters">
            {craftChapters.map((chapter, index) => (
              <article className="craft-chapter" key={chapter.title}>
                <div className="craft-copy">
                  <span className="numeral craft-numeral">{ROMAN[index]}</span>
                  <h3 className="display craft-title">{chapter.title}</h3>
                  <p className="craft-body">{chapter.body}</p>
                </div>
                <figure
                  className={`craft-figure frame${index === 0 ? " craft-figure--nib" : ""}`}
                  data-reveal="image"
                >
                  <div className={index === 0 ? "frame-zoom" : "frame-zoom frame-media"}>
                    <Picture
                      image={chapter.image}
                      alt={chapter.alt}
                      className="craft-image"
                      style={{ objectPosition: chapter.focus }}
                    />
                  </div>
                  {"note" in chapter && (
                    <p className="craft-note" aria-hidden="true">
                      <Script write="play">{chapter.note}</Script>
                    </p>
                  )}
                </figure>
              </article>
            ))}
            <div className="craft-blinds" aria-hidden="true">
              {Array.from({ length: BLINDS }, (_, index) => (
                <span className="craft-blind" key={index} />
              ))}
            </div>
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          Chapter {ROMAN[step]}: {active.title}
        </p>
      </div>
    </section>
  );
}
