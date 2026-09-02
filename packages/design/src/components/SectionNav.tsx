import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { breakpoints, control, mesh, motion } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';

/**
 * A page's own sections, as a quiet vertical rail: one pill marks where you
 * are, the rest wait their turn. This is in-page navigation — it swaps the
 * content column, not the route — so items are buttons, not links.
 */
export function SectionNav({ children }: { children: ReactNode }) {
  return <ul {...stylex.props(styles.list)}>{children}</ul>;
}

export function SectionNavItem({
  icon,
  active = false,
  onClick,
  children,
}: {
  icon: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        aria-current={active || undefined}
        onClick={onClick}
        {...stylex.props(styles.item, active && styles.itemActive)}
      >
        <span {...stylex.props(styles.icon, active && styles.iconActive)}>
          <Icon name={icon} size={16} />
        </span>
        {children}
      </button>
    </li>
  );
}

const styles = stylex.create({
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[1],
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  item: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': color.surfaceSubtle,
    },
    borderColor: 'transparent',
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxSizing: 'border-box',
    color: color.textMuted,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    gap: space[2],
    lineHeight: text.lineBodySmall,
    paddingBlock: space[2],
    paddingInline: space[3],
    textAlign: 'start',
    width: '100%',
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
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'background-color, color',
    transitionTimingFunction: motion.ease,
  },
  itemActive: {
    backgroundColor: {
      default: color.surfaceSubtle,
      ':hover': color.surfaceSubtle,
    },
    color: color.textPrimary,
  },
  icon: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
    flexShrink: 0,
  },
  iconActive: {
    color: color.textPrimary,
  },
});
