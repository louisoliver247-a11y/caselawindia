-- Browsing previously required PostgreSQL to sort the full multi-million-row
-- archive, particularly for the `court_code <> 'sci'` High Court view.
-- These indexes match the public catalogue's ORDER BY and filter exactly.
CREATE INDEX IF NOT EXISTS "archive_judgments_recent_idx"
  ON "archive_judgments" ("decision_date" DESC NULLS LAST, "source_key");

CREATE INDEX IF NOT EXISTS "archive_judgments_high_court_recent_idx"
  ON "archive_judgments" ("decision_date" DESC NULLS LAST, "source_key")
  WHERE "court_code" <> 'sci';
