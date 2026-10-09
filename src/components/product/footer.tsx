import { useId, useState, type FormEvent } from "react";
import { BRAND, footerColumns, footerSignoff, locales, socials } from "./content";
import { Crest } from "./crest";
import { Script } from "./script";

export function Footer({ onReserve }: { onReserve: () => void }) {
  const [subscribed, setSubscribed] = useState(false);
  const emailId = useId();
  const localeId = useId();

  const subscribe = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubscribed(true);
  };

  return (
    <footer className="footer section--dark" data-header="dark" aria-labelledby="footer-title">
      <div className="footer-brand">
        <Crest className="footer-crest" />
        <p className="wordmark footer-wordmark" id="footer-title">
          {BRAND}
        </p>
        <p className="display footer-signoff">
          {footerSignoff.before}
          <Script write="play">{footerSignoff.script}</Script>
          {footerSignoff.after}
        </p>
      </div>

      <form className="newsletter" onSubmit={subscribe}>
        <label className="label" htmlFor={emailId}>
          Receive news from the Maison
        </label>
        <div className="newsletter-field">
          <input
            id={emailId}
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="Your email address"
            className="newsletter-input"
          />
          <button type="submit" className="newsletter-submit">
            Subscribe
          </button>
        </div>
        <p className="newsletter-status" aria-live="polite">
          {subscribed
            ? "Thank you. The newsletter opens soon; this preview did not store your address."
            : ""}
        </p>
      </form>

      <span className="hairline" aria-hidden="true" />

      <div className="footer-columns">
        {footerColumns.map((column) => (
          <nav className="footer-column" key={column.id} id={column.id} aria-label={column.title}>
            <h2 className="label footer-column-title">{column.title}</h2>
            <ul>
              {column.links.map((link) => (
                <li key={link.label}>
                  {link.href ? (
                    <a className="footer-link" href={link.href}>
                      {link.label}
                    </a>
                  ) : link.action === "reserve" ? (
                    <button type="button" className="footer-link" onClick={onReserve}>
                      {link.label}
                    </button>
                  ) : (
                    <span className="footer-text">{link.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </div>

      <div className="footer-meta">
        <div className="footer-locale">
          <label className="label" htmlFor={localeId}>
            Country / language
          </label>
          <select id={localeId} className="footer-select" defaultValue={locales[0]}>
            {locales.map((locale) => (
              <option key={locale}>{locale}</option>
            ))}
          </select>
        </div>
        <ul className="footer-socials" aria-label="Social">
          {socials.map((social) => (
            <li key={social.label}>
              <a className="footer-link" href={social.href} target="_blank" rel="noreferrer">
                {social.label}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <span className="hairline" aria-hidden="true" />

      <div className="footer-bottom">
        <span>© 2026 {BRAND}</span>
        <span>Made to be kept, and passed on.</span>
        <a className="footer-link" href="#top">
          Back to top
        </a>
      </div>

      {/* Cropped by the bottom edge, like a name stamped into the page. */}
      <p className="footer-watermark" aria-hidden="true">
        {BRAND}
      </p>
    </footer>
  );
}
