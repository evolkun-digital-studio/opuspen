import { useId, useState } from "react";
import { PRODUCT, ROMAN, chapterNumber, images, specificationGroups } from "./content";
import { MaskedLines } from "./masked-lines";
import { Opener } from "./opener";
import { Picture } from "./picture";

type Row = (typeof specificationGroups)[number]["rows"][number];

function SheetRow({ row, open, onToggle }: { row: Row; open: boolean; onToggle: () => void }) {
  const id = useId();
  return (
    <div className="sheet-row" data-open={open}>
      <h4 className="sheet-row-heading">
        <button
          type="button"
          className="sheet-trigger"
          id={`${id}-trigger`}
          aria-expanded={open}
          aria-controls={`${id}-panel`}
          onClick={onToggle}
        >
          <span className="label sheet-label">{row.label}</span>
          <span className="sheet-value">{row.value}</span>
          <span className="sheet-icon" aria-hidden="true" />
        </button>
      </h4>
      {/* Height animates via grid-template-rows 0fr → 1fr; see .sheet-panel */}
      <div
        className="sheet-panel"
        id={`${id}-panel`}
        role="region"
        aria-labelledby={`${id}-trigger`}
      >
        <div className="sheet-panel-inner">
          <p>{row.detail}</p>
        </div>
      </div>
    </div>
  );
}

export function Specifications() {
  const [openRows, setOpenRows] = useState<ReadonlySet<string>>(() => new Set());
  const toggle = (key: string) =>
    setOpenRows((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  return (
    <section
      className="specifications section--ivory"
      id="specifications"
      data-header="light"
      aria-labelledby="spec-title"
    >
      <header className="section-header">
        <Opener index={chapterNumber.specifications}>Technical sheet</Opener>
        <h2 id="spec-title" className="display section-title" data-reveal="lines">
          <MaskedLines lines={[PRODUCT]} />
        </h2>
      </header>

      <div className="spec-stage">
        <Picture
          image={images.vertical}
          className="spec-pen"
          alt={`${PRODUCT} standing upright, nib raised`}
        />
        <p className="spec-callout spec-callout--nib" aria-hidden="true">
          <span className="label">Nib</span>
          <span className="spec-callout-value">Polished by hand</span>
        </p>
        <p className="spec-callout spec-callout--cap" aria-hidden="true">
          <span className="label">Cap</span>
          <span className="spec-callout-value">Fluted, flush-fit</span>
        </p>
      </div>

      <div className="sheet">
        {specificationGroups.map((group, groupIndex) => (
          <section className="sheet-group" key={group.title} aria-label={group.title}>
            <h3 className="sheet-group-title">
              <span className="numeral">{ROMAN[groupIndex]}</span>
              <span className="label">{group.title}</span>
            </h3>
            {group.rows.map((row) => {
              const key = `${group.title}-${row.label}`;
              return (
                <SheetRow
                  key={key}
                  row={row}
                  open={openRows.has(key)}
                  onToggle={() => toggle(key)}
                />
              );
            })}
          </section>
        ))}
      </div>

      <p className="section-note">Precision in the hand. Possibility on the page.</p>
    </section>
  );
}
