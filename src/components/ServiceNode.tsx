import React, { useCallback, useMemo, useState } from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Icon, IconButton, useStyles2 } from '@grafana/ui';
import { ServiceStatus, ServiceTreeNode } from '../types';
import { SLABadge } from './SLABadge';

export interface ServiceNodeProps {
  node: ServiceTreeNode;
  defaultExpanded: boolean;
  showSlaBadge: boolean;
  showTarget: boolean;
  warnThresholdPct: number;
  /** Whether to draw a thin separator between siblings; true for all but the last child. */
  withSeparator?: boolean;
}

const STATUS_LABELS: Record<ServiceStatus, string> = {
  ok: 'Healthy',
  warning: 'Degraded',
  critical: 'Critical',
  unknown: 'Unknown',
};

const getStyles = (theme: GrafanaTheme2) => ({
  row: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(1),
    padding: theme.spacing(0.75, 1),
    minHeight: theme.spacing(4),
    borderRadius: theme.shape.radius.default,
    '&:hover': {
      backgroundColor: theme.colors.action.hover,
    },
  }),
  separator: css({
    borderBottom: `1px solid ${theme.colors.border.weak}`,
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
  }),
  childrenContainer: css({
    borderLeft: `1px solid ${theme.colors.border.weak}`,
    marginLeft: theme.spacing(2),
    paddingLeft: theme.spacing(1),
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

export function ServiceNode(props: ServiceNodeProps): React.JSX.Element {
  const { node, defaultExpanded, showSlaBadge, showTarget, warnThresholdPct, withSeparator } = props;
  const styles = useStyles2(getStyles);
  const [expanded, setExpanded] = useState<boolean>(defaultExpanded);

  const hasChildren = node.children.length > 0;
  const toggle = useCallback(() => setExpanded((v) => !v), []);
  const statusClass = useMemo(() => styles[node.rolledUpStatus] ?? styles.unknown, [node.rolledUpStatus, styles]);

  const childCountLabel = hasChildren
    ? `${node.children.length} sub-service${node.children.length === 1 ? '' : 's'}`
    : null;

  return (
    <div role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <div className={`${styles.row} ${withSeparator ? styles.separator : ''}`}>
        <div className={styles.chevronSlot}>
          {hasChildren ? (
            <IconButton
              name={expanded ? 'angle-down' : 'angle-right'}
              tooltip={expanded ? 'Collapse' : 'Expand'}
              aria-label={expanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
              onClick={toggle}
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
      {hasChildren && expanded && (
        <div className={styles.childrenContainer} role="group">
          {node.children.map((child, idx) => (
            <ServiceNode
              key={child.id}
              node={child}
              defaultExpanded={defaultExpanded}
              showSlaBadge={showSlaBadge}
              showTarget={showTarget}
              warnThresholdPct={warnThresholdPct}
              withSeparator={idx < node.children.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
