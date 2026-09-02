import * as stylex from '@stylexjs/stylex';
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, mesh, motion, zIndex } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';

export type MenuItem = {
  id: string;
  label: string;
  /** Leading visual. A status glyph, an icon — anything 16px square. */
  icon?: ReactNode;
  /** Present makes the item a radio: the menu is a choice, not a list of verbs. */
  selected?: boolean;
  onSelect: () => void;
};

type Anchor = {
  blockStart: string;
  blockEnd: string;
  inlineStart: string;
  inlineEnd: string;
  maxBlock: string;
  minWidth: string;
  dropsDown: boolean;
};

function isRtl(element: HTMLElement): boolean {
  return getComputedStyle(element).direction === 'rtl';
}

/**
 * The panel is `position: fixed` so a scrolling row or a panel with
 * `overflow: hidden` cannot clip it; that costs a measurement against the
 * viewport, repeated while the menu is open.
 *
 * The panel hangs off whichever side of the trigger has the room — down from a
 * row with space below, up from one at the foot of the viewport — and never
 * grows past the space it chose.
 */
function measure(trigger: HTMLElement, align: 'start' | 'end'): Anchor {
  const rect = trigger.getBoundingClientRect();
  const rtl = isRtl(trigger);
  const startInset = rtl ? window.innerWidth - rect.right : rect.left;
  const endInset = rtl ? rect.left : window.innerWidth - rect.right;
  const below = window.innerHeight - rect.bottom;
  const dropsDown = below >= rect.top;
  return {
    blockStart: dropsDown ? `${rect.bottom}px` : 'auto',
    blockEnd: dropsDown ? 'auto' : `${window.innerHeight - rect.top}px`,
    inlineStart: align === 'start' ? `${startInset}px` : 'auto',
    inlineEnd: align === 'end' ? `${endInset}px` : 'auto',
    maxBlock: `calc(${dropsDown ? below : rect.top}px - ${space[5]})`,
    minWidth: `${rect.width}px`,
    dropsDown,
  };
}

/**
 * A menu button and the panel it owns. The trigger looks like a secondary
 * button because that is what it is: one control, on the end edge of a row,
 * holding the current value.
 *
 * Opens on click or ArrowDown/ArrowUp; arrows walk the items, Escape returns
 * focus to the trigger, Tab and an outside press close it. This exists so the
 * console never falls back to a native `<select>`, whose popup the theme
 * cannot reach.
 */
export function Menu({
  label,
  children,
  items,
  align = 'end',
  disabled = false,
  variant = 'button',
  triggerId,
}: {
  /**
   * Accessible name for the trigger, e.g. "Status for Checkout API". Omit only
   * when a `<label htmlFor>` pointing at `triggerId` names it instead.
   */
  label?: string;
  /** Trigger content: the current value. */
  children: ReactNode;
  items: MenuItem[];
  align?: 'start' | 'end';
  disabled?: boolean;
  /**
   * `field` dresses the trigger as a form control — full width, sunken, the
   * same inner focus ring as Input — for menus that live inside a Field.
   * `bare` strips the trigger to its content — no chrome, no chevron — for
   * dense rows where the value itself is the control. `icon` is a square
   * ghost trigger for a lone glyph, the IconButton of menus.
   */
  variant?: 'button' | 'field' | 'bare' | 'icon';
  /** Forwarded to the trigger so a `<label htmlFor>` can reach it. */
  triggerId?: string;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const focusOnOpen = useRef<'first' | 'last' | null>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  // Reposition while open: the panel is fixed, the row under it is not.
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!open || !trigger) {
      return;
    }
    const place = () => setAnchor(measure(trigger, align));
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open, align]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keyboard activation lands on an item; a mouse click leaves focus alone.
  useEffect(() => {
    if (!open || focusOnOpen.current === null) {
      return;
    }
    const where = focusOnOpen.current;
    focusOnOpen.current = null;
    focusItemAt(where === 'first' ? 0 : -1);
  }, [open]);

  function itemNodes(): HTMLElement[] {
    return Array.from(panelRef.current?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? []);
  }

  function focusItemAt(index: number) {
    const nodes = itemNodes();
    if (nodes.length === 0) {
      return;
    }
    nodes[((index % nodes.length) + nodes.length) % nodes.length]?.focus();
  }

  function openMenu(from: 'first' | 'last' | null) {
    const trigger = triggerRef.current;
    if (!trigger || disabled) {
      return;
    }
    focusOnOpen.current = from;
    setAnchor(measure(trigger, align));
    setOpen(true);
  }

  function close(restoreFocus: boolean) {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu(event.key === 'ArrowDown' ? 'first' : 'last');
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      // Escape closes the menu and nothing else — a Dialog listening on the
      // document must not fold up along with it.
      event.stopPropagation();
      close(true);
      return;
    }
    if (event.key === 'Tab') {
      close(false);
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const nodes = itemNodes();
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    focusItemAt(index === -1 ? (step === 1 ? 0 : -1) : index + step);
  }

  return (
    // The handler sits on the wrapper so Escape works from the trigger and from
    // inside the panel alike.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={rootRef}
      onKeyDown={onKeyDown}
      {...stylex.props(styles.root, variant === 'field' && styles.rootField)}
    >
      <button
        ref={triggerRef}
        id={triggerId}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          if (open) {
            close(false);
          } else {
            openMenu(event.detail === 0 ? 'first' : null);
          }
        }}
        {...stylex.props(
          styles.trigger,
          variant === 'field' && styles.triggerField,
          variant === 'bare' && styles.triggerBare,
          variant === 'icon' && styles.triggerIconOnly,
          open && variant === 'button' && styles.triggerOpen,
          open && variant === 'icon' && styles.triggerIconOnlyOpen,
          open && variant === 'field' && styles.triggerFieldOpen,
        )}
      >
        <span {...stylex.props(styles.triggerLabel)}>{children}</span>
        {variant === 'bare' || variant === 'icon' ? null : (
          <span {...stylex.props(styles.triggerIcon)}>
            <Icon name="arrow-down-s-line" size={16} />
          </span>
        )}
      </button>

      {open && anchor ? (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label={label}
          {...stylex.props(
            styles.panel,
            anchor.dropsDown && styles.panelDown,
            styles.panelAt(
              anchor.blockStart,
              anchor.blockEnd,
              anchor.inlineStart,
              anchor.inlineEnd,
              anchor.maxBlock,
              anchor.minWidth,
            ),
          )}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role={item.selected === undefined ? 'menuitem' : 'menuitemradio'}
              aria-checked={item.selected}
              data-menu-item
              tabIndex={-1}
              onClick={() => {
                close(true);
                item.onSelect();
              }}
              {...stylex.props(styles.row)}
            >
              {item.icon ? <span {...stylex.props(styles.rowIcon)}>{item.icon}</span> : null}
              <span {...stylex.props(styles.rowLabel)}>{item.label}</span>
              {item.selected === undefined ? null : (
                <span {...stylex.props(styles.rowCheck)}>
                  {item.selected ? <Icon name="check-fill" size={16} /> : null}
                </span>
              )}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

const styles = stylex.create({
  root: {
    minWidth: 0,
    position: 'relative',
  },
  rootField: {
    width: '100%',
  },
  trigger: {
    alignItems: 'center',
    backgroundColor: {
      default: color.surfaceRaised,
      ':hover': color.surfaceSubtle,
      ':disabled': color.surfaceSubtle,
    },
    borderColor: {
      default: color.border,
      ':hover': color.borderStrong,
    },
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxShadow: shadow.subtle,
    boxSizing: 'border-box',
    color: color.textPrimary,
    cursor: {
      default: 'pointer',
      ':disabled': 'not-allowed',
    },
    display: 'inline-flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    gap: space[2],
    justifyContent: 'space-between',
    lineHeight: text.lineBodySmall,
    minHeight: control.heightMd,
    opacity: {
      ':disabled': 0.55,
    },
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
    paddingBlock: space[1],
    paddingInline: space[2],
    textAlign: 'start',
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'background-color, border-color',
    transitionTimingFunction: motion.ease,
  },
  triggerOpen: {
    backgroundColor: {
      default: color.surfaceSubtle,
      ':hover': color.surfaceSubtle,
    },
    borderColor: color.borderStrong,
  },
  // A square ghost trigger for a lone glyph: the IconButton of menus.
  triggerIconOnly: {
    backgroundColor: {
      default: 'transparent',
      ':hover': color.surfaceSubtle,
      ':disabled': 'transparent',
    },
    borderColor: {
      default: 'transparent',
      ':hover': 'transparent',
    },
    boxShadow: 'none',
    color: {
      default: color.textMuted,
      ':hover': color.textPrimary,
    },
    inlineSize: control.heightMd,
    justifyContent: 'center',
    minHeight: control.heightMd,
    paddingBlock: 0,
    paddingInline: 0,
  },
  triggerIconOnlyOpen: {
    backgroundColor: {
      default: color.surfaceSubtle,
      ':hover': color.surfaceSubtle,
    },
    color: color.textPrimary,
  },
  // The value is the whole control: no fill, no border, no chevron.
  triggerBare: {
    backgroundColor: {
      default: 'transparent',
      ':hover': 'transparent',
      ':disabled': 'transparent',
    },
    borderColor: {
      default: 'transparent',
      ':hover': 'transparent',
    },
    boxShadow: 'none',
    minHeight: 'auto',
    paddingBlock: 0,
    paddingInline: 0,
  },
  // Mirrors the Field control in Field.tsx: sunken ground, focus as an inner
  // accent ring, nothing painted outside the box.
  triggerField: {
    backgroundColor: {
      default: color.surfaceRaised,
      ':hover': color.surfaceRaised,
      ':disabled': color.surfaceSubtle,
    },
    borderColor: {
      default: color.border,
      ':hover': color.borderStrong,
      ':focus': color.accent,
    },
    borderRadius: radius.sm,
    boxShadow: {
      default: 'none',
      ':focus': `inset 0 0 0 ${mesh.line} ${color.accent}`,
    },
    fontSize: text.sizeBody,
    fontWeight: text.weightRegular,
    lineHeight: text.lineBody,
    minHeight: control.heightLg,
    outlineStyle: 'none',
    paddingBlock: space[2],
    paddingInline: space[3],
    width: '100%',
  },
  triggerFieldOpen: {
    borderColor: color.accent,
    boxShadow: `inset 0 0 0 ${mesh.line} ${color.accent}`,
  },
  triggerLabel: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: space[2],
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  triggerIcon: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'inline-flex',
    flexShrink: 0,
  },
  panel: {
    animationDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: `translateY(${space[1]})` },
      to: { opacity: 1, transform: 'translateY(0)' },
    }),
    animationTimingFunction: motion.ease,
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxShadow: shadow.overlay,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: text.familyUi,
    maxInlineSize: control.menuMaxWidth,
    overflowY: 'auto',
    padding: space[1],
    position: 'fixed',
    zIndex: zIndex.menu,
  },
  panelDown: {
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: `translateY(calc(${space[1]} * -1))` },
      to: { opacity: 1, transform: 'translateY(0)' },
    }),
  },
  panelAt: (
    blockStart: string,
    blockEnd: string,
    inlineStart: string,
    inlineEnd: string,
    maxBlock: string,
    minWidth: string,
  ) => ({
    insetBlockEnd: blockEnd,
    insetBlockStart: blockStart,
    insetInlineEnd: inlineEnd,
    insetInlineStart: inlineStart,
    marginBlock: space[1],
    maxBlockSize: maxBlock,
    minInlineSize: minWidth,
  }),
  row: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': color.surfaceSubtle,
    },
    borderRadius: radius.sm,
    borderWidth: 0,
    boxSizing: 'border-box',
    color: color.textPrimary,
    cursor: 'pointer',
    display: 'flex',
    flexShrink: 0,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightRegular,
    gap: space[2],
    lineHeight: text.lineBodySmall,
    minWidth: 0,
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
    paddingBlock: space[2],
    paddingInline: space[2],
    textAlign: 'start',
    width: '100%',
  },
  rowIcon: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    width: space[4],
  },
  rowLabel: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowCheck: {
    alignItems: 'center',
    color: color.accent,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    width: space[4],
  },
});
