import "@fontsource/inter/latin-400.css";
import "@fontsource/inter/latin-500.css";
import "@fontsource/inter/latin-600.css";
import "./styles.css";
import { WatchScene } from "./watch-scene";

type Finish = "silver" | "black" | "gold" | "rose";
const finishes: {
  id: Finish;
  name: string;
  short: string;
  colors: [string, string];
}[] = [
  {
    id: "silver",
    name: "Silver Steel",
    short: "Silver",
    colors: ["#b9b6bd", "#e5e4e5"],
  },
  {
    id: "black",
    name: "Deep Black",
    short: "Black",
    colors: ["#242426", "#656568"],
  },
  {
    id: "gold",
    name: "Pure Gold",
    short: "Gold",
    colors: ["#b3a07c", "#ffffe1"],
  },
  {
    id: "rose",
    name: "Rose Gold",
    short: "Rose",
    colors: ["#b3a19a", "#e8d9cf"],
  },
];
const chapters = [
  ["intro", "The watch"],
  ["timeless", "Timeless"],
  ["finishing", "Light & material"],
  ["assembly", "Inside the watch"],
  ["mechanism", "Mechanical heart"],
  ["movement", "Perpetual motion"],
  ["curves", "Elegant contours"],
  ["dial", "In the details"],
  ["profile", "Slim profile"],
  ["bracelet", "The bracelet"],
  ["gallery", "A different perspective"],
  ["finishes", "Four expressions"],
  ["parts", "Every part counts"],
  ["finale", "Back to the beginning"],
];
const mechanisms = [
  {
    id: "tourbillon",
    name: "Tourbillon",
    title: "A world in motion.",
    description:
      "A rotating cage carries the balance and escapement. Follow the smallest movements at the centre of the mechanism.",
    detail: "Regulation / Rotating assembly",
  },
  {
    id: "mainplate",
    name: "Mainplate",
    title: "Everything has its place.",
    description:
      "The structural foundation of the movement. Each opening, bridge and bearing holds a component in precise alignment.",
    detail: "Structure / Movement foundation",
  },
  {
    id: "dial",
    name: "Dial",
    title: "Time, made visible.",
    description:
      "A layered surface brings the hands, markers and subdials together. Openings in the dial reveal the mechanism beneath.",
    detail: "Display / Layered composition",
  },
  {
    id: "barrel",
    name: "Barrel",
    title: "Energy, held in reserve.",
    description:
      "Inside the barrel, a wound mainspring stores mechanical energy. The gear train carries its controlled release through the watch.",
    detail: "Power / Mainspring housing",
  },
  {
    id: "backplate",
    name: "Backplate",
    title: "Order beneath the surface.",
    description:
      "Bridges and plates support the moving parts. Polished faces and exposed fasteners reveal how the mechanism is assembled.",
    detail: "Structure / Rear assembly",
  },
  {
    id: "weight",
    name: "Weight",
    title: "Movement becomes energy.",
    description:
      "The oscillating weight responds to motion. Its rotation drives the winding system, supplying energy to the mainspring.",
    detail: "Winding / Oscillating rotor",
  },
];
const parts = [
  [
    "Dial",
    11,
    "Display",
    "The face of the watch, layered to bring time and the mechanism into the same view.",
  ],
  [
    "Hands",
    1,
    "Display",
    "Three slender indicators bring the movement to the surface of the dial.",
  ],
  [
    "Crystal",
    12,
    "Protection",
    "A clear cover protects the dial while letting the changing light reach its surface.",
  ],
  [
    "Bezel",
    16,
    "Case",
    "The ring that frames the dial and defines the edge of the watch face.",
  ],
  [
    "Lugs",
    18,
    "Case",
    "The sculpted connection between the watch case and its articulated bracelet.",
  ],
  [
    "Strap",
    34,
    "Bracelet",
    "Linked metal segments follow the shape of the wrist and carry the finish around it.",
  ],
  [
    "Buckle",
    8,
    "Bracelet",
    "A folding closure completes the bracelet and keeps the watch secure.",
  ],
  [
    "Crown",
    3,
    "Control",
    "The small, tactile control used to wind the movement and set the hands.",
  ],
  [
    "Caseback",
    14,
    "Case",
    "The rear enclosure protects the movement and completes the case.",
  ],
  [
    "Movement",
    29,
    "Mechanism",
    "The mechanical assembly at the heart of the watch: energy, transmission and regulation.",
  ],
] as const;
const dot = '<span aria-hidden="true" class="dot"></span>';
const arrow = '<span aria-hidden="true">↗</span>';
const dialGraphic = `<svg class="dial-graphic" viewBox="0 0 120 120" fill="none" aria-hidden="true"><circle cx="60" cy="60" r="55"/><circle cx="60" cy="60" r="45"/><circle cx="60" cy="60" r="3"/>${Array.from({ length: 12 }, (_, i) => `<path d="M60 9v8" transform="rotate(${i * 30} 60 60)"/>`).join("")}<path d="M60 27v33l23 14"/></svg>`;
const brand = (tag = "div", cls = "") =>
  `<${tag} class="brand ${cls}" aria-label="FS 60P"><span>F</span><span>S</span><span>6</span><span>0</span><span>P</span></${tag}>`;
const finishButtons = (className: string) =>
  `<div class="finish-options ${className}" role="group" aria-label="Watch finish">${finishes.map((f, i) => `<button class="finish-button" data-finish="${f.id}" aria-label="${f.name}" aria-pressed="${i === 0}"><i class="swatch swatch-${f.id}"></i><span>${f.short}</span></button>`).join("")}</div>`;
const section = (index: number, classes: string, content: string) =>
  `<section id="${chapters[index][0]}" class="chapter ${classes}" data-chapter="${index}" aria-label="${chapters[index][1]}"><div class="stage">${content}</div></section>`;

document.querySelector<HTMLDivElement>("#app")!.innerHTML = `
  <a class="skip-link" href="#parts">Skip to specifications</a>
  <div class="ambient" aria-hidden="true"><div class="ambient-light"></div><div class="ambient-shadow"></div></div>
  <canvas id="watch-canvas" aria-label="Interactive three-dimensional watch"></canvas>
  <div class="canvas-fallback" hidden><img src="./assets/gallery-1.webp" alt="FS 60P watch"/><p>The interactive view is unavailable. You can still explore every detail below.</p></div>
  <div class="loading" role="status" aria-live="polite"><span class="loading-mark">FS 60P</span><span class="loading-copy">Preparing the watch <b id="load-progress">00</b><span>%</span></span><div class="loading-track"><i></i></div></div>
  <header class="site-controls"><button id="index-toggle" aria-controls="chapter-menu" aria-expanded="false"><span class="index-icon" aria-hidden="true"></span>Index</button><span class="chapter-position"><b id="chapter-number">01</b><span>/ 14</span><span id="chapter-name">The watch</span></span><button id="motion-toggle" aria-pressed="false" aria-label="Pause ambient motion"><span class="pause-icon" aria-hidden="true">Ⅱ</span><span class="motion-label">Pause</span></button></header>
  <nav id="chapter-menu" aria-label="Chapters" hidden><div class="index-heading"><span>Explore the watch</span><button id="index-close" aria-label="Close chapter index">Close ×</button></div><ol>${chapters.map(([id, label], i) => `<li><a href="#${id}"><span>${String(i + 1).padStart(2, "0")}</span>${label}${arrow}</a></li>`).join("")}</ol></nav>
  <main>
  ${section(
    0,
    "intro",
    `
    ${brand("h1")}
    <div class="orbit" aria-hidden="true"><svg viewBox="0 0 1000 1000"><circle cx="500" cy="500" r="490"/><path d="M500 0v20M1000 500h-20M500 1000v-20M0 500h20"/></svg></div>
    ${finishButtons("orbit-finishes foreground")}
    <div class="hero-meta foreground"><div><span class="eyebrow">Color</span><span class="current-finish">Silver Steel</span></div><div class="mass"><span>MODEL</span><strong>146GR</strong></div></div>
    <a class="scroll-cue foreground" href="#timeless"><span>Scroll to discover</span><span class="scroll-line" aria-hidden="true">↓</span></a>
    <span class="edition foreground">AUTOMATIC<br>FS — 60P</span>
  `,
  )}
  ${section(
    1,
    "timeless editorial",
    `
    <div class="editorial-type"><span class="muted model-line">FS <i></i> 60P</span><h2><span class="align-right">the</span><span>timeless</span><span class="align-right">automatic</span><span>60mm watch</span></h2></div>
    <div class="editorial-bottom foreground">${dialGraphic}<div class="feature-pair"><div><h3>Precision in perspective</h3><p>A mechanical watch explored through form, light and movement. Every angle tells another part of the story.</p></div><div><h3>Automatic movement</h3><p>Energy becomes motion. Motion becomes time. A complex rhythm revealed beneath a considered exterior.</p></div></div></div>
  `,
  )}
  ${section(
    2,
    "finishing",
    `
    <div class="finish-annotations foreground"><div>${dot}<span class="eyebrow">01 / THE SURFACE</span><h2>Case & finishes</h2><p>Brushed metal meets a polished edge. Light travels across each surface, revealing the shape of the case.</p></div><div>${dialGraphic}<h2>Dial & complications</h2><p>Layers of texture. A measured arrangement of markers. A view into the mechanics of time.</p></div></div>
    <div class="vertical-brand" aria-hidden="true">FS — 60P</div>
  `,
  )}
  ${section(
    3,
    "assembly",
    `
    <div class="assembly-heading foreground"><span class="eyebrow">02 / BENEATH THE SURFACE</span><h2>One watch.<br>Many moving parts.</h2><p>Select a component to look closer.</p></div>
    <div class="assembly-type" aria-hidden="true">FS 60P</div>
    <button id="assembly-toggle" class="line-button foreground" aria-pressed="true">Reassemble <span aria-hidden="true">↙</span></button>
    <div class="part-select foreground" role="group" aria-label="Movement components">${mechanisms.map((p, i) => `<button data-part="${p.id}" aria-pressed="false"><span class="part-line" aria-hidden="true"></span><span class="part-no">0${i + 1}</span>${p.name}<span aria-hidden="true">+</span></button>`).join("")}</div>
    <aside class="part-inspector foreground" hidden aria-label="Component details"><button id="inspector-close" aria-label="Close component details">Close ×</button><span class="eyebrow" id="inspector-detail"></span><h3 id="inspector-name"></h3><p class="inspector-tagline" id="inspector-title"></p><p id="inspector-description"></p><div class="inspector-navigation"><button id="part-prev" aria-label="Previous component">←</button><span id="part-count"></span><button id="part-next" aria-label="Next component">→</button></div></aside>
  `,
  )}
  ${section(
    4,
    "mechanism dark",
    `
    <div class="mechanism-title foreground"><span class="eyebrow">03 / A CONSTANT RHYTHM</span><h2><span>Mechanical</span><br>Heart</h2></div>
    <div class="mechanism-copy foreground"><h3>Powered by movement</h3><p>A balance that oscillates. Gears that turn. The smallest parts working together in a continuous exchange of energy.</p><div class="diameter"><span>Diameter</span><strong>60<small>mm</small></strong></div></div>
    <div class="seconds foreground" aria-label="Animated seconds"><span id="second-count" aria-hidden="true">00</span><sup aria-hidden="true">″</sup></div>
    <span class="mechanism-foot foreground">THE ART OF MEASURING A MOMENT</span>
  `,
  )}
  ${section(
    5,
    "movement editorial dark",
    `
    <div class="editorial-type"><span class="muted model-line">FS <i></i> 60P</span><h2><span class="align-right">the</span><span>quiet art</span><span class="align-right">of perpetual</span><span>movement</span></h2></div>
    <div class="editorial-bottom foreground">${dialGraphic}<div class="feature-pair"><div><h3>A mechanical conversation</h3><p>The rotor supplies energy. The gear train transmits it. The escapement gives it a rhythm.</p></div><div><h3>Designed to be seen</h3><p>Through the open dial and the caseback, each part has its own place in the composition.</p></div></div></div>
  `,
  )}
  ${section(
    6,
    "curves detail-chapter",
    `
    <div class="detail-heading foreground"><span class="crosshair" aria-hidden="true">⊕</span><span class="eyebrow">04 / FORM</span><h2>Elegant contours</h2><p>A changing line. A softened edge.<br>A different expression in every reflection.</p></div>
    <div class="measurement foreground"><span>60</span><span>MM / DIAMETER</span></div>
  `,
  )}
  ${section(
    7,
    "dial",
    `
    <div class="dial-annotations foreground"><span class="eyebrow">05 / IN THE DETAILS</span><div><span>01</span><h2>The dial</h2><p>Texture and negative space give the face its depth.</p></div><div><span>02</span><h2>The hands</h2><p>Fine, polished lines trace a continuous passage of time.</p></div><div><span>03</span><h2>The bezel</h2><p>A precise frame catches the light around the dial.</p></div></div>
    <div class="detail-word" aria-hidden="true">Clarity.</div>
  `,
  )}
  ${section(
    8,
    "profile detail-chapter",
    `
    <div class="detail-heading foreground"><span class="crosshair" aria-hidden="true">⊕</span><span class="eyebrow">06 / SILHOUETTE</span><h2>Slim profile</h2><p>Follow the contour from crown to case.<br>One continuous, considered line.</p></div>
    <div class="profile-rule foreground" aria-hidden="true"><span>CASE STUDY — 60P</span></div>
  `,
  )}
  ${section(
    9,
    "bracelet detail-chapter",
    `
    <div class="detail-heading foreground"><span class="crosshair" aria-hidden="true">⊕</span><span class="eyebrow">07 / CONNECTION</span><h2>Link by link.</h2><p>Articulated metal. Alternating reflections.<br>The case becomes a bracelet.</p></div>
    <div class="bracelet-note foreground"><span class="eyebrow">THE BRACELET</span><span>34<span class="unit">GR</span></span></div>
  `,
  )}
  ${section(
    10,
    "gallery",
    `
    <h2 class="gallery-type">A different<br><span>perspective.</span></h2>
    <div class="image-stream" aria-label="Watch photography">${[1, 2, 3, 4, 5].map((i) => `<figure class="gallery-image image-${i}"><img src="./assets/gallery-${i}.webp" alt="FS 60P, detail view ${i}" loading="lazy" width="1000" height="1200"/><figcaption>FS 60P — STUDY 0${i}</figcaption></figure>`).join("")}</div>
  `,
  )}
  ${section(
    11,
    "colors",
    `
    <div class="color-background" aria-hidden="true"></div><h2 class="color-title"><span id="finish-word-one">Silver</span><span id="finish-word-two">Steel</span></h2>
    <div class="color-caption foreground"><span class="eyebrow">08 / YOUR EXPRESSION</span><span class="current-finish">Silver Steel</span></div>
    <div class="color-count foreground"><strong id="finish-number">01</strong><span>/ 04</span></div>
    ${finishButtons("color-finishes foreground")}
    <p class="color-instruction foreground">Scroll through the finishes. Or choose your own.</p>
  `,
  )}
  <section id="parts" class="chapter parts" data-chapter="12" aria-label="Every part counts"><div class="parts-heading"><h2><span>MODEL</span>146GR</h2><div>${dialGraphic}<span class="eyebrow">10 COMPONENTS</span><p>A composition of parts.<br>One complete object.</p></div></div><div class="parts-table" aria-label="Watch components">${parts.map(([name, weight, type], i) => `<button class="parts-row" data-spec="${i}" aria-label="Explore ${name}, ${weight} grams"><img src="./assets/parts/${name.toLowerCase()}.svg" alt="" width="80" height="80" loading="lazy"/><span class="parts-name">${name}</span><span class="parts-index">${String(i + 1).padStart(2, "0")}</span><span class="parts-type">${type}</span><span class="parts-weight">${weight}<span> GR</span></span><span class="parts-arrow" aria-hidden="true">↗</span></button>`).join("")}</div><div class="parts-total"><span>THE WHOLE IS MORE THAN ITS PARTS.</span><span>TOTAL / 146 GR</span></div></section>
  ${section(13, "finale", `${brand()}<div class="finale-caption foreground"><span class="eyebrow">FS — 60P</span><h2>A moment.<br>From every angle.</h2></div><button id="back-top" class="replay foreground">Experience it again <span aria-hidden="true">↑</span></button><div class="footer-note foreground"><span>THE WATCH / A DIGITAL EXPERIENCE</span><a href="https://60fps.fr" target="_blank" rel="noopener noreferrer">Artwork by 60fps ${arrow}</a></div>`)}
  </main>
  <dialog id="spec-dialog" aria-labelledby="spec-name" aria-describedby="spec-description"><button id="spec-close" aria-label="Close detail">Close ×</button><img id="spec-image" alt=""/><div><span class="eyebrow" id="spec-category"></span><h2 id="spec-name"></h2><p id="spec-description"></p><strong id="spec-weight"></strong></div></dialog>
  <div id="announce" class="sr-only" role="status" aria-live="polite"></div>
  <div class="page-progress" aria-hidden="true"><i></i></div>
`;

const $ = <T extends HTMLElement = HTMLElement>(selector: string) =>
  document.querySelector<T>(selector)!;
const $$ = <T extends HTMLElement = HTMLElement>(selector: string) => [
  ...document.querySelectorAll<T>(selector),
];
// Viewport annotations live beside the sticky artwork, above the shared canvas.
$$(".chapter .stage").forEach((stage) => {
  const layer = document.createElement("div");
  layer.className = "foreground-layer";
  [...stage.children]
    .filter((child) => child.classList.contains("foreground"))
    .forEach((child) => layer.append(child));
  stage.parentElement!.append(layer);
});
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
let paused = reducedMotion.matches;
let active = 0;
let selectedPart: number | null = null;
let selectedFinish: Finish = "silver";
let colorStep = -1;
let scene: WatchScene | undefined;
let expanded = true;
let dirty = true;
let geometry: { top: number; height: number }[] = [];
const chapterElements = $$(".chapter");
const canvas = $<HTMLCanvasElement>("#watch-canvas");

function announce(message: string) {
  $("#announce").textContent = message;
}
function setFinish(finish: Finish, userAction = false) {
  const index = finishes.findIndex((f) => f.id === finish);
  const item = finishes[index];
  selectedFinish = finish;
  document.documentElement.dataset.finish = finish;
  document.documentElement.style.setProperty("--finish-a", item.colors[0]);
  document.documentElement.style.setProperty("--finish-b", item.colors[1]);
  $$(".current-finish").forEach((el) => (el.textContent = item.name));
  $$<HTMLButtonElement>("[data-finish]").forEach((el) =>
    el.setAttribute("aria-pressed", String(el.dataset.finish === finish)),
  );
  const [one, two] = item.name.split(" ");
  $("#finish-word-one").textContent = one;
  $("#finish-word-two").textContent = two;
  $("#finish-number").textContent = String(index + 1).padStart(2, "0");
  scene?.setFinish(finish);
  if (userAction) announce(`${item.name} selected`);
}
$$<HTMLButtonElement>("[data-finish]").forEach((el) =>
  el.addEventListener("click", () =>
    setFinish(el.dataset.finish as Finish, true),
  ),
);

function inspectPart(index: number | null) {
  selectedPart = index;
  $(".part-inspector").hidden = index === null;
  $$(".part-select button").forEach((button, i) =>
    button.setAttribute("aria-pressed", String(index === i)),
  );
  $(".assembly").classList.toggle("inspecting", index !== null);
  if (index === null) {
    scene?.setInspection(null);
    return;
  }
  const part = mechanisms[index];
  $("#inspector-detail").textContent = part.detail;
  $("#inspector-name").textContent = part.name;
  $("#inspector-title").textContent = part.title;
  $("#inspector-description").textContent = part.description;
  $("#part-count").textContent = `${String(index + 1).padStart(2, "0")} / 06`;
  scene?.setInspection(part.id);
  announce(`${part.name}. ${part.title}`);
}
$$("[data-part]").forEach((el, i) =>
  el.addEventListener("click", () =>
    inspectPart(selectedPart === i ? null : i),
  ),
);
$("#inspector-close").addEventListener("click", () => inspectPart(null));
$("#part-prev").addEventListener("click", () =>
  inspectPart(((selectedPart ?? 0) + 5) % 6),
);
$("#part-next").addEventListener("click", () =>
  inspectPart(((selectedPart ?? 0) + 1) % 6),
);
$("#assembly-toggle").addEventListener("click", () => {
  expanded = !expanded;
  inspectPart(null);
  scene?.setExploded(expanded);
  $("#assembly-toggle").setAttribute("aria-pressed", String(expanded));
  $("#assembly-toggle").innerHTML =
    `${expanded ? "Reassemble" : "Separate the parts"} <span aria-hidden="true">${expanded ? "↙" : "↗"}</span>`;
});

const menu = $("#chapter-menu");
function setMenu(open: boolean) {
  menu.hidden = !open;
  $("#index-toggle").setAttribute("aria-expanded", String(open));
  document.body.classList.toggle("index-open", open);
  if (open) menu.querySelector<HTMLElement>("a")?.focus();
  else $("#index-toggle").focus({ preventScroll: true });
}
$("#index-toggle").addEventListener("click", () => setMenu(menu.hidden));
$("#index-close").addEventListener("click", () => setMenu(false));
$("#chapter-menu").addEventListener("keydown", (e) => {
  if (e.key !== "Tab") return;
  const items = menu.querySelectorAll<HTMLElement>("button,a");
  const first = items[0],
    last = items[items.length - 1];
  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
  }
  if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
});
function goToChapter(id: string) {
  const target = document.getElementById(id);
  if (!target) return;
  const index = Number(target.dataset.chapter);
  const offset =
    index === 3
      ? Math.min(innerHeight * 0.7, target.offsetHeight - innerHeight)
      : 0;
  window.scrollTo({
    top: target.offsetTop + offset,
    behavior: reducedMotion.matches ? "instant" : "smooth",
  });
  history.replaceState(null, "", `#${id}`);
}
$$<HTMLAnchorElement>('a[href^="#"]').forEach((el) =>
  el.addEventListener("click", (e) => {
    e.preventDefault();
    if (!menu.hidden) setMenu(false);
    goToChapter(el.hash.slice(1));
  }),
);
$("#back-top").addEventListener("click", () => goToChapter("intro"));
function setPaused(value: boolean) {
  paused = value;
  scene?.setPaused(paused);
  document.body.classList.toggle("motion-paused", paused);
  $("#motion-toggle").setAttribute("aria-pressed", String(paused));
  $("#motion-toggle").setAttribute(
    "aria-label",
    paused ? "Resume ambient motion" : "Pause ambient motion",
  );
  $(".motion-label").textContent = paused ? "Play" : "Pause";
  $(".pause-icon").textContent = paused ? "▷" : "Ⅱ";
}
$("#motion-toggle").addEventListener("click", () => setPaused(!paused));
reducedMotion.addEventListener("change", () =>
  setPaused(reducedMotion.matches),
);

const specDialog = $<HTMLDialogElement>("#spec-dialog");
$$("[data-spec]").forEach((el) =>
  el.addEventListener("click", () => {
    const [name, weight, type, description] = parts[Number(el.dataset.spec)];
    $("#spec-category").textContent = type;
    $("#spec-name").textContent = name;
    $("#spec-description").textContent = description;
    $("#spec-weight").textContent = `${weight} GR`;
    $<HTMLImageElement>("#spec-image").src =
      `./assets/parts/${name.toLowerCase()}.svg`;
    $<HTMLImageElement>("#spec-image").alt = `${name} component diagram`;
    specDialog.showModal();
  }),
);
$("#spec-close").addEventListener("click", () => specDialog.close());
specDialog.addEventListener("click", (event) => {
  if (event.target === specDialog) {
    const r = specDialog.getBoundingClientRect();
    if (
      event.clientX < r.left ||
      event.clientX > r.right ||
      event.clientY < r.top ||
      event.clientY > r.bottom
    )
      specDialog.close();
  }
});
window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    if (!menu.hidden) setMenu(false);
    inspectPart(null);
  }
});
window.addEventListener(
  "pointermove",
  (event) => {
    if (event.pointerType === "mouse")
      scene?.setPointer(
        (event.clientX / innerWidth) * 2 - 1,
        (event.clientY / innerHeight) * 2 - 1,
      );
  },
  { passive: true },
);
window.addEventListener(
  "pointerout",
  (event) => {
    if (!event.relatedTarget) scene?.setPointer(0, 0);
  },
  { passive: true },
);

function measure() {
  geometry = chapterElements.map((el) => ({
    top: el.offsetTop,
    height: el.offsetHeight,
  }));
  scene?.resize();
  dirty = true;
}
const clamp = (n: number, min = 0, max = 1) => Math.max(min, Math.min(max, n));
const mix = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);
function updateScroll() {
  const y = window.scrollY;
  let next = geometry.findIndex(
    (s, i) =>
      y >= s.top - 1 &&
      (i === geometry.length - 1 || y < geometry[i + 1].top - 1),
  );
  if (next < 0) next = 0;
  const bounds = geometry[next];
  const progress = clamp(
    (y - bounds.top) / Math.max(innerHeight, bounds.height - innerHeight),
  );
  if (next !== active) {
    if (active === 3) {
      inspectPart(null);
      scene?.setExploded(false);
    }
    active = next;
    if (active === 3) {
      expanded = true;
      scene?.setExploded(true);
      $("#assembly-toggle").innerHTML =
        'Reassemble <span aria-hidden="true">↙</span>';
      $("#assembly-toggle").setAttribute("aria-pressed", "true");
    }
    $("#chapter-number").textContent = String(active + 1).padStart(2, "0");
    $("#chapter-name").textContent = chapters[active][1];
    $$<HTMLAnchorElement>("#chapter-menu a").forEach((a, i) => {
      if (i === active) a.setAttribute("aria-current", "location");
      else a.removeAttribute("aria-current");
    });
  }
  chapterElements.forEach((el, i) =>
    el.classList.toggle("is-active", i === active),
  );
  document.body.dataset.chapter = String(active);
  document.body.classList.toggle(
    "dark-scene",
    (active === 4 || active === 5) && !(active === 5 && progress > 0.85),
  );
  let grey = 235;
  if (active === 2) grey = mix(235, 161, progress);
  if (active === 3) grey = 161;
  if (active === 4) grey = mix(161, 10, clamp(progress * 3));
  if (active === 5) grey = mix(10, 235, clamp((progress - 0.7) / 0.3));
  document.documentElement.style.setProperty(
    "--paper",
    `rgb(${grey},${grey},${grey})`,
  );
  document.documentElement.style.setProperty(
    "--scroll-progress",
    String(
      y / Math.max(1, document.documentElement.scrollHeight - innerHeight),
    ),
  );
  const stage = chapterElements[active];
  stage.style.setProperty("--p", String(progress));
  stage.style.setProperty("--travel", `${-progress * 12}vh`);
  const imageVisible = active === 10;
  $(".image-stream").style.opacity = imageVisible ? "1" : "0";
  $$(".gallery-image").forEach((el, i) => {
    const starts = [105, 180, 135, 220, 280];
    el.style.transform = `translate3d(0,${starts[i] - progress * 420}vh,0)`;
  });
  if (active === 11) {
    const step = Math.min(3, Math.floor(progress * 4));
    if (step !== colorStep) {
      colorStep = step;
      setFinish(finishes[step].id);
    }
  } else colorStep = -1;
  scene?.setScroll(active, progress);
}
let frame = 0,
  lastSeconds = -1;
function tick(time: number) {
  if (dirty) {
    updateScroll();
    dirty = false;
  }
  if (active === 4 && !paused) {
    const seconds = Math.floor(time / 1000) % 60;
    if (seconds !== lastSeconds) {
      $("#second-count").textContent = String(seconds).padStart(2, "0");
      lastSeconds = seconds;
    }
  }
  frame = requestAnimationFrame(tick);
}
window.addEventListener(
  "scroll",
  () => {
    dirty = true;
  },
  { passive: true },
);
window.addEventListener("resize", measure, { passive: true });
const resizeObserver = new ResizeObserver(measure);
resizeObserver.observe(document.querySelector("main")!);
function onSceneError(message: string) {
  console.error(message);
  $(".loading").classList.add("loaded");
  $(".canvas-fallback").hidden = false;
  document.body.classList.add("scene-unavailable");
  announce("The 3D view is unavailable. All product details remain available.");
}
try {
  scene = new WatchScene(canvas, {
    onReady: () => {
      document.body.classList.add("scene-ready");
      $(".loading").classList.add("loaded");
      scene?.setFinish(selectedFinish);
      scene?.setPaused(paused);
      dirty = true;
    },
    onProgress: (progress) => {
      const n = Math.min(99, Math.floor(progress * 100));
      $("#load-progress").textContent = String(n).padStart(2, "0");
      $(".loading-track i").style.transform = `scaleX(${progress})`;
    },
    onError: onSceneError,
  });
} catch (error) {
  onSceneError(
    error instanceof Error ? error.message : "Unable to initialize the 3D view",
  );
}
setFinish("silver");
setPaused(paused);
measure();
updateScroll();
frame = requestAnimationFrame(tick);
document.fonts.ready.then(measure);
window.addEventListener("pagehide", (event) => {
  if (!event.persisted) {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    scene?.dispose();
  }
});
// Keep scroll restoration and direct chapter links in sync with the scene.
window.addEventListener("pageshow", () => {
  measure();
  dirty = true;
});
if (location.hash)
  requestAnimationFrame(() => {
    const target = document.getElementById(location.hash.slice(1));
    if (target) window.scrollTo({ top: target.offsetTop, behavior: "instant" });
  });
