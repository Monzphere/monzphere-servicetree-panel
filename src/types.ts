import { DataFrame } from '@grafana/data';

export type ServiceStatus = 'ok' | 'warning' | 'critical' | 'unknown';

export interface ServiceRow {
  id: string;
  parentId: string | null;
  name: string;
  status: ServiceStatus;
  sla: number;
  slaTarget: number;
  weight: number;
}

export interface ServiceTreeNode extends ServiceRow {
  children: ServiceTreeNode[];
  rolledUpSla: number;
  rolledUpStatus: ServiceStatus;
  depth: number;
}

export interface FieldMapping {
  id: string;
  parentId: string;
  name: string;
  status: string;
  sla: string;
  slaTarget: string;
  weight: string;
}

export type RollupMode = 'worst' | 'weighted' | 'min';

export type FieldPreset = 'auto' | 'zabbix' | 'custom';

export interface PanelOptions {
  fieldPreset: FieldPreset;
  fields: FieldMapping;
  defaultSlaTarget: number;
  rollupMode: RollupMode;
  defaultExpanded: boolean;
  showSlaBadge: boolean;
  showTarget: boolean;
  warnThresholdPct: number;
  /** When set, services are auto-grouped under their leading prefix split by this string (e.g. " - "). */
  nameSeparator: string;
}

export const DEFAULT_FIELDS: FieldMapping = {
  id: 'id|serviceid|service_id',
  parentId: 'parentId|parentid|parent_id|parents',
  name: 'name|service|service_name',
  status: 'status|severity|state',
  sla: 'sla|sli|current_sla|uptime',
  slaTarget: 'slaTarget|sla_target|goodsla|target',
  weight: 'weight|priority',
};

export const ZABBIX_FIELDS: FieldMapping = {
  id: 'serviceid',
  parentId: 'parentid|parents',
  name: 'name',
  status: 'status',
  sla: 'sli|sla|uptime',
  slaTarget: 'goodsla|sla_target',
  weight: 'weight',
};

export const DEFAULT_OPTIONS: PanelOptions = {
  fieldPreset: 'auto',
  fields: DEFAULT_FIELDS,
  defaultSlaTarget: 99.9,
  rollupMode: 'worst',
  defaultExpanded: true,
  showSlaBadge: true,
  showTarget: true,
  warnThresholdPct: 95,
  nameSeparator: '',
};

export function resolveFieldMapping(preset: FieldPreset, custom: FieldMapping): FieldMapping {
  switch (preset) {
    case 'zabbix':
      return ZABBIX_FIELDS;
    case 'custom':
      return custom;
    case 'auto':
    default:
      return DEFAULT_FIELDS;
  }
}

export const STATUS_ORDER: Record<ServiceStatus, number> = {
  unknown: 0,
  ok: 1,
  warning: 2,
  critical: 3,
};

export interface FrameContext {
  frame: DataFrame | null;
  hasData: boolean;
}
