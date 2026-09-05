import { Router, type Response } from "express";
import { z } from "zod";
import { ok } from "../http.js";
import { listContent } from "../content-store.js";
import { config } from "../config.js";
import { database } from "../db.js";
export const publicRouter = Router();
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) });
publicRouter.get("/health", (_req, res) => ok(res, { status: "healthy", service: "caselawindia-api", timestamp: new Date().toISOString() }));
publicRouter.get("/sources/bharat/search", async (req, res, next) => { try { const parsed = z.object({ q: z.string().trim().max(200).default(""), court: z.string().trim().max(80).optional(), year: z.coerce.number().int().min(1950).max(2100).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) }).safeParse(req.query); if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_QUERY", message: "Invalid archive search.", details: parsed.error.flatten() } }); const db = database(); if (!db) return res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "The historical archive database is not configured." } }); const { q, court, year, page, limit } = parsed.data; const values: unknown[] = []; const where: string[] = []; if (q) { values.push(`%${q}%`); where.push(`(title ILIKE $${values.length} OR cnr ILIKE $${values.length} OR case_id ILIKE $${values.length} OR citation ILIKE $${values.length} OR petitioner ILIKE $${values.length} OR respondent ILIKE $${values.length})`); } if (court) { values.push(court); where.push(`court_code = $${values.length}`); } if (year) { values.push(year); where.push(`year = $${values.length}`); } values.push(limit, (page - 1) * limit); const clause = where.length ? `WHERE ${where.join(" AND ")}` : ""; const result = await db.query(`SELECT source_key AS id, cnr, case_id AS "caseId", title, court_code AS "courtCode", court_name AS court, decision_date AS "decisionDate", year, citation, petitioner, respondent, judges, pdf_path AS "pdfPath", status FROM archive_judgments ${clause} ORDER BY decision_date DESC NULLS LAST, source_key LIMIT $${values.length - 1} OFFSET $${values.length}`, values); const count = await db.query(`SELECT count(*)::bigint AS total FROM archive_judgments ${clause}`, values.slice(0, -2)); return ok(res, result.rows, { page, limit, total: Number(count.rows[0]?.total ?? 0), source: "bharat-courts-archive", verifiedOnly: false }); } catch (error) { next(error); } });
const archiveSelect = `source_key AS id, cnr, case_id AS "caseId", title, court_code AS "courtCode", court_name AS court, decision_date AS "decisionDate", year, citation, petitioner, respondent, judges, bench, author_judge AS "authorJudge", disposal_nature AS "disposalNature", description, pdf_path AS "pdfPath", source_name AS "sourceName", source_license AS "sourceLicense", connector_version AS "connectorVersion", last_verified_at AS "lastVerifiedAt", status`;

publicRouter.get("/archive/judgments", async (req, res, next) => {
  try {
    const parsed = z.object({ q: z.string().trim().max(200).default(""), courtType: z.enum(["supreme_court", "high_court"]).optional(), court: z.string().trim().max(80).optional(), year: z.coerce.number().int().min(1950).max(2100).optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(20) }).safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_QUERY", message: "Invalid judgment catalogue query.", details: parsed.error.flatten() } });
    const db = database();
    if (!db) return res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "The judgment database is unavailable." } });
    const { q, courtType, court, year, page, limit } = parsed.data;
    const values: unknown[] = [];
    const where: string[] = [];
    if (q) { values.push(`%${q}%`); where.push(`(title ILIKE $${values.length} OR cnr ILIKE $${values.length} OR case_id ILIKE $${values.length} OR citation ILIKE $${values.length} OR petitioner ILIKE $${values.length} OR respondent ILIKE $${values.length})`); }
    if (courtType) where.push(courtType === "supreme_court" ? `court_code = 'sci'` : `court_code <> 'sci'`);
    if (court) { values.push(court); where.push(`court_code = $${values.length}`); }
    if (year) { values.push(year); where.push(`year = $${values.length}`); }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const countValues = [...values];
    values.push(limit, (page - 1) * limit);
    const [records, count] = await Promise.all([
      db.query(`SELECT ${archiveSelect} FROM archive_judgments ${clause} ORDER BY decision_date DESC NULLS LAST, source_key LIMIT $${values.length - 1} OFFSET $${values.length}`, values),
      db.query(`SELECT count(*)::bigint AS total FROM archive_judgments ${clause}`, countValues),
    ]);
    return ok(res, records.rows, { page, limit, total: Number(count.rows[0]?.total ?? 0), pages: Math.ceil(Number(count.rows[0]?.total ?? 0) / limit), source: "bharat-courts-archive", verifiedOnly: false });
  } catch (error) { next(error); }
});

publicRouter.get("/archive/judgments/:id", async (req, res, next) => {
  try {
    const id = z.string().trim().min(1).max(300).safeParse(req.params.id);
    if (!id.success) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Judgment not found." } });
    const db = database();
    if (!db) return res.status(503).json({ error: { code: "DATABASE_UNAVAILABLE", message: "The judgment database is unavailable." } });
    const result = await db.query(`SELECT ${archiveSelect} FROM archive_judgments WHERE source_key = $1 LIMIT 1`, [id.data]);
    if (!result.rows[0]) return res.status(404).json({ error: { code: "NOT_FOUND", message: "Judgment not found." } });
    return ok(res, result.rows[0], { source: "bharat-courts-archive" });
  } catch (error) { next(error); }
});

publicRouter.get("/sources/ecourts/cases/:cnr", async (req, res, next) => { try { const parsed = z.string().trim().toUpperCase().regex(/^[A-Z]{4}\d{12}$/, "A valid 16-character CNR is required.").safeParse(req.params.cnr); if (!parsed.success) return res.status(400).json({ error: { code: "INVALID_CNR", message: "Enter a valid 16-character CNR." } }); if (!config.ECI_API_KEY) return res.status(503).json({ error: { code: "SOURCE_UNAVAILABLE", message: "The eCourtsIndia connector is not configured." } }); const upstream = await fetch(`${config.ECI_API_BASE_URL}/api/partner/case/${encodeURIComponent(parsed.data)}`, { headers: { Authorization: `Bearer ${config.ECI_API_KEY}`, Accept: "application/json" }, signal: AbortSignal.timeout(15_000) }); const body = await upstream.json().catch(() => null); if (!upstream.ok) return res.status(upstream.status === 404 ? 404 : 502).json({ error: { code: upstream.status === 404 ? "CASE_NOT_FOUND" : "UPSTREAM_ERROR", message: upstream.status === 404 ? "No live case was found for that CNR." : "The live court-data provider could not complete the request." } }); return ok(res, { case: body?.data ?? body, source: { name: "eCourtsIndia", fetchedAt: new Date().toISOString(), cnr: parsed.data } }); } catch (error) { next(error); } });
publicRouter.get("/search", (req, res) => { const params = z.object({ q: z.string().trim().min(2).max(200), type: z.string().optional() }).merge(pagination).safeParse(req.query); if (!params.success) return res.status(400).json({ error: { code: "INVALID_QUERY", message: "Enter at least two characters.", details: params.error.flatten() } }); return ok(res, { groups: [] }, { query: params.data.q, page: params.data.page, limit: params.data.limit, total: 0, source: "database" }); });
publicRouter.get("/acts", (req, res) => { const p = pagination.parse(req.query); return ok(res, [], { ...p, total: 0 }); });
publicRouter.get("/acts/:slug", (req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: `No published act exists at ${req.params.slug}.` } }));
publicRouter.get("/sections/:id", (req, res) => res.status(404).json({ error: { code: "NOT_FOUND", message: `No published section exists for ${req.params.id}.` } }));
publicRouter.get("/sections/:id/relationships", (_req, res) => ok(res, [], { verifiedOnly: true, bidirectional: true }));
for (const route of ["notifications", "circulars", "cases", "forms", "updates"]) publicRouter.get(`/${route}`, (req, res) => { const p = pagination.parse(req.query); return ok(res, [], { ...p, total: 0 }); });
publicRouter.get("/content", (_req, res) => { const store = listContent(); return ok(res, { categories: store.categories.filter((item) => item.status === "published"), cases: store.cases.filter((item) => item.status === "published"), posts: store.posts.filter((item) => item.status === "published"), partners: store.partners.filter((item) => item.active && item.url), featured: store.featured.filter((item) => item.active) }); });
const SITEMAP_PAGE_SIZE = 45_000;
const xml = (value: unknown) => String(value).replace(/[<>&'\"]/g, (character) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[character] ?? character);
const sitemapHeaders = (res: Response) => res.set({ "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400", "X-Robots-Tag": "noindex" }).type("application/xml");

publicRouter.get("/sitemap.xml", async (_req, res, next) => {
  try {
    const db = database();
    const children = [`${config.SITE_URL}/api/sitemaps/static.xml`];
    if (db) {
      const partitions = await db.query(`SELECT court_code, year, count(*)::bigint AS total, max(updated_at) AS lastmod FROM archive_judgments WHERE status = 'published' GROUP BY court_code, year ORDER BY court_code, year`);
      for (const partition of partitions.rows) {
        const pages = Math.ceil(Number(partition.total) / SITEMAP_PAGE_SIZE);
        for (let page = 1; page <= pages; page += 1) children.push(`${config.SITE_URL}/api/sitemaps/judgments/${encodeURIComponent(partition.court_code)}/${partition.year}/${page}.xml`);
      }
    }
    const entries = children.map((url) => `<sitemap><loc>${xml(url)}</loc></sitemap>`).join("");
    sitemapHeaders(res).send(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</sitemapindex>`);
  } catch (error) { next(error); }
});

publicRouter.get("/sitemaps/static.xml", (_req, res) => {
  const store = listContent();
  const fixed = ["", "/judgments", "/courts/supreme-court", "/courts/high-courts", "/court-sources", "/blog", "/about", "/disclaimer", "/terms", "/privacy", "/data"];
  const dynamic = [...store.categories.filter((item) => item.status === "published").map((item) => `/categories/${item.slug}`), ...store.cases.filter((item) => item.status === "published").map((item) => `/case-law/${item.slug}`), ...store.posts.filter((item) => item.status === "published").map((item) => `/blog/${item.slug}`)];
  const urls = [...fixed, ...dynamic].map((pathname) => `<url><loc>${xml(`${config.SITE_URL}${pathname}`)}</loc></url>`).join("");
  sitemapHeaders(res).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
});

publicRouter.get("/sitemaps/judgments/:court/:year/:page.xml", async (req, res, next) => {
  try {
    const parsed = z.object({ court: z.string().trim().min(1).max(80), year: z.coerce.number().int().min(1950).max(2100), page: z.coerce.number().int().min(1).max(10_000) }).safeParse(req.params);
    if (!parsed.success) return res.status(404).end();
    const db = database();
    if (!db) return res.status(503).end();
    const { court, year, page } = parsed.data;
    const result = await db.query(`SELECT source_key, updated_at FROM archive_judgments WHERE status = 'published' AND court_code = $1 AND year = $2 ORDER BY source_key LIMIT $3 OFFSET $4`, [court, year, SITEMAP_PAGE_SIZE, (page - 1) * SITEMAP_PAGE_SIZE]);
    if (result.rows.length === 0) return res.status(404).end();
    const urls = result.rows.map((record) => `<url><loc>${xml(`${config.SITE_URL}/archive/judgments/${encodeURIComponent(record.source_key)}`)}</loc><lastmod>${new Date(record.updated_at).toISOString().slice(0, 10)}</lastmod></url>`).join("");
    sitemapHeaders(res).send(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`);
  } catch (error) { next(error); }
});
