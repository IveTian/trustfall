import * as stylex from '@stylexjs/stylex';
import { useEffect, type ReactNode } from 'react';
import { control, mesh, zIndex } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';

const styles = stylex.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: color.scrim,
    display: 'flex',
    inset: 0,
    justifyContent: 'center',
    padding: space[4],
    position: 'fixed',
    zIndex: zIndex.dialog,
  },
  panel: {
    backgroundColor: color.surfaceRaised,
    borderRadius: radius.md,
    fontFamily: text.familyUi,
    maxWidth: space.prose,
    overflow: 'hidden',
    width: '100%',
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
}: {
  title?: string;
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  actions?: ReactNode;
  closeable?: boolean;
}) {
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

  if (!open) {
    return null;
  }

  const hasHeader = title != null || closeable;

  return (
    // Clicking the backdrop dismisses the dialog; a click that landed on the
    // panel is ignored, which is why the panel needs no handler of its own.
    // There is deliberately no keyboard equivalent here: keyboard users press
    // Escape, handled on the document by the effect above.
    // oxlint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions
    <div
      {...stylex.props(styles.backdrop)}
      role="presentation"
      onClick={
        closeable
          ? (event) => {
              if (event.target === event.currentTarget) {
                onClose();
              }
            }
          : undefined
      }
    >
      <div
        {...stylex.props(styles.panel)}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title != null ? 'dialog-title' : undefined}
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
