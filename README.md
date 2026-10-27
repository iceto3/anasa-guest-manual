# Anasa Experiences · Isla 40 Guest Manual

A searchable, offline-capable web app (PWA) for guests on board the Fountaine Pajot Isla 40, covering everything the check-in briefing explains.

- Plain HTML/CSS/JS, no build step. Content lives in the `MANUAL` object at the top of `app.js`.
- Bump `VERSION` in `service-worker.js` whenever content changes so guests get the update.
- `OUTLINE.md` is the planned list of sections and topics (ordered stern to bow).
