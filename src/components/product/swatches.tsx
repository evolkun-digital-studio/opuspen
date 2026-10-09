import { colorways } from "./content";

type SwatchesProps = {
  selected: number;
  onSelect: (index: number) => void;
  label?: string;
};

/** Gold-ringed material swatches; each is a 48px toggle button. */
export function Swatches({ selected, onSelect, label = "Colorway" }: SwatchesProps) {
  return (
    <div className="swatches" role="group" aria-label={label}>
      {colorways.map((colorway, index) => (
        <button
          type="button"
          key={colorway.id}
          className="swatch"
          aria-label={colorway.name}
          title={colorway.name}
          aria-pressed={selected === index}
          onClick={() => onSelect(index)}
        >
          <span className="swatch-dot" data-colorway={colorway.id} />
        </button>
      ))}
    </div>
  );
}
