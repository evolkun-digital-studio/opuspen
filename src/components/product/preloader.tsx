import { BRAND } from "./content";
import { Crest } from "./crest";

/**
 * Ink screen with a faint guilloché. A gold drop swells at the centre and
 * stretches into a hairline; the crest draws itself above it, the wordmark
 * rises, the house line settles below. Then the line opens into an aperture:
 * the two ink panels part, up and down, carrying their halves of the mark.
 * The motion hook plays it once per session; a CSS failsafe removes the
 * panel if scripts never run.
 */
export function Preloader() {
  return (
    <div className="preloader" aria-hidden="true">
      <div className="preloader-panel preloader-panel--top">
        <div className="preloader-guilloche" />
        <div className="preloader-upper">
          <Crest className="preloader-crest" />
          <span className="preloader-wordmark-mask">
            <span className="preloader-wordmark">{BRAND}</span>
          </span>
        </div>
      </div>
      <div className="preloader-panel preloader-panel--bottom">
        <div className="preloader-guilloche" />
        <p className="preloader-tagline">Maison d’écriture</p>
      </div>
      <span className="preloader-line" />
    </div>
  );
}
