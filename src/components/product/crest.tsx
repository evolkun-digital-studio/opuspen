/**
 * The Maison crest, as embossed on the journal and the coffret lid: a concave
 * four-point star centred in three concentric rings (thin, medium, thin).
 * Stroke only, in currentColor. Every stroke has pathLength 1 so the
 * preloader can draw it with stroke-dashoffset.
 */
export function Crest({ className }: { className?: string }) {
  return (
    <svg
      className={`crest ${className ?? ""}`}
      viewBox="0 0 64 64"
      aria-hidden="true"
      focusable="false"
    >
      <circle cx="32" cy="32" r="30" pathLength="1" />
      <circle className="crest-ring--medium" cx="32" cy="32" r="26.2" pathLength="1" />
      <circle cx="32" cy="32" r="22.6" pathLength="1" />
      {/* Tips on a 13.5 radius; each side bows in towards the centre. */}
      <path
        d="M32 18.5Q34.6 29.4 45.5 32Q34.6 34.6 32 45.5Q29.4 34.6 18.5 32Q29.4 29.4 32 18.5Z"
        pathLength="1"
      />
    </svg>
  );
}
