import { DataFrame, Field, FieldType } from '@grafana/data';
import { ServiceRow } from '../types';

/**
 * Tries to interpret a DataFrame in the wide time-series shape that the
 * alexanderzobnin-zabbix-datasource returns when querying:
 *   Query type: Services · Property: sla / uptime / downtime / status
 *
 * In that shape the frame has:
 *   - one Time column
 *   - N numeric columns, one per service, whose NAME is the service label
 *     (e.g. "OLT QUATIS - PON 0/2/3: SLA ISP - LOS").
 *
 * We turn each non-time numeric column into one ServiceRow whose:
 *   - id   = the column name (or labels.service if present)
 *   - name = a humanised version of the same
 *   - sla  = last non-null value of that series
 *   - status = derived from sla vs target (when status column not provided)
 *
 * Returns [] if the frame does not look like Zabbix series wide-format,
 * so callers can fall back to the standard tabular extractor.
 */
export function isZabbixSeriesFrame(frame: DataFrame): boolean {
  if (!frame || frame.fields.length < 2) {
    return false;
  }
  const hasTime = frame.fields.some((f) => f.type === FieldType.time);
  const nonTimeNumeric = frame.fields.filter((f) => f.type === FieldType.number);
  const hasNumericValueColumns = nonTimeNumeric.length >= 1;
  const hasIdColumn = frame.fields.some((f) => /^(id|serviceid|service_?id)$/i.test(f.name));
  // Heuristic: time + ≥1 numeric value columns + no explicit id column.
  return hasTime && hasNumericValueColumns && !hasIdColumn;
}

function lastDefined(field: Field): number {
  for (let i = field.values.length - 1; i >= 0; i--) {
    const v = field.values[i];
    if (v !== null && v !== undefined && v !== '' && Number.isFinite(Number(v))) {
      return Number(v);
    }
  }
  return NaN;
}

export interface ZabbixExtractOptions {
  defaultSlaTarget: number;
  nameSeparator: string;
  warnThresholdPct: number;
}

function deriveStatus(sla: number, target: number, warnThresholdPct: number): 'ok' | 'warning' | 'critical' | 'unknown' {
  if (!Number.isFinite(sla)) {
    return 'unknown';
  }
  if (sla >= target) {
    return 'ok';
  }
  const warnFloor = target * (warnThresholdPct / 100);
  if (sla >= warnFloor) {
    return 'warning';
  }
  return 'critical';
}

export function extractZabbixSeriesRows(frame: DataFrame, opts: ZabbixExtractOptions): ServiceRow[] {
  if (!isZabbixSeriesFrame(frame)) {
    return [];
  }
  const seriesFields = frame.fields.filter((f) => f.type === FieldType.number);
  const rows: ServiceRow[] = [];
  const seenIds = new Set<string>();

  for (const f of seriesFields) {
    const labelService = f.labels?.service ?? f.config?.displayName ?? f.name;
    const id = String(labelService).trim();
    if (!id || seenIds.has(id)) {
      continue;
    }
    seenIds.add(id);

    const sla = lastDefined(f);
    const target = opts.defaultSlaTarget;
    const status = deriveStatus(sla, target, opts.warnThresholdPct);

    rows.push({
      id,
      parentId: null,
      name: humanise(id),
      status,
      sla,
      slaTarget: target,
      weight: 1,
    });
  }

  if (opts.nameSeparator) {
    return splitByHierarchy(rows, opts.nameSeparator);
  }

  return rows;
}

function humanise(label: string): string {
  // Keep the full label by default — the host prefix is usually what
  // distinguishes one Zabbix item from another (e.g. different OLTs).
  // We only collapse the "host: item" pair when host equals item.
  const colon = label.indexOf(':');
  if (colon > 0 && colon < label.length - 1) {
    const host = label.slice(0, colon).trim();
    const item = label.slice(colon + 1).trim();
    if (host && item && host.toLowerCase() === item.toLowerCase()) {
      return host;
    }
  }
  return label;
}

/**
 * Promotes leading prefixes of each name (split by `sep`) to parent nodes.
 * Example with sep=" - ":
 *   "OLT QUATIS - PON 0/2/3: SLA ISP - LOS"  →  parent "OLT QUATIS"
 *   "OLT QUATIS - PON 0/2/4: SLA ISP - LOS"  →  parent "OLT QUATIS"
 * The intermediate group "OLT QUATIS" gets created (synthetic id).
 */
function splitByHierarchy(rows: ServiceRow[], sep: string): ServiceRow[] {
  const out: ServiceRow[] = [];
  const groupSeen = new Set<string>();

  for (const r of rows) {
    const idx = r.name.indexOf(sep);
    if (idx <= 0) {
      out.push(r);
      continue;
    }
    const groupName = r.name.slice(0, idx).trim();
    const childName = r.name.slice(idx + sep.length).trim();
    const groupId = `group:${groupName}`;

    if (!groupSeen.has(groupId)) {
      groupSeen.add(groupId);
      out.push({
        id: groupId,
        parentId: null,
        name: groupName,
        status: 'unknown',
        sla: NaN,
        slaTarget: r.slaTarget,
        weight: 1,
      });
    }

    out.push({
      ...r,
      parentId: groupId,
      name: childName || r.name,
    });
  }

  return out;
}
