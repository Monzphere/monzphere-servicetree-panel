/* Minimal mock of react-window's FixedSizeList for jest. Renders all children. */
import React from 'react';

interface ListProps {
  itemCount: number;
  itemSize: number;
  height: number;
  width: number;
  children: (args: { index: number; style: React.CSSProperties }) => React.ReactNode;
}

export function FixedSizeList(props: ListProps): JSX.Element {
  const items: React.ReactNode[] = [];
  for (let i = 0; i < props.itemCount; i++) {
    items.push(props.children({ index: i, style: {} }));
  }
  return (
    <div role="list" style={{ height: props.height, width: props.width }}>
      {items}
    </div>
  );
}

export default { FixedSizeList };
