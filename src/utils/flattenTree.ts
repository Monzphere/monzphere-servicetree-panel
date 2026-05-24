import { ServiceStatus, ServiceTreeNode, STATUS_ORDER } from '../types';

export type SortMode = 'tree' | 'priority';
export type StatusFilter = 'all' | 'attention' | 'critical' | 'warning' | 'ok' | 'unknown';

export interface FlatRow {
  node: ServiceTreeNode;
  depth: number;
  hasChildren: boolean;
  expanded: boolean;
  isLastSibling: boolean;
}

export interface FlattenOptions {
  expandedIds: Set<string>;
  search: string;
  statusFilter: StatusFilter;
  sortMode: SortMode;
  /** When true, ancestors of search matches are forced visible+expanded. */
  forceExpandOnMatch: boolean;
}

function statusPassesFilter(status: ServiceStatus, filter: StatusFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'attention':
      return status === 'critical' || status === 'warning';
    case 'critical':
    case 'warning':
    case 'ok':
    case 'unknown':
      return status === filter;
  }
}

function nodeMatchesSearch(node: ServiceTreeNode, lowerSearch: string): boolean {
  if (!lowerSearch) {
    return true;
  }
  return node.name.toLowerCase().includes(lowerSearch) || node.id.toLowerCase().includes(lowerSearch);
}

/**
 * Returns the set of node IDs that should be visible given the search and
 * status filter. A node is visible when:
 *  - it matches search AND its rolled-up status passes statusFilter, OR
 *  - any descendant of it is visible (so we can drill down to it), OR
 *  - search is empty AND statusFilter is all (everything visible).
 */
function computeVisibility(
  roots: ServiceTreeNode[],
  search: string,
  statusFilter: StatusFilter
): Set<string> {
  const lowerSearch = search.trim().toLowerCase();
  const noFilter = lowerSearch === '' && statusFilter === 'all';
  const visible = new Set<string>();

  const walk = (node: ServiceTreeNode): boolean => {
    let anyChild = false;
    for (const c of node.children) {
      if (walk(c)) {
        anyChild = true;
      }
    }
    const selfMatch = nodeMatchesSearch(node, lowerSearch) && statusPassesFilter(node.rolledUpStatus, statusFilter);
    if (noFilter || selfMatch || anyChild) {
      visible.add(node.id);
      return true;
    }
    return false;
  };

  for (const r of roots) {
    walk(r);
  }
  return visible;
}

function compareForPriority(a: ServiceTreeNode, b: ServiceTreeNode): number {
  const ra = STATUS_ORDER[a.rolledUpStatus] ?? 0;
  const rb = STATUS_ORDER[b.rolledUpStatus] ?? 0;
  if (ra !== rb) {
    return rb - ra; // worse status first
  }
  // tie-breaker: worse SLA first
  const sa = Number.isFinite(a.rolledUpSla) ? a.rolledUpSla : Infinity;
  const sb = Number.isFinite(b.rolledUpSla) ? b.rolledUpSla : Infinity;
  if (sa !== sb) {
    return sa - sb;
  }
  return a.name.localeCompare(b.name);
}

function sortedChildren(node: ServiceTreeNode, mode: SortMode): ServiceTreeNode[] {
  if (mode === 'priority') {
    return [...node.children].sort(compareForPriority);
  }
  return node.children;
}

export function flattenTree(roots: ServiceTreeNode[], opts: FlattenOptions): FlatRow[] {
  const visible = computeVisibility(roots, opts.search, opts.statusFilter);
  const hasSearch = opts.search.trim() !== '';
  const out: FlatRow[] = [];

  const sortedRoots = opts.sortMode === 'priority' ? [...roots].sort(compareForPriority) : roots;

  const walk = (node: ServiceTreeNode, depth: number, isLast: boolean): void => {
    if (!visible.has(node.id)) {
      return;
    }
    const childrenSorted = sortedChildren(node, opts.sortMode).filter((c) => visible.has(c.id));
    const hasChildren = childrenSorted.length > 0;
    const expanded =
      hasChildren &&
      (opts.expandedIds.has(node.id) || (hasSearch && opts.forceExpandOnMatch));

    out.push({
      node,
      depth,
      hasChildren,
      expanded,
      isLastSibling: isLast,
    });

    if (expanded) {
      childrenSorted.forEach((c, idx) => walk(c, depth + 1, idx === childrenSorted.length - 1));
    }
  };

  const visibleRoots = sortedRoots.filter((r) => visible.has(r.id));
  visibleRoots.forEach((r, idx) => walk(r, 0, idx === visibleRoots.length - 1));
  return out;
}

/** Recursively collects every id from the tree (used for "Expand all"). */
export function collectAllIds(roots: ServiceTreeNode[]): string[] {
  const ids: string[] = [];
  const walk = (n: ServiceTreeNode) => {
    ids.push(n.id);
    for (const c of n.children) {
      walk(c);
    }
  };
  for (const r of roots) {
    walk(r);
  }
  return ids;
}
