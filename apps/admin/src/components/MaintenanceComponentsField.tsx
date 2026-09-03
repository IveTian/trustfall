import {
  Checkbox,
  IconButton,
  Stack,
  Text,
  TreeChevron,
  TreeList,
  TreeNest,
  TreeRow,
  VisuallyHidden,
} from '@trustfall/design';
import { useState } from 'react';
import {
  type AffectedComponent,
  type AffectedGroup,
  byPosition,
  membersOf,
} from './AffectedComponentsField.tsx';

/**
 * The maintenance dialogs' component picker: the dashboard rail's tree with a
 * checkbox on every row. A maintenance has one thing to say about a
 * component — it is in the window or it is not — so there is no impact to
 * choose. Ticking a group ticks every member; the group's box reads checked
 * once they all are.
 */
export function MaintenanceComponentsField({
  components,
  groups,
  selected,
  onToggle,
  disabled = false,
}: {
  components: AffectedComponent[];
  groups: AffectedGroup[];
  selected: ReadonlySet<string>;
  onToggle: (componentIds: string[], included: boolean) => void;
  disabled?: boolean;
}) {
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(new Set());

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
        start={
          <Checkbox
            label={<VisuallyHidden>Include {component.display_name}</VisuallyHidden>}
            checked={selected.has(component.id)}
            disabled={disabled}
            onChange={(event) => onToggle([component.id], event.currentTarget.checked)}
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
            if (members.length === 0) {
              return null;
            }
            const expanded = expandedGroups.has(group.id);
            const allIn = members.every((member) => selected.has(member.id));
            return (
              <TreeRow
                key={group.id}
                title={group.display_name}
                start={
                  <Checkbox
                    label={
                      <VisuallyHidden>
                        Include every component in {group.display_name}
                      </VisuallyHidden>
                    }
                    checked={allIn}
                    disabled={disabled}
                    onChange={(event) =>
                      onToggle(
                        members.map((member) => member.id),
                        event.currentTarget.checked,
                      )
                    }
                  />
                }
                end={
                  <IconButton
                    label={`${expanded ? 'Collapse' : 'Expand'} ${group.display_name}`}
                    aria-expanded={expanded}
                    onClick={() => toggleGroup(group.id)}
                  >
                    <TreeChevron open={expanded} />
                  </IconButton>
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
