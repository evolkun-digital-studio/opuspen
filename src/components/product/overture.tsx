import { overture, overtureSignoff } from "./content";
import { Script } from "./script";

/**
 * Ivory curtain that rises over the hero; words fill from stone to ink on
 * scroll, then the Atelier signs beneath them.
 */
export function Overture() {
  return (
    <section
      className="overture section--ivory"
      id="overture"
      data-header="light"
      aria-labelledby="overture-title"
    >
      <div className="overture-inner">
        <span className="hairline hairline--short" aria-hidden="true" />
        <h2 id="overture-title" className="display overture-text">
          {overture.split(" ").map((word, index) => (
            <span key={index}>
              <span className="overture-word">{word}</span>{" "}
            </span>
          ))}
        </h2>
        <p className="overture-signoff">
          <Script write="scrub">{overtureSignoff}</Script>
        </p>
        <p className="numeral overture-est">Est. 2026</p>
      </div>
    </section>
  );
}
