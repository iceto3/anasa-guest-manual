# Anasa Experiences · Anasa Guest Manual

A searchable, offline-capable web app (PWA) for guests on board **Anasa**, a Fountaine Pajot Isla 40 charter catamaran run by Anasa Experiences in Greece.

Live: https://iceto3.github.io/anasa-guest-manual/

- Plain HTML/CSS/JS, no build step, works offline after the first visit.
- Languages: English (default), Ελληνικά, Български, Deutsch. Switch with the globe button (top right). The choice is saved on the device; the first visit picks the phone's language when it is supported.
- SOS: the red **SOS** button opens the Emergency screen (112, 108 Hellenic Coast Guard, call the base, boat ID, VHF 16, a filled-in Mayday script) and **Send SOS with my location**, which needs a 2-second press-and-hold and then opens WhatsApp to the owner with GPS position, a Google Maps link, accuracy and time (or a "location unavailable" message).
- Your stay: Wi-Fi with copy buttons, check-in/check-out, house rules, local tips.
- Theme: Auto (follows the phone), Light or Dark. The round button in the header cycles them; the choice is saved on the device.
- Check-in damage report: guests mark existing damage on a boat drawing at the start of the charter week. Reports are saved to a small Cloudflare backend and a summary opens in WhatsApp. See [Damage check-in](#damage-check-in-v9).
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
| `worker/` | Cloudflare Worker + D1 backend for damage reports (`wrangler.toml`, `src/index.js`, `schema.sql`). No secrets in the repo. |
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

Tap the logo 5 times quickly, then enter the PIN (`0000` for now). There you can override the owner WhatsApp number on that device (stored in `localStorage`, key `owner:<boat>:whatsapp`), check the current boat config and see the damage reports (see below).

## Damage check-in (v9)

Home → **Check-in: note existing damage** (also found by searching "damage", "scratch", "ζημιά", "щети", "Schaden").

1. Tap the drawing (Top / Starboard / Port views). Each tap adds a numbered pin and opens a sheet: type of damage, area (auto-suggested from where you tapped, can be changed), short description, optional photos. **Add item without location** covers inventory, cushions, galley items. Tap a pin or a list row to edit or delete (numbers close up after a delete).
2. **Continue** → name of the person accepting the boat, charter week (defaults to today → +7 days) and the box "I inspected the boat and these are all the damages I found". Zero items is allowed and is recorded as "No existing damage found".
3. **Submit report** → `POST /api/reports` to the Worker (stored in D1), then WhatsApp opens to the owner number with an English summary (boat, week, name, numbered items with area/type/description, photo count). The done screen has **Send summary on WhatsApp** and **Share photos** (uses the phone's share sheet, `navigator.share({files})`, where supported).

- **Offline:** if the backend can't be reached, the report waits in IndexedDB (`anasa-manual` → `queue`) and is sent automatically when the phone is online again (on the `online` event, on app start, or with **Retry**). WhatsApp still works.
- **Photos** are resized on the phone (max 1280 px, JPEG 0.7) and kept in IndexedDB (`anasa-manual` → `photos`). **They are not uploaded yet**; only their count/size goes to the server. Guests share them through WhatsApp.
- The draft lives in `localStorage` `damage:<boat>:draft`, the last submitted report in `damage:<boat>:last`.
- Data model: every report has `kind` = `checkin` (now) or `checkout` (ready for later).

### Owner: damage reports

Owner settings (5 taps + PIN) → **Damage reports**. Enter the **Owner API key** once (saved only on that device), then **Load reports**: date, week, name, item count, expandable item details. The key is sent as the `X-Owner-Key` header. This is **basic protection only** (one shared key, no user accounts). The key is a Worker secret, not in this repo; `config.js` `api.ownerKey` stays empty here.

### Backend (Cloudflare)

- Worker `anasa-manual-api` → https://anasa-manual-api.vidrichka.workers.dev (source in `worker/src/index.js`)
- D1 database `anasa-manual-db` (schema in `worker/schema.sql`: `reports`, `report_items`, `report_photos`)
- Secret `OWNER_KEY` (set with `wrangler secret put OWNER_KEY`)

| Endpoint | Who | What |
|---|---|---|
| `GET /api/health` | anyone | status, `photoUpload: enabled/disabled` |
| `POST /api/reports` | guest app | JSON ≤ 100 KB, ≤ 80 items, validated; idempotent by client report id; 20 reports/hour per IP |
| `GET /api/reports?boat=anasa&kind=&limit=` | owner key | reports with items and photo metadata |
| `GET` / `DELETE /api/reports/:id` | owner key | one report / delete it |
| `PUT /api/reports/:id/photos/:photoId` | guest app | photo upload, returns 501 until R2 is enabled |
| `GET /api/photos/:photoId` | owner key | photo download (R2) |

CORS allows `https://iceto3.github.io` and `http://localhost:*` / `127.0.0.1:*` only. Deploy: `cd worker && npx wrangler deploy` (schema: `npx wrangler d1 execute anasa-manual-db --remote --file schema.sql`).

**To enable photo upload later:** enable R2 in the Cloudflare dashboard, create bucket `anasa-manual-photos`, uncomment the `[[r2_buckets]]` block in `worker/wrangler.toml`, deploy. Then the app only needs to `PUT` each IndexedDB photo blob to `/api/reports/<reportId>/photos/<photoId>` after the report is saved (the photo ids are already in D1 with `status = 'device'`), and the owner list can show them from `/api/photos/<id>`.

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
