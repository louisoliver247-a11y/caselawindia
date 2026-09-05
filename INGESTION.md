# Ingestion

## Source lanes

| Lane | Upstream | Scope | Cadence | Database result |
| --- | --- | --- | --- | --- |
| Historical | AWS-hosted Open India Law dataset | Supreme Court and High Court judgments | Versioned backfill | Immutable judgment source versions and review candidates |
| Daily update | [bharat-courts](https://github.com/iamshouvikmitra/bharat-courts) | Newly published judgments available without bypassing access controls | Scheduled incremental discovery | New or changed judgment versions queued for review |
| Acts | India Code | Acts and sections | Scheduled change detection | Versioned Acts/sections and unverified case-link suggestions |

An upstream name does not imply that a public API is available. A connector may be enabled only after its official access method, terms, identifiers, rate limits, and response provenance have been documented. Connectors must not bypass CAPTCHA, authentication, robots rules, or other access controls.

### Bharat Courts integration profile

The `bharat-courts` project is an MIT-licensed Python SDK, not an official court API. CaseLawIndia may use only these compatible paths:

- `ArchiveClient` for the CC BY 4.0 AWS Open Data archive, pinned to an explicit snapshot.
- `SCIClient.list_recent_judgments()` and its associated PDF download flow while the public Supreme Court feed remains available without a CAPTCHA or authentication bypass.

Do not enable its OCR/ONNX CAPTCHA solvers or any live search path that automates CAPTCHA handling. High Court daily coverage must remain disabled until a permitted CAPTCHA-free feed or official interface is identified. Store the SDK version, backend (`archive` or `live`), originating court URL, fetch timestamp, response/document hash, and archive snapshot with every imported item.

Each connector must use an official permitted source, identify itself, respect rate limits and access controls, and retain the original response/document. Prefer RSS and ordinary HTTP; use Playwright only for genuinely client-rendered public pages.

Workflow: `discovered → fetched → downloaded → parsed → ai_processed → needs_review → approved → published`. Any stage may become `failed` with retry metadata; reviewers may reject an item.

Each scheduled run must:

1. Create an `ingestion_runs` record tied to its configured source.
2. Discover stable upstream identifiers without downloading unchanged items unnecessarily.
3. Record each candidate in `ingestion_items` with source URL and upstream metadata.
4. Retain the original permitted response or document, its SHA-256 hash, fetch time, source name/URL, and connector/parser version.
5. Create a new immutable version when content changes; never overwrite a prior version.
6. Parse into a non-public candidate with a source locator.
7. Queue relationship suggestions separately from official text.
8. Finish with counts and item-level errors so retries are idempotent.

## Scheduling and ownership

- Historical imports are manually triggered and pinned to an explicit dataset snapshot.
- Daily judgment discovery runs on a scheduler, using a stored cursor plus a small overlap window so delayed upstream publications are not missed.
- Act change detection runs independently from judgment discovery. A detected change creates a new source version and review task; it does not alter published official text.
- Relationship generation runs only after both endpoints exist. AI-proposed links are never treated as verified links.

Deduplication compares source, type, stable external identifier, document number/date, normalized title, source URL, SHA-256 file hash, and content hash. An unchanged hash is skipped; changed content creates a new immutable version.

AI output must validate against a strict schema and return null/empty when evidence is absent. It may propose relationships but cannot publish or rewrite official text. References should be resolved against database identifiers before review.

The supplied Income Tax Act can be parsed with `npm run extract:income-tax`. The generated JSON is an internal candidate artifact: every record is marked `needs_review` and `publishable: false`, and includes a candidate PDF page locator plus document hash and parser metadata. It must not be imported by public routes or rendered as official text until an editor verifies the locator and wording.
