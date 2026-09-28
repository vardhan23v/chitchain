export interface SyncStatus {
  lastSyncedBlock: number;
  targetBlock: number;
  blocksBehind: number;
  isSynced: boolean;
  syncTimestamp: number;
}

class IndexerStatsTracker {
  private status: SyncStatus = {
    lastSyncedBlock: 0,
    targetBlock: 0,
    blocksBehind: 0,
    isSynced: false,
    syncTimestamp: Date.now(),
  };

  updateStatus(lastSynced: number, target: number) {
    this.status = {
      lastSyncedBlock: lastSynced,
      targetBlock: target,
      blocksBehind: Math.max(target - lastSynced, 0),
      isSynced: target - lastSynced <= 1,
      syncTimestamp: Date.now(),
    };
  }

  getStatus(): SyncStatus {
    return { ...this.status };
  }
}

export const indexerStats = new IndexerStatsTracker();
