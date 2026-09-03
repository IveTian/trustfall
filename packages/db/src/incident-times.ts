/**
 * Where an update lands on the incident's clock.
 *
 * The update may be earlier than the recorded start: the start then moves
 * to that instant, so the earliest time on the timeline is the incident's
 * start. A RESOLVED update stamps `resolveTime` at the same instant.
 */
export function incidentTimesForUpdate(
  existing: { startTime: number; resolveTime: number | null },
  createTime: number,
  resolved: boolean,
): { startTime: number; resolveTime: number | null } {
  return {
    startTime: Math.min(existing.startTime, createTime),
    resolveTime: resolved ? createTime : existing.resolveTime,
  };
}
