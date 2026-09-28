interface MetricCounter {
  [key: string]: number;
}

class MetricsCollector {
  private counters: MetricCounter = {
    http_requests_total: 0,
    http_errors_total: 0,
    events_indexed_total: 0,
    bids_placed_total: 0,
    circles_created_total: 0,
  };

  private latencies: number[] = [];

  increment(metric: keyof typeof this.counters, amount = 1) {
    if (this.counters[metric] !== undefined) {
      this.counters[metric] += amount;
    }
  }

  recordLatency(ms: number) {
    this.latencies.push(ms);
    if (this.latencies.length > 500) {
      this.latencies.shift();
    }
  }

  getSnapshot() {
    const avgLatency =
      this.latencies.length > 0
        ? this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length
        : 0;

    return {
      counters: { ...this.counters },
      avgLatencyMs: Math.round(avgLatency * 100) / 100,
      samples: this.latencies.length,
      uptimeSeconds: Math.floor(process.uptime()),
    };
  }
}

export const metrics = new MetricsCollector();
