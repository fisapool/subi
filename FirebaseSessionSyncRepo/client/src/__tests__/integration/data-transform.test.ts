
import { describe, it, expect } from 'vitest';
import { transformBandwidthData, transformLatencyData } from '../../lib/transforms';

describe('Data Transformation Tests', () => {
  it('correctly transforms bandwidth data', () => {
    const testData = [
      { startTime: new Date('2024-03-18'), bandwidthUsed: 1000 },
      { startTime: new Date('2024-03-19'), bandwidthUsed: 2000 }
    ];

    const transformed = transformBandwidthData(testData);

    expect(transformed).toEqual([
      { x: '2024-03-18', y: 1000 },
      { x: '2024-03-19', y: 2000 }
    ]);
  });

  it('handles empty data sets', () => {
    const transformed = transformBandwidthData([]);
    expect(transformed).toEqual([]);
  });

  it('aggregates data by date range', () => {
    const testData = [
      { startTime: new Date('2024-03-18T10:00:00'), bandwidthUsed: 1000 },
      { startTime: new Date('2024-03-18T11:00:00'), bandwidthUsed: 1000 }
    ];

    const transformed = transformBandwidthData(testData, 'day');
    expect(transformed).toEqual([
      { x: '2024-03-18', y: 2000 }
    ]);
  });
});
