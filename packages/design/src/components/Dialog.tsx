import * as stylex from '@stylexjs/stylex';
import { useEffect, useState, type AnimationEvent, type ReactNode } from 'react';
import { breakpoints, control, mesh, motion, zIndex } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';

const styles = stylex.create({
  backdrop: {
    alignItems: 'center',
    animationDuration: {
      default: motion.base,
      [breakpoints.reduceMotion]: '0ms',
    },
    animationName: stylex.keyframes({
      from: { opacity: 0 },
      to: { opacity: 1 },
    }),
    animationTimingFunction: motion.ease,
    backgroundColor: color.scrim,
    display: 'flex',
    inset: 0,
    justifyContent: 'center',
    padding: space[4],
    position: 'fixed',
    zIndex: zIndex.dialog,
  },
  // The close plays faster than the open: the surface earned its entrance,
  // but once dismissed it should get out of the way.
  backdropClosing: {
    animationDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    animationFillMode: 'forwards',
    animationName: stylex.keyframes({
      from: { opacity: 1 },
      to: { opacity: 0 },
    }),
    pointerEvents: 'none',
  },
  panel: {
    animationDuration: {
      default: motion.base,
      [breakpoints.reduceMotion]: '0ms',
    },
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: 'scale(0.96)' },
      to: { opacity: 1, transform: 'scale(1)' },
    }),
    animationTimingFunction: motion.ease,
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    fontFamily: text.familyUi,
    maxWidth: space.prose,
    overflow: 'hidden',
    width: '100%',
  },
  panelClosing: {
    animationDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    animationFillMode: 'forwards',
    animationName: stylex.keyframes({
      from: { opacity: 1, transform: 'scale(1)' },
      to: { opacity: 0, transform: 'scale(0.96)' },
    }),
  },
  // A backdrop click the dialog refuses to honour: the panel swells briefly
  // to say "I heard you, but you have to answer me".
  panelNudge: {
    animationDuration: {
      default: motion.base,
      [breakpoints.reduceMotion]: '0ms',
    },
    animationName: stylex.keyframes({
      '0%': { transform: 'scale(1)' },
      '50%': { transform: 'scale(1.05)' },
      '100%': { transform: 'scale(1)' },
    }),
    animationTimingFunction: motion.ease,
  },
  header: {
    alignItems: 'center',
    display: 'flex',
    gap: space[4],
    justifyContent: 'space-between',
    paddingBlockStart: space[4],
    paddingInline: space[4],
  },
  title: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightBold,
    lineHeight: text.lineBodySmall,
    margin: 0,
  },
  close: {
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': color.surfaceSubtle,
    },
    borderRadius: radius.sm,
    borderWidth: 0,
    color: {
      default: color.textMuted,
      ':hover': color.textPrimary,
    },
    cursor: 'pointer',
    display: 'flex',
    flexShrink: 0,
    height: space[5],
    justifyContent: 'center',
    marginInlineEnd: `calc(${space[1]} * -1)`,
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
    padding: 0,
    width: space[5],
  },
  body: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[4],
    paddingBlockEnd: space[5],
    paddingBlockStart: space[4],
    paddingInline: space[4],
  },
  footer: {
    backgroundColor: color.surfaceSubtle,
    borderColor: color.border,
    borderStyle: 'solid',
    borderWidth: 0,
    borderTopWidth: mesh.line,
    display: 'flex',
    gap: space[2],
    justifyContent: 'flex-end',
    paddingBlock: space[4],
    paddingInline: space[4],
  },
});

export function Dialog({
  title,
  children,
  onClose,
  open,
  actions,
  closeable = true,
  closeOnBackdrop = true,
}: {
  title?: string;
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  actions?: ReactNode;
  closeable?: boolean;
  /**
   * Whether a click on the backdrop dismisses the dialog. When false (or when
   * the dialog is not closeable), the click nudges the panel instead —
   * a scale pulse that points the user back at the dialog.
   */
  closeOnBackdrop?: boolean;
}) {
  // Closing plays an exit animation before the dialog unmounts: `closing`
  // keeps it mounted from the moment `open` flips false until the panel's
  // animation finishes. Reopening mid-exit cancels the exit. The flip is
  // detected during render so no extra effect pass is needed.
  const [closing, setClosing] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    setClosing(!open && prevOpen);
  }

  // Clearing `nudged` on animationend is what lets the next refused click
  // replay the pulse: the style has to leave the panel before it can return.
  const [nudged, setNudged] = useState(false);

  function onPanelAnimationEnd(event: AnimationEvent<HTMLDivElement>) {
    // Children animate too (spinners, skeletons); only the panel's own exit
    // animation may unmount the dialog.
    if (event.target === event.currentTarget) {
      setClosing(false);
      setNudged(false);
    }
  }

  // Escape has to be caught on the document. The backdrop is a div with
  // role="presentation" and no tabIndex, so it never receives key events and an
  // onKeyDown there would never fire.
  useEffect(() => {
    if (!open || !closeable) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, closeable, onClose]);

  if (!open && !closing) {
    return null;
  }

  const hasHeader = title != null || closeable;

  return (
    // Clicking the backdrop dismisses the dialog — or, when dismissal is
    // refused, nudges the panel. A click that landed on the panel is ignored,
    // which is why the panel needs no handler of its own. There is
    // deliberately no keyboard equivalent here: keyboard users press Escape,
    // handled on the document by the effect above.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      {...stylex.props(styles.backdrop, closing && styles.backdropClosing)}
      role="presentation"
      onClick={(event) => {
        if (event.target !== event.currentTarget) {
          return;
        }
        if (closeable && closeOnBackdrop) {
          onClose();
        } else {
          setNudged(true);
        }
      }}
    >
      <div
        {...stylex.props(styles.panel, nudged && styles.panelNudge, closing && styles.panelClosing)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title != null ? 'dialog-title' : undefined}
        onAnimationEnd={onPanelAnimationEnd}
      >
        {hasHeader ? (
          <div {...stylex.props(styles.header)}>
            {title != null ? (
              <h2 id="dialog-title" {...stylex.props(styles.title)}>
                {title}
              </h2>
            ) : (
              <span />
            )}
            {closeable ? (
              <button
                type="button"
                aria-label="Close"
                onClick={onClose}
                {...stylex.props(styles.close)}
              >
                <Icon name="close-fill" size={16} />
              </button>
            ) : null}
          </div>
        ) : null}
        <div {...stylex.props(styles.body)}>{children}</div>
        {actions != null ? <div {...stylex.props(styles.footer)}>{actions}</div> : null}
      </div>
    </div>
  );
}
