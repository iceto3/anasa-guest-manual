/* Anasa Guest Manual — v10: in-app chat with the base + Web Push notifications.
 * Loaded after app.js (shares its globals: BOAT, CFG, store, t, esc, ic, P, $app, setNav, toast, uid, isoDate, addDays, API, …).
 *
 * Guest:  #/chat (thread) · #/chat/setup (name + charter week)
 *   localStorage chat:<boat>       {id, token, name, from, to, synced, lastN, peerReadN, unread}   ← random device conversation id + secret token
 *   localStorage chat:<boat>:msgs  [{id, n, sender, body, at, status: sending|queued|sent|failed}]
 * Owner:  Owner settings (5 taps + PIN) → Chats inbox · #/owner/chat/<id> thread · notifications opt-in
 * Updates: polling while the chat is on screen (4 s → 8 s → 15 s when idle, exponential backoff on errors, paused when hidden)
 *          + Web Push (VAPID) when the app is closed. Text only for now (no photo upload until R2 is enabled). */
const CHAT_MAX = 2000;
const CKEY = () => `chat:${BOAT.id}`, MKEY = () => `chat:${BOAT.id}:msgs`;
const chatConv = () => store.get(CKEY(), null);
const saveConv = c => store.set(CKEY(), c);
const chatMsgs = () => store.get(MKEY(), []);
const saveMsgs = m => store.set(MKEY(), m.slice(-500));
const randTok = () => { const a = crypto.getRandomValues(new Uint8Array(32)); let s = ""; a.forEach(b => s += String.fromCharCode(b));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); };
const convEnded = c => !!(c && c.to && isoDate(addDays(-2)) > c.to);   // charter week ended more than 2 days ago → new chat
const locale = () => L().locale;
const shortDate = s => { try { return new Date(s + "T12:00:00").toLocaleDateString(locale(), { day: "numeric", month: "short" }); } catch { return s; } };
const fmtRange = (a, b) => `${shortDate(a)} – ${shortDate(b)}`;
const timeStr = d => d.toLocaleTimeString(locale(), { hour: "2-digit", minute: "2-digit" });
function dayLabel(d) {
  const k = isoDate(d);
  if (k === isoDate(new Date())) return t("chatToday");
  if (k === isoDate(addDays(-1))) return t("chatYesterday");
  return d.toLocaleDateString(locale(), { weekday: "short", day: "numeric", month: "short" });
}
const whenShort = s => { const d = new Date(s); return isoDate(d) === isoDate(new Date()) ? timeStr(d) : d.toLocaleDateString(locale(), { day: "numeric", month: "short" }); };
const linkify = html => html.replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, u => `<a href="${u}" target="_blank" rel="noopener">${u}</a>`);
const initials = n => String(n || "?").trim().split(/\s+/).slice(0, 2).map(w => w[0] || "").join("").toUpperCase() || "?";

Object.assign(P, {
  send: '<path d="M4.5 12L20 4.5l-4 15.5-4.2-6.3z"/><path d="M11.8 13.7L20 4.5"/>',
  dcheck: '<path d="M2.5 12.5l4.2 4.2L15.5 7.5"/><path d="M11.4 16.5l.4.2L21.5 7.5"/>',
  bell: '<path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15z"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/>',
  bellOff: '<path d="M6 16.5V11a6 6 0 0 1 9.6-4.8M18 11v5.5l1.5 2H8"/><path d="M10 20.5a2.2 2.2 0 0 0 4 0"/><path d="M4 4l16 16"/>',
  iosShare: '<path d="M12 3.5v11"/><path d="M8.5 7L12 3.5 15.5 7"/><path d="M8 10.5H6.5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h11a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1H16"/>',
  plusSq: '<rect x="4" y="4" width="16" height="16" rx="4"/><path d="M12 8.5v7M8.5 12h7"/>'
});

/* ---------- API ---------- */
async function api(path, { method = "GET", body, headers = {}, timeout } = {}) {
  if (!API) throw new Error("no api");
  const ac = new AbortController(), timer = setTimeout(() => ac.abort(), timeout || (CFG.api && CFG.api.timeoutMs) || 8000);
  try {
    const r = await fetch(API + path, { method, cache: "no-store", signal: ac.signal,
      headers: { ...(body ? { "content-type": "application/json" } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
    const j = await r.json().catch(() => ({}));
    if (r.ok) return j;
    const e = new Error(j.message || j.error || "http " + r.status); e.status = r.status; e.code = j.error;
    e.permanent = r.status >= 400 && r.status < 500 && ![408, 425, 429].includes(r.status); throw e;
  } finally { clearTimeout(timer); }
}
const guestH = () => ({ "x-chat-token": (chatConv() || {}).token || "" });
const ownerH = () => ({ "x-owner-key": ownerKey() });

/* ---------- Guest conversation ---------- */
function chatDefaults() {
  const last = store.get(LKEY()) || {}, p = last.payload || {}, dr = store.get(DKEY()) || {}, prev = chatConv();
  const live = prev && !convEnded(prev) ? prev : null;
  const name = (live && live.name) || p.name || dr.name || (prev && prev.name) || "";
  const pw = p.week && p.week.to >= isoDate(new Date()) ? p.week : null;
  return { name, fromDamage: !live && !!(p.name || dr.name),
    from: (live && live.from) || (pw && pw.from) || (dr.name && dr.from) || isoDate(new Date()),
    to: (live && live.to) || (pw && pw.to) || (dr.name && dr.to) || isoDate(addDays(7)) };
}
async function syncConv() {
  const c = chatConv(); if (!c) return null;
  if (c.synced) return c;
  await api("/api/chats", { method: "POST", body: { id: c.id, token: c.token, boat: BOAT.id, name: c.name, week: { from: c.from, to: c.to }, lang, appVersion: APP_VERSION } });
  const cc = chatConv(); cc.synced = true; saveConv(cc); return cc;
}
function startChat(name, from, to) {
  const old = chatConv();
  if (old && !convEnded(old)) { Object.assign(old, { name, from, to, synced: false }); saveConv(old); }
  else { saveConv({ id: uid(), token: randTok(), name, from, to, createdAt: new Date().toISOString(), synced: false, lastN: 0, peerReadN: 0, unread: 0 }); saveMsgs([]); }
  flushChat();
}
const updMsg = (id, patch) => { const ms = chatMsgs(), m = ms.find(x => x.id === id); if (m) { Object.assign(m, patch); saveMsgs(ms); } };
function markPending(status, e) { const ms = chatMsgs(); ms.forEach(m => { if (m.sender === "guest" && (m.status === "sending" || m.status === "queued")) { m.status = status; if (e) m.err = e.code || e.message; } }); saveMsgs(ms); }
let chatFlushing = false;
async function flushChat() {
  if (chatFlushing || !API || !chatConv()) return;
  chatFlushing = true;
  try {
    const c = chatConv();
    const pending = chatMsgs().filter(m => m.sender === "guest" && (m.status === "sending" || m.status === "queued"));
    if (!pending.length && c.synced) return;
    if (navigator.onLine === false) { markPending("queued"); return; }
    try { await syncConv(); } catch (e) { markPending(e.permanent ? "failed" : "queued", e); return; }
    for (const m of pending) {
      try {
        const j = await api(`/api/chats/${c.id}/messages`, { method: "POST", headers: guestH(), body: { id: m.id, body: m.body, createdAt: m.at } });
        updMsg(m.id, { status: "sent", n: j.message.n, at: j.message.created_at, err: null });
      } catch (e) {
        if (e.status === 404) { const cc = chatConv(); cc.synced = false; saveConv(cc); }
        updMsg(m.id, { status: e.permanent && e.status !== 404 ? "failed" : "queued", err: e.code || e.message });
        if (!e.permanent || e.status === 404) break;
      }
    }
  } finally { chatFlushing = false; chatRefresh(); }
  if (chatMsgs().some(m => m.status === "queued") && navigator.onLine !== false) setTimeout(() => flushChat(), 15000);
}
async function pollChat(markRead) {
  const c = chatConv(); if (!c || !c.synced || !API || navigator.onLine === false) return false;
  let j;
  try { j = await api(`/api/chats/${c.id}/messages?since=${c.lastN || 0}${markRead ? "&read=1" : ""}`, { headers: guestH() }); }
  catch (e) { if (e.status === 404) { const cc = chatConv(); cc.synced = false; cc.lastN = 0; saveConv(cc); flushChat(); } throw e; }
  const ms = chatMsgs(); let changed = false;
  for (const s of j.messages) {
    const i = ms.findIndex(m => m.id === s.id), rec = { id: s.id, n: s.n, sender: s.sender, body: s.body, at: s.created_at, status: "sent" };
    if (i >= 0) ms[i] = { ...ms[i], ...rec, err: null }; else ms.push(rec);
    changed = true;
  }
  const cc = chatConv(); if (!cc || cc.id !== c.id) return false;
  if (j.messages.length) cc.lastN = Math.max(cc.lastN || 0, ...j.messages.map(m => m.n));
  if ((j.peer_read_n || 0) !== (cc.peerReadN || 0)) changed = true;
  if ((j.conversation.unread_guest || 0) !== (cc.unread || 0)) changed = true;
  cc.peerReadN = j.peer_read_n || 0; cc.unread = j.conversation.unread_guest || 0; saveConv(cc); saveMsgs(ms);
  return changed;
}
const sortMsgs = ms => ms.slice().sort((a, b) => (a.n && b.n) ? a.n - b.n : (a.n ? -1 : b.n ? 1 : String(a.at).localeCompare(String(b.at))));

/* ---------- Polling ---------- */
const poller = { timer: null, fn: null, idle: 0, fails: 0, busy: false };
function startPolling(fn) { stopPolling(); poller.fn = fn; poller.idle = Date.now(); poller.fails = 0; schedulePoll(0); }
function stopPolling() { clearTimeout(poller.timer); poller.timer = null; poller.fn = null; }
function schedulePoll(ms) { clearTimeout(poller.timer); if (poller.fn) poller.timer = setTimeout(pollTick, ms); }
async function pollTick() {
  const fn = poller.fn; if (!fn || document.visibilityState === "hidden" || poller.busy) return;   // resumes on visibilitychange
  poller.busy = true; let changed = false;
  try { changed = await fn(); poller.fails = 0; } catch { poller.fails++; } finally { poller.busy = false; }
  if (fn !== poller.fn) return;
  if (changed) poller.idle = Date.now();
  const idle = Date.now() - poller.idle;
  schedulePoll(poller.fails ? Math.min(60000, 4000 * 2 ** poller.fails) : idle < 60e3 ? 4000 : idle < 300e3 ? 8000 : 15000);
}
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && poller.fn) { poller.idle = Date.now(); schedulePoll(0); } });
window.addEventListener("online", () => { flushChat(); flushOwnerOutbox(); updateOffline(); if (poller.fn) schedulePoll(0); });
window.addEventListener("offline", () => updateOffline());
function updateOffline() { const el = document.getElementById("chatOffline"); if (el) el.hidden = navigator.onLine !== false; }

/* ---------- Shared thread rendering ---------- */
function statusHtml(m, peerReadN) {
  if (m.status === "failed") return `<span class="st fail">${ic("alert")}${esc(t("st_failed"))}</span>`;
  if (m.status === "queued") return `<span class="st q">${ic("clock")}${esc(t("st_queued"))}</span>`;
  if (m.status === "sending") return `<span class="st q" aria-label="${esc(t("st_sending"))}">${ic("clock")}</span>`;
  if (m.n && peerReadN && m.n <= peerReadN) return `<span class="st read" title="${esc(t("st_read"))}" aria-label="${esc(t("st_read"))}">${ic("dcheck")}</span>`;
  return `<span class="st" title="${esc(t("st_sent"))}" aria-label="${esc(t("st_sent"))}">${ic("check")}</span>`;
}
function threadHtml(msgs, me, peerReadN, lead = "") {
  let html = lead, lastDay = "", prev = null;
  for (const m of sortMsgs(msgs)) {
    const d = new Date(m.at), day = dayLabel(d);
    if (day !== lastDay) { html += `<div class="day"><span>${esc(day)}</span></div>`; lastDay = day; prev = null; }
    const mine = m.sender === me, cont = prev && prev.sender === m.sender && (d - new Date(prev.at)) < 5 * 60e3;
    html += `<div class="msg ${mine ? "me" : "them"}${cont ? " cont" : ""}${m.status === "failed" ? " failed" : ""}" data-id="${esc(m.id)}">
      <div class="bubble">${linkify(esc(m.body))}</div><div class="meta"><time>${esc(timeStr(d))}</time>${mine ? statusHtml(m, peerReadN) : ""}</div></div>`;
    prev = m;
  }
  return html;
}
const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 140;
const toBottom = () => window.scrollTo(0, document.documentElement.scrollHeight);
function composerHtml(ph) {
  return `<form class="composer" id="composer" autocomplete="off"><div class="cbox"><textarea id="chatInput" rows="1" maxlength="${CHAT_MAX}" placeholder="${esc(ph)}" aria-label="${esc(ph)}" enterkeyhint="send"></textarea>
    <span class="left" id="chatLeft" hidden></span></div>
    <button class="send" id="chatSend" type="submit" aria-label="${esc(t("chatSend"))}" disabled>${ic("send")}</button></form>`;
}
function bindComposer(onSend) {
  const $f = document.getElementById("composer"), $i = document.getElementById("chatInput"), $s = document.getElementById("chatSend"), $l = document.getElementById("chatLeft");
  const grow = () => { $i.style.height = "auto"; $i.style.height = Math.min($i.scrollHeight, 150) + "px";
    const v = $i.value.trim(); $s.disabled = !v; const left = CHAT_MAX - $i.value.length; $l.hidden = left > 200; $l.textContent = t("chatLeft", { n: left }); };
  $i.addEventListener("input", grow);
  $i.addEventListener("keydown", e => { if (e.key === "Enter" && !e.shiftKey && !e.isComposing && matchMedia("(pointer:fine)").matches) { e.preventDefault(); $f.requestSubmit(); } });
  $f.addEventListener("submit", e => { e.preventDefault(); const v = $i.value.trim(); if (!v) return;
    if (v.length > CHAT_MAX) { toast(t("chatTooLong", { n: CHAT_MAX })); return; }
    onSend(v); $i.value = ""; grow(); $i.focus(); });
  grow();
}

/* ---------- Guest views ---------- */
function viewChatSetup() {
  const prev = chatConv(), live = prev && !convEnded(prev), d = chatDefaults();
  setNav({ mode: "page", title: t("chatTitle") });
  $app.innerHTML = `
    <div class="page-head"><div class="sec-ic">${ic("chat")}</div><div class="eyebrow">${esc(t("chatPeer", { boat: BOAT.name }))}</div>
      <h1>${esc(live ? t("chatEdit") : t("chatTitle"))}</h1><p>${esc(t("chatSetupText"))}</p></div>
    ${prev && !live ? `<p class="note warnnote">${ic("clock")}<span>${esc(t("chatEnded", { w: fmtRange(prev.from, prev.to) }))}</span></p>` : ""}
    <div class="block"><div class="card">
      <div class="field"><label for="cName">${esc(t("chatName"))}</label><input id="cName" autocomplete="name" maxlength="80" placeholder="${esc(t("namePh"))}" value="${esc(d.name)}"></div>
      <div class="field dates"><div><label for="cFrom">${esc(t("weekFrom"))}</label><input id="cFrom" type="date" value="${esc(d.from)}"></div>
        <div><label for="cTo">${esc(t("weekTo"))}</label><input id="cTo" type="date" value="${esc(d.to)}"></div></div></div>
      ${d.fromDamage ? `<p class="hint">${ic("clipboard")} ${esc(t("chatFromDamage"))}</p>` : ""}</div>
    <div class="block"><button class="btn" id="cStart">${ic("chat")}${esc(live ? t("save") : t("chatStart"))}</button></div>
    <p class="note">${ic("alert")}<span>${rich(t("chatNotEmergency"))}</span></p>
    <p class="hint center">${esc(t("chatPreferWa"))} <a href="#/t/ask">${esc(t("chatOpenWa"))}</a></p>`;
  document.getElementById("cFrom").addEventListener("change", () => { const f = document.getElementById("cFrom"), to = document.getElementById("cTo"); if (to.value < f.value) to.value = isoDate(addDays(7, new Date(f.value + "T12:00:00"))); });
  document.getElementById("cStart").onclick = () => {
    const name = document.getElementById("cName").value.trim(), from = document.getElementById("cFrom").value, to = document.getElementById("cTo").value;
    if (!name) { toast(t("needName")); document.getElementById("cName").focus(); return; }
    if (!from || !to || to < from) { toast(t("needDates")); return; }
    startChat(name, from, to);
    if (location.hash === "#/chat") route(false); else location.replace("#/chat");   // same hash → no hashchange
  };
}
function viewChat() {
  const c = chatConv();
  if (!c || convEnded(c)) return viewChatSetup();
  setNav({ mode: "page", title: t("chatTitle") });
  document.body.classList.add("chat-mode");
  $app.innerHTML = `<div class="chat">
    <div class="chat-head"><span class="av base"><img src="logo-white.png" alt="" width="1000" height="745"></span>
      <span class="tx"><b>${esc(t("chatPeer", { boat: BOAT.name }))}</b><small>${esc(c.name)} · ${esc(fmtRange(c.from, c.to))}</small></span>
      <a class="chip-btn" href="#/chat/setup">${esc(t("chatEdit"))}</a></div>
    <div class="chat-offline" id="chatOffline" hidden>${ic("cloud")}<span>${esc(t("chatOffline"))}</span></div>
    <div class="msgs" id="msgs" role="log" aria-live="polite"></div>
    <div id="chatNotif"></div>
    ${composerHtml(t("chatPh"))}</div>`;
  bindComposer(body => { const m = { id: uid(), sender: "guest", body, at: new Date().toISOString(), status: "sending" };
    const ms = chatMsgs(); ms.push(m); saveMsgs(ms); renderGuestThread(true); flushChat(); });
  document.getElementById("msgs").addEventListener("click", e => {
    const f = e.target.closest(".msg.failed"); if (!f) return;
    updMsg(f.dataset.id, { status: "sending" }); renderGuestThread(); flushChat();
  });
  updateOffline(); renderGuestThread(true); toBottom();
  flushChat();
  startPolling(async () => { const ch = await pollChat(document.visibilityState === "visible"); if (ch) { renderGuestThread(); closeChatNotifs(); } return ch; });
}
function renderGuestThread(forceBottom) {
  const $m = document.getElementById("msgs"); if (!$m || !/^#\/chat$/.test(location.hash)) return;
  const c = chatConv(); if (!c) return;
  const stick = forceBottom || nearBottom(), ms = chatMsgs();
  const lead = `<div class="sys">${ic("info")}<span>${esc(t("chatTextOnly"))} <a href="#/t/ask">${esc(t("chatOpenWa"))}</a></span></div>
    <div class="msg them welcome"><div class="bubble">${esc(t("chatWelcome", { name: c.name.split(/\s+/)[0], boat: BOAT.name }))}</div></div>`;
  $m.innerHTML = threadHtml(ms, "guest", c.peerReadN, lead);
  renderGuestNotif();
  if (stick) requestAnimationFrame(toBottom);
}
function chatRefresh() { if (/^#\/chat$/.test(location.hash)) renderGuestThread(); }
function closeChatNotifs() { const c = chatConv(); if (c && navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(r => r && r.getNotifications({ tag: "chat-" + c.id })).then(ns => (ns || []).forEach(n => n.close())).catch(() => {}); }

/* ---------- Push (Web Push + VAPID) ---------- */
const VAPID = (CFG.push && CFG.push.vapidPublicKey) || "";
const isIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true;
const pushSupported = () => !!VAPID && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const PKEY = role => `push:${BOAT.id}:${role}`;
function pushState(role) {
  if (isIOS() && !isStandalone()) return "ios-browser";   // iPhone/iPad: Web Push only in the Home Screen app (iOS 16.4+)
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const rec = store.get(PKEY(role));
  if (rec && Notification.permission === "granted" && (role !== "guest" || rec.convId === (chatConv() || {}).id)) return "on";
  return "off";
}
const b64uToU8 = s => { const b = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - s.length % 4) % 4)); return Uint8Array.from(b, ch => ch.charCodeAt(0)); };
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, j) => setTimeout(() => j(new Error("timeout")), ms))]);
async function pushSubscribe(role) {
  if (!pushSupported()) throw new Error("unsupported");
  const perm = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
  if (perm !== "granted") { const e = new Error(perm); e.code = perm; throw e; }
  const reg = await withTimeout(navigator.serviceWorker.ready, 10000);
  const key = b64uToU8(VAPID);
  let sub = await reg.pushManager.getSubscription();
  if (sub && sub.options && sub.options.applicationServerKey) {
    const cur = new Uint8Array(sub.options.applicationServerKey);
    if (cur.length !== key.length || cur.some((v, i) => v !== key[i])) { await sub.unsubscribe(); sub = null; }
  }
  if (!sub) sub = await withTimeout(reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key }), 20000);
  const body = { role, boat: BOAT.id, subscription: sub.toJSON(), lang };
  let headers;
  if (role === "owner") headers = ownerH();
  else { await syncConv(); body.convId = chatConv().id; headers = guestH(); }
  await api("/api/push/subscribe", { method: "POST", body, headers });
  store.set(PKEY(role), { endpoint: sub.endpoint, convId: body.convId || null, at: new Date().toISOString() });
  store.del(PKEY(role === "owner" ? "guest" : "owner"));   // one push subscription per device: the last role wins
  return sub;
}
async function pushUnsubscribe(role) {
  store.del(PKEY(role));
  try { const reg = await navigator.serviceWorker.getRegistration(); const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await api("/api/push/unsubscribe", { method: "POST", body: { endpoint: sub.endpoint } }).catch(() => {}); await sub.unsubscribe(); } } catch {}
}
function iosHintHtml() {
  return `<div class="ios-hint"><b>${ic("bell")}${esc(t("iosHintTitle"))}</b><p>${esc(t("iosHintText"))}</p>
    <ol><li><span class="n">1</span><span>${esc(t("iosStep1"))} <span class="kbd">${ic("iosShare")}</span></span></li>
      <li><span class="n">2</span><span>${esc(t("iosStep2"))} <span class="kbd">${ic("plusSq")}</span></span></li>
      <li><span class="n">3</span><span>${esc(t("iosStep3"))}</span></li></ol></div>`;
}
function notifCardHtml(role, st) {
  const title = role === "owner" ? t("ownerNotifTitle") : t("notifTitle"), text = role === "owner" ? t("ownerNotifText") : t("notifText");
  const head = `<div class="nc-head"><span class="ci">${ic(st === "on" ? "bell" : "bellOff")}</span><span class="tx"><b>${esc(title)}</b><small>${esc(st === "on" ? t("notifEnabled") : text)}</small></span></div>`;
  let body = "";
  if (st === "ios-browser") body = iosHintHtml();
  else if (st === "unsupported") body = `<p class="nc-msg">${esc(t("notifUnsupported"))}</p>`;
  else if (st === "denied") body = `<p class="nc-msg">${esc(t("notifBlocked"))}</p>`;
  else if (st === "on") body = `<div class="nc-actions"><button class="btn ghost sm" data-push="test">${esc(t("notifTest"))}</button><button class="btn ghost sm" data-push="off">${esc(t("notifOff"))}</button></div>`;
  else body = `<div class="nc-actions"><button class="btn sm" data-push="on">${ic("bell")}${esc(role === "owner" ? t("ownerEnableNotif") : t("notifOn"))}</button>${role === "guest" ? `<button class="btn ghost sm" data-push="later">${esc(t("notifLater"))}</button>` : ""}</div>`;
  const ios = isIOS() && isStandalone() && st !== "on" ? `<p class="nc-msg ok">${ic("check")} ${esc(t("iosInstalled"))}</p>` : "";
  return `<div class="notif-card" data-role="${role}" data-state="${st}">${head}${ios}${body}</div>`;
}
async function onPushAction(role, action, rerender) {
  if (action === "later") { store.set(`push:${BOAT.id}:guestDismissed`, Date.now()); rerender(); return; }
  if (action === "off") { await pushUnsubscribe(role); toast(t("notifOffDone")); rerender(); return; }
  if (action === "test") {
    try { const b = role === "owner" ? { boat: BOAT.id } : { convId: chatConv().id };
      const reg = await navigator.serviceWorker.getRegistration(), sub = reg && await reg.pushManager.getSubscription(); if (sub) b.endpoint = sub.endpoint;
      const j = await api("/api/push/test", { method: "POST", body: b, headers: role === "owner" ? ownerH() : guestH() });
      if (!j.sent) { store.del(PKEY(role)); rerender(); } toast(t("notifTestSent", { n: j.sent }));
    } catch (e) { toast(t("notifFailed") + " (" + (e.code || e.message) + ")"); }
    return;
  }
  try { await pushSubscribe(role); toast(t("notifEnabled")); }
  catch (e) { toast(e.code === "denied" ? t("notifBlocked") : e.code === "default" ? t("notifFailed") : t("notifFailed") + " (" + (e.code || e.message) + ")"); }
  rerender();
}
function bindNotifCard(root, role, rerender) {
  root.querySelectorAll("[data-push]").forEach(b => b.onclick = async () => { b.disabled = true; await onPushAction(role, b.dataset.push, rerender); });
}
function renderGuestNotif() {
  const $n = document.getElementById("chatNotif"); if (!$n) return;
  const st = pushState("guest"), sentAny = chatMsgs().some(m => m.sender === "guest" && m.status === "sent");
  const dismissed = store.get(`push:${BOAT.id}:guestDismissed`);
  const show = sentAny && st !== "on" && !(dismissed && Date.now() - dismissed < 3 * 864e5) && st !== "unsupported";
  const key = show ? st : "";
  if ($n.dataset.key === key) return;
  $n.dataset.key = key;
  $n.innerHTML = show ? notifCardHtml("guest", st) : "";
  if (show) bindNotifCard($n, "guest", () => { $n.dataset.key = "-"; renderGuestNotif(); });
}

/* ---------- Home card ---------- */
function chatCardHtml() {
  const c = chatConv(), live = c && !convEnded(c);
  const ms = live ? sortMsgs(chatMsgs()) : [], last = ms[ms.length - 1], unread = live ? (c.unread || 0) : 0;
  const sub = unread ? `<small class="unread">${esc(t("chatUnread", { n: unread }))}</small>`
    : last ? `<small>${esc(last.sender === "guest" ? t("chatYouPrefix") : t("chatBasePrefix"))}${esc(last.body.replace(/\s+/g, " ").slice(0, 80))}</small>`
    : `<small>${esc(t("chatCardSub"))}</small>`;
  return `<a class="chat-card" href="#/chat" id="chatCard"><span class="ci">${ic("chat")}${unread ? `<i class="dot"></i>` : ""}</span>
    <span class="tx"><b>${esc(t("chatCardTitle"))}</b>${sub}</span>${unread ? `<span class="badge">${unread}</span>` : `<span class="chev">${ic("chev")}</span>`}</a>`;
}
let homePollAt = 0;
function refreshChatCard() {
  const c = chatConv(); if (!c || !c.synced || convEnded(c) || Date.now() - homePollAt < 15000) return;
  homePollAt = Date.now();
  pollChat(false).then(ch => { const el = document.getElementById("chatCard"); if (ch && el) el.outerHTML = chatCardHtml(); }).catch(() => {});
  flushChat();
}

/* ---------- Owner: inbox, thread, notifications ---------- */
function ownerChatsUI() {
  return `<div class="block" id="ownerChats"><h2>${esc(t("chatsHead"))} <span class="prog" id="chatsUnread"></span></h2>
    <div id="chatList"><div class="empty small"><span class="spin"></span> ${esc(t("loading"))}</div></div></div>
    <div class="block" id="ownerNotif"></div>`;
}
let inboxSig = "";
async function loadOwnerChats() {
  const $l = document.getElementById("chatList"); if (!$l) return false;
  const key = ownerKey();
  if (!key) { $l.innerHTML = `<div class="empty small">${esc(t("needKeyChats"))}</div>`; inboxSig = ""; return false; }
  let j;
  try { j = await api(`/api/chats?boat=${encodeURIComponent(BOAT.id)}&limit=100`, { headers: ownerH() }); }
  catch (e) {
    $l.innerHTML = `<div class="empty small err">${esc(e.status === 401 ? t("wrongKey") : t("chatsFailed", { e: e.code || e.message }))}</div>`; inboxSig = "";
    if (e.status === 401) stopPolling(); throw e;
  }
  const sig = JSON.stringify([lang, j.conversations]); if (sig === inboxSig) return false; inboxSig = sig;
  const u = document.getElementById("chatsUnread"); if (u) u.textContent = j.unread ? t("chatsUnread", { n: j.unread }) : "";
  $l.innerHTML = j.conversations.length ? `<ul class="list convs">${j.conversations.map(c => `<li><a class="conv${c.unread_owner ? " has-unread" : ""}" href="#/owner/chat/${esc(c.id)}" data-id="${esc(c.id)}">
      <span class="av">${esc(initials(c.guest_name))}</span>
      <span class="tx"><span class="top"><b>${esc(c.guest_name)}</b><time>${esc(c.last_msg_at ? whenShort(c.last_msg_at) : "")}</time></span>
        <span class="bot"><span class="pv">${c.last_msg_preview ? esc((c.last_sender === "owner" ? t("chatYouPrefix") : "") + c.last_msg_preview) : `<i>${esc(t("chatNoMsgs"))}</i>`}</span>
          ${c.unread_owner ? `<span class="badge">${c.unread_owner}</span>` : ""}</span>
        <small>${esc(t("week"))} ${esc(fmtRange(c.week_from, c.week_to))}${c.lang ? " · " + esc(c.lang.toUpperCase()) : ""}</small></span></a></li>`).join("")}</ul>`
    : `<div class="empty small">${esc(t("chatsNone"))}</div>`;
  return true;
}
function renderOwnerNotif() {
  const $n = document.getElementById("ownerNotif"); if (!$n) return;
  $n.innerHTML = `<h2>${esc(t("ownerNotifHead"))}</h2>${notifCardHtml("owner", pushState("owner"))}`;
  bindNotifCard($n, "owner", renderOwnerNotif);
}
function bindOwnerChats() {
  renderOwnerNotif();
  inboxSig = "";
  startPolling(loadOwnerChats);
}
const ownerThreads = new Map();   // convId → {conv, msgs, lastN, peerReadN}
function viewOwnerThread(id) {
  if (!ownerUnlocked) return viewPin();
  const st = ownerThreads.get(id) || { conv: null, msgs: [], lastN: 0, peerReadN: 0 }; ownerThreads.set(id, st);
  setNav({ mode: "page", title: st.conv ? st.conv.guest_name : t("chatsHead") });
  document.body.classList.add("chat-mode");
  $app.innerHTML = `<div class="chat owner">
    <div class="chat-head"><span class="av" id="thAv">${esc(initials(st.conv && st.conv.guest_name))}</span>
      <span class="tx"><b id="thName">${esc(st.conv ? st.conv.guest_name : "…")}</b><small id="thMeta">${st.conv ? esc(t("week") + " " + fmtRange(st.conv.week_from, st.conv.week_to)) : ""}</small></span>
      <button class="chip-btn danger" id="thDel">${ic("trash")}<span>${esc(t("chatDelete"))}</span></button></div>
    <div class="chat-offline" id="chatOffline" hidden>${ic("cloud")}<span>${esc(t("chatOffline"))}</span></div>
    <div class="msgs" id="msgs" role="log" aria-live="polite"></div>
    ${composerHtml(t("replyPh", { name: st.conv ? st.conv.guest_name.split(/\s+/)[0] : "" }))}</div>`;
  const sendOwner = body => { st.msgs.push({ id: uid(), sender: "owner", body, at: new Date().toISOString(), status: "sending" }); renderOwnerThread(id, true); flushOwnerOutbox(); };
  bindComposer(sendOwner);
  document.getElementById("msgs").addEventListener("click", e => { const f = e.target.closest(".msg.failed"); if (!f) return;
    const m = st.msgs.find(x => x.id === f.dataset.id); if (m) { m.status = "sending"; renderOwnerThread(id); flushOwnerOutbox(); } });
  document.getElementById("thDel").onclick = async () => {
    if (!confirm(t("chatDeleteConfirm"))) return;
    try { await api(`/api/chats/${id}`, { method: "DELETE", headers: ownerH() }); ownerThreads.delete(id); toast(t("chatDeleted")); location.hash = "#/owner"; }
    catch (e) { toast(t("chatsFailed", { e: e.code || e.message })); }
  };
  updateOffline(); renderOwnerThread(id, true);
  startPolling(() => pollOwnerThread(id));
}
async function pollOwnerThread(id) {
  const st = ownerThreads.get(id); if (!st) return false;
  let j;
  try { j = await api(`/api/chats/${id}/messages?since=${st.lastN}&read=${document.visibilityState === "visible" ? 1 : 0}`, { headers: ownerH() }); }
  catch (e) { if (e.status === 404 || e.status === 401) { stopPolling(); const $m = document.getElementById("msgs"); if ($m) $m.innerHTML = `<div class="empty small err">${esc(e.status === 401 ? t("wrongKey") : t("chatGone"))}</div>`; } throw e; }
  let changed = !st.conv;
  st.conv = j.conversation;
  for (const s of j.messages) {
    const i = st.msgs.findIndex(m => m.id === s.id), rec = { id: s.id, n: s.n, sender: s.sender, body: s.body, at: s.created_at, status: "sent" };
    if (i >= 0) st.msgs[i] = { ...st.msgs[i], ...rec }; else st.msgs.push(rec);
    changed = true;
  }
  if (j.messages.length) st.lastN = Math.max(st.lastN, ...j.messages.map(m => m.n));
  if (j.peer_read_n !== st.peerReadN) { st.peerReadN = j.peer_read_n; changed = true; }
  if (changed) { renderOwnerThread(id); closeOwnerNotifs(id); }
  return changed;
}
function renderOwnerThread(id, forceBottom) {
  const $m = document.getElementById("msgs"), st = ownerThreads.get(id); if (!$m || !st || location.hash !== "#/owner/chat/" + id) return;
  const stick = forceBottom || nearBottom();
  if (st.conv) {
    setNav({ mode: "page", title: st.conv.guest_name });
    document.getElementById("thName").textContent = st.conv.guest_name; document.getElementById("thAv").textContent = initials(st.conv.guest_name);
    document.getElementById("thMeta").textContent = `${t("week")} ${fmtRange(st.conv.week_from, st.conv.week_to)}${st.conv.lang ? " · " + st.conv.lang.toUpperCase() : ""}`;
    const $i = document.getElementById("chatInput"); if ($i) $i.placeholder = t("replyPh", { name: st.conv.guest_name.split(/\s+/)[0] });
  }
  $m.innerHTML = st.msgs.length ? threadHtml(st.msgs, "owner", st.peerReadN) : (st.conv ? `<div class="empty small">${esc(t("chatNoMsgs"))}</div>` : `<div class="empty small"><span class="spin"></span> ${esc(t("loading"))}</div>`);
  if (stick) requestAnimationFrame(toBottom);
}
let ownerFlushing = false;
async function flushOwnerOutbox() {
  if (ownerFlushing || !ownerKey()) return; ownerFlushing = true;
  try {
    for (const [id, st] of ownerThreads) for (const m of st.msgs.filter(x => x.sender === "owner" && (x.status === "sending" || x.status === "queued"))) {
      if (navigator.onLine === false) { m.status = "queued"; continue; }
      try { const j = await api(`/api/chats/${id}/messages`, { method: "POST", headers: ownerH(), body: { id: m.id, body: m.body, createdAt: m.at } });
        Object.assign(m, { status: "sent", n: j.message.n, at: j.message.created_at }); }
      catch (e) { m.status = e.permanent ? "failed" : "queued"; if (!e.permanent) break; }
    }
  } finally { ownerFlushing = false; }
  const [, , , cur] = location.hash.split("/"); if (cur && /^#\/owner\/chat\//.test(location.hash)) renderOwnerThread(cur);
  if ([...ownerThreads.values()].some(st => st.msgs.some(m => m.status === "queued")) && navigator.onLine !== false) setTimeout(flushOwnerOutbox, 15000);
}
function closeOwnerNotifs(id) { if (navigator.serviceWorker) navigator.serviceWorker.getRegistration().then(r => r && r.getNotifications({ tag: "chat-" + id })).then(ns => (ns || []).forEach(n => n.close())).catch(() => {}); }

/* ---------- Service worker messages (push arrived / notification clicked) ---------- */
if ("serviceWorker" in navigator) navigator.serviceWorker.addEventListener("message", e => {
  const d = e.data || {};
  if (d.type === "push") { homePollAt = 0; if (poller.fn) { poller.idle = Date.now(); schedulePoll(0); } else if (!location.hash || location.hash === "#/") refreshChatCard(); }
  if (d.type === "open" && d.url) { const h = new URL(d.url, location.href).hash || "#/"; if (location.hash !== h) location.hash = h; }
});
