import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2, PanelProps } from '@grafana/data';
import { Alert, useStyles2 } from '@grafana/ui';
import { FixedSizeList as List } from 'react-window';
import { PanelOptions, resolveFieldMapping } from '../types';
import { buildTree, extractRows } from '../utils/buildTree';
import { rollupTree } from '../utils/calculateSLA';
import { extractZabbixSeriesRows, isZabbixSeriesFrame } from '../utils/extractZabbixSeries';
import { collectAllIds, flattenTree, SortMode, StatusFilter } from '../utils/flattenTree';
import { ServiceRow } from './ServiceRow';
import { SummaryBar } from './SummaryBar';
import { TreeToolbar } from './TreeToolbar';

type Props = PanelProps<PanelOptions>;

const ROW_HEIGHT = 36;

const getStyles = (theme: GrafanaTheme2, width: number, height: number) => ({
  container: css({
    width,
    height,
    overflow: 'hidden',
    padding: theme.spacing(1),
    backgroundColor: theme.colors.background.primary,
    fontFamily: theme.typography.fontFamily,
    display: 'flex',
    flexDirection: 'column',
  }),
  empty: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    padding: theme.spacing(2),
    textAlign: 'center',
  }),
  listWrap: css({
    flex: 1,
    minHeight: 0,
    border: `1px solid ${theme.colors.border.weak}`,
    borderRadius: theme.shape.radius.default,
    overflow: 'hidden',
  }),
  emptyMatch: css({
    padding: theme.spacing(2),
    textAlign: 'center',
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
  }),
});

export function ServiceTreePanel(props: Props): React.JSX.Element {
  const { options, data, width, height } = props;
  const styles = useStyles2((theme) => getStyles(theme, width, height));

  const frame = data.series?.[0] ?? null;

  const tree = useMemo(() => {
    let rows = [] as ReturnType<typeof extractRows>;
    if (frame && (options.fieldPreset === 'zabbix' || isZabbixSeriesFrame(frame))) {
      rows = extractZabbixSeriesRows(frame, {
        defaultSlaTarget: options.defaultSlaTarget,
        nameSeparator: options.nameSeparator,
        warnThresholdPct: options.warnThresholdPct,
      });
    }
    if (rows.length === 0) {
      const mapping = resolveFieldMapping(options.fieldPreset, options.fields);
      rows = extractRows(frame, mapping, options.defaultSlaTarget);
    }
    const roots = buildTree(rows);
    rollupTree(roots, options.rollupMode);
    return roots;
  }, [
    frame,
    options.fieldPreset,
    options.fields,
    options.defaultSlaTarget,
    options.rollupMode,
    options.nameSeparator,
    options.warnThresholdPct,
  ]);

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortMode, setSortMode] = useState<SortMode>('tree');
  // userOverrides holds explicit expand/collapse toggles. We reset them when
  // the tree identity changes by tracking the previous tree in state and
  // calling setState during render — the React-recommended pattern for
  // "resetting state when a prop changes".
  const [userOverrides, setUserOverrides] = useState<Map<string, boolean>>(() => new Map());
  const [trackedTree, setTrackedTree] = useState(tree);
  let currentOverrides = userOverrides;
  if (trackedTree !== tree) {
    setTrackedTree(tree);
    setUserOverrides(new Map());
    currentOverrides = new Map();
  }

  const expandedIds = useMemo(() => {
    const all = options.defaultExpanded ? new Set(collectAllIds(tree)) : new Set<string>();
    currentOverrides.forEach((expanded, id) => {
      if (expanded) {
        all.add(id);
      } else {
        all.delete(id);
      }
    });
    return all;
  }, [tree, options.defaultExpanded, currentOverrides]);

  const toggle = useCallback(
    (id: string) => {
      const currentlyExpanded = expandedIds.has(id);
      setUserOverrides((prev) => {
        const next = new Map(prev);
        next.set(id, !currentlyExpanded);
        return next;
      });
    },
    [expandedIds]
  );

  const expandAll = useCallback(() => {
    const next = new Map<string, boolean>();
    for (const id of collectAllIds(tree)) {
      next.set(id, true);
    }
    setUserOverrides(next);
  }, [tree]);

  const collapseAll = useCallback(() => {
    const next = new Map<string, boolean>();
    for (const id of collectAllIds(tree)) {
      next.set(id, false);
    }
    setUserOverrides(next);
  }, [tree]);

  const flat = useMemo(
    () =>
      flattenTree(tree, {
        expandedIds,
        search,
        statusFilter,
        sortMode,
        forceExpandOnMatch: true,
      }),
    [tree, expandedIds, search, statusFilter, sortMode]
  );

  // Empty / error states first
  if (!frame || frame.length === 0) {
    return (
      <div className={styles.container} data-testid="service-tree-panel">
        <div className={styles.empty}>
          No data. Connect a query that returns columns for <strong>id</strong>, <strong>parentId</strong>,{' '}
          <strong>name</strong>, <strong>status</strong> and <strong>sla</strong>.
        </div>
      </div>
    );
  }

  if (tree.length === 0) {
    const columns = frame.fields.map((f) => f.name);
    const firstRow: Record<string, unknown> = {};
    for (const f of frame.fields) {
      firstRow[f.name] = f.values[0];
    }
    const sample = JSON.stringify(firstRow, null, 2);
    const mapping = resolveFieldMapping(options.fieldPreset, options.fields);

    return (
      <div className={styles.container} data-testid="service-tree-panel">
        <Alert title="Could not build service tree" severity="warning">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span>
              The query returned <strong>{frame.length}</strong> row(s), but no <code>id</code> column could be matched.
            </span>
            <span>
              <strong>Columns in your data frame:</strong>{' '}
              {columns.map((c) => (
                <code key={c} style={{ marginRight: 6 }}>
                  {c}
                </code>
              ))}
            </span>
            <span>
              <strong>Looking for (preset: {options.fieldPreset}):</strong>
              <ul style={{ margin: '4px 0 0 16px' }}>
                <li>
                  <code>id</code> ← <code>{mapping.id}</code>
                </li>
                <li>
                  <code>parentId</code> ← <code>{mapping.parentId}</code>
                </li>
                <li>
                  <code>name</code> ← <code>{mapping.name}</code>
                </li>
                <li>
                  <code>status</code> ← <code>{mapping.status}</code>
                </li>
                <li>
                  <code>sla</code> ← <code>{mapping.sla}</code>
                </li>
                <li>
                  <code>slaTarget</code> ← <code>{mapping.slaTarget}</code>
                </li>
              </ul>
            </span>
            <details>
              <summary>First row sample</summary>
              <pre style={{ marginTop: 4, fontSize: 11 }}>{sample}</pre>
            </details>
          </div>
        </Alert>
      </div>
    );
  }

  // Compute available height for the virtualised list
  const summaryHeight = 50;
  const toolbarHeight = 56;
  const containerPadding = 16;
  const listHeight = Math.max(120, height - summaryHeight - toolbarHeight - containerPadding * 2 - 8);

  return (
    <div className={styles.container} data-testid="service-tree-panel">
      <SummaryBar roots={tree} />
      <TreeToolbar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        sortMode={sortMode}
        onSortModeChange={setSortMode}
        onExpandAll={expandAll}
        onCollapseAll={collapseAll}
      />
      <div className={styles.listWrap} role="tree">
        {flat.length === 0 ? (
          <div className={styles.emptyMatch}>No services match the current filter.</div>
        ) : (
          <List height={listHeight} itemCount={flat.length} itemSize={ROW_HEIGHT} width={width - containerPadding * 2}>
            {({ index, style }) => (
              <ServiceRow
                style={style}
                row={flat[index]}
                showSlaBadge={options.showSlaBadge}
                showTarget={options.showTarget}
                warnThresholdPct={options.warnThresholdPct}
                onToggle={toggle}
              />
            )}
          </List>
        )}
      </div>
    </div>
  );
}
