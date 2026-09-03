import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';

export type CardKindName = 'incident' | 'maintenance';

const KINDS: Record<CardKindName, { icon: string; label: string }> = {
  incident: { icon: 'alarm-warning-line', label: 'Incident' },
  maintenance: { icon: 'tools-line', label: 'Maintenance' },
};

/**
 * The eyebrow over a public card's title naming what the card is. Incidents
 * and maintenances share one layout and, once over, one green pill, so in a
 * list that mixes them — the Overview's recent events — the word and glyph
 * are what tell them apart at a glance.
 */
export function CardKind({ kind }: { kind: CardKindName }) {
  const { icon, label } = KINDS[kind];
  return (
    <span {...stylex.props(styles.kind)}>
      <Icon name={icon} size={14} />
      {label}
    </span>
  );
}

const styles = stylex.create({
  kind: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'inline-flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeCaption,
    fontWeight: text.weightMedium,
    gap: space[1],
    letterSpacing: '0.02em',
    lineHeight: text.lineCaption,
    textTransform: 'uppercase',
  },
});
