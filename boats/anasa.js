/* Boat config: Anasa — Fountaine Pajot Isla 40.
 *
 * ⚠️ Values marked  // TBD MOCKUP  are PLACEHOLDERS, not real data. Replace them before guests use the app.
 * The app shows a "Mockup" tag next to every value listed in `mock` below.
 *
 * Structure only lives here (ids, icons, types, media kinds, numbers). The words for each section/topic
 * come from lang/<code>.js (topics[id]); boat-specific wording can be overridden per language in `content`.
 */
BOATS.anasa = {
  id: "anasa",
  name: "Anasa",
  company: "Anasa Experiences",
  model: "Fountaine Pajot Isla 40",
  heroPhoto: "img/boat-above.jpg",
  gallery: [
    { src: "img/boat-headland.jpg", caption: { en: "By the headland", el: "Δίπλα στο ακρωτήρι", bg: "До носа", de: "Am Kap" } },
    { src: "img/boat-side.jpg", caption: { en: "Turquoise water", el: "Τιρκουάζ νερά", bg: "Тюркоазена вода", de: "Türkisblaues Wasser" } }
  ],
  contacts: {
    ownerWhatsApp: "+30 690 000 0000",   // TBD MOCKUP — owner WhatsApp (can be overridden on a device in Owner settings)
    basePhone: "+30 210 000 0000",       // TBD MOCKUP — base / charter office phone
    baseName: { en: "Charter base", el: "Βάση ναύλωσης", bg: "Чартърна база", de: "Charterbasis" }
  },
  radio: {
    callSign: "SV-XXXX",                 // TBD MOCKUP — VHF call sign
    mmsi: "239 000 000",                 // TBD MOCKUP — MMSI (9 digits)
    vhfChannel: 16
  },
  wifi: {
    ssid: "Anasa-Guest-MOCK",            // TBD MOCKUP — Wi-Fi network name
    password: "mock-password-123"        // TBD MOCKUP — Wi-Fi password
  },
  stay: {
    checkIn: "17:00",                    // TBD MOCKUP — check-in time
    checkOut: "09:00"                    // TBD MOCKUP — check-out time
  },
  // Keys of values above that are still placeholders (shown with a "Mockup" tag in the app)
  mock: ["ownerWhatsApp", "basePhone", "callSign", "mmsi", "ssid", "password", "checkIn", "checkOut"],

  /* Sections. `group`: "manual" (stern → bow list), "stay" (Your stay tiles), "contact" (Contact us list).
   * Topic fields: id, type, special?, media: [kinds], stats: [{ n, total? }]. Text lives in lang files. */
  sections: [
    { id: "stay", group: "stay", icon: "home", topics: [
      { id: "wifi", type: "info", special: "wifi", icon: "wifi" },
      { id: "checkin", type: "info", special: "checkin", icon: "clock" },
      { id: "house-rules", type: "info", special: "rules", icon: "list" },
      { id: "local-tips", type: "info", special: "tips", icon: "pin" },
      { id: "damage-checkin", type: "form", special: "damage", icon: "clipboard" }   // v9: shown as its own home card, not a tile
    ] },
    { id: "contact", group: "contact", icon: "chat", topics: [
      { id: "chat", type: "form", special: "chat", icon: "chat" },   // v10: in-app chat (#/chat), shown as its own card
      { id: "report-problem", type: "form", special: "problem", icon: "wrench" },
      { id: "ask", type: "form", special: "ask", icon: "chat" },
      { id: "feedback", type: "form", special: "feedback", icon: "star" }
    ] },
    { id: "dinghy", icon: "dinghy", topics: [
      { id: "lower-dinghy", type: "guide", media: ["photo"] },
      { id: "start-outboard", type: "guide" },
      { id: "refuel-outboard", type: "guide" },
      { id: "fuel-canister", type: "location" },
      { id: "outboard-trouble", type: "guide" }
    ] },
    { id: "stern", icon: "propeller", topics: [
      { id: "stern-diagram", type: "diagram", media: ["diagram"] },
      { id: "prop-warning", type: "warning" },
      { id: "tiller-location", type: "location" },
      { id: "tiller-use", type: "guide", media: ["video", "photo"] }
    ] },
    { id: "fenders", icon: "fender", topics: [
      { id: "fender-count", type: "info", stats: [{ n: 12, total: true }, { n: 8 }, { n: 2 }, { n: 2 }] },
      { id: "fender-photos", type: "photo", media: ["photo", "photo", "photo"] },
      { id: "fender-tie", type: "video", media: ["video"] }
    ] },
    { id: "sailing", icon: "sail", topics: [
      { id: "jammers", type: "video", media: ["video"] },
      { id: "genoa", type: "video", media: ["video"] },
      { id: "reef", type: "guide" }
    ] },
    { id: "helm", icon: "helm", topics: [
      { id: "helm-overview", type: "video", media: ["video"] },
      { id: "plotter", type: "video", media: ["video"] },
      { id: "start-engines", type: "video", media: ["video"] },
      { id: "instruments", type: "video", media: ["video"] }
    ] },
    { id: "galley", icon: "flame", topics: [
      { id: "gas-switches", type: "guide" }, { id: "oven", type: "guide" }, { id: "burners", type: "guide" },
      { id: "salt-tap", type: "guide" }, { id: "fresh-tap", type: "guide" }
    ] },
    { id: "saloon", icon: "sofa", topics: [
      { id: "saloon-lights", type: "photo", media: ["photo"] },
      { id: "saloon-storage", type: "location" },
      { id: "under-couch", type: "info", items: true }
    ] },
    { id: "safety", icon: "buoy", topics: [
      { id: "extinguishers", type: "location" }, { id: "lifejackets", type: "location" }, { id: "liferaft", type: "location" },
      { id: "epirb-where", type: "location" }, { id: "epirb-use", type: "guide" }, { id: "vhf", type: "guide" },
      { id: "mayday", type: "script", special: "mayday" }
    ] },
    { id: "comfort", icon: "music", topics: [ { id: "audio", type: "guide" } ] },
    { id: "electrics", icon: "bolt", topics: [
      { id: "lights", type: "guide", media: ["photo", "video"] }, { id: "fridge", type: "guide", media: ["photo", "video"] },
      { id: "fw-pump", type: "guide", media: ["photo", "video"] }, { id: "sw-pump", type: "guide", media: ["photo", "video"] },
      { id: "bilge", type: "guide", media: ["photo", "video"] }, { id: "inverter", type: "guide", media: ["photo", "video"] },
      { id: "generator", type: "guide", media: ["photo", "video"] }
    ] },
    { id: "watermaker", icon: "drop", topics: [ { id: "wm-use", type: "guide" }, { id: "wm-where", type: "guide" } ] },
    { id: "toilets", icon: "toilet", topics: [ { id: "toilet-use", type: "guide" }, { id: "toilet-dont", type: "guide" } ] },
    { id: "kitchenware", icon: "cutlery", topics: [
      { id: "kw-photos", type: "photo", media: ["photo", "photo", "photo", "photo"] },
      { id: "breakage", type: "form", special: "breakage", icon: "glass" }
    ] },
    { id: "anchoring", icon: "anchor", topics: [ { id: "anchor-use", type: "guide" }, { id: "snubber", type: "guide" }, { id: "bridle", type: "guide" } ] },
    { id: "marina", icon: "plug", topics: [
      { id: "fw-filler", type: "location" }, { id: "diesel-filler", type: "location" }, { id: "shore-power", type: "location" },
      { id: "water-hose", type: "location" }, { id: "hose-connectors", type: "location" },
      { id: "mooring-lines", type: "location" }, { id: "floating-lines", type: "location" }
    ] }
  ],
  // Topics listed on the home screen under "Contact us" (in this order)
  contactLinks: ["breakage", "report-problem", "ask", "feedback"],

  /* Optional per-language overrides of lang-file text for this boat only, e.g.
   * content: { en: { topics: { "fender-count": { summary: "…" } } } } */
  content: {}
};
