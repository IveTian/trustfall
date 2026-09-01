import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { control, mesh, zIndex } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';

/**
 * The bar every console screen wears: a product-mark chip, a breadcrumb whose
 * last segment names the page, and that page's actions on the end edge. It
 * sticks to the top of the shell panel, so the trail and the actions survive
 * scrolling.
 *
 * The last trail segment is the page's `<h1>`. It is small on purpose — the
 * console announces where you are, it does not shout it.
 */
export function PageHeader({
  icon,
  trail,
  actions,
}: {
  icon?: string;
  trail: string[];
  actions?: ReactNode;
}) {
  const last = trail.length - 1;
  return (
    <header {...stylex.props(styles.header)}>
      <div {...stylex.props(styles.trail)}>
        {icon ? (
          <span {...stylex.props(styles.mark)}>
            <Icon name={icon} size={16} />
          </span>
        ) : null}
        {trail.map((segment, index) => (
          <span key={segment} {...stylex.props(styles.segment)}>
            {index > 0 ? (
              <span {...stylex.props(styles.separator)}>
                <Icon name="arrow-right-s-fill" size={16} />
              </span>
            ) : null}
            {index === last ? (
              <h1 {...stylex.props(styles.current)}>{segment}</h1>
            ) : (
              <span {...stylex.props(styles.ancestor)}>{segment}</span>
            )}
          </span>
        ))}
      </div>
      {actions ? <div {...stylex.props(styles.actions)}>{actions}</div> : null}
    </header>
  );
}

/** The scrolling column under the header: page gutters and one max measure. */
export function PageBody({ children }: { children: ReactNode }) {
  return <div {...stylex.props(styles.body)}>{children}</div>;
}

const styles = stylex.create({
  // The bar runs the full width of the panel: no measure, no centring. The
  // page's own content keeps its measure below.
  header: {
    alignItems: 'center',
    backgroundColor: color.surfaceRaised,
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: mesh.line,
    boxSizing: 'border-box',
    display: 'flex',
    flexShrink: 0,
    gap: space[3],
    insetBlockStart: 0,
    justifyContent: 'space-between',
    minBlockSize: control.headerHeight,
    paddingBlock: space[2],
    paddingInline: space[3],
    position: 'sticky',
    zIndex: zIndex.header,
  },
  trail: {
    alignItems: 'center',
    display: 'flex',
    gap: space[2],
    minWidth: 0,
  },
  mark: {
    alignItems: 'center',
    backgroundColor: color.solid,
    blockSize: control.markSize,
    borderRadius: radius.sm,
    color: color.textInverse,
    display: 'flex',
    flexShrink: 0,
    inlineSize: control.markSize,
    justifyContent: 'center',
  },
  segment: {
    alignItems: 'center',
    display: 'flex',
    gap: space[2],
    minWidth: 0,
  },
  separator: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
    flexShrink: 0,
  },
  ancestor: {
    color: color.textMuted,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    lineHeight: text.lineBodySmall,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  current: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
    margin: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  actions: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    gap: space[2],
  },
  body: {
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    flexGrow: 1,
    marginInline: 'auto',
    maxWidth: control.contentWidth,
    paddingBlock: space[5],
    paddingInline: space.gutter,
    width: '100%',
  },
});
