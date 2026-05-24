import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { FieldType, LoadingState, MutableDataFrame, PanelData, dateTime } from '@grafana/data';
import { ServiceTreePanel } from '../../src/components/ServiceTreePanel';
import { DEFAULT_OPTIONS } from '../../src/types';

function makeData(rows: Array<Record<string, unknown>>): PanelData {
  const frame = new MutableDataFrame({
    fields: [
      { name: 'id', type: FieldType.string, values: [] },
      { name: 'parentId', type: FieldType.string, values: [] },
      { name: 'name', type: FieldType.string, values: [] },
      { name: 'status', type: FieldType.string, values: [] },
      { name: 'sla', type: FieldType.number, values: [] },
      { name: 'slaTarget', type: FieldType.number, values: [] },
      { name: 'weight', type: FieldType.number, values: [] },
    ],
  });
  rows.forEach((r) => frame.add(r));
  return {
    series: [frame],
    state: LoadingState.Done,
    timeRange: {
      from: dateTime(),
      to: dateTime(),
      raw: { from: 'now-1h', to: 'now' },
    },
  };
}

function renderPanel(panelData: PanelData) {
  return render(
    <ServiceTreePanel
      id={1}
      data={panelData}
      timeRange={panelData.timeRange}
      timeZone="browser"
      options={DEFAULT_OPTIONS}
      transparent={false}
      width={600}
      height={400}
      title="test"
      fieldConfig={{ defaults: {}, overrides: [] }}
      renderCounter={0}
      replaceVariables={(s) => s}
      eventBus={{ publish: () => {}, subscribe: () => ({ unsubscribe: () => {} }) } as any}
      onOptionsChange={() => {}}
      onFieldConfigChange={() => {}}
      onChangeTimeRange={() => {}}
    />
  );
}

describe('ServiceTreePanel', () => {
  it('renders empty-state message when there is no data', () => {
    const empty: PanelData = {
      series: [],
      state: LoadingState.Done,
      timeRange: {
        from: dateTime(),
        to: dateTime(),
        raw: { from: 'now-1h', to: 'now' },
      },
    };
    renderPanel(empty);
    expect(screen.getByTestId('service-tree-panel')).toBeInTheDocument();
    expect(screen.getByText(/No data\./)).toBeInTheDocument();
  });

  it('renders a single root with rolled-up children', () => {
    const data = makeData([
      { id: 'root', parentId: '', name: 'platform', status: 'ok', sla: 100, slaTarget: 99.9, weight: 1 },
      { id: 'a', parentId: 'root', name: 'api', status: 'warning', sla: 99.5, slaTarget: 99.9, weight: 1 },
      { id: 'b', parentId: 'root', name: 'db', status: 'critical', sla: 90.0, slaTarget: 99.9, weight: 1 },
    ]);
    renderPanel(data);
    expect(screen.getByText('platform')).toBeInTheDocument();
    expect(screen.getByText('api')).toBeInTheDocument();
    expect(screen.getByText('db')).toBeInTheDocument();
  });

  it('collapses children when chevron is clicked', () => {
    const data = makeData([
      { id: 'root', parentId: '', name: 'platform', status: 'ok', sla: 100, slaTarget: 99.9, weight: 1 },
      { id: 'a', parentId: 'root', name: 'api', status: 'ok', sla: 99.99, slaTarget: 99.9, weight: 1 },
    ]);
    renderPanel(data);
    expect(screen.getByText('api')).toBeInTheDocument();
    const collapse = screen.getByLabelText(/Collapse platform/);
    fireEvent.click(collapse);
    expect(screen.queryByText('api')).not.toBeInTheDocument();
  });

  it('filters tree by search and shows empty-match message', () => {
    const data = makeData([
      { id: 'root', parentId: '', name: 'platform', status: 'ok', sla: 100, slaTarget: 99.9, weight: 1 },
      { id: 'a', parentId: 'root', name: 'api', status: 'ok', sla: 99.99, slaTarget: 99.9, weight: 1 },
      { id: 'b', parentId: 'root', name: 'db', status: 'ok', sla: 99.99, slaTarget: 99.9, weight: 1 },
    ]);
    renderPanel(data);
    const search = screen.getByLabelText(/Search services/);
    fireEvent.change(search, { target: { value: 'api' } });
    expect(screen.getByText('api')).toBeInTheDocument();
    expect(screen.queryByText('db')).not.toBeInTheDocument();
    fireEvent.change(search, { target: { value: 'no-such-service' } });
    expect(screen.getByText(/No services match the current filter/)).toBeInTheDocument();
  });
});
