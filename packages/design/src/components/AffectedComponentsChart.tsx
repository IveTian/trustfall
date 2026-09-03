import * as stylex from '@stylexjs/stylex';
import type { ComponentStatus } from '@trustfall/shared';
import { componentSegments, type ChartUpdate } from '../affected-segments.ts';
import { componentStatusPresentation } from '../status.ts';
import type { StatusTone } from '../status.ts';
import { color } from '../tokens/color.stylex.ts';
import { mesh } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { StatusIcon } from './StatusIcon.tsx';
import { useTimeZone } from '../time-zone.ts';

export type ChartComponent = {
  id: string;
  displayName: string;
  /** Where the component stands right now. */
  status: ComponentStatus;
  /** Rendered as a heading above the first component that carries it. */
  group?: string | null;
};

// Room before the incident began so the first change reads as a change, not
// as the bar's edge: a tenth of the span. A brand-new incident has no span
// yet, so the chart pretends it has been running for five minutes.
const LEAD_RATIO = 0.1;
const MIN_SPAN_MS = 5 * 60 * 1000;

/**
 * How each affected component fared across the incident: one bar per
 * component, coloured by its status between updates, with a dashed marker at
 * every update. `endTime` is the resolve time; while the incident is open the
 * chart runs to now. The chart draws no box of its own — its axis and rows
 * run to the edges of whatever block holds it, a flush `SitePanel` on the
 * site.
 */
export function AffectedComponentsChart({
  components,
  updates,
  startTime,
  endTime,
  timeZone: pinnedTimeZone,
  locale,
  now,
}: {
  components: ChartComponent[];
  updates: ChartUpdate[];
  startTime: number;
  endTime?: number | null;
  /** IANA zone the axis is stamped in; the reader's preference when omitted. */
  timeZone?: string;
  /** Formatting locale; the viewer's own when omitted. A cached page pins it. */
  locale?: string;
  /** The clock the open bar runs to. Captured by the caller: render stays pure. */
  now: number;
}) {
  const timeZone = useTimeZone(pinnedTimeZone);
  const end = endTime ?? Math.max(now, startTime);
  const span = Math.max(end - startTime, MIN_SPAN_MS);
  const chartStart = startTime - span * LEAD_RATIO;
  const chartEnd = startTime + span;
  const total = chartEnd - chartStart;
  const percent = (at: number) => `${((at - chartStart) / total) * 100}%`;

  const stamp = new Intl.DateTimeFormat(locale, {
    timeZone,
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const markers = [
    startTime,
    ...updates.map((update) => update.createTime).filter((at) => at > startTime && at <= chartEnd),
  ];

  return (
    <div>
      <div {...stylex.props(styles.axis)}>
        <span>{stamp.format(new Date(startTime))}</span>
        <span>{endTime == null ? 'Now' : stamp.format(new Date(endTime))}</span>
      </div>
      <div {...stylex.props(styles.rows)}>
        <div aria-hidden {...stylex.props(styles.markers)}>
          {markers.map((at) => (
            <span key={at} {...stylex.props(styles.marker, markerAt.at(percent(at)))} />
          ))}
        </div>
        <ul {...stylex.props(styles.list)}>
          {components.map((component, index) => {
            const presentation = componentStatusPresentation[component.status];
            const group = component.group ?? null;
            const previousGroup = index > 0 ? (components[index - 1]!.group ?? null) : null;
            const segments = componentSegments(component.id, updates, chartStart, startTime, end);
            return (
              <li key={component.id} {...stylex.props(styles.row)}>
                {group != null && group !== previousGroup ? (
                  <span {...stylex.props(styles.group)}>{group}</span>
                ) : null}
                <span {...stylex.props(styles.name)}>
                  <StatusIcon
                    icon={presentation.icon}
                    tone={presentation.tone}
                    title={presentation.label}
                  />
                  {component.displayName}
                </span>
                <span
                  role="img"
                  aria-label={segments
                    .map(
                      (segment) =>
                        `${componentStatusPresentation[segment.status].label} from ${stamp.format(new Date(segment.start))} to ${segment.end === end && endTime == null ? 'now' : stamp.format(new Date(segment.end))}`,
                    )
                    .join('; ')}
                  {...stylex.props(styles.bar)}
                >
                  {segments.map((segment) => (
                    <span
                      key={segment.start}
                      {...stylex.props(
                        styles.segment,
                        segmentTone[componentStatusPresentation[segment.status].tone],
                        segmentAt.at(percent(segment.start), percent(segment.end)),
                      )}
                    />
                  ))}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

const markerAt = stylex.create({
  at: (left: string) => ({ insetInlineStart: left }),
});

const segmentAt = stylex.create({
  at: (start: string, end: string) => ({
    insetInlineEnd: `calc(100% - ${end})`,
    insetInlineStart: start,
  }),
});

const segmentTone = stylex.create({
  operational: { backgroundColor: color.operational },
  degraded: { backgroundColor: color.degraded },
  partialOutage: { backgroundColor: color.partialOutage },
  majorOutage: { backgroundColor: color.majorOutage },
  maintenance: { backgroundColor: color.maintenance },
}) satisfies Record<StatusTone, unknown>;

const styles = stylex.create({
  axis: {
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: mesh.line,
    color: color.textMuted,
    display: 'flex',
    fontFamily: text.familyMono,
    fontSize: text.sizeCaption,
    fontVariantNumeric: 'tabular-nums',
    justifyContent: 'space-between',
    lineHeight: text.lineCaption,
    paddingBlock: space[2],
    paddingInline: space[4],
  },
  rows: {
    position: 'relative',
  },
  // The markers share the rows' inline padding so a percentage lands on the
  // same clock time in the overlay and in every bar.
  markers: {
    inset: 0,
    paddingInline: space[4],
    pointerEvents: 'none',
    position: 'absolute',
  },
  marker: {
    borderInlineStartColor: color.borderStrong,
    borderInlineStartStyle: 'dashed',
    borderInlineStartWidth: mesh.line,
    insetBlock: 0,
    position: 'absolute',
  },
  list: {
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  row: {
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: {
      default: mesh.line,
      ':last-child': 0,
    },
    display: 'flex',
    flexDirection: 'column',
    gap: space[2],
    paddingBlock: space[3],
    paddingInline: space[4],
  },
  group: {
    color: color.textMuted,
    fontFamily: text.familyUi,
    fontSize: text.sizeCaption,
    fontWeight: text.weightMedium,
    lineHeight: text.lineCaption,
    textTransform: 'uppercase',
  },
  name: {
    alignItems: 'center',
    color: color.textPrimary,
    display: 'flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    gap: space[2],
    lineHeight: text.lineBodySmall,
  },
  bar: {
    backgroundColor: color.surfaceSunken,
    blockSize: space[2],
    borderRadius: radius.pill,
    display: 'block',
    overflow: 'hidden',
    position: 'relative',
  },
  segment: {
    insetBlock: 0,
    position: 'absolute',
  },
});
