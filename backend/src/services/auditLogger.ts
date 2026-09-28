import { logger } from '../utils/logger';

export interface AuditRecord {
  circleId: number;
  actor: string;
  action: string;
  previousState?: string;
  newState: string;
  txHash?: string;
  timestamp: string;
}

class AuditLogger {
  private records: AuditRecord[] = [];

  record(event: Omit<AuditRecord, 'timestamp'>) {
    const entry: AuditRecord = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    this.records.push(entry);
    logger.info(`[Audit] Circle #${entry.circleId} -> ${entry.action}`, entry);
  }

  getAuditTrail(circleId: number): AuditRecord[] {
    return this.records.filter((r) => r.circleId === circleId);
  }
}

export const auditLogger = new AuditLogger();
