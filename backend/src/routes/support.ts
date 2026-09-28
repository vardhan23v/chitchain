import { Router } from "express";
import { z } from "zod";
import { createTicket, ticketsFor } from "../db";
import { audit } from "../auth/audit";
import { requireAuth } from "../auth/middleware";
import { rateLimit } from "../auth/ratelimit";
import { ApiError, wrap } from "./util";

export const support = Router();

const ticketBody = z.object({ subject: z.string().trim().min(3).max(120), message: z.string().trim().min(3).max(4000) });
const createLimiter = rateLimit({ perMinute: 5, keys: (req) => [`support:${req.auth?.address ?? "anon"}`] });

/** POST /support { subject, message } → { ticket } (signed in; 5/min per wallet). */
support.post("/support", requireAuth(), createLimiter, wrap(async (req, res) => {
  const parsed = ticketBody.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, "body must be { subject (3-120), message (3-4000) }", "BAD_BODY");
  const ticket = await createTicket(req.auth!.address, parsed.data.subject, parsed.data.message);
  audit(req, "support.create", `ticket:${ticket.id}`, "ok", { meta: { subject: ticket.subject } });
  res.json({ ticket });
}));

/** GET /support/mine → { tickets } newest first. */
support.get("/support/mine", requireAuth(), wrap(async (req, res) => {
  res.json({ tickets: await ticketsFor(req.auth!.address) });
}));
