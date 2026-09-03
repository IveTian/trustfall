import * as stylex from '@stylexjs/stylex';
import type { IconName } from '@trustfall/icon';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { mesh } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';

/**
 * The one place this design raises its voice. It names what is missing, says
 * what it will do for you, and offers a single way to start; the surrounding
 * air is the point, so it fills the column it is given.
 */
export function EmptyState({
  icon,
  title,
  description,
  actions,
}: {
  icon?: IconName;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.wrap)}>
      {icon ? (
        <span {...stylex.props(styles.mark)}>
          <Icon name={icon} size={20} />
        </span>
      ) : null}
      <h2 {...stylex.props(styles.title)}>{title}</h2>
      {description ? <p {...stylex.props(styles.description)}>{description}</p> : null}
      {actions ? <div {...stylex.props(styles.actions)}>{actions}</div> : null}
    </div>
  );
}

const styles = stylex.create({
  wrap: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    gap: space[4],
    justifyContent: 'center',
    paddingBlock: space[8],
    textAlign: 'center',
  },
  mark: {
    alignItems: 'center',
    backgroundColor: color.surfaceSubtle,
    blockSize: space[7],
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    color: color.textMuted,
    display: 'flex',
    inlineSize: space[7],
    justifyContent: 'center',
  },
  title: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeHeadline,
    fontWeight: text.weightBold,
    letterSpacing: text.trackingDisplay,
    lineHeight: text.lineHeadline,
    margin: 0,
  },
  description: {
    color: color.textMuted,
    fontFamily: text.familyUi,
    fontSize: text.sizeBody,
    lineHeight: text.lineBody,
    margin: 0,
    maxWidth: '38ch',
  },
  actions: {
    alignItems: 'center',
    display: 'flex',
    gap: space[2],
  },
});
