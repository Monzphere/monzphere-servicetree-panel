import React from 'react';
import { css } from '@emotion/css';
import { GrafanaTheme2 } from '@grafana/data';
import { Tooltip, useStyles2 } from '@grafana/ui';
import { slaTier } from '../utils/calculateSLA';

export interface SLABadgeProps {
  sla: number;
  target: number;
  warnThresholdPct: number;
  showTarget: boolean;
}

const getStyles = (theme: GrafanaTheme2) => ({
  badge: css({
    display: 'inline-flex',
    alignItems: 'baseline',
    gap: theme.spacing(0.5),
    padding: theme.spacing(0.25, 1),
    borderRadius: theme.shape.radius.pill ?? '999px',
    fontSize: theme.typography.bodySmall.fontSize,
    fontFamily: theme.typography.fontFamilyMonospace,
    fontWeight: theme.typography.fontWeightMedium,
    lineHeight: 1.4,
    border: `1px solid transparent`,
    minWidth: 64,
    justifyContent: 'flex-end',
    whiteSpace: 'nowrap',
  }),
  meeting: css({
    color: theme.colors.success.text,
    backgroundColor: theme.colors.success.transparent,
    borderColor: theme.colors.success.borderTransparent ?? theme.colors.success.border,
  }),
  atRisk: css({
    color: theme.colors.warning.text,
    backgroundColor: theme.colors.warning.transparent,
    borderColor: theme.colors.warning.borderTransparent ?? theme.colors.warning.border,
  }),
  breached: css({
    color: theme.colors.error.text,
    backgroundColor: theme.colors.error.transparent,
    borderColor: theme.colors.error.borderTransparent ?? theme.colors.error.border,
  }),
  unknown: css({
    color: theme.colors.text.secondary,
    backgroundColor: theme.colors.background.secondary,
    borderColor: theme.colors.border.weak,
  }),
  target: css({
    color: theme.colors.text.secondary,
    fontSize: theme.typography.bodySmall.fontSize,
    fontWeight: theme.typography.fontWeightRegular ?? 400,
    opacity: 0.75,
    marginLeft: theme.spacing(0.5),
  }),
});

export function SLABadge({ sla, target, warnThresholdPct, showTarget }: SLABadgeProps): React.JSX.Element {
  const styles = useStyles2(getStyles);

  const hasValue = Number.isFinite(sla);
  const tier = hasValue ? slaTier(sla, target, warnThresholdPct) : 'meeting';
  const tierClass = !hasValue
    ? styles.unknown
    : tier === 'meeting'
      ? styles.meeting
      : tier === 'at-risk'
        ? styles.atRisk
        : styles.breached;

  const label = hasValue ? `${sla.toFixed(2)}%` : 'n/a';
  const tooltip = hasValue ? `${label} (target ${target.toFixed(2)}% · ${tier})` : 'No SLA value reported';

  return (
    <Tooltip content={tooltip} placement="top">
      <span className={`${styles.badge} ${tierClass}`} data-testid="sla-badge" data-tier={tier}>
        {label}
        {showTarget && hasValue && (
          <span className={styles.target} aria-hidden="true">
            / {target.toFixed(1)}%
          </span>
        )}
      </span>
    </Tooltip>
  );
}
