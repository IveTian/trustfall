import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { control } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: radius.sm,
    borderWidth: 0,
    boxSizing: 'border-box',
    color: color.textPrimary,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightRegular,
    gap: space[2],
    lineHeight: text.lineBodySmall,
    marginInline: `calc(${space[2]} * -1)`,
    maxWidth: `calc(100% + ${space[4]})`,
    minWidth: 0,
    paddingBlock: space[1],
    paddingInline: space[2],
    textAlign: 'start',
    textDecoration: 'none',
    width: `calc(100% + ${space[4]})`,
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
  rowHover: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color.surfaceSubtle,
    },
  },
  rowActive: {
    backgroundColor: {
      default: color.surfaceSunken,
      ':hover': color.surfaceSunken,
    },
  },
  icon: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    width: space[5],
  },
  label: {
    flexBasis: '0%',
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});

type NavItemProps = {
  icon?: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
};

export function SidebarNavItem({ icon, label, active = false, onClick, href }: NavItemProps) {
  const className = stylex.props(styles.row, active ? styles.rowActive : styles.rowHover);
  const body = (
    <>
      {icon ? (
        <span {...stylex.props(styles.icon)}>
          <Icon name={icon} size={16} />
        </span>
      ) : null}
      <span {...stylex.props(styles.label)}>{label}</span>
    </>
  );

  if (href) {
    return (
      <a href={href} {...className}>
        {body}
      </a>
    );
  }

  return (
    <button type="button" onClick={onClick} {...className}>
      {body}
    </button>
  );
}

export function SidebarNavSection({ children, label }: { children: ReactNode; label?: string }) {
  return (
    <div {...stylex.props(sectionStyles.section)}>
      {label ? <p {...stylex.props(sectionStyles.heading)}>{label}</p> : null}
      {children}
    </div>
  );
}

const sectionStyles = stylex.create({
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[1],
    minWidth: 0,
  },
  heading: {
    color: color.textMuted,
    fontFamily: text.familyUi,
    fontSize: text.sizeCaption,
    lineHeight: text.lineCaption,
    margin: 0,
  },
});
