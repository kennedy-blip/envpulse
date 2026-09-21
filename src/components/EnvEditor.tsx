import { useMemo, useState } from "react";
import {
  Eye, EyeOff, Plus, Trash2, ShieldCheck, ShieldAlert, AlertTriangle, XCircle, CheckCircle2,
  Copy, Download, Search, FileCode2, Table2, Sparkles, RefreshCw, Lock, KeyRound, MessageSquare,
} from "lucide-react";
import {
  EnvEntry, EnvName, ENV_META, TEMPLATE_KEYS, isSensitiveKey, isValidKey,
  validateEntries, healthScore, toDotEnv, parseDotEnv, downloadFile, makeEntry,
} from "../lib/env";

interface Props {
  envName: EnvName;
  entries: EnvEntry[];
  onChange: (entries: EnvEntry[]) => void;
  onToast: (msg: string, kind?: "success" | "error" | "info") => void;
  onLoadTemplate: () => void;
}

export default function EnvEditor({ envName, entries, onChange, onToast, onLoadTemplate }: Props) {
  const [view, setView] = useState<"table" | "raw">("table");
  const [raw, setRaw] = useState("");
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [showComments, setShowComments] = useState(true);

  const templateKeys = TEMPLATE_KEYS.map((t) => t.key);
  const issues = useMemo(() => validateEntries(entries, templateKeys), [entries]);
  const score = healthScore(issues, entries.length);
  const missing = issues.filter((i) => i.type === "missing");
  const errors = issues.filter((i) => i.type === "invalid" || i.type === "duplicate");
  const filtered = entries.filter((e) => e.key.toLowerCase().includes(search.toLowerCase()) || e.value.toLowerCase().includes(search.toLowerCase()));

  const update = (id: string, patch: Partial<EnvEntry>) =>
    onChange(entries.map((e) => (e.id === id ? { ...e, ...patch } : e)));

  const addEntry = (key = "", value = "", sensitive = false) => {
    onChange([...entries, makeEntry(key, value, sensitive || isSensitiveKey(key))]);
    onToast(`Added ${key || "new variable"}`);
  };

  const addFromTemplate = (t: (typeof TEMPLATE_KEYS)[0]) => {
    if (entries.some((e) => e.key === t.key)) { onToast(`${t.key} already exists`, "info"); return; }
    onChange([...entries, makeEntry(t.key, t.placeholder, t.sensitive, t.comment)]);
    onToast(`Added ${t.key} from template`);
  };

  const toggleReveal = (id: string) => {
    setRevealed((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const applyRaw = () => {
    const parsed = parseDotEnv(raw);
    if (!parsed.length) { onToast("No valid KEY=VALUE lines found", "error"); return; }
    onChange(parsed);
    setView("table");
    onToast(`Parsed ${parsed.length} variables from raw text`);
  };

  const copyAll = async () => {
    await navigator.clipboard.writeText(toDotEnv(entries));
    onToast("Copied .env content to clipboard");
  };

  const rowIssue = (e: EnvEntry) => {
    if (!isValidKey(e.key)) return "invalid";
    if (entries.filter((x) => x.key === e.key).length > 1) return "duplicate";
    if (!e.value.trim()) return "empty";
    return "ok";
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      {/* MAIN EDITOR CARD */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827]">
        {/* toolbar */}
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/60 px-4 py-3 sm:px-5">
          <div className={`flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${ENV_META[envName].bg} ${ENV_META[envName].color}`}>
            <span className={`h-2 w-2 rounded-full ${ENV_META[envName].dot}`} />
            <span className="font-mono">{ENV_META[envName].file}</span>
          </div>
          <div className="flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/60 p-1">
            <button onClick={() => setView("table")} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === "table" ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
              <Table2 className="h-3.5 w-3.5" /> Table
            </button>
            <button onClick={() => { setRaw(toDotEnv(entries)); setView("raw"); }} className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold transition ${view === "raw" ? "bg-violet-600 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
              <FileCode2 className="h-3.5 w-3.5" /> Raw .env
            </button>
          </div>
          <div className="relative ml-auto w-full sm:w-52">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Filter keys…" className="w-full rounded-lg border border-slate-700 bg-slate-800/70 py-1.5 pl-8 pr-3 font-mono text-xs text-slate-200 outline-none placeholder:text-slate-500 focus:border-violet-500" />
          </div>
          <button onClick={() => setShowAll(!showAll)} className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${showAll ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800/60 text-slate-300 hover:border-slate-500"}`}>
            {showAll ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />} {showAll ? "Secrets visible" : "Mask secrets"}
          </button>
          <button onClick={() => setShowComments(!showComments)} className={`hidden items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition sm:flex ${showComments ? "border-violet-500/50 bg-violet-500/10 text-violet-300" : "border-slate-700 bg-slate-800/60 text-slate-300"}`}>
            <MessageSquare className="h-3.5 w-3.5" /> Comments
          </button>
        </div>

        {view === "raw" ? (
          <div className="p-4 sm:p-5">
            <p className="mb-3 text-xs text-slate-400">Paste any <span className="font-mono text-slate-200">.env</span> content — comments (<span className="font-mono">#</span>) and quoted values are parsed automatically.</p>
            <textarea value={raw} onChange={(e) => setRaw(e.target.value)} spellCheck={false} rows={16}
              className="w-full resize-y rounded-xl border border-slate-700 bg-[#0a0f1a] p-4 font-mono text-[13px] leading-relaxed text-emerald-200 outline-none focus:border-violet-500" />
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={applyRaw} className="flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white hover:bg-violet-500"><Sparkles className="h-3.5 w-3.5" /> Parse & Apply</button>
              <button onClick={() => setRaw(toDotEnv(entries))} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-300 hover:border-slate-500"><RefreshCw className="h-3.5 w-3.5" /> Reload current</button>
              <button onClick={() => setView("table")} className="rounded-lg border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200">Cancel</button>
            </div>
          </div>
        ) : (
          <>
            {/* header row */}
            <div className="hidden grid-cols-[36px_1.4fr_2fr_110px_36px] gap-3 border-b border-slate-800 px-5 py-2.5 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500 md:grid">
              <span>#</span><span>Key</span><span>Value</span><span>Status</span><span />
            </div>
            <div className="max-h-[560px] overflow-y-auto">
              {filtered.length === 0 && (
                <div className="flex flex-col items-center gap-3 py-16 text-center">
                  <KeyRound className="h-10 w-10 text-slate-600" />
                  <p className="text-sm text-slate-400">No variables match your filter.</p>
                  <button onClick={() => addEntry()} className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-bold text-white">+ Add variable</button>
                </div>
              )}
              {filtered.map((e, idx) => {
                const st = rowIssue(e);
                const isRevealed = showAll || revealed.has(e.id);
                const masked = e.sensitive && !isRevealed;
                return (
                  <div key={e.id} className={`group border-b border-slate-800/70 px-4 py-2.5 transition hover:bg-slate-800/30 sm:px-5 ${st === "invalid" || st === "duplicate" ? "bg-rose-500/[0.04]" : st === "empty" ? "bg-amber-500/[0.04]" : ""}`}>
                    {showComments && e.comment && (
                      <p className="mb-1.5 pl-9 font-mono text-[11px] text-slate-500"># {e.comment}</p>
                    )}
                    <div className="grid grid-cols-[28px_1fr] items-center gap-2 md:grid-cols-[36px_1.4fr_2fr_110px_36px] md:gap-3">
                      <span className="text-center font-mono text-[11px] text-slate-600">{idx + 1}</span>
                      <div className="flex items-center gap-1.5">
                        <input value={e.key} onChange={(ev) => update(e.id, { key: ev.target.value.toUpperCase().replace(/\s/g, "_"), sensitive: isSensitiveKey(ev.target.value) || e.sensitive })}
                          spellCheck={false} placeholder="KEY_NAME"
                          className={`w-full min-w-0 rounded-md border bg-[#0a0f1a] px-2.5 py-2 font-mono text-[13px] font-semibold outline-none transition focus:border-violet-500 ${st === "invalid" || st === "duplicate" ? "border-rose-500/60 text-rose-300" : "border-slate-700 text-sky-200"}`} />
                        {e.sensitive && <span title="Sensitive"><Lock className="h-3.5 w-3.5 shrink-0 text-violet-400" /></span>}
                      </div>
                      <div className="col-span-2 flex items-center gap-2 md:col-span-1">
                        <span className="font-mono text-slate-600">=</span>
                        <input value={e.value} type={masked ? "password" : "text"} onChange={(ev) => update(e.id, { value: ev.target.value })}
                          spellCheck={false} placeholder="value…"
                          className="w-full min-w-0 flex-1 rounded-md border border-slate-700 bg-[#0a0f1a] px-2.5 py-2 font-mono text-[13px] text-slate-100 outline-none transition focus:border-violet-500" />
                        <button onClick={() => toggleReveal(e.id)} title={isRevealed ? "Hide" : "Reveal"} className="shrink-0 rounded-md border border-slate-700 p-2 text-slate-400 transition hover:border-violet-500 hover:text-violet-300">
                          {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <div className="hidden md:block">
                        {st === "ok" && <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Valid</span>}
                        {st === "invalid" && <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-300"><XCircle className="h-3 w-3" /> Bad name</span>}
                        {st === "duplicate" && <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-300"><XCircle className="h-3 w-3" /> Duplicate</span>}
                        {st === "empty" && <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-bold text-amber-300"><AlertTriangle className="h-3 w-3" /> Empty</span>}
                      </div>
                      <button onClick={() => { onChange(entries.filter((x) => x.id !== e.id)); onToast(`Removed ${e.key}`, "info"); }} className="rounded-md p-2 text-slate-600 transition hover:bg-rose-500/10 hover:text-rose-400">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-800 bg-slate-900/50 px-4 py-3 sm:px-5">
              <button onClick={() => addEntry()} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3.5 py-2 text-xs font-bold text-white transition hover:bg-violet-500"><Plus className="h-3.5 w-3.5" /> Add variable</button>
              <button onClick={copyAll} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"><Copy className="h-3.5 w-3.5" /> Copy .env</button>
              <button onClick={() => { downloadFile(ENV_META[envName].file, toDotEnv(entries)); onToast(`Downloaded ${ENV_META[envName].file}`); }} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-slate-500"><Download className="h-3.5 w-3.5" /> Download</button>
              <span className="ml-auto font-mono text-[11px] text-slate-500">{entries.length} vars · {entries.filter((e) => e.sensitive).length} secrets</span>
            </div>
          </>
        )}
      </section>

      {/* VALIDATION SIDEBAR */}
      <aside className="space-y-4">
        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
          <div className="flex items-center gap-4">
            <div className="relative h-20 w-20 shrink-0">
              <svg viewBox="0 0 80 80" className="h-20 w-20 -rotate-90">
                <circle cx="40" cy="40" r="34" fill="none" stroke="#1e293b" strokeWidth="7" />
                <circle cx="40" cy="40" r="34" fill="none" stroke={score >= 80 ? "#10b981" : score >= 50 ? "#f59e0b" : "#f43f5e"} strokeWidth="7" strokeLinecap="round" strokeDasharray={`${(score / 100) * 213.6} 213.6`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center font-mono text-lg font-bold text-white">{score}</span>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Config Health</p>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-400">
                {score >= 80 ? "This environment is production-ready." : score >= 50 ? "Fix warnings before deploying." : "Critical issues — do not deploy."}
              </p>
              <div className="mt-2 flex gap-2 text-[11px] font-semibold">
                <span className="rounded-full bg-rose-500/10 px-2 py-0.5 text-rose-300">{errors.length} errors</span>
                <span className="rounded-full bg-amber-500/10 px-2 py-0.5 text-amber-300">{missing.length} missing</span>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {issues.length === 0 ? (
              <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2.5 text-xs font-semibold text-emerald-300"><ShieldCheck className="h-4 w-4" /> All checks passed — fully synced with template.</div>
            ) : (
              issues.slice(0, 8).map((i, k) => (
                <div key={k} className={`flex items-start gap-2 rounded-xl border px-3 py-2.5 text-xs ${i.type === "missing" || i.type === "empty" ? "border-amber-500/25 bg-amber-500/[0.06]" : "border-rose-500/25 bg-rose-500/[0.06]"}`}>
                  {i.type === "missing" || i.type === "empty" ? <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" /> : <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-400" />}
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-slate-100">{i.key}</span>
                    <p className="text-slate-400">{i.message}</p>
                  </div>
                  {i.type === "missing" && (
                    <button onClick={() => addFromTemplate(TEMPLATE_KEYS.find((t) => t.key === i.key)!)} className="ml-auto shrink-0 rounded-md bg-amber-500/20 px-2 py-1 text-[10px] font-bold text-amber-200 hover:bg-amber-500/30">+ Add</button>
                  )}
                </div>
              ))
            )}
            {issues.length > 8 && <p className="text-center text-[11px] text-slate-500">+ {issues.length - 8} more issues</p>}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white"><ShieldAlert className="h-4 w-4 text-violet-400" /> .env.example Template</h3>
            <button onClick={onLoadTemplate} className="rounded-md bg-violet-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-violet-500">Load all</button>
          </div>
          <p className="mb-3 text-xs text-slate-400">Click a key to inject it into <span className="font-mono text-slate-200">{ENV_META[envName].file}</span>.</p>
          <div className="flex flex-wrap gap-1.5">
            {TEMPLATE_KEYS.map((t) => {
              const present = entries.some((e) => e.key === t.key);
              return (
                <button key={t.key} onClick={() => addFromTemplate(t)} title={t.comment}
                  className={`rounded-md border px-2 py-1 font-mono text-[10px] font-semibold transition ${present ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-800/60 text-slate-400 hover:border-violet-500 hover:text-violet-300"}`}>
                  {present ? "✓ " : "+ "}{t.key}
                </button>
              );
            })}
          </div>
          <div className="mt-4 rounded-xl border border-slate-800 bg-[#0a0f1a] p-3">
            <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">Naming rule</p>
            <p className="font-mono text-[11px] leading-relaxed text-slate-400"><span className="text-emerald-300">UPPER_SNAKE_CASE</span> only — letters, digits, underscores. Must start with a letter.</p>
          </div>
        </div>
      </aside>
    </div>
  );
}
