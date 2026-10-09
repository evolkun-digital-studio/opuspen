import { BRAND, audiences, chapterNumber, manifesto } from "./content";
import { Opener } from "./opener";

const words = (text: string, key: boolean) => text.split(" ").map((word) => ({ word, key }));

const statement = [
  ...words(manifesto.before, false),
  ...words(manifesto.key, true),
  ...words(manifesto.after, false),
];

export function Manifesto() {
  return (
    <section
      className="manifesto section--dark"
      id="maison"
      data-header="dark"
      aria-labelledby="manifesto-title"
    >
      <header className="section-header">
        <Opener index={chapterNumber.maison}>The Maison</Opener>
      </header>

      <h2 className="display manifesto-statement" id="manifesto-title">
        {statement.map(({ word, key }, index) => (
          <span key={index}>
            <span className={key ? "manifesto-word is-key" : "manifesto-word"}>{word}</span>{" "}
          </span>
        ))}
      </h2>

      <div className="manifesto-lower">
        <div className="manifesto-copy">
          <p>
            Before an idea becomes something, it begins as a thought. A line on paper. A moment of
            clarity.
          </p>
          <p>
            {BRAND} leaves that moment untouched, and keeps it faithfully for the years that follow.
          </p>
        </div>

        <div className="audience" id="audience">
          <h3 className="label audience-title">For those who think in ink</h3>
          <ul className="audience-list">
            {audiences.map((audience) => (
              <li className="audience-row" key={audience.title}>
                <span className="display audience-name">{audience.title}</span>
                <span className="audience-line">{audience.line}</span>
                <span className="audience-arrow" aria-hidden="true">
                  →
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
