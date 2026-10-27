/* Anasa Guest Manual — v8. Vanilla JS, no build step, works offline.
 *
 * DATA (loaded before this file, see index.html):
 *   config.js        APP_CONFIG (default boat/language, languages, message language, owner PIN)
 *   lang/<code>.js   I18N[code]  — UI strings + manual text per language (fallback: English)
 *   boats/<id>.js    BOATS[id]   — boat facts, contacts, radio, Wi-Fi, sections/topics structure
 * Pick a boat with ?boat=<id> (default APP_CONFIG.defaultBoat). See README.md.
 *
 * Text markup: **bold**, __spoken__, [[topic-id|link]] or [[#/route|link]], {variables}.
 * A topic with none of before/steps/callout/stats/items/special shows "Content coming soon".
 */
const CFG = window.APP_CONFIG;

/* ---------- Storage ---------- */
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
  del(k) { try { localStorage.removeItem(k); } catch {} }
};

/* ---------- Boat & language ---------- */
const params = new URLSearchParams(location.search);
const BOAT = BOATS[params.get("boat")] || BOATS[CFG.defaultBoat] || Object.values(BOATS)[0];
const LANGS = CFG.languages.filter(c => I18N[c]);
function pickLang() {
  const saved = store.get("lang");
  if (saved && LANGS.includes(saved)) return saved;
  for (const l of (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language])) {
    const c = String(l || "").slice(0, 2).toLowerCase();
    if (LANGS.includes(c)) return c;
  }
  return LANGS.includes(CFG.defaultLang) ? CFG.defaultLang : LANGS[0];
}
let lang = pickLang();
const L = () => I18N[lang];

const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fill = (s, v = {}) => String(s).replace(/\{(\w+)\}/g, (m, k) => (k in v ? v[k] : m));
/** Translate a UI key. Plurals via key_one/key_other when vars.n is given. */
function t(key, vars = {}, code = lang) {
  const ui = (I18N[code] || I18N.en).ui, en = I18N.en.ui;
  let k = key;
  if (typeof vars.n === "number" && ((key + "_other") in ui || (key + "_other") in en)) {
    const cat = new Intl.PluralRules((I18N[code] || I18N.en).locale).select(vars.n);
    k = ((key + "_" + cat) in ui || (key + "_" + cat) in en) ? key + "_" + cat : key + "_other";
  }
  const s = ui[k] ?? en[k] ?? key;
  return typeof s === "string" ? fill(s, vars) : s;
}
/** Owner-facing message strings (APP_CONFIG.messageLang). */
const tm = (key, vars = {}) => fill(((I18N[CFG.messageLang] || I18N.en).ui.msg || {})[key] ?? I18N.en.ui.msg[key] ?? key, vars);
const local = v => (v && typeof v === "object" && !Array.isArray(v)) ? (v[lang] ?? v.en ?? Object.values(v)[0]) : v;
/** Rich text: escape, fill vars (escaped), then **bold**, __say__, [[link]]. */
function rich(s, vars = {}) {
  const ev = Object.fromEntries(Object.entries(vars).map(([k, v]) => [k, esc(v)]));
  return fill(esc(s), ev)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/__(.+?)__/g, '<span class="say">$1</span>')
    .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, id, l) => `<a href="${id.startsWith("#") ? id : "#/t/" + id}" data-link>${l}</a>`);
}
const plain = s => String(s).replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1").replace(/\*\*|__/g, "");
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ς/g, "σ").replace(/[“”„"«»]/g, "");

/* ---------- Localised model (rebuilt on language change) ---------- */
let SECTIONS = [], ALL = [];
function buildModel() {
  const tx = (id, kind) => Object.assign({},
    I18N.en[kind][id], L()[kind][id],
    BOAT.content?.en?.[kind]?.[id], BOAT.content?.[lang]?.[kind]?.[id]);
  SECTIONS = BOAT.sections.map(s => {
    const sec = { ...s, group: s.group || "manual", ...tx(s.id, "sections") };
    sec.topics = s.topics.map(tp => {
      const txt = tx(tp.id, "topics");
      const media = (tp.media || []).map((kind, i) => ({ kind, label: (txt.media || [])[i] || t("kind_" + kind) }));
      const stats = (tp.stats || []).map((x, i) => ({ ...x, label: (txt.stats || [])[i] || "" }));
      return { ...tp, ...txt, media: media.length ? media : null, stats: stats.length ? stats : null,
               items: txt.items || null, enKw: (I18N.en.topics[tp.id] || {}).kw || [], section: sec };
    });
    return sec;
  });
  ALL = SECTIONS.flatMap(s => s.topics);
}
const MANUAL_SECS = () => SECTIONS.filter(s => s.group === "manual");
const secById = id => SECTIONS.find(s => s.id === id);
const topicById = id => ALL.find(x => x.id === id);
const hasContent = x => !!(x.before || x.steps || x.callout || x.stats || x.items || x.special);

/* ---------- Contacts ---------- */
const WA_KEY = `owner:${BOAT.id}:whatsapp`;
const waOverride = () => store.get(WA_KEY, "") || (BOAT.id === CFG.defaultBoat ? store.get("owner:whatsapp", "") : "");
const ownerWa = () => waOverride() || BOAT.contacts.ownerWhatsApp;
const digits = s => String(s || "").replace(/\D/g, "").replace(/^00/, "");
const telHref = s => "tel:" + String(s).replace(/[^\d+]/g, "");
const isMock = key => (BOAT.mock || []).includes(key) && !(key === "ownerWhatsApp" && waOverride());
const mockTag = key => isMock(key) ? ` <span class="ph-tag">${esc(t("mock"))}</span>` : "";
function waUrl(text) { return `https://wa.me/${digits(ownerWa())}?text=${encodeURIComponent(text)}`; }
/** Open WhatsApp with a prefilled message. Returns the URL (also kept in window.__lastWhatsApp for testing). */
function openWhatsApp(text) {
  const url = waUrl(text);
  window.__lastWhatsApp = url;
  let w = null;
  try { w = window.open(url, "_blank"); } catch {}
  if (w) { try { w.opener = null; } catch {} } else location.href = url;
  return url;
}
const guestLangLine = () => lang !== CFG.messageLang ? `\n${tm("guestLang")}: ${L().name}` : "";

/* ---------- Icons (inline line SVG) ---------- */
const P = {
  dinghy: '<path d="M2.5 12h13.5a3 3 0 0 1 0 6H5.5a3 3 0 0 1-3-3z"/><path d="M6 12l1.5-3h6"/><path d="M20.5 8v9.5M19 8h3"/>',
  propeller: '<circle cx="12" cy="12" r="1.8"/><path d="M12 10.2c-.6-3 .3-5.6 2.6-6.4 1.4 2.1.3 4.8-2.6 6.4z"/><path d="M13.6 12.9c2.9 1 4.7 3.1 4.2 5.5-2.5.2-4.3-2.1-4.2-5.5z"/><path d="M10.4 12.9c-2.3 2-5 2.5-6.8.8 1.1-2.3 4-2.6 6.8-.8z"/>',
  fender: '<rect x="8" y="3.5" width="8" height="17" rx="4"/><path d="M12 1.5v2M8 9h8M8 15h8"/>',
  sail: '<path d="M12 3v14"/><path d="M12 3l7 12h-7"/><path d="M12 6.5 6.5 15H12"/><path d="M3.5 19.5c2.8 1.4 5.7 1.4 8.5 0s5.7-1.4 8.5 0"/>',
  helm: '<circle cx="12" cy="12" r="6.5"/><circle cx="12" cy="12" r="1.6"/><path d="M12 2v3.5M12 18.5V22M2 12h3.5M18.5 12H22M4.9 4.9l2.5 2.5M16.6 16.6l2.5 2.5M4.9 19.1l2.5-2.5M16.6 7.4l2.5-2.5"/>',
  flame: '<path d="M12 21c-3.9 0-6.5-2.6-6.5-6.2 0-3.6 3.2-5.6 3.9-9.8 2.5 1.6 3.9 3.8 4 6.2 1-.9 1.6-2 1.8-3.2 2 1.8 3.3 4.1 3.3 6.8 0 3.6-2.6 6.2-6.5 6.2z"/>',
  sofa: '<path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3"/><path d="M3 13a2 2 0 0 1 4 0v2h10v-2a2 2 0 0 1 4 0v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1z"/><path d="M6 18v2M18 18v2"/>',
  buoy: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  bolt: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
  drop: '<path d="M12 2.8s6.5 7 6.5 11.7a6.5 6.5 0 0 1-13 0C5.5 9.8 12 2.8 12 2.8z"/><path d="M9 14.5a3 3 0 0 0 3 3"/>',
  toilet: '<rect x="5" y="3" width="6" height="7" rx="1"/><path d="M3.5 10h17a6.5 6.5 0 0 1-6.5 6.5h-4A6.5 6.5 0 0 1 3.5 10z"/><path d="M9 16.5 8 21h8l-1-4.5"/>',
  cutlery: '<path d="M7 2.5v19M4.5 2.5V7a2.5 2.5 0 0 0 5 0V2.5"/><path d="M17.5 21.5v-19C15.3 3.7 14 6.3 14 9.5v4h3.5"/>',
  anchor: '<circle cx="12" cy="5" r="2"/><path d="M12 7v14M8.5 10.5h7"/><path d="M4 13.5a8 8 0 0 0 16 0"/><path d="M4 13.5l-1.5 1.5M20 13.5l1.5 1.5"/>',
  search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
  chev: '<path d="M9 5.5 15.5 12 9 18.5"/>',
  down: '<path d="M6 9.5l6 6 6-6"/>',
  back: '<path d="M15 5.5 8.5 12l6.5 6.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  play: '<path d="M7 4.8v14.4L19 12z"/>',
  photo: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="10" r="1.7"/><path d="m21 15.5-4.5-4.5L7 19"/>',
  diagram: '<path d="M3 9.5c3 1.6 6 1.6 9 0s6-1.6 9 0"/><path d="M8 13v5M5.5 15.5h5"/><circle cx="17" cy="16" r="2.5"/>',
  guide: '<path d="M7 3h7l4.5 4.5V20a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1z"/><path d="M14 3v4.5h4.5M9 12.5h6M9 16h6"/>',
  pin: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>',
  alert: '<path d="M10.3 4.2 2.6 17.5A2 2 0 0 0 4.3 20.5h15.4a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0z"/><path d="M12 9.5v4M12 16.8v.2"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>',
  phone: '<path d="M5 3.5h3l2 5-2.4 1.5a11.5 11.5 0 0 0 6.4 6.4l1.5-2.4 5 2v3a2 2 0 0 1-2 2A16.5 16.5 0 0 1 3 5.5a2 2 0 0 1 2-2z"/>',
  radio: '<rect x="5.5" y="8" width="13" height="13" rx="2"/><path d="M9 8 7.5 2.5M9 12.5h6M9 15.5h6M9 18.5h3"/>',
  minus: '<path d="M6 12h12"/>',
  plus: '<path d="M12 6v12M6 12h12"/>',
  lock: '<rect x="5" y="10.5" width="14" height="10.5" rx="2.5"/><path d="M8 10.5V7a4 4 0 0 1 8 0v3.5"/>',
  del: '<path d="M8.5 5H20a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H8.5L3 12z"/><path d="m11 9.5 5 5M16 9.5l-5 5"/>',
  chat: '<path d="M4 20l1.3-3.9A8.5 8.5 0 1 1 8 18.8z"/>',
  glass: '<path d="M7 3h10l-1 8.5a4 4 0 0 1-8 0z"/><path d="M12 15.5V21M8.5 21h7"/>',
  bowl: '<path d="M3 11h18a9 9 0 0 1-18 0z"/><path d="M9 20h6"/>',
  plate: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/>',
  plug: '<path d="M9 2.5v5M15 2.5v5"/><path d="M6.5 7.5h11v3a5.5 5.5 0 0 1-11 0z"/><path d="M12 16v5.5"/>',
  gear: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
  home: '<path d="M3.5 11 12 4l8.5 7"/><path d="M5.5 9.5V20h13V9.5"/><path d="M10 20v-5h4v5"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0"/><path d="M5.8 12.4a9.3 9.3 0 0 1 12.4 0"/><path d="M9.1 15.8a4.6 4.6 0 0 1 5.8 0"/><circle cx="12" cy="19" r=".9"/>',
  list: '<path d="M9 6h11M9 12h11M9 18h11"/><circle cx="4.5" cy="6" r=".9"/><circle cx="4.5" cy="12" r=".9"/><circle cx="4.5" cy="18" r=".9"/>',
  wrench: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
  star: '<path d="M12 2.8l2.8 5.7 6.3.9-4.6 4.4 1.1 6.3L12 17.1l-5.6 3 1.1-6.3-4.6-4.4 6.3-.9z"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7.5a2 2 0 0 0 2 2h2.5"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  locate: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>',
  key: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8.5-8.5M16.5 6.5l2.5 2.5M14.5 8.5l2 2"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2V16h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z"/>'
};
const ic = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.guide}</svg>`;
const TYPE_ICON = { guide: "guide", video: "play", photo: "photo", diagram: "diagram", location: "pin", warning: "alert", info: "info", script: "radio", form: "chat" };
const tIcon = x => x.icon || TYPE_ICON[x.type] || "guide";

/* ---------- Chrome ---------- */
const $app = document.getElementById("app"), $nav = document.getElementById("nav"), $back = document.getElementById("backBtn"),
      $brand = document.getElementById("brand"), $title = document.getElementById("navTitle"), $toast = document.getElementById("toast"),
      $langBtn = document.getElementById("langBtn"), $langMenu = document.getElementById("langMenu"), $sos = document.getElementById("sosBtn");
$back.innerHTML = ic("back");
function toast(msg) { $toast.textContent = msg; $toast.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => $toast.classList.remove("show"), 2400); }
let query = "";

function renderChrome() {
  document.documentElement.lang = lang;
  $back.setAttribute("aria-label", t("back"));
  $brand.setAttribute("aria-label", BOAT.company);
  $sos.setAttribute("aria-label", t("emergency"));
  $langBtn.innerHTML = `${ic("globe")}<span>${esc(L().short)}</span>`;
  $langBtn.setAttribute("aria-label", `${t("language")}: ${L().name}`);
  $langMenu.innerHTML = `<div class="lm-head">${esc(t("language"))}</div>` + LANGS.map(c => `
    <button role="menuitemradio" aria-checked="${c === lang}" data-lang="${c}"><span class="lm-code">${esc(I18N[c].short)}</span>
      <span class="lm-name">${esc(I18N[c].name)}</span>${c === lang ? ic("check") : ""}</button>`).join("");
}
function toggleLangMenu(open = $langMenu.hidden) {
  $langMenu.hidden = !open; $langBtn.setAttribute("aria-expanded", open);
  if (open) $langMenu.querySelector('[aria-checked="true"]')?.focus();
}
$langBtn.addEventListener("click", e => { e.stopPropagation(); toggleLangMenu(); });
$langMenu.addEventListener("click", e => {
  const b = e.target.closest("[data-lang]"); if (!b) return;
  toggleLangMenu(false); setLang(b.dataset.lang); $langBtn.focus();
});
document.addEventListener("click", e => { if (!$langMenu.hidden && !e.target.closest("#langMenu")) toggleLangMenu(false); });
document.addEventListener("keydown", e => { if (e.key === "Escape") { toggleLangMenu(false); closeSheet(); } });
function setLang(code) {
  if (!LANGS.includes(code)) return;
  lang = code; store.set("lang", code);
  buildModel(); renderChrome(); route(false);
}

function setNav({ mode, title = "" }) {
  $nav.classList.toggle("overlay", mode === "home");
  $back.hidden = mode === "home";
  $brand.hidden = true;   // home uses the white hero logo; inner pages show the back button
  $title.textContent = title;
  const base = t("appTitle", { boat: BOAT.name });
  document.title = title ? `${title} · ${BOAT.name}` : base;
  onScroll();
}

/* ---------- Search (current language + English keywords as a weak fallback) ---------- */
function search(q) {
  const terms = norm(q.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const out = [];
  for (const x of ALL) {
    const f = {
      title: norm(x.title + " " + (x.short || "")), kw: norm((x.kw || []).join(" ")), sec: norm(x.section.name),
      body: norm([x.summary, x.callout, ...(x.before || []), ...(x.steps || []), ...(x.safety || []), ...(x.items || []),
                  ...(x.tips || []).flatMap(p => [p.tag, p.title, p.text]),
                  ...(x.media || []).map(m => m.label), ...(x.stats || []).map(s => s.label)].filter(Boolean).map(plain).join(" ")),
      en: norm(x.enKw.join(" "))
    };
    let score = 0;
    const ok = terms.every(term => {
      const s = (f.title.includes(term) ? 10 : 0) + (f.kw.includes(term) ? 6 : 0) + (f.sec.includes(term) ? 3 : 0) +
                (f.body.includes(term) ? 2 : 0) + (f.en.includes(term) ? 1 : 0);
      score += s; return s > 0;
    });
    if (ok) out.push({ x, score: score + (hasContent(x) ? 1 : 0) });
  }
  return out.sort((a, b) => b.score - a.score);
}
const hl = (text, q) => {
  if (!q) return esc(text);
  const i = norm(text).indexOf(norm(q));
  return i < 0 ? esc(text) : esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
};

/* ---------- Shared bits ---------- */
function topicMeta(x) {
  const status = hasContent(x) ? (x.steps ? `<span class="ready">${esc(t("steps", { n: x.steps.length }))}</span>` : `<span class="ready">${esc(t("ready"))}</span>`)
                               : `<span class="soon">${esc(t("comingSoon"))}</span>`;
  return `${esc(t("type_" + x.type))} · ${status}`;
}
function topicRow(x, q = "", showSection = false) {
  return `<li><a class="row" href="#/t/${x.id}">
    <span class="ic ${x.type === "warning" ? "warn" : ""}">${ic(tIcon(x))}</span>
    <span class="tx"><span class="t">${hl(x.title, q)}</span><span class="m">${showSection ? esc(x.section.name) + " · " : ""}${topicMeta(x)}</span></span>
    <span class="chev">${ic("chev")}</span></a></li>`;
}
function mediaBlock(media) {
  if (!media || !media.length) return "";
  const grid = media.length > 2 && media.every(m => m.kind === "photo");
  return `<div class="media ${grid ? "grid" : ""}">${media.map(m => {
    const isV = m.kind === "video";
    const sub = t(isV ? "videoSoon" : m.kind === "diagram" ? "diagramSoon" : "photoSoon");
    return `<div class="ph ${isV ? "video" : ""}" role="img" aria-label="${esc(m.label)} — ${esc(sub)}">
      <span class="pc">${ic(isV ? "play" : m.kind === "diagram" ? "diagram" : "photo")}</span>
      <strong>${esc(m.label)}</strong><small>${esc(sub)}</small>${isV ? '<span class="dur">–:–</span>' : ""}</div>`;
  }).join("")}</div>`;
}
const tag = k => `<span class="ph-tag">${esc(t(k))}</span>`;

/* ---------- Home ---------- */
function viewHome() {
  setNav({ mode: "home" });
  $app.innerHTML = `
    <section class="hero" style="--hero:url('${BOAT.heroPhoto}')">
      <button class="hero-logo" id="heroLogo" aria-label="${esc(BOAT.company)}"><img src="logo-white.png" alt="${esc(BOAT.company)}" width="1000" height="745"></button>
      <div class="eyebrow">${esc(t("guestManual"))}</div>
      <h1 id="heroTitle">${esc(t("welcome"))}</h1>
      <p>${esc(BOAT.name)} · ${esc(BOAT.model)}</p>
    </section>
    <div class="search" role="search">
      <span class="s-ic">${ic("search")}</span>
      <input id="q" type="search" inputmode="search" autocomplete="off" enterkeyhint="search" placeholder="${esc(t("searchPlaceholder"))}"
             aria-label="${esc(t("searchPlaceholder"))}" value="${esc(query)}">
      <button class="clear" id="clearQ" aria-label="${esc(t("clearSearch"))}" ${query ? "" : "hidden"}>${ic("x")}</button>
    </div>
    <div id="homeBody"></div>`;
  const $q = document.getElementById("q"), $c = document.getElementById("clearQ");
  $q.addEventListener("input", () => { query = $q.value; $c.hidden = !query; renderHomeBody(); });
  $c.addEventListener("click", () => { query = ""; $q.value = ""; $c.hidden = true; renderHomeBody(); $q.focus(); });
  document.getElementById("heroTitle").addEventListener("click", secretTap);
  document.getElementById("heroLogo").addEventListener("click", secretTap);   // 5 quick taps → Owner settings
  renderHomeBody();
}
function stayMeta(x) {
  if (x.special === "wifi") return esc(BOAT.wifi.ssid);
  if (x.special === "checkin") return `${esc(BOAT.stay.checkIn)} · ${esc(BOAT.stay.checkOut)}`;
  if (x.special === "rules") return esc(t("draft"));
  if (x.special === "tips") return esc(t("comingSoon"));
  return "";
}
function renderHomeBody() {
  const $b = document.getElementById("homeBody"); if (!$b) return;
  const q = query.trim();
  if (q) {
    const res = search(q);
    $b.innerHTML = `<p class="meta-line">${esc(t("results", { n: res.length, q }))}</p>` +
      (res.length ? `<ul class="list">${res.map(r => topicRow(r.x, q, true)).join("")}</ul>` : `<div class="empty">${esc(t("noResults"))}</div>`);
    return;
  }
  const stay = SECTIONS.find(s => s.group === "stay");
  const contact = (BOAT.contactLinks || []).map(topicById).filter(Boolean);
  const man = MANUAL_SECS();
  $b.innerHTML = `
    <a class="sos-card" href="#/emergency" id="sosCard"><span class="sos-badge">SOS</span>
      <span class="tx"><b>${esc(t("sosCardTitle"))}</b><small>${esc(t("sosCardSub"))}</small></span><span class="chev">${ic("chev")}</span></a>
    ${stay ? `<div class="sec-head"><h2>${esc(stay.name)}</h2><span>${esc(BOAT.name)}</span></div>
    <div class="tiles">${stay.topics.map(x => `<a class="tile" href="#/t/${x.id}"><span class="ic">${ic(tIcon(x))}</span>
      <span class="t">${esc(x.short || x.title)}</span><span class="m">${stayMeta(x)}</span></a>`).join("")}</div>` : ""}
    ${contact.length ? `<div class="sec-head"><h2>${esc(t("contactUs"))}</h2><span>${esc(t("viaWhatsApp"))}</span></div>
    <ul class="list">${contact.map(x => `<li><a class="row" href="#/t/${x.id}"><span class="ic">${ic(tIcon(x))}</span>
      <span class="tx"><span class="t">${esc(x.short || x.title)}</span><span class="m">${esc(x.summary || "")}</span></span>
      <span class="chev">${ic("chev")}</span></a></li>`).join("")}</ul>` : ""}
    <div class="sec-head"><h2>${esc(t("sections"))}</h2><span>${esc(t("sternToBow"))}</span></div>
    <ul class="list">${man.map(s => `<li><a class="row" href="#/s/${s.id}">
      <span class="ic">${ic(s.icon)}</span>
      <span class="tx"><span class="t">${esc(s.name)}</span><span class="m">${esc(t("topics", { n: s.topics.length }))}${s.subtitle ? " · " + esc(s.subtitle) : ""}</span></span>
      <span class="chev">${ic("chev")}</span></a></li>`).join("")}</ul>
    ${BOAT.gallery?.length ? `<div class="sec-head"><h2>${esc(t("onBoard"))}</h2><span>${esc(BOAT.name)}</span></div>
    <div class="gallery">${BOAT.gallery.map(g => `<figure><img src="${g.src}" alt="${esc(local(g.caption))}" loading="lazy" decoding="async"><figcaption>${esc(local(g.caption))}</figcaption></figure>`).join("")}</div>` : ""}
    <p class="foot">${esc(t("footer"))}</p>`;
}

/* ---------- Section ---------- */
function viewSection(id) {
  const s = secById(id); if (!s) return viewNotFound();
  setNav({ mode: "page", title: s.name });
  const man = MANUAL_SECS(), i = man.indexOf(s);
  $app.innerHTML = `
    <div class="page-head">
      <div class="sec-ic">${ic(s.icon)}</div>
      <div class="eyebrow">${i >= 0 ? esc(t("sectionOf", { i: i + 1, n: man.length })) : esc(BOAT.name)}</div>
      <h1>${esc(s.name)}</h1>
      <p>${esc(t("topics", { n: s.topics.length }))}${s.subtitle ? " · " + esc(s.subtitle) : ""}</p>
    </div>
    <div style="height:18px"></div>
    <ul class="list">${s.topics.map(x => topicRow(x)).join("")}</ul>`;
}

/* ---------- Topic ---------- */
const SPECIAL = {
  breakage: [breakageUI, bindBreakage], mayday: [() => maydayUI(true), null], wifi: [wifiUI, bindWifi],
  checkin: [checkinUI, null], rules: [rulesUI, null], tips: [tipsUI, null],
  problem: [problemUI, bindProblem], ask: [askUI, bindAsk], feedback: [feedbackUI, bindFeedback]
};
function viewTopic(id) {
  const x = topicById(id); if (!x) return viewNotFound();
  const s = x.section;
  setNav({ mode: "page", title: x.title });
  const kinds = [...new Set((x.media || []).map(m => m.kind))];
  const chips = [`<span class="chip">${ic(TYPE_ICON[x.type] || "guide")}${esc(t("type_" + x.type))}</span>`,
    ...kinds.filter(k => k !== x.type && !(k === "photo" && x.type === "photo")).map(k => `<span class="chip">${ic(k === "video" ? "play" : k)}${esc(t("kind_" + k))}</span>`)];
  const sp = SPECIAL[x.special];
  let body = sp ? sp[0](x) : "";
  if (x.callout) body += `<div class="block"><div class="callout" role="note"><span class="ci">${ic("alert")}</span><div><h3>${esc(t("warning"))}</h3><p>${rich(x.callout)}</p></div></div></div>`;
  if (x.stats) body += `<div class="block"><div class="stats">${x.stats.map(v => `<div class="stat ${v.total ? "total" : ""}"><b>${v.n}</b><span>${esc(v.label)}</span></div>`).join("")}</div></div>`;
  if (x.items && !["checkin", "rules"].includes(x.special)) body += `<div class="block"><h2>${esc(t("whatsIn"))}</h2><ul class="card items">${x.items.map(v => `<li><span class="dot"></span><span>${rich(v)}</span></li>`).join("")}</ul></div>`;
  const key = "progress:" + x.id, st = store.get(key, { before: [], steps: [] });
  if (x.before) body += `<div class="block"><h2>${esc(t("beforeStart"))}</h2><div class="card">${x.before.map((b, i) =>
      `<button class="tick" data-k="before" data-i="${i}" aria-pressed="${st.before.includes(i)}"><span class="cb">${ic("check")}</span><span class="tx">${rich(b)}</span></button>`).join("")}</div></div>`;
  if (x.steps) body += `<div class="block"><h2>${esc(t("steps"))} <span class="prog" id="prog"></span></h2><div class="bar"><i id="bar"></i></div>
      <ol class="card steps">${x.steps.map((v, i) => `<li><button class="step" data-k="steps" data-i="${i}" aria-pressed="${st.steps.includes(i)}"><span class="n"><b>${i + 1}</b>${ic("check")}</span><span class="tx">${rich(v)}</span></button></li>`).join("")}</ol>
      <p class="hint">${esc(t("tapStep"))}</p></div>`;
  if (x.safety) body += `<div class="block"><div class="callout" role="note"><span class="ci">${ic("alert")}</span><div><h3>${esc(t("safetyTips"))}</h3><ul>${x.safety.map(v => `<li>${rich(v)}</li>`).join("")}</ul></div></div></div>`;
  if (!hasContent(x) && !x.media) body += `<div class="soon-card"><div class="ci">${ic("clock")}</div><h3>${esc(t("contentSoon"))}</h3><p>${esc(t("contentSoonText"))}</p></div>`;
  const idx = s.topics.indexOf(x), next = s.topics[idx + 1];
  $app.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">${esc(s.name)}</div>
      <h1>${esc(x.title)}</h1>
      ${x.summary ? `<p>${esc(x.summary)}</p>` : ""}
      <div class="chips">${chips.join("")}</div>
    </div>
    ${mediaBlock(x.media)}
    ${body}
    ${next ? `<a class="pager" href="#/t/${next.id}"><span class="tx"><small>${esc(t("nextIn", { s: s.name }))}</small><span>${esc(next.title)}</span></span><span class="chev">${ic("chev")}</span></a>` : ""}`;
  const update = () => {
    if (!x.steps) return;
    document.getElementById("prog").textContent = t("progress", { a: st.steps.length, b: x.steps.length });
    document.getElementById("bar").style.width = (st.steps.length / x.steps.length * 100) + "%";
  };
  $app.querySelectorAll("button[data-k]").forEach(b => b.addEventListener("click", e => {
    if (e.target.closest("[data-link]")) return;
    const arr = st[b.dataset.k], i = +b.dataset.i, at = arr.indexOf(i);
    at >= 0 ? arr.splice(at, 1) : arr.push(i);
    b.setAttribute("aria-pressed", at < 0); if (navigator.vibrate) navigator.vibrate(8);
    store.set(key, st); update();
  }));
  update();
  if (sp && sp[1]) sp[1](x);
}

/* ---------- Mayday ---------- */
const radioVars = () => ({ boat: BOAT.name, callSign: BOAT.radio.callSign, mmsi: BOAT.radio.mmsi, model: BOAT.model });
function maydayUI(withTag) {
  return `<div class="block" id="mayday"><h2>${esc(t("maydayHead"))} ${withTag ? tag("placeholder") : ""}</h2>
    <ol class="card script">${t("mayday").map(line => `<li><span>${rich(line, radioVars())}</span></li>`).join("")}</ol>
    <p class="hint">${esc(t("maydayHint"))}${isMock("callSign") || isMock("mmsi") ? " " + esc(t("callSign")) + "/MMSI: " + esc(t("mock")) + "." : ""}</p></div>`;
}

/* ---------- Stay info ---------- */
function wifiUI() {
  const row = (k, label, val, icon) => `<div class="kv"><span class="ci">${ic(icon)}</span><span class="tx"><small>${esc(label)}${mockTag(k)}</small>
      <b class="mono" id="wifi-${k}">${esc(val)}</b></span><button class="copy" data-copy="${esc(val)}" aria-label="${esc(t("copy"))}: ${esc(label)}">${ic("copy")}<span>${esc(t("copy"))}</span></button></div>`;
  return `<div class="block"><div class="card">${row("ssid", t("wifiNetwork"), BOAT.wifi.ssid, "wifi")}${row("password", t("wifiPassword"), BOAT.wifi.password, "key")}</div>
    <p class="hint">${esc(t("wifiHint"))}</p></div>`;
}
async function copyText(v) {
  try { await navigator.clipboard.writeText(v); return true; } catch {}
  try { const ta = Object.assign(document.createElement("textarea"), { value: v }); ta.style.cssText = "position:fixed;opacity:0";
        document.body.appendChild(ta); ta.select(); const ok = document.execCommand("copy"); ta.remove(); return ok; } catch { return false; }
}
function bindWifi() {
  $app.querySelectorAll("[data-copy]").forEach(b => b.onclick = async () => {
    const ok = await copyText(b.dataset.copy);
    toast(ok ? t("copied") : t("copyFailed"));
    if (ok) { b.classList.add("done"); b.querySelector("span").textContent = t("copied"); setTimeout(() => { b.classList.remove("done"); b.querySelector("span").textContent = t("copy"); }, 1800); }
  });
}
function checkinUI(x) {
  return `<div class="block"><div class="times">
      <div class="time"><small>${esc(t("checkIn"))}</small><b>${esc(t("from", { t: BOAT.stay.checkIn }))}</b>${mockTag("checkIn")}</div>
      <div class="time"><small>${esc(t("checkOut"))}</small><b>${esc(t("by", { t: BOAT.stay.checkOut }))}</b>${mockTag("checkOut")}</div></div></div>
    ${x.items ? `<div class="block"><h2>${esc(t("rules"))} ${tag("draft")}</h2><ul class="card items">${x.items.map(v => `<li><span class="dot"></span><span>${rich(v)}</span></li>`).join("")}</ul></div>` : ""}`;
}
function rulesUI(x) {
  return `<div class="block"><h2>${esc(x.short || x.title)} ${tag("draft")}</h2><ol class="card rules">${(x.items || []).map(v => `<li><span>${rich(v)}</span></li>`).join("")}</ol></div>`;
}
function tipsUI(x) {
  return `<div class="block"><div class="tips">${(x.tips || []).map(p => `<div class="tip"><div class="tip-top"><span class="tip-tag">${esc(p.tag)}</span>${tag("example")}</div>
      <h3>${esc(p.title)}</h3><p>${esc(p.text)}</p></div>`).join("")}</div></div>`;
}

/* ---------- Forms → WhatsApp ---------- */
const sendBlock = (id, label = t("sendWa")) => `<div class="block"><button class="btn wa" id="${id}">${ic("chat")}${esc(label)}</button>
  <p class="note">${ic("info")}<span>${esc(t("waNote"))}</span></p></div>`;
const dangerNote = () => `<p class="hint center">${rich(t("dangerHint"))}</p>`;

const BREAK_ITEMS = [{ id: "cutlery", icon: "cutlery" }, { id: "bowls", icon: "bowl" }, { id: "dishes", icon: "plate" }, { id: "glasses", icon: "glass" }];
const breakState = Object.fromEntries(BREAK_ITEMS.map(b => [b.id, 0]));
function breakageUI() {
  return `<div class="block"><h2>${esc(t("whatBroke"))}</h2><div class="card">${BREAK_ITEMS.map(b => { const lb = t("item_" + b.id); return `
    <div class="counter"><span class="ci">${ic(b.icon)}</span><span class="tx">${esc(lb)}</span>
      <div class="stepper"><button data-dec="${b.id}" aria-label="${esc(t("fewer", { x: lb }))}">${ic("minus")}</button>
      <output id="c-${b.id}">${breakState[b.id]}</output>
      <button data-inc="${b.id}" aria-label="${esc(t("more", { x: lb }))}">${ic("plus")}</button></div></div>`; }).join("")}</div></div>
    <div class="block"><h2>${esc(t("note"))} <span class="prog" style="color:var(--faint)">${esc(t("optional"))}</span></h2>
      <textarea class="textarea" id="bNote" placeholder="${esc(t("notePh"))}"></textarea></div>
    ${sendBlock("sendReport", t("sendReport"))}
    <p class="hint center">${esc(t("noCharge"))}</p>`;
}
function bindBreakage() {
  const total = () => Object.values(breakState).reduce((a, b) => a + b, 0);
  const sync = () => {
    BREAK_ITEMS.forEach(b => {
      document.getElementById("c-" + b.id).textContent = breakState[b.id];
      $app.querySelector(`[data-dec="${b.id}"]`).disabled = breakState[b.id] === 0;
    });
    document.getElementById("sendReport").disabled = total() === 0;
  };
  $app.querySelectorAll("[data-inc]").forEach(b => b.onclick = () => { breakState[b.dataset.inc]++; sync(); });
  $app.querySelectorAll("[data-dec]").forEach(b => b.onclick = () => { breakState[b.dataset.dec] = Math.max(0, breakState[b.dataset.dec] - 1); sync(); });
  document.getElementById("sendReport").onclick = () => {
    const note = document.getElementById("bNote").value.trim();
    const lines = BREAK_ITEMS.filter(b => breakState[b.id]).map(b => `• ${breakState[b.id]} × ${t("item_" + b.id, {}, CFG.messageLang)}`);
    const msg = `${tm("breakage", { boat: BOAT.name })}\n${lines.join("\n")}${note ? `\n${tm("note")}: ${note}` : ""}${guestLangLine()}`;
    toast(t("opening")); openWhatsApp(msg);
  };
  sync();
}
const CATS = ["engine", "electrics", "water", "toilet", "gas", "sails", "dinghy", "anchor", "other"];
function problemUI() {
  return `<div class="block"><h2>${esc(t("problemCategory"))}</h2>
      <div class="select"><select id="pCat" aria-label="${esc(t("problemCategory"))}">${CATS.map(c => `<option value="${c}">${esc(t("cat_" + c))}</option>`).join("")}</select>${ic("down")}</div></div>
    <div class="block"><h2>${esc(t("problemDetails"))}</h2><textarea class="textarea" id="pText" placeholder="${esc(t("problemPh"))}"></textarea></div>
    ${sendBlock("sendProblem")}${dangerNote()}`;
}
function bindProblem() {
  document.getElementById("sendProblem").onclick = () => {
    const txt = document.getElementById("pText").value.trim(), cat = document.getElementById("pCat").value;
    if (!txt) { toast(t("needText")); document.getElementById("pText").focus(); return; }
    toast(t("opening"));
    openWhatsApp(`${tm("problem", { boat: BOAT.name })}\n${tm("category")}: ${t("cat_" + cat, {}, CFG.messageLang)}\n\n${txt}${guestLangLine()}`);
  };
}
function askUI() {
  return `<div class="block"><h2>${esc(t("askLabel"))}</h2><textarea class="textarea tall" id="aText" placeholder="${esc(t("askPh"))}"></textarea></div>${sendBlock("sendAsk")}`;
}
function bindAsk() {
  document.getElementById("sendAsk").onclick = () => {
    const txt = document.getElementById("aText").value.trim();
    if (!txt) { toast(t("needText")); document.getElementById("aText").focus(); return; }
    toast(t("opening")); openWhatsApp(`${tm("question", { boat: BOAT.name })}\n\n${txt}${guestLangLine()}`);
  };
}
let rating = 0;
function feedbackUI() {
  return `<div class="block"><h2>${esc(t("rateLabel"))}</h2><div class="card stars-card"><div class="stars" role="radiogroup" aria-label="${esc(t("rateLabel"))}">
      ${[1, 2, 3, 4, 5].map(n => `<button role="radio" data-star="${n}" aria-checked="${n === rating}" aria-label="${esc(t("star", { n }))}">${ic("star")}</button>`).join("")}</div></div></div>
    <div class="block"><h2>${esc(t("commentsLabel"))}</h2><textarea class="textarea tall" id="fText" placeholder="${esc(t("commentsPh"))}"></textarea></div>
    <div class="block"><h2>${esc(t("nameLabel"))} <span class="prog" style="color:var(--faint)">${esc(t("optional"))}</span></h2>
      <input class="input" id="fName" autocomplete="name"></div>
    ${sendBlock("sendFeedback")}<p class="hint center">${esc(t("feedbackThanks"))}</p>`;
}
function bindFeedback() {
  const draw = () => $app.querySelectorAll("[data-star]").forEach(b => { const n = +b.dataset.star; b.classList.toggle("on", n <= rating); b.setAttribute("aria-checked", n === rating); });
  $app.querySelectorAll("[data-star]").forEach(b => b.onclick = () => { rating = +b.dataset.star; if (navigator.vibrate) navigator.vibrate(8); draw(); });
  draw();
  document.getElementById("sendFeedback").onclick = () => {
    if (!rating) { toast(t("needRating")); return; }
    const txt = document.getElementById("fText").value.trim(), name = document.getElementById("fName").value.trim();
    toast(t("opening"));
    openWhatsApp(`${tm("feedback", { boat: BOAT.name })}\n${tm("rating")}: ${"★".repeat(rating)}${"☆".repeat(5 - rating)} (${rating}/5)${txt ? "\n\n" + txt : ""}${name ? `\n${tm("name")}: ${name}` : ""}${guestLangLine()}`);
  };
}

/* ---------- Emergency ---------- */
function viewEmergency() {
  setNav({ mode: "page", title: t("emergency") });
  const c = BOAT.contacts, r = BOAT.radio, base = local(c.baseName);
  const safety = secById("safety");
  $app.innerHTML = `
    <div class="page-head"><div class="eyebrow" style="color:var(--red)">${esc(t("emergency"))}</div><h1>${esc(t("stayCalm")).replace("\n", "<br>")}</h1>
      <p>${esc(t("lifejacketsOn"))}</p></div>
    <div class="block"><button class="sos-send" id="sosSend"><span class="ci">${ic("locate")}</span>
      <span class="tx"><b>${esc(t("sosSend"))}</b><small>${esc(t("sosSendSub"))}</small></span></button>
      <p class="hint">${esc(t("sosNote"))}</p></div>
    <div class="block"><div class="card">
      <a class="action red" href="tel:112"><span class="ci">${ic("phone")}</span><span class="tx"><b>${esc(t("call112"))}</b><small>${esc(t("eu112"))}</small></span><span class="chev">${ic("chev")}</span></a>
      <a class="action" href="tel:108"><span class="ci">${ic("buoy")}</span><span class="tx"><b>${esc(t("call108"))}</b><small>${esc(t("coastGuard"))}</small></span><span class="chev">${ic("chev")}</span></a>
      <a class="action" id="callBase" href="${telHref(c.basePhone)}"><span class="ci">${ic("phone")}</span><span class="tx"><b>${esc(t("callBase", { base }))}</b><small>${esc(c.basePhone)}${mockTag("basePhone")}</small></span><span class="chev">${ic("chev")}</span></a>
      <a class="action" href="#/emergency" data-scroll="mayday"><span class="ci">${ic("radio")}</span><span class="tx"><b>${esc(t("maydayVhf"))}</b><small>${esc(t("maydaySub"))}</small></span><span class="chev">${ic("chev")}</span></a>
    </div></div>
    <div class="block"><h2>${esc(t("yourBoat"))}</h2><div class="idgrid">
      <div class="id wide"><small>${esc(t("boatName"))}</small><b>${esc(BOAT.name)}</b><span>${esc(BOAT.model)}</span></div>
      <div class="id"><small>${esc(t("callSign"))}${mockTag("callSign")}</small><b class="mono">${esc(r.callSign)}</b></div>
      <div class="id"><small>${esc(t("mmsi"))}${mockTag("mmsi")}</small><b class="mono">${esc(r.mmsi)}</b></div>
    </div></div>
    <div class="block"><div class="vhf"><div class="vhf-head"><span class="ch">${esc(String(r.vhfChannel))}</span><div><small>VHF</small><b>${esc(t("vhfHead"))}</b></div></div>
      <ul>${t("vhfTips").map(v => `<li>${rich(v)}</li>`).join("")}</ul></div></div>
    ${maydayUI(false)}
    ${safety ? `<div class="sec-head"><h2>${esc(t("safety"))}</h2><span>${esc(t("moreHelp"))}</span></div>
    <ul class="list">${safety.topics.filter(x => x.id !== "mayday").map(x => topicRow(x)).join("")}</ul>` : ""}`;
  document.getElementById("sosSend").onclick = openSosSheet;
  $app.querySelector("[data-scroll]").onclick = e => { e.preventDefault(); document.getElementById("mayday").scrollIntoView({ behavior: "smooth", block: "start" }); };
}

/* SOS: confirm sheet with press-and-hold → geolocation → WhatsApp */
const HOLD_MS = 2000;
let sheetEl = null;
function closeSheet() { if (!sheetEl) return; const el = sheetEl; sheetEl = null; el.classList.remove("open"); setTimeout(() => el.remove(), 220); document.body.classList.remove("no-scroll"); }
function openSosSheet() {
  closeSheet();
  const el = document.createElement("div");
  el.className = "sheet-wrap"; el.id = "sosSheet";
  el.innerHTML = `<div class="backdrop" data-close></div>
    <div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sosTitle">
      <div class="grab"></div>
      <div class="sheet-ic">${ic("locate")}</div>
      <h2 id="sosTitle">${esc(t("sosConfirmTitle"))}</h2>
      <p>${esc(t("sosConfirmText"))}</p>
      <div class="to">${ic("chat")}<span>WhatsApp · ${esc(ownerWa())}</span>${mockTag("ownerWhatsApp")}</div>
      <div id="sosStage">
        <button class="hold" id="holdBtn" aria-describedby="holdHint"><span class="lbl">${esc(t("holdToSend"))}</span><i class="fillbar" aria-hidden="true"><span class="lbl">${esc(t("holdToSend"))}</span></i></button>
        <p class="hint center" id="holdHint">${esc(t("holdHint"))}</p>
      </div>
      <button class="btn ghost" data-close id="sosCancel">${esc(t("cancel"))}</button>
    </div>`;
  document.body.appendChild(el); document.body.classList.add("no-scroll"); sheetEl = el;
  requestAnimationFrame(() => el.classList.add("open"));
  el.querySelectorAll("[data-close]").forEach(b => b.onclick = closeSheet);
  const btn = el.querySelector("#holdBtn"), bar = btn.querySelector(".fillbar");
  let timer = null, raf = null, t0 = 0, fired = false;
  const tick = () => { const p = Math.min(1, (performance.now() - t0) / HOLD_MS); bar.style.clipPath = `inset(0 ${(1 - p) * 100}% 0 0)`; if (p < 1) raf = requestAnimationFrame(tick); };
  const start = e => {
    if (fired || timer) return; if (e) e.preventDefault();
    t0 = performance.now(); btn.classList.add("holding"); if (navigator.vibrate) navigator.vibrate(15);
    raf = requestAnimationFrame(tick);
    timer = setTimeout(() => { fired = true; cancelAnimationFrame(raf); bar.style.clipPath = "inset(0 0 0 0)"; if (navigator.vibrate) navigator.vibrate([40, 60, 40]); sendSos(); }, HOLD_MS);
  };
  const stop = () => { if (fired) return; clearTimeout(timer); timer = null; cancelAnimationFrame(raf); btn.classList.remove("holding"); bar.style.clipPath = ""; };
  btn.addEventListener("pointerdown", start);
  ["pointerup", "pointerleave", "pointercancel"].forEach(ev => btn.addEventListener(ev, stop));
  btn.addEventListener("contextmenu", e => e.preventDefault());
  btn.addEventListener("keydown", e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) start(e); });
  btn.addEventListener("keyup", e => { if (e.key === " " || e.key === "Enter") stop(); });
  btn.addEventListener("click", e => e.preventDefault());
  setTimeout(() => btn.focus(), 50);
}
function getPosition() {
  return new Promise(resolve => {
    if (!("geolocation" in navigator)) return resolve({ error: "not supported" });
    navigator.geolocation.getCurrentPosition(p => resolve({ pos: p }),
      e => resolve({ error: ({ 1: "permission denied", 2: "position unavailable", 3: "timeout" })[e.code] || "error" }),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
  });
}
function sosMessage(res) {
  const now = new Date(), off = -now.getTimezoneOffset(), sign = off >= 0 ? "+" : "-";
  const offStr = `UTC${sign}${Math.floor(Math.abs(off) / 60)}${Math.abs(off) % 60 ? ":" + String(Math.abs(off) % 60).padStart(2, "0") : ""}`;
  const when = now.toLocaleString((I18N[CFG.messageLang] || I18N.en).locale, { dateStyle: "medium", timeStyle: "short" });
  const r = BOAT.radio;
  const lines = [tm("sos", { boat: BOAT.name }), `${BOAT.model} · ${tm("callSign")} ${r.callSign} · MMSI ${r.mmsi}`];
  if (res.pos) {
    const { latitude: la, longitude: lo, accuracy: acc } = res.pos.coords, ll = `${la.toFixed(5)},${lo.toFixed(5)}`;
    lines.push(`${tm("position")}: ${la.toFixed(5)}, ${lo.toFixed(5)} (${tm("accuracy", { m: Math.round(acc) })})`,
               `${tm("map")}: https://www.google.com/maps?q=${ll}`);
  } else lines.push(tm("noLocation", { reason: res.error }));
  lines.push(`${tm("time")}: ${when} (${offStr})`);
  if (lang !== CFG.messageLang) lines.push(`${tm("guestLang")}: ${L().name}`);
  lines.push(tm("sosFooter", { boat: BOAT.name }));
  return lines.join("\n");
}
async function sendSos() {
  const stage = document.getElementById("sosStage"); if (!stage) return;
  stage.innerHTML = `<div class="locating"><span class="spin"></span>${esc(t("locating"))}</div>`;
  const res = await getPosition();
  if (res.error) toast(t("locFailed"));
  const url = openWhatsApp(sosMessage(res));
  const st = document.getElementById("sosStage"); if (!st) return;
  st.innerHTML = `<div class="sos-done">${ic("check")}<span>${esc(t("waOpened"))}</span></div>
    ${res.error ? `<p class="hint center">${esc(t("locFailed"))}</p>` : ""}
    <a class="btn wa" id="waAgain" href="${esc(url)}" target="_blank" rel="noopener">${ic("chat")}${esc(t("openWaAgain"))}</a>`;
  const c = document.getElementById("sosCancel"); if (c) c.textContent = t("close");
}

/* ---------- Owner settings (hidden: 5 quick taps on logo / title) ---------- */
let taps = [];
function secretTap() {
  const now = Date.now(); taps = taps.filter(v => now - v < 1800); taps.push(now);
  if (taps.length >= 5) { taps = []; location.hash = "#/owner"; }
}
$brand.addEventListener("click", secretTap);
let ownerUnlocked = false;
function viewOwner() {
  if (!ownerUnlocked) return viewPin();
  setNav({ mode: "page", title: t("ownerSettings") });
  const c = BOAT.contacts, r = BOAT.radio, w = BOAT.wifi, s = BOAT.stay;
  const cfgRow = (label, val, k) => `<div class="cfg"><span>${esc(label)}</span><b>${esc(val)}${k ? mockTag(k) : ""}</b></div>`;
  $app.innerHTML = `
    <div class="page-head"><div class="sec-ic">${ic("gear")}</div><div class="eyebrow">${esc(t("ownerOnly"))}</div><h1>${esc(t("ownerSettings"))}</h1>
      <p>${esc(t("ownerHidden"))}</p></div>
    <div class="block"><h2>${esc(t("waHead"))}</h2><div class="card">
      <div class="field"><label for="wa">${esc(t("waLabel"))}</label>
        <input id="wa" type="tel" inputmode="tel" autocomplete="off" placeholder="${esc(c.ownerWhatsApp)}" value="${esc(waOverride())}">
        <div class="help">${esc(t("waHelp", { def: c.ownerWhatsApp }))}</div>
        <div class="inuse" id="waInUse">${esc(t("inUse", { n: ownerWa() }))}${mockTag("ownerWhatsApp")}</div></div>
    </div></div>
    <div class="block row2"><button class="btn" id="saveOwner">${esc(t("save"))}</button><button class="btn ghost" id="resetOwner">${esc(t("useDefault"))}</button></div>
    <div class="block"><h2>${esc(t("configHead"))} · ${esc(BOAT.id)}</h2><div class="card cfgs">
      ${cfgRow(t("boatName"), BOAT.name)}${cfgRow(t("model"), BOAT.model)}
      ${cfgRow(t("callBase", { base: local(c.baseName) }), c.basePhone, "basePhone")}
      ${cfgRow(t("callSign"), r.callSign, "callSign")}${cfgRow(t("mmsi"), r.mmsi, "mmsi")}
      ${cfgRow("Wi-Fi · " + t("wifiNetwork"), w.ssid, "ssid")}${cfgRow("Wi-Fi · " + t("wifiPassword"), w.password, "password")}
      ${cfgRow(t("checkIn"), s.checkIn, "checkIn")}${cfgRow(t("checkOut"), s.checkOut, "checkOut")}
    </div><p class="hint">${esc(t("configNote", { id: BOAT.id }))}</p></div>
    <div class="soon-card"><div class="ci">${ic("gear")}</div><h3>${esc(t("moreOwnerSoon"))}</h3><p>${esc(t("moreOwnerSoonText"))}</p></div>
    <div class="block"><button class="btn ghost" id="lockOwner">${ic("lock")}${esc(t("lock"))}</button></div>`;
  document.getElementById("saveOwner").onclick = () => {
    const v = document.getElementById("wa").value.trim();
    if (v && (digits(v).length < 8 || digits(v).length > 15)) { toast(t("invalidNumber")); return; }
    if (v) store.set(WA_KEY, v); else { store.del(WA_KEY); store.del("owner:whatsapp"); }
    toast(t("saved")); viewOwner();
  };
  document.getElementById("resetOwner").onclick = () => { store.del(WA_KEY); store.del("owner:whatsapp"); toast(t("saved")); viewOwner(); };
  document.getElementById("lockOwner").onclick = () => { ownerUnlocked = false; location.hash = "#/"; };
}
function viewPin() {
  setNav({ mode: "page", title: t("ownerAccess") });
  let pin = "";
  $app.innerHTML = `<div class="pin-wrap"><div class="ci">${ic("lock")}</div><h1>${esc(t("ownerAccess"))}</h1><p>${esc(t("enterPin"))}</p>
    <div class="dots" id="dots">${"<i></i>".repeat(4)}</div><div class="pin-msg" id="pinMsg"></div>
    <div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button data-d="${n}">${n}</button>`).join("")}
      <button class="blank" tabindex="-1" aria-hidden="true"></button><button data-d="0">0</button>
      <button class="del" id="pinDel" aria-label="${esc(t("del"))}">${ic("del")}</button></div></div>`;
  const $dots = document.getElementById("dots"), $msg = document.getElementById("pinMsg");
  const draw = () => [...$dots.children].forEach((d, i) => d.classList.toggle("on", i < pin.length));
  $app.querySelectorAll("[data-d]").forEach(b => b.onclick = () => {
    if (pin.length >= 4) return; pin += b.dataset.d; $msg.textContent = ""; $dots.classList.remove("err"); draw();
    if (pin.length === 4) setTimeout(() => {
      if (pin === CFG.ownerPin) { ownerUnlocked = true; viewOwner(); }
      else { $dots.classList.add("err"); $msg.textContent = t("incorrectPin"); pin = ""; draw(); }
    }, 150);
  });
  document.getElementById("pinDel").onclick = () => { pin = pin.slice(0, -1); draw(); };
}

function viewNotFound() {
  setNav({ mode: "page", title: t("notFound") });
  $app.innerHTML = `<div class="soon-card"><div class="ci">${ic("search")}</div><h3>${esc(t("notFound"))}</h3><p><a href="#/">${esc(t("backToManual"))}</a></p></div>`;
}

/* ---------- Router ---------- */
function route(scrollTop = true) {
  closeSheet();
  const [, view, id] = (location.hash || "#/").replace(/^#/, "").split("/");
  if (!view) viewHome();
  else if (view === "s") viewSection(id);
  else if (view === "t") viewTopic(id);
  else if (view === "emergency") viewEmergency();
  else if (view === "owner") viewOwner();
  else viewNotFound();
  if (view && scrollTop) window.scrollTo(0, 0);
  onScroll();
}
function onScroll() {
  const y = window.scrollY, home = $nav.classList.contains("overlay");
  $nav.classList.toggle("scrolled", home ? y > 300 : y > 4);
  $nav.classList.toggle("show-title", !home && y > 70);
}
window.addEventListener("scroll", onScroll, { passive: true });
$back.addEventListener("click", () => (history.length > 1 ? history.back() : (location.hash = "#/")));
window.addEventListener("hashchange", () => route());

buildModel(); renderChrome(); route();

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
