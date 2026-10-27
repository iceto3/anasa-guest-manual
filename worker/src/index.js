/* Anasa guest manual API — damage check-in reports (Cloudflare Worker + D1).
 *
 *   GET    /api/health
 *   POST   /api/reports                         guest submits a report (idempotent by id)
 *   GET    /api/reports?boat=anasa&kind=&limit=  owner list            (X-Owner-Key)
 *   GET    /api/reports/:id                      owner single report   (X-Owner-Key)
 *   DELETE /api/reports/:id                      owner delete          (X-Owner-Key)
 *   PUT    /api/reports/:id/photos/:photoId      photo upload — returns 501 until an R2 bucket is bound as PHOTOS
 *   GET    /api/photos/:photoId                  owner photo download  (X-Owner-Key, needs R2)
 *
 *   v10 chat + Web Push routes (/api/chats…, /api/push…): see chat.js
 *
 * Security is basic on purpose: CORS allow-list, input validation, size limits, a per-IP rate limit and a shared
 * owner key (secret OWNER_KEY) for the owner endpoints. It is not real authentication.
 */
import { handleChat, pushEnabled } from "./chat.js";
const KINDS = ["checkin", "checkout"];
const TYPES = ["scratch", "dent", "torn", "stain", "notWorking", "missing", "other"];
const VIEWS = ["top", "stbd", "port"];
const LIMITS = { body: 100_000, items: 80, desc: 500, name: 80, area: 60, photosPerItem: 6, photoBytes: 2_500_000 };
const RATE = { perHour: 20 };   // report submissions per IP per hour

const json = (data, status = 200, headers = {}) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", ...headers } });
const err = (status, code, message, headers) => json({ ok: false, error: code, message }, status, headers);

function allowedOrigin(origin, env) {
  if (!origin) return null;
  const list = String(env.ALLOWED_ORIGINS || "").split(",").map(s => s.trim()).filter(Boolean);
  if (list.includes(origin)) return origin;
  if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/.test(origin)) return origin;
  return null;
}
function corsHeaders(origin) {
  return origin ? {
    "access-control-allow-origin": origin, "vary": "Origin",
    "access-control-allow-methods": "GET,POST,PUT,DELETE,OPTIONS",
    "access-control-allow-headers": "content-type,x-owner-key,x-chat-token",
    "access-control-max-age": "86400"
  } : { "vary": "Origin" };
}

async function sha256Hex(s) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join("");
}
function ownerOk(req, env) {
  const key = req.headers.get("x-owner-key") || "", secret = env.OWNER_KEY || "";
  if (!secret || !key) return false;
  const a = new TextEncoder().encode(key), b = new TextEncoder().encode(secret);
  if (a.byteLength !== b.byteLength) return false;
  return crypto.subtle.timingSafeEqual(a, b);
}

const str = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const isDate = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + "T00:00:00Z"));
const isId = v => typeof v === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(v);
const num01 = v => (typeof v === "number" && isFinite(v) && v >= 0 && v <= 1 ? Math.round(v * 10000) / 10000 : null);

function validateReport(b) {
  const e = [];
  if (!b || typeof b !== "object") return { errors: ["body must be a JSON object"] };
  if (!isId(b.id)) e.push("id");
  const boat = typeof b.boat === "string" && /^[a-z0-9-]{1,32}$/.test(b.boat) ? b.boat : (e.push("boat"), "");
  const kind = KINDS.includes(b.kind) ? b.kind : (e.push("kind"), "");
  const name = str(b.name, LIMITS.name); if (!name) e.push("name");
  const week = b.week || {};
  if (!isDate(week.from)) e.push("week.from");
  if (!isDate(week.to)) e.push("week.to");
  if (isDate(week.from) && isDate(week.to) && week.to < week.from) e.push("week.to before week.from");
  if (b.confirmed !== true) e.push("confirmed");
  if (!Array.isArray(b.items) || b.items.length > LIMITS.items) e.push("items");
  const items = [];
  (Array.isArray(b.items) ? b.items : []).slice(0, LIMITS.items).forEach((it, i) => {
    if (!it || typeof it !== "object") { e.push(`items[${i}]`); return; }
    const type = TYPES.includes(it.type) ? it.type : (e.push(`items[${i}].type`), "other");
    const view = it.view == null ? null : (VIEWS.includes(it.view) ? it.view : (e.push(`items[${i}].view`), null));
    const photos = Array.isArray(it.photos) ? it.photos.slice(0, LIMITS.photosPerItem) : [];
    const ph = [];
    photos.forEach((p, k) => {
      if (!p || !isId(p.id)) { e.push(`items[${i}].photos[${k}].id`); return; }
      ph.push({ id: p.id, type: p.type === "image/jpeg" ? "image/jpeg" : "image/jpeg",
        bytes: Number.isInteger(p.bytes) && p.bytes > 0 && p.bytes <= LIMITS.photoBytes ? p.bytes : null,
        width: Number.isInteger(p.width) && p.width > 0 && p.width <= 8000 ? p.width : null,
        height: Number.isInteger(p.height) && p.height > 0 && p.height <= 8000 ? p.height : null });
    });
    items.push({ n: i + 1, id: isId(it.id) ? it.id : null, view,
      x: view ? num01(it.x) : null, y: view ? num01(it.y) : null,
      zone: str(it.zone, 32).replace(/[^A-Za-z0-9_-]/g, "") || null, area: str(it.area, LIMITS.area) || null,
      type, description: str(it.description, LIMITS.desc) || null, photos: ph });
  });
  return { errors: e, report: { id: b.id, boat, kind, name, from: week.from, to: week.to, lang: str(b.lang, 8) || null,
    clientCreatedAt: str(b.createdAt, 40) || null, appVersion: str(b.appVersion, 40) || null, items } };
}

async function createReport(req, env, cors) {
  const len = +req.headers.get("content-length") || 0;
  if (len > LIMITS.body) return err(413, "too_large", "Report too large", cors);
  if (!(req.headers.get("content-type") || "").includes("application/json")) return err(415, "json_only", "Send JSON", cors);
  const raw = await req.text();
  if (raw.length > LIMITS.body) return err(413, "too_large", "Report too large", cors);
  let body; try { body = JSON.parse(raw); } catch { return err(400, "bad_json", "Invalid JSON", cors); }
  const { errors, report: r } = validateReport(body);
  if (errors.length) return err(422, "invalid", "Invalid fields: " + errors.slice(0, 12).join(", "), cors);

  const existing = await env.DB.prepare("SELECT id, boat, created_at FROM reports WHERE id = ?").bind(r.id).first();
  if (existing) {
    if (existing.boat !== r.boat) return err(409, "conflict", "Report id already used", cors);
    return json({ ok: true, id: r.id, created_at: existing.created_at, duplicate: true }, 200, cors);
  }
  const ip = req.headers.get("cf-connecting-ip") || "0.0.0.0";
  const ipHash = (await sha256Hex("anasa:" + ip)).slice(0, 24);
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM reports WHERE ip_hash = ? AND created_at > strftime('%Y-%m-%dT%H:%M:%fZ','now','-1 hour')")
    .bind(ipHash).first();
  if ((recent?.n || 0) >= RATE.perHour) return err(429, "rate_limited", "Too many reports, try again later", { ...cors, "retry-after": "3600" });

  const photoCount = r.items.reduce((a, it) => a + it.photos.length, 0);
  const now = new Date().toISOString();
  const stmts = [env.DB.prepare(`INSERT INTO reports (id, boat, kind, week_from, week_to, name, lang, confirmed, item_count, photo_count, client_created_at, created_at, ip_hash, app_version)
      VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`)
    .bind(r.id, r.boat, r.kind, r.from, r.to, r.name, r.lang, r.items.length, photoCount, r.clientCreatedAt, now, ipHash, r.appVersion)];
  for (const it of r.items) {
    stmts.push(env.DB.prepare(`INSERT INTO report_items (report_id, n, item_id, view, x, y, zone, area, type, description, photo_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(r.id, it.n, it.id, it.view, it.x, it.y, it.zone, it.area, it.type, it.description, it.photos.length));
    for (const p of it.photos)
      stmts.push(env.DB.prepare(`INSERT OR IGNORE INTO report_photos (id, report_id, item_n, status, content_type, bytes, width, height, created_at) VALUES (?, ?, ?, 'device', ?, ?, ?, ?, ?)`)
        .bind(p.id, r.id, it.n, p.type, p.bytes, p.width, p.height, now));
  }
  await env.DB.batch(stmts);
  return json({ ok: true, id: r.id, created_at: now, items: r.items.length, photos: photoCount,
    photoUpload: env.PHOTOS ? "enabled" : "disabled" }, 201, cors);
}

async function loadReports(env, where, binds, limit) {
  const { results: reps } = await env.DB.prepare(
    `SELECT id, boat, kind, week_from, week_to, name, lang, confirmed, item_count, photo_count, client_created_at, created_at, app_version
     FROM reports WHERE ${where} ORDER BY created_at DESC LIMIT ?`).bind(...binds, limit).all();
  if (!reps.length) return [];
  const ids = reps.map(r => r.id), q = ids.map(() => "?").join(",");
  const [{ results: items }, { results: photos }] = await env.DB.batch([
    env.DB.prepare(`SELECT report_id, n, item_id, view, x, y, zone, area, type, description, photo_count FROM report_items WHERE report_id IN (${q}) ORDER BY n`).bind(...ids),
    env.DB.prepare(`SELECT id, report_id, item_n, status, content_type, bytes, width, height, uploaded_at FROM report_photos WHERE report_id IN (${q})`).bind(...ids)
  ]);
  return reps.map(r => ({ ...r, confirmed: !!r.confirmed,
    items: items.filter(i => i.report_id === r.id).map(({ report_id, ...i }) => ({ ...i, photos: photos.filter(p => p.report_id === r.id && p.item_n === i.n).map(({ report_id, ...p }) => p) })) }));
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url), origin = req.headers.get("origin");
    const okOrigin = allowedOrigin(origin, env), cors = corsHeaders(okOrigin);
    if (origin && !okOrigin) return err(403, "origin", "Origin not allowed");
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    const parts = url.pathname.replace(/\/+$/, "").split("/").filter(Boolean);   // ["api", ...]
    if (parts[0] !== "api") return err(404, "not_found", "Not found", cors);
    try {
      if (parts[1] === "health" && req.method === "GET")
        return json({ ok: true, service: "anasa-manual-api", version: env.API_VERSION || "1", photoUpload: env.PHOTOS ? "enabled" : "disabled",
          chat: true, push: pushEnabled(env) ? "enabled" : "disabled" }, 200, cors);

      if (parts[1] === "chats" || parts[1] === "push") {
        const h = { cors, json: (d, s = 200, x = {}) => json(d, s, { ...cors, ...x }), err: (s, c, m, x = {}) => err(s, c, m, { ...cors, ...x }),
          ownerOk: () => ownerOk(req, env), ipHash: async () => (await sha256Hex("anasa:" + (req.headers.get("cf-connecting-ip") || "0.0.0.0"))).slice(0, 24) };
        const res = await handleChat(req, env, ctx, url, parts, h);
        if (res) return res;
      }

      if (parts[1] === "reports" && parts.length === 2) {
        if (req.method === "POST") return await createReport(req, env, cors);
        if (req.method === "GET") {
          if (!ownerOk(req, env)) return err(401, "owner_key", "Owner key required", cors);
          const boat = url.searchParams.get("boat") || "";
          if (!/^[a-z0-9-]{1,32}$/.test(boat)) return err(400, "boat", "boat is required", cors);
          const kind = url.searchParams.get("kind");
          const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "50", 10) || 50, 1), 200);
          const reports = KINDS.includes(kind) ? await loadReports(env, "boat = ? AND kind = ?", [boat, kind], limit)
                                               : await loadReports(env, "boat = ?", [boat], limit);
          return json({ ok: true, boat, reports }, 200, { ...cors, "cache-control": "no-store" });
        }
      }
      if (parts[1] === "reports" && parts.length === 3 && isId(parts[2])) {
        if (!ownerOk(req, env)) return err(401, "owner_key", "Owner key required", cors);
        if (req.method === "GET") {
          const [r] = await loadReports(env, "id = ?", [parts[2]], 1);
          return r ? json({ ok: true, report: r }, 200, cors) : err(404, "not_found", "No such report", cors);
        }
        if (req.method === "DELETE") {
          const res = await env.DB.batch([
            env.DB.prepare("DELETE FROM report_photos WHERE report_id = ?").bind(parts[2]),
            env.DB.prepare("DELETE FROM report_items WHERE report_id = ?").bind(parts[2]),
            env.DB.prepare("DELETE FROM reports WHERE id = ?").bind(parts[2])]);
          return json({ ok: true, deleted: res[2].meta.changes || 0 }, 200, cors);
        }
      }
      if (parts[1] === "reports" && parts[3] === "photos" && parts.length === 5 && req.method === "PUT") {
        if (!env.PHOTOS) return err(501, "photo_upload_disabled", "Photo upload is not enabled yet (no R2 bucket bound). Photos stay on the device.", cors);
        const [rid, pid] = [parts[2], parts[4]];
        if (!isId(rid) || !isId(pid)) return err(400, "id", "Bad id", cors);
        const row = await env.DB.prepare("SELECT p.id, p.status, r.boat FROM report_photos p JOIN reports r ON r.id = p.report_id WHERE p.id = ? AND p.report_id = ?").bind(pid, rid).first();
        if (!row) return err(404, "not_found", "Unknown photo (declare it in the report first)", cors);
        if (row.status === "uploaded") return json({ ok: true, duplicate: true }, 200, cors);
        if ((req.headers.get("content-type") || "") !== "image/jpeg") return err(415, "jpeg_only", "Send image/jpeg", cors);
        const len = +req.headers.get("content-length") || 0;
        if (!len || len > LIMITS.photoBytes) return err(413, "too_large", "Photo too large", cors);
        const key = `${row.boat}/${rid}/${pid}.jpg`;
        await env.PHOTOS.put(key, req.body, { httpMetadata: { contentType: "image/jpeg" } });
        await env.DB.prepare("UPDATE report_photos SET status = 'uploaded', r2_key = ?, uploaded_at = ? WHERE id = ?").bind(key, new Date().toISOString(), pid).run();
        return json({ ok: true, key }, 201, cors);
      }
      if (parts[1] === "photos" && parts.length === 3 && req.method === "GET") {
        if (!ownerOk(req, env)) return err(401, "owner_key", "Owner key required", cors);
        if (!env.PHOTOS) return err(501, "photo_upload_disabled", "Photo storage is not enabled yet", cors);
        const row = await env.DB.prepare("SELECT r2_key FROM report_photos WHERE id = ? AND status = 'uploaded'").bind(parts[2]).first();
        const obj = row && await env.PHOTOS.get(row.r2_key);
        return obj ? new Response(obj.body, { headers: { ...cors, "content-type": "image/jpeg", "cache-control": "private, max-age=3600" } }) : err(404, "not_found", "No photo", cors);
      }
      return err(404, "not_found", "Not found", cors);
    } catch (e) {
      console.error("api error", e && e.stack || e);
      return err(500, "server", "Server error", cors);
    }
  }
};
