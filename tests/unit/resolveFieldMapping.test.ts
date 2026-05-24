import { DEFAULT_FIELDS, ZABBIX_FIELDS, resolveFieldMapping, FieldMapping } from '../../src/types';

describe('resolveFieldMapping', () => {
  const customMapping: FieldMapping = {
    id: 'my_id',
    parentId: 'my_parent',
    name: 'my_name',
    status: 'my_status',
    sla: 'my_sla',
    slaTarget: 'my_target',
    weight: 'my_weight',
  };

  it('returns DEFAULT_FIELDS for the "auto" preset', () => {
    expect(resolveFieldMapping('auto', customMapping)).toBe(DEFAULT_FIELDS);
  });

  it('returns ZABBIX_FIELDS for the "zabbix" preset', () => {
    expect(resolveFieldMapping('zabbix', customMapping)).toBe(ZABBIX_FIELDS);
  });

  it('returns the user-defined mapping for the "custom" preset', () => {
    expect(resolveFieldMapping('custom', customMapping)).toBe(customMapping);
  });

  it('Zabbix preset uses Zabbix-native field names', () => {
    expect(ZABBIX_FIELDS.id).toBe('serviceid');
    expect(ZABBIX_FIELDS.slaTarget).toContain('goodsla');
    expect(ZABBIX_FIELDS.sla).toContain('sli');
  });
});
