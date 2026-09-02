import type { ComponentStatus } from '@trustfall/shared';

export type ChartUpdate = {
  createTime: number;
  /** The affected set as the update left it; absent components are operational. */
  components?: Array<{ componentId: string; status: ComponentStatus }>;
};

export type Segment = { start: number; end: number; status: ComponentStatus };

function statusAt(componentId: string, update: ChartUpdate | undefined): ComponentStatus {
  if (!update) {
    return 'OPERATIONAL';
  }
  return (
    update.components?.find((item) => item.componentId === componentId)?.status ?? 'OPERATIONAL'
  );
}

/**
 * One component's status as a run of segments across the chart, folded so
 * neighbouring runs of the same status merge into one. The bar is operational
 * from `chartStart` to `startTime`; from there it follows each update.
 */
export function componentSegments(
  componentId: string,
  updates: ChartUpdate[],
  chartStart: number,
  startTime: number,
  endTime: number,
): Segment[] {
  const sorted = [...updates].sort((a, b) => a.createTime - b.createTime);
  const points: Array<{ at: number; status: ComponentStatus }> = [
    { at: chartStart, status: 'OPERATIONAL' },
  ];
  // Everything posted at or before the start is what the incident opened
  // with: it takes effect at the start edge, not before it.
  let opening: ChartUpdate | undefined;
  for (const update of sorted) {
    if (update.createTime <= startTime) {
      opening = update;
    }
  }
  points.push({ at: startTime, status: statusAt(componentId, opening) });
  for (const update of sorted) {
    if (update.createTime > startTime && update.createTime <= endTime) {
      points.push({ at: update.createTime, status: statusAt(componentId, update) });
    }
  }

  const segments: Segment[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const point = points[index]!;
    const next = points[index + 1];
    const end = next ? next.at : endTime;
    const previous = segments[segments.length - 1];
    if (previous && previous.status === point.status) {
      previous.end = end;
    } else {
      segments.push({ start: point.at, end, status: point.status });
    }
  }
  return segments;
}
