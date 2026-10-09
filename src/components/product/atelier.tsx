import { atelierImages, chapterNumber } from "./content";
import { MaskedLines } from "./masked-lines";
import { Opener } from "./opener";
import { Picture } from "./picture";

/** Editorial, asymmetric gallery; each frame drifts at its own parallax speed. */
export function Atelier() {
  return (
    <section
      className="atelier section--dark"
      id="atelier"
      data-header="dark"
      aria-labelledby="atelier-title"
    >
      <header className="section-header atelier-header">
        <Opener index={chapterNumber.atelier}>Atelier</Opener>
        <h2 id="atelier-title" className="display section-title" data-reveal="lines">
          <MaskedLines lines={["Considered,", "down to the detail."]} />
        </h2>
        <p className="section-lede" data-split>
          Nothing added without purpose. Nothing left to chance.
        </p>
      </header>

      <div className="atelier-grid">
        {atelierImages.map((item) => (
          <figure
            className={`atelier-item atelier-item--${item.slot}`}
            key={item.slot}
            data-speed={item.speed}
          >
            <div className="atelier-frame frame" data-reveal="image">
              <div className="frame-zoom frame-media">
                <Picture image={item.image} alt={item.alt} className="atelier-image" />
              </div>
            </div>
            <figcaption className="atelier-caption">
              <span className="label">{item.caption}</span>
              <span className="atelier-note">{item.note}</span>
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
