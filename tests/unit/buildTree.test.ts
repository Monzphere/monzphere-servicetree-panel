import { DataFrame, FieldType, MutableDataFrame } from '@grafana/data';
import { buildTree, extractRows } from '../../src/utils/buildTree';
import { DEFAULT_FIELDS, ServiceRow } from '../../src/types';

function makeFrame(rows: Array<Record<string, unknown>>): DataFrame {
  const frame = new MutableDataFrame({
    fields: [
      { name: 'id', type: FieldType.string, values: [] },
      { name: 'parentId', type: FieldType.string, values: [] },
      { name: 'name', type: FieldType.string, values: [] },
      { name: 'status', type: FieldType.string, values: [] },
      { name: 'sla', type: FieldType.number, values: [] },
      { name: 'slaTarget', type: FieldType.number, values: [] },
      { name: 'weight', type: FieldType.number, values: [] },
    ],
  });
  for (const r of rows) {
    frame.add(r);
  }
  return frame;
}

function row(partial: Partial<ServiceRow>): ServiceRow {
  return {
    id: 'x',
    parentId: null,
    name: 'x',
    status: 'ok',
    sla: 100,
    slaTarget: 99.9,
    weight: 1,
    ...partial,
  };
}

describe('extractRows', () => {
  it('returns [] for null frame', () => {
    expect(extractRows(null, DEFAULT_FIELDS)).toEqual([]);
  });

  it('returns [] for empty frame', () => {
    const frame = makeFrame([]);
    expect(extractRows(frame, DEFAULT_FIELDS)).toEqual([]);
  });

  it('skips rows with missing id', () => {
    const frame = makeFrame([
      { id: '', parentId: '', name: 'no-id', status: 'ok', sla: 99, slaTarget: 99.9, weight: 1 },
      { id: 'a', parentId: '', name: 'ok', status: 'ok', sla: 99.5, slaTarget: 99.9, weight: 1 },
    ]);
    const rows = extractRows(frame, DEFAULT_FIELDS);
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe('a');
  });

  it('uses id as name fallback when name is empty', () => {
    const frame = makeFrame([{ id: 'svc', parentId: '', name: '', status: 'ok', sla: 99, slaTarget: 99.9, weight: 1 }]);
    expect(extractRows(frame, DEFAULT_FIELDS)[0].name).toBe('svc');
  });

  it('treats parentId equal to own id as null (self-reference)', () => {
    const frame = makeFrame([{ id: 'svc', parentId: 'svc', name: 'svc', status: 'ok', sla: 99, slaTarget: 99.9, weight: 1 }]);
    expect(extractRows(frame, DEFAULT_FIELDS)[0].parentId).toBeNull();
  });

  it('falls back to default sla target when column is missing or empty', () => {
    const frame = makeFrame([{ id: 'a', parentId: '', name: 'a', status: 'ok', sla: 99, slaTarget: '', weight: 1 }]);
    const rows = extractRows(frame, DEFAULT_FIELDS, 97.5);
    expect(rows[0].slaTarget).toBe(97.5);
  });

  it('resolves pipe-separated aliases (Zabbix-style column names)', () => {
    const frame = new MutableDataFrame({
      fields: [
        { name: 'serviceid', type: FieldType.string, values: ['s1'] },
        { name: 'parentid', type: FieldType.string, values: [''] },
        { name: 'name', type: FieldType.string, values: ['payments'] },
        { name: 'status', type: FieldType.number, values: [3] },
        { name: 'sli', type: FieldType.number, values: [99.42] },
        { name: 'goodsla', type: FieldType.number, values: [99.9] },
      ],
    });
    const rows = extractRows(frame, DEFAULT_FIELDS);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: 's1',
      parentId: null,
      name: 'payments',
      status: 'critical',
      sla: 99.42,
      slaTarget: 99.9,
    });
  });

  it('is case-insensitive when matching field names', () => {
    const frame = new MutableDataFrame({
      fields: [
        { name: 'ID', type: FieldType.string, values: ['s1'] },
        { name: 'NAME', type: FieldType.string, values: ['svc'] },
      ],
    });
    const rows = extractRows(frame, DEFAULT_FIELDS);
    expect(rows[0].id).toBe('s1');
    expect(rows[0].name).toBe('svc');
  });
});

describe('buildTree', () => {
  it('returns [] for empty input', () => {
    expect(buildTree([])).toEqual([]);
  });

  it('builds a simple two-level tree', () => {
    const tree = buildTree([
      row({ id: 'root', parentId: null, name: 'root' }),
      row({ id: 'child1', parentId: 'root', name: 'child1' }),
      row({ id: 'child2', parentId: 'root', name: 'child2' }),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].id).toBe('root');
    expect(tree[0].children.map((c) => c.id)).toEqual(['child1', 'child2']);
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children[0].depth).toBe(1);
  });

  it('promotes orphans (unknown parentId) to roots', () => {
    const tree = buildTree([
      row({ id: 'a', parentId: 'ghost', name: 'a' }),
      row({ id: 'b', parentId: null, name: 'b' }),
    ]);
    expect(tree.map((n) => n.id).sort()).toEqual(['a', 'b']);
  });

  it('breaks cycles by promoting the cycling node to root', () => {
    const tree = buildTree([
      row({ id: 'a', parentId: 'b', name: 'a' }),
      row({ id: 'b', parentId: 'a', name: 'b' }),
    ]);
    expect(tree.length).toBeGreaterThanOrEqual(1);
    const ids = collectIds(tree);
    expect(ids).toContain('a');
    expect(ids).toContain('b');
  });

  it('drops duplicate ids, keeping the first occurrence', () => {
    const tree = buildTree([
      row({ id: 'a', parentId: null, name: 'first' }),
      row({ id: 'a', parentId: null, name: 'duplicate' }),
    ]);
    expect(tree).toHaveLength(1);
    expect(tree[0].name).toBe('first');
  });

  it('sorts children alphabetically', () => {
    const tree = buildTree([
      row({ id: 'root', parentId: null, name: 'root' }),
      row({ id: 'c-svc', parentId: 'root', name: 'c-svc' }),
      row({ id: 'a-svc', parentId: 'root', name: 'a-svc' }),
      row({ id: 'b-svc', parentId: 'root', name: 'b-svc' }),
    ]);
    expect(tree[0].children.map((c) => c.id)).toEqual(['a-svc', 'b-svc', 'c-svc']);
  });

  it('assigns correct depth on deeply nested trees', () => {
    const tree = buildTree([
      row({ id: 'l0', parentId: null }),
      row({ id: 'l1', parentId: 'l0' }),
      row({ id: 'l2', parentId: 'l1' }),
      row({ id: 'l3', parentId: 'l2' }),
    ]);
    expect(tree[0].depth).toBe(0);
    expect(tree[0].children[0].depth).toBe(1);
    expect(tree[0].children[0].children[0].depth).toBe(2);
    expect(tree[0].children[0].children[0].children[0].depth).toBe(3);
  });
});

function collectIds(nodes: Array<{ id: string; children: any[] }>): string[] {
  const out: string[] = [];
  for (const n of nodes) {
    out.push(n.id);
    out.push(...collectIds(n.children));
  }
  return out;
}
