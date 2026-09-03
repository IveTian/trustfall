import type { ComponentStatus } from '@trustfall/shared';
import { componentStatusPresentation } from '../status.ts';
import { Menu } from './Menu.tsx';
import { StatusIcon } from './StatusIcon.tsx';

/**
 * How hard an incident hits one component, phrased from the reader's side:
 * the scale starts at "No impact", not at a status name. Same glyphs and
 * colors as StatusSelect, so a choice here previews the status the component
 * will wear.
 */
const IMPACT_OPTIONS = [
  'OPERATIONAL',
  'DEGRADED_PERFORMANCE',
  'PARTIAL_OUTAGE',
  'MAJOR_OUTAGE',
] as const;

export type ImpactStatus = (typeof IMPACT_OPTIONS)[number];

export const impactStatusLabels: Record<ImpactStatus, string> = {
  OPERATIONAL: 'No impact',
  DEGRADED_PERFORMANCE: 'Degraded performance',
  PARTIAL_OUTAGE: 'Partial outage',
  MAJOR_OUTAGE: 'Full outage',
};

export function ImpactSelect({
  status,
  componentName,
  onChange,
  disabled = false,
}: {
  status: ComponentStatus;
  /** Names the control for assistive technology: "Impact for Checkout API". */
  componentName: string;
  onChange: (status: ImpactStatus) => void;
  disabled?: boolean;
}) {
  // An incident declares impact, not maintenance: a component under
  // maintenance reads as "No impact" here until the incident says otherwise.
  const currentKey: ImpactStatus =
    status === 'STATUS_UNSPECIFIED' || status === 'UNDER_MAINTENANCE' ? 'OPERATIONAL' : status;
  const current = componentStatusPresentation[currentKey];
  return (
    <Menu
      label={`Impact for ${componentName}`}
      disabled={disabled}
      items={IMPACT_OPTIONS.map((option) => {
        const presentation = componentStatusPresentation[option];
        return {
          id: option,
          label: impactStatusLabels[option],
          selected: option === currentKey,
          icon: (
            <StatusIcon
              icon={presentation.icon}
              tone={presentation.tone}
              title={impactStatusLabels[option]}
            />
          ),
          onSelect: () => onChange(option),
        };
      })}
    >
      <StatusIcon icon={current.icon} tone={current.tone} title={impactStatusLabels[currentKey]} />
      {impactStatusLabels[currentKey]}
    </Menu>
  );
}
