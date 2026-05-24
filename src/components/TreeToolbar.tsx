import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Icon, IconButton, Input, RadioButtonGroup, Select, useStyles2 } from '@grafana/ui';
import { SortMode, StatusFilter } from '../utils/flattenTree';

export interface TreeToolbarProps {
  search: string;
  onSearchChange: (v: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (v: StatusFilter) => void;
  sortMode: SortMode;
  onSortModeChange: (v: SortMode) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

const STATUS_OPTIONS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'attention', label: 'Needs attention' },
  { value: 'critical', label: 'Critical only' },
  { value: 'warning', label: 'Degraded only' },
  { value: 'ok', label: 'Healthy only' },
  { value: 'unknown', label: 'Unknown only' },
];

const SORT_OPTIONS: Array<{ value: SortMode; label: string }> = [
  { value: 'tree', label: 'Tree order' },
  { value: 'priority', label: 'Worst first' },
];

const getStyles = (theme: GrafanaTheme2) => ({
  bar: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(1),
    marginBottom: theme.spacing(0.5),
    borderRadius: theme.shape.radius.default,
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    flexWrap: 'wrap',
  }),
  searchWrap: css({
    flex: '1 1 240px',
    minWidth: 200,
    maxWidth: 420,
  }),
  statusWrap: css({
    minWidth: 180,
  }),
  buttons: css({
    display: 'flex',
    gap: theme.spacing(0.25),
    marginLeft: 'auto',
  }),
});

export function TreeToolbar(props: TreeToolbarProps): JSX.Element {
  const styles = useStyles2(getStyles);

  return (
    <div className={styles.bar} role="toolbar" aria-label="Service tree controls">
      <div className={styles.searchWrap}>
        <Input
          aria-label="Search services"
          placeholder="Search by name or id…"
          value={props.search}
          onChange={(e) => props.onSearchChange((e.target as HTMLInputElement).value)}
          prefix={<Icon name="search" />}
          suffix={
            props.search ? (
              <IconButton
                name="times"
                tooltip="Clear search"
                aria-label="Clear search"
                onClick={() => props.onSearchChange('')}
                size="sm"
              />
            ) : undefined
          }
        />
      </div>
      <div className={styles.statusWrap}>
        <Select
          aria-label="Filter by status"
          options={STATUS_OPTIONS}
          value={props.statusFilter}
          onChange={(opt) => props.onStatusFilterChange((opt?.value as StatusFilter) ?? 'all')}
        />
      </div>
      <RadioButtonGroup
        options={SORT_OPTIONS}
        value={props.sortMode}
        onChange={(v) => props.onSortModeChange(v as SortMode)}
        size="md"
      />
      <div className={styles.buttons}>
        <IconButton name="angle-double-down" tooltip="Expand all" aria-label="Expand all" onClick={props.onExpandAll} />
        <IconButton
          name="angle-double-up"
          tooltip="Collapse all"
          aria-label="Collapse all"
          onClick={props.onCollapseAll}
        />
      </div>
    </div>
  );
}
