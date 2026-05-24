import { ServiceTreeNode } from '../../src/types';
import { collectAllIds, flattenTree } from '../../src/utils/flattenTree';

function n(partial: Partial<ServiceTreeNode> & { id: string }): ServiceTreeNode {
  return {
    id: partial.id,
    parentId: partial.parentId ?? null,
    name: partial.name ?? partial.id,
    status: partial.status ?? 'ok',
    sla: partial.sla ?? 100,
    slaTarget: partial.slaTarget ?? 99.9,
    weight: partial.weight ?? 1,
    children: partial.children ?? [],
    rolledUpSla: partial.rolledUpSla ?? partial.sla ?? 100,
    rolledUpStatus: partial.rolledUpStatus ?? partial.status ?? 'ok',
    depth: partial.depth ?? 0,
  };
}

const tree: ServiceTreeNode[] = [
  n({
    id: 'platform',
    name: 'Platform',
    rolledUpStatus: 'critical',
    rolledUpSla: 94,
    children: [
      n({ id: 'api', name: 'API Gateway', rolledUpStatus: 'warning', rolledUpSla: 99.5 }),
      n({
        id: 'checkout',
        name: 'Checkout',
        rolledUpStatus: 'critical',
        rolledUpSla: 94,
        children: [
          n({ id: 'db', name: 'Payments DB', rolledUpStatus: 'critical', rolledUpSla: 94 }),
          n({ id: 'cache', name: 'Cache', rolledUpStatus: 'ok', rolledUpSla: 100 }),
        ],
      }),
      n({ id: 'cdn', name: 'CDN', rolledUpStatus: 'ok', rolledUpSla: 99.99 }),
    ],
  }),
];

const DEFAULT_OPTS = {
  expandedIds: new Set<string>(['platform', 'checkout']),
  search: '',
  statusFilter: 'all' as const,
  sortMode: 'tree' as const,
  forceExpandOnMatch: true,
};

describe('flattenTree', () => {
  it('renders only expanded levels (tree order)', () => {
    const flat = flattenTree(tree, { ...DEFAULT_OPTS, expandedIds: new Set(['platform']) });
    expect(flat.map((r) => r.node.id)).toEqual(['platform', 'api', 'checkout', 'cdn']);
  });

  it('expands children when their parent is in expandedIds', () => {
    const flat = flattenTree(tree, DEFAULT_OPTS);
    expect(flat.map((r) => r.node.id)).toEqual(['platform', 'api', 'checkout', 'db', 'cache', 'cdn']);
  });

  it('hides nodes that do not match the search but keeps ancestors of matches', () => {
    const flat = flattenTree(tree, { ...DEFAULT_OPTS, search: 'cache' });
    expect(flat.map((r) => r.node.id)).toEqual(['platform', 'checkout', 'cache']);
  });

  it('respects status filter, keeping ancestors of matching descendants', () => {
    const flat = flattenTree(tree, { ...DEFAULT_OPTS, statusFilter: 'critical' });
    expect(flat.map((r) => r.node.id)).toEqual(['platform', 'checkout', 'db']);
  });

  it('returns [] when nothing matches', () => {
    const flat = flattenTree(tree, { ...DEFAULT_OPTS, search: 'nonexistent' });
    expect(flat).toEqual([]);
  });

  it('sorts by priority (worst status / lowest SLA first) at every level', () => {
    const flat = flattenTree(tree, { ...DEFAULT_OPTS, sortMode: 'priority' });
    // direct children of platform in priority order: checkout (critical, 94), api (warn, 99.5), cdn (ok, 99.99)
    expect(flat.map((r) => r.node.id)).toEqual(['platform', 'checkout', 'db', 'cache', 'api', 'cdn']);
  });

  it('assigns increasing depth to descendants', () => {
    const flat = flattenTree(tree, DEFAULT_OPTS);
    const byId = Object.fromEntries(flat.map((r) => [r.node.id, r.depth]));
    expect(byId.platform).toBe(0);
    expect(byId.checkout).toBe(1);
    expect(byId.db).toBe(2);
  });

  it('forceExpandOnMatch opens ancestors of search hits even when collapsed', () => {
    const flat = flattenTree(tree, { ...DEFAULT_OPTS, expandedIds: new Set(), search: 'cache' });
    expect(flat.map((r) => r.node.id)).toEqual(['platform', 'checkout', 'cache']);
  });
});

describe('collectAllIds', () => {
  it('returns every node id in the forest', () => {
    expect(collectAllIds(tree).sort()).toEqual(['api', 'cache', 'cdn', 'checkout', 'db', 'platform']);
  });
});
