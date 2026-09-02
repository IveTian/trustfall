import {
  IconButton,
  ImpactSelect,
  type ImpactStatus,
  Text,
  Stack,
  TreeChevron,
  TreeList,
  TreeNest,
  TreeRow,
} from '@trustfall/design';
import { COMPONENT_STATUSES } from '@trustfall/shared';
import { useState } from 'react';

export type AffectedComponent = {
  id: string;
  display_name: string;
  group_id: string | null;
  position: number;
};
export type AffectedGroup = { id: string; display_name: string; position: number };

export function byPosition(a: { position: number; display_name: string }, b: typeof a) {
  return a.position - b.position || a.display_name.localeCompare(b.display_name);
}

/** The group's select shows its worst member; severity follows the enum order. */
export function worstImpact(statuses: ImpactStatus[]): ImpactStatus {
  let worst: ImpactStatus = 'OPERATIONAL';
  for (const status of statuses) {
    if (COMPONENT_STATUSES.indexOf(status) > COMPONENT_STATUSES.indexOf(worst)) {
      worst = status;
    }
  }
  return worst;
}

/**
 * A component whose group vanished between loads still shows up: it lands in
 * the ungrouped rows rather than disappearing from the dialog.
 */
export function membersOf(
  components: AffectedComponent[],
  groups: AffectedGroup[],
  groupId: string | null,
): AffectedComponent[] {
  return components
    .filter((component) => {
      const owned = groups.some((group) => group.id === component.group_id)
        ? component.group_id
        : null;
      return owned === groupId;
    })
    .sort(byPosition);
}

/**
 * The dialogs' affected-components picker: the dashboard rail's tree, with an
 * impact select on every row. Choosing on a group re-declares every member;
 * the group's own select wears the worst member.
 */
export function AffectedComponentsField({
  components,
  groups,
  impacts,
  onSetImpact,
  disabled = false,
}: {
  components: AffectedComponent[];
  groups: AffectedGroup[];
  impacts: Record<string, ImpactStatus>;
  onSetImpact: (componentIds: string[], status: ImpactStatus) => void;
  disabled?: boolean;
}) {
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(new Set());

  function impactOf(componentId: string): ImpactStatus {
    return impacts[componentId] ?? 'OPERATIONAL';
  }

  function toggleGroup(groupId: string) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function componentRow(component: AffectedComponent) {
    return (
      <TreeRow
        key={component.id}
        title={component.display_name}
        end={
          <ImpactSelect
            status={impactOf(component.id)}
            componentName={component.display_name}
            disabled={disabled}
            onChange={(status) => onSetImpact([component.id], status)}
          />
        }
      />
    );
  }

  return (
    <Stack gap={2}>
      <Text tone="caption">Affected components</Text>
      {components.length === 0 ? (
        <Text tone="caption">No components yet.</Text>
      ) : (
        <TreeList>
          {membersOf(components, groups, null).map(componentRow)}
          {[...groups].sort(byPosition).map((group) => {
            const members = membersOf(components, groups, group.id);
            // An empty group has nothing an incident can affect.
            if (members.length === 0) {
              return null;
            }
            const expanded = expandedGroups.has(group.id);
            return (
              <TreeRow
                key={group.id}
                title={group.display_name}
                end={
                  <>
                    <ImpactSelect
                      status={worstImpact(members.map((member) => impactOf(member.id)))}
                      componentName={group.display_name}
                      disabled={disabled}
                      onChange={(status) =>
                        onSetImpact(
                          members.map((member) => member.id),
                          status,
                        )
                      }
                    />
                    <IconButton
                      label={`${expanded ? 'Collapse' : 'Expand'} ${group.display_name}`}
                      aria-expanded={expanded}
                      onClick={() => toggleGroup(group.id)}
                    >
                      <TreeChevron open={expanded} />
                    </IconButton>
                  </>
                }
                nest={<TreeNest open={expanded}>{members.map(componentRow)}</TreeNest>}
              />
            );
          })}
        </TreeList>
      )}
    </Stack>
  );
}
