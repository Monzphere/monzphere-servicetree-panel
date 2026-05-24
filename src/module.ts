import { PanelPlugin } from '@grafana/data';
import { ServiceTreePanel } from './components/ServiceTreePanel';
import { DEFAULT_OPTIONS, FieldPreset, PanelOptions, RollupMode } from './types';

const ROLLUP_OPTIONS: Array<{ value: RollupMode; label: string }> = [
  { value: 'worst', label: 'Worst child' },
  { value: 'weighted', label: 'Weighted average' },
  { value: 'min', label: 'Min of leaves' },
];

const PRESET_OPTIONS: Array<{ value: FieldPreset; label: string; description: string }> = [
  {
    value: 'auto',
    label: 'Auto',
    description: 'Detects both Grafana-native and Zabbix column names.',
  },
  {
    value: 'zabbix',
    label: 'Zabbix',
    description: 'Use with the Zabbix data source in Services mode.',
  },
  {
    value: 'custom',
    label: 'Custom',
    description: 'Use the column names you type below.',
  },
];

export const plugin = new PanelPlugin<PanelOptions>(ServiceTreePanel).setPanelOptions((builder) => {
  builder
    .addSelect({
      path: 'fieldPreset',
      name: 'Field preset',
      defaultValue: DEFAULT_OPTIONS.fieldPreset,
      settings: {
        options: PRESET_OPTIONS.map(({ value, label, description }) => ({ value, label, description })),
      },
      category: ['Field mapping'],
    })
    .addRadio({
      path: 'rollupMode',
      name: 'Roll-up mode',
      description: 'How parent SLA is derived from children.',
      defaultValue: DEFAULT_OPTIONS.rollupMode,
      settings: {
        options: ROLLUP_OPTIONS.map(({ value, label }) => ({ value, label })),
      },
      category: ['Aggregation'],
    })
    .addNumberInput({
      path: 'defaultSlaTarget',
      name: 'Default SLA target (%)',
      description: 'Used when the data does not provide a target per service.',
      defaultValue: DEFAULT_OPTIONS.defaultSlaTarget,
      settings: { min: 0, max: 100, step: 0.01 },
      category: ['Aggregation'],
    })
    .addNumberInput({
      path: 'warnThresholdPct',
      name: 'At-risk threshold (% of target)',
      description: 'Below target but above this percentage of target → "at risk" (amber).',
      defaultValue: DEFAULT_OPTIONS.warnThresholdPct,
      settings: { min: 1, max: 100, step: 1 },
      category: ['Aggregation'],
    })
    .addBooleanSwitch({
      path: 'defaultExpanded',
      name: 'Expand all by default',
      defaultValue: DEFAULT_OPTIONS.defaultExpanded,
      category: ['Display'],
    })
    .addBooleanSwitch({
      path: 'showSlaBadge',
      name: 'Show SLA badge',
      defaultValue: DEFAULT_OPTIONS.showSlaBadge,
      category: ['Display'],
    })
    .addBooleanSwitch({
      path: 'showTarget',
      name: 'Show target next to SLA',
      defaultValue: DEFAULT_OPTIONS.showTarget,
      category: ['Display'],
    })
    .addTextInput({
      path: 'nameSeparator',
      name: 'Auto-group separator',
      description:
        'Optional. When set (e.g. " - "), services whose names share the same prefix before this separator are grouped under a synthetic parent. Leave empty to keep the tree flat.',
      defaultValue: DEFAULT_OPTIONS.nameSeparator,
      category: ['Display'],
    })
    .addTextInput({
      path: 'fields.id',
      name: 'ID column',
      defaultValue: DEFAULT_OPTIONS.fields.id,
      category: ['Field mapping'],
    })
    .addTextInput({
      path: 'fields.parentId',
      name: 'Parent ID column',
      defaultValue: DEFAULT_OPTIONS.fields.parentId,
      category: ['Field mapping'],
    })
    .addTextInput({
      path: 'fields.name',
      name: 'Name column',
      defaultValue: DEFAULT_OPTIONS.fields.name,
      category: ['Field mapping'],
    })
    .addTextInput({
      path: 'fields.status',
      name: 'Status column',
      defaultValue: DEFAULT_OPTIONS.fields.status,
      category: ['Field mapping'],
    })
    .addTextInput({
      path: 'fields.sla',
      name: 'SLA column',
      defaultValue: DEFAULT_OPTIONS.fields.sla,
      category: ['Field mapping'],
    })
    .addTextInput({
      path: 'fields.slaTarget',
      name: 'SLA target column',
      defaultValue: DEFAULT_OPTIONS.fields.slaTarget,
      category: ['Field mapping'],
    })
    .addTextInput({
      path: 'fields.weight',
      name: 'Weight column',
      description: 'Optional. Used by the "weighted" roll-up mode.',
      defaultValue: DEFAULT_OPTIONS.fields.weight,
      category: ['Field mapping'],
    });

  return builder;
});
