-- v10: in-app chat (guest ↔ base manager) + Web Push subscriptions.
-- Apply: wrangler d1 execute anasa-manual-db --remote --file=migrations/0002_chat.sql   (idempotent)
CREATE TABLE IF NOT EXISTS conversations (
  id              TEXT PRIMARY KEY,               -- random id made on the guest's device (localStorage)
  boat            TEXT NOT NULL,
  token_hash      TEXT NOT NULL,                  -- SHA-256 of the guest's secret token; the token itself is never stored
  guest_name      TEXT NOT NULL,
  week_from       TEXT,                           -- charter week YYYY-MM-DD
  week_to         TEXT,
  lang            TEXT,
  created_at      TEXT NOT NULL,
  updated_at      TEXT NOT NULL,
  last_msg_at     TEXT,
  last_msg_preview TEXT,
  last_sender     TEXT,                           -- 'guest' | 'owner'
  unread_owner    INTEGER NOT NULL DEFAULT 0,     -- guest messages the base has not read yet
  unread_guest    INTEGER NOT NULL DEFAULT 0,     -- base replies the guest has not read yet
  msg_count       INTEGER NOT NULL DEFAULT 0,
  ip_hash         TEXT,                           -- salted hash, rate limiting only
  app_version     TEXT
);
CREATE INDEX IF NOT EXISTS idx_conv_boat ON conversations (boat, last_msg_at DESC);
CREATE INDEX IF NOT EXISTS idx_conv_ip   ON conversations (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS messages (
  n                 INTEGER PRIMARY KEY AUTOINCREMENT,   -- monotonic cursor for polling (?since=n)
  id                TEXT NOT NULL UNIQUE,                -- client id → idempotent retries from the offline queue
  conv_id           TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender            TEXT NOT NULL CHECK (sender IN ('guest','owner')),
  body              TEXT NOT NULL,
  created_at        TEXT NOT NULL,
  client_created_at TEXT,
  read_at           TEXT,                                -- when the other side read it
  ip_hash           TEXT
);
CREATE INDEX IF NOT EXISTS idx_msg_conv ON messages (conv_id, n);
CREATE INDEX IF NOT EXISTS idx_msg_ip   ON messages (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id           TEXT PRIMARY KEY,                  -- SHA-256(endpoint), first 32 hex
  boat         TEXT NOT NULL,
  role         TEXT NOT NULL CHECK (role IN ('owner','guest')),
  conv_id      TEXT,                              -- guest subscriptions: the conversation they follow
  endpoint     TEXT NOT NULL,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  lang         TEXT,
  ua           TEXT,
  created_at   TEXT NOT NULL,
  last_sent_at TEXT,
  last_status  INTEGER,                           -- HTTP status from the push service (201 = accepted)
  last_error   TEXT,
  fail_count   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_push_owner ON push_subscriptions (boat, role);
CREATE INDEX IF NOT EXISTS idx_push_conv  ON push_subscriptions (conv_id);
