import { rollupTree, slaTier } from '../../src/utils/calculateSLA';
import { ServiceTreeNode } from '../../src/types';

function node(partial: Partial<ServiceTreeNode> & { id: string }): ServiceTreeNode {
  return {
    id: partial.id,
    parentId: partial.parentId ?? null,
    name: partial.name ?? partial.id,
    status: partial.status ?? 'ok',
    sla: partial.sla ?? 100,
    slaTarget: partial.slaTarget ?? 99.9,
    weight: partial.weight ?? 1,
    children: partial.children ?? [],
    rolledUpSla: 0,
    rolledUpStatus: 'unknown',
    depth: partial.depth ?? 0,
  };
}

describe('rollupTree — worst mode', () => {
  it('uses leaf values directly for leaves', () => {
    const tree = [node({ id: 'leaf', sla: 99.5, status: 'warning' })];
    rollupTree(tree, 'worst');
    expect(tree[0].rolledUpSla).toBe(99.5);
    expect(tree[0].rolledUpStatus).toBe('warning');
  });

  it('rolls up the worst child SLA', () => {
    const tree = [
      node({
        id: 'root',
        status: 'ok',
        sla: 100,
        children: [
          node({ id: 'a', sla: 99.9, status: 'ok' }),
          node({ id: 'b', sla: 95.0, status: 'critical' }),
          node({ id: 'c', sla: 99.99, status: 'ok' }),
        ],
      }),
    ];
    rollupTree(tree, 'worst');
    expect(tree[0].rolledUpSla).toBe(95);
    expect(tree[0].rolledUpStatus).toBe('critical');
  });

  it('propagates through three levels', () => {
    const tree = [
      node({
        id: 'root',
        sla: 100,
        children: [
          node({
            id: 'mid',
            sla: 100,
            children: [node({ id: 'leaf', sla: 80, status: 'critical' })],
          }),
        ],
      }),
    ];
    rollupTree(tree, 'worst');
    expect(tree[0].rolledUpSla).toBe(80);
    expect(tree[0].rolledUpStatus).toBe('critical');
  });
});

describe('rollupTree — weighted mode', () => {
  it('computes weighted average from direct children only', () => {
    const tree = [
      node({
        id: 'root',
        sla: 100,
        children: [
          node({ id: 'a', sla: 100, weight: 3 }),
          node({ id: 'b', sla: 80, weight: 1 }),
        ],
      }),
    ];
    rollupTree(tree, 'weighted');
    expect(tree[0].rolledUpSla).toBe(95);
  });

  it('treats zero or negative weights as 1', () => {
    const tree = [
      node({
        id: 'root',
        sla: 100,
        children: [
          node({ id: 'a', sla: 100, weight: 0 }),
          node({ id: 'b', sla: 80, weight: 0 }),
        ],
      }),
    ];
    rollupTree(tree, 'weighted');
    expect(tree[0].rolledUpSla).toBe(90);
  });
});

describe('rollupTree — min mode', () => {
  it('takes the minimum across all leaves', () => {
    const tree = [
      node({
        id: 'root',
        sla: 100,
        children: [
          node({ id: 'a', sla: 99.99, children: [node({ id: 'a-leaf', sla: 70 })] }),
          node({ id: 'b', sla: 90 }),
        ],
      }),
    ];
    rollupTree(tree, 'min');
    expect(tree[0].rolledUpSla).toBe(70);
  });
});

describe('rollupTree — handles missing SLA', () => {
  it('treats NaN SLA as 100 to avoid penalising the tree', () => {
    const tree = [node({ id: 'root', sla: NaN, children: [node({ id: 'a', sla: 99 })] })];
    rollupTree(tree, 'worst');
    expect(tree[0].rolledUpSla).toBe(99);
  });
});

describe('slaTier', () => {
  it('returns meeting when sla >= target', () => {
    expect(slaTier(99.95, 99.9, 95)).toBe('meeting');
    expect(slaTier(99.9, 99.9, 95)).toBe('meeting');
  });

  it('returns at-risk when sla is below target but above warn floor', () => {
    expect(slaTier(99.5, 99.9, 95)).toBe('at-risk');
  });

  it('returns breached when sla is below warn floor', () => {
    // warn floor = 99.9 * 0.95 = 94.905
    expect(slaTier(50, 99.9, 95)).toBe('breached');
  });

  it('returns meeting for invalid inputs (defensive)', () => {
    expect(slaTier(NaN, 99.9, 95)).toBe('meeting');
    expect(slaTier(99, 0, 95)).toBe('meeting');
  });
});
