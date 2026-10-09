import { useId, useState } from "react";
import { BRAND, PRICE, PRODUCT, colorways } from "./content";
import { Swatches } from "./swatches";
import { useDialog } from "./use-dialog";

type BoutiqueProps = {
  open: boolean;
  colorIndex: number;
  onColorChange: (index: number) => void;
  onClose: () => void;
};

/** Capitals only, at most three letters, optionally separated by periods or spaces. */
const toInitials = (value: string) => {
  let letters = 0;
  return Array.from(value.toUpperCase().replace(/[^\p{L}. ]/gu, ""))
    .filter((char) => !/\p{L}/u.test(char) || ++letters <= 3)
    .join("")
    .slice(0, 6);
};

type EngravingStyle = "roman" | "script";

const engravingStyles: { id: EngravingStyle; label: string }[] = [
  { id: "roman", label: "Roman" },
  { id: "script", label: "Script" },
];

/** The fluted cap in profile, lacquered in the chosen colorway, with engraved initials. */
function CapPreview({
  colorway,
  initials,
  style,
}: {
  colorway: string;
  initials: string;
  style: EngravingStyle;
}) {
  return (
    <svg
      className="cap-preview"
      data-colorway={colorway}
      viewBox="0 0 480 140"
      role="img"
      aria-label={
        initials ? `Cap engraved with ${initials}, in ${style} letters` : "Cap, without engraving"
      }
    >
      <defs>
        <linearGradient id="cap-script-gold" x1="0" y1="0" x2="1" y2=".2">
          <stop offset="0" stopColor="#8a6a2f" />
          <stop offset=".35" stopColor="#d9c49a" />
          <stop offset=".5" stopColor="#f5e6c4" />
          <stop offset=".7" stopColor="#b8975a" />
          <stop offset="1" stopColor="#7a6232" />
        </linearGradient>
        <linearGradient id="cap-lacquer" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" className="cap-stop-light" />
          <stop offset=".45" className="cap-stop-mid" />
          <stop offset="1" className="cap-stop-dark" />
        </linearGradient>
      </defs>
      <rect className="cap-body" x="40" y="44" width="400" height="64" rx="3" />
      <g className="cap-flutes">
        {Array.from({ length: 7 }, (_, i) => (
          <path key={i} d={`M196 ${52 + i * 8}H436`} />
        ))}
      </g>
      <rect className="cap-band" x="40" y="44" width="148" height="64" rx="3" />
      <path className="cap-clip" d="M230 38H414C421 38 426 40 428 44" />
      <path className="cap-ring" d="M190 44V108" />
      <text
        className={`cap-initials cap-initials--${style}`}
        x="114"
        y={style === "script" ? 92 : 88}
        textAnchor="middle"
      >
        {initials}
      </text>
    </svg>
  );
}

export function Boutique({ open, colorIndex, onColorChange, onClose }: BoutiqueProps) {
  const dialog = useDialog(open);
  const [initials, setInitials] = useState("");
  const [engraving, setEngraving] = useState<EngravingStyle>("roman");
  const inputId = useId();
  const colorway = colorways[colorIndex] ?? colorways[0];

  return (
    <dialog
      ref={dialog}
      className="boutique"
      aria-labelledby="boutique-title"
      data-lenis-prevent
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="boutique-panel">
        <div className="boutique-top">
          <span className="label boutique-badge">Preview</span>
          <button
            type="button"
            className="icon-button"
            aria-label="Close reservation preview"
            onClick={onClose}
          >
            <span className="icon-close" aria-hidden="true" />
          </button>
        </div>

        <p className="eyebrow">{BRAND}</p>
        <h2 className="display boutique-title" id="boutique-title">
          Private reservation
        </h2>

        <div className="boutique-preview">
          <CapPreview colorway={colorway.id} initials={initials.trim()} style={engraving} />
        </div>

        <div className="boutique-field">
          <p className="label">
            {PRODUCT} — <span className="boutique-colorway">{colorway.name}</span>
          </p>
          <Swatches selected={colorIndex} onSelect={onColorChange} label="Choose a colorway" />
        </div>

        <div className="boutique-field">
          <label className="label" htmlFor={inputId}>
            Engraving <span className="boutique-optional">(optional)</span>
          </label>
          <input
            id={inputId}
            className="boutique-input"
            value={initials}
            onChange={(event) => setInitials(toInitials(event.target.value))}
            placeholder="Your initials"
            autoComplete="off"
            maxLength={6}
            aria-describedby={`${inputId}-hint`}
          />
          <p className="boutique-hint" id={`${inputId}-hint`}>
            Up to three letters, engraved by hand on the cap.
          </p>
          <div className="engraving-styles" role="group" aria-label="Engraving style">
            {engravingStyles.map((option) => (
              <button
                type="button"
                key={option.id}
                className={`engraving-style engraving-style--${option.id}`}
                aria-pressed={engraving === option.id}
                onClick={() => setEngraving(option.id)}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <ul className="boutique-services">
          <li>Complimentary engraving &amp; gift wrapping</li>
          <li>Presented in the lacquered coffret</li>
        </ul>

        <div className="boutique-summary">
          <span className="label">{PRODUCT}</span>
          <span className="display boutique-price">{PRICE.label}</span>
        </div>

        <p className="boutique-disclaimer">
          This is a preview of the reservation experience. Reservations are not yet open: nothing is
          sent or stored, and no payment is taken.
        </p>

        <button type="button" className="btn-lux btn-lux--block" onClick={onClose}>
          <span>Keep exploring</span>
        </button>
      </div>
    </dialog>
  );
}
