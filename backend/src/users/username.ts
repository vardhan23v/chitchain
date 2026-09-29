/**
 * Username rules (pure, unit-tested). A username is a public display handle mapped to a wallet; the wallet address
 * remains the blockchain identity and is always shown next to it.
 *
 * - Normalization: trim, then lowercase. "Rahul", "RAHUL" and "rahul" are the same username.
 * - Allowed: 3–20 characters, a–z, 0–9 and underscore; must start with a letter; no "__"; must not end with "_".
 * - Reserved: platform and role words, and names starting with platform prefixes (demo, admin, mst, chitchain…),
 *   so nobody can pose as staff, the keeper, the treasury or the custodial demo wallets.
 * - Addresses: anything that looks like a hex address is rejected.
 * - Lookalikes: the key maps 0→o, 1→l, 3→e, 5→s, 7→t and drops underscores; two usernames with the same key conflict.
 */
export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const USERNAME_RULE = "3 to 20 characters: letters, numbers and single underscores, starting with a letter";

const RESERVED = new Set([
  "admin", "administrator", "root", "system", "support", "help", "helpdesk", "chitchain", "chit", "chits", "mst", "mstscan", "bridgekey",
  "keeper", "oracle", "treasury", "organizer", "organiser", "moderator", "mod", "official", "staff", "team", "security", "wallet",
  "contract", "null", "undefined", "anonymous", "everyone", "me", "you", "owner", "platform", "auditor", "bank", "payout", "claude", "anthropic",
]);
const RESERVED_PREFIXES = ["demo", "admin", "mst", "chitchain", "official", "support", "keeper", "oracle", "treasury", "system"];

const foldReserved = (x: string) => x.replace(/_/g, "").replace(/l/g, "i");
const RESERVED_FOLDED = new Set([...RESERVED].map(foldReserved));
const RESERVED_PREFIXES_FOLDED = RESERVED_PREFIXES.map(foldReserved);

export type UsernameError = "REQUIRED" | "TOO_SHORT" | "TOO_LONG" | "BAD_CHARS" | "MUST_START_WITH_LETTER" | "BAD_UNDERSCORE" | "LOOKS_LIKE_ADDRESS" | "RESERVED";
export const USERNAME_ERROR_COPY: Record<UsernameError | "TAKEN" | "TOO_SIMILAR", string> = {
  REQUIRED: "Choose a username.",
  TOO_SHORT: `Use at least ${USERNAME_MIN} characters.`,
  TOO_LONG: `Use at most ${USERNAME_MAX} characters.`,
  BAD_CHARS: "Use only letters, numbers and underscores.",
  MUST_START_WITH_LETTER: "Start with a letter.",
  BAD_UNDERSCORE: "Underscores cannot repeat or end the name.",
  LOOKS_LIKE_ADDRESS: "A username cannot look like a wallet address.",
  RESERVED: "This name is reserved.",
  TAKEN: "This username is taken.",
  TOO_SIMILAR: "This username is too similar to an existing one.",
};

export function normalizeUsername(raw: string): string { return raw.trim().toLowerCase(); }

export function usernameKey(normalized: string): string {
  return normalized.replace(/_/g, "").replace(/0/g, "o").replace(/1/g, "l").replace(/3/g, "e").replace(/5/g, "s").replace(/7/g, "t");
}

/** Validates a normalized username. Returns null when valid. */
export function validateUsername(u: string): UsernameError | null {
  if (u.length === 0) return "REQUIRED";
  if (/^0x[0-9a-f]*$/.test(u)) return "LOOKS_LIKE_ADDRESS";
  if (u.length < USERNAME_MIN) return "TOO_SHORT";
  if (u.length > USERNAME_MAX) return "TOO_LONG";
  if (!/^[a-z0-9_]+$/.test(u)) return "BAD_CHARS";
  if (!/^[a-z]/.test(u)) return "MUST_START_WITH_LETTER";
  if (u.includes("__") || u.endsWith("_")) return "BAD_UNDERSCORE";
  // compare lookalike-folded forms on both sides; "1" may stand in for "i" or "l", so fold l → i as well
  const fold = (x: string) => usernameKey(x).replace(/l/g, "i");
  const f = fold(u);
  if (RESERVED_FOLDED.has(f) || RESERVED_PREFIXES_FOLDED.some((p) => f.startsWith(p))) return "RESERVED";
  return null;
}
