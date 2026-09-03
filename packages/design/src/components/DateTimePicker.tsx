import * as stylex from '@stylexjs/stylex';
import { useEffect, useId, useRef, useState, type FocusEvent, type KeyboardEvent } from 'react';
import { color } from '../tokens/color.stylex.ts';
import { breakpoints, control, mesh, motion, zIndex } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { shadow } from '../tokens/shadow.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { measurePopover, type PopoverAnchor } from '../popover.ts';
import { IconButton } from './Button.tsx';
import { Icon } from './Icon.tsx';
import { Menu } from './Menu.tsx';

const DAYS_PER_WEEK = 7;
const WEEKS_SHOWN = 6;

type Wall = { year: number; month: number; day: number; hour: number; minute: number };

function wallOf(epoch: number): Wall {
  const date = new Date(epoch);
  return {
    year: date.getFullYear(),
    month: date.getMonth(),
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
  };
}

function epochOf(wall: Wall): number {
  return new Date(wall.year, wall.month, wall.day, wall.hour, wall.minute).getTime();
}

function sameDay(a: Wall, b: Wall): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

/** A usable step: a whole number of minutes from 1 to 60, whatever was passed. */
function clampStep(step: number): number {
  return Number.isFinite(step) ? Math.min(60, Math.max(1, Math.floor(step))) : 5;
}

function todayWall(): Wall {
  return wallOf(Date.now());
}

/** The next round step after now: what an empty picker opens on. */
function defaultValue(step: number): number {
  const now = new Date();
  now.setSeconds(0, 0);
  now.setMinutes(Math.ceil((now.getMinutes() + 1) / step) * step);
  return now.getTime();
}

/**
 * A date and time, picked from a calendar and two clock menus, in the
 * viewer's own zone. Stands in for `<input type="datetime-local">`, whose
 * popup the theme cannot reach. Controlled: `value` is epoch ms or null, and
 * the hidden input mirrors it as RFC 3339 so `new FormData(form)` reads it
 * under `name`.
 *
 * Opens on click or ArrowDown; arrows walk the days, PageUp/PageDown the
 * months, Enter picks, Escape returns focus to the trigger, and focus
 * leaving the control closes it.
 */
export function DateTimePicker({
  id,
  name,
  value,
  onChange,
  label,
  disabled = false,
  placeholder = 'Pick a date and time',
  minuteStep = 5,
}: {
  /** Reached by the surrounding Field's `<label htmlFor>`. */
  id?: string;
  /** Key the value submits under; omit for a picker outside any form. */
  name?: string;
  /** Epoch ms, or null for nothing picked yet. */
  value: number | null;
  onChange: (value: number) => void;
  /** Accessible name, when no `<label htmlFor={id}>` provides one. */
  label?: string;
  disabled?: boolean;
  placeholder?: string;
  /** Minute granularity of the clock menu, 1 to 60; anything else is clamped. */
  minuteStep?: number;
}) {
  const panelId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<PopoverAnchor | null>(null);
  // The month on show, and the day the arrow keys are on; both start from
  // the value (or the default the picker will hand out).
  const [view, setView] = useState<{ year: number; month: number }>(() => {
    const wall = wallOf(value ?? defaultValue(clampStep(minuteStep)));
    return { year: wall.year, month: wall.month };
  });
  const [cursor, setCursor] = useState<Wall>(() =>
    wallOf(value ?? defaultValue(clampStep(minuteStep))),
  );
  const focusCursor = useRef(false);

  const current = value == null ? null : wallOf(value);
  // Read each render so the outline follows the date; it changes once a day.
  const today = todayWall();

  useEffect(() => {
    const trigger = triggerRef.current;
    if (!open || !trigger) {
      return;
    }
    const place = () => setAnchor(measurePopover(trigger, 'start'));
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  // Keyboard travel lands on the cursor's day once the grid has rendered it.
  useEffect(() => {
    if (!open || !focusCursor.current) {
      return;
    }
    focusCursor.current = false;
    gridRef.current?.querySelector<HTMLElement>('[data-cursor]')?.focus();
  });

  function openPicker(fromKeyboard: boolean) {
    const trigger = triggerRef.current;
    if (!trigger || disabled) {
      return;
    }
    const start = wallOf(value ?? defaultValue(clampStep(minuteStep)));
    setView({ year: start.year, month: start.month });
    setCursor(start);
    focusCursor.current = fromKeyboard;
    setAnchor(measurePopover(trigger, 'start'));
    setOpen(true);
  }

  function close(restoreFocus: boolean) {
    setOpen(false);
    if (restoreFocus) {
      triggerRef.current?.focus();
    }
  }

  function commit(wall: Wall) {
    onChange(epochOf(wall));
  }

  function pickDay(day: number) {
    const base = current ?? wallOf(defaultValue(clampStep(minuteStep)));
    const next = { ...base, year: view.year, month: view.month, day };
    setCursor(next);
    commit(next);
  }

  function pickTime(patch: Partial<Pick<Wall, 'hour' | 'minute'>>) {
    const base = current ?? wallOf(defaultValue(clampStep(minuteStep)));
    commit({ ...base, ...patch });
  }

  // The cursor follows the month on show, so the grid always has one day in
  // the tab order; its day clamps to the shorter month's last day.
  function shiftMonth(delta: number) {
    const date = new Date(view.year, view.month + delta, 1);
    const year = date.getFullYear();
    const month = date.getMonth();
    const lastDay = new Date(year, month + 1, 0).getDate();
    setView({ year, month });
    setCursor((prev) => ({ ...prev, year, month, day: Math.min(prev.day, lastDay) }));
  }

  function moveCursor(days: number, months = 0) {
    const date = new Date(cursor.year, cursor.month + months, cursor.day + days);
    const next = {
      ...cursor,
      year: date.getFullYear(),
      month: date.getMonth(),
      day: date.getDate(),
    };
    setCursor(next);
    setView({ year: next.year, month: next.month });
    focusCursor.current = true;
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        openPicker(true);
      }
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      close(true);
    }
  }

  function onGridKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [-DAYS_PER_WEEK, 0],
      ArrowDown: [DAYS_PER_WEEK, 0],
      PageUp: [0, -1],
      PageDown: [0, 1],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      moveCursor(move[0], move[1]);
      return;
    }
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault();
      const weekday = new Date(cursor.year, cursor.month, cursor.day).getDay();
      moveCursor(event.key === 'Home' ? -weekday : DAYS_PER_WEEK - 1 - weekday);
    }
  }

  function onBlur(event: FocusEvent<HTMLDivElement>) {
    if (open && !rootRef.current?.contains(event.relatedTarget as Node | null)) {
      setOpen(false);
    }
  }

  const summary = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
  const weekdayLabel = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
  const clock = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });

  // Sunday-first weeks; the leading blanks are the tail of the month before.
  const firstWeekday = new Date(view.year, view.month, 1).getDay();
  const daysInMonth = new Date(view.year, view.month + 1, 0).getDate();
  const cells: Array<number | null> = [];
  for (let i = 0; i < firstWeekday; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(day);
  }
  while (cells.length < DAYS_PER_WEEK * WEEKS_SHOWN) {
    cells.push(null);
  }

  const shown = current ?? cursor;
  const step = clampStep(minuteStep);
  const hours = Array.from({ length: 24 }, (_, hour) => hour);
  const minutes = Array.from({ length: Math.ceil(60 / step) }, (_, i) => i * step);
  const minuteShown = minutes.includes(shown.minute)
    ? shown.minute
    : Math.min(59, Math.round(shown.minute / step) * step);

  return (
    // The handler sits on the wrapper so Escape works from the trigger and from
    // inside the panel alike.
    // oxlint-disable-next-line jsx-a11y/no-static-element-interactions
    <div ref={rootRef} onKeyDown={onKeyDown} onBlur={onBlur} {...stylex.props(styles.root)}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={(event) => {
          if (open) {
            close(false);
          } else {
            openPicker(event.detail === 0);
          }
        }}
        {...stylex.props(styles.trigger, open && styles.triggerOpen)}
      >
        <span {...stylex.props(styles.triggerLabel, value == null && styles.placeholder)}>
          {value == null ? placeholder : summary.format(new Date(value))}
        </span>
        <span {...stylex.props(styles.triggerIcon)}>
          <Icon name="calendar" size={16} />
        </span>
      </button>
      <input
        type="hidden"
        name={name}
        value={value == null ? '' : new Date(value).toISOString()}
        disabled={disabled}
      />

      {open && anchor ? (
        <div
          id={panelId}
          role="dialog"
          aria-label={label ?? 'Pick a date and time'}
          {...stylex.props(
            styles.panel,
            anchor.dropsDown && styles.panelDown,
            styles.panelAt(anchor.blockStart, anchor.blockEnd, anchor.inlineStart, anchor.maxBlock),
          )}
        >
          <div {...stylex.props(styles.monthBar)}>
            <IconButton label="Previous month" onClick={() => shiftMonth(-1)}>
              <Icon name="chevron-left" size={16} />
            </IconButton>
            <span aria-live="polite" {...stylex.props(styles.monthLabel)}>
              {monthLabel.format(new Date(view.year, view.month, 1))}
            </span>
            <IconButton label="Next month" onClick={() => shiftMonth(1)}>
              <Icon name="chevron-right" size={16} />
            </IconButton>
          </div>
          {/* The grid carries the arrow-key handling, so a key event from any day lands here. */}
          {/* oxlint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
          <div
            ref={gridRef}
            role="grid"
            aria-label="Days"
            tabIndex={-1}
            onKeyDown={onGridKeyDown}
            {...stylex.props(styles.grid)}
          >
            <div role="row" {...stylex.props(styles.week)}>
              {Array.from({ length: DAYS_PER_WEEK }, (_, weekday) => (
                <span key={weekday} role="columnheader" {...stylex.props(styles.weekday)}>
                  {weekdayLabel.format(new Date(2026, 8, 6 + weekday))}
                </span>
              ))}
            </div>
            {Array.from({ length: WEEKS_SHOWN }, (_, week) => (
              <div key={week} role="row" {...stylex.props(styles.week)}>
                {cells.slice(week * DAYS_PER_WEEK, (week + 1) * DAYS_PER_WEEK).map((day, index) => {
                  if (day == null) {
                    return <span key={`blank-${index}`} role="gridcell" aria-hidden />;
                  }
                  const wall = { ...cursor, year: view.year, month: view.month, day };
                  const selected = current != null && sameDay(wall, current);
                  const isCursor = sameDay(wall, cursor);
                  return (
                    <button
                      key={day}
                      type="button"
                      role="gridcell"
                      aria-selected={selected}
                      tabIndex={isCursor ? 0 : -1}
                      data-cursor={isCursor ? '' : undefined}
                      onClick={() => pickDay(day)}
                      {...stylex.props(
                        styles.day,
                        sameDay(wall, today) && styles.dayToday,
                        selected && styles.daySelected,
                      )}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <div {...stylex.props(styles.timeRow)}>
            <span {...stylex.props(styles.timeLabel)}>
              <Icon name="time" size={16} />
              {clock.format(new Date(epochOf({ ...shown, minute: minuteShown })))}
            </span>
            <TimeMenu
              label="Hour"
              value={shown.hour}
              options={hours}
              onChange={(hour) => pickTime({ hour })}
            />
            <TimeMenu
              label="Minute"
              value={minuteShown}
              options={minutes}
              onChange={(minute) => pickTime({ minute })}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TimeMenu({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  onChange: (value: number) => void;
}) {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    <Menu
      label={label}
      align="start"
      items={options.map((option) => ({
        id: String(option),
        label: pad(option),
        selected: option === value,
        onSelect: () => onChange(option),
      }))}
    >
      {pad(value)}
    </Menu>
  );
}

const focusRing = {
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
} as const;

const styles = stylex.create({
  root: {
    minWidth: 0,
    position: 'relative',
    width: '100%',
  },
  // Mirrors the Field control in Field.tsx: sunken ground, focus as an inner
  // accent ring, nothing painted outside the box.
  trigger: {
    alignItems: 'center',
    backgroundColor: {
      default: color.surfaceRaised,
      ':disabled': color.surfaceSubtle,
    },
    borderColor: {
      default: color.border,
      ':hover': color.borderStrong,
      ':focus': color.accent,
    },
    borderRadius: radius.sm,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxShadow: {
      default: 'none',
      ':focus': `inset 0 0 0 ${mesh.line} ${color.accent}`,
    },
    boxSizing: 'border-box',
    color: color.textPrimary,
    cursor: {
      default: 'pointer',
      ':disabled': 'not-allowed',
    },
    display: 'flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeBody,
    gap: space[2],
    justifyContent: 'space-between',
    lineHeight: text.lineBody,
    minHeight: control.heightLg,
    opacity: {
      ':disabled': 0.55,
    },
    outlineStyle: 'none',
    paddingBlock: space[2],
    paddingInline: space[3],
    textAlign: 'start',
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'border-color, box-shadow',
    transitionTimingFunction: motion.ease,
    width: '100%',
  },
  triggerOpen: {
    borderColor: color.accent,
    boxShadow: `inset 0 0 0 ${mesh.line} ${color.accent}`,
  },
  triggerLabel: {
    minWidth: 0,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  placeholder: {
    color: color.textMuted,
  },
  triggerIcon: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'inline-flex',
    flexShrink: 0,
  },
  panel: {
    animationDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: `translateY(${space[1]})` },
      to: { opacity: 1, transform: 'translateY(0)' },
    }),
    animationTimingFunction: motion.ease,
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxShadow: shadow.overlay,
    boxSizing: 'border-box',
    display: 'flex',
    flexDirection: 'column',
    fontFamily: text.familyUi,
    gap: space[2],
    overflowY: 'auto',
    padding: space[3],
    position: 'fixed',
    zIndex: zIndex.menu,
  },
  panelDown: {
    animationName: stylex.keyframes({
      from: { opacity: 0, transform: `translateY(calc(${space[1]} * -1))` },
      to: { opacity: 1, transform: 'translateY(0)' },
    }),
  },
  panelAt: (blockStart: string, blockEnd: string, inlineStart: string, maxBlock: string) => ({
    insetBlockEnd: blockEnd,
    insetBlockStart: blockStart,
    insetInlineStart: inlineStart,
    marginBlock: space[1],
    maxBlockSize: maxBlock,
  }),
  monthBar: {
    alignItems: 'center',
    display: 'flex',
    gap: space[2],
    justifyContent: 'space-between',
  },
  monthLabel: {
    color: color.textPrimary,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
  },
  grid: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[1],
  },
  week: {
    display: 'grid',
    gap: space[1],
    gridTemplateColumns: `repeat(${DAYS_PER_WEEK}, ${control.heightMd})`,
  },
  weekday: {
    color: color.textMuted,
    fontSize: text.sizeCaption,
    lineHeight: control.heightSm,
    textAlign: 'center',
  },
  day: {
    ...focusRing,
    alignItems: 'center',
    backgroundColor: {
      default: 'transparent',
      ':hover': color.surfaceSubtle,
    },
    blockSize: control.heightMd,
    borderColor: 'transparent',
    borderRadius: radius.sm,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    boxSizing: 'border-box',
    color: color.textPrimary,
    cursor: 'pointer',
    display: 'flex',
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontVariantNumeric: 'tabular-nums',
    justifyContent: 'center',
    lineHeight: text.lineBodySmall,
    padding: 0,
  },
  dayToday: {
    borderColor: color.borderStrong,
  },
  daySelected: {
    backgroundColor: {
      default: color.solid,
      ':hover': color.solidHover,
    },
    borderColor: color.solid,
    color: color.textInverse,
  },
  timeRow: {
    alignItems: 'center',
    borderBlockStartColor: color.border,
    borderBlockStartStyle: 'solid',
    borderBlockStartWidth: mesh.line,
    display: 'flex',
    gap: space[2],
    paddingBlockStart: space[2],
  },
  timeLabel: {
    alignItems: 'center',
    color: color.textMuted,
    display: 'inline-flex',
    flexGrow: 1,
    fontFamily: text.familyMono,
    fontSize: text.sizeCaption,
    fontVariantNumeric: 'tabular-nums',
    gap: space[1],
    lineHeight: text.lineCaption,
  },
});
