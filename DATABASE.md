# Database design

`db/schema.ts` is the Drizzle source of truth for PostgreSQL 15+.

Core aggregates are users/admin roles; Acts, Act versions, sections and section versions; rulesets, rules and rule versions; typed legal documents; cases, judges and citations; articles and FAQs; source documents and immutable versions; generic relationships; ingestion sources/runs/items; AI jobs; SEO metadata; and audit logs.

Official text is stored only in version tables with a required source document version and locator. `effective_from` and `effective_to` support “law as on date” queries. Instrument identity, source URL, normalized title, document date, file hash, and content hash support duplicate detection. If identity matches but the hash changes, ingestion creates another source/document version.

`content_relationships` stores typed endpoints, relationship type, confidence, AI provenance, and manual verification. Source and target indexes enable bidirectional lookup.

Commands: `npm run db:generate` and `npm run db:migrate`. Never edit an applied production migration.
