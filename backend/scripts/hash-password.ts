import { hashPassword } from "../src/auth/password";
import * as readline from "node:readline";

/**
 * Prints an scrypt hash for ADMIN_LOGIN_PASSWORD_HASH.
 * Usage: npm run hash-password            (prompts, input hidden)
 *        npm run hash-password -- 'pw'    (argument)
 * The password itself is never printed.
 */
const MIN = 12;

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const out = process.stdout as NodeJS.WriteStream & { muted?: boolean };
    const origWrite = out.write.bind(out);
    rl.question(question, (answer) => { out.write = origWrite; out.write("\n"); rl.close(); resolve(answer); });
    // hide typed characters
    out.write = ((chunk: string | Uint8Array, ...rest: unknown[]) => {
      if (typeof chunk === "string" && chunk !== question && !chunk.includes("\n")) return true;
      return (origWrite as (...a: unknown[]) => boolean)(chunk, ...rest);
    }) as typeof out.write;
  });
}

async function main() {
  let pw = process.argv[2] ?? "";
  if (!pw) {
    pw = await prompt("Admin password (hidden, min 12 chars): ");
    const again = await prompt("Type it again: ");
    if (pw !== again) { console.error("Passwords do not match."); process.exit(1); }
  }
  if (pw.length < MIN) { console.error(`Password must be at least ${MIN} characters.`); process.exit(1); }
  if (/YOUR-PASSWORD/i.test(pw)) { console.error("That is the placeholder, not a real password."); process.exit(1); }
  console.log("\nADMIN_LOGIN_PASSWORD_HASH=" + hashPassword(pw));
}
main().catch((e) => { console.error(e); process.exit(1); });
