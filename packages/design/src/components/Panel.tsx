import * as stylex from '@stylexjs/stylex';
import type { ReactNode } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { mesh } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

/**
 * A hairline container for a list of like things. Rows are full-bleed and
 * divided by the same hairline that draws the container, so a group of rows
 * reads as one object rather than a stack of cards.
 */
export function Panel({ children }: { children: ReactNode }) {
  return <section {...stylex.props(styles.panel)}>{children}</section>;
}

export function PanelHeader({
  title,
  caption,
  actions,
}: {
  title: string;
  caption?: string;
  actions?: ReactNode;
}) {
  return (
    <div {...stylex.props(styles.header)}>
      <div {...stylex.props(styles.headerCopy)}>
        <h2 {...stylex.props(styles.title)}>{title}</h2>
        {caption ? <p {...stylex.props(styles.caption)}>{caption}</p> : null}
      </div>
      {actions ? <div {...stylex.props(styles.actions)}>{actions}</div> : null}
    </div>
  );
}

export function PanelList({ children }: { children: ReactNode }) {
  return <ul {...stylex.props(styles.list)}>{children}</ul>;
}

/**
 * One row: what it is on the start edge, the single control that changes it on
 * the end edge. The name runs at chrome size, not body size — a list of forty
 * components should read as a list, not as forty headings.
 */
export function PanelRow({
  title,
  description,
  end,
}: {
  title: string;
  description?: ReactNode;
  end?: ReactNode;
}) {
  return (
    <li {...stylex.props(styles.row)}>
      <div {...stylex.props(styles.rowCopy)}>
        <span {...stylex.props(styles.rowTitle)}>{title}</span>
        {description ? <span {...stylex.props(styles.rowDescription)}>{description}</span> : null}
      </div>
      {end ? <div {...stylex.props(styles.rowEnd)}>{end}</div> : null}
    </li>
  );
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
  header: {
    alignItems: 'center',
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: mesh.line,
    display: 'flex',
    gap: space[3],
    justifyContent: 'space-between',
    paddingBlock: space[3],
    paddingInline: space[4],
  },
  headerCopy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[1],
    minWidth: 0,
  },
  title: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeBody,
    fontWeight: text.weightBold,
    lineHeight: text.lineBody,
    margin: 0,
  },
  caption: {
    color: color.textMuted,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    lineHeight: text.lineBodySmall,
    margin: 0,
  },
  actions: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    gap: space[2],
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  row: {
    alignItems: 'center',
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: {
      default: mesh.line,
      ':last-child': 0,
    },
    display: 'flex',
    gap: space[3],
    justifyContent: 'space-between',
    paddingBlock: space[3],
    paddingInline: space[4],
  },
  rowCopy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[0],
    minWidth: 0,
  },
  rowTitle: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
  },
  rowDescription: {
    color: color.textMuted,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    lineHeight: text.lineBodySmall,
  },
  rowEnd: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    gap: space[2],
  },
});
