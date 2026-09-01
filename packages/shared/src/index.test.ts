import { describe, expect, it } from 'vitest';
import {
  COMPONENT_STATUSES,
  INCIDENT_STATUSES,
  isActiveIncidentStatus,
  rollupOverallStatus,
} from './index.ts';

describe('rollupOverallStatus', () => {
  it('reports operational for an empty page', () => {
    expect(rollupOverallStatus([])).toBe('OPERATIONAL');
  });

  it('reports operational when everything is operational', () => {
    expect(rollupOverallStatus(['OPERATIONAL', 'OPERATIONAL'])).toBe('OPERATIONAL');
  });

  it('returns the worst status present', () => {
    expect(rollupOverallStatus(['OPERATIONAL', 'DEGRADED_PERFORMANCE'])).toBe(
      'DEGRADED_PERFORMANCE',
    );
    expect(rollupOverallStatus(['DEGRADED_PERFORMANCE', 'PARTIAL_OUTAGE'])).toBe('PARTIAL_OUTAGE');
    expect(rollupOverallStatus(['PARTIAL_OUTAGE', 'MAJOR_OUTAGE'])).toBe('MAJOR_OUTAGE');
  });

  it('is order independent', () => {
    expect(rollupOverallStatus(['MAJOR_OUTAGE', 'OPERATIONAL'])).toBe('MAJOR_OUTAGE');
    expect(rollupOverallStatus(['OPERATIONAL', 'MAJOR_OUTAGE'])).toBe('MAJOR_OUTAGE');
  });

  it('treats an unspecified status as operational rather than as an outage', () => {
    expect(rollupOverallStatus(['STATUS_UNSPECIFIED'])).toBe('OPERATIONAL');
    expect(rollupOverallStatus(['STATUS_UNSPECIFIED', 'DEGRADED_PERFORMANCE'])).toBe(
      'DEGRADED_PERFORMANCE',
    );
  });

  it('ranks every known component status', () => {
    // A new status added to the enum without a severity entry would silently
    // rank as operational, hiding an outage on the public page.
    for (const status of COMPONENT_STATUSES) {
      expect(() => rollupOverallStatus([status])).not.toThrow();
    }
    const worstOfAll = rollupOverallStatus([...COMPONENT_STATUSES]);
    expect(worstOfAll).toBe('MAJOR_OUTAGE');
  });
});

describe('isActiveIncidentStatus', () => {
  it('counts every status except resolved as active', () => {
    for (const status of INCIDENT_STATUSES) {
      expect(isActiveIncidentStatus(status)).toBe(status !== 'RESOLVED');
    }
  });

  it('keeps monitoring active', () => {
    // The banner has to stay up through monitoring: the fix is not confirmed
    // until the incident is resolved.
    expect(isActiveIncidentStatus('MONITORING')).toBe(true);
  });
});
