import type { CSSProperties } from "react";
import {
  BRAND,
  PRODUCT,
  ROMAN,
  certificate,
  chapterNumber,
  coffretContents,
  coffretHotspots,
  images,
  journal,
  journalLines,
  type CoffretHotspot,
} from "./content";
import { Crest } from "./crest";
import { InkWord } from "./ink-word";
import { MaskedLines } from "./masked-lines";
import { Opener } from "./opener";
import { Picture } from "./picture";
import { scriptAtelier } from "./script-atelier";

/* ---------------------------------------------------------------------------
 * Hotspot leaders: from the object, out to the stage margin, then level to
 * the label. In % of the scene (the square photograph).
 * ------------------------------------------------------------------------- */
const LABEL_GAP = 9; // % beyond the photograph's edge where a label begins

function leaderPoints(spot: CoffretHotspot) {
  const edge = spot.side === "left" ? -LABEL_GAP + 2 : 100 + LABEL_GAP - 2;
  const elbow = spot.side === "left" ? spot.x - 10 : spot.x + 10;
  return `${spot.x},${spot.y} ${elbow},${spot.labelY} ${edge},${spot.labelY}`;
}

/* ---------------------------------------------------------------------------
 * The journal's handwriting: each printed line is a band of the photograph
 * shown over a clean-page plate, written in along its 19deg baseline by a
 * soft-edged mask (see .journal-line and the motion hook).
 * ------------------------------------------------------------------------- */
const { width: W, height: H, angle } = journalLines;
const rad = (angle * Math.PI) / 180;
const cos = Math.cos(rad);
const sin = Math.sin(rad);
/** Image px from (along the baseline, across it). */
const toImage = (along: number, across: number) => [
  along * cos + across * sin,
  -along * sin + across * cos,
];
const pct = ([x = 0, y = 0]: number[]) =>
  `${((x / W) * 100).toFixed(2)}% ${((y / H) * 100).toFixed(2)}%`;
/** Where a point along the baseline falls on a CSS gradient at (90 - angle)deg, in %. */
const gradientLength = W * cos + H * sin;
const alongPct = (along: number) =>
  ((along - ((W / 2) * cos - (H / 2) * sin) + gradientLength / 2) / gradientLength) * 100;

function lineStyle(line: (typeof journalLines.lines)[number]) {
  const [lo, hi] = line.across;
  const [from, to] = line.along;
  const pad = 14;
  const corners = [
    toImage(from - pad, lo - pad),
    toImage(to + pad * 2, lo - pad),
    toImage(to + pad * 2, hi + pad),
    toImage(from - pad, hi + pad),
  ];
  return {
    clipPath: `polygon(${corners.map(pct).join(", ")})`,
    "--ink-from": `${alongPct(from - pad).toFixed(2)}%`,
    "--ink-to": `${(alongPct(to + pad * 2) + 4).toFixed(2)}%`,
  } as CSSProperties;
}

function Stage() {
  return (
    <div className="coffret-stage">
      <div className="coffret-stage-pin">
        <div className="coffret-scene">
          <div className="coffret-photos">
            <Picture
              image={images.coffretClosed}
              className="coffret-photo coffret-photo--closed"
              alt={`The ${BRAND} coffret, closed: a black piano-lacquer box, its lid blind-embossed with the crest`}
            />
            <div className="coffret-open">
              <Picture
                image={images.coffretOpen}
                className="coffret-photo coffret-photo--open"
                alt={`The ${BRAND} coffret, open on black velvet: the leather journal, ${PRODUCT}, its charging cradle and the certificate card`}
              />
              {/* Small screens: numbered markers that match the list below. */}
              {coffretHotspots.map((spot, index) => (
                <span
                  key={spot.id}
                  className="coffret-marker"
                  style={{ left: `${spot.x}%`, top: `${spot.y}%` }}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
              ))}
            </div>
            <span className="coffret-bloom" aria-hidden="true" />
          </div>

          <svg
            className="coffret-leaders"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
            focusable="false"
          >
            {coffretHotspots.map((spot) => (
              <polyline
                key={spot.id}
                className="coffret-leader"
                data-spot={spot.id}
                points={leaderPoints(spot)}
              />
            ))}
          </svg>

          <ol className="coffret-hotspots" aria-label="In the coffret">
            {coffretHotspots.map((spot, index) => (
              <li
                key={spot.id}
                className={`coffret-hotspot coffret-hotspot--${spot.side}`}
                data-spot={spot.id}
                style={
                  {
                    "--x": `${spot.x}%`,
                    "--y": `${spot.y}%`,
                    "--label-y": `${spot.labelY}%`,
                    "--label-gap": `${LABEL_GAP}%`,
                  } as CSSProperties
                }
              >
                <button
                  type="button"
                  className="coffret-dot"
                  aria-describedby={`coffret-${spot.id}-line`}
                  aria-pressed="false"
                  data-spot={spot.id}
                >
                  <span className="coffret-dot-number" aria-hidden="true">
                    {index + 1}
                  </span>
                  <span className="sr-only">Look closer: {spot.title}</span>
                </button>
                <div className="coffret-label">
                  <span className="display coffret-label-title" aria-hidden="true">
                    {spot.title}
                  </span>
                  <p className="coffret-label-line" id={`coffret-${spot.id}-line`}>
                    {spot.line}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function Journal() {
  return (
    <div className="journal">
      <figure className="journal-figure">
        <span className="journal-shadow" aria-hidden="true" />
        <div className="journal-closed">
          <div className="journal-float">
            <Picture
              image={images.diaryClosed}
              className="journal-image"
              alt={`The ${journal.title}, closed: black stitched leather with a blind-embossed crest, gilt page edges and a gold silk ribbon`}
            />
          </div>
        </div>
        <div className="journal-open">
          <Picture
            image={images.diaryOpenBlank}
            className="journal-image journal-page"
            alt={`The ${journal.title}, open on dotted ivory pages, a few lines of handwriting on the left page`}
          />
          {journalLines.lines.map((line, index) => (
            <img
              key={index}
              className="journal-image journal-line"
              src={images.diaryOpen.webp}
              width={images.diaryOpen.width}
              height={images.diaryOpen.height}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              style={lineStyle(line)}
            />
          ))}
        </div>
      </figure>
      <div className="journal-copy">
        <p className="eyebrow">{journal.opener}</p>
        <h3 className="display journal-title">{journal.title}</h3>
        <p className="journal-body">{journal.body}</p>
      </div>
    </div>
  );
}

function Certificate() {
  return (
    <div className="certificate-block">
      <div className="certificate-copy">
        <span className="numeral">IV.</span>
        <h3 className="display">The certificate</h3>
        <p>Signed and numbered by the atelier. One for every pen, and never reissued.</p>
      </div>
      <div className="certificate">
        <Crest className="certificate-crest" />
        <p className="label certificate-label">{certificate.label}</p>
        <p className="display certificate-model">{PRODUCT}</p>
        <p className="certificate-signature">
          <span className="sr-only">Signed, {certificate.signature}</span>
          <InkWord data={scriptAtelier} className="certificate-ink" />
        </p>
        <span className="certificate-rule" aria-hidden="true" />
        <p className="certificate-number">{certificate.number}</p>
      </div>
    </div>
  );
}

export function Coffret() {
  return (
    <section
      className="coffret section--ivory"
      id="coffret"
      data-header="light"
      aria-labelledby="coffret-title"
    >
      <header className="coffret-header">
        <Opener index={chapterNumber.coffret}>The coffret</Opener>
        <h2 id="coffret-title" className="display coffret-title" data-reveal="lines">
          <MaskedLines lines={["Presented in a lacquered coffret."]} />
        </h2>
        <span className="coffret-title-rule" aria-hidden="true" />
      </header>

      <Stage />
      <Journal />

      <ol className="coffret-list" aria-label="Contents of the coffret">
        {coffretContents.map((item, index) => (
          <li className="coffret-item" key={item.title}>
            <span className="numeral">{ROMAN[index]}.</span>
            <div>
              <h3 className="display coffret-item-title">{item.title}</h3>
              <p>{item.text}</p>
            </div>
          </li>
        ))}
      </ol>

      <Certificate />
    </section>
  );
}
