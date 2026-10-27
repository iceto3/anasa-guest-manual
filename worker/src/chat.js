/* v10: in-app chat (guest ↔ base manager) + Web Push. Mounted by index.js.
 *
 *   POST   /api/chats                          guest creates / updates its conversation   (body has id + token)
 *   GET    /api/chats?boat=&limit=             owner inbox                                 (X-Owner-Key)
 *   GET    /api/chats/:id/messages?since=n&read=1   guest (X-Chat-Token) or owner (X-Owner-Key); read=1 marks the other side's messages read
 *   POST   /api/chats/:id/messages             send a message (guest token → sender guest, owner key → sender owner)
 *   DELETE /api/chats/:id                      owner deletes a conversation (+ its messages and guest push subscriptions)
 *   POST   /api/push/subscribe                 {role:'owner'|'guest', boat, convId?, subscription}  owner key / chat token
 *   POST   /api/push/unsubscribe               {endpoint}
 *   GET    /api/push/subscriptions?boat=       owner: list (status of the last delivery per device)
 *   DELETE /api/push/subscriptions/:id         owner
 *   POST   /api/push/test                      {boat} owner key → test to owner devices; {convId} + chat token → test to that guest
 *
 * Guests can only read their own conversation: id + a random secret token made on the device; only SHA-256(token) is stored.
 * Updates are delivered by polling (client) + Web Push (this file). */
import { sendPush } from "./webpush.js";

export const CHAT = { body: 8_000, text: 2000, name: 80, preview: 140, maxMsgsPerConv: 2000,
  guestPer10min: 30, guestPerHourIp: 120, convPerHourIp: 10, subsPerConv: 5, ownerSubsPerBoat: 20 };
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /^web\.push\.apple\.com$/,
  /\.notify\.windows\.com$/, /^push\.api\.chrome\.google\.com$/];
const GUEST_TITLE = { en: "{boat} base replied", el: "Η βάση {boat} απάντησε", bg: "Базата на {boat} отговори", de: "{boat}-Basis hat geantwortet" };

const enc = new TextEncoder();
async function sha256Hex(s) { const d = await crypto.subtle.digest("SHA-256", enc.encode(s)); return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, "0")).join(""); }
const isId = v => typeof v === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(v);
const isToken = v => typeof v === "string" && /^[A-Za-z0-9_-]{32,128}$/.test(v);
const isBoat = v => typeof v === "string" && /^[a-z0-9-]{1,32}$/.test(v);
const isDate = v => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !isNaN(Date.parse(v + "T00:00:00Z"));
const clean = (v, max) => typeof v === "string" ? v.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim().slice(0, max) : "";
const boatName = b => b.charAt(0).toUpperCase() + b.slice(1);
const nowIso = () => new Date().toISOString();
const ago = mins => new Date(Date.now() - mins * 60000).toISOString();

function teq(a, b) { const x = enc.encode(a), y = enc.encode(b); return x.byteLength === y.byteLength && crypto.subtle.timingSafeEqual(x, y); }
async function guestOk(req, conv) { const tok = req.headers.get("x-chat-token") || ""; return !!conv && isToken(tok) && teq(await sha256Hex("chat:" + tok), conv.token_hash); }

async function readJson(req, max, h) {
  if (!(req.headers.get("content-type") || "").includes("application/json")) return { e: h.err(415, "json_only", "Send JSON") };
  if ((+req.headers.get("content-length") || 0) > max) return { e: h.err(413, "too_large", "Too large") };
  const raw = await req.text(); if (raw.length > max) return { e: h.err(413, "too_large", "Too large") };
  try { return { b: JSON.parse(raw) }; } catch { return { e: h.err(400, "bad_json", "Invalid JSON") }; }
}
const pubConv = c => c && ({ id: c.id, boat: c.boat, guest_name: c.guest_name, week_from: c.week_from, week_to: c.week_to, lang: c.lang,
  created_at: c.created_at, last_msg_at: c.last_msg_at, last_msg_preview: c.last_msg_preview, last_sender: c.last_sender,
  unread_owner: c.unread_owner, unread_guest: c.unread_guest, msg_count: c.msg_count });
const getConv = (env, id) => env.DB.prepare("SELECT * FROM conversations WHERE id = ?").bind(id).first();

/* ---------- conversations ---------- */
async function upsertConversation(req, env, h) {
  const { b, e } = await readJson(req, CHAT.body, h); if (e) return e;
  const errs = [];
  if (!b || typeof b !== "object") return h.err(422, "invalid", "body must be an object");
  if (!isId(b.id)) errs.push("id"); if (!isToken(b.token)) errs.push("token"); if (!isBoat(b.boat)) errs.push("boat");
  const name = clean(b.name, CHAT.name); if (!name) errs.push("name");
  const w = b.week || {};
  if (!isDate(w.from)) errs.push("week.from"); if (!isDate(w.to)) errs.push("week.to");
  if (isDate(w.from) && isDate(w.to) && (w.to < w.from || Date.parse(w.to) - Date.parse(w.from) > 62 * 864e5)) errs.push("week range");
  if (errs.length) return h.err(422, "invalid", "Invalid fields: " + errs.join(", "));
  const lang = clean(b.lang, 8) || null, app = clean(b.appVersion, 40) || null, th = await sha256Hex("chat:" + b.token), now = nowIso();
  const ex = await getConv(env, b.id);
  if (ex) {
    if (ex.boat !== b.boat || !teq(th, ex.token_hash)) return h.err(409, "conflict", "Conversation id already used");
    await env.DB.prepare("UPDATE conversations SET guest_name = ?, week_from = ?, week_to = ?, lang = ?, app_version = ?, updated_at = ? WHERE id = ?")
      .bind(name, w.from, w.to, lang, app, now, b.id).run();
    return h.json({ ok: true, conversation: pubConv(await getConv(env, b.id)) });
  }
  const ipHash = await h.ipHash();
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM conversations WHERE ip_hash = ? AND created_at > ?").bind(ipHash, ago(60)).first();
  if ((r?.n || 0) >= CHAT.convPerHourIp) return h.err(429, "rate_limited", "Too many new chats, try again later", { "retry-after": "3600" });
  await env.DB.prepare(`INSERT INTO conversations (id, boat, token_hash, guest_name, week_from, week_to, lang, created_at, updated_at, ip_hash, app_version)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(b.id, b.boat, th, name, w.from, w.to, lang, now, now, ipHash, app).run();
  return h.json({ ok: true, conversation: pubConv(await getConv(env, b.id)) }, 201);
}

async function listConversations(req, env, h, url) {
  if (!h.ownerOk()) return h.err(401, "owner_key", "Owner key required");
  const boat = url.searchParams.get("boat") || ""; if (!isBoat(boat)) return h.err(400, "boat", "boat is required");
  const limit = Math.min(Math.max(parseInt(url.searchParams.get("limit") || "100", 10) || 100, 1), 300);
  const { results } = await env.DB.prepare(`SELECT * FROM conversations WHERE boat = ? ORDER BY COALESCE(last_msg_at, created_at) DESC LIMIT ?`).bind(boat, limit).all();
  const unread = results.reduce((a, c) => a + (c.unread_owner || 0), 0);
  return h.json({ ok: true, boat, unread, conversations: results.map(pubConv) }, 200, { "cache-control": "no-store" });
}

async function getMessages(req, env, h, url, conv) {
  const owner = h.ownerOk(), guest = !owner && await guestOk(req, conv);
  if (!owner && !guest) return h.err(401, "auth", "Not allowed");
  const since = Math.max(parseInt(url.searchParams.get("since") || "0", 10) || 0, 0);
  const me = owner ? "owner" : "guest", peer = owner ? "guest" : "owner";
  if (url.searchParams.get("read") === "1" && (owner ? conv.unread_owner : conv.unread_guest) > 0) {
    const now = nowIso();
    await env.DB.batch([
      env.DB.prepare("UPDATE messages SET read_at = ? WHERE conv_id = ? AND sender = ? AND read_at IS NULL").bind(now, conv.id, peer),
      env.DB.prepare(`UPDATE conversations SET ${owner ? "unread_owner" : "unread_guest"} = 0 WHERE id = ?`).bind(conv.id)]);
    conv[owner ? "unread_owner" : "unread_guest"] = 0;
  }
  const [{ results: msgs }, rd] = await env.DB.batch([
    env.DB.prepare("SELECT n, id, sender, body, created_at, read_at FROM messages WHERE conv_id = ? AND n > ? ORDER BY n LIMIT 300").bind(conv.id, since),
    env.DB.prepare("SELECT MAX(n) AS n FROM messages WHERE conv_id = ? AND sender = ? AND read_at IS NOT NULL").bind(conv.id, me)]);
  return h.json({ ok: true, as: me, conversation: pubConv(conv), messages: msgs, peer_read_n: rd.results[0]?.n || 0 }, 200, { "cache-control": "no-store" });
}

async function postMessage(req, env, h, conv, ctx) {
  const owner = h.ownerOk(), guest = !owner && await guestOk(req, conv);
  if (!owner && !guest) return h.err(401, "auth", "Not allowed");
  const { b, e } = await readJson(req, CHAT.body, h); if (e) return e;
  if (!b || !isId(b.id)) return h.err(422, "invalid", "Invalid fields: id");
  const raw = typeof b.body === "string" ? b.body : "";
  const body = clean(raw, CHAT.text + 1);
  if (!body) return h.err(422, "invalid", "Invalid fields: body");
  if (body.length > CHAT.text) return h.err(413, "too_long", `Max ${CHAT.text} characters`);
  const sender = owner ? "owner" : "guest";
  const dup = await env.DB.prepare("SELECT n, id, conv_id, sender, body, created_at, read_at FROM messages WHERE id = ?").bind(b.id).first();
  if (dup) {
    if (dup.conv_id !== conv.id || dup.sender !== sender) return h.err(409, "conflict", "Message id already used");
    const { conv_id, ...m } = dup; return h.json({ ok: true, duplicate: true, message: m });
  }
  if (conv.msg_count >= CHAT.maxMsgsPerConv) return h.err(429, "full", "This conversation is full");
  const ipHash = await h.ipHash();
  if (guest) {
    const [a, c] = await env.DB.batch([
      env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE conv_id = ? AND sender = 'guest' AND created_at > ?").bind(conv.id, ago(10)),
      env.DB.prepare("SELECT COUNT(*) AS n FROM messages WHERE ip_hash = ? AND sender = 'guest' AND created_at > ?").bind(ipHash, ago(60))]);
    if (a.results[0].n >= CHAT.guestPer10min || c.results[0].n >= CHAT.guestPerHourIp)
      return h.err(429, "rate_limited", "Too many messages, wait a moment", { "retry-after": "120" });
  }
  const now = nowIso(), preview = body.replace(/\s+/g, " ").slice(0, CHAT.preview);
  const clientAt = clean(b.createdAt, 40) || null;
  const [ins] = await env.DB.batch([
    env.DB.prepare("INSERT INTO messages (id, conv_id, sender, body, created_at, client_created_at, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING n")
      .bind(b.id, conv.id, sender, body, now, clientAt, ipHash),
    env.DB.prepare(`UPDATE conversations SET last_msg_at = ?, last_msg_preview = ?, last_sender = ?, msg_count = msg_count + 1, updated_at = ?,
      ${guest ? "unread_owner = unread_owner + 1" : "unread_guest = unread_guest + 1"} WHERE id = ?`).bind(now, preview, sender, now, conv.id)]);
  const message = { n: ins.results[0].n, id: b.id, sender, body, created_at: now, read_at: null };
  const payload = guest
    ? { title: `${boatName(conv.boat)} · New message from ${conv.guest_name}`, body: preview, tag: "chat-" + conv.id, url: `./#/owner/chat/${conv.id}`, kind: "owner", convId: conv.id }
    : { title: (GUEST_TITLE[conv.lang] || GUEST_TITLE.en).replace("{boat}", boatName(conv.boat)), body: preview, tag: "chat-" + conv.id, url: "./#/chat", kind: "guest", convId: conv.id };
  const subs = guest
    ? env.DB.prepare("SELECT * FROM push_subscriptions WHERE boat = ? AND role = 'owner'").bind(conv.boat)
    : env.DB.prepare("SELECT * FROM push_subscriptions WHERE conv_id = ? AND role = 'guest'").bind(conv.id);
  const job = subs.all().then(({ results }) => deliver(env, results, payload)).catch(err => console.error("push", err && err.stack || err));
  if (ctx && ctx.waitUntil) ctx.waitUntil(job);
  return h.json({ ok: true, message }, 201);
}

async function deleteConversation(env, h, id) {
  if (!h.ownerOk()) return h.err(401, "owner_key", "Owner key required");
  const r = await env.DB.batch([
    env.DB.prepare("DELETE FROM messages WHERE conv_id = ?").bind(id),
    env.DB.prepare("DELETE FROM push_subscriptions WHERE conv_id = ?").bind(id),
    env.DB.prepare("DELETE FROM conversations WHERE id = ?").bind(id)]);
  return h.json({ ok: true, deleted: r[2].meta.changes || 0, messages: r[0].meta.changes || 0 });
}

/* ---------- push ---------- */
const vapidOf = env => env.VAPID_PUBLIC_KEY && env.VAPID_PRIVATE_KEY
  ? { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || "https://iceto3.github.io/anasa-guest-manual/" } : null;
export const pushEnabled = env => !!vapidOf(env);

async function deliver(env, subs, payload) {
  const vapid = vapidOf(env); if (!vapid || !subs.length) return [];
  const out = await Promise.all(subs.map(async s => {
    let r; try { r = await sendPush(s, payload, vapid, { topic: payload.tag }); } catch (e) { r = { status: 0, ok: false, gone: false, text: String(e && e.message || e).slice(0, 200) }; }
    const now = nowIso();
    if (r.gone) await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(s.id).run();
    else await env.DB.prepare("UPDATE push_subscriptions SET last_sent_at = ?, last_status = ?, last_error = ?, fail_count = ? WHERE id = ?")
      .bind(now, r.status, r.ok ? null : (r.text || "error"), r.ok ? 0 : (s.fail_count || 0) + 1, s.id).run();
    return { id: s.id, role: s.role, status: r.status, ok: r.ok, gone: r.gone, host: new URL(s.endpoint).host };
  }));
  return out;
}

function validSub(sub) {
  if (!sub || typeof sub !== "object" || typeof sub.endpoint !== "string" || sub.endpoint.length > 1000) return null;
  let u; try { u = new URL(sub.endpoint); } catch { return null; }
  if (u.protocol !== "https:" || !PUSH_HOSTS.some(r => r.test(u.hostname))) return null;
  const k = sub.keys || {};
  const p = typeof k.p256dh === "string" && /^[A-Za-z0-9_-]{86,88}$/.test(k.p256dh) ? k.p256dh : null;
  const a = typeof k.auth === "string" && /^[A-Za-z0-9_-]{16,32}$/.test(k.auth) ? k.auth : null;
  return p && a ? { endpoint: sub.endpoint, p256dh: p, auth: a } : null;
}

async function subscribe(req, env, h) {
  if (!pushEnabled(env)) return h.err(501, "push_disabled", "Push is not configured");
  const { b, e } = await readJson(req, 4000, h); if (e) return e;
  if (!b || !["owner", "guest"].includes(b.role) || !isBoat(b.boat)) return h.err(422, "invalid", "Invalid fields: role/boat");
  const sub = validSub(b.subscription); if (!sub) return h.err(422, "invalid", "Invalid push subscription (unknown push service or bad keys)");
  let convId = null;
  if (b.role === "owner") { if (!h.ownerOk()) return h.err(401, "owner_key", "Owner key required"); }
  else {
    if (!isId(b.convId)) return h.err(422, "invalid", "Invalid fields: convId");
    const conv = await getConv(env, b.convId);
    if (!conv || conv.boat !== b.boat || !(await guestOk(req, conv))) return h.err(401, "auth", "Not allowed");
    convId = conv.id;
  }
  const id = (await sha256Hex(sub.endpoint)).slice(0, 32);
  const cnt = b.role === "owner"
    ? await env.DB.prepare("SELECT COUNT(*) AS n FROM push_subscriptions WHERE boat = ? AND role = 'owner' AND id != ?").bind(b.boat, id).first()
    : await env.DB.prepare("SELECT COUNT(*) AS n FROM push_subscriptions WHERE conv_id = ? AND id != ?").bind(convId, id).first();
  if ((cnt?.n || 0) >= (b.role === "owner" ? CHAT.ownerSubsPerBoat : CHAT.subsPerConv)) return h.err(429, "too_many", "Too many devices subscribed");
  await env.DB.prepare(`INSERT INTO push_subscriptions (id, boat, role, conv_id, endpoint, p256dh, auth, lang, ua, created_at, fail_count) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    ON CONFLICT(id) DO UPDATE SET boat = excluded.boat, role = excluded.role, conv_id = excluded.conv_id, p256dh = excluded.p256dh, auth = excluded.auth,
      lang = excluded.lang, ua = excluded.ua, fail_count = 0, last_error = NULL`)
    .bind(id, b.boat, b.role, convId, sub.endpoint, sub.p256dh, sub.auth, clean(b.lang, 8) || null, clean(req.headers.get("user-agent") || "", 160) || null, nowIso()).run();
  return h.json({ ok: true, id }, 201);
}

async function unsubscribe(req, env, h) {
  const { b, e } = await readJson(req, 2000, h); if (e) return e;
  if (!b || typeof b.endpoint !== "string") return h.err(422, "invalid", "endpoint");
  const id = (await sha256Hex(b.endpoint)).slice(0, 32);
  const r = await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ? AND endpoint = ?").bind(id, b.endpoint).run();
  return h.json({ ok: true, deleted: r.meta.changes || 0 });
}

async function testPush(req, env, h) {
  if (!pushEnabled(env)) return h.err(501, "push_disabled", "Push is not configured");
  const r0 = await readJson(req, 2000, h); if (r0.e) return r0.e;
  const b = r0.b && typeof r0.b === "object" ? r0.b : {};
  let subs, payload;
  if (h.ownerOk() && isBoat(b.boat)) {
    ({ results: subs } = await env.DB.prepare("SELECT * FROM push_subscriptions WHERE boat = ? AND role = 'owner'" + (b.endpoint ? " AND endpoint = ?" : ""))
      .bind(...(b.endpoint ? [b.boat, b.endpoint] : [b.boat])).all());
    payload = { title: `${boatName(b.boat)} · Test notification`, body: "Notifications for guest chats are on.", tag: "test", url: "./#/owner", kind: "test" };
  } else if (isId(b.convId)) {
    const conv = await getConv(env, b.convId);
    if (!conv || !(await guestOk(req, conv))) return h.err(401, "auth", "Not allowed");
    ({ results: subs } = await env.DB.prepare("SELECT * FROM push_subscriptions WHERE conv_id = ? AND role = 'guest'" + (b.endpoint ? " AND endpoint = ?" : ""))
      .bind(...(b.endpoint ? [conv.id, b.endpoint] : [conv.id])).all());
    payload = { title: `${boatName(conv.boat)} · Test`, body: "✓", tag: "test", url: "./#/chat", kind: "test" };
  } else return h.err(401, "auth", "Not allowed");
  const results = await deliver(env, subs, payload);
  return h.json({ ok: true, sent: results.filter(r => r.ok).length, results });
}

async function listSubs(env, h, url) {
  if (!h.ownerOk()) return h.err(401, "owner_key", "Owner key required");
  const boat = url.searchParams.get("boat") || ""; if (!isBoat(boat)) return h.err(400, "boat", "boat is required");
  const { results } = await env.DB.prepare("SELECT id, role, conv_id, endpoint, created_at, last_sent_at, last_status, last_error, fail_count, lang FROM push_subscriptions WHERE boat = ? ORDER BY created_at DESC LIMIT 200").bind(boat).all();
  return h.json({ ok: true, subscriptions: results.map(({ endpoint, ...s }) => ({ ...s, host: new URL(endpoint).host })) }, 200, { "cache-control": "no-store" });
}

/** Returns a Response, or null when the path is not a chat/push route. */
export async function handleChat(req, env, ctx, url, parts, h) {
  if (parts[1] === "chats") {
    if (parts.length === 2 && req.method === "POST") return upsertConversation(req, env, h);
    if (parts.length === 2 && req.method === "GET") return listConversations(req, env, h, url);
    if (parts.length >= 3 && !isId(parts[2])) return h.err(400, "id", "Bad id");
    if (parts.length === 3 && req.method === "DELETE") return deleteConversation(env, h, parts[2]);
    if (parts.length === 4 && parts[3] === "messages") {
      const conv = await getConv(env, parts[2]);
      if (!conv) return h.err(404, "not_found", "No such conversation");
      if (req.method === "GET") return getMessages(req, env, h, url, conv);
      if (req.method === "POST") return postMessage(req, env, h, conv, ctx);
    }
    return h.err(405, "method", "Method not allowed");
  }
  if (parts[1] === "push") {
    if (parts[2] === "subscribe" && req.method === "POST") return subscribe(req, env, h);
    if (parts[2] === "unsubscribe" && req.method === "POST") return unsubscribe(req, env, h);
    if (parts[2] === "test" && req.method === "POST") return testPush(req, env, h);
    if (parts[2] === "subscriptions" && parts.length === 3 && req.method === "GET") return listSubs(env, h, url);
    if (parts[2] === "subscriptions" && parts.length === 4 && req.method === "DELETE") {
      if (!h.ownerOk()) return h.err(401, "owner_key", "Owner key required");
      const r = await env.DB.prepare("DELETE FROM push_subscriptions WHERE id = ?").bind(parts[3]).run();
      return h.json({ ok: true, deleted: r.meta.changes || 0 });
    }
    return h.err(404, "not_found", "Not found");
  }
  return null;
}
