import type { Role } from "@prisma/client";

declare global {
  namespace Express {
    interface Request {
      /** Set by requireAuth / optionalAuth (src/auth/middleware.ts). */
      auth?: { address: string /* lowercase */; role: Role; jti: string; exp: number };
    }
  }
}
export {};
