import * as stylex from '@stylexjs/stylex';
import { useState } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return '?';
  }
  const first = [...parts[0]!][0] ?? '';
  const last = parts.length > 1 ? ([...parts.at(-1)!][0] ?? '') : '';
  return `${first}${last}`.toUpperCase();
}

/**
 * A person, as a picture or as their initials. The picture is optional and
 * allowed to fail — a Gravatar URL asked for a 404 when no picture is
 * registered — in which case the initials take over rather than a broken
 * image glyph. Decorative: the name is always written out beside it.
 */
export function Avatar({ name, image }: { name: string; image?: string | null }) {
  const [failed, setFailed] = useState(false);
  // A new URL gets a fresh chance; the failure belonged to the previous one.
  const [prevImage, setPrevImage] = useState(image);
  if (image !== prevImage) {
    setPrevImage(image);
    setFailed(false);
  }

  if (image && !failed) {
    return (
      <img
        src={image}
        alt=""
        onError={() => setFailed(true)}
        {...stylex.props(styles.avatar, styles.image)}
      />
    );
  }
  return (
    <span aria-hidden {...stylex.props(styles.avatar, styles.initials)}>
      {initials(name)}
    </span>
  );
}

const styles = stylex.create({
  avatar: {
    blockSize: space[6],
    borderRadius: radius.pill,
    boxSizing: 'border-box',
    flexShrink: 0,
    inlineSize: space[6],
  },
  image: {
    objectFit: 'cover',
  },
  initials: {
    alignItems: 'center',
    backgroundColor: color.accentMuted,
    color: color.accent,
    display: 'flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeCaption,
    fontWeight: text.weightMedium,
    justifyContent: 'center',
    lineHeight: text.lineCaption,
  },
});
