export type EnvName = "development" | "staging" | "production";
export type TabId = "editor" | "diff" | "vault" | "export";

export interface EnvEntry {
  id: string;
  key: string;
  value: string;
  comment?: string;
  sensitive: boolean;
}

export const TEMPLATE_KEYS: { key: string; placeholder: string; sensitive: boolean; comment: string }[] = [
  { key: "NODE_ENV", placeholder: "development", sensitive: false, comment: "Runtime environment" },
  { key: "PORT", placeholder: "3000", sensitive: false, comment: "Application port" },
  { key: "DATABASE_URL", placeholder: "postgres://user:pass@localhost:5432/app", sensitive: true, comment: "Primary Postgres connection" },
  { key: "JWT_SECRET", placeholder: "super-secret-jwt-key-32chars-min", sensitive: true, comment: "JWT signing secret" },
  { key: "JWT_EXPIRES_IN", placeholder: "7d", sensitive: false, comment: "JWT token expiry" },
  { key: "REDIS_URL", placeholder: "redis://localhost:6379", sensitive: false, comment: "Cache / queue Redis" },
  { key: "API_BASE_URL", placeholder: "http://localhost:3000/api", sensitive: false, comment: "Public API base URL" },
  { key: "CORS_ORIGIN", placeholder: "http://localhost:5173", sensitive: false, comment: "Allowed CORS origin" },
  { key: "STRIPE_SECRET_KEY", placeholder: "sk_test_...", sensitive: true, comment: "Stripe payments" },
  { key: "S3_BUCKET", placeholder: "my-app-assets", sensitive: false, comment: "Object storage bucket" },
  { key: "SMTP_HOST", placeholder: "smtp.gmail.com", sensitive: false, comment: "Transactional email" },
  { key: "SMTP_PASSWORD", placeholder: "app-password", sensitive: true, comment: "SMTP auth password" },
  { key: "LOG_LEVEL", placeholder: "info", sensitive: false, comment: "debug | info | warn | error" },
  { key: "ENABLE_BILLING", placeholder: "true", sensitive: false, comment: "Feature flag: billing" },
];

let _id = 100;
export const uid = () => `e${++_id}_${Math.random().toString(36).slice(2, 7)}`;

export function makeEntry(key: string, value: string, sensitive: boolean, comment = ""): EnvEntry {
  return { id: uid(), key, value, sensitive, comment };
}

export const SENSITIVE_RE = /(SECRET|PASSWORD|TOKEN|PRIVATE|CREDENTIAL|API_KEY|ACCESS_KEY|AUTH)/i;
export const isSensitiveKey = (k: string) => SENSITIVE_RE.test(k);
export const isValidKey = (k: string) => /^[A-Z][A-Z0-9_]*$/.test(k);

export function defaultEnvs(): Record<EnvName, EnvEntry[]> {
  return {
    development: [
      makeEntry("NODE_ENV", "development", false, "Runtime environment"),
      makeEntry("PORT", "3000", false, "Application port"),
      makeEntry("DATABASE_URL", "postgres://dev_user:dev_pass@localhost:5432/app_dev", true, "Primary Postgres connection"),
      makeEntry("JWT_SECRET", "dev-jwt-secret-9f3a2b8c1d4e5f6a", true, "JWT signing secret"),
      makeEntry("JWT_EXPIRES_IN", "7d", false, "JWT token expiry"),
      makeEntry("REDIS_URL", "redis://localhost:6379", false, "Cache / queue Redis"),
      makeEntry("API_BASE_URL", "http://localhost:3000/api", false, "Public API base URL"),
      makeEntry("CORS_ORIGIN", "http://localhost:5173", false, "Allowed CORS origin"),
      makeEntry("STRIPE_SECRET_KEY", "sk_test_51H7devExampleKey1234567890", true, "Stripe payments"),
      makeEntry("S3_BUCKET", "my-app-assets-dev", false, "Object storage bucket"),
      makeEntry("SMTP_HOST", "smtp.gmail.com", false, "Transactional email"),
      makeEntry("SMTP_PASSWORD", "dev-smtp-app-pass-2024", true, "SMTP auth password"),
      makeEntry("LOG_LEVEL", "debug", false, "debug | info | warn | error"),
      makeEntry("ENABLE_BILLING", "true", false, "Feature flag: billing"),
    ],
    staging: [
      makeEntry("NODE_ENV", "staging", false, "Runtime environment"),
      makeEntry("PORT", "3000", false, "Application port"),
      makeEntry("DATABASE_URL", "postgres://stage_user:stage_pass@db.staging.internal:5432/app_stage", true, "Primary Postgres connection"),
      makeEntry("JWT_SECRET", "stage-jwt-secret-7c1d9e2a4b6f8a0c", true, "JWT signing secret"),
      makeEntry("REDIS_URL", "redis://redis.staging.internal:6379", false, "Cache / queue Redis"),
      makeEntry("API_BASE_URL", "https://api.staging.myapp.com/api", false, "Public API base URL"),
      makeEntry("CORS_ORIGIN", "https://staging.myapp.com", false, "Allowed CORS origin"),
      makeEntry("STRIPE_SECRET_KEY", "sk_test_51H7stageExampleKey98765", true, "Stripe payments"),
      makeEntry("LOG_LEVEL", "info", false, "debug | info | warn | error"),
      makeEntry("ENABLE_BILLING", "true", false, "Feature flag: billing"),
      // missing: JWT_EXPIRES_IN, S3_BUCKET, SMTP_HOST, SMTP_PASSWORD
    ],
    production: [
      makeEntry("NODE_ENV", "production", false, "Runtime environment"),
      makeEntry("PORT", "8080", false, "Application port"),
      makeEntry("DATABASE_URL", "postgres://prod_user:Pr0d$ecure!Pass@db.prod.internal:5432/app_prod", true, "Primary Postgres connection"),
      makeEntry("JWT_SECRET", "prod-jwt-ultra-secret-4f8a1c9e2b7d6a3f", true, "JWT signing secret"),
      makeEntry("JWT_EXPIRES_IN", "1d", false, "JWT token expiry"),
      makeEntry("REDIS_URL", "redis://redis.prod.internal:6379", false, "Cache / queue Redis"),
      makeEntry("API_BASE_URL", "https://api.myapp.com/api", false, "Public API base URL"),
      makeEntry("CORS_ORIGIN", "https://myapp.com", false, "Allowed CORS origin"),
      makeEntry("STRIPE_SECRET_KEY", "sk_live_51H7prodExampleKeyABC123", true, "Stripe payments"),
      makeEntry("S3_BUCKET", "my-app-assets-prod", false, "Object storage bucket"),
      makeEntry("LOG_LEVEL", "warn", false, "debug | info | warn | error"),
      // missing: SMTP_HOST, SMTP_PASSWORD, ENABLE_BILLING
    ],
  };
}

export interface Issue {
  type: "missing" | "invalid" | "duplicate" | "empty" | "warning";
  key: string;
  message: string;
}

export function validateEntries(entries: EnvEntry[], templateKeys: string[]): Issue[] {
  const issues: Issue[] = [];
  const seen = new Map<string, number>();
  entries.forEach((e) => seen.set(e.key, (seen.get(e.key) || 0) + 1));
  entries.forEach((e) => {
    if (!e.key.trim()) issues.push({ type: "empty", key: "(blank)", message: "Empty key name" });
    else if (!isValidKey(e.key)) issues.push({ type: "invalid", key: e.key, message: "Must be UPPER_SNAKE_CASE" });
    if ((seen.get(e.key) || 0) > 1 && e.key) issues.push({ type: "duplicate", key: e.key, message: "Duplicate key — last value wins" });
    if (!e.value.trim()) issues.push({ type: "empty", key: e.key || "(blank)", message: "Empty value" });
    if (e.key === "PORT" && e.value && !/^\d+$/.test(e.value)) issues.push({ type: "invalid", key: e.key, message: "PORT must be numeric" });
    if (e.key === "DATABASE_URL" && e.value && !e.value.startsWith("postgres")) issues.push({ type: "warning", key: e.key, message: "Expected postgres:// scheme" });
  });
  templateKeys.forEach((k) => {
    if (!entries.some((e) => e.key === k)) issues.push({ type: "missing", key: k, message: "Missing vs .env.example template" });
  });
  return issues;
}

export function healthScore(issues: Issue[], _total: number): number {
  const errors = issues.filter((i) => i.type === "invalid" || i.type === "duplicate").length;
  const missing = issues.filter((i) => i.type === "missing").length;
  const empty = issues.filter((i) => i.type === "empty").length;
  let score = 100 - errors * 12 - missing * 6 - empty * 5;
  return Math.max(0, Math.min(100, score));
}

export function toDotEnv(entries: EnvEntry[], maskSecrets = false): string {
  return entries
    .map((e) => {
      const c = e.comment ? `# ${e.comment}\n` : "";
      const v = maskSecrets && e.sensitive ? "••••••••••••" : e.value;
      return `${c}${e.key}=${v}`;
    })
    .join("\n");
}

export function parseDotEnv(text: string): EnvEntry[] {
  const out: EnvEntry[] = [];
  let pendingComment = "";
  text.split("\n").forEach((line) => {
    const t = line.trim();
    if (!t) return;
    if (t.startsWith("#")) { pendingComment = t.replace(/^#\s*/, ""); return; }
    const eq = t.indexOf("=");
    if (eq === -1) return;
    const key = t.slice(0, eq).trim();
    let value = t.slice(eq + 1).trim().replace(/^"(.*)"$/, "$1").replace(/^'(.*)'$/, "$1");
    out.push(makeEntry(key, value, isSensitiveKey(key), pendingComment));
    pendingComment = "";
  });
  return out;
}

/* ---------- Simulated AES-256-GCM style encryption ---------- */
function b64encode(str: string): string {
  try { return btoa(unescape(encodeURIComponent(str))); } catch { return btoa(str); }
}
function b64decode(str: string): string {
  try { return decodeURIComponent(escape(atob(str))); } catch { return atob(str); }
}
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return Math.abs(h);
}
function xorCipher(text: string, key: string): string {
  return text.split("").map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ (key.charCodeAt(i % key.length) + (i % 31)))).join("");
}
export function encryptSim(plaintext: string, key: string): string {
  const iv = hashStr(key + plaintext).toString(16).padStart(8, "0") + hashStr(plaintext).toString(16).padStart(8, "0");
  const cipher = b64encode(xorCipher(plaintext, key));
  const tag = hashStr(cipher + key).toString(16).padStart(8, "0");
  return `AES256GCM:${iv}:${tag}:${cipher}`;
}
export function decryptSim(token: string, key: string): string | null {
  const parts = token.trim().split(":");
  if (parts.length < 4 || parts[0] !== "AES256GCM") return null;
  const cipher = parts.slice(3).join(":");
  try { return xorCipher(b64decode(cipher), key); } catch { return null; }
}
export function fingerprint(key: string): string {
  const h1 = hashStr(key).toString(16).padStart(8, "0");
  const h2 = hashStr(key.split("").reverse().join("")).toString(16).padStart(8, "0");
  const h3 = hashStr(key + "salt").toString(16).padStart(8, "0");
  return `${h1}:${h2}:${h3}:sha256`;
}
export function genKey(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
  let s = "";
  for (let i = 0; i < 44; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}
export function strengthOf(v: string): { label: string; score: number } {
  if (!v) return { label: "Empty", score: 0 };
  let s = 0;
  if (v.length >= 8) s++; if (v.length >= 16) s++; if (v.length >= 24) s++;
  if (/[a-z]/.test(v) && /[A-Z]/.test(v)) s++;
  if (/\d/.test(v)) s++;
  if (/[^A-Za-z0-9]/.test(v)) s++;
  const score = Math.min(100, s * 16);
  return { label: score >= 80 ? "Strong" : score >= 48 ? "Medium" : "Weak", score };
}

/* ---------- Export generators ---------- */
export type ExportFormat = "compose" | "k8s" | "vercel" | "shell" | "dotenv" | "json";

export function generateExport(entries: EnvEntry[], format: ExportFormat, opts: { maskSecrets: boolean; appName: string }): string {
  const vals = entries.map((e) => ({ ...e, value: opts.maskSecrets && e.sensitive ? "••••••••••••" : e.value }));
  switch (format) {
    case "dotenv":
      return toDotEnv(vals, false);
    case "compose":
      return `# docker-compose.yml — environment block\nservices:\n  app:\n    image: myapp:latest\n    env_file:\n      - .env\n    environment:\n${vals.map((e) => `      - ${e.key}=${e.value}`).join("\n")}\n    ports:\n      - "3000:3000"\n    restart: unless-stopped`;
    case "k8s":
      return `apiVersion: v1\nkind: ConfigMap\nmetadata:\n  name: ${opts.appName}-config\n  labels:\n    app: ${opts.appName}\ndata:\n${vals.map((e) => `  ${e.key}: "${e.value.replace(/"/g, '\\"')}"`).join("\n")}`;
    case "vercel":
      return JSON.stringify({ $schema: "https://openapi.vercel.sh/vercel.json", env: Object.fromEntries(vals.map((e) => [e.key, e.value])) }, null, 2);
    case "shell":
      return vals.map((e) => `export ${e.key}="${e.value.replace(/"/g, '\\"')}"`).join("\n");
    case "json":
      return JSON.stringify(Object.fromEntries(vals.map((e) => [e.key, e.value])), null, 2);
  }
}

export function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export const ENV_META: Record<EnvName, { label: string; file: string; color: string; bg: string; dot: string }> = {
  development: { label: "Development", file: ".env.development", color: "text-sky-300", bg: "bg-sky-500/10 border-sky-500/30", dot: "bg-sky-400" },
  staging: { label: "Staging", file: ".env.staging", color: "text-amber-300", bg: "bg-amber-500/10 border-amber-500/30", dot: "bg-amber-400" },
  production: { label: "Production", file: ".env.production", color: "text-rose-300", bg: "bg-rose-500/10 border-rose-500/30", dot: "bg-rose-400" },
};
