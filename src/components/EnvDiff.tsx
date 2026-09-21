import { useMemo, useState } from "react";
import { GitCompareArrows, CheckCircle2, AlertTriangle, XCircle, Copy, ArrowRightLeft, Eye, EyeOff, Plus } from "lucide-react";
import { EnvEntry, EnvName, ENV_META, TEMPLATE_KEYS, makeEntry, isSensitiveKey } from "../lib/env";

interface Props {
  envs: Record<EnvName, EnvEntry[]>;
  onChange: (env: EnvName, entries: EnvEntry[]) => void;
  onToast: (msg: string, kind?: "success" | "error" | "info") => void;
}

type Status = "synced" | "mismatched" | "missing";
type Filter = "all" | Status;

const ENVS: EnvName[] = ["development", "staging", "production"];

export default function EnvDiff({ envs, onChange, onToast }: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  const rows = useMemo(() => {
    const keys = new Set<string>();
    ENVS.forEach((e) => envs[e].forEach((x) => keys.add(x.key)));
    TEMPLATE_KEYS.forEach((t) => keys.add(t.key));
    return [...keys].sort().map((key) => {
      const vals = ENVS.map((e) => envs[e].find((x) => x.key === key));
      const present = vals.filter(Boolean);
      const distinct = new Set(present.map((v) => v!.value));
      const status: Status = present.length < 3 ? "missing" : distinct.size > 1 ? "mismatched" : "synced";
      return { key, vals, status, sensitive: present.some((v) => v!.sensitive) || isSensitiveKey(key) };
    });
  }, [envs]);

  const counts = useMemo(() => ({
    synced: rows.filter((r) => r.status === "synced").length,
    mismatched: rows.filter((r) => r.status === "mismatched").length,
    missing: rows.filter((r) => r.status === "missing").length,
  }), [rows]);

  const visible = rows.filter((r) => filter === "all" || r.status === filter);
  const syncPct = rows.length ? Math.round((counts.synced / rows.length) * 100) : 100;

  const setValue = (env: EnvName, key: string, value: string) => {
    const list = envs[env];
    const existing = list.find((x) => x.key === key);
    if (existing) onChange(env, list.map((x) => (x.key === key ? { ...x, value } : x)));
    else onChange(env, [...list, makeEntry(key, value, isSensitiveKey(key))]);
  };

  const copyKey = async (key: string) => { await navigator.clipboard.writeText(key); onToast(`Copied ${key}`); };

  const syncAll = () => {
    // copy production values to missing envs where production has it, else copy dev
    ENVS.forEach((env) => {
      const list = [...envs[env]];
      rows.forEach((r) => {
        if (!list.some((x) => x.key === r.key)) {
          const src = envs.production.find((x) => x.key === r.key) || envs.development.find((x) => x.key === r.key);
          if (src) list.push(makeEntry(r.key, src.value, src.sensitive, src.comment));
        }
      });
      onChange(env, list);
    });
    onToast("Synced missing keys across all environments");
  };

  const statusBadge = (s: Status) =>
    s === "synced" ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300"><CheckCircle2 className="h-3 w-3" /> Synced</span>
    : s === "mismatched" ? <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300"><ArrowRightLeft className="h-3 w-3" /> Mismatched</span>
    : <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-300"><AlertTriangle className="h-3 w-3" /> Missing</span>;

  return (
    <div className="space-y-5">
      {/* summary cards */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Total keys", value: rows.length, sub: "union across envs + template", cls: "text-white", icon: <GitCompareArrows className="h-4 w-4 text-slate-400" /> },
          { label: "Synced", value: counts.synced, sub: `${syncPct}% identical everywhere`, cls: "text-emerald-300", icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" /> },
          { label: "Mismatched", value: counts.mismatched, sub: "values differ per env", cls: "text-violet-300", icon: <ArrowRightLeft className="h-4 w-4 text-violet-400" /> },
          { label: "Missing somewhere", value: counts.missing, sub: "absent in ≥1 environment", cls: "text-amber-300", icon: <XCircle className="h-4 w-4 text-amber-400" /> },
        ].map((c) => (
          <div key={c.label} className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
            <div className="flex items-center justify-between"><p className="text-[11px] font-bold uppercase tracking-widest text-slate-500">{c.label}</p>{c.icon}</div>
            <p className={`mt-1 font-mono text-3xl font-bold ${c.cls}`}>{c.value}</p>
            <p className="mt-0.5 text-[11px] text-slate-500">{c.sub}</p>
          </div>
        ))}
      </div>

      {/* sync progress */}
      <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-bold text-white">Cross-environment parity</p>
          <button onClick={syncAll} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-500"><Plus className="h-3.5 w-3.5" /> Auto-fill missing keys</button>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500" style={{ width: `${syncPct}%` }} />
        </div>
        <p className="mt-1.5 font-mono text-[11px] text-slate-500">{syncPct}% of keys are identical across development, staging & production</p>
      </div>

      {/* diff table */}
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827]">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800 bg-slate-900/60 px-4 py-3">
          <GitCompareArrows className="h-4 w-4 text-violet-400" />
          <h3 className="text-sm font-bold text-white">Environment Diff Matrix</h3>
          <div className="ml-auto flex gap-1.5">
            {(["all", "synced", "mismatched", "missing"] as Filter[]).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-3 py-1 text-[11px] font-bold capitalize transition ${filter === f ? "bg-violet-600 text-white" : "border border-slate-700 text-slate-400 hover:text-slate-200"}`}>{f}</button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left">
            <thead>
              <tr className="border-b border-slate-800 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-500">
                <th className="px-4 py-3">Key</th>
                {ENVS.map((e) => (
                  <th key={e} className="px-3 py-3">
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-bold ${ENV_META[e].bg} ${ENV_META[e].color}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${ENV_META[e].dot}`} />{ENV_META[e].label}
                    </span>
                  </th>
                ))}
                <th className="px-3 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.key} className={`border-b border-slate-800/60 transition hover:bg-slate-800/25 ${r.status === "missing" ? "bg-amber-500/[0.03]" : ""}`}>
                  <td className="px-4 py-2.5">
                    <button onClick={() => copyKey(r.key)} className="flex items-center gap-1.5 font-mono text-[12px] font-bold text-sky-200 hover:text-sky-100">
                      {r.key} <Copy className="h-3 w-3 text-slate-600" />
                    </button>
                  </td>
                  {r.vals.map((v, i) => {
                    const env = ENVS[i];
                    const isRev = revealed.has(`${env}:${r.key}`);
                    const masked = v?.sensitive && !isRev;
                    return (
                      <td key={env} className="px-3 py-2.5">
                        {v ? (
                          <div className="flex items-center gap-1.5">
                            <input value={v.value} type={masked ? "password" : "text"} spellCheck={false}
                              onChange={(e) => setValue(env, r.key, e.target.value)}
                              className={`w-full min-w-[140px] rounded-md border bg-[#0a0f1a] px-2 py-1.5 font-mono text-[11px] outline-none focus:border-violet-500 ${r.status === "mismatched" ? "border-violet-500/40 text-violet-100" : "border-slate-700 text-slate-200"}`} />
                            {v.sensitive && (
                              <button onClick={() => setRevealed((p) => { const n = new Set(p); n.has(`${env}:${r.key}`) ? n.delete(`${env}:${r.key}`) : n.add(`${env}:${r.key}`); return n; })} className="shrink-0 text-slate-500 hover:text-violet-300">
                                {isRev ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md border border-dashed border-amber-500/40 bg-amber-500/[0.06] px-2 py-1.5 font-mono text-[10px] font-bold text-amber-300">— missing —</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-2.5">{statusBadge(r.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {visible.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No keys with this status.</p>}
        </div>
        <p className="border-t border-slate-800 bg-slate-900/40 px-4 py-2.5 text-[11px] text-slate-500">Cells are editable — changes write straight back to each environment. Click a key to copy it.</p>
      </div>
    </div>
  );
}
