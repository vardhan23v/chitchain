import { expect } from 'chai';
import { hashIdentifier } from '../src/utils/crypto';
import { indexerStats } from '../src/services/indexerStats';

describe('Backend Services & Utility Tests', () => {
  it('should compute consistent keccak256 hashes', () => {
    const h1 = hashIdentifier('chitchain_circle_1');
    const h2 = hashIdentifier('chitchain_circle_1');
    expect(h1).to.equal(h2);
    expect(h1).to.match(/^0x[a-fA-F0-9]{64}$/);
  });

  it('should accurately calculate blocks behind status', () => {
    indexerStats.updateStatus(100, 105);
    const status = indexerStats.getStatus();
    expect(status.blocksBehind).to.equal(5);
    expect(status.isSynced).to.be.false;
  });
});
