# SEO sitemap and Search Console

CaseLawIndia exposes one sitemap index at:

`https://caselawindia.io/sitemap.xml`

The index links to:

- `api/sitemaps/static.xml` for stable public pages and published editorial content.
- `api/sitemaps/judgments/{court}/{year}/{page}.xml` for archive judgment pages.

Judgment sitemaps are split by court and year, then capped at 45,000 URLs per file. This remains below the sitemap protocol limit of 50,000 URLs and keeps large High Court partitions manageable. Sitemap files are generated from PostgreSQL, so no millions of XML files are stored on disk.

## Publication gate

Only `archive_judgments.status = 'published'` records are emitted. Imported records default to `needs_review`; importing metadata does not make it indexable. Publish records only after their source locator and metadata have been reviewed. A sitemap URL must also resolve to a canonical, indexable judgment page before publication.

## Google Search Console

1. Add a Domain property for `caselawindia.io` and complete DNS verification.
2. Submit only `https://caselawindia.io/sitemap.xml` under **Indexing → Sitemaps**.
3. Inspect a small sample of published judgment URLs before approving bulk publication.
4. Monitor **Page indexing**, **Crawl stats**, and sitemap discovery. Do not request indexing individually for millions of URLs.
5. Keep search/filter result pages, admin pages, and unreviewed records out of sitemaps and marked `noindex` where they are accessible.

`robots.txt` advertises the sitemap index automatically.
