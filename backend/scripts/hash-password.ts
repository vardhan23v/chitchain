/**
 * Prints an ADMIN_LOGIN_PASSWORD_HASH value for the platform-admin password fallback.
 *   npm run hash-password -- '<password>'
 * The password itself is never printed or logged. Put the output in .env as ADMIN_LOGIN_PASSWORD_HASH=...
 */
import { hashPassword } from "../src/auth/password";

const password = process.argv[2];
if (!password || password.length < 12) {
  console.error("usage: npm run hash-password -- '<password>'  (at least 12 characters)");
  process.exit(1);
}
process.stdout.write(`${hashPassword(password)}\n`);
