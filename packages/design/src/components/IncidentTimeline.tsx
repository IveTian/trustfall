import * as stylex from '@stylexjs/stylex';
import type { ComponentStatus, IncidentStatus } from '@trustfall/shared';
import type { ReactNode } from 'react';
import {
  componentStatusPresentation,
  incidentStatusGlyph,
  incidentStatusPresentation,
} from '../status.ts';
import { color } from '../tokens/color.stylex.ts';
import { control, mesh } from '../tokens/const.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Icon } from './Icon.tsx';
import { RichTextBody } from './RichTextBody.tsx';
import { StatusIcon } from './StatusIcon.tsx';
import { Text } from './Text.tsx';

export type TimelineAffectedComponent = {
  componentId: string;
  displayName: string;
  status: ComponentStatus;
};

export type TimelineUpdate = {
  id: string;
  status: IncidentStatus;
  body: string;
  createTime: number;
  /** The affected set as this update left it. Omitted for entries without one. */
  components?: TimelineAffectedComponent[];
};

/** "GMT+8" for the zone the times are shown in; the IANA name when unknown. */
export function timeZoneLabel(timeZone: string | undefined, at: number): string {
  try {
    const part = new Intl.DateTimeFormat('en', { timeZone, timeZoneName: 'shortOffset' })
      .formatToParts(new Date(at))
      .find((item) => item.type === 'timeZoneName');
    return part?.value ?? timeZone ?? 'local time';
  } catch {
    return timeZone ?? 'local time';
  }
}

function dayKey(at: number, timeZone: string | undefined): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(at));
}

/**
 * The incident's story, newest first: a day heading, then every entry on a
 * rail of what the responders were doing — the clock time on the start edge,
 * a glyph for the step, the message, and the affected set the entry left
 * behind. `renderActions` puts a console's per-entry controls on the end edge.
 */
export function IncidentTimeline({
  updates,
  timeZone,
  renderActions,
}: {
  /** Newest first. */
  updates: TimelineUpdate[];
  /** IANA zone the clock times are shown in; the viewer's own when omitted. */
  timeZone?: string;
  renderActions?: (update: TimelineUpdate) => ReactNode;
}) {
  const clock = new Intl.DateTimeFormat(undefined, {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
  const day = new Intl.DateTimeFormat(undefined, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const days: Array<{ key: string; at: number; updates: TimelineUpdate[] }> = [];
  for (const update of updates) {
    const key = dayKey(update.createTime, timeZone);
    const last = days[days.length - 1];
    if (last && last.key === key) {
      last.updates.push(update);
    } else {
      days.push({ key, at: update.createTime, updates: [update] });
    }
  }

  const zone = updates[0] ? timeZoneLabel(timeZone, updates[0].createTime) : null;

  return (
    <div {...stylex.props(styles.root)}>
      {days.map((group, groupIndex) => (
        <section key={group.key} {...stylex.props(styles.day)}>
          <header {...stylex.props(styles.dayHeader)}>
            <Text as="h3" tone="caption">
              {day.format(new Date(group.at))}
            </Text>
            {groupIndex === 0 && zone ? (
              <Text as="span" tone="caption">
                Times shown in {zone}
              </Text>
            ) : null}
          </header>
          <ol {...stylex.props(styles.list)}>
            {group.updates.map((update, index) => {
              const presentation = incidentStatusPresentation[update.status];
              const last = groupIndex === days.length - 1 && index === group.updates.length - 1;
              return (
                <li key={update.id} {...stylex.props(styles.entry)}>
                  <time
                    dateTime={new Date(update.createTime).toISOString()}
                    {...stylex.props(styles.clock)}
                  >
                    {clock.format(new Date(update.createTime))}
                  </time>
                  <div {...stylex.props(styles.rail)}>
                    <span aria-hidden {...stylex.props(styles.glyph, glyphTone[presentation.tone])}>
                      <Icon name={incidentStatusGlyph[update.status]} size={16} />
                    </span>
                    {last ? null : <span {...stylex.props(styles.line)} />}
                  </div>
                  <div {...stylex.props(styles.content)}>
                    <div {...stylex.props(styles.heading)}>
                      <span {...stylex.props(styles.status)}>{presentation.label}</span>
                      {renderActions ? (
                        <span {...stylex.props(styles.actions)}>{renderActions(update)}</span>
                      ) : null}
                    </div>
                    <RichTextBody markdown={update.body} />
                    {update.components && update.components.length > 0 ? (
                      <ul {...stylex.props(styles.affected)}>
                        {update.components.map((component) => {
                          const status = componentStatusPresentation[component.status];
                          return (
                            <li key={component.componentId} {...stylex.props(styles.affectedRow)}>
                              <StatusIcon
                                icon={status.icon}
                                tone={status.tone}
                                title={status.label}
                              />
                              <span {...stylex.props(styles.affectedName)}>
                                {component.displayName}
                              </span>
                              <span {...stylex.props(styles.affectedStatus)}>{status.label}</span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </div>
  );
}

const glyphTone = stylex.create({
  operational: { backgroundColor: color.operationalMuted, color: color.operational },
  degraded: { backgroundColor: color.degradedMuted, color: color.degraded },
  partialOutage: { backgroundColor: color.partialOutageMuted, color: color.partialOutage },
  majorOutage: { backgroundColor: color.majorOutageMuted, color: color.majorOutage },
  maintenance: { backgroundColor: color.maintenanceMuted, color: color.maintenance },
});

const styles = stylex.create({
  root: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[5],
  },
  day: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[3],
  },
  dayHeader: {
    alignItems: 'baseline',
    display: 'flex',
    gap: space[3],
    justifyContent: 'space-between',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    margin: 0,
    padding: 0,
  },
  // Three columns: the clock, the rail, the entry. The rail's line runs the
  // full row height so consecutive entries read as one thread.
  entry: {
    display: 'grid',
    gap: space[3],
    gridTemplateColumns: 'auto auto minmax(0, 1fr)',
    paddingBlockEnd: space[5],
  },
  clock: {
    color: color.textMuted,
    fontFamily: text.familyMono,
    fontSize: text.sizeCaption,
    fontVariantNumeric: 'tabular-nums',
    lineHeight: control.markSize,
    minWidth: space[6],
  },
  rail: {
    alignItems: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: space[2],
  },
  glyph: {
    alignItems: 'center',
    blockSize: control.markSize,
    borderRadius: radius.sm,
    display: 'flex',
    flexShrink: 0,
    inlineSize: control.markSize,
    justifyContent: 'center',
  },
  line: {
    backgroundColor: color.border,
    flexGrow: 1,
    inlineSize: mesh.line,
    marginBlockEnd: `calc(${space[5]} * -1)`,
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: space[2],
    minWidth: 0,
  },
  heading: {
    alignItems: 'center',
    display: 'flex',
    gap: space[3],
    justifyContent: 'space-between',
    minBlockSize: control.markSize,
  },
  status: {
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeBody,
    fontWeight: text.weightBold,
    lineHeight: text.lineBody,
  },
  actions: {
    alignItems: 'center',
    display: 'flex',
    flexShrink: 0,
    gap: space[1],
  },
  affected: {
    backgroundColor: color.surfaceRaised,
    borderColor: color.border,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    display: 'flex',
    flexDirection: 'column',
    listStyle: 'none',
    margin: 0,
    marginBlockStart: space[1],
    padding: 0,
  },
  affectedRow: {
    alignItems: 'center',
    borderBlockEndColor: color.border,
    borderBlockEndStyle: 'solid',
    borderBlockEndWidth: {
      default: mesh.line,
      ':last-child': 0,
    },
    display: 'flex',
    gap: space[2],
    paddingBlock: space[2],
    paddingInline: space[3],
  },
  affectedName: {
    color: color.textPrimary,
    flexGrow: 1,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    fontWeight: text.weightMedium,
    lineHeight: text.lineBodySmall,
    minWidth: 0,
  },
  affectedStatus: {
    color: color.textMuted,
    flexShrink: 0,
    fontFamily: text.familyUi,
    fontSize: text.sizeBodySmall,
    lineHeight: text.lineBodySmall,
  },
});
