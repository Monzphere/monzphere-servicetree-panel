import { RollupMode, ServiceStatus, ServiceTreeNode, STATUS_ORDER } from '../types';

/**
 * Walks the tree bottom-up and fills in rolledUpSla / rolledUpStatus on
 * every node. The original sla / status are preserved on leaves.
 *
 * Aggregation rules:
 *  - worst:     SLA = min(children.rolledUpSla, own.sla); status = worst child status
 *  - weighted:  SLA = Σ(child.rolledUpSla * child.weight) / Σ weight; status = worst
 *  - min:       SLA = min(all leaves under node); status = worst
 *
 * A leaf with no own sla (NaN) falls back to 100 so it doesn't drag the
 * roll-up down — callers can render it as "n/a" if they want.
 */
export function rollupTree(roots: ServiceTreeNode[], mode: RollupMode = 'worst'): void {
  for (const root of roots) {
    rollupNode(root, mode);
  }
}

function rollupNode(node: ServiceTreeNode, mode: RollupMode): { sla: number; status: ServiceStatus } {
  const ownSla = Number.isFinite(node.sla) ? node.sla : 100;

  if (node.children.length === 0) {
    node.rolledUpSla = ownSla;
    node.rolledUpStatus = node.status;
    return { sla: ownSla, status: node.status };
  }

  const childResults = node.children.map((child) => rollupNode(child, mode));

  const worstStatus = childResults
    .map((r) => r.status)
    .concat(node.status)
    .reduce<ServiceStatus>(
      (acc, current) => (STATUS_ORDER[current] > STATUS_ORDER[acc] ? current : acc),
      'unknown'
    );

  let sla: number;
  switch (mode) {
    case 'weighted': {
      const totalWeight = node.children.reduce((sum, c) => sum + (c.weight > 0 ? c.weight : 1), 0);
      if (totalWeight === 0) {
        sla = ownSla;
      } else {
        const weighted = node.children.reduce(
          (sum, c, idx) => sum + childResults[idx].sla * (c.weight > 0 ? c.weight : 1),
          0
        );
        sla = weighted / totalWeight;
      }
      break;
    }
    case 'min':
      sla = childResults.reduce((min, r) => Math.min(min, r.sla), ownSla);
      break;
    case 'worst':
    default:
      sla = Math.min(ownSla, ...childResults.map((r) => r.sla));
      break;
  }

  node.rolledUpSla = round(sla, 3);
  node.rolledUpStatus = worstStatus;
  return { sla: node.rolledUpSla, status: worstStatus };
}

function round(n: number, decimals: number): number {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

/**
 * Returns a tier label for an SLA value relative to its target.
 *  - 'meeting'  → sla >= target
 *  - 'at-risk'  → warn% of target ≤ sla < target
 *  - 'breached' → sla < warn% of target
 */
export function slaTier(
  sla: number,
  target: number,
  warnThresholdPct: number
): 'meeting' | 'at-risk' | 'breached' {
  if (!Number.isFinite(sla) || !Number.isFinite(target) || target <= 0) {
    return 'meeting';
  }
  if (sla >= target) {
    return 'meeting';
  }
  const warnFloor = target * (warnThresholdPct / 100);
  if (sla >= warnFloor) {
    return 'at-risk';
  }
  return 'breached';
}
