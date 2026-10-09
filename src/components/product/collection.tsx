import { PRODUCT, chapterNumber, colorwayPen, colorways } from "./content";
import { Opener } from "./opener";
import { Script } from "./script";
import { Swatches } from "./swatches";

/** Past titles slide up out of their mask, future ones wait below it. */
const position = (index: number, active: number) =>
  index === active ? "is-active" : index < active ? "is-past" : "is-next";

type CollectionProps = {
  index: number;
  onSelect: (index: number) => void;
  onReserve: () => void;
};

export function Collection({ index, onSelect, onReserve }: CollectionProps) {
  const active = colorways[index] ?? colorways[0];

  return (
    <section
      className="collection"
      id="collection"
      data-header="dark"
      data-colorway={active.id}
      aria-labelledby="collection-title"
    >
      <div className="collection-backdrops" aria-hidden="true">
        {colorways.map((colorway, i) => (
          <span
            className={`collection-backdrop ${i === index ? "is-active" : ""}`}
            data-colorway={colorway.id}
            key={colorway.id}
          />
        ))}
      </div>

      <header className="section-header collection-header">
        <Opener index={chapterNumber.collection} as="h2" id="collection-title">
          The collection
        </Opener>
      </header>

      <div className="collection-pens">
        {colorways.map((colorway, i) => (
          <img
            key={colorway.id}
            className={`collection-pen ${i === index ? "is-active" : ""}`}
            src={colorway.pen}
            width={colorwayPen.width}
            height={colorwayPen.height}
            loading="lazy"
            decoding="async"
            alt={i === index ? `${PRODUCT} in ${colorway.name}` : ""}
            aria-hidden={i === index ? undefined : true}
          />
        ))}
        {/* Remounted per colorway, so a single gold light passes over each new lacquer. */}
        <span
          className="collection-sweep"
          key={active.id}
          style={{ maskImage: `url(${active.pen})`, WebkitMaskImage: `url(${active.pen})` }}
          aria-hidden="true"
        />
        <span className="collection-reflection" aria-hidden="true" />
      </div>

      <div className="collection-title" aria-hidden="true">
        <span className="collection-title-cell collection-title-cell--name">
          {colorways.map((colorway, i) => (
            <span className={`collection-title-text ${position(i, index)}`} key={colorway.id}>
              {colorway.name}
            </span>
          ))}
        </span>
        <span className="collection-lines">
          {colorways.map((colorway, i) => (
            <span className={`collection-line ${i === index ? "is-active" : ""}`} key={colorway.id}>
              <Script>{colorway.line}</Script>
            </span>
          ))}
        </span>
      </div>
      <p className="sr-only" aria-live="polite">
        {active.name}. {active.line}
      </p>

      <div className="collection-bottom">
        <Swatches selected={index} onSelect={onSelect} />
        <p className="collection-name">
          {PRODUCT} <span aria-hidden="true">—</span> {active.name}
        </p>
        <button type="button" className="btn-lux" onClick={onReserve} data-magnetic="6">
          <span>Reserve yours</span>
        </button>
      </div>
    </section>
  );
}
