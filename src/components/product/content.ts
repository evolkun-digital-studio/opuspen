import penUncappedWebp from "@/assets/pen-uncapped.webp";
import coffretClosedWebp from "@/assets/coffret-closed.webp";
import coffretOpenWebp from "@/assets/coffret-open.webp";
import diaryClosedWebp from "@/assets/diary-closed.webp";
import diaryOpenWebp from "@/assets/diary-open.webp";
import diaryOpenBlankWebp from "@/assets/diary-open-blank.webp";
import bodyAvif from "@/assets/craft-body.avif";
import bodyWebp from "@/assets/craft-body.webp";
import detailAvif from "@/assets/pen-detail.avif";
import detailWebp from "@/assets/pen-detail.webp";
import paperAvif from "@/assets/smart-paper.avif";
import paperWebp from "@/assets/smart-paper.webp";
import nibAvif from "@/assets/atelier-nib.avif";
import nibWebp from "@/assets/atelier-nib.webp";
import clipAvif from "@/assets/atelier-clip.avif";
import clipWebp from "@/assets/atelier-clip.webp";
import engravingAvif from "@/assets/atelier-engraving.avif";
import engravingWebp from "@/assets/atelier-engraving.webp";
import handsAvif from "@/assets/atelier-hands.avif";
import handsWebp from "@/assets/atelier-hands.webp";
import penObsidian from "@/assets/pen-obsidian.png";
import penSapphire from "@/assets/pen-sapphire.png";
import penBordeaux from "@/assets/pen-bordeaux.png";
import penCognac from "@/assets/pen-cognac.png";

/* ---------------------------------------------------------------------------
 * Brand
 * The Maison is Opus; its first instrument is Opus No. 1. Every heading,
 * label and alt text reads these.
 * ------------------------------------------------------------------------- */
export const BRAND = "Opus";
export const MODEL = "No. 1";
export const PRODUCT = `${BRAND} ${MODEL}`;
export const PRICE = { amount: 300, currency: "EUR", label: "€ 300" } as const;
export const ROMAN = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"] as const;

/* ---------------------------------------------------------------------------
 * Images — AVIF with a WebP fallback where one exists, intrinsic sizes for
 * layout stability.
 * ------------------------------------------------------------------------- */
export type ResponsiveImage = { avif?: string; webp: string; width: number; height: number };
const image = (avif: string, webp: string, width: number, height: number): ResponsiveImage => ({
  avif,
  webp,
  width,
  height,
});

const webp = (src: string, width: number, height: number): ResponsiveImage => ({
  webp: src,
  width,
  height,
});

export const images = {
  // Transparent cutouts. The hero never sets the pen above 1000px wide (the
  // source is 1490px); a larger hero needs a render of 4000px or more.
  penUncapped: webp(penUncappedWebp, 1490, 911),
  diaryClosed: webp(diaryClosedWebp, 1334, 1460),
  diaryOpen: webp(diaryOpenWebp, 1950, 1483),
  // The same photograph with its handwriting lifted (scripts/make-diary-plate.py).
  diaryOpenBlank: webp(diaryOpenBlankWebp, 1950, 1483),
  // Opaque, on studio grey (--studio), shot from two different angles.
  coffretClosed: webp(coffretClosedWebp, 2048, 2048),
  coffretOpen: webp(coffretOpenWebp, 2048, 2048),
  body: image(bodyAvif, bodyWebp, 900, 900),
  nib: image(detailAvif, detailWebp, 1536, 1024),
  paper: image(paperAvif, paperWebp, 1536, 1024),
  atelierNib: image(nibAvif, nibWebp, 768, 1024),
  atelierClip: image(clipAvif, clipWebp, 600, 600),
  atelierEngraving: image(engravingAvif, engravingWebp, 1200, 900),
  atelierHands: image(handsAvif, handsWebp, 1536, 864),
} satisfies Record<string, ResponsiveImage>;

/* ---------------------------------------------------------------------------
 * Navigation
 * ------------------------------------------------------------------------- */
export type NavItem = { label: string; href: string };

export const primaryNav: NavItem[] = [
  { label: "The craft", href: "#craft" },
  { label: "Who it’s for", href: "#audience" },
  { label: "About", href: "#maison" },
  { label: "Inside the box", href: "#coffret" },
];

export const menuNav: NavItem[] = [
  ...primaryNav,
  { label: "The collection", href: "#collection" },
  { label: "Smart paper", href: "#paper" },
];

/* ---------------------------------------------------------------------------
 * Hero — the pen signs the Maison's name. The signature is drawn as SVG
 * paths (script-signature.ts); the h1 carries the name and the line for
 * assistive tech.
 * ------------------------------------------------------------------------- */
export const hero = {
  title: `${BRAND} — The art of the written thought.`,
  lines: ["The art of the", "written thought."],
  caption: "Machined from a single block. Finished by hand.",
} as const;

/* ---------------------------------------------------------------------------
 * Overture
 * ------------------------------------------------------------------------- */
export const overture =
  "Some objects are made to be used. A few are made to be kept — and passed on.";
export const overtureSignoff = "— the Atelier";

/* ---------------------------------------------------------------------------
 * Section openers: a gold numeral beside each chapter's small-caps label.
 * ------------------------------------------------------------------------- */
export const chapterNumber = {
  craft: 0,
  maison: 1,
  paper: 2,
  collection: 3,
  coffret: 4,
  atelier: 5,
} as const;

/* ---------------------------------------------------------------------------
 * Craft — three pinned chapters
 * ------------------------------------------------------------------------- */
export const craftChapters = [
  {
    title: "The nib",
    body: "Shaped, tipped and polished by hand over many hours, until it glides without a whisper. Every nib is tried on paper before it leaves the atelier.",
    image: images.nib,
    focus: "18% 72%",
    alt: "Macro view of the hand-polished steel nib and black grip section",
  },
  {
    title: "The body",
    body: "A single block of aluminium, machined to a fraction of a hair, then brushed by hand along its length. Balanced to rest in the hand as if it always had.",
    image: images.body,
    focus: "50% 50%",
    alt: "The brushed aluminium barrel and fluted cap of Opus No. 1",
  },
  {
    title: "The intelligence",
    body: "A discreet optical system, invisible until you need it. It remembers every line you write, and asks nothing of you in return.",
    image: images.paper,
    focus: "30% 50%",
    alt: "An open notebook of handwritten notes beside the same page on a phone",
    note: "every line, remembered",
  },
] as const;

/* ---------------------------------------------------------------------------
 * Manifesto
 * ------------------------------------------------------------------------- */
export const manifesto = {
  before: "Writing by hand creates focus, presence, and",
  key: "a deeper connection with ideas.",
  after: `${PRODUCT} is built around that simple truth.`,
};

export const audiences = [
  { title: "Scholars", line: "Notes that outlive the lecture." },
  {
    title: "Architects & Designers",
    line: "The first line of every building.",
  },
  { title: "Leaders", line: "Decisions, in your own hand." },
] as const;

/* ---------------------------------------------------------------------------
 * Paper story — four pinned steps over one photograph, framed differently
 * ------------------------------------------------------------------------- */
export const paperSteps = [
  {
    heading: "Paper, quietly intelligent.",
    script: "intelligent",
    title: "An ordinary feel. An extraordinary memory.",
    text: "A pattern finer than a hair rests within every page. You will never notice it. Your pen always will.",
    focus: "50% 50%",
  },
  {
    heading: "Your hand, perfectly remembered.",
    script: "remembered",
    title: "Every line, exactly as written.",
    text: "Margin notes, crossings-out, the small sketch in the corner. Kept as faithfully as ink keeps them.",
    focus: "22% 42%",
  },
  {
    heading: "Nothing between you and the page.",
    script: "page",
    title: "No screens. No new habits.",
    text: "Open the notebook and begin. The intelligence stays out of sight until the moment you need it.",
    focus: "52% 62%",
  },
  {
    heading: "Already there, when you return.",
    script: "return",
    title: "Your pages, wherever you are.",
    text: "Each page finds its way to your phone, searchable and private. A second home for your thoughts.",
    focus: "88% 40%",
  },
] as const;

/* ---------------------------------------------------------------------------
 * Collection — colorways named for precious materials
 * The pen renders are placeholders; replace the PNGs with final renders,
 * nib pointing down, on a transparent background.
 * ------------------------------------------------------------------------- */
export const colorways = [
  { id: "obsidian", name: "Obsidian", line: "Clarity, in silence.", pen: penObsidian },
  { id: "sapphire", name: "Midnight Sapphire", line: "The depth of night.", pen: penSapphire },
  { id: "bordeaux", name: "Bordeaux", line: "A quiet warmth.", pen: penBordeaux },
  { id: "cognac", name: "Cognac", line: "Aged in patience.", pen: penCognac },
] as const;
export const colorwayPen = { width: 126, height: 1479 } as const;

export type Colorway = (typeof colorways)[number];

/* ---------------------------------------------------------------------------
 * Coffret
 * ------------------------------------------------------------------------- */
export const certificate = {
  label: "Certificate of authenticity",
  signature: "Atelier Opus",
  number: "No. 0001 / 1000",
} as const;

export const coffretContents = [
  { title: "The pen", text: `${PRODUCT}, in the colorway of your choosing.` },
  { title: `The ${BRAND} Journal`, text: "Stitched leather, gilt edges, smart paper inside." },
  { title: "Charging cradle", text: "A quiet resting place for the night, by USB-C." },
  {
    title: "Cartridges & certificate",
    text: "Ink for the first pages, and a certificate signed and numbered by the atelier.",
  },
] as const;

/**
 * Hotspots on the open coffret, in % of coffret-open.webp, each checked
 * against the photograph. `side` is where the label sits: its leader runs
 * out to the stage margin on that side, level with `labelY` (% of height).
 */
export const coffretHotspots = [
  {
    id: "journal",
    title: `The ${BRAND} Journal`,
    line: "Bound in leather, its crest pressed blind.",
    x: 41.6,
    y: 55.6,
    side: "left",
    labelY: 46,
  },
  {
    id: "cradle",
    title: "Charging cradle",
    line: "Where the pen rests overnight.",
    x: 57,
    y: 48.5,
    side: "right",
    labelY: 38,
  },
  {
    id: "pen",
    title: "The pen",
    line: "Brushed by hand, nib to the velvet.",
    x: 64,
    y: 62,
    side: "right",
    labelY: 62,
  },
  {
    id: "certificate",
    title: "Certificate",
    line: "Signed and numbered by the atelier.",
    x: 50,
    y: 75,
    side: "left",
    labelY: 76,
  },
] as const;

export type CoffretHotspot = (typeof coffretHotspots)[number];

export const journal = {
  opener: "The journal",
  title: `The ${BRAND} Journal`,
  body: "Black stitched leather, a blind-embossed crest, gilt page edges and a silk ribbon in gold. Inside, 192 pages of smart paper with a pattern only the pen can see.",
} as const;

/**
 * The printed handwriting in diary-open.webp, as measured by
 * scripts/make-diary-plate.py: baselines rise at 19deg; for each line, the
 * band across the baselines and its extent along them, in image pixels.
 */
export const journalLines = {
  width: 1950,
  height: 1483,
  angle: 19,
  lines: [
    { across: [426, 478], along: [21, 516] },
    { across: [478, 520], along: [18, 418] },
    { across: [534, 582], along: [19, 480] },
    { across: [604, 640], along: [17, 251] },
    { across: [660, 738], along: [20, 635] },
  ],
} as const;

/* ---------------------------------------------------------------------------
 * Atelier — editorial gallery. Slots are placeholders for new photography:
 * nib macro, cap clip, engraving, hands writing.
 * ------------------------------------------------------------------------- */
export const atelierImages = [
  {
    slot: "portrait",
    image: images.atelierNib,
    caption: "The nib",
    note: "Polished by hand",
    alt: "Macro of the steel nib, its breather hole catching the light",
    speed: 0.12,
  },
  {
    slot: "landscape",
    image: images.atelierHands,
    caption: "The first page",
    note: "Ink on smart paper",
    alt: "The pen resting on an open notebook of handwritten notes and sketches",
    speed: -0.06,
  },
  {
    slot: "square",
    image: images.atelierClip,
    caption: "Cap and clip",
    note: "Cut, never moulded",
    alt: "The fluted aluminium cap and its slender clip",
    speed: 0.18,
  },
  {
    slot: "engraving",
    image: images.atelierEngraving,
    caption: "Engraving",
    note: "Your initials, by hand",
    alt: "Initials hand-engraved in italic capitals on brushed metal",
    speed: 0.04,
  },
] as const;

/* ---------------------------------------------------------------------------
 * Footer
 * `href` links in-page; `action: "reserve"` opens the reservation preview;
 * neither means the page does not exist yet and renders as plain text.
 * ------------------------------------------------------------------------- */
export type FooterLink = { label: string; href?: string; action?: "reserve" };

export const footerColumns: { title: string; id: string; links: FooterLink[] }[] = [
  {
    title: "Collection",
    id: "footer-collection",
    links: [
      { label: PRODUCT, href: "#top" },
      { label: "Colorways", href: "#collection" },
      { label: "The coffret", href: "#coffret" },
    ],
  },
  {
    title: "Maison",
    id: "footer-maison",
    links: [
      { label: "Philosophy", href: "#maison" },
      { label: "The craft", href: "#craft" },
      { label: "Smart paper", href: "#paper" },
      { label: "Atelier", href: "#atelier" },
    ],
  },
  {
    title: "Services",
    id: "services",
    links: [
      { label: "Private reservation", action: "reserve" },
      { label: "Complimentary engraving", action: "reserve" },
      { label: "Boutiques, by appointment" },
      { label: "Care & servicing" },
    ],
  },
  {
    title: "Legal",
    id: "footer-legal",
    links: [
      { label: "Privacy" },
      { label: "Terms of sale" },
      { label: "Cookies" },
      { label: "Accessibility" },
    ],
  },
];

export const footerSignoff = { before: "Written ", script: "by hand", after: ". Since 2026." };

export const locales = [
  "International — English",
  "France — Français",
  "Italia — Italiano",
  "Deutschland — Deutsch",
  "日本 — 日本語",
] as const;

// Placeholder profiles: point these at the Maison's accounts.
export const socials = [
  { label: "Instagram", href: "https://www.instagram.com/" },
  { label: "Pinterest", href: "https://www.pinterest.com/" },
  { label: "LinkedIn", href: "https://www.linkedin.com/" },
  { label: "YouTube", href: "https://www.youtube.com/" },
] as const;
