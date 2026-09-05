# CaseLawIndia architecture

CaseLawIndia is a source-first legal research platform for Indian judgments, with independently deployable browser, API, PostgreSQL, and worker layers. Its canonical production URL is `https://caselawindia.io`.

## Runtime boundaries

- React + TypeScript + Vite + Tailwind render public research and future admin applications. React Router owns canonical client routes.
- Express owns authentication boundaries, validation, rate limiting, uploads, and stable REST responses. The browser never imports database code.
- PostgreSQL is the system of record. `db/schema.ts` defines typed Drizzle entities; migrations are append-only.
- Background workers discover, fetch, hash, parse, classify, deduplicate, and propose links. Publication is an explicit editorial transition.

## Content flow

`official source → immutable source version → extraction → structured draft → AI suggestions → editorial review → publication → relationship-driven pages`

## Target ingestion topology

```text
                         CASELAWINDIA
                              ↑
                         PostgreSQL
                              ↑
              ┌───────────────┼───────────────┐
              │               │               │
         HISTORICAL          DAILY            ACTS
              │             UPDATE             │
              ↓               ↓               ↓
       AWS Open Data    Bharat Courts      India Code
              │               │               │
       Supreme Court    Supreme Court      Acts and
       + High Court     recent cases;      sections
       judgments        HC when permitted  + case links
```

The arrows describe ingestion into PostgreSQL; the browser never talks directly to an upstream legal source. CaseLawIndia reads published records through the Express API.

### Worker boundaries

- `workers/historical/` imports versioned, licensed AWS-hosted open datasets for the initial Supreme Court and High Court corpus.
- `workers/daily/` uses the [bharat-courts](https://github.com/iamshouvikmitra/bharat-courts) SDK only for permitted CAPTCHA-free discovery. Its current compatible daily path is the public Supreme Court recent-judgments feed; CAPTCHA-gated High Court automation is disabled.
- `workers/acts/` imports Acts and sections from a permitted India Code interface and proposes judgment-to-section links for editorial verification.
- Shared worker code performs hashing, immutable storage, deduplication, retries, provenance capture, and status transitions.

Every lane writes first to `ingestion_sources`, `ingestion_runs`, and `ingestion_items`. Accepted source files are represented by `source_documents` and append-only `source_document_versions`. Parsed legal entities remain non-public until their source locator and wording have been reviewed.

### Publication boundary

Ingestion cannot publish. Only reviewed records may transition from `needs_review` to `approved` and then `published`. Suggested Act/section/case relationships are stored in `content_relationships` with confidence and provenance, and public queries must require `manually_verified = true`.

Official text and AI output use separate columns. A publishable legal record must point to a source document version and locator. Generic relationships are queried in both directions and only verified links are public.

Relationship source/target indexes support large graphs without loading whole datasets. List APIs are paginated. Uploads are size/type limited and stored under generated names. Production admin endpoints remain disabled until an identity provider and role checks are configured. Secrets remain server-side.
