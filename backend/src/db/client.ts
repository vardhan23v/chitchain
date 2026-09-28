import { PrismaClient } from "@prisma/client";
import { config } from "../config";

/** Single PrismaClient for the process. Connection string comes from validated config (DATABASE_URL). */
export const prisma = new PrismaClient({
  datasourceUrl: config.DATABASE_URL,
  log: process.env.PRISMA_LOG === "1" ? ["query", "warn", "error"] : ["warn", "error"],
});
