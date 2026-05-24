import { ServiceStatus } from '../types';

/**
 * Normalises any incoming status value (string label or Zabbix-style numeric
 * severity 0–5) into the canonical ServiceStatus enum.
 */
export function parseStatus(input: unknown): ServiceStatus {
  if (input === null || input === undefined) {
    return 'unknown';
  }

  if (typeof input === 'number') {
    if (input <= 0) {
      return 'ok';
    }
    if (input <= 2) {
      return 'warning';
    }
    return 'critical';
  }

  const value = String(input).trim().toLowerCase();

  if (value === '' || value === 'unknown' || value === 'n/a') {
    return 'unknown';
  }
  if (['ok', 'up', 'healthy', 'success', 'normal', 'green'].includes(value)) {
    return 'ok';
  }
  if (['warning', 'warn', 'degraded', 'minor', 'yellow', 'orange'].includes(value)) {
    return 'warning';
  }
  if (
    ['critical', 'crit', 'down', 'error', 'failure', 'fail', 'major', 'high', 'disaster', 'red'].includes(
      value
    )
  ) {
    return 'critical';
  }

  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    return parseStatus(asNumber);
  }

  return 'unknown';
}
