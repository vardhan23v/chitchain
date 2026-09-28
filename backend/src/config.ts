import { z } from "zod";
import * as dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";
import { randomBytes } from "node:crypto";

/**
 * Env loading order: ENV_FILE (explicit path) → ../.env (repo root) → backend/.env.
 * Values already present in process.env always win (dotenv never overrides).
 */
const backendDir = path.resolve(__dirname, "..");
const candidates = [
  process.env.ENV_FILE ? path.resolve(process.cwd(), process.env.ENV_FILE) : null,
  path.resolve(backendDir, "../.env"),
  path.resolve(backendDir, ".env"),
].filter((p): p is string => !!p);
for (const p of candidates) {
  if (fs.existsSync(p)) {
    dotenv.config({ path: p });
    console.log(`[config] loaded env from ${p}`);
    break;
  }
}

const privateKey = z
  .string()
  .trim()
  .regex(/^(0x)?[0-9a-fA-F]{64}$/, "must be a 32-byte hex private key")
  .transform((k) => (k.startsWith("0x") ? k : `0x${k}`));
const optionalKey = z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), privateKey.optional());
const optionalAddress = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().trim().regex(/^0x[0-9a-fA-F]{40}$/, "must be a 20-byte hex address").optional(),
);
const intWithDefault = (def: number) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.coerce.number().int().nonnegative().default(def));

const schema = z.object({
  MST_RPC_URL: z.string().url().default("https://testnetrpc.mstblockchain.com"),
  MST_CHAIN_ID: intWithDefault(91562037),
  DEPLOYER_PRIVATE_KEY: optionalKey,
  KEEPER_PRIVATE_KEY: optionalKey,
  RISK_ORACLE_PRIVATE_KEY: optionalKey,
  // custodial demo wallet keys (A–E); demo only, disclosed in the UI
  AGENT_WALLET_KEYS: z
    .string()
    .default("")
    .transform((s) => s.split(",").map((k) => k.trim()).filter(Boolean))
    .pipe(z.array(privateKey).max(5, "at most 5 demo wallets (A–E)")),
  TREASURY_ADDRESS: optionalAddress,
  CHITCHAIN_ADDRESS: optionalAddress,
  START_BLOCK: intWithDefault(0),
  EXPLORER: z.string().url().default("https://testnet.mstscan.com"),

  LLM_API_KEY: z.string().default(""),
  LLM_BASE_URL: z.string().default("https://generativelanguage.googleapis.com/v1beta/openai"),
  LLM_MODEL: z.string().default("gemini-2.0-flash"),

  PORT: intWithDefault(4000),
  FRONTEND_ORIGIN: z.string().default("http://localhost:3000"),
  // PostgreSQL connection string, e.g. postgres://user:pass@host:5432/dbname (append ?sslmode=require for TLS hosts)
  DATABASE_URL: z.string().trim().min(1, "required — postgres://user:pass@host:5432/dbname"),

  // ── auth (v3) ──
  SESSION_SECRET: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().min(32, "at least 32 characters").optional()),
  PLATFORM_ADMIN_ADDRESSES: z
    .string()
    .default("")
    .transform((s) => s.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean))
    .pipe(z.array(z.string().regex(/^0x[0-9a-f]{40}$/, "must be a 20-byte hex address"))),
  AUTH_DOMAIN: z.string().trim().default(""),
  SESSION_TTL_SEC: intWithDefault(86_400),
  NONCE_TTL_SEC: intWithDefault(300),
  // platform-admin password fallback (enabled only when BOTH are set); hash from `npm run hash-password -- '<pw>'`
  ADMIN_LOGIN_USER: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().min(3).max(40).regex(/^[a-z0-9._-]+$/, "lowercase letters, digits, . _ - only").optional()),
  ADMIN_LOGIN_PASSWORD_HASH: z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), z.string().trim().regex(/^scrypt\$[0-9a-f]{16,64}\$[0-9a-f]{128}$/, "must be scrypt$<saltHex>$<hashHex> (npm run hash-password)").optional()),
  NODE_ENV: z.string().default(""),
  RAILWAY_ENVIRONMENT: z.string().default(""),
});

export type Config = Omit<z.infer<typeof schema>, "SESSION_SECRET"> & { backendDir: string; SESSION_SECRET: string; sessionSecretEphemeral: boolean; adminPasswordLogin: boolean };

function load(): Config {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    console.error(`[config] invalid environment:\n${lines.join("\n")}`);
    process.exit(1);
  }
  const cfg = parsed.data;
  if (!cfg.CHITCHAIN_ADDRESS) console.warn("[config] CHITCHAIN_ADDRESS is empty — indexer/keeper/agent idle until set");
  if (cfg.AGENT_WALLET_KEYS.length === 0) console.warn("[config] AGENT_WALLET_KEYS empty — demo wallets/agent unavailable");
  const production = cfg.NODE_ENV === "production" || cfg.RAILWAY_ENVIRONMENT !== "";
  let sessionSecret = cfg.SESSION_SECRET;
  let sessionSecretEphemeral = false;
  if (!sessionSecret) {
    if (production) {
      console.error("[config] SESSION_SECRET is required in production (>= 32 chars, e.g. `openssl rand -hex 32`)");
      process.exit(1);
    }
    sessionSecret = randomBytes(32).toString("hex");
    sessionSecretEphemeral = true;
    console.warn("[config] SESSION_SECRET empty — using a random per-boot secret (sessions will not survive a restart)");
  }
  const adminPasswordLogin = !!cfg.ADMIN_LOGIN_USER && !!cfg.ADMIN_LOGIN_PASSWORD_HASH;
  if (cfg.PLATFORM_ADMIN_ADDRESSES.length === 0 && !adminPasswordLogin) console.warn("[config] PLATFORM_ADMIN_ADDRESSES empty — nobody will be ADMIN");
  if ((!!cfg.ADMIN_LOGIN_USER) !== (!!cfg.ADMIN_LOGIN_PASSWORD_HASH)) console.warn("[config] ADMIN_LOGIN_USER and ADMIN_LOGIN_PASSWORD_HASH must both be set — admin password login disabled");
  if (adminPasswordLogin) console.log(`[config] admin password login enabled for "${cfg.ADMIN_LOGIN_USER}"`);
  if (!cfg.AUTH_DOMAIN) {
    try { cfg.AUTH_DOMAIN = new URL(cfg.FRONTEND_ORIGIN).host; } catch { cfg.AUTH_DOMAIN = cfg.FRONTEND_ORIGIN; }
  }
  return { ...cfg, backendDir, SESSION_SECRET: sessionSecret, sessionSecretEphemeral, adminPasswordLogin };
}

export const config: Config = load();
