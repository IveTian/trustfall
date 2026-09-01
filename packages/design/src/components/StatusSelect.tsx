import type { ComponentStatus } from '@trustfall/shared';
import { COMPONENT_STATUSES } from '@trustfall/shared';
import { componentStatusPresentation } from '../status.ts';
import { Menu } from './Menu.tsx';
import { StatusIcon } from './StatusIcon.tsx';

const SELECTABLE = COMPONENT_STATUSES.filter((status) => status !== 'STATUS_UNSPECIFIED');

/**
 * Declaring a component's status: one control holding the current value, not a
 * row of buttons where three of the four are wrong. Color, glyph, and label
 * all come from `status.ts`, so the menu can never disagree with the page it
 * sits on.
 */
export function StatusSelect({
  status,
  componentName,
  onChange,
  disabled = false,
}: {
  status: ComponentStatus;
  /** Names the control for assistive technology: "Status for Checkout API". */
  componentName: string;
  onChange: (status: ComponentStatus) => void;
  disabled?: boolean;
}) {
  const current = componentStatusPresentation[status];
  return (
    <Menu
      label={`Status for ${componentName}`}
      disabled={disabled}
      items={SELECTABLE.map((option) => {
        const presentation = componentStatusPresentation[option];
        return {
          id: option,
          label: presentation.label,
          selected: option === status,
          icon: (
            <StatusIcon
              icon={presentation.icon}
              tone={presentation.tone}
              title={presentation.label}
            />
          ),
          onSelect: () => onChange(option),
        };
      })}
    >
      <StatusIcon icon={current.icon} tone={current.tone} title={current.label} />
      {current.label}
    </Menu>
  );
}
