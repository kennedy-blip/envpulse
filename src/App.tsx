import { useEffect, useMemo, useState } from "react";
import { KeyRound, FileEdit, GitCompareArrows, ShieldCheck, Package, Download, Sparkles, CheckCircle2, XCircle, Info, Activity, Layers, AlertTriangle } from "lucide-react";
import EnvEditor from "./components/EnvEditor";
import EnvDiff from "./components/EnvDiff";
import SecretsVault from "./components/SecretsVault";
import EnvExporter from "./components/EnvExporter";
import { EnvEntry, EnvName, TabId, ENV_META, TEMPLATE_KEYS, defaultEnvs, validateEntries, healthScore, toDotEnv, downloadFile, makeEntry } from "./lib/env";

interface Toast { id: number; msg: string; kind: "success" | "error" | "info" }

const TABS: { id: TabId; label: string; icon: React.ReactNode; desc: string }[] = [
  { id: "editor", label: ".env File Editor", icon: <FileEdit className="h-4 w-4" />, desc: "Edit, validate & mask" },
  { id: "diff", label: "Environment Diff & Validator", icon: <GitCompareArrows className="h-4 w-4" />, desc: "Compare dev · stage · prod" },
  { id: "vault", label: "Secrets Vault", icon: <ShieldCheck className="h-4 w-4" />, desc: "AES-256 encryption" },
  { id: "export", label: "Export Studio", icon: <Package className="h-4 w-4" />, desc: "Docker · K8s · Vercel" },
];

export default function App() {
  const [envs, setEnvs] = useState<Record<EnvName, EnvEntry[]>>(defaultEnvs);
  const [activeEnv, setActiveEnv] = useState<EnvName>("development");
  const [tab, setTab] = useState<TabId>("editor");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [clock, setClock] = useState("");

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, []);

  const toast = (msg: string, kind: Toast["kind"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3400);
  };

  const templateKeys = TEMPLATE_KEYS.map((t) => t.key);
  const stats = useMemo(() => {
    const all = (Object.values(envs) as EnvEntry[][]).flat();
    const issues = validateEntries(envs[activeEnv], templateKeys);
    return {
      total: all.length,
      secrets: all.filter((e) => e.sensitive).length,
      issues: issues.length,
      score: healthScore(issues, envs[activeEnv].length),
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [envs, activeEnv]);

  const loadTemplate = () => {
    const current = envs[activeEnv];
    const missing = TEMPLATE_KEYS.filter((t) => !current.some((e) => e.key === t.key));
    if (!missing.length) { toast("All template keys already present", "info"); return; }
    setEnvs((p) => ({ ...p, [activeEnv]: [...p[activeEnv], ...missing.map((t) => makeEntry(t.key, t.placeholder, t.sensitive, t.comment))] }));
    toast(`Loaded ${missing.length} keys from .env.example`);
  };

  const exportAll = () => {
    (Object.keys(envs) as EnvName[]).forEach((e) => downloadFile(ENV_META[e].file, toDotEnv(envs[e])));
    toast("Exported all 3 environment files");
  };

  const setEnvEntries = (entries: EnvEntry[]) => setEnvs((p) => ({ ...p, [activeEnv]: entries }));

  return (
    <div className="grid-bg min-h-screen bg-[#080c14] text-slate-200">
      {/* ===== HEADER ===== */}
      <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-[#080c14]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1440px] flex-wrap items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-violet-800 glow-violet">
              <KeyRound className="h-5 w-5 text-white" />
              <span className="absolute -right-1 -top-1 h-3 w-3 animate-pulse-dot rounded-full border-2 border-[#080c14] bg-emerald-400" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold leading-none tracking-tight text-white">
                Env<span className="text-violet-400">Pulse</span>
              </h1>
              <p className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500 sm:block">Env Manager · Vault · Validator</p>
            </div>
          </div>

          <span className="ml-1 hidden items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold text-emerald-300 md:inline-flex">
            <span className="h-2 w-2 animate-pulse-dot rounded-full bg-emerald-400" /> Config Engine: Synced
            <span className="font-mono text-[10px] font-medium text-emerald-400/70">{clock}</span>
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button onClick={loadTemplate} className="flex items-center gap-1.5 rounded-lg border border-violet-500/40 bg-violet-500/10 px-3 py-2 text-xs font-bold text-violet-200 transition hover:bg-violet-500/20">
              <Sparkles className="h-3.5 w-3.5" /> Load .env.example Template
            </button>
            <button onClick={exportAll} className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-500">
              <Download className="h-3.5 w-3.5" /> Export All Configs
            </button>
          </div>
        </div>

        {/* nav tabs */}
        <nav className="mx-auto flex max-w-[1440px] gap-1.5 overflow-x-auto px-4 pb-3 sm:px-6">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex shrink-0 items-center gap-2 rounded-xl border px-3.5 py-2.5 text-left transition ${tab === t.id ? "border-violet-500/60 bg-violet-500/15 text-white shadow-[0_0_18px_rgba(139,92,246,0.18)]" : "border-slate-800 bg-slate-900/50 text-slate-400 hover:border-slate-600 hover:text-slate-200"}`}>
              <span className={tab === t.id ? "text-violet-300" : ""}>{t.icon}</span>
              <span>
                <span className="block text-xs font-bold leading-none">{t.label}</span>
                <span className="mt-1 hidden text-[10px] text-slate-500 lg:block">{t.desc}</span>
              </span>
            </button>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
        {/* env switcher + stats */}
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-[#111827] p-1">
            {(Object.keys(ENV_META) as EnvName[]).map((e) => (
              <button key={e} onClick={() => setActiveEnv(e)} className={`flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-bold capitalize transition ${activeEnv === e ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-slate-200"}`}>
                <span className={`h-2 w-2 rounded-full ${ENV_META[e].dot}`} />{e}
              </button>
            ))}
          </div>
          <span className="hidden font-mono text-[11px] text-slate-500 sm:block">{ENV_META[activeEnv].file}</span>

          <div className="ml-auto flex flex-wrap gap-2">
            {[
              { icon: <Layers className="h-3.5 w-3.5 text-sky-400" />, label: "Total vars", value: stats.total },
              { icon: <ShieldCheck className="h-3.5 w-3.5 text-violet-400" />, label: "Secrets", value: stats.secrets },
              { icon: <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />, label: "Issues", value: stats.issues },
              { icon: <Activity className="h-3.5 w-3.5 text-emerald-400" />, label: "Health", value: `${stats.score}%` },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-xl border border-slate-800 bg-[#111827] px-3 py-2">
                {s.icon}
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{s.label}</span>
                <span className="font-mono text-sm font-bold text-white">{s.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* views */}
        <div key={tab} className="animate-slideUp">
          {tab === "editor" && <EnvEditor envName={activeEnv} entries={envs[activeEnv]} onChange={setEnvEntries} onToast={toast} onLoadTemplate={loadTemplate} />}
          {tab === "diff" && <EnvDiff envs={envs} onChange={(env, entries) => setEnvs((p) => ({ ...p, [env]: entries }))} onToast={toast} />}
          {tab === "vault" && <SecretsVault envs={envs} onToast={toast} />}
          {tab === "export" && <EnvExporter envs={envs} onToast={toast} />}
        </div>

        <footer className="mt-8 flex flex-wrap items-center justify-between gap-2 border-t border-slate-800/70 pt-4 text-[11px] text-slate-600">
          <p>EnvPulse — local-first config workspace. All data stays in your browser; nothing is uploaded.</p>
          <p className="font-mono">AES-256-GCM · dotenv-vault style · JetBrains Mono</p>
        </footer>
      </main>

      {/* toasts */}
      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <div key={t.id} className={`animate-slideUp pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-xs font-semibold shadow-2xl backdrop-blur ${t.kind === "success" ? "border-emerald-500/40 bg-emerald-950/90 text-emerald-200" : t.kind === "error" ? "border-rose-500/40 bg-rose-950/90 text-rose-200" : "border-violet-500/40 bg-violet-950/90 text-violet-200"}`}>
            {t.kind === "success" ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : t.kind === "error" ? <XCircle className="h-4 w-4 shrink-0" /> : <Info className="h-4 w-4 shrink-0" />}
            {t.msg}
          </div>
        ))}
      </div>
    </div>
  );
}
