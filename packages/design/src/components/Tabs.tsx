import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { control } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

const styles = stylex.create({
  list: {
    display: 'flex',
    gap: space[1],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  tab: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: '1px',
    color: color.textMuted,
    cursor: 'pointer',
    fontFamily: text.familyUi,
    fontSize: text.sizeBody,
    paddingBlock: space[2],
    paddingInline: space[3],
    outlineColor: {
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      ':focus-visible': control.focusOffset,
    },
    outlineStyle: {
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      ':focus-visible': control.focusWidth,
    },
  },
  selected: {
    backgroundColor: color.accentMuted,
    color: color.textPrimary,
  },
});

export function Tabs({
  items,
  value,
  onChange,
}: {
  items: Array<{ id: string; label: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <ul {...stylex.props(styles.list)} role="tablist">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            role="tab"
            aria-selected={item.id === value}
            onClick={() => onChange(item.id)}
            {...stylex.props(styles.tab, item.id === value && styles.selected)}
          >
            {item.label}
          </button>
        </li>
      ))}
    </ul>
  );
}

export function TabPanel({
  children,
  labelledBy,
}: {
  children: ReactNode;
  labelledBy: string;
}) {
  return (
    <div role="tabpanel" aria-labelledby={labelledBy}>
      {children}
    </div>
  );
}
