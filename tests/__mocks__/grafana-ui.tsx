/* Minimal mocks for @grafana/ui used by unit tests. */
import React from 'react';
import { createTheme, GrafanaTheme2 } from './grafana-data';

const theme = createTheme();

export function useTheme2(): GrafanaTheme2 {
  return theme;
}

export function useStyles2<T>(fn: (theme: GrafanaTheme2) => T): T {
  return fn(theme);
}

export interface IconProps {
  name: string;
  size?: string;
  'aria-label'?: string;
  className?: string;
}
export function Icon(props: IconProps): JSX.Element {
  return <i data-testid={`icon-${props.name}`} aria-label={props['aria-label']} className={props.className} />;
}

export interface IconButtonProps {
  name: string;
  tooltip?: string;
  'aria-label'?: string;
  onClick?: (e: React.MouseEvent) => void;
  size?: string;
}
export function IconButton(props: IconButtonProps): JSX.Element {
  return (
    <button
      type="button"
      aria-label={props['aria-label'] ?? props.tooltip}
      onClick={props.onClick}
      data-testid={`iconbutton-${props.name}`}
    >
      {props.tooltip ?? props.name}
    </button>
  );
}

export interface TooltipProps {
  content: React.ReactNode;
  placement?: string;
  children: React.ReactElement;
}
export function Tooltip({ children }: TooltipProps): JSX.Element {
  return children;
}

export interface AlertProps {
  title: string;
  severity?: string;
  children?: React.ReactNode;
}
export function Alert(props: AlertProps): JSX.Element {
  return (
    <div role="alert" data-severity={props.severity}>
      <strong>{props.title}</strong>
      <div>{props.children}</div>
    </div>
  );
}

export interface InputProps {
  value?: string;
  placeholder?: string;
  'aria-label'?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
}
export function Input(props: InputProps): JSX.Element {
  return (
    <span data-testid="input-wrap">
      {props.prefix}
      <input
        type="text"
        aria-label={props['aria-label']}
        placeholder={props.placeholder}
        value={props.value ?? ''}
        onChange={(e) => props.onChange?.(e)}
      />
      {props.suffix}
    </span>
  );
}

export interface SelectProps<T = string> {
  options: Array<{ value: T; label: string }>;
  value?: T;
  'aria-label'?: string;
  onChange?: (opt: { value: T; label: string } | null) => void;
}
export function Select<T extends string>(props: SelectProps<T>): JSX.Element {
  return (
    <select
      aria-label={props['aria-label']}
      value={String(props.value ?? '')}
      onChange={(e) => {
        const o = props.options.find((x) => String(x.value) === e.target.value);
        props.onChange?.(o ?? null);
      }}
    >
      {props.options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export interface ComboboxProps<T = string> {
  options: Array<{ value: T; label: string }>;
  value?: T;
  'aria-label'?: string;
  placeholder?: string;
  onChange?: (opt: { value: T; label: string } | null) => void;
}
export function Combobox<T extends string>(props: ComboboxProps<T>): JSX.Element {
  return (
    <select
      aria-label={props['aria-label']}
      value={String(props.value ?? '')}
      onChange={(e) => {
        const o = props.options.find((x) => String(x.value) === e.target.value);
        props.onChange?.(o ?? null);
      }}
    >
      {props.options.map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export interface RadioButtonGroupProps<T = string> {
  options: Array<{ value: T; label: string }>;
  value?: T;
  onChange?: (v: T) => void;
  size?: string;
}
export function RadioButtonGroup<T extends string>(props: RadioButtonGroupProps<T>): JSX.Element {
  return (
    <div role="radiogroup">
      {props.options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          aria-pressed={props.value === o.value}
          onClick={() => props.onChange?.(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
