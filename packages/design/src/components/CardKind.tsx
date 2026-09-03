import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { Badge } from './Badge.tsx';
import { Icon } from './Icon.tsx';
import type { IconName } from '@trustfall/icon';

export type CardKindName = 'incident' | 'maintenance';

const KINDS: Record<CardKindName, { icon: IconName; label: string }> = {
  incident: { icon: 'siren', label: 'Incident' },
  maintenance: { icon: 'tools', label: 'Maintenance' },
};

/**
 * The first pill at a public card's foot, naming what the card is. Incidents
 * and maintenances share one layout and, once over, one green status pill,
 * so in a list that mixes them — the Overview's recent events — this is what
 * tells them apart at a glance. Neutral like the other pills' badge, with the
 * glyph in the muted ink rather than a status tone.
 */
export function CardKind({ kind }: { kind: CardKindName }) {
  const { icon, label } = KINDS[kind];
  return (
    <span {...stylex.props(styles.pill)}>
      <Badge>
        <span {...stylex.props(styles.glyph)}>
          <Icon name={icon} size={14} />
        </span>
        {label}
      </Badge>
    </span>
  );
}

const styles = stylex.create({
  pill: {
    alignItems: 'center',
    display: 'inline-flex',
    gap: space[1],
  },
  glyph: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'inline-flex',
  },
});
