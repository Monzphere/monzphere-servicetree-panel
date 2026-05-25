import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Icon, useStyles2 } from '@grafana/ui';
import { ServiceStatus, ServiceTreeNode } from '../types';

export interface SummaryBarProps {
  roots: ServiceTreeNode[];
}

interface Counts {
  ok: number;
  warning: number;
  critical: number;
  unknown: number;
  total: number;
}

function countAll(roots: ServiceTreeNode[]): Counts {
  const counts: Counts = { ok: 0, warning: 0, critical: 0, unknown: 0, total: 0 };
  const walk = (n: ServiceTreeNode) => {
    counts.total += 1;
    counts[n.rolledUpStatus] = (counts[n.rolledUpStatus] ?? 0) + 1;
    for (const c of n.children) {
      walk(c);
    }
  };
  for (const r of roots) {
    walk(r);
  }
  return counts;
}

const getStyles = (theme: GrafanaTheme2) => ({
  bar: css({
    display: 'flex',
    alignItems: 'center',
    gap: theme.spacing(2),
    padding: theme.spacing(1, 1.5),
    marginBottom: theme.spacing(1),
    borderRadius: theme.shape.radius.default,
    backgroundColor: theme.colors.background.secondary,
    border: `1px solid ${theme.colors.border.weak}`,
    fontSize: theme.typography.bodySmall.fontSize,
    flexWrap: 'wrap',
  }),
  total: css({
    color: theme.colors.text.secondary,
    fontWeight: theme.typography.fontWeightMedium,
  }),
  pill: css({
    display: 'inline-flex',
    alignItems: 'center',
    gap: theme.spacing(0.5),
    whiteSpace: 'nowrap',
  }),
  ok: css({ color: theme.colors.success.text }),
  warning: css({ color: theme.colors.warning.text }),
  critical: css({ color: theme.colors.error.text }),
  unknown: css({ color: theme.colors.text.disabled }),
  spacer: css({ flex: 1 }),
});

function StatusPill({
  status,
  count,
  styles,
}: {
  status: ServiceStatus;
  count: number;
  styles: ReturnType<typeof getStyles>;
}): React.JSX.Element | null {
  if (count <= 0) {
    return null;
  }
  const label: Record<ServiceStatus, string> = {
    ok: 'healthy',
    warning: 'degraded',
    critical: 'critical',
    unknown: 'unknown',
  };
  const icon: Record<ServiceStatus, 'check-circle' | 'exclamation-triangle' | 'times-circle' | 'question-circle'> = {
    ok: 'check-circle',
    warning: 'exclamation-triangle',
    critical: 'times-circle',
    unknown: 'question-circle',
  };
  return (
    <span className={`${styles.pill} ${styles[status]}`} data-testid={`summary-${status}`}>
      <Icon name={icon[status]} size="sm" aria-hidden="true" />
      <strong>{count}</strong>
      <span>{label[status]}</span>
    </span>
  );
}

export function SummaryBar({ roots }: SummaryBarProps): React.JSX.Element {
  const styles = useStyles2(getStyles);
  const counts = countAll(roots);

  return (
    <div className={styles.bar} role="status" aria-label="Service tree summary">
      <span className={styles.total}>
        {counts.total} service{counts.total === 1 ? '' : 's'}
      </span>
      <StatusPill status="critical" count={counts.critical} styles={styles} />
      <StatusPill status="warning" count={counts.warning} styles={styles} />
      <StatusPill status="ok" count={counts.ok} styles={styles} />
      <StatusPill status="unknown" count={counts.unknown} styles={styles} />
    </div>
  );
}
