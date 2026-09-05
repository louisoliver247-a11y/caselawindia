import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export type Status = "draft" | "published" | "archived";
export type CategoryRecord = { id: string; name: string; slug: string; description: string; status: Status; createdAt: string; updatedAt: string };
export type CaseRecord = { id: string; title: string; slug: string; categoryId: string; court: string; caseNumber: string; citation: string; decisionDate: string; judges: string[]; parties: string; summary: string; judgmentText: string; sourceUrl: string; status: Status; createdAt: string; updatedAt: string };
export type PostRecord = { id: string; title: string; slug: string; excerpt: string; body: string; author: string; status: Status; publishedAt: string | null; createdAt: string; updatedAt: string };
export type PartnerRecord = { id: string; name: string; label: string; url: string; placement: "sidebar" | "inline" | "both"; active: boolean; disclosure: string; createdAt: string; updatedAt: string };
export type FeaturedRecord = { id: string; title: string; description: string; url: string; label: string; active: boolean; createdAt: string; updatedAt: string };
type AuditRecord = { id: string; action: string; entityType: string; entityId: string; snapshot: unknown; createdAt: string };
type Store = { categories: CategoryRecord[]; cases: CaseRecord[]; posts: PostRecord[]; partners: PartnerRecord[]; featured: FeaturedRecord[]; audit: AuditRecord[] };

const storePath = path.resolve(process.cwd(), "storage", "content-store.json");
const emptyStore = (): Store => ({ categories: [], cases: [], posts: [], partners: [], featured: [], audit: [] });
function readStore(): Store { if (!fs.existsSync(storePath)) return emptyStore(); return { ...emptyStore(), ...JSON.parse(fs.readFileSync(storePath, "utf8")) }; }
function writeStore(store: Store) { fs.mkdirSync(path.dirname(storePath), { recursive: true }); const temporary = `${storePath}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(store, null, 2)}\n`, "utf8"); fs.renameSync(temporary, storePath); }
export function listContent() { return readStore(); }
export function createRecord<K extends "categories" | "cases" | "posts" | "partners" | "featured">(collection: K, input: Omit<Store[K][number], "id" | "createdAt" | "updatedAt">) { const store = readStore(); const now = new Date().toISOString(); const record = { ...input, id: randomUUID(), createdAt: now, updatedAt: now } as Store[K][number]; (store[collection] as Store[K][number][]).push(record); store.audit.push({ id: randomUUID(), action: "created", entityType: collection, entityId: record.id, snapshot: record, createdAt: now }); writeStore(store); return record; }
export function updateRecord<K extends "categories" | "cases" | "posts" | "partners" | "featured">(collection: K, id: string, patch: Partial<Store[K][number]>) { const store = readStore(); const records = store[collection] as Store[K][number][]; const index = records.findIndex((record) => record.id === id); if (index < 0) return null; const before = records[index]; const record = { ...before, ...patch, id, createdAt: before.createdAt, updatedAt: new Date().toISOString() } as Store[K][number]; records[index] = record; store.audit.push({ id: randomUUID(), action: "updated", entityType: collection, entityId: id, snapshot: { before, after: record }, createdAt: record.updatedAt }); writeStore(store); return record; }
