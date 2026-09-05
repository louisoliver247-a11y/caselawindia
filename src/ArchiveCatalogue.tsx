import { ArrowLeft, ArrowRight, Calendar, Database, FileText, Gavel, Loader2, Search, ShieldAlert, Users } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";

export type ArchiveJudgment = {
  id: string; cnr: string | null; caseId: string | null; title: string; courtCode: string; court: string;
  decisionDate: string | null; year: number | null; citation: string | null; petitioner: string | null;
  respondent: string | null; judges: string[]; bench?: string | null; authorJudge?: string | null;
  disposalNature?: string | null; description?: string | null; sourceName?: string; sourceLicense?: string;
  connectorVersion?: string; lastVerifiedAt?: string; status: "draft" | "needs_review" | "published" | "archived";
};

const formatDate = (value: string | null | undefined) => value ? new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(value)) : "Not supplied";

function usePageMetadata(title: string, indexable: boolean, canonical?: string) {
  useEffect(() => {
    document.title = `${title} | CaseLawIndia`;
    let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
    if (!robots) { robots = document.createElement("meta"); robots.name = "robots"; document.head.appendChild(robots); }
    robots.content = indexable ? "index,follow" : "noindex,follow";
    let link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) { link = document.createElement("link"); link.rel = "canonical"; document.head.appendChild(link); }
    link.href = canonical ?? window.location.href.split("?")[0];
  }, [title, indexable, canonical]);
}

function ArchiveCard({ item }: { item: ArchiveJudgment }) {
  return <Link to={`/archive/judgments/${encodeURIComponent(item.id)}`} className="group block rounded-xl border border-line bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-saffron hover:shadow-md">
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-slate-400"><span className="rounded bg-mist px-2 py-1 text-forest">{item.court}</span>{item.year && <span>{item.year}</span>}{item.citation && <span>· {item.citation}</span>}</div>
    <h2 className="mt-4 font-serif text-xl leading-7 group-hover:text-saffron">{item.title}</h2>
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-slate-500">{item.caseId && <span>Case ID: {item.caseId}</span>}{item.cnr && <span>CNR: {item.cnr}</span>}</div>
    <div className="mt-5 flex items-center justify-between"><span className="text-[11px] font-semibold text-amber-700">{item.status === "published" ? "Published metadata" : "Metadata needs review"}</span><span className="flex items-center gap-1 text-xs font-bold text-forest">View record <ArrowRight size={14}/></span></div>
  </Link>;
}

export function ArchiveCatalogue({ courtType }: { courtType?: "supreme_court" | "high_court" }) {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const page = Math.max(1, Number(params.get("page") ?? 1) || 1);
  const [input, setInput] = useState(query);
  const [items, setItems] = useState<ArchiveJudgment[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const title = courtType === "supreme_court" ? "Supreme Court judgments" : courtType === "high_court" ? "High Court judgments" : query ? `Search: ${query}` : "Indian judgments";
  usePageMetadata(title, !query);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError("");
    const search = new URLSearchParams({ page: String(page), limit: "20" });
    if (query) search.set("q", query);
    if (courtType) search.set("courtType", courtType);
    fetch(`/api/archive/judgments?${search}`, { signal: controller.signal }).then(async (response) => {
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error?.message ?? "Could not load judgments.");
      setItems(body.data ?? []); setTotal(body.meta?.total ?? 0); setPages(body.meta?.pages ?? 0);
    }).catch((cause) => { if (cause.name !== "AbortError") setError(cause instanceof Error ? cause.message : "Could not load judgments."); }).finally(() => setLoading(false));
    return () => controller.abort();
  }, [query, page, courtType]);

  const submit = (event: FormEvent) => { event.preventDefault(); const next = new URLSearchParams(); if (input.trim()) next.set("q", input.trim()); setParams(next); };
  const go = (nextPage: number) => { const next = new URLSearchParams(params); next.set("page", String(nextPage)); setParams(next); window.scrollTo({ top: 0, behavior: "smooth" }); };

  return <main className="mx-auto min-h-[75vh] max-w-[1200px] px-5 py-14">
    <p className="eyebrow">POSTGRESQL CASE LAW ARCHIVE</p><h1 className="font-serif text-4xl">{title}</h1>
    <p className="mt-4 text-sm text-slate-500">Browse Supreme Court and High Court metadata imported from the Bharat Courts archive. Records awaiting review are clearly labelled.</p>
    <form onSubmit={submit} className="mt-7 flex gap-3 rounded-xl border border-line bg-white p-3 shadow-sm"><label className="flex flex-1 items-center gap-3 px-2"><Search size={18} className="text-saffron"/><input value={input} onChange={(event) => setInput(event.target.value)} className="w-full bg-transparent py-2 text-sm outline-none" placeholder="Party, citation, case ID or CNR"/></label><button className="rounded-lg bg-forest px-6 py-3 text-sm font-bold text-white">Search</button></form>
    <div className="mt-6 flex items-center justify-between text-sm"><strong>{loading ? "Loading archive…" : `${total.toLocaleString("en-IN")} records`}</strong>{pages > 0 && <span className="text-slate-500">Page {page.toLocaleString("en-IN")} of {pages.toLocaleString("en-IN")}</span>}</div>
    {error && <p className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}
    {loading ? <div className="flex justify-center py-20"><Loader2 className="animate-spin text-saffron"/></div> : <div className="mt-5 grid gap-4 md:grid-cols-2">{items.map((item) => <ArchiveCard key={item.id} item={item}/>)}</div>}
    {!loading && !error && items.length === 0 && <div className="mt-6 rounded-xl border border-line bg-white p-10 text-center text-slate-500">No matching judgment metadata was found.</div>}
    {pages > 1 && <nav aria-label="Judgment pages" className="mt-9 flex items-center justify-center gap-4"><button disabled={page <= 1} onClick={() => go(page - 1)} className="button-secondary inline-flex items-center gap-2 disabled:opacity-40"><ArrowLeft size={15}/> Previous</button><span className="text-sm font-semibold">{page.toLocaleString("en-IN")}</span><button disabled={page >= pages} onClick={() => go(page + 1)} className="button-secondary inline-flex items-center gap-2 disabled:opacity-40">Next <ArrowRight size={15}/></button></nav>}
  </main>;
}

export function ArchiveJudgmentPage() {
  const { id = "" } = useParams();
  const [item, setItem] = useState<ArchiveJudgment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  usePageMetadata(item?.title ?? "Judgment record", item?.status === "published", item ? `${window.location.origin}/archive/judgments/${encodeURIComponent(item.id)}` : undefined);
  useEffect(() => { setLoading(true); fetch(`/api/archive/judgments/${encodeURIComponent(decodeURIComponent(id))}`).then(async (response) => { const body = await response.json(); if (!response.ok) throw new Error(body?.error?.message ?? "Judgment not found."); setItem(body.data); }).catch((cause) => setError(cause instanceof Error ? cause.message : "Judgment not found.")).finally(() => setLoading(false)); }, [id]);
  if (loading) return <main className="flex min-h-[70vh] items-center justify-center"><Loader2 className="animate-spin text-saffron"/></main>;
  if (!item) return <main className="mx-auto min-h-[70vh] max-w-3xl px-5 py-24 text-center"><h1 className="font-serif text-4xl">Judgment not found</h1><p className="mt-4 text-slate-500">{error}</p></main>;
  return <main className="mx-auto min-h-[75vh] max-w-[1100px] px-5 py-12">
    <Link to="/judgments" className="inline-flex items-center gap-2 text-sm font-bold text-forest"><ArrowLeft size={15}/> Back to judgments</Link>
    <div className="mt-7 grid gap-7 lg:grid-cols-[minmax(0,1fr)_300px]"><article><div className="flex flex-wrap gap-2 text-[11px] font-bold uppercase tracking-wider"><span className="rounded bg-forest px-3 py-1.5 text-white">{item.court}</span>{item.year && <span className="rounded bg-mist px-3 py-1.5 text-forest">{item.year}</span>}</div><h1 className="mt-5 font-serif text-3xl leading-tight md:text-5xl">{item.title}</h1>{item.citation && <p className="mt-4 text-lg font-semibold text-saffron">{item.citation}</p>}
      {item.status !== "published" && <section className="mt-7 flex gap-3 rounded-xl border border-amber-200 bg-amber-50 p-5 text-amber-900"><ShieldAlert className="shrink-0"/><div><strong>Metadata awaiting editorial review</strong><p className="mt-1 text-sm leading-6">This archive record is provided for discovery and is not presented as verified legal material. Confirm it against the official court source before relying on it.</p></div></section>}
      <section className="mt-7 grid gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-2"><Meta icon={Calendar} label="Decision date" value={formatDate(item.decisionDate)}/><Meta icon={FileText} label="Case ID" value={item.caseId ?? "Not supplied"}/><Meta icon={Users} label="Petitioner" value={item.petitioner ?? "Not supplied"}/><Meta icon={Users} label="Respondent" value={item.respondent ?? "Not supplied"}/><Meta icon={Gavel} label="Bench" value={item.bench ?? "Not supplied"}/><Meta icon={Database} label="CNR" value={item.cnr ?? "Not supplied"}/></section>
    </article><aside className="h-fit rounded-xl border border-line bg-white p-5 shadow-sm"><p className="eyebrow">SOURCE PROVENANCE</p><dl className="mt-5 space-y-4 text-sm"><Row label="Source" value={item.sourceName ?? "Bharat Courts archive"}/><Row label="Licence" value={item.sourceLicense ?? "Not supplied"}/><Row label="Connector" value={item.connectorVersion ?? "Not supplied"}/><Row label="Last checked" value={formatDate(item.lastVerifiedAt)}/><Row label="Record status" value={item.status.replace("_", " ")}/></dl><p className="mt-5 border-t border-line pt-5 text-xs leading-5 text-slate-500">No judgment PDF is stored on this server. This page displays archive metadata only.</p></aside></div>
  </main>;
}

function Meta({ icon: Icon, label, value }: { icon: typeof Calendar; label: string; value: string }) { return <div className="bg-white p-5"><div className="flex items-center gap-2 text-xs text-slate-400"><Icon size={15}/>{label}</div><p className="mt-2 break-words text-sm font-semibold">{value}</p></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div><dt className="text-slate-400">{label}</dt><dd className="mt-1 break-words font-semibold capitalize">{value}</dd></div>; }
