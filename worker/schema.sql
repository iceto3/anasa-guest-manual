-- Anasa guest manual: damage reports (check-in now, check-out later via kind).
-- Apply: wrangler d1 execute anasa-manual-db --remote --file=schema.sql
CREATE TABLE IF NOT EXISTS reports (
  id                TEXT PRIMARY KEY,               -- client-generated UUID (idempotent retries from the offline queue)
  boat              TEXT NOT NULL,                  -- boat id from boats/<id>.js
  kind              TEXT NOT NULL CHECK (kind IN ('checkin','checkout')),
  week_from         TEXT,                           -- YYYY-MM-DD
  week_to           TEXT,                           -- YYYY-MM-DD
  name              TEXT NOT NULL,                  -- person accepting the boat
  lang              TEXT,
  confirmed         INTEGER NOT NULL DEFAULT 0,     -- "I inspected the boat and these are all the damages I found"
  item_count        INTEGER NOT NULL DEFAULT 0,
  photo_count       INTEGER NOT NULL DEFAULT 0,
  client_created_at TEXT,
  created_at        TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
  ip_hash           TEXT,                           -- salted hash, only for rate limiting
  app_version       TEXT
);
CREATE INDEX IF NOT EXISTS idx_reports_boat ON reports (boat, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_ip   ON reports (ip_hash, created_at);

CREATE TABLE IF NOT EXISTS report_items (
  report_id   TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  n           INTEGER NOT NULL,                     -- number shown on the pin (1..)
  item_id     TEXT,
  view        TEXT,                                 -- 'top' | 'stbd' | 'port' | NULL (no location)
  x           REAL,                                 -- 0..1 within the view
  y           REAL,
  zone        TEXT,                                 -- auto zone key (hullPort, cockpit, ...)
  area        TEXT,                                 -- area label (English)
  type        TEXT NOT NULL,                        -- scratch | dent | torn | stain | notWorking | missing | other
  description TEXT,
  photo_count INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (report_id, n)
);

-- Photo metadata. Photos stay on the guest's device (IndexedDB) until R2 upload is enabled;
-- then status becomes 'uploaded' and r2_key is set.
CREATE TABLE IF NOT EXISTS report_photos (
  id           TEXT PRIMARY KEY,
  report_id    TEXT NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  item_n       INTEGER NOT NULL,
  status       TEXT NOT NULL DEFAULT 'device' CHECK (status IN ('device','uploaded')),
  r2_key       TEXT,
  content_type TEXT,
  bytes        INTEGER,
  width        INTEGER,
  height       INTEGER,
  created_at   TEXT,
  uploaded_at  TEXT
);
CREATE INDEX IF NOT EXISTS idx_photos_report ON report_photos (report_id);
