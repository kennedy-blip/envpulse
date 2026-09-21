import { useMemo, useState } from "react";
import {
  Lock, Unlock, KeyRound, RefreshCw, Copy, ShieldCheck, ShieldAlert, Eye, EyeOff,
  FileLock2, ArrowRight, Trash2, Sparkles, Fingerprint, CheckCircle2, XCircle,
} from "lucide-react";
import { EnvEntry, EnvName, ENV_META, encryptSim, decryptSim, fingerprint, genKey, strengthOf } from "../lib/env";

interface VaultRecord {
  id: string;
  keyName: string;
  env: EnvName;
  ciphertext: string;
  fingerprint: string;
  createdAt: string;
  plaintext: string;
}

interface Props {
  envs: Record<EnvName, EnvEntry[]>;
  onToast: (msg: string, kind?: "success" | "error" | "info") => void;
}

const ENVS: EnvName[] = ["development", "staging", "production"];

export default function SecretsVault({ envs, onToast }: Props) {
  const [vaultKey, setVaultKey] = useState("dGVzdC1kb3RlbnYtdmF1bHQtMzJieXRlcy1zZWNyZXQta2V5LTEyMzQ1Njc4OTA=");
  const [showKey, setShowKey] = useState(false);
  const [records, setRecords] = useState<VaultRecord[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [decryptInput, setDecryptInput] = useState("");
  const [decryptResult, setDecryptResult] = useState<string | null>(null);
  const [decryptError, setDecryptError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);

  const secrets = useMemo(() => {
    const out: { entry: EnvEntry; env: EnvName }[] = [];
    ENVS.forEach((env) => envs[env].forEach((e) => { if (e.sensitive && e.value) out.push({ entry: e, env }); }));
    return out;
  }, [envs]);

  const fp = fingerprint(vaultKey);

  const encryptOne = (entry: EnvEntry, env: EnvName) => {
    const ct = encryptSim(entry.value, vaultKey);
    setRecords((r) => [...r.filter((x) => !(x.keyName === entry.key && x.env === env)), {
      id: `${env}-${entry.key}-${Date.now()}`,
      keyName: entry.key, env, ciphertext: ct, fingerprint: fp,
      createdAt: new Date().toLocaleTimeString(), plaintext: entry.value,
    }]);
  };

  const encryptAll = () => {
    if (!vaultKey.trim()) { onToast("Vault key is empty", "error"); return; }
    setBusy(true); setProgress(0);
    const list = [...secrets];
    let i = 0;
    const step = () => {
      if (i >= list.length) { setBusy(false); onToast(`Encrypted ${list.length} secrets with AES-256-GCM`); return; }
      encryptOne(list[i].entry, list[i].env);
      i++; setProgress(Math.round((i / list.length) * 100));
      setTimeout(step, 180);
    };
    step();
  };

  const doDecrypt = () => {
    const res = decryptSim(decryptInput, vaultKey);
    if (res === null) { setDecryptResult(null); setDecryptError(true); onToast("Decryption failed — wrong key or corrupted token", "error"); }
    else { setDecryptResult(res); setDecryptError(false); onToast("Decrypted successfully"); }
  };

  const rotateKey = () => {
    const nk = genKey();
    setVaultKey(nk);
    setRecords([]);
    setDecryptResult(null);
    onToast("New DOTENV_KEY generated — vault re-locked", "info");
  };

  const copy = async (text: string, label: string) => { await navigator.clipboard.writeText(text); onToast(`Copied ${label}`); };

  const selRecord = records.find((r) => r.id === selected);

  return (
    <div className="space-y-5">
      {/* key management */}
      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <section className="rounded-2xl border border-violet-500/25 bg-gradient-to-br from-[#111827] to-[#0d1220] p-5">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-600/20 glow-violet">
              <KeyRound className="h-5 w-5 text-violet-300" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">DOTENV_KEY — Master Encryption Key</h3>
              <p className="text-xs text-slate-400">AES-256-GCM · 32-byte key · dotenv-vault compatible</p>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-[11px] font-bold text-emerald-300"><span className="h-1.5 w-1.5 animate-pulse-dot rounded-full bg-emerald-400" /> Vault unlocked</span>
          </div>

          <div className="mt-4 flex gap-2">
            <div className="relative flex-1">
              <input value={vaultKey} type={showKey ? "text" : "password"} onChange={(e) => setVaultKey(e.target.value)} spellCheck={false}
                className="w-full rounded-xl border border-slate-700 bg-[#0a0f1a] px-3.5 py-2.5 pr-20 font-mono text-[12px] text-violet-200 outline-none focus:border-violet-500" />
              <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 gap-1">
                <button onClick={() => setShowKey(!showKey)} className="rounded-md p-1.5 text-slate-400 hover:text-violet-300">{showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                <button onClick={() => copy(vaultKey, "DOTENV_KEY")} className="rounded-md p-1.5 text-slate-400 hover:text-violet-300"><Copy className="h-4 w-4" /></button>
              </div>
            </div>
            <button onClick={rotateKey} className="flex items-center gap-1.5 rounded-xl border border-violet-500/40 bg-violet-500/10 px-3.5 text-xs font-bold text-violet-200 hover:bg-violet-500/20"><RefreshCw className="h-3.5 w-3.5" /> Rotate</button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl border border-slate-800 bg-[#0a0f1a] px-3.5 py-2.5">
            <Fingerprint className="h-4 w-4 text-violet-400" />
            <span className="font-mono text-[11px] text-slate-400">SHA-256 fingerprint:</span>
            <span className="font-mono text-[11px] font-bold text-violet-300">{fp}</span>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button onClick={encryptAll} disabled={busy || secrets.length === 0} className="flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-violet-500 disabled:opacity-40">
              <Lock className="h-4 w-4" /> {busy ? `Encrypting… ${progress}%` : `Encrypt all ${secrets.length} secrets`}
            </button>
            <button onClick={() => { setRecords([]); onToast("Vault cleared", "info"); }} className="flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:border-rose-500/50 hover:text-rose-300">
              <Trash2 className="h-4 w-4" /> Clear vault
            </button>
          </div>
          {busy && <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800"><div className="h-full bg-violet-500 transition-all duration-200" style={{ width: `${progress}%` }} /></div>}
          <p className="mt-3 text-[11px] leading-relaxed text-slate-500">Simulation note: encryption runs locally in your browser using an XOR + base64 cipher shaped like real <span className="font-mono text-slate-300">AES256GCM:iv:tag:ciphertext</span> tokens. Never paste real production keys into demos.</p>
        </section>

        {/* decrypt simulator */}
        <section className="rounded-2xl border border-slate-800 bg-[#111827] p-5">
          <h3 className="flex items-center gap-2 text-sm font-bold text-white"><Unlock className="h-4 w-4 text-emerald-400" /> Decryption Simulator</h3>
          <p className="mt-1 text-xs text-slate-400">Paste a ciphertext token and decrypt with the active key.</p>
          <textarea value={decryptInput} onChange={(e) => { setDecryptInput(e.target.value); setDecryptResult(null); setDecryptError(false); }} spellCheck={false} rows={3}
            placeholder="AES256GCM:…:…:…"
            className="mt-3 w-full resize-none rounded-xl border border-slate-700 bg-[#0a0f1a] p-3 font-mono text-[11px] text-slate-200 outline-none focus:border-emerald-500" />
          <button onClick={doDecrypt} className="mt-2 w-full rounded-xl bg-emerald-600 py-2.5 text-xs font-bold text-white hover:bg-emerald-500">Decrypt token</button>
          {decryptResult !== null && (
            <div className="animate-slideUp mt-3 flex items-start gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
              <div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Plaintext</p><p className="break-all font-mono text-[12px] font-bold text-emerald-100">{decryptResult}</p></div>
            </div>
          )}
          {decryptError && (
            <div className="animate-slideUp mt-3 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3">
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
              <p className="text-xs text-rose-200">Authentication failed — token is malformed or the key is wrong.</p>
            </div>
          )}
          {selRecord && (
            <button onClick={() => setDecryptInput(selRecord.ciphertext)} className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg border border-slate-700 py-2 text-[11px] font-semibold text-slate-300 hover:border-emerald-500 hover:text-emerald-300">
              <ArrowRight className="h-3.5 w-3.5" /> Load selected ciphertext
            </button>
          )}
        </section>
      </div>

      {/* secrets inventory + vault records */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827]">
          <div className="border-b border-slate-800 bg-slate-900/60 px-5 py-3.5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white"><ShieldAlert className="h-4 w-4 text-violet-400" /> Sensitive Inventory <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300">{secrets.length}</span></h3>
          <p className="mt-0.5 text-[11px] text-slate-500">Auto-detected secrets across all environments (SECRET · KEY · TOKEN · PASSWORD…)</p>
        </div>
          <div className="max-h-[380px] overflow-y-auto">
            {secrets.map(({ entry, env }) => {
              const st = strengthOf(entry.value);
              const encrypted = records.some((r) => r.keyName === entry.key && r.env === env);
              return (
                <div key={`${env}-${entry.id}`} className="flex items-center gap-3 border-b border-slate-800/60 px-5 py-3 hover:bg-slate-800/25">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-[12px] font-bold text-sky-200">{entry.key}</p>
                    <p className="font-mono text-[10px] text-slate-500">{ENV_META[env].file} · {entry.value.length} chars</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-800"><div className={`h-full rounded-full ${st.score >= 80 ? "bg-emerald-400" : st.score >= 48 ? "bg-amber-400" : "bg-rose-400"}`} style={{ width: `${st.score}%` }} /></div>
                      <span className={`text-[10px] font-bold ${st.score >= 80 ? "text-emerald-300" : st.score >= 48 ? "text-amber-300" : "text-rose-300"}`}>{st.label} · {st.score}%</span>
                    </div>
                  </div>
                  {encrypted
                    ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-bold text-emerald-300"><ShieldCheck className="h-3 w-3" /> Sealed</span>
                    : <button onClick={() => encryptOne(entry, env)} className="flex items-center gap-1 rounded-lg bg-violet-600/20 px-2.5 py-1.5 text-[10px] font-bold text-violet-200 hover:bg-violet-600 hover:text-white"><Lock className="h-3 w-3" /> Encrypt</button>}
                </div>
              );
            })}
            {secrets.length === 0 && <p className="py-10 text-center text-sm text-slate-500">No sensitive variables found.</p>}
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111827]">
          <div className="border-b border-slate-800 bg-slate-900/60 px-5 py-3.5">
            <h3 className="flex items-center gap-2 text-sm font-bold text-white"><FileLock2 className="h-4 w-4 text-violet-400" /> Encrypted Vault <span className="rounded-full bg-violet-500/15 px-2 py-0.5 text-[10px] font-bold text-violet-300">{records.length}</span></h3>
            <p className="mt-0.5 text-[11px] text-slate-500">Click a record to inspect its ciphertext & fingerprint.</p>
          </div>
          <div className="max-h-[380px] overflow-y-auto">
            {records.map((r) => (
              <button key={r.id} onClick={() => setSelected(selected === r.id ? "" : r.id)} className={`block w-full border-b border-slate-800/60 px-5 py-3 text-left transition hover:bg-slate-800/25 ${selected === r.id ? "bg-violet-500/[0.06]" : ""}`}>
                <div className="flex items-center gap-2">
                  <Lock className="h-3.5 w-3.5 text-violet-400" />
                  <span className="font-mono text-[12px] font-bold text-slate-100">{r.keyName}</span>
                  <span className={`ml-auto rounded-full border px-2 py-0.5 text-[9px] font-bold ${ENV_META[r.env].bg} ${ENV_META[r.env].color}`}>{ENV_META[r.env].label}</span>
                  <span className="font-mono text-[10px] text-slate-500">{r.createdAt}</span>
                </div>
                <p className="mt-1 truncate font-mono text-[10px] text-violet-300/80">{r.ciphertext}</p>
                {selected === r.id && (
                  <div className="animate-slideUp mt-2.5 space-y-1.5 rounded-xl border border-slate-800 bg-[#0a0f1a] p-3">
                    <p className="break-all font-mono text-[10px] leading-relaxed text-violet-200">{r.ciphertext}</p>
                    <p className="font-mono text-[10px] text-slate-500">fp: {r.fingerprint}</p>
                    <div className="flex gap-2 pt-1">
                      <button onClick={(e) => { e.stopPropagation(); copy(r.ciphertext, "ciphertext"); }} className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-violet-500"><Copy className="h-3 w-3" /> Copy</button>
                      <button onClick={(e) => { e.stopPropagation(); setDecryptInput(r.ciphertext); onToast("Loaded into decryptor", "info"); }} className="flex items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-[10px] font-bold text-slate-300 hover:border-emerald-500"><Unlock className="h-3 w-3" /> Decrypt</button>
                    </div>
                  </div>
                )}
              </button>
            ))}
            {records.length === 0 && (
              <div className="flex flex-col items-center gap-2 py-14 text-center">
                <Sparkles className="h-8 w-8 text-slate-600" />
                <p className="text-sm text-slate-500">Vault is empty. Encrypt a secret to seal it.</p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
