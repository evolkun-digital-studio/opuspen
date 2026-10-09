import { ROMAN, chapterNumber, images, paperSteps } from "./content";
import { Opener } from "./opener";
import { Picture } from "./picture";
import { Script } from "./script";

const stateOf = (index: number, step: number) => (index === step ? "is-active" : undefined);

/** The heading with its key word handwritten; the word writes in as the step activates. */
function Heading({ text, word }: { text: string; word: string }) {
  const at = text.indexOf(word);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <Script>{word}</Script>
      {text.slice(at + word.length)}
    </>
  );
}

/**
 * Four steps over one photograph, each framed on a different detail. On
 * desktop the section is pinned and scroll drives the step; the roman
 * numerals stay usable everywhere.
 */
export function PaperStory({ step, onStep }: { step: number; onStep: (step: number) => void }) {
  const active = paperSteps[step] ?? paperSteps[0];

  return (
    <section
      className="paper section--dark"
      id="paper"
      data-header="dark"
      aria-labelledby="paper-title"
    >
      <header className="section-header paper-header">
        <Opener index={chapterNumber.paper}>Smart paper</Opener>
        <h2 className="sr-only" id="paper-title">
          The page is only the beginning
        </h2>
        <div className="paper-headings" aria-hidden="true">
          {paperSteps.map((item, index) => (
            <p className={`display paper-heading ${stateOf(index, step) ?? ""}`} key={item.heading}>
              <Heading text={item.heading} word={item.script} />
            </p>
          ))}
        </div>
      </header>

      <div className="paper-stage">
        <div className="paper-frames frame" data-reveal="image">
          {paperSteps.map((item, index) => (
            <div
              className={`paper-frame frame-media ${stateOf(index, step) ?? ""}`}
              key={item.heading}
            >
              <Picture
                image={images.paper}
                alt={
                  index === 0
                    ? "An open notebook of handwritten notes beside the same notes on a phone"
                    : ""
                }
                className="paper-image"
                style={{ objectPosition: item.focus }}
              />
            </div>
          ))}
        </div>

        <article className="paper-panel" aria-live="polite">
          <span className="numeral">{ROMAN[step]}</span>
          <h3 className="display paper-panel-title">{active.title}</h3>
          <p>{active.text}</p>
        </article>
      </div>

      <div className="paper-controls">
        <div className="paper-steps" role="group" aria-label="Smart paper story">
          {paperSteps.map((item, index) => (
            <button
              type="button"
              key={item.heading}
              className="paper-step"
              aria-label={`Step ${ROMAN[index]}: ${item.heading}`}
              aria-pressed={step === index}
              onClick={() => onStep(index)}
            >
              <span className="paper-step-line" aria-hidden="true" />
              <span className="numeral">{ROMAN[index]}</span>
            </button>
          ))}
        </div>
        <p className="label paper-motto">Analog by nature. Digital by design.</p>
      </div>
    </section>
  );
}
