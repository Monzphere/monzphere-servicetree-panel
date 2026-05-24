import React, { CSSProperties, useMemo } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Icon, IconButton, useStyles2 } from '@grafana/ui';
import { ServiceStatus } from '../types';
import { FlatRow } from '../utils/flattenTree';
import { SLABadge } from './SLABadge';

export interface ServiceRowProps {
  style?: CSSProperties;
  row: FlatRow;
  showSlaBadge: boolean;
  showTarget: boolean;
  warnThresholdPct: number;
  onToggle: (id: string) => void;
}

const STATUS_LABELS: Record<ServiceStatus, string> = {
  ok: 'Healthy',
  warning: 'Degraded',
  critical: 'Critical',
  unknown: 'Unknown',
};

const ROW_INDENT = 20;

const getStyles = (theme: GrafanaTheme2) => ({
  row: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.5, 1),
    borderBottom: `1px solid ${theme.colors.border.weak}`,
    boxSizing: 'border-box',
    width: '100%',
    '&:hover': { backgroundColor: theme.colors.action.hover },
  }),
  chevronSlot: css({
    width: theme.spacing(3),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  statusIcon: css({
    width: theme.spacing(2.5),
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  }),
  name: css({
    flex: 1,
    minWidth: 0,
    fontSize: theme.typography.body.fontSize,
    fontWeight: theme.typography.fontWeightMedium,
    color: theme.colors.text.primary,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  }),
  meta: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightRegular ?? 400,
    marginLeft: theme.spacing(0.5),
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }),
  ok: css({ color: theme.colors.success.text }),
  warning: css({ color: theme.colors.warning.text }),
  critical: css({ color: theme.colors.error.text }),
  unknown: css({ color: theme.colors.text.disabled }),
});

function statusIconName(
  status: ServiceStatus
): 'check-circle' | 'exclamation-triangle' | 'times-circle' | 'question-circle' {
  switch (status) {
    case 'ok':
      return 'check-circle';
    case 'warning':
      return 'exclamation-triangle';
    case 'critical':
      return 'times-circle';
    default:
      return 'question-circle';
  }
}

export function ServiceRow(props: ServiceRowProps): JSX.Element {
  const { row, showSlaBadge, showTarget, warnThresholdPct, onToggle, style } = props;
  const { node, depth, hasChildren, expanded } = row;
  const styles = useStyles2(getStyles);
  const statusClass = useMemo(() => styles[node.rolledUpStatus] ?? styles.unknown, [node.rolledUpStatus, styles]);

  const childCountLabel = hasChildren
    ? `${node.children.length} sub-service${node.children.length === 1 ? '' : 's'}`
    : null;

  return (
    <div
      role="treeitem"
      aria-expanded={hasChildren ? expanded : undefined}
      aria-level={depth + 1}
      style={style}
    >
      <div className={styles.row} style={{ paddingLeft: depth * ROW_INDENT + 8 }}>
        <div className={styles.chevronSlot}>
          {hasChildren ? (
            <IconButton
              name={expanded ? 'angle-down' : 'angle-right'}
              tooltip={expanded ? 'Collapse' : 'Expand'}
              aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              onClick={() => onToggle(node.id)}
              size="md"
            />
          ) : null}
        </div>
        <div className={`${styles.statusIcon} ${statusClass}`}>
          <Icon
            name={statusIconName(node.rolledUpStatus)}
            size="lg"
            aria-label={`${STATUS_LABELS[node.rolledUpStatus]} status`}
          />
        </div>
        <span className={styles.name} title={node.name}>
          {node.name}
        </span>
        {childCountLabel && <span className={styles.meta}>{childCountLabel}</span>}
        {showSlaBadge && (
          <SLABadge
            sla={node.rolledUpSla}
            target={node.slaTarget}
            warnThresholdPct={warnThresholdPct}
            showTarget={showTarget}
          />
        )}
      </div>
    </div>
  );
}
