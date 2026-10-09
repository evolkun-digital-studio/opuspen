import { Fragment } from "react";

/** Lines that rise from behind a mask; the motion hook animates `.line-mask > span`. */
export function MaskedLines({ lines }: { lines: readonly string[] }) {
  return (
    <>
      {lines.map((line, index) => (
        // The space between block-level lines keeps the accessible name readable.
        <Fragment key={line}>
          {index > 0 && " "}
          <span className="line-mask">
            <span>{line}</span>
          </span>
        </Fragment>
      ))}
    </>
  );
}
