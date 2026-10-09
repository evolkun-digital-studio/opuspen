import type { ReactNode } from "react";
import { ROMAN } from "./content";

type OpenerProps = {
  /** Position of the chapter on the page (see chapterNumber in content.ts). */
  index: number;
  children: ReactNode;
  /** The label is the section's heading in some chapters, a kicker in others. */
  as?: "p" | "h2";
  id?: string;
};

/** A section's first line: a small gold roman numeral, then the small-caps label. */
export function Opener({ index, children, as: Tag = "p", id }: OpenerProps) {
  return (
    <div className="opener">
      <span className="numeral opener-numeral" aria-hidden="true">
        {ROMAN[index]}
      </span>
      <Tag className="eyebrow" id={id}>
        {children}
      </Tag>
    </div>
  );
}
