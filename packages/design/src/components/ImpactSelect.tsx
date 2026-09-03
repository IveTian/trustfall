import type { ComponentStatus } from '@trustfall/shared';
import type { StatusPresentation } from '../status.ts';
import { Menu } from './Menu.tsx';
import { StatusIcon } from './StatusIcon.tsx';

/**
 * How hard an incident hits one component, phrased from the reader's side:
 * the scale starts at "No impact", not at a status name. Same colors as
 * StatusSelect, so a choice here previews the status the component will
 * wear; the glyphs are the warning signs an incident's impact escalates
 * through (`incidentImpactPresentation`), not the status marks.
 */
const IMPACT_OPTIONS = [
  'OPERATIONAL',
  'DEGRADED_PERFORMANCE',
  'PARTIAL_OUTAGE',
  'MAJOR_OUTAGE',
] as const;

export type ImpactStatus = (typeof IMPACT_OPTIONS)[number];

export const impactStatusPresentation: Record<ImpactStatus, StatusPresentation> = {
  OPERATIONAL: { tone: 'operational', icon: 'circle-check-fill', label: 'No impact' },
  DEGRADED_PERFORMANCE: {
    tone: 'degraded',
    icon: 'error-warning-fill',
    label: 'Degraded performance',
  },
  PARTIAL_OUTAGE: { tone: 'partialOutage', icon: 'alert-fill', label: 'Partial outage' },
  MAJOR_OUTAGE: {
    tone: 'majorOutage',
    icon: 'siren-fill',
    label: 'Full outage',
  },
};

export const impactStatusLabels: Record<ImpactStatus, string> = {
  OPERATIONAL: impactStatusPresentation.OPERATIONAL.label,
  DEGRADED_PERFORMANCE: impactStatusPresentation.DEGRADED_PERFORMANCE.label,
  PARTIAL_OUTAGE: impactStatusPresentation.PARTIAL_OUTAGE.label,
  MAJOR_OUTAGE: impactStatusPresentation.MAJOR_OUTAGE.label,
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
  const current = impactStatusPresentation[currentKey];
  return (
    <Menu
      label={`Impact for ${componentName}`}
      disabled={disabled}
      items={IMPACT_OPTIONS.map((option) => {
        const presentation = impactStatusPresentation[option];
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
