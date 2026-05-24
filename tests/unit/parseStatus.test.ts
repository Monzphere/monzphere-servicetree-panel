import { parseStatus } from '../../src/utils/parseStatus';

describe('parseStatus', () => {
  it('maps null and undefined to unknown', () => {
    expect(parseStatus(null)).toBe('unknown');
    expect(parseStatus(undefined)).toBe('unknown');
  });

  it('maps empty string to unknown', () => {
    expect(parseStatus('')).toBe('unknown');
    expect(parseStatus('   ')).toBe('unknown');
  });

  it.each([
    ['ok', 'ok'],
    ['OK', 'ok'],
    ['up', 'ok'],
    ['healthy', 'ok'],
    ['success', 'ok'],
    ['normal', 'ok'],
    ['green', 'ok'],
  ])('maps healthy label "%s" to ok', (input, expected) => {
    expect(parseStatus(input)).toBe(expected);
  });

  it.each([
    ['warning', 'warning'],
    ['warn', 'warning'],
    ['degraded', 'warning'],
    ['minor', 'warning'],
    ['yellow', 'warning'],
  ])('maps warning label "%s" to warning', (input, expected) => {
    expect(parseStatus(input)).toBe(expected);
  });

  it.each([
    ['critical', 'critical'],
    ['down', 'critical'],
    ['error', 'critical'],
    ['disaster', 'critical'],
    ['high', 'critical'],
    ['red', 'critical'],
  ])('maps critical label "%s" to critical', (input, expected) => {
    expect(parseStatus(input)).toBe(expected);
  });

  it('maps Zabbix-style numeric severities 0–5 to canonical status', () => {
    expect(parseStatus(0)).toBe('ok');
    expect(parseStatus(1)).toBe('warning');
    expect(parseStatus(2)).toBe('warning');
    expect(parseStatus(3)).toBe('critical');
    expect(parseStatus(4)).toBe('critical');
    expect(parseStatus(5)).toBe('critical');
  });

  it('treats negative severities as ok', () => {
    expect(parseStatus(-1)).toBe('ok');
  });

  it('parses numeric strings', () => {
    expect(parseStatus('0')).toBe('ok');
    expect(parseStatus('3')).toBe('critical');
  });

  it('returns unknown for garbage input', () => {
    expect(parseStatus('definitely not a status')).toBe('unknown');
    expect(parseStatus({})).toBe('unknown');
  });
});
