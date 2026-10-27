# Anasa Experiences · Anasa Guest Manual

A searchable, offline-capable web app (PWA) for guests on board **Anasa**, a Fountaine Pajot Isla 40 charter catamaran run by Anasa Experiences in Greece.

Live: https://iceto3.github.io/anasa-guest-manual/

- Plain HTML/CSS/JS, no build step, works offline after the first visit.
- Languages: English (default), Ελληνικά, Български, Deutsch. Switch with the globe button (top right). The choice is saved on the device; the first visit picks the phone's language when it is supported.
- SOS: the red **SOS** button opens the Emergency screen (112, 108 Hellenic Coast Guard, call the base, boat ID, VHF 16, a filled-in Mayday script) and **Send SOS with my location**, which needs a 2-second press-and-hold and then opens WhatsApp to the owner with GPS position, a Google Maps link, accuracy and time (or a "location unavailable" message).
- Your stay: Wi-Fi with copy buttons, check-in/check-out, house rules, local tips.
- Contact us: breakage report, problem report, question, end-of-charter feedback, all sent as prefilled WhatsApp messages to the owner number.

## Files

| File | What it is |
|---|---|
| `config.js` | Central app settings: default boat, languages, owner PIN, language of messages sent to the owner. |
| `boats/<id>.js` | One file per boat: name, model, contacts, radio IDs, Wi-Fi, check-in times, photos and the section/topic structure. |
| `lang/<code>.js` | One file per language: all UI text plus the text of every section and topic. |
| `app.js` | The app (routing, views, search, WhatsApp, SOS, owner settings). No content in here. |
| `styles.css`, `index.html` | Design and page shell. |
| `service-worker.js` | Offline cache. **Bump `VERSION` whenever anything changes** so guests get the update. |
| `OUTLINE.md` | Planned sections and topics (stern to bow) plus the guest-info screens. |

Load order (in `index.html`): `config.js` → `lang/*.js` → `boats/*.js` → `app.js`.

## Placeholders to replace

Everything marked `// TBD MOCKUP` in `boats/anasa.js` shows a yellow **MOCKUP** tag in the app until it is replaced:

- `contacts.ownerWhatsApp`: owner WhatsApp number, currently `+30 690 000 0000`. All reports and SOS messages go here.
- `contacts.basePhone`: charter base phone, currently `+30 210 000 0000`.
- `radio.callSign`: currently `SV-XXXX`.
- `radio.mmsi`: currently `239 000 000`.
- `wifi.ssid` and `wifi.password`: currently `Anasa-Guest-MOCK` and `mock-password-123`.
- `stay.checkIn` and `stay.checkOut`: currently `17:00` and `09:00`.
- `config.js` `ownerPin`: currently `0000`.

House rules, check-in notes and the Mayday script are marked **DRAFT**. Local tips are **EXAMPLE** placeholders. Edit their text in each `lang/*.js` file (`topics["house-rules"]`, `topics.checkin`, `topics["local-tips"]`, `ui.mayday`).

Once a placeholder is real, remove its key from the boat's `mock: [...]` list so the MOCKUP tag goes away.

## Owner settings (hidden)

Tap the logo 5 times quickly, then enter the PIN (`0000` for now). There you can override the owner WhatsApp number on that device (stored in `localStorage`, key `owner:<boat>:whatsapp`) and check the current boat config.

## Adding a language

1. Copy `lang/en.js` to `lang/<code>.js` (for example `lang/it.js`) and translate the values. Keep the keys. Any missing key falls back to English.
2. Add the code to `languages` in `config.js`.
3. Add `<script src="lang/<code>.js"></script>` to `index.html`, after the other languages.
4. Add `"./lang/<code>.js"` to `ASSETS` in `service-worker.js` and bump `VERSION`.
5. For a non-Latin script other than Greek or Cyrillic, add a font subset in `fonts/` and an `@font-face` rule in `styles.css`.

## Adding a boat (multi-boat)

Each boat is a config file and is chosen with a URL parameter. There is no boat picker in the UI.

1. Copy `boats/anasa.js` to `boats/<id>.js` and set `id: "<id>"`, the name, contacts, radio IDs, Wi-Fi, photos and sections.
2. Add `<script src="boats/<id>.js"></script>` to `index.html`, before `app.js`.
3. Add `"./boats/<id>.js"` (and any new photos) to `ASSETS` in `service-worker.js` and bump `VERSION`.
4. Open `https://iceto3.github.io/anasa-guest-manual/?boat=<id>` (make one QR code per boat). Without `?boat=`, the app opens `defaultBoat` from `config.js`. An unknown id also falls back to it.

Topic text is shared through the language files. For boat-specific wording, add overrides in the boat's `content: { <lang>: { topics: { <topicId>: { ... } } } }`.

## Notes

- The SOS goes to the **owner on WhatsApp, not the coast guard**. For immediate danger, guests are told to call 112/108 or send a Mayday on VHF 16. WhatsApp needs mobile data. The guest still has to tap Send in WhatsApp.
- Messages to the owner are written in English (`messageLang` in `config.js`). Guest-typed text is sent as written, with a note of the guest's language.
