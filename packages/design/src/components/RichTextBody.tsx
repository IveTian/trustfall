import '../richtext.css';
import * as stylex from '@stylexjs/stylex';
import MarkdownIt from 'markdown-it';
import { color } from '../tokens/color.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

// Raw HTML in a body never passes through: markdown is the only voice an
// update speaks in, whoever wrote it.
const md = new MarkdownIt({ html: false, linkify: true });

const openInNewTab = md.renderer.rules.link_open;
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  tokens[idx]!.attrSet('target', '_blank');
  tokens[idx]!.attrSet('rel', 'noopener noreferrer');
  return openInNewTab
    ? openInNewTab(tokens, idx, options, env, self)
    : self.renderToken(tokens, idx, options);
};

const styles = stylex.create({
  root: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeBody,
    lineHeight: text.lineBody,
  },
  small: {
    fontSize: text.sizeBodySmall,
    lineHeight: text.lineBodySmall,
  },
  muted: {
    color: color.textMuted,
  },
});

/** A markdown body, rendered with the limited grammar the editor writes. */
export function RichTextBody({
  markdown,
  size = 'body',
  muted = false,
}: {
  markdown: string;
  size?: 'body' | 'small';
  muted?: boolean;
}) {
  const { className, style } = stylex.props(
    styles.root,
    size === 'small' && styles.small,
    muted && styles.muted,
  );
  return (
    <div
      className={`tf-prose${className ? ` ${className}` : ''}`}
      style={style}
      // Safe by construction: markdown-it runs with html:false, so the only
      // markup here is what the renderer itself emits.
      dangerouslySetInnerHTML={{ __html: md.render(markdown) }}
    />
  );
}
