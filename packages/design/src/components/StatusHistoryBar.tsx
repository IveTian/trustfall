import * as stylex from '@stylexjs/stylex';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type FocusEvent,
  type PointerEvent,
} from 'react';
import { formatDuration } from '../maintenance-copy.ts';
import {
  dailyStatuses,
  HISTORY_DAYS,
  type DayEvent,
  type DayStatus,
  type StatusInterval,
} from '../status-history.ts';
import { componentStatusPresentation, type StatusTone } from '../status.ts';
import { color } from '../tokens/color.stylex.ts';
import { control, mesh, zIndex } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { useTimeZone } from '../time-zone.ts';
import { StatusIcon } from './StatusIcon.tsx';

/** How long the pointer may be between a cell and its tooltip before the tooltip goes. */
const HIDE_DELAY_MS = 150;
/** The tooltip keeps this much clear of the viewport's edges. */
const VIEWPORT_MARGIN_PX = 8;
/** Room a tooltip needs above a cell; with less it opens underneath instead. */
const ROOM_ABOVE_PX = 160;

type Active = {
  index: number;
  /** Viewport x of the cell's centre. */
  x: number;
  /** Viewport y of the cell's top and bottom edge. */
  top: number;
  bottom: number;
  /** The tooltip opens under a cell too close to the top to hang one above it. */
  below: boolean;
};

/**
 * A service's last ninety days as a row of rectangles, one per calendar day,
 * the oldest on the left and today on the right. Each is painted with the
 * worst status the day saw; a clean day is operational green. Hovering or
 * focusing a day opens a tooltip: the date and "Operational" for a clean
 * day, or what happened — each incident or maintenance with how long it
 * affected the service, linking through to it. A day with one linked cause
 * is itself that link. Days are cut in the reader's zone, so the bar
 * re-buckets when the zone in the bar changes. `now` comes from the caller
 * so a cached render stays pure.
 */
export function StatusHistoryBar({
  intervals,
  now,
  timeZone: pinnedTimeZone,
  days = HISTORY_DAYS,
  locale = 'en',
}: {
  intervals: readonly StatusInterval[];
  now: number;
  /** IANA zone the days are cut in; the reader's preference when omitted. */
  timeZone?: string;
  days?: number;
  /** Formatting locale. Pinned by default so a page rendered once reads the same everywhere. */
  locale?: string;
}) {
  const timeZone = useTimeZone(pinnedTimeZone);
  const cells = useMemo(
    () => dailyStatuses(intervals, now, timeZone, days),
    [intervals, now, timeZone, days],
  );
  const [active, setActive] = useState<Active | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const tooltipId = useId();

  const hold = () => {
    if (hideTimer.current !== undefined) {
      clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    }
  };
  const show = (index: number, element: HTMLElement) => {
    hold();
    const rect = element.getBoundingClientRect();
    setActive({
      index,
      x: rect.left + rect.width / 2,
      top: rect.top,
      bottom: rect.bottom,
      below: rect.top < ROOM_ABOVE_PX,
    });
  };
  const hide = () => {
    hold();
    hideTimer.current = setTimeout(() => setActive(null), HIDE_DELAY_MS);
  };

  // The tooltip is fixed to where the cell was: a scroll or Escape closes it
  // rather than leaving it adrift.
  useEffect(() => {
    if (!active) {
      return;
    }
    const close = () => setActive(null);
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        close();
      }
    };
    window.addEventListener('scroll', close, { capture: true, passive: true });
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('scroll', close, { capture: true });
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);

  useEffect(() => hold, []);

  const affected = cells.filter((cell) => cell.status !== 'OPERATIONAL').length;
  const label =
    affected === 0
      ? `Operational every day for the last ${days} days`
      : `${affected} of the last ${days} days had a disruption or maintenance`;
  const dayLabel = useMemo(
    () => new Intl.DateTimeFormat(locale, { timeZone: 'UTC', dateStyle: 'medium' }),
    [locale],
  );

  return (
    <div role="group" aria-label={label} {...stylex.props(styles.bar)}>
      {cells.map((cell, index) => (
        <Cell
          key={cell.key}
          cell={cell}
          label={`${dayLabel.format(new Date(`${cell.key}T12:00:00Z`))}: ${describe(cell)}`}
          describedBy={active?.index === index ? tooltipId : undefined}
          onEnter={(element) => show(index, element)}
          onLeave={hide}
        />
      ))}
      {active ? (
        <DayTooltip
          id={tooltipId}
          cell={cells[active.index]!}
          at={active}
          now={now}
          dayLabel={dayLabel}
          onEnter={hold}
          onLeave={hide}
        />
      ) : null}
    </div>
  );
}

function describe(cell: DayStatus): string {
  if (cell.events.length === 0) {
    return 'Operational';
  }
  return cell.events
    .map((event) => `${componentStatusPresentation[event.status].label} — ${event.source.title}`)
    .join('; ');
}

/**
 * One day. A clean day is inert to the keyboard — there is nothing to act on
 * — but still speaks on hover. A day with one linked cause is a link to it;
 * one with several is a button that opens the tooltip listing them.
 */
function Cell({
  cell,
  label,
  describedBy,
  onEnter,
  onLeave,
}: {
  cell: DayStatus;
  label: string;
  describedBy?: string;
  onEnter: (element: HTMLElement) => void;
  onLeave: () => void;
}) {
  const tone = componentStatusPresentation[cell.status].tone;
  const href = cell.events.length === 1 ? cell.events[0]?.source.href : undefined;
  const handlers = {
    onPointerEnter: (event: PointerEvent<HTMLElement>) => onEnter(event.currentTarget),
    onPointerLeave: onLeave,
    onFocus: (event: FocusEvent<HTMLElement>) => onEnter(event.currentTarget),
    onBlur: onLeave,
  };
  if (href) {
    return (
      <a
        href={href}
        aria-label={label}
        aria-describedby={describedBy}
        {...handlers}
        {...stylex.props(styles.cell, styles.cellActive, cellTone[tone])}
      />
    );
  }
  if (cell.events.length > 0) {
    return (
      <button
        type="button"
        aria-label={label}
        aria-describedby={describedBy}
        {...handlers}
        onClick={(event) => onEnter(event.currentTarget)}
        {...stylex.props(styles.cell, styles.cellActive, cellTone[tone])}
      />
    );
  }
  return (
    <span
      role="img"
      aria-label={label}
      {...handlers}
      {...stylex.props(styles.cell, cellTone[tone])}
    />
  );
}

function DayTooltip({
  id,
  cell,
  at,
  now,
  dayLabel,
  onEnter,
  onLeave,
}: {
  id: string;
  cell: DayStatus;
  at: Active;
  now: number;
  dayLabel: Intl.DateTimeFormat;
  onEnter: () => void;
  onLeave: () => void;
}) {
  const panel = useRef<HTMLDivElement>(null);
  // Centred on the cell, then nudged back inside the viewport once measured.
  // The nudge is worked out from where the panel would sit unshifted, so
  // moving from one cell to the next never carries the last nudge along.
  const [shift, setShift] = useState(0);
  useLayoutEffect(() => {
    const rect = panel.current?.getBoundingClientRect();
    if (!rect) {
      return;
    }
    const naturalLeft = rect.left - shift;
    const naturalRight = rect.right - shift;
    const overLeft = VIEWPORT_MARGIN_PX - naturalLeft;
    const overRight = naturalRight - (window.innerWidth - VIEWPORT_MARGIN_PX);
    setShift(overLeft > 0 ? overLeft : overRight > 0 ? -overRight : 0);
  }, [at, shift]);

  // The whole stretch the service was affected, not just this day's share
  // of it. An event still running is counted up to now.
  const lasted = (event: DayEvent) =>
    event.end >= now
      ? `Affected for ${formatDuration(now - event.start)} so far`
      : `Affected for ${formatDuration(event.end - event.start)}`;

  return (
    <div
      ref={panel}
      id={id}
      role="tooltip"
      onPointerEnter={onEnter}
      onPointerLeave={onLeave}
      {...stylex.props(
        styles.tooltip,
        tooltipAt.at(at.x + shift, at.below ? at.bottom : at.top, at.below),
      )}
    >
      <span {...stylex.props(styles.date)}>
        {dayLabel.format(new Date(`${cell.key}T12:00:00Z`))}
      </span>
      {cell.events.length === 0 ? (
        <div {...stylex.props(styles.event)}>
          <StatusIcon
            icon={componentStatusPresentation.OPERATIONAL.icon}
            tone={componentStatusPresentation.OPERATIONAL.tone}
            title={componentStatusPresentation.OPERATIONAL.label}
          />
          <span {...stylex.props(styles.title)}>
            {componentStatusPresentation.OPERATIONAL.label}
          </span>
        </div>
      ) : (
        cell.events.map((event) => {
          const presentation = componentStatusPresentation[event.status];
          return (
            <div key={`${event.source.kind}:${event.source.id}`} {...stylex.props(styles.event)}>
              <StatusIcon
                icon={presentation.icon}
                tone={presentation.tone}
                title={presentation.label}
              />
              <div {...stylex.props(styles.copy)}>
                {event.source.href ? (
                  <a href={event.source.href} {...stylex.props(styles.title, styles.link)}>
                    {event.source.title}
                  </a>
                ) : (
                  <span {...stylex.props(styles.title)}>{event.source.title}</span>
                )}
                <span {...stylex.props(styles.status)}>{presentation.label}</span>
                <span {...stylex.props(styles.detail)}>{lasted(event)}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}

const styles = stylex.create({
  bar: {
    display: 'flex',
    gap: '2px',
    inlineSize: '100%',
  },
  // Plain rectangles, no radius: ninety of them read as a strip, not beads.
  cell: {
    blockSize: space[5],
    borderWidth: 0,
    boxSizing: 'border-box',
    display: 'block',
    flexBasis: 0,
    flexGrow: 1,
    minInlineSize: '1px',
    opacity: {
      default: 1,
      ':hover': 0.75,
    },
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
  },
  cellActive: {
    cursor: 'pointer',
  },
  tooltip: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxShadow: shadow.overlay,
    boxSizing: 'border-box',
    color: color.textPrimary,
    display: 'flex',
    flexDirection: 'column',
    fontFamily: text.familyUi,
    gap: space[2],
    maxInlineSize: control.menuMaxWidth,
    minInlineSize: '160px',
    padding: space[3],
    position: 'fixed',
    zIndex: zIndex.menu,
  },
  date: {
    color: color.textMuted,
    fontSize: text.sizeCaption,
    fontWeight: text.weightMedium,
    lineHeight: text.lineCaption,
  },
  event: {
    alignItems: 'flex-start',
    display: 'flex',
    gap: space[2],
  },
  copy: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[1],
    minInlineSize: 0,
  },
  title: {
    color: color.textPrimary,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
  },
  link: {
    textDecorationLine: {
      default: 'none',
      ':hover': 'underline',
    },
  },
  status: {
    color: color.textMuted,
    fontSize: text.sizeCaption,
    lineHeight: text.lineCaption,
  },
  detail: {
    color: color.textMuted,
    fontSize: text.sizeCaption,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: text.lineCaption,
  },
});

const tooltipAt = stylex.create({
  at: (x: number, y: number, below: boolean) => ({
    insetBlockStart: `${y}px`,
    insetInlineStart: `${x}px`,
    marginBlock: space[2],
    transform: below ? 'translateX(-50%)' : 'translate(-50%, -100%)',
  }),
});

const cellTone = stylex.create({
  operational: { backgroundColor: color.operational },
  degraded: { backgroundColor: color.degraded },
  partialOutage: { backgroundColor: color.partialOutage },
  majorOutage: { backgroundColor: color.majorOutage },
  maintenance: { backgroundColor: color.maintenance },
}) satisfies Record<StatusTone, unknown>;
