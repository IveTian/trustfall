import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { control, mesh } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { IconButton } from './Button.tsx';
import { Icon } from './Icon.tsx';

const styles = stylex.create({
  row: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    // The hairline is always drawn so the active pill does not nudge the row.
    borderColor: 'transparent',
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxSizing: 'border-box',
    color: color.navText,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    gap: space[2],
    lineHeight: text.lineBodySmall,
    marginInline: `calc(${space[2]} * -1)`,
    maxWidth: `calc(100% + ${space[4]})`,
    minWidth: 0,
    paddingBlock: space[2],
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
      // The rail is lighter than the rest of the canvas, so its hover fill has
      // to come from below it, not from the white end of the scale.
      ':hover': color.shellHover,
    },
  },
  rowActive: {
    // On the canvas rail, the current item is the one lifted surface: white,
    // hairlined, medium weight.
    backgroundColor: {
      default: color.surfaceRaised,
      ':hover': color.surfaceRaised,
    },
    borderColor: color.border,
    boxShadow: shadow.subtle,
    color: color.navTextActive,
  },
  iconActive: {
    color: color.accent,
  },
  icon: {
    alignItems: 'center',
    color: color.navText,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    // Box the icon at its own 16px so the gap the row declares is the gap you
    // see; a wider box would pad it out to 12.
    width: space[4],
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
        <span {...stylex.props(styles.icon, active && styles.iconActive)}>
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
    color: color.navText,
    fontFamily: text.familyUi,
    fontSize: text.sizeCaption,
    fontWeight: text.weightMedium,
    lineHeight: text.lineCaption,
    margin: 0,
    paddingInline: space[2],
  },
});

/**
 * The top of a rail that was pushed in over another: the way back on the
 * start edge, and the name of where you are beside it. It stands where the
 * console rail keeps its profile menu, so the two rails line up as they swap.
 */
export function SidebarHeader({
  onBack,
  backLabel,
  children,
}: {
  onBack: () => void;
  backLabel: string;
  children: ReactNode;
}) {
  return (
    <div {...stylex.props(headerStyles.header)}>
      <IconButton label={backLabel} size="sm" onClick={onBack}>
        <Icon name="arrow-left-line" size={16} />
      </IconButton>
      <span {...stylex.props(headerStyles.title)}>{children}</span>
    </div>
  );
}

const headerStyles = stylex.create({
  header: {
    alignItems: 'center',
    boxSizing: 'border-box',
    display: 'flex',
    gap: space[2],
    // Pull the button's own padding back so its glyph sits on the rail's
    // text edge, where the nav icons and the avatar sit.
    marginInlineStart: `calc(${space[2]} * -1)`,
    minHeight: control.heightLg,
    minWidth: 0,
  },
  title: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
});
