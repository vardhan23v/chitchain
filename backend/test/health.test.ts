import { expect } from 'chai';
import { metrics } from '../src/utils/metrics';

describe('Backend Metrics & Health Tests', () => {
  it('should initialize counters at zero and record increments', () => {
    metrics.increment('http_requests_total');
    const snapshot = metrics.getSnapshot();
    expect(snapshot.counters.http_requests_total).to.be.greaterThan(0);
  });

  it('should calculate rolling average latency correctly', () => {
    metrics.recordLatency(100);
    metrics.recordLatency(200);
    const snapshot = metrics.getSnapshot();
    expect(snapshot.avgLatencyMs).to.equal(150);
  });
});
