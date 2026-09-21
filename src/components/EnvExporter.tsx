import { useMemo, useState } from "react";
import { Container, Rocket, FileJson2, Terminal, FileCode2, Braces, Copy, Download, Check, Eye, EyeOff, Package } from "lucide-react";
import { EnvEntry, EnvName, ENV_META, generateExport, downloadFile, ExportFormat } from "../lib/env";

interface Props {
  envs: Record<EnvName, EnvEntry[]>;
  onToast: (msg: string, kind?: "success" | "error" | "info") => void;
}

const FORMATS: { id: ExportFormat; label: string; file: string; icon: React.ReactNode; desc: string }[] = [
  { id: "compose", label: "Docker Compose", file: "docker-compose.yml", icon: <Container className="h-4 w-4" />, desc: "environment: block for services" },
  { id: "k8s", label: "Kubernetes ConfigMap", file: "configmap.yaml", icon: <Rocket className="h-4 w-4" />, desc: "apiVersion: v1 manifest" },
  { id: "vercel", label: "Vercel JSON", file: "vercel.json", icon: <FileJson2 className="h-4 w-4" />, desc: "env object for Vercel" },
  { id: "shell", label: "Shell Export", file: "export.sh", icon: <Terminal className="h-4 w-4" />, desc: "export KEY=\"value\" lines" },
  { id: "dotenv", label: "Raw .env", file: ".env", icon: <FileCode2 className="h-4 w-4" />, desc: "classic dotenv format" },
  { id: "json", label: "Plain JSON", file: "env.json", icon: <Braces className="h-4 w-4" />, desc: "flat key/value object" },
];

const ENVS: EnvName[] = ["development", "staging", "production"];

export default function EnvExporter({ envs, onToast }: Props) {
  const [format, setFormat] = useState<ExportFormat>("compose");
  const [envName, setEnvName] = useState<EnvName>("production");
  const [mask, setMask] = useState(false);
  const [copied, setCopied] = useState(false);

  const output = useMemo(
    () => generateExport(envs[envName], format, { maskSecrets: mask, appName: "myapp" }),
    [envs, envName, format, mask]
  );
  const meta = FORMATS.find((f) => f.id === format)!;

  const copy = async () => { await navigator.clipboard.writeText(output); setCopied(true); setTimeout(() => setCopied(false), 1600); onToast(`Copied ${meta.file}`); };
  const dl = () => { downloadFile(meta.file, output); onToast(`Downloaded ${meta.file}`); };

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-[320px_1fr]">
        {/* controls */}
        <section className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">Source environment</p>
            <div className="grid grid-cols-3 gap-1.5">
              {ENVS.map((e) => (
                <button key={e} onClick={() => setEnvName(e)} className={`rounded-lg border px-2 py-2 text-[11px] font-bold capitalize transition ${envName === e ? `${ENV_META[e].bg} ${ENV_META[e].color}` : "border-slate-700 text-slate-400 hover:text-slate-200"}`}>{e.slice(0, 4)}.</button>
              ))}
            </div>
            <p className="mt-2 font-mono text-[10px] text-slate-500">{ENV_META[envName].file} · {envs[envName].length} vars</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
            <p className="mb-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500">Export format</p>
            <div className="space-y-1.5">
              {FORMATS.map((f) => (
                <button key={f.id} onClick={() => setFormat(f.id)} className={`flex w-full items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition ${format === f.id ? "border-violet-500/60 bg-violet-500/10" : "border-slate-800 bg-slate-900/40 hover:border-slate-600"}`}>
                  <span className={format === f.id ? "text-violet-300" : "text-slate-500"}>{f.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`block text-xs font-bold ${format === f.id ? "text-white" : "text-slate-300"}`}>{f.label}</span>
                    <span className="block truncate text-[10px] text-slate-500">{f.desc}</span>
                  </span>
                  <span className="font-mono text-[9px] text-slate-600">{f.file}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#111827] p-4">
            <button onClick={() => setMask(!mask)} className="flex w-full items-center justify-between">
              <span className="flex items-center gap-2 text-xs font-bold text-white">{mask ? <EyeOff className="h-4 w-4 text-amber-400" /> : <Eye className="h-4 w-4 text-emerald-400" />} Mask secrets in export</span>
              <span className={`relative h-5 w-9 rounded-full transition ${mask ? "bg-amber-500" : "bg-slate-700"}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${mask ? "left-[18px]" : "left-0.5"}`} />
              </span>
            </button>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">{mask ? "Sensitive values are replaced with •••• — safe for sharing & PRs." : "Real values are included. Be careful sharing this output."}</p>
          </div>
        </section>

        {/* preview */}
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827]">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-800 bg-slate-900/70 px-4 py-3">
            <div className="flex gap-1.5">
              <span className="h-3 w-3 rounded-full bg-rose-500/80" /><span className="h-3 w-3 rounded-full bg-amber-400/80" /><span className="h-3 w-3 rounded-full bg-emerald-400/80" />
            </div>
            <span className="flex items-center gap-2 font-mono text-xs font-bold text-slate-200"><Package className="h-3.5 w-3.5 text-violet-400" /> {meta.file}</span>
            <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">{meta.label}</span>
            <div className="ml-auto flex gap-2">
              <button onClick={copy} className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-[11px] font-bold text-slate-200 hover:border-violet-500 hover:text-violet-200">
                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />} {copied ? "Copied!" : "Copy"}
              </button>
              <button onClick={dl} className="flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-violet-500"><Download className="h-3.5 w-3.5" /> Download</button>
            </div>
          </div>
          <pre className="max-h-[520px] overflow-auto p-5 font-mono text-[12px] leading-relaxed text-slate-300">
            <code>{output}</code>
          </pre>
          <div className="border-t border-slate-800 bg-slate-900/40 px-4 py-2.5 text-[11px] text-slate-500">
            Generated live from <span className="font-mono text-slate-300">{ENV_META[envName].file}</span> — {output.split("\n").length} lines · {output.length} bytes
          </div>
        </section>
      </div>
    </div>
  );
}
