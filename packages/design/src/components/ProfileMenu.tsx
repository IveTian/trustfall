import * as stylex from '@stylexjs/stylex';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { aimsAtSubmenu, SAFE_TRIANGLE_GRACE_MS, type Point } from '../safe-triangle.ts';
import { applyTheme, readTheme, type ThemePreference } from '../theme-script.ts';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, mesh, motion, zIndex } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';

const THEME_OPTIONS: Array<{ id: ThemePreference; label: string; icon: string }> = [
  { id: 'system', label: 'System', icon: 'computer-line' },
  { id: 'light', label: 'Light', icon: 'sun-line' },
  { id: 'dark', label: 'Dark', icon: 'moon-line' },
];

export type ProfileMenuItem = {
  id: string;
  label: string;
  icon?: string;
  onSelect: () => void;
};

type MenuAnchor = { inlineStart: string; blockEnd: string; minWidth: string };
type SubmenuAnchor = { inlineStart: string; blockStart: string };

function isRtl(element: HTMLElement): boolean {
  return getComputedStyle(element).direction === 'rtl';
}

/**
 * Both panels are `position: fixed` so the sidebar's own `overflow: auto`
 * cannot clip them; that costs a measurement against the viewport.
 */
function measureMenu(trigger: HTMLElement): MenuAnchor {
  const rect = trigger.getBoundingClientRect();
  return {
    inlineStart: `${isRtl(trigger) ? window.innerWidth - rect.right : rect.left}px`,
    blockEnd: `${window.innerHeight - rect.top}px`,
    minWidth: `${rect.width}px`,
  };
}

/** The submenu hangs off the menu's inline end, its first item level with the row. */
function measureSubmenu(row: HTMLElement, panel: HTMLElement): SubmenuAnchor {
  const rowRect = row.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  return {
    inlineStart: `${isRtl(row) ? window.innerWidth - panelRect.left : panelRect.right}px`,
    blockStart: `${rowRect.top}px`,
  };
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = [...parts[0]!][0] ?? '';
  const last = parts.length > 1 ? ([...parts.at(-1)!][0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

function Avatar({ name, image }: { name: string; image?: string | null }) {
  if (image) {
    return <img src={image} alt="" {...stylex.props(styles.avatar, styles.avatarImage)} />;
  }
  return (
    <span aria-hidden {...stylex.props(styles.avatar, styles.avatarInitials)}>
      {initials(name)}
    </span>
  );
}

/**
 * Account picker for the foot of the sidebar: identity, an Appearance submenu,
 * and the account actions the app passes in. Opens on click, closes on Escape,
 * outside click, or Tab; arrow keys walk the items and open the submenu. The
 * submenu follows the pointer's aim, not the row under it — see
 * `safe-triangle.ts`.
 */
export function ProfileMenu({
  name,
  email,
  image,
  items = [],
}: {
  name: string;
  email?: string;
  image?: string | null;
  items?: ProfileMenuItem[];
}) {
  const menuId = useId();
  const submenuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const appearanceRef = useRef<HTMLButtonElement>(null);
  const focusOnOpen = useRef(false);
  const focusSubmenuOnOpen = useRef(false);
  // Safe-triangle state: where the pointer last sat on the Appearance row, and
  // the deferred close that is waiting to see whether it arrives.
  const aimOriginRef = useRef<Point | null>(null);
  const aimTimerRef = useRef<number | null>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<MenuAnchor | null>(null);
  const [submenuAnchor, setSubmenuAnchor] = useState<SubmenuAnchor | null>(null);
  const [theme, setTheme] = useState<ThemePreference>('system');
  const [submenuOpen, setSubmenuOpen] = useState(false);

  // Reposition while open: the sidebar scrolls, and both panels are fixed.
  useEffect(() => {
    const trigger = triggerRef.current;
    if (!open || !trigger) {
      return;
    }
    const place = () => {
      setAnchor(measureMenu(trigger));
      const row = appearanceRef.current;
      const panel = panelRef.current;
      if (row && panel) {
        setSubmenuAnchor(measureSubmenu(row, panel));
      }
    };
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  // A pending close must not outlive the component.
  useEffect(
    () => () => {
      if (aimTimerRef.current !== null) {
        window.clearTimeout(aimTimerRef.current);
      }
    },
    [],
  );

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        cancelDeferredClose();
        setOpen(false);
        setSubmenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keyboard activation of the trigger lands on the first item; a mouse click
  // leaves focus where the pointer put it.
  useEffect(() => {
    if (open && focusOnOpen.current) {
      focusOnOpen.current = false;
      focusItemAt(panelRef.current, 0);
    }
  }, [open]);

  // Same for the submenu: an effect runs after the commit that paints it, which
  // a rAF scheduled inside the handler does not reliably do.
  useEffect(() => {
    if (submenuOpen && focusSubmenuOnOpen.current) {
      focusSubmenuOnOpen.current = false;
      focusItemAt(submenuRef.current, 0);
    }
  }, [submenuOpen]);

  function itemsIn(scope: HTMLElement | null): HTMLElement[] {
    return Array.from(scope?.querySelectorAll<HTMLElement>('[data-menu-item]') ?? []);
  }

  function focusItemAt(scope: HTMLElement | null, index: number) {
    const nodes = itemsIn(scope);
    if (nodes.length === 0) {
      return;
    }
    nodes[((index % nodes.length) + nodes.length) % nodes.length]?.focus();
  }

  function openMenu(fromKeyboard: boolean) {
    const trigger = triggerRef.current;
    if (!trigger) {
      return;
    }
    focusOnOpen.current = fromKeyboard;
    setAnchor(measureMenu(trigger));
    setTheme(readTheme());
    setOpen(true);
  }

  function close(restoreFocus: boolean) {
    cancelDeferredClose();
    setOpen(false);
    setSubmenuOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }

  function openSubmenu(fromKeyboard: boolean) {
    const row = appearanceRef.current;
    const panel = panelRef.current;
    if (!row || !panel) {
      return;
    }
    focusSubmenuOnOpen.current = fromKeyboard;
    setSubmenuAnchor(measureSubmenu(row, panel));
    setSubmenuOpen(true);
  }

  function closeSubmenu() {
    cancelDeferredClose();
    const hadFocus = submenuRef.current?.contains(document.activeElement) ?? false;
    setSubmenuOpen(false);
    if (hadFocus) {
      appearanceRef.current?.focus();
    }
  }

  function cancelDeferredClose() {
    if (aimTimerRef.current !== null) {
      window.clearTimeout(aimTimerRef.current);
      aimTimerRef.current = null;
    }
  }

  /**
   * Re-armed by every move that stays inside the triangle, so it only ever
   * fires for a pointer that stopped there: travel keeps the submenu, parking
   * over another row hands it back.
   */
  function deferCloseWhileAiming() {
    cancelDeferredClose();
    aimTimerRef.current = window.setTimeout(() => {
      aimTimerRef.current = null;
      closeSubmenu();
    }, SAFE_TRIANGLE_GRACE_MS);
  }

  /**
   * One handler for the whole panel: rows, header, separators and the panel's
   * own padding all report the same thing — where the pointer is and whether it
   * is still headed for the submenu.
   */
  function onPanelPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const point: Point = { x: event.clientX, y: event.clientY };
    if (appearanceRef.current?.contains(event.target as Node)) {
      aimOriginRef.current = point;
      cancelDeferredClose();
      return;
    }
    if (!submenuOpen) {
      return;
    }
    const origin = aimOriginRef.current;
    const submenu = submenuRef.current;
    if (
      origin &&
      submenu &&
      aimsAtSubmenu(origin, point, submenu.getBoundingClientRect(), isRtl(event.currentTarget))
    ) {
      deferCloseWhileAiming();
      return;
    }
    closeSubmenu();
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) {
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        openMenu(true);
      }
      return;
    }

    const inSubmenu = submenuRef.current?.contains(document.activeElement) ?? false;
    const rtl = rootRef.current ? isRtl(rootRef.current) : false;
    const openKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    const closeKey = rtl ? 'ArrowRight' : 'ArrowLeft';

    if (event.key === 'Escape') {
      event.preventDefault();
      if (inSubmenu || submenuOpen) {
        closeSubmenu();
      } else {
        close(true);
      }
      return;
    }
    if (event.key === 'Tab') {
      close(false);
      return;
    }
    if (event.key === openKey && !inSubmenu && document.activeElement === appearanceRef.current) {
      event.preventDefault();
      openSubmenu(true);
      return;
    }
    if (event.key === closeKey && inSubmenu) {
      event.preventDefault();
      closeSubmenu();
      return;
    }
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') {
      return;
    }
    event.preventDefault();
    const scope = inSubmenu ? submenuRef.current : panelRef.current;
    const nodes = itemsIn(scope);
    const index = nodes.indexOf(document.activeElement as HTMLElement);
    const step = event.key === 'ArrowDown' ? 1 : -1;
    focusItemAt(scope, index === -1 ? (step === 1 ? 0 : -1) : index + step);
  }

  const current = THEME_OPTIONS.find((option) => option.id === theme) ?? THEME_OPTIONS[0]!;

  return (
    // The handler is on the wrapper so Escape works whether focus sits on the
    // trigger (opened by mouse), in the menu, or in the submenu.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div ref={rootRef} onKeyDown={onKeyDown} {...stylex.props(styles.root)}>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(event) => {
          if (open) {
            close(false);
          } else {
            openMenu(event.detail === 0);
          }
        }}
        {...stylex.props(styles.trigger, open && styles.triggerOpen)}
      >
        <Avatar name={name} image={image} />
        <span {...stylex.props(styles.identity)}>
          <span {...stylex.props(styles.name)}>{name}</span>
          {email ? <span {...stylex.props(styles.email)}>{email}</span> : null}
        </span>
        <span {...stylex.props(styles.trailingIcon)}>
          <Icon name="expand-up-down-line" size={16} />
        </span>
      </button>

      {open && anchor ? (
        <div
          ref={panelRef}
          id={menuId}
          role="menu"
          aria-label="Account"
          // Hovering the Appearance row opens the submenu and fixes the apex of
          // the triangle; leaving the row does not necessarily close anything,
          // which is `onPointerMove`'s call.
          onPointerOver={(event) => {
            if (appearanceRef.current?.contains(event.target as Node)) {
              aimOriginRef.current = { x: event.clientX, y: event.clientY };
              cancelDeferredClose();
              if (!submenuOpen) {
                openSubmenu(false);
              }
            }
          }}
          onPointerMove={onPanelPointerMove}
          {...stylex.props(
            styles.panel,
            styles.menuAt(anchor.inlineStart, anchor.blockEnd, anchor.minWidth),
          )}
        >
          <div {...stylex.props(styles.header)}>
            <Avatar name={name} image={image} />
            <span {...stylex.props(styles.identity)}>
              <span {...stylex.props(styles.name)}>{name}</span>
              {email ? <span {...stylex.props(styles.email)}>{email}</span> : null}
            </span>
          </div>

          <div {...stylex.props(styles.separator)} />

          <button
            ref={appearanceRef}
            type="button"
            role="menuitem"
            data-menu-item
            tabIndex={-1}
            aria-haspopup="menu"
            aria-expanded={submenuOpen}
            aria-controls={submenuOpen ? submenuId : undefined}
            onClick={() => (submenuOpen ? closeSubmenu() : openSubmenu(false))}
            {...stylex.props(styles.row, submenuOpen && styles.rowOpen)}
          >
            <span {...stylex.props(styles.rowIcon)}>
              <Icon name="contrast-2-line" size={16} />
            </span>
            <span {...stylex.props(styles.rowLabel)}>Appearance</span>
            <span {...stylex.props(styles.rowValue)}>{current.label}</span>
            <span {...stylex.props(styles.rowIcon, styles.rowIconForward)}>
              <Icon name="arrow-right-s-line" size={16} />
            </span>
          </button>

          {items.length > 0 ? (
            <>
              <div {...stylex.props(styles.separator)} />
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="menuitem"
                  data-menu-item
                  tabIndex={-1}
                  onClick={() => {
                    close(true);
                    item.onSelect();
                  }}
                  {...stylex.props(styles.row)}
                >
                  {item.icon ? (
                    <span {...stylex.props(styles.rowIcon)}>
                      <Icon name={item.icon} size={16} />
                    </span>
                  ) : null}
                  <span {...stylex.props(styles.rowLabel)}>{item.label}</span>
                </button>
              ))}
            </>
          ) : null}
        </div>
      ) : null}

      {open && submenuOpen && submenuAnchor ? (
        <div
          ref={submenuRef}
          id={submenuId}
          role="menu"
          aria-label="Appearance"
          // The pointer made it: whatever close was waiting on the triangle is
          // moot, and this panel keeps the submenu open on its own.
          onPointerEnter={cancelDeferredClose}
          {...stylex.props(
            styles.panel,
            styles.submenu,
            styles.submenuAt(submenuAnchor.inlineStart, submenuAnchor.blockStart),
          )}
        >
          {THEME_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              role="menuitemradio"
              aria-checked={option.id === theme}
              data-menu-item
              tabIndex={-1}
              onClick={() => {
                setTheme(option.id);
                applyTheme(option.id);
              }}
              {...stylex.props(styles.row)}
            >
              <span {...stylex.props(styles.rowIcon)}>
                <Icon name={option.icon} size={16} />
              </span>
              <span {...stylex.props(styles.rowLabel)}>{option.label}</span>
              <span {...stylex.props(styles.rowIcon, styles.rowIconAccent)}>
                {option.id === theme ? <Icon name="check-line" size={16} /> : null}
              </span>
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
  trigger: {
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
    fontFamily: text.familyUi,
    gap: space[2],
    marginInline: `calc(${space[2]} * -1)`,
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
    paddingBlock: space[1],
    paddingInline: space[2],
    textAlign: 'start',
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'background-color',
    transitionTimingFunction: motion.ease,
    width: `calc(100% + ${space[4]})`,
  },
  triggerOpen: {
    backgroundColor: {
      default: color.surfaceSunken,
      ':hover': color.surfaceSunken,
    },
  },
  avatar: {
    blockSize: space[6],
    borderRadius: radius.pill,
    boxSizing: 'border-box',
    flexShrink: 0,
    inlineSize: space[6],
  },
  avatarImage: {
    objectFit: 'cover',
  },
  avatarInitials: {
    alignItems: 'center',
    backgroundColor: color.accentMuted,
    color: color.accent,
    display: 'flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeCaption,
    fontWeight: text.weightBold,
    justifyContent: 'center',
    lineHeight: text.lineCaption,
  },
  identity: {
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    minWidth: 0,
  },
  name: {
    color: color.textPrimary,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  email: {
    color: color.textMuted,
    fontSize: text.sizeCaption,
    lineHeight: text.lineCaption,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  trailingIcon: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
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
    boxShadow: shadow.raised,
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
  menuAt: (inlineStart: string, blockEnd: string, minWidth: string) => ({
    insetBlockEnd: blockEnd,
    insetInlineStart: inlineStart,
    marginBlockEnd: space[2],
    minInlineSize: minWidth,
  }),
  submenu: {
    animationName: stylex.keyframes({
      from: { opacity: 0 },
      to: { opacity: 1 },
    }),
    // Pull the panel's own padding back so the first option sits level with the
    // Appearance row it belongs to.
    marginBlockStart: `calc(${space[1]} * -1)`,
    marginInlineStart: space[1],
  },
  submenuAt: (inlineStart: string, blockStart: string) => ({
    insetBlockStart: blockStart,
    insetInlineStart: inlineStart,
    maxBlockSize: `calc(100dvh - ${blockStart} - ${space[5]})`,
  }),
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: space[2],
    minWidth: 0,
    paddingBlock: space[2],
    paddingInline: space[2],
  },
  separator: {
    backgroundColor: color.border,
    blockSize: mesh.line,
    flexShrink: 0,
    marginBlock: space[1],
  },
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
  rowOpen: {
    backgroundColor: {
      default: color.surfaceSubtle,
      ':hover': color.surfaceSubtle,
    },
  },
  rowIcon: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
    flexShrink: 0,
    justifyContent: 'center',
    width: space[4],
  },
  rowIconAccent: {
    color: color.accent,
  },
  rowIconForward: {
    marginInlineEnd: `calc(${space[1]} * -1)`,
  },
  rowLabel: {
    flexGrow: 1,
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowValue: {
    color: color.textMuted,
    flexShrink: 0,
    fontSize: text.sizeCaption,
    lineHeight: text.lineCaption,
  },
});
