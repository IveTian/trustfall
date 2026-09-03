import * as stylex from '@stylexjs/stylex';
import type { IconName } from '@trustfall/icon';
import type { ReactNode, Ref } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, mesh, motion } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';

/**
 * A hairline container for an orderable tree of rows: components on a status
 * page, a group of them one level deep. Rows read as one object the way Panel
 * rows do; the drag affordance, the drop indicators, and the nested group
 * container are what Panel does not carry.
 *
 * The tree is presentational: it exposes element refs (`ref`, `handleRef`) and
 * visual drag states (`dragging`, `dropEdge`, `active`) and leaves the actual
 * drag wiring to the caller.
 */
export function TreeList({
  children,
  active,
  ref,
}: {
  children: ReactNode;
  active?: boolean;
  ref?: Ref<HTMLUListElement>;
}) {
  return (
    <ul ref={ref} {...stylex.props(styles.panel, styles.list, active && styles.listActive)}>
      {children}
    </ul>
  );
}

/**
 * One row of the tree. `nest` turns it into a group: the row becomes the
 * group's header and `nest` renders inset beneath it. `handle` shows the drag
 * affordance and `handleRef` exposes it so the caller can make it the drag
 * handle; `dropEdge` draws where the dragged row would land.
 */
export function TreeRow({
  title,
  description,
  icon,
  start,
  end,
  nest,
  handle,
  dragging,
  dropEdge,
  onClick,
  expanded,
  ref,
  handleRef,
}: {
  title: string;
  description?: string | null;
  icon?: IconName;
  /** Leading content richer than `icon` allows: a status control, an avatar. */
  start?: ReactNode;
  end?: ReactNode;
  nest?: ReactNode;
  handle?: boolean;
  dragging?: boolean;
  dropEdge?: 'top' | 'bottom' | 'into' | null;
  /**
   * Makes the whole row the control: it renders as a button and the click
   * lands anywhere on it. Don't put other interactive elements in a clickable
   * row — nested controls inside a button are invalid.
   */
  onClick?: () => void;
  /** For a clickable folding row: the state `onClick` toggles. */
  expanded?: boolean;
  ref?: Ref<HTMLLIElement>;
  handleRef?: Ref<HTMLSpanElement>;
}) {
  const content = (
    <>
      {handle ? (
        <span aria-hidden ref={handleRef} {...stylex.props(styles.handle)}>
          <Icon name="drag-handle" size={16} />
        </span>
      ) : null}
      {icon ? (
        <span {...stylex.props(styles.rowIcon)}>
          <Icon name={icon} size={16} />
        </span>
      ) : null}
      {start ? <span {...stylex.props(styles.rowIcon)}>{start}</span> : null}
      <span {...stylex.props(styles.copy)}>
        <span {...stylex.props(styles.title)}>{title}</span>
        {description ? <span {...stylex.props(styles.description)}>{description}</span> : null}
      </span>
      {end ? <span {...stylex.props(styles.end)}>{end}</span> : null}
    </>
  );
  const rowStyles = stylex.props(
    styles.row,
    onClick != null && styles.rowClickable,
    dropEdge === 'into' && styles.dropInto,
  );
  return (
    <li
      ref={ref}
      {...stylex.props(
        styles.item,
        dragging && styles.dragging,
        dropEdge === 'top' && styles.dropTop,
        dropEdge === 'bottom' && styles.dropBottom,
      )}
    >
      {onClick != null ? (
        <button type="button" onClick={onClick} aria-expanded={expanded} {...rowStyles}>
          {content}
        </button>
      ) : (
        <div {...rowStyles}>{content}</div>
      )}
      {nest}
    </li>
  );
}

/**
 * The inset container a group's rows live in. A drop appends to the group.
 * `open` folds it: the grid row tweens between 0fr and 1fr so height animates
 * without measuring, and a closed nest goes invisible so its controls leave
 * the tab order's sight.
 */
export function TreeNest({
  children,
  active,
  open = true,
  ref,
}: {
  children: ReactNode;
  active?: boolean;
  open?: boolean;
  ref?: Ref<HTMLUListElement>;
}) {
  return (
    <div {...stylex.props(styles.nestReveal, !open && styles.nestRevealClosed)}>
      <div
        aria-hidden={!open || undefined}
        {...stylex.props(styles.nestClip, !open && styles.nestClipClosed)}
      >
        <div {...stylex.props(styles.nestFrame)}>
          <ul ref={ref} {...stylex.props(styles.panel, styles.list, active && styles.listActive)}>
            {children}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** The disclosure chevron for a folding row; it rotates as the nest opens. */
export function TreeChevron({ open = false }: { open?: boolean }) {
  return (
    <span {...stylex.props(styles.chevron, open && styles.chevronOpen)}>
      <Icon name="chevron-down" size={16} />
    </span>
  );
}

/** A quiet placeholder row: an empty group still shows where its rows go. */
export function TreeEmpty({ children }: { children: ReactNode }) {
  return <li {...stylex.props(styles.empty)}>{children}</li>;
}

const styles = stylex.create({
  panel: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    overflow: 'hidden',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  listActive: {
    backgroundColor: color.accentMuted,
  },
  item: {
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: {
      default: mesh.line,
      ':last-child': 0,
    },
  },
  dragging: {
    opacity: 0.4,
  },
  // The landing line sits inside the row so it survives the hairline borders.
  dropTop: {
    boxShadow: `inset 0 2px 0 0 ${color.accent}`,
  },
  dropBottom: {
    boxShadow: `inset 0 -2px 0 0 ${color.accent}`,
  },
  dropInto: {
    backgroundColor: color.accentMuted,
  },
  row: {
    alignItems: 'center',
    display: 'flex',
    gap: space[3],
    minWidth: 0,
    paddingBlock: space[3],
    paddingInline: space[4],
  },
  // The whole row is the button; the focus ring draws inside so the panel's
  // overflow clipping cannot eat it.
  rowClickable: {
    backgroundColor: 'transparent',
    borderWidth: 0,
    boxSizing: 'border-box',
    color: 'inherit',
    cursor: 'pointer',
    fontFamily: text.familyUi,
    outlineColor: {
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      ':focus-visible': `calc(${control.focusOffset} * -1)`,
    },
    outlineStyle: {
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      ':focus-visible': control.focusWidth,
    },
    textAlign: 'start',
    width: '100%',
  },
  handle: {
    alignItems: 'center',
    color: color.textMuted,
    cursor: 'grab',
    display: 'flex',
    flexShrink: 0,
    // Same optical nudge as rowIcon: level with the text, not the line box.
    transform: 'translateY(1px)',
  },
  rowIcon: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
    flexShrink: 0,
    // Optical alignment: a 16px glyph centers a hair above the text's cap
    // band; one pixel down and the two read as level.
    transform: 'translateY(1px)',
  },
  copy: {
    alignItems: 'baseline',
    display: 'flex',
    flexGrow: 1,
    gap: space[3],
    minWidth: 0,
  },
  // The name never gives way; when the row runs out of room the description
  // is what truncates.
  title: {
    color: color.textPrimary,
    flexShrink: 0,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
  },
  description: {
    color: color.textMuted,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    lineHeight: text.lineBodySmall,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  end: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    gap: space[1],
    // Controls (32px icon buttons) must not set the row's height: the negative
    // block margin lets them overlap the row padding, so a row with a chevron
    // stands as tall as a row without one.
    marginBlock: `calc(${space[2]} * -1)`,
  },
  nestReveal: {
    display: 'grid',
    gridTemplateRows: '1fr',
    transitionDuration: {
      default: motion.base,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'grid-template-rows',
    transitionTimingFunction: motion.ease,
  },
  nestRevealClosed: {
    gridTemplateRows: '0fr',
  },
  nestClip: {
    minHeight: 0,
    opacity: 1,
    overflow: 'hidden',
    transitionDuration: {
      default: motion.base,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'opacity, visibility',
    transitionTimingFunction: motion.ease,
    visibility: 'visible',
  },
  nestClipClosed: {
    opacity: 0,
    visibility: 'hidden',
  },
  chevron: {
    alignItems: 'center',
    display: 'flex',
    transitionDuration: {
      default: motion.base,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'transform',
    transitionTimingFunction: motion.ease,
  },
  chevronOpen: {
    transform: 'rotate(180deg)',
  },
  nestFrame: {
    paddingBlockEnd: space[3],
    paddingInline: space[3],
  },
  empty: {
    color: color.textMuted,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    lineHeight: text.lineBodySmall,
    paddingBlock: space[3],
    paddingInline: space[4],
  },
});
