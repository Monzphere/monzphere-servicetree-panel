import React from 'react';
import { render, screen } from '@testing-library/react';
import { SLABadge } from '../../src/components/SLABadge';

describe('SLABadge', () => {
  it('renders the SLA value rounded to two decimals', () => {
    render(<SLABadge sla={99.96} target={99.9} warnThresholdPct={95} showTarget={false} />);
    expect(screen.getByTestId('sla-badge')).toHaveTextContent('99.96%');
  });

  it('renders n/a when sla is NaN', () => {
    render(<SLABadge sla={NaN} target={99.9} warnThresholdPct={95} showTarget={false} />);
    expect(screen.getByTestId('sla-badge')).toHaveTextContent('n/a');
  });

  it('applies "meeting" tier when sla >= target', () => {
    render(<SLABadge sla={99.95} target={99.9} warnThresholdPct={95} showTarget={false} />);
    expect(screen.getByTestId('sla-badge')).toHaveAttribute('data-tier', 'meeting');
  });

  it('applies "at-risk" tier when sla is below target but above warn floor', () => {
    render(<SLABadge sla={99.5} target={99.9} warnThresholdPct={95} showTarget={false} />);
    expect(screen.getByTestId('sla-badge')).toHaveAttribute('data-tier', 'at-risk');
  });

  it('applies "breached" tier when sla is far below target', () => {
    render(<SLABadge sla={50} target={99.9} warnThresholdPct={95} showTarget={false} />);
    expect(screen.getByTestId('sla-badge')).toHaveAttribute('data-tier', 'breached');
  });

  it('shows the target when showTarget=true', () => {
    render(<SLABadge sla={99.95} target={99.9} warnThresholdPct={95} showTarget={true} />);
    expect(screen.getByTestId('sla-badge')).toHaveTextContent('/ 99.9%');
  });
});
