# Anasa Experiences · Anasa Guest Manual

A searchable, offline-capable web app (PWA) for guests on board **Anasa**, a Fountaine Pajot Isla 40 charter catamaran run by Anasa Experiences in Greece.

Live: https://iceto3.github.io/anasa-guest-manual/

- Plain HTML/CSS/JS, no build step, works offline after the first visit.
- Languages: English (default), Ελληνικά, Български, Deutsch. Switch with the globe button (top right). The choice is saved on the device; the first visit picks the phone's language when it is supported.
- SOS: the red **SOS** button opens the Emergency screen (112, 108 Hellenic Coast Guard, call the base, boat ID, VHF 16, a filled-in Mayday script) and **Send SOS with my location**, which needs a 2-second press-and-hold and then opens WhatsApp to the owner with GPS position, a Google Maps link, accuracy and time (or a "location unavailable" message).
- Your stay: Wi-Fi with copy buttons, check-in/check-out, house rules, local tips.
- Theme: Auto (follows the phone), Light or Dark. The round button in the header cycles them; the choice is saved on the device.
- Check-in damage report: guests mark existing damage on a boat drawing at the start of the charter week. Reports are saved to a small Cloudflare backend and a summary opens in WhatsApp. See [Damage check-in](#damage-check-in-v9).
- **Chat with the base (v10):** an in-app chat between guests and the base manager, with Web Push notifications. See [Chat with the base](#chat-with-the-base-v10).
- Contact us: breakage report, problem report, question, end-of-charter feedback, all sent as prefilled WhatsApp messages to the owner number (the WhatsApp fallback for the chat).

## Files

| File | What it is |
|---|---|
| `config.js` | Central app settings: default boat, languages, owner PIN, language of messages sent to the owner. |
| `boats/<id>.js` | One file per boat: name, model, contacts, radio IDs, Wi-Fi, check-in times, photos and the section/topic structure. |
| `lang/<code>.js` | One file per language: all UI text plus the text of every section and topic. |
| `app.js` | The app (routing, views, search, WhatsApp, SOS, owner settings). No content in here. |
| `chat.js` | v10 in-app chat (guest + owner views, polling, offline outbox) and the Web Push client. Loaded after `app.js`. |
| `styles.css`, `index.html` | Design and page shell. |
| `service-worker.js` | Offline cache. **Bump `VERSION` whenever anything changes** so guests get the update. |
| `worker/` | Cloudflare Worker + D1 backend for damage reports and the chat (`wrangler.toml`, `src/index.js`, `src/chat.js`, `src/webpush.js`, `schema.sql`, `migrations/`). No secrets in the repo. |
| `OUTLINE.md` | Planned sections and topics (stern to bow) plus the guest-info screens. |

Load order (in `index.html`): `config.js` → `lang/*.js` → `boats/*.js` → `app.js` → `chat.js` (the app boots on `DOMContentLoaded`, after all of them).

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

Tap the logo 5 times quickly, then enter the PIN (`0000` for now). There you can override the owner WhatsApp number on that device (stored in `localStorage`, key `owner:<boat>:whatsapp`), check the current boat config, see the damage reports, answer guest **Chats** and turn on chat notifications (see below). The **Owner API key** field sits at the top and is shared by all of these. The unlock lasts for the browser tab session (`sessionStorage` `owner:unlocked`); **Lock** ends it.

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

## Chat with the base (v10)

Guests: Home → **Contact us** → **Chat with the base** (dark card, shows an unread badge and the last message), or `#/chat`. Also linked from **Ask a question**. WhatsApp stays as the fallback.

1. First open asks for the guest's name and charter week, prefilled from the damage check-in when there is one. The conversation is tied to boat + a random conversation id + a random secret token (both in `localStorage` `chat:<boat>`) + the charter week. After the week ends (+2 days) the next open starts a new chat.
2. Native chat screen: bubbles (own = terracotta, base = white / navy in dark), day separators, timestamps, ticks (clock = sending/waiting, ✓ sent, blue ✓✓ read), "Not sent · tap to retry", an auto-growing composer with a counter near the 2000-character limit. Messages are kept in `localStorage` `chat:<boat>:msgs` and reload instantly.
3. **Offline:** messages are queued on the phone and sent when it is back online (`online` event, app start, next poll). Message ids are client-generated, so a resend never duplicates.
4. **Text only.** No photos in the chat yet (needs R2), the chat says so and links to WhatsApp for photos.
5. After the first message the guest is offered **Notify me when the base replies** (Web Push). "Not now" hides it for 3 days.

Owner: Owner settings → **Chats**: guest name, charter week, language, last message, unread count. Tap one to open the thread (`#/owner/chat/<id>`), reply, it is marked read when the thread is on screen. **Delete** removes the chat and its messages. **Notifications → Enable notifications** subscribes this device; **Send test** / **Turn off**.

**Realtime = polling + Web Push** (no WebSockets / Durable Objects): while a chat or the inbox is open the app polls the Worker every 4 s, 8 s after 1 min without new messages, 15 s after 5 min, with exponential backoff on errors (max 60 s), and stops completely when the app is hidden. Push covers the "app closed" case. This keeps everything on the free Workers + D1 plan (100k requests/day ≈ 110 hours of an open chat per day), with no extra moving parts.

**Web Push:** VAPID (ES256 JWT) + `aes128gcm` payload encryption (RFC 8291 / 8292) are implemented with WebCrypto inside the Worker (`worker/src/webpush.js`, no dependencies). A guest message pushes "Anasa · New message from <name>" to every owner subscription of the boat; an owner reply pushes "Anasa base replied" (in the guest's language) to that conversation's guest subscriptions. Tapping a notification focuses/opens the app at the thread. Expired subscriptions (404/410) are removed automatically. One subscription per device: if the same phone is used as owner and as guest, the last role turned on wins.

**iPhone:** Web Push works only for the app **added to the Home Screen**, iOS/iPadOS 16.4+ (Share → Add to Home Screen → open from the icon → turn on notifications). In a Safari tab the app shows these steps instead of the button, in all 4 languages.

Keys: the VAPID **public** key is in `config.js` → `push.vapidPublicKey` and `worker/wrangler.toml`. The **private** key is the Worker secret `VAPID_PRIVATE_KEY` (`wrangler secret put VAPID_PRIVATE_KEY`), never in this repo. If you rotate the keys, update both places; devices resubscribe automatically when they see a different public key.

### Chat API (same Worker, same CORS)

| Endpoint | Who | What |
|---|---|---|
| `POST /api/chats` | guest | create/update the conversation `{id, token, boat, name, weekFrom, weekTo, lang}`; 10 new chats/hour per IP |
| `GET /api/chats?boat=anasa` | owner key | inbox: name, week, last message, unread counts |
| `GET /api/chats/:id/messages?since=<n>&read=1` | guest (`X-Chat-Token`) or owner key | messages after `n`; `read=1` marks the other side's messages read; returns `peer_read_n` for ticks |
| `POST /api/chats/:id/messages` | guest token or owner key | `{id, body}` ≤ 2000 chars, idempotent by id; guest: 30 / 10 min per chat, 120 / hour per IP |
| `DELETE /api/chats/:id` | owner key | delete chat + messages + its push subscriptions |
| `POST /api/push/subscribe` / `unsubscribe` | guest token / owner key | store / remove a Web Push subscription (FCM, Mozilla, Apple, Windows push hosts only) |
| `GET /api/push/subscriptions?boat=` · `DELETE /api/push/subscriptions/:id` | owner key | list (with last delivery status) / remove |
| `POST /api/push/test` | owner key or guest token | send a test notification |

A guest can only read and write their own conversation: the secret token is checked on every call (only its SHA-256 is stored). D1 tables `conversations`, `messages`, `push_subscriptions` come from `worker/migrations/0002_chat.sql` (`npx wrangler d1 execute anasa-manual-db --remote --file migrations/0002_chat.sql`).

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
