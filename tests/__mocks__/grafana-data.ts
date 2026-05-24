/* Minimal mocks for @grafana/data used by unit tests. */
import React from 'react';

export enum FieldType {
  time = 'time',
  number = 'number',
  string = 'string',
  boolean = 'boolean',
  trace = 'trace',
  other = 'other',
}

export enum LoadingState {
  NotStarted = 'NotStarted',
  Loading = 'Loading',
  Streaming = 'Streaming',
  Done = 'Done',
  Error = 'Error',
}

export interface Field<T = any> {
  name: string;
  type: FieldType;
  values: T[];
  config?: { displayName?: string; [k: string]: unknown };
  labels?: Record<string, string>;
}

export interface DataFrame {
  fields: Field[];
  length: number;
  name?: string;
  refId?: string;
}

interface MutableDataFrameInit {
  fields: Array<{ name: string; type: FieldType; values: unknown[]; config?: Field['config'] }>;
}

export class MutableDataFrame implements DataFrame {
  fields: Field[];
  length: number;
  constructor(init: MutableDataFrameInit) {
    this.fields = init.fields.map((f) => ({ ...f, values: [...f.values] }));
    this.length = this.fields.reduce((max, f) => Math.max(max, f.values.length), 0);
  }
  add(row: Record<string, unknown>): void {
    for (const f of this.fields) {
      f.values.push(row[f.name]);
    }
    this.length++;
  }
}

export const dateTime = (input?: unknown) => ({
  toISOString: () => (input ? String(input) : new Date().toISOString()),
  valueOf: () => Date.now(),
  isValid: () => true,
});

export interface GrafanaTheme2 {
  colors: Record<string, any>;
  spacing: (...args: number[]) => string;
  shape: { radius: { default: string } };
  typography: Record<string, any>;
}

export const createTheme = (): GrafanaTheme2 => ({
  colors: {
    background: { primary: '#111217', secondary: '#181B1F' },
    border: { weak: '#34373C' },
    text: { primary: '#ECECEC', secondary: '#9CA0A6', disabled: '#5B6066' },
    action: { hover: 'rgba(255,255,255,0.05)' },
    success: { main: '#1A7F37', text: '#3FB950', contrastText: '#FFFFFF', border: '#246B3F' },
    warning: { main: '#FFB020', text: '#FFB020', contrastText: '#1F1F1F', border: '#BD8B1A' },
    error: { main: '#D8423B', text: '#D8423B', contrastText: '#FFFFFF', border: '#A8312A' },
  },
  spacing: (...args: number[]) => args.map((a) => `${a * 8}px`).join(' '),
  shape: { radius: { default: '2px' } },
  typography: {
    fontFamily: 'Inter,system-ui,sans-serif',
    fontFamilyMonospace: 'ui-monospace,monospace',
    fontWeightMedium: 500,
    body: { fontSize: '14px' },
    bodySmall: { fontSize: '12px' },
  },
});

// PanelProps stub
export interface PanelProps<T = any> {
  id: number;
  data: any;
  options: T;
  width: number;
  height: number;
  timeRange: any;
  timeZone: string;
  transparent: boolean;
  title: string;
  fieldConfig: any;
  renderCounter: number;
  replaceVariables: (s: string) => string;
  eventBus: any;
  onOptionsChange: (o: T) => void;
  onFieldConfigChange: (c: any) => void;
  onChangeTimeRange: (r: any) => void;
}

// PanelPlugin stub – chainable builder
type OptionsBuilder = {
  addRadio: (..._a: unknown[]) => OptionsBuilder;
  addNumberInput: (..._a: unknown[]) => OptionsBuilder;
  addBooleanSwitch: (..._a: unknown[]) => OptionsBuilder;
  addTextInput: (..._a: unknown[]) => OptionsBuilder;
};

const noopBuilder: OptionsBuilder = {
  addRadio: () => noopBuilder,
  addNumberInput: () => noopBuilder,
  addBooleanSwitch: () => noopBuilder,
  addTextInput: () => noopBuilder,
};

export class PanelPlugin<T = any> {
  constructor(public component: React.ComponentType<PanelProps<T>>) {}
  setPanelOptions(fn: (builder: OptionsBuilder) => OptionsBuilder | void): PanelPlugin<T> {
    fn(noopBuilder);
    return this;
  }
}

export interface PanelData {
  series: DataFrame[];
  state: LoadingState;
  timeRange: any;
}
