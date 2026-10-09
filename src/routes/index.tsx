import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useRef, useState } from "react";
import { Atelier } from "@/components/product/atelier";
import { Boutique } from "@/components/product/boutique";
import { Coffret } from "@/components/product/coffret";
import { Collection } from "@/components/product/collection";
import { BRAND, PRICE, PRODUCT, colorways, images } from "@/components/product/content";
import { Craft } from "@/components/product/craft";
import { Footer } from "@/components/product/footer";
import { Hero } from "@/components/product/hero";
import { Manifesto } from "@/components/product/manifesto";
import { Nav } from "@/components/product/nav";
import { Overture } from "@/components/product/overture";
import { PaperStory } from "@/components/product/paper-story";
import { Preloader } from "@/components/product/preloader";
import { useProductMotion } from "@/components/product/use-product-motion";

const title = `${PRODUCT} — The art of the written thought`;
const description = `${PRODUCT}: a fountain pen machined from a single block of aluminium and finished by hand, with a quiet intelligence that remembers every line you write. Presented in a lacquered coffret.`;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      {
        property: "og:description",
        content: "Some objects are made to be used. A few are made to be kept — and passed on.",
      },
      { property: "og:type", content: "product" },
      { property: "og:site_name", content: BRAND },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "theme-color", content: "#0B0B0C" },
      {
        "script:ld+json": {
          "@context": "https://schema.org",
          "@type": "Product",
          name: PRODUCT,
          brand: { "@type": "Brand", name: BRAND },
          description,
          material: "Aluminium, steel",
          color: colorways.map((colorway) => colorway.name).join(", "),
          offers: {
            "@type": "Offer",
            price: PRICE.amount,
            priceCurrency: PRICE.currency,
            availability: "https://schema.org/PreOrder",
          },
        },
      },
    ],
    // The hero's LCP image: fetch it before the stylesheet and scripts settle.
    links: [
      {
        rel: "preload",
        as: "image",
        type: "image/webp",
        href: images.penUncapped.webp,
        fetchPriority: "high",
      },
    ],
  }),
  component: ProductPage,
});

function ProductPage() {
  const root = useRef<HTMLDivElement>(null);
  const [craftStep, setCraftStep] = useState(0);
  const [paperStep, setPaperStep] = useState(0);
  const [colorIndex, setColorIndex] = useState(0);
  const [reservationOpen, setReservationOpen] = useState(false);
  const [reservationColor, setReservationColor] = useState(0);
  useProductMotion(root, setCraftStep, setPaperStep, setColorIndex);

  const openReservation = useCallback(
    (color = colorIndex) => {
      setReservationColor(color);
      setReservationOpen(true);
    },
    [colorIndex],
  );
  const closeReservation = useCallback(() => setReservationOpen(false), []);

  return (
    <div className="page" ref={root}>
      <a className="skip-link" href="#overture">
        Skip to content
      </a>
      <Preloader />
      <Nav onReserve={() => openReservation()} />
      <main>
        <Hero onReserve={() => openReservation()} />
        <Overture />
        <Craft step={craftStep} />
        <Manifesto />
        <PaperStory step={paperStep} onStep={setPaperStep} />
        <Collection
          index={colorIndex}
          onSelect={setColorIndex}
          onReserve={() => openReservation(colorIndex)}
        />
        <Coffret />
        <Atelier />
      </main>
      <Footer onReserve={() => openReservation()} />
      <Boutique
        open={reservationOpen}
        colorIndex={reservationColor}
        onColorChange={setReservationColor}
        onClose={closeReservation}
      />
    </div>
  );
}
