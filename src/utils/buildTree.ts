import { DataFrame, Field } from '@grafana/data';
import { FieldMapping, ServiceRow, ServiceTreeNode, DEFAULT_OPTIONS } from '../types';
import { parseStatus } from './parseStatus';

function findField(frame: DataFrame, spec: string): Field | undefined {
  if (!spec) {
    return undefined;
  }
  const candidates = spec
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
  for (const name of candidates) {
    const lower = name.toLowerCase();
    const exact = frame.fields.find((f) => f.name === name || f.config?.displayName === name);
    if (exact) {
      return exact;
    }
    const ci = frame.fields.find(
      (f) => f.name?.toLowerCase() === lower || f.config?.displayName?.toLowerCase() === lower
    );
    if (ci) {
      return ci;
    }
  }
  return undefined;
}

function readNumber(field: Field | undefined, row: number, fallback: number): number {
  if (!field) {
    return fallback;
  }
  const v = field.values[row];
  if (v === null || v === undefined || v === '') {
    return fallback;
  }
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function readString(field: Field | undefined, row: number, fallback = ''): string {
  if (!field) {
    return fallback;
  }
  const v = field.values[row];
  if (v === null || v === undefined) {
    return fallback;
  }
  return String(v);
}

/**
 * Extracts rows from a Grafana DataFrame using the configured field mapping.
 * Missing required fields (id, name) produce no row for that index.
 */
export function extractRows(
  frame: DataFrame | null | undefined,
  mapping: FieldMapping,
  defaultSlaTarget = DEFAULT_OPTIONS.defaultSlaTarget
): ServiceRow[] {
  if (!frame || frame.length === 0) {
    return [];
  }

  const idField = findField(frame, mapping.id);
  const parentField = findField(frame, mapping.parentId);
  const nameField = findField(frame, mapping.name);
  const statusField = findField(frame, mapping.status);
  const slaField = findField(frame, mapping.sla);
  const slaTargetField = findField(frame, mapping.slaTarget);
  const weightField = findField(frame, mapping.weight);

  const rows: ServiceRow[] = [];

  for (let i = 0; i < frame.length; i++) {
    const id = readString(idField, i).trim();
    const name = readString(nameField, i).trim() || id;
    if (!id) {
      continue;
    }

    const parentRaw = readString(parentField, i).trim();
    const parentId = parentRaw === '' || parentRaw === id ? null : parentRaw;

    rows.push({
      id,
      parentId,
      name,
      status: parseStatus(statusField?.values[i]),
      sla: readNumber(slaField, i, NaN),
      slaTarget: readNumber(slaTargetField, i, defaultSlaTarget),
      weight: readNumber(weightField, i, 1),
    });
  }

  return rows;
}

/**
 * Builds a forest of ServiceTreeNode from a flat row list. Handles:
 *  - orphans (parentId pointing nowhere) → promoted to root
 *  - cycles → broken on first detection (becomes root)
 *  - duplicate ids → first occurrence wins, others are dropped
 */
export function buildTree(rows: ServiceRow[]): ServiceTreeNode[] {
  const byId = new Map<string, ServiceTreeNode>();

  for (const row of rows) {
    if (byId.has(row.id)) {
      continue;
    }
    byId.set(row.id, {
      ...row,
      children: [],
      rolledUpSla: Number.isFinite(row.sla) ? row.sla : 100,
      rolledUpStatus: row.status,
      depth: 0,
    });
  }

  const roots: ServiceTreeNode[] = [];

  byId.forEach((node) => {
    if (node.parentId && byId.has(node.parentId) && !hasCycle(byId, node.id, node.parentId)) {
      const parent = byId.get(node.parentId)!;
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  });

  for (const root of roots) {
    assignDepth(root, 0);
    sortChildren(root);
  }

  return roots;
}

function hasCycle(byId: Map<string, ServiceTreeNode>, startId: string, parentId: string): boolean {
  let cursor: string | null = parentId;
  const seen = new Set<string>();
  while (cursor) {
    if (cursor === startId) {
      return true;
    }
    if (seen.has(cursor)) {
      return true;
    }
    seen.add(cursor);
    cursor = byId.get(cursor)?.parentId ?? null;
  }
  return false;
}

function assignDepth(node: ServiceTreeNode, depth: number): void {
  node.depth = depth;
  for (const child of node.children) {
    assignDepth(child, depth + 1);
  }
}

function sortChildren(node: ServiceTreeNode): void {
  node.children.sort((a, b) => a.name.localeCompare(b.name));
  for (const child of node.children) {
    sortChildren(child);
  }
}
