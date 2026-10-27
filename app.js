/* Isla 40 Guest Manual — v2. Vanilla JS, no build step, works offline.
 *
 * CONTENT: edit MANUAL.sections below (ordered stern → bow).
 * A topic can have any of: media[], before[], steps[], safety[], callout, stats[], items[], summary, special.
 * A topic with none of before/steps/callout/stats/items/special shows "Content coming soon".
 * Inline topic links: [[topic-id|link text]].
 */
const MANUAL = {
  boatName: "Isla 40",                       // placeholder boat name
  company: "Anasa Experiences",
  model: "Fountaine Pajot Isla 40",
  heroPhoto: "img/boat-above.jpg",
  gallery: [
    { src: "img/boat-headland.jpg", caption: "By the headland" },
    { src: "img/boat-side.jpg", caption: "Turquoise water" }
  ],
  emergency: { basePhone: "+30 000 000 0000", baseName: "Charter base" },   // PLACEHOLDER number
  ownerPin: "0000",                          // demo PIN for Owner Settings
  sections: [
    { id: "dinghy", name: "Dinghy & Outboard", icon: "dinghy", topics: [
      { id: "lower-dinghy", title: "How to lower the dinghy", type: "guide",
        keywords: ["dinghy", "tender", "davit", "davits", "lower", "launch", "painter", "swim platform"],
        media: [{ kind: "photo", label: "Photo of your davits goes here" }],
        before: [
          "Only lower it when the boat is stopped, at anchor or on a mooring, with the engines in neutral or off.",
          "Make sure nobody is swimming behind the boat or standing on the swim platforms.",
          "Check that the dinghy's drain plug is in and the outboard is tilted up."
        ],
        steps: [
          "Tie a painter (bow line) from the dinghy to a stern cleat so it can't drift away once it's in the water.",
          "Take off any safety straps or lashings that hold the dinghy to the davits.",
          "Ease the two davit lines off their cleats, keeping a turn on each one so you stay in control.",
          "Lower both ends evenly, a little at a time, so the dinghy stays level. If one end drops faster, stop and even it out.",
          "Once it's floating, let a bit more line out so the hooks go slack.",
          "Climb in from the swim platform, holding the davit or the grab rail, and unhook both lifting points.",
          "Tidy the davit lines and cleat them off so they don't swing around or end up in the water.",
          "Lower the outboard and start it ([[start-outboard|Starting the dinghy engine]])."
        ],
        safety: [
          "Never stand underneath the dinghy while it's hanging.",
          "Keep your fingers clear of the blocks and cleats while the line is running.",
          "In swell or wind, lower it on the sheltered side and get a second person to hold the painter."
        ] },
      { id: "start-outboard", title: "How to start the dinghy engine", type: "guide", keywords: ["outboard", "dinghy", "engine", "start", "motor"] },
      { id: "refuel-outboard", title: "Refuelling the outboard", type: "guide", keywords: ["fuel", "petrol", "gasoline", "refuel", "outboard"] },
      { id: "fuel-canister", title: "Where the fuel canister is kept", type: "location", keywords: ["fuel", "canister", "jerrycan", "petrol", "outboard"] },
      { id: "outboard-trouble", title: "Troubleshooting the outboard", type: "guide", keywords: ["outboard", "won't start", "problem", "troubleshoot", "dinghy"] }
    ] },
    { id: "stern", name: "Stern underwater", icon: "propeller", subtitle: "Diagram", topics: [
      { id: "stern-diagram", title: "Underwater stern: propellers and rudders", type: "diagram",
        summary: "Picture or diagram of the underwater stern showing where the propellers and rudders are.",
        keywords: ["propeller", "propellers", "rudder", "rudders", "stern", "underwater", "diagram"],
        media: [{ kind: "diagram", label: "Underwater stern diagram — propellers & rudders" }] },
      { id: "prop-warning", title: "Keep ropes clear of the propellers", type: "warning",
        keywords: ["propeller", "rope", "line", "painter", "stern", "warning", "fouled"],
        callout: "The propellers sit far back, so keep ropes, lines and the dinghy painter out of the water near the stern." },
      { id: "tiller-location", title: "Where the emergency tiller is kept", type: "location", keywords: ["emergency tiller", "tiller", "steering", "rudder"] },
      { id: "tiller-use", title: "How to install and use the emergency tiller", type: "guide", keywords: ["emergency tiller", "tiller", "steering failure", "rudder"],
        media: [{ kind: "video", label: "Installing the emergency tiller" }, { kind: "photo", label: "Emergency tiller fitted" }] }
    ] },
    { id: "fenders", name: "Fenders", icon: "fender", topics: [
      { id: "fender-count", title: "12 fenders in total", type: "info", keywords: ["fenders", "fender", "cylindrical", "ball", "count", "how many"],
        stats: [{ n: 12, label: "Fenders in total", total: true }, { n: 8, label: "Cylindrical" }, { n: 2, label: "Big ball fenders" }, { n: 2, label: "Small ball fenders" }] },
      { id: "fender-photos", title: "Photo of each fender type", type: "photo", keywords: ["fenders", "cylindrical", "ball"],
        media: [{ kind: "photo", label: "Cylindrical" }, { kind: "photo", label: "Big ball" }, { kind: "photo", label: "Small ball" }] },
      { id: "fender-tie", title: "How to tie the fenders to the stern with two lines", type: "video", keywords: ["fenders", "tie", "knot", "stern", "lines", "mooring"],
        media: [{ kind: "video", label: "Tying the fenders to the stern with two lines" }] }
    ] },
    { id: "sailing", name: "Sailing", icon: "sail", topics: [
      { id: "jammers", title: "How to open the rope clutches (jammers) on the “piano” properly", type: "video",
        keywords: ["piano", "jammer", "jammers", "clutch", "clutches", "rope clutch", "lines", "sailing"],
        media: [{ kind: "video", label: "Opening the rope clutches on the piano" }] },
      { id: "genoa", title: "How to unfurl the genoa properly", type: "video", keywords: ["genoa", "jib", "headsail", "furl", "unfurl", "furler", "sail"],
        media: [{ kind: "video", label: "Unfurling the genoa" }] },
      { id: "reef", title: "How to reef the sails", type: "guide", summary: "From the boat's owner manual.",
        keywords: ["reef", "reefing", "mainsail", "main", "wind", "sail", "shorten sail", "owner manual"] }
    ] },
    { id: "helm", name: "Helm Station", icon: "helm", topics: [
      { id: "helm-overview", title: "Overview of the helm station and its parts", type: "video", keywords: ["helm", "steering", "wheel", "controls"], media: [{ kind: "video", label: "Helm station overview" }] },
      { id: "plotter", title: "The chart plotter", type: "video", keywords: ["chart plotter", "plotter", "gps", "navigation", "chart", "position"], media: [{ kind: "video", label: "Using the chart plotter" }] },
      { id: "start-engines", title: "How to start the engines", type: "video", keywords: ["engine", "engines", "start", "ignition", "throttle", "diesel"], media: [{ kind: "video", label: "Starting the engines" }] },
      { id: "instruments", title: "The instruments", type: "video", keywords: ["instruments", "depth", "wind", "speed", "log"], media: [{ kind: "video", label: "Reading the instruments" }] }
    ] },
    { id: "galley", name: "Galley & Gas", icon: "flame", topics: [
      { id: "gas-switches", title: "Main gas switches", type: "guide", keywords: ["gas", "switch", "valve", "solenoid", "bottle", "galley"] },
      { id: "oven", title: "How to turn on the oven", type: "guide", keywords: ["oven", "gas", "cooking", "galley"] },
      { id: "burners", title: "How to turn on the burners", type: "guide", keywords: ["burner", "burners", "stove", "hob", "cooker", "gas"] },
      { id: "salt-tap", title: "Salt water tap", type: "guide", keywords: ["salt water", "seawater", "tap", "sink", "galley"] },
      { id: "fresh-tap", title: "Fresh water tap", type: "guide", keywords: ["fresh water", "tap", "sink", "drinking", "galley"] }
    ] },
    { id: "saloon", name: "Main Saloon", icon: "sofa", topics: [
      { id: "saloon-lights", title: "Where the saloon light switches are", type: "photo", summary: "They're hard to find — a photo will show you exactly where.",
        keywords: ["lights", "light switch", "switches", "saloon", "lamp"], media: [{ kind: "photo", label: "Saloon light switches" }] },
      { id: "saloon-storage", title: "Storage in the main saloon", type: "location", keywords: ["storage", "lockers", "cupboards", "saloon"] },
      { id: "under-couch", title: "Under the saloon couch", type: "info", keywords: ["couch", "sofa", "flares", "bosun chair", "first aid", "life jackets", "flags", "toolbox", "tools"],
        items: ["Flares", "Bosun chair", "First aid kit", "Three life jackets", "Flags", "Toolbox"] }
    ] },
    { id: "safety", name: "Safety", icon: "buoy", topics: [
      { id: "extinguishers", title: "Where the fire extinguishers are located", type: "location", keywords: ["fire", "extinguisher", "extinguishers", "safety"] },
      { id: "lifejackets", title: "Where the rest of the life jackets are located", type: "location", keywords: ["life jacket", "lifejackets", "life jackets", "pfd", "safety"] },
      { id: "liferaft", title: "Where the life raft is located", type: "location", keywords: ["life raft", "liferaft", "raft", "abandon ship", "safety"] },
      { id: "epirb-where", title: "Where the EPIRB is located", type: "location", keywords: ["epirb", "beacon", "distress", "safety"] },
      { id: "epirb-use", title: "How to use the EPIRB", type: "guide", keywords: ["epirb", "beacon", "distress", "activate", "emergency"] },
      { id: "vhf", title: "How to use the VHF radio", type: "guide", keywords: ["vhf", "radio", "channel 16", "call"] },
      { id: "mayday", title: "Mayday call: example script to read out", type: "script", special: "mayday", keywords: ["mayday", "vhf", "distress", "emergency", "radio", "channel 16"] }
    ] },
    { id: "comfort", name: "Comfort & Entertainment", icon: "music", topics: [
      { id: "audio", title: "How to use the audio system", type: "guide", keywords: ["audio", "music", "speakers", "bluetooth", "stereo", "sound"] }
    ] },
    { id: "electrics", name: "Electrical Panel", icon: "bolt", subtitle: "With photos and videos", topics: [
      { id: "lights", title: "All the lights", type: "guide", keywords: ["lights", "navigation lights", "anchor light", "panel", "electrics"], media: [{ kind: "photo", label: "Light switches on the panel" }, { kind: "video", label: "All the lights" }] },
      { id: "fridge", title: "Fridge", type: "guide", keywords: ["fridge", "refrigerator", "cool", "panel", "electrics"], media: [{ kind: "photo", label: "Fridge switch" }, { kind: "video", label: "Fridge" }] },
      { id: "fw-pump", title: "Fresh water pump", type: "guide", keywords: ["fresh water pump", "water pump", "pump", "no water", "panel"], media: [{ kind: "photo", label: "Fresh water pump switch" }, { kind: "video", label: "Fresh water pump" }] },
      { id: "sw-pump", title: "Salt water pump", type: "guide", keywords: ["salt water pump", "deck wash", "pump", "panel"], media: [{ kind: "photo", label: "Salt water pump switch" }, { kind: "video", label: "Salt water pump" }] },
      { id: "bilge", title: "Bilge pump switches", type: "guide", summary: "On the main electrical panel.", keywords: ["bilge", "bilge pump", "pump", "leak", "panel"], media: [{ kind: "photo", label: "Bilge pump switches" }, { kind: "video", label: "Bilge pumps" }] },
      { id: "inverter", title: "Inverter", type: "guide", summary: "Located beneath the electrical panel.", keywords: ["inverter", "220v", "230v", "sockets", "charging", "laptop"], media: [{ kind: "photo", label: "Inverter" }, { kind: "video", label: "Using the inverter" }] },
      { id: "generator", title: "Generator panel", type: "guide", summary: "Located beneath the electrical panel.", keywords: ["generator", "genset", "power", "panel"], media: [{ kind: "photo", label: "Generator panel" }, { kind: "video", label: "Using the generator" }] }
    ] },
    { id: "watermaker", name: "Water Maker", icon: "drop", topics: [
      { id: "wm-use", title: "How to use the water maker", type: "guide", keywords: ["water maker", "watermaker", "desalinator", "fresh water", "tanks"] },
      { id: "wm-where", title: "Where to use it and where not to", type: "guide", keywords: ["water maker", "watermaker", "harbour", "marina", "clean water"] }
    ] },
    { id: "toilets", name: "Toilets", icon: "toilet", topics: [
      { id: "toilet-use", title: "How to use the toilets", type: "guide", keywords: ["toilet", "toilets", "head", "heads", "wc", "flush"] },
      { id: "toilet-dont", title: "What not to do", type: "guide", keywords: ["toilet", "blocked", "paper", "don't", "wipes", "head"] }
    ] },
    { id: "kitchenware", name: "Kitchenware & Breakages", icon: "cutlery", topics: [
      { id: "kw-photos", title: "Photos of all cutlery, bowls, dishes and glasses", type: "photo", keywords: ["cutlery", "bowls", "dishes", "plates", "glasses", "inventory", "kitchenware"],
        media: [{ kind: "photo", label: "Cutlery" }, { kind: "photo", label: "Bowls" }, { kind: "photo", label: "Dishes" }, { kind: "photo", label: "Glasses" }] },
      { id: "breakage", title: "Report a breakage", type: "form", special: "breakage", keywords: ["broken", "breakage", "break", "report", "glass", "plate", "damage", "whatsapp"] }
    ] },
    { id: "anchoring", name: "Anchoring", icon: "anchor", topics: [
      { id: "anchor-use", title: "How to use the anchor", type: "guide", keywords: ["anchor", "windlass", "chain", "anchoring", "drop", "raise"] },
      { id: "snubber", title: "Putting on the snubber line", type: "guide", keywords: ["snubber", "anchor", "chain", "hook", "anchoring"] },
      { id: "bridle", title: "Putting on the bridle", type: "guide", keywords: ["bridle", "anchor", "chain", "anchoring"] }
    ] },
    { id: "marina", name: "In the Marina", subtitle: "Tanks, water & power", icon: "plug", topics: [
      { id: "fw-filler", title: "Where the fresh water tank intake (filler) is", type: "location", keywords: ["fresh water", "water tank", "filler", "intake", "fill", "marina", "tanks"] },
      { id: "diesel-filler", title: "Where the diesel tank intake (filler) is", type: "location", keywords: ["diesel", "fuel", "filler", "intake", "refuel", "marina", "tanks"] },
      { id: "shore-power", title: "Where the shore power (electrical) cable is kept", type: "location", keywords: ["shore power", "power cable", "electric", "electrical", "plug", "marina"] },
      { id: "water-hose", title: "Where the water hose is kept", type: "location", keywords: ["water hose", "hose", "fresh water", "marina", "fill"] },
      { id: "hose-connectors", title: "Where the spare hose connectors are kept", type: "location", keywords: ["hose connectors", "connector", "adapter", "hose", "marina"] },
      { id: "mooring-lines", title: "Mooring lines: how many, how long, and where they are kept", type: "location", keywords: ["mooring lines", "lines", "ropes", "dock lines", "marina", "mooring"] },
      { id: "floating-lines", title: "Floating lines: how many, how long, and where they are kept", type: "location", keywords: ["floating lines", "floating line", "lines", "ropes", "marina", "swim line"] }
    ] }
  ]
};

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
  gear: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>'
};
const ic = (name, cls = "") => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.guide}</svg>`;
const TYPE = {
  guide: { icon: "guide", label: "Guide" }, video: { icon: "play", label: "Video" }, photo: { icon: "photo", label: "Photos" },
  diagram: { icon: "diagram", label: "Diagram" }, location: { icon: "pin", label: "Location" }, warning: { icon: "alert", label: "Warning" },
  info: { icon: "info", label: "Info" }, script: { icon: "radio", label: "Script" }, form: { icon: "chat", label: "Report" }
};

/* ---------- Helpers ---------- */
const $app = document.getElementById("app"), $nav = document.getElementById("nav"), $back = document.getElementById("backBtn"),
      $brand = document.getElementById("brand"), $title = document.getElementById("navTitle"), $toast = document.getElementById("toast");
$back.innerHTML = ic("back");
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const ALL = MANUAL.sections.flatMap(s => s.topics.map(t => (t.section = s, t)));
const secById = id => MANUAL.sections.find(s => s.id === id);
const topicById = id => ALL.find(t => t.id === id);
const hasContent = t => !!(t.before || t.steps || t.callout || t.stats || t.items || t.special);
const stripLinks = s => s.replace(/\[\[[^|\]]+\|([^\]]+)\]\]/g, "$1");
const rich = s => esc(s).replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, (_, id, l) => `<a href="#/t/${id}" data-link>${l}</a>`);
const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[“”"]/g, "");
const hl = (text, q) => {
  if (!q) return esc(text);
  const i = norm(text).indexOf(norm(q));
  return i < 0 ? esc(text) : esc(text.slice(0, i)) + "<mark>" + esc(text.slice(i, i + q.length)) + "</mark>" + esc(text.slice(i + q.length));
};
const store = {
  get(k, d) { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} }
};
function toast(msg) { $toast.textContent = msg; $toast.classList.add("show"); clearTimeout(toast.t); toast.t = setTimeout(() => $toast.classList.remove("show"), 2400); }
let query = "";

/* ---------- Search ---------- */
function search(q) {
  const terms = norm(q.trim()).split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const out = [];
  for (const t of ALL) {
    const f = {
      title: norm(t.title), kw: norm((t.keywords || []).join(" ")), sec: norm(t.section.name),
      body: norm([t.summary, t.callout, ...(t.before || []), ...(t.steps || []), ...(t.safety || []), ...(t.items || []),
                  ...(t.media || []).map(m => m.label), ...(t.stats || []).map(s => s.label)].filter(Boolean).map(stripLinks).join(" "))
    };
    let score = 0;
    const ok = terms.every(term => {
      const s = (f.title.includes(term) ? 10 : 0) + (f.kw.includes(term) ? 6 : 0) + (f.sec.includes(term) ? 3 : 0) + (f.body.includes(term) ? 2 : 0);
      score += s; return s > 0;
    });
    if (ok) out.push({ t, score: score + (hasContent(t) ? 1 : 0) });
  }
  return out.sort((a, b) => b.score - a.score);
}

/* ---------- Shared bits ---------- */
function setNav({ mode, title = "" }) {
  // mode: "home" (transparent over photo) | "page"
  $nav.classList.toggle("overlay", mode === "home");
  $back.hidden = mode === "home";
  $brand.hidden = true;   // home uses the white hero logo; inner pages show the back button
  $title.textContent = title;
  document.title = title ? `${title} · ${MANUAL.boatName}` : `${MANUAL.boatName} Guest Manual`;
  onScroll();
}
function topicMeta(t) {
  const ty = TYPE[t.type] || TYPE.guide;
  const status = hasContent(t) ? (t.steps ? `<span class="ready">${t.steps.length} steps</span>` : `<span class="ready">Ready</span>`) : `<span class="soon">Coming soon</span>`;
  return `${ty.label} · ${status}`;
}
function topicRow(t, q = "", showSection = false) {
  const ty = TYPE[t.type] || TYPE.guide;
  return `<li><a class="row" href="#/t/${t.id}">
    <span class="ic ${t.type === "warning" ? "warn" : ""}">${ic(ty.icon)}</span>
    <span class="tx"><span class="t">${hl(t.title, q)}</span><span class="m">${showSection ? esc(t.section.name) + " · " : ""}${topicMeta(t)}</span></span>
    <span class="chev">${ic("chev")}</span></a></li>`;
}
function mediaBlock(media) {
  if (!media || !media.length) return "";
  const grid = media.length > 2 && media.every(m => m.kind === "photo");
  return `<div class="media ${grid ? "grid" : ""}">${media.map(m => {
    const isV = m.kind === "video";
    const sub = isV ? "Video coming soon" : m.kind === "diagram" ? "Diagram coming soon" : "Photo coming soon";
    return `<div class="ph ${isV ? "video" : ""}" role="img" aria-label="${esc(m.label)} — ${sub}">
      <span class="pc">${ic(isV ? "play" : m.kind === "diagram" ? "diagram" : "photo")}</span>
      <strong>${esc(m.label)}</strong><small>${sub}</small>${isV ? '<span class="dur">–:–</span>' : ""}</div>`;
  }).join("")}</div>`;
}

/* ---------- Views ---------- */
function viewHome() {
  setNav({ mode: "home" });
  $app.innerHTML = `
    <section class="hero" style="--hero:url('${MANUAL.heroPhoto}')">
      <button class="hero-logo" id="heroLogo" aria-label="${esc(MANUAL.company)}"><img src="logo-white.png" alt="${esc(MANUAL.company)}" width="1000" height="745"></button>
      <div class="eyebrow">Guest manual</div>
      <h1 id="heroTitle">Welcome aboard</h1>
      <p>${esc(MANUAL.model)}</p>
    </section>
    <div class="search" role="search">
      <span class="s-ic">${ic("search")}</span>
      <input id="q" type="search" inputmode="search" autocomplete="off" enterkeyhint="search" placeholder="Search the manual"
             aria-label="Search the manual" value="${esc(query)}">
      <button class="clear" id="clearQ" aria-label="Clear search" ${query ? "" : "hidden"}>${ic("x")}</button>
    </div>
    <div id="homeBody"></div>`;
  const $q = document.getElementById("q"), $c = document.getElementById("clearQ");
  $q.addEventListener("input", () => { query = $q.value; $c.hidden = !query; renderHomeBody(); });
  $c.addEventListener("click", () => { query = ""; $q.value = ""; $c.hidden = true; renderHomeBody(); $q.focus(); });
  document.getElementById("heroTitle").addEventListener("click", secretTap);
  document.getElementById("heroLogo").addEventListener("click", secretTap);   // 5 quick taps → Owner Settings
  renderHomeBody();
}
function renderHomeBody() {
  const $b = document.getElementById("homeBody"); if (!$b) return;
  const q = query.trim();
  if (q) {
    const res = search(q);
    $b.innerHTML = `<p class="meta-line">${res.length} result${res.length === 1 ? "" : "s"} for “${esc(q)}”</p>` +
      (res.length ? `<ul class="list">${res.map(r => topicRow(r.t, q, true)).join("")}</ul>`
                  : `<div class="empty">Nothing found. Try “dinghy”, “gas” or “anchor”.</div>`);
    return;
  }
  $b.innerHTML = `
    <div class="sec-head"><h2>Sections</h2><span>Stern to bow</span></div>
    <ul class="list">${MANUAL.sections.map(s => `<li><a class="row" href="#/s/${s.id}">
      <span class="ic">${ic(s.icon)}</span>
      <span class="tx"><span class="t">${esc(s.name)}</span><span class="m">${s.topics.length} topic${s.topics.length > 1 ? "s" : ""}${s.subtitle ? " · " + esc(s.subtitle) : ""}</span></span>
      <span class="chev">${ic("chev")}</span></a></li>`).join("")}</ul>
    ${MANUAL.gallery.length ? `<div class="sec-head"><h2>On board</h2><span>${esc(MANUAL.boatName)}</span></div>
    <div class="gallery">${MANUAL.gallery.map(g => `<figure><img src="${g.src}" alt="${esc(g.caption)}" loading="lazy" decoding="async"><figcaption>${esc(g.caption)}</figcaption></figure>`).join("")}</div>` : ""}
    <p class="foot">Available offline · Prototype</p>`;
}

function viewSection(id) {
  const s = secById(id); if (!s) return viewNotFound();
  setNav({ mode: "page", title: s.name });
  $app.innerHTML = `
    <div class="page-head">
      <div class="sec-ic">${ic(s.icon)}</div>
      <div class="eyebrow">Section ${MANUAL.sections.indexOf(s) + 1} of ${MANUAL.sections.length}</div>
      <h1>${esc(s.name)}</h1>
      <p>${s.topics.length} topic${s.topics.length > 1 ? "s" : ""}${s.subtitle ? " · " + esc(s.subtitle) : ""}</p>
    </div>
    <div style="height:18px"></div>
    <ul class="list">${s.topics.map(t => topicRow(t)).join("")}</ul>`;
}

function viewTopic(id) {
  const t = topicById(id); if (!t) return viewNotFound();
  const s = t.section, ty = TYPE[t.type] || TYPE.guide;
  setNav({ mode: "page", title: t.title });
  const kinds = [...new Set((t.media || []).map(m => m.kind))];
  const chips = [`<span class="chip">${ic(ty.icon)}${ty.label}</span>`,
    ...kinds.filter(k => k !== t.type && !(k === "photo" && t.type === "photo")).map(k => `<span class="chip">${ic(k === "video" ? "play" : k)}${k === "video" ? "Video" : k === "diagram" ? "Diagram" : "Photo"}</span>`)];
  let body = "";
  if (t.special === "breakage") body = breakageUI();
  else if (t.special === "mayday") body = maydayUI();
  if (t.callout) body += `<div class="block"><div class="callout" role="note"><span class="ci">${ic("alert")}</span><div><h3>Warning</h3><p>${rich(t.callout)}</p></div></div></div>`;
  if (t.stats) body += `<div class="block"><div class="stats">${t.stats.map(x => `<div class="stat ${x.total ? "total" : ""}"><b>${x.n}</b><span>${esc(x.label)}</span></div>`).join("")}</div></div>`;
  if (t.items) body += `<div class="block"><h2>What's in there</h2><ul class="card items">${t.items.map(x => `<li><span class="dot"></span>${esc(x)}</li>`).join("")}</ul></div>`;
  const key = "progress:" + t.id, st = store.get(key, { before: [], steps: [] });
  if (t.before) body += `<div class="block"><h2>Before you start</h2><div class="card">${t.before.map((b, i) =>
      `<button class="tick" data-k="before" data-i="${i}" aria-pressed="${st.before.includes(i)}"><span class="cb">${ic("check")}</span><span class="tx">${rich(b)}</span></button>`).join("")}</div></div>`;
  if (t.steps) body += `<div class="block"><h2>Steps <span class="prog" id="prog"></span></h2><div class="bar"><i id="bar"></i></div>
      <ol class="card steps">${t.steps.map((x, i) => `<li><button class="step" data-k="steps" data-i="${i}" aria-pressed="${st.steps.includes(i)}"><span class="n"><b>${i + 1}</b>${ic("check")}</span><span class="tx">${rich(x)}</span></button></li>`).join("")}</ol>
      <p class="hint">Tap a step to tick it off.</p></div>`;
  if (t.safety) body += `<div class="block"><div class="callout" role="note"><span class="ci">${ic("alert")}</span><div><h3>Safety tips</h3><ul>${t.safety.map(x => `<li>${rich(x)}</li>`).join("")}</ul></div></div></div>`;
  if (!hasContent(t) && !t.media) body += `<div class="soon-card"><div class="ci">${ic("clock")}</div><h3>Content coming soon</h3><p>We're still writing this one. Your check-in skipper can show you on board.</p></div>`;
  const idx = s.topics.indexOf(t), next = s.topics[idx + 1];
  $app.innerHTML = `
    <div class="page-head">
      <div class="eyebrow">${esc(s.name)}</div>
      <h1>${esc(t.title)}</h1>
      ${t.summary ? `<p>${esc(t.summary)}</p>` : ""}
      <div class="chips">${chips.join("")}</div>
    </div>
    ${mediaBlock(t.media)}
    ${body}
    ${next ? `<a class="pager" href="#/t/${next.id}"><span class="tx"><small>Next in ${esc(s.name)}</small><span>${esc(next.title)}</span></span><span class="chev">${ic("chev")}</span></a>` : ""}`;
  // ticking
  const update = () => {
    if (!t.steps) return;
    document.getElementById("prog").textContent = `${st.steps.length} of ${t.steps.length}`;
    document.getElementById("bar").style.width = (st.steps.length / t.steps.length * 100) + "%";
  };
  $app.querySelectorAll("button[data-k]").forEach(b => b.addEventListener("click", e => {
    if (e.target.closest("[data-link]")) return;
    const arr = st[b.dataset.k], i = +b.dataset.i, at = arr.indexOf(i);
    at >= 0 ? arr.splice(at, 1) : arr.push(i);
    b.setAttribute("aria-pressed", at < 0); if (navigator.vibrate) navigator.vibrate(8);
    store.set(key, st); update();
  }));
  update();
  if (t.special === "breakage") bindBreakage();
}

function maydayUI() {
  return `<div class="block"><h2>Read out on VHF ch 16 <span class="ph-tag">Placeholder</span></h2>
    <ol class="card script">
      <li><span>Switch the VHF to <b>channel 16</b>, high power. Press and hold to talk.</span></li>
      <li><span>Say <span class="say">“Mayday, Mayday, Mayday”</span></span></li>
      <li><span><span class="say">“This is ${esc(MANUAL.boatName)}”</span> three times, plus call sign / MMSI.</span></li>
      <li><span>Give your <b>position</b> from the chart plotter and say <b>what's wrong</b>.</span></li>
      <li><span>Say <b>how many people</b> are on board and what help you need.</span></li>
      <li><span>Say <span class="say">“Over”</span> and listen. Repeat every few minutes if there's no answer.</span></li>
    </ol>
    <p class="hint">Template script — to be confirmed by the charter base. Only for grave and imminent danger.</p></div>`;
}

const BREAK_ITEMS = [{ id: "cutlery", label: "Cutlery", icon: "cutlery" }, { id: "bowls", label: "Bowls", icon: "bowl" },
                     { id: "dishes", label: "Dishes", icon: "plate" }, { id: "glasses", label: "Glasses", icon: "glass" }];
const breakState = Object.fromEntries(BREAK_ITEMS.map(b => [b.id, 0]));
function breakageUI() {
  return `<div class="block"><h2>What broke?</h2><div class="card">${BREAK_ITEMS.map(b => `
    <div class="counter"><span class="ci">${ic(b.icon)}</span><span class="tx">${b.label}</span>
      <div class="stepper"><button data-dec="${b.id}" aria-label="Fewer ${b.label}">${ic("minus")}</button>
      <output id="c-${b.id}">${breakState[b.id]}</output>
      <button data-inc="${b.id}" aria-label="More ${b.label}">${ic("plus")}</button></div></div>`).join("")}</div></div>
    <div class="block"><h2>Note <span class="prog" style="color:var(--faint)">Optional</span></h2>
      <textarea class="textarea" id="bNote" placeholder="e.g. dropped a glass in the cockpit"></textarea></div>
    <div class="block"><button class="btn" id="sendReport">${ic("chat")}Send report</button>
      <p class="note">${ic("info")}<span id="waNote">WhatsApp number set in Owner Settings</span></p></div>
    <p class="hint" style="text-align:center">No charge — this just helps us replace them for the next group.</p>`;
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
    const wa = store.get("owner:whatsapp", "");
    const lines = BREAK_ITEMS.filter(b => breakState[b.id]).map(b => `${breakState[b.id]} × ${b.label.toLowerCase()}`);
    const msg = `Breakage report (${MANUAL.boatName}): ${lines.join(", ")}${document.getElementById("bNote").value ? " — " + document.getElementById("bNote").value : ""}`;
    // Prototype: later → location.href = `https://wa.me/${wa.replace(/\D/g, "")}?text=${encodeURIComponent(msg)}`
    console.log("[prototype] would open WhatsApp", wa, msg);
    toast(wa ? "Report ready — WhatsApp comes next" : "No WhatsApp number set yet");
  };
  sync();
}

function viewEmergency() {
  setNav({ mode: "page", title: "Emergency" });
  const e = MANUAL.emergency;
  $app.innerHTML = `
    <div class="page-head"><div class="eyebrow" style="color:var(--red)">Emergency</div><h1>Stay calm.<br>Help is close.</h1>
      <p>Make sure everyone is wearing a life jacket.</p></div>
    <div class="block"><div class="card">
      <a class="action red" href="tel:112"><span class="ci">${ic("phone")}</span><span class="tx"><b>Call 112</b><small>European emergency number</small></span><span class="chev">${ic("chev")}</span></a>
      <a class="action" href="tel:${e.basePhone.replace(/[^\d+]/g, "")}"><span class="ci">${ic("phone")}</span><span class="tx"><b>${esc(e.baseName)}</b><small>${esc(e.basePhone)} <span class="ph-tag">Placeholder</span></small></span><span class="chev">${ic("chev")}</span></a>
      <a class="action" href="#/t/mayday"><span class="ci">${ic("radio")}</span><span class="tx"><b>Mayday on VHF</b><small>Example script to read out</small></span><span class="chev">${ic("chev")}</span></a>
    </div></div>
    <div class="sec-head"><h2>Safety</h2><span>More help</span></div>
    <ul class="list">${secById("safety").topics.filter(t => t.id !== "mayday").map(t => topicRow(t)).join("")}</ul>`;
}

/* ---------- Owner settings (hidden: 5 quick taps on logo / title) ---------- */
let taps = [];
function secretTap() {
  const now = Date.now(); taps = taps.filter(x => now - x < 1800); taps.push(now);
  if (taps.length >= 5) { taps = []; location.hash = "#/owner"; }
}
$brand.addEventListener("click", secretTap);
let ownerUnlocked = false;
function viewOwner() {
  if (!ownerUnlocked) return viewPin();
  setNav({ mode: "page", title: "Owner settings" });
  $app.innerHTML = `
    <div class="page-head"><div class="sec-ic">${ic("gear")}</div><div class="eyebrow">Owner only</div><h1>Owner settings</h1>
      <p>Hidden from guests. Saved on this device.</p></div>
    <div class="block"><h2>Breakage reports</h2><div class="card">
      <div class="field"><label for="wa">WhatsApp number</label>
        <input id="wa" type="tel" inputmode="tel" autocomplete="off" placeholder="+30 69…" value="${esc(store.get("owner:whatsapp", ""))}">
        <div class="help">Guests' “Report a breakage” messages will open WhatsApp to this number.</div></div>
    </div></div>
    <div class="block"><button class="btn" id="saveOwner">Save</button></div>
    <div class="soon-card"><div class="ci">${ic("gear")}</div><h3>More owner settings coming</h3><p>Boat name, base phone number and content editing will live here.</p></div>
    <div class="block"><button class="btn ghost" id="lockOwner">${ic("lock")}Lock</button></div>`;
  document.getElementById("saveOwner").onclick = () => { store.set("owner:whatsapp", document.getElementById("wa").value.trim()); toast("Saved"); };
  document.getElementById("lockOwner").onclick = () => { ownerUnlocked = false; location.hash = "#/"; };
}
function viewPin() {
  setNav({ mode: "page", title: "Owner access" });
  let pin = "";
  $app.innerHTML = `<div class="pin-wrap"><div class="ci">${ic("lock")}</div><h1>Owner access</h1><p>Enter your 4-digit PIN</p>
    <div class="dots" id="dots">${"<i></i>".repeat(4)}</div><div class="pin-msg" id="pinMsg"></div>
    <div class="keypad">${[1,2,3,4,5,6,7,8,9].map(n => `<button data-d="${n}">${n}</button>`).join("")}
      <button class="blank" tabindex="-1" aria-hidden="true"></button><button data-d="0">0</button>
      <button class="del" id="pinDel" aria-label="Delete">${ic("del")}</button></div></div>`;
  const $dots = document.getElementById("dots"), $msg = document.getElementById("pinMsg");
  const draw = () => [...$dots.children].forEach((d, i) => d.classList.toggle("on", i < pin.length));
  $app.querySelectorAll("[data-d]").forEach(b => b.onclick = () => {
    if (pin.length >= 4) return; pin += b.dataset.d; $msg.textContent = ""; $dots.classList.remove("err"); draw();
    if (pin.length === 4) setTimeout(() => {
      if (pin === MANUAL.ownerPin) { ownerUnlocked = true; viewOwner(); }
      else { $dots.classList.add("err"); $msg.textContent = "Incorrect PIN"; pin = ""; draw(); }
    }, 150);
  });
  document.getElementById("pinDel").onclick = () => { pin = pin.slice(0, -1); draw(); };
}

function viewNotFound() {
  setNav({ mode: "page", title: "Not found" });
  $app.innerHTML = `<div class="soon-card"><div class="ci">${ic("search")}</div><h3>Page not found</h3><p><a href="#/">Back to the manual</a></p></div>`;
}

/* ---------- Router & chrome ---------- */
function route() {
  const [, view, id] = (location.hash || "#/").replace(/^#/, "").split("/");
  if (!view) viewHome();
  else if (view === "s") viewSection(id);
  else if (view === "t") viewTopic(id);
  else if (view === "emergency") viewEmergency();
  else if (view === "owner") viewOwner();
  else viewNotFound();
  if (view) window.scrollTo(0, 0);
  onScroll();
}
function onScroll() {
  const y = window.scrollY, home = $nav.classList.contains("overlay");
  $nav.classList.toggle("scrolled", home ? y > 300 : y > 4);
  $nav.classList.toggle("show-title", !home && y > 70);
}
window.addEventListener("scroll", onScroll, { passive: true });
$back.addEventListener("click", () => (history.length > 1 ? history.back() : (location.hash = "#/")));
window.addEventListener("hashchange", route);
route();

if ("serviceWorker" in navigator) window.addEventListener("load", () => navigator.serviceWorker.register("service-worker.js").catch(() => {}));
