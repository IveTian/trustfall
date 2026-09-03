import * as stylex from '@stylexjs/stylex';
import type { ComponentStatus } from '@trustfall/shared';
import { useEffect, useState } from 'react';
import { bindSiteShells } from '../site-shell-runtime.ts';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, motion } from '../tokens/const.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import type { PublicComponent } from './ComponentGroupSection.tsx';
import { ComponentRow } from './ComponentRow.tsx';
import { Icon } from './Icon.tsx';
import { SiteGroup, SitePanel } from './SiteShell.tsx';
import { StatusPill } from './StatusPill.tsx';

export type PublicServiceGroup = {
  id: string;
  displayName: string;
  /** The group's status as a whole: its worst service. */
  status: ComponentStatus;
  components: PublicComponent[];
};

/**
 * The Status page's tree, in the console's order: the ungrouped services as
 * blocks of their own first, then one block per group, folding open to a
 * block per service set a cell in from the start edge. A group with
 * something wrong starts open; the rest start closed, so the page leads with
 * what needs reading.
 */
export function ServiceGroupList({
  groups,
  ungrouped,
}: {
  groups: PublicServiceGroup[];
  ungrouped: PublicComponent[];
}) {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(groups.filter((group) => group.status !== 'OPERATIONAL').map((g) => g.id)),
  );

  // Folding adds and removes blocks; put them on the grid the moment they land.
  useEffect(() => {
    bindSiteShells();
  }, [open]);

  function toggle(id: string) {
    setOpen((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  return (
    <SiteGroup as="ul">
      {ungrouped.map((component) => (
        <SitePanel key={component.id} as="li" density="row">
          <ComponentRow
            as="div"
            bare
            displayName={component.displayName}
            description={component.description}
            status={component.status}
          />
        </SitePanel>
      ))}
      {groups.map((group) => {
        const expanded = open.has(group.id);
        const servicesId = `service-group-${group.id}`;
        return (
          <GroupBlocks
            key={group.id}
            group={group}
            expanded={expanded}
            servicesId={servicesId}
            onToggle={() => toggle(group.id)}
          />
        );
      })}
    </SiteGroup>
  );
}

function GroupBlocks({
  group,
  expanded,
  servicesId,
  onToggle,
}: {
  group: PublicServiceGroup;
  expanded: boolean;
  servicesId: string;
  onToggle: () => void;
}) {
  return (
    <>
      <SitePanel as="li" density="row">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={servicesId}
          onClick={onToggle}
          {...stylex.props(styles.row)}
        >
          <span {...stylex.props(styles.chevron, expanded && styles.chevronOpen)}>
            <Icon name="arrow-down-s-line" size={16} />
          </span>
          <span {...stylex.props(styles.name)}>{group.displayName}</span>
          <StatusPill status={group.status} />
        </button>
      </SitePanel>
      {expanded
        ? group.components.map((component) => (
            <SitePanel key={component.id} as="li" density="row" indent={1}>
              <ComponentRow
                as="div"
                bare
                displayName={component.displayName}
                description={component.description}
                status={component.status}
              />
            </SitePanel>
          ))
        : null}
    </>
  );
}

const styles = stylex.create({
  // The whole row is the control: the chevron and the name on the start
  // edge, the group's status on the end edge.
  row: {
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 0,
    color: color.textPrimary,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: text.familyUi,
    gap: space[2],
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
    textAlign: 'start',
    width: '100%',
  },
  chevron: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'flex',
    flexShrink: 0,
    transform: 'rotate(-90deg)',
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'transform',
    transitionTimingFunction: motion.ease,
  },
  chevronOpen: {
    transform: 'rotate(0deg)',
  },
  name: {
    flexGrow: 1,
    fontSize: text.sizeTitle,
    fontWeight: text.weightBold,
    lineHeight: text.lineTitle,
    minWidth: 0,
  },
});
