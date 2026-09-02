import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { mesh } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

export type DiffLine = {
  kind: 'removed' | 'added' | 'context';
  text: string;
};

/**
 * A change, spoken in diff: red lines leave, green lines arrive, context
 * lines stand still. For review screens where "what exactly will this do"
 * deserves a sharper answer than prose.
 */
export function DiffBlock({ lines }: { lines: DiffLine[] }) {
  return (
    <div {...stylex.props(styles.block)}>
      {lines.map((line, index) => (
        <div
          // Diffs are positional; there is nothing more stable to key on.
          key={`${index}-${line.kind}`}
          {...stylex.props(
            styles.line,
            line.kind === 'removed' && styles.removed,
            line.kind === 'added' && styles.added,
          )}
        >
          <span {...stylex.props(styles.sign)}>
            {line.kind === 'removed' ? '-' : line.kind === 'added' ? '+' : ' '}
          </span>
          {line.text}
        </div>
      ))}
    </div>
  );
}

const styles = stylex.create({
  block: {
    borderColor: color.border,
    borderRadius: radius.sm,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    overflow: 'hidden',
  },
  line: {
    color: color.textPrimary,
    display: 'flex',
    fontFamily: text.familyMono,
    fontSize: text.sizeCaption,
    gap: space[2],
    lineHeight: text.lineCaption,
    paddingBlock: space[1],
    paddingInline: space[2],
    whiteSpace: 'pre-wrap',
  },
  removed: {
    backgroundColor: color.majorOutageMuted,
    color: color.majorOutage,
  },
  added: {
    backgroundColor: color.operationalMuted,
    color: color.operational,
  },
  sign: {
    flexShrink: 0,
    userSelect: 'none',
    width: '1ch',
  },
});
