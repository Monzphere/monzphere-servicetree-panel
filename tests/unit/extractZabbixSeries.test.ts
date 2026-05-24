import { FieldType, MutableDataFrame } from '@grafana/data';
import {
  extractZabbixSeriesRows,
  isZabbixSeriesFrame,
} from '../../src/utils/extractZabbixSeries';

function frame(fields: Array<{ name: string; type: FieldType; values: unknown[] }>) {
  return new MutableDataFrame({ fields });
}

const OPTS = { defaultSlaTarget: 99.9, nameSeparator: '', warnThresholdPct: 95 };

describe('isZabbixSeriesFrame', () => {
  it('detects time + N numeric value columns without explicit id', () => {
    const f = frame([
      { name: 'Time', type: FieldType.time, values: [1, 2, 3] },
      { name: 'OLT QUATIS - PON 0/2/3: SLA', type: FieldType.number, values: [99.8, 99.7, 99.6] },
      { name: 'OLT QUATIS - PON 0/2/4: SLA', type: FieldType.number, values: [90.1, 91.0, 89.4] },
    ]);
    expect(isZabbixSeriesFrame(f)).toBe(true);
  });

  it('rejects frames with an explicit id column', () => {
    const f = frame([
      { name: 'Time', type: FieldType.time, values: [1] },
      { name: 'id', type: FieldType.string, values: ['a'] },
      { name: 'sla', type: FieldType.number, values: [99] },
    ]);
    expect(isZabbixSeriesFrame(f)).toBe(false);
  });
});

describe('extractZabbixSeriesRows', () => {
  it('converts each numeric column into a service row using its last value', () => {
    const f = frame([
      { name: 'Time', type: FieldType.time, values: [1, 2, 3] },
      { name: 'OLT QUATIS - PON 0/2/3: SLA', type: FieldType.number, values: [99.99, 99.98, 99.97] },
      { name: 'OLT PENEDO - PON 0/0/8: SLA', type: FieldType.number, values: [95.0, 94.5, 90.0] },
    ]);
    const rows = extractZabbixSeriesRows(f, OPTS);
    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ id: 'OLT QUATIS - PON 0/2/3: SLA', sla: 99.97, status: 'ok' });
    expect(rows[1]).toMatchObject({ id: 'OLT PENEDO - PON 0/0/8: SLA', sla: 90.0, status: 'critical' });
  });

  it('derives "warning" when sla is below target but above the warn floor', () => {
    const f = frame([
      { name: 'Time', type: FieldType.time, values: [1] },
      { name: 'svc', type: FieldType.number, values: [99.5] },
    ]);
    const [row] = extractZabbixSeriesRows(f, OPTS);
    expect(row.status).toBe('warning');
    expect(row.sla).toBe(99.5);
  });

  it('returns [] when frame is not Zabbix series shape', () => {
    const f = frame([
      { name: 'id', type: FieldType.string, values: ['x'] },
      { name: 'sla', type: FieldType.number, values: [99] },
    ]);
    expect(extractZabbixSeriesRows(f, OPTS)).toHaveLength(0);
  });

  it('ignores null/empty values and uses the last numeric value', () => {
    const f = frame([
      { name: 'Time', type: FieldType.time, values: [1, 2, 3, 4] },
      { name: 'svc', type: FieldType.number, values: [98, 97, null, undefined] },
    ]);
    const [row] = extractZabbixSeriesRows(f, OPTS);
    expect(row.sla).toBe(97);
  });

  it('groups by separator into a synthetic parent when nameSeparator is set', () => {
    const f = frame([
      { name: 'Time', type: FieldType.time, values: [1] },
      { name: 'OLT QUATIS - PON 0/2/3', type: FieldType.number, values: [99.99] },
      { name: 'OLT QUATIS - PON 0/2/4', type: FieldType.number, values: [95] },
      { name: 'OLT PENEDO - PON 0/1/1', type: FieldType.number, values: [99.99] },
    ]);
    const rows = extractZabbixSeriesRows(f, { ...OPTS, nameSeparator: ' - ' });
    const ids = rows.map((r) => r.id);
    expect(ids).toContain('group:OLT QUATIS');
    expect(ids).toContain('group:OLT PENEDO');
    const child = rows.find((r) => r.id === 'OLT QUATIS - PON 0/2/3');
    expect(child?.parentId).toBe('group:OLT QUATIS');
    expect(child?.name).toBe('PON 0/2/3');
  });

  it('keeps the full label as name to preserve service identity', () => {
    const f = frame([
      { name: 'Time', type: FieldType.time, values: [1] },
      { name: 'OLT QUATIS - PON 0/2/3: SLA ISP - LOS', type: FieldType.number, values: [99.99] },
    ]);
    const [row] = extractZabbixSeriesRows(f, OPTS);
    expect(row.name).toBe('OLT QUATIS - PON 0/2/3: SLA ISP - LOS');
    expect(row.id).toBe('OLT QUATIS - PON 0/2/3: SLA ISP - LOS');
  });

  it('collapses "host: item" when host equals item', () => {
    const f = frame([
      { name: 'Time', type: FieldType.time, values: [1] },
      { name: 'Zabbix Server: Zabbix Server', type: FieldType.number, values: [99.99] },
    ]);
    const [row] = extractZabbixSeriesRows(f, OPTS);
    expect(row.name).toBe('Zabbix Server');
  });
});
