# NyayaDesk agent guide

## Permanent rules

1. Never modify official legal text using AI.
2. Never fabricate legal citations, cases, notification numbers, circular numbers, judges, holdings, dates, or relationships.
3. Always maintain source provenance, including original files, hashes, source URL/name, parser version, locator, and verification date.
4. Maintain version history; never silently overwrite published legal material.
5. Keep AI-assisted content visually and structurally distinguishable from official text.
6. AI-suggested relationships must retain confidence and verification metadata and must not appear as verified before review.
7. Never bypass CAPTCHAs, authentication, paywalls, robots/access controls, or technical protections.
8. Do not indiscriminately ingest copyrighted private-publisher content; retain only permitted metadata/facts and original summaries.
9. Keep frontend, API, workers, and database boundaries explicit and production-ready. Never expose credentials to the browser.
10. Protect published SEO URL stability; use deliberate redirects for unavoidable changes.

## Repository

- `src/` — React, React Router, Tailwind UI
- `server/` — Express API, validation, security middleware
- `db/schema.ts` — Drizzle schema source
- `db/migrations/` — append-only PostgreSQL migrations
- `workers/` — ingestion/parsing workers (when added)
- `storage/uploads/` — local development uploads; production uses managed object storage

The supplied Income Tax Act PDF is the only current legal source. No extracted text is publishable until its locator has been reviewed. Run `npm run typecheck` and `npm run build` before handoff.
