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
 * blocks of their own first, then one block per group, folding open — with
 * a height transition — to a block per service set a cell in from the start
 * edge. A group with
 * something wrong starts open; the rest start closed, so the page leads with
 * what needs reading.
 */
export function ServiceGroupList({
  groups,
  ungrouped,
  now,
}: {
  groups: PublicServiceGroup[];
  ungrouped: PublicComponent[];
  /** The clock the history bars end at. Captured by the caller: render stays pure. */
  now?: number;
}) {
  const [open, setOpen] = useState<Set<string>>(
    () => new Set(groups.filter((group) => group.status !== 'OPERATIONAL').map((g) => g.id)),
  );

  // Folding changes how far the run reaches; re-measure as it starts (the
  // fold's own transitionend re-measures once it has settled).
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
        <ServiceBlock key={component.id} component={component} now={now} />
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
            now={now}
            onToggle={() => toggle(group.id)}
          />
        );
      })}
    </SiteGroup>
  );
}

/**
 * One service's block. With a history bar it is a cell and a half tall — the
 * name line and the bar, centred in the block — instead of the single row.
 */
function ServiceBlock({
  component,
  now,
  indent,
}: {
  component: PublicComponent;
  now?: number;
  indent?: 0 | 1;
}) {
  const withHistory = component.history != null && now !== undefined;
  return (
    <SitePanel as="li" density="row" step={withHistory ? 0.5 : 1} indent={indent}>
      <ComponentRow
        as="div"
        bare
        displayName={component.displayName}
        description={component.description}
        status={component.status}
        history={withHistory ? component.history : undefined}
        now={now}
      />
    </SitePanel>
  );
}

function GroupBlocks({
  group,
  expanded,
  servicesId,
  now,
  onToggle,
}: {
  group: PublicServiceGroup;
  expanded: boolean;
  servicesId: string;
  now?: number;
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
            <Icon name="chevron-down" size={16} />
          </span>
          <span {...stylex.props(styles.name)}>{group.displayName}</span>
          <StatusPill status={group.status} />
        </button>
      </SitePanel>
      {/* Always mounted so it can fold open and shut; out of reach while shut. */}
      <li
        id={servicesId}
        className="tf-site-fold"
        data-open={expanded ? '' : undefined}
        inert={!expanded}
        onTransitionEnd={(event) => {
          if (event.target === event.currentTarget) {
            bindSiteShells();
          }
        }}
      >
        <SiteGroup as="ul">
          {group.components.map((component) => (
            <ServiceBlock key={component.id} component={component} now={now} indent={1} />
          ))}
        </SiteGroup>
      </li>
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
