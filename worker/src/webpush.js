/* Minimal Web Push for Cloudflare Workers — WebCrypto only, no dependencies.
 *   - Payload encryption: RFC 8291 (Message Encryption for Web Push) with RFC 8188 "aes128gcm" content coding
 *   - Sender identity:    RFC 8292 VAPID (ES256 JWT), header  Authorization: vapid t=<jwt>, k=<public key>
 * Keys: VAPID_PUBLIC_KEY (base64url, 65-byte uncompressed P-256 point, not secret)
 *       VAPID_PRIVATE_KEY (base64url, 32-byte private scalar "d", Worker secret — never in the repo)
 */
const enc = new TextEncoder();
export const b64u = {
  enc(buf) { let s = ""; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); },
  dec(str) { const s = String(str).replace(/-/g, "+").replace(/_/g, "/"); const bin = atob(s + "=".repeat((4 - s.length % 4) % 4));
    return Uint8Array.from(bin, c => c.charCodeAt(0)); }
};
const concat = (...parts) => { const a = parts.map(x => x instanceof Uint8Array ? x : new Uint8Array(x));
  const out = new Uint8Array(a.reduce((n, x) => n + x.byteLength, 0)); let o = 0; for (const x of a) { out.set(x, o); o += x.byteLength; } return out; };
async function hmac(key, data) {
  const k = await crypto.subtle.importKey("raw", key, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}
// HKDF with a single output block (≤ 32 bytes) — all Web Push derivations fit in one block.
async function hkdf(salt, ikm, info, len) { const prk = await hmac(salt, ikm); return (await hmac(prk, concat(info, [1]))).slice(0, len); }

/** Encrypt `plaintext` (Uint8Array) for a subscription {keys:{p256dh, auth}} → body bytes (aes128gcm, one record). */
export async function encryptPayload(plaintext, p256dh, authSecret, { salt, localKeys } = {}) {
  const uaPublic = typeof p256dh === "string" ? b64u.dec(p256dh) : p256dh;
  const auth = typeof authSecret === "string" ? b64u.dec(authSecret) : authSecret;
  if (uaPublic.byteLength !== 65 || uaPublic[0] !== 4) throw new Error("bad p256dh");
  if (auth.byteLength < 16) throw new Error("bad auth");
  const as = localKeys || await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
  const asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", as.publicKey));
  const uaKey = await crypto.subtle.importKey("raw", uaPublic, { name: "ECDH", namedCurve: "P-256" }, false, []);
  const ecdh = new Uint8Array(await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, as.privateKey, 256));
  // RFC 8291 §3.4: IKM = HKDF(auth_secret, ecdh_secret, "WebPush: info" 0x00 ua_public as_public, 32)
  const ikm = await hkdf(auth, ecdh, concat(enc.encode("WebPush: info\0"), uaPublic, asPublic), 32);
  salt = salt || crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);
  const key = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const rs = 4096;
  if (plaintext.byteLength + 1 + 16 > rs) throw new Error("payload too large");
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce, tagLength: 128 }, key, concat(plaintext, [2])));   // 0x02 = last record
  const header = new Uint8Array(21); header.set(salt, 0); new DataView(header.buffer).setUint32(16, rs); header[20] = asPublic.byteLength;
  return concat(header, asPublic, ct);
}

const vapidKeyCache = new Map();
async function vapidSigningKey(publicB64, privateB64) {
  const id = publicB64 + "|" + privateB64.length;
  if (vapidKeyCache.has(id)) return vapidKeyCache.get(id);
  const pub = b64u.dec(publicB64);
  if (pub.byteLength !== 65 || pub[0] !== 4) throw new Error("bad VAPID public key");
  const jwk = { kty: "EC", crv: "P-256", d: privateB64, x: b64u.enc(pub.slice(1, 33)), y: b64u.enc(pub.slice(33, 65)), ext: false };
  const key = await crypto.subtle.importKey("jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]);
  vapidKeyCache.set(id, key); return key;
}
/** VAPID Authorization header value for the push service origin of `endpoint`. */
export async function vapidAuth(endpoint, { publicKey, privateKey, subject }, ttlSec = 12 * 3600) {
  const aud = new URL(endpoint).origin;
  const h = b64u.enc(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const p = b64u.enc(enc.encode(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + ttlSec, sub: subject })));
  const key = await vapidSigningKey(publicKey, privateKey);
  const sig = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, enc.encode(h + "." + p));   // raw r||s = JWS ES256
  return `vapid t=${h}.${p}.${b64u.enc(sig)}, k=${publicKey}`;
}

/** Send one push. Returns {status, ok, gone, text}. gone=true → delete the subscription (404/410). */
export async function sendPush(sub, payloadObj, vapid, { ttl = 86400, urgency = "high", topic } = {}) {
  const body = await encryptPayload(enc.encode(JSON.stringify(payloadObj)), sub.p256dh, sub.auth);
  const headers = { "content-encoding": "aes128gcm", "content-type": "application/octet-stream", ttl: String(ttl), urgency,
    authorization: await vapidAuth(sub.endpoint, vapid) };
  if (topic) headers.topic = topic.replace(/[^A-Za-z0-9_-]/g, "").slice(0, 32);
  const res = await fetch(sub.endpoint, { method: "POST", headers, body });
  const text = res.ok ? "" : (await res.text().catch(() => "")).slice(0, 300);
  return { status: res.status, ok: res.status >= 200 && res.status < 300, gone: res.status === 404 || res.status === 410, text };
}
