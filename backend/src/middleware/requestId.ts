import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingId = req.headers['x-request-id'] as string;
  const requestId = incomingId || randomUUID();

  req.headers['x-request-id'] = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
}
