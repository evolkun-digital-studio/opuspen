import { useState, type CSSProperties } from "react";
import { BRAND, PRICE, PRODUCT, menuNav, primaryNav } from "./content";
import { useDialog } from "./use-dialog";

/** Two lines that cross into an X inside the open menu. */
function MenuIcon() {
  return (
    <span className="nav-burger" aria-hidden="true">
      <span />
      <span />
    </span>
  );
}

/** Opens the reservation preview; below 960px the product name is read but not shown. */
function OrderButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="nav-order" onClick={onClick}>
      <span>
        Order<span className="nav-order-product"> {PRODUCT}</span>
      </span>
      <span className="nav-order-dot" aria-hidden="true">
        •
      </span>
      <span>{PRICE.label}</span>
    </button>
  );
}

export function Nav({ onReserve }: { onReserve: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menu = useDialog(menuOpen);
  const closeMenu = () => setMenuOpen(false);

  return (
    <>
      {/* The motion hook owns visibility (data-hidden, inert) and tone (.nav--dark). */}
      <header className="nav">
        <a href="#top" className="nav-wordmark" aria-label={`${BRAND}, back to top`}>
          {BRAND}
        </a>

        <nav className="nav-links" aria-label="Main">
          <ul>
            {primaryNav.map((item) => (
              <li key={item.href}>
                <a className="nav-link" href={item.href}>
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="nav-pill">
          <button
            type="button"
            className="nav-icon-button"
            aria-label="Open menu"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen(true)}
          >
            <MenuIcon />
          </button>
          <OrderButton onClick={onReserve} />
        </div>
      </header>

      <dialog ref={menu} className="menu" aria-label="Menu" data-lenis-prevent onClose={closeMenu}>
        {/* Mirrors the header row, so the menu icon appears to turn into the close X. */}
        <div className="menu-top">
          <a href="#top" className="nav-wordmark" onClick={closeMenu}>
            {BRAND}
          </a>
          <div className="nav-pill">
            <button
              type="button"
              className="nav-icon-button"
              aria-label="Close menu"
              onClick={closeMenu}
            >
              <MenuIcon />
            </button>
            <OrderButton
              onClick={() => {
                closeMenu();
                onReserve();
              }}
            />
          </div>
        </div>
        <nav aria-label="Menu">
          <ul className="menu-list">
            {menuNav.map((item, index) => (
              <li key={item.href} style={{ "--i": index } as CSSProperties}>
                <a className="menu-link" href={item.href} onClick={closeMenu}>
                  <span className="line-mask">
                    <span>{item.label}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </dialog>
    </>
  );
}
