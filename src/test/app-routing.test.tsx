import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";
import { Route as IndexRoute } from "@/routes/index";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });

    const matches = router.matchRoutes("/");

    expect(matches.at(-1)?.routeId).not.toBe(rootRouteId);
  });
});

// Render the index route's component directly, outside the router shell.
describe("Product page", () => {
  const renderPage = () => {
    const Page = IndexRoute.options.component;
    if (!Page) throw new Error("The index route has no component");
    return render(<Page />);
  };

  it("leads with the hero headline", () => {
    renderPage();

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Opus — The art of the written thought.",
      }),
    ).toBeInTheDocument();
  });

  it("signs the hero with a decorative signature, the name carried by the heading", () => {
    const { container } = renderPage();

    const heading = screen.getByRole("heading", { level: 1 });
    expect(heading).toHaveAccessibleName("Opus — The art of the written thought.");
    // The drawn signature is decoration: hidden from assistive tech, no text of its own.
    const signature = container.querySelector("section.hero svg.hero-signature");
    expect(signature).toHaveAttribute("aria-hidden", "true");
    expect(signature?.textContent).toBe("");
    expect(container.querySelector(".hero-eyebrow, .hero-rule")).toBeNull();
  });

  it("has no cap and no watermark in the hero", () => {
    const { container } = renderPage();
    const hero = container.querySelector<HTMLElement>("section.hero");
    if (!hero) throw new Error("Hero is missing");

    expect(hero.querySelector(".hero-cap, .hero-watermark")).toBeNull();
    expect(hero.querySelectorAll("img")).toHaveLength(1);
  });

  it("offers one quiet link and one primary action in the hero", () => {
    const { container } = renderPage();
    const hero = container.querySelector<HTMLElement>("section.hero");
    if (!hero) throw new Error("Hero is missing");

    expect(within(hero).getByRole("link", { name: "Discover" })).toHaveAttribute(
      "href",
      "#overture",
    );
    expect(within(hero).getByRole("button", { name: "Reserve yours" })).toBeInTheDocument();
  });

  it("presents each chapter of the page in order", () => {
    renderPage();

    const headings = screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent);
    const expected = [
      /^Some objects are made to be used/,
      /^The craft$/,
      /a deeper connection with ideas/,
      /^The page is only the beginning$/,
      /^The collection$/,
      /^Presented in a lacquered coffret\.$/,
      /^Considered, down to the detail\.$/,
    ];
    let cursor = 0;
    for (const pattern of expected) {
      const index = headings.findIndex(
        (text, i) => i >= cursor && pattern.test(text?.trim() ?? ""),
      );
      expect(index, `heading ${pattern}`).toBeGreaterThanOrEqual(cursor);
      cursor = index + 1;
    }
  });

  it("has no technical sheet any more, and numbers its chapters without a gap", () => {
    const { container } = renderPage();

    expect(container.querySelector("#specifications")).toBeNull();
    expect(container.textContent).not.toContain("Technical sheet");
    const numerals = Array.from(container.querySelectorAll(".opener-numeral")).map(
      (numeral) => numeral.textContent,
    );
    expect(numerals).toEqual(["I", "II", "III", "IV", "V", "VI"]);
  });

  it("leads the navigation with the craft", () => {
    const { container } = renderPage();
    const main = within(container.querySelector<HTMLElement>(".nav-links") ?? container);

    expect(main.getAllByRole("link")[0]).toHaveTextContent("The craft");
    expect(main.getAllByRole("link")[0]).toHaveAttribute("href", "#craft");
  });

  it("points out the coffret's contents with keyboard-reachable hotspots", () => {
    renderPage();

    const hotspots = screen.getByRole("list", { name: "In the coffret" });
    const buttons = within(hotspots).getAllByRole("button");
    expect(buttons).toHaveLength(4);
    for (const name of [/Opus Journal/, /Charging cradle/, /The pen/, /Certificate/]) {
      expect(within(hotspots).getByRole("button", { name })).toHaveAttribute(
        "aria-pressed",
        "false",
      );
    }
    const journal = document.querySelector<HTMLElement>(".journal");
    if (!journal) throw new Error("The journal block is missing");
    expect(
      within(journal).getByRole("heading", { level: 3, name: "The Opus Journal" }),
    ).toBeInTheDocument();
  });

  it("signs the certificate with the atelier's name, for assistive tech too", () => {
    const { container } = renderPage();
    const card = container.querySelector<HTMLElement>(".certificate");
    if (!card) throw new Error("Certificate is missing");

    expect(within(card).getByText("Signed, Atelier Opus")).toBeInTheDocument();
    expect(card.querySelector("svg.certificate-ink")).toHaveAttribute("aria-hidden", "true");
    expect(card).toHaveTextContent("No. 0001 / 1000");
  });

  it("speaks as Opus, with no placeholder or old name left", () => {
    const { container } = renderPage();

    expect(container.querySelector(".nav > .nav-wordmark")?.textContent).toBe("Opus");
    expect(container.textContent).not.toContain("[BRAND]");
    expect(container.textContent).not.toMatch(/NÓTA|Opus Opus/i);
  });

  it("keeps the reservation a clearly labelled preview with no payment", () => {
    const { container } = renderPage();
    const panel = container.querySelector<HTMLElement>("dialog.boutique");
    if (!panel) throw new Error("Reservation panel is missing");

    expect(within(panel).getByText("Preview")).toBeInTheDocument();
    expect(within(panel).getByText(/no payment is taken/)).toBeInTheDocument();
    expect(within(panel).getByText("€ 300")).toBeInTheDocument();
  });

  it("previews the engraving in Roman or Script letters", () => {
    const { container } = renderPage();
    // The panel is a closed <dialog>, so its contents are hidden until opened.
    const panel = container.querySelector<HTMLElement>("dialog.boutique");
    if (!panel) throw new Error("Reservation panel is missing");
    const styles = within(panel).getByRole("group", { name: "Engraving style", hidden: true });
    const roman = within(styles).getByRole("button", { name: "Roman", hidden: true });
    const script = within(styles).getByRole("button", { name: "Script", hidden: true });

    expect(roman).toHaveAttribute("aria-pressed", "true");
    fireEvent.change(within(panel).getByPlaceholderText("Your initials"), {
      target: { value: "amv" },
    });
    fireEvent.click(script);

    expect(script).toHaveAttribute("aria-pressed", "true");
    expect(roman).toHaveAttribute("aria-pressed", "false");
    expect(panel.querySelector(".cap-initials")).toHaveClass("cap-initials--script");
    expect(
      within(panel).getByRole("img", {
        name: "Cap engraved with AMV, in script letters",
        hidden: true,
      }),
    ).toBeInTheDocument();
  });

  it("lists the four colorways as swatches", () => {
    renderPage();

    const collection = screen.getByRole("region", { name: "The collection" });
    for (const name of ["Obsidian", "Midnight Sapphire", "Bordeaux", "Cognac"]) {
      expect(within(collection).getByRole("button", { name })).toBeInTheDocument();
    }
  });
});
