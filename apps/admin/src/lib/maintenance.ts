import { formatDuration } from '@trustfall/design';
import type {
  MaintenanceFrequency,
  MaintenanceRecurrence,
  MaintenanceStatus,
} from '@trustfall/shared';

/** The API's shape of a recurrence: snake_case, RFC 3339 `until`. */
export type MaintenanceRecurrenceDto = {
  frequency: MaintenanceFrequency;
  interval: number;
  by_weekday?: number[];
  until: string | null;
};

export type MaintenanceUpdate = {
  id: string;
  maintenance_id: string;
  status: MaintenanceStatus;
  body: string;
  automatic: boolean;
  created_at: string;
};

export type Maintenance = {
  id: string;
  title: string;
  status: MaintenanceStatus;
  /** The tracked window: under way, or next to open. */
  starts_at: string;
  ends_at: string;
  schedule: {
    starts_at: string;
    ends_at: string;
    duration_minutes: number;
    recurrence: MaintenanceRecurrenceDto | null;
    time_zone: string;
  };
  next_windows: Array<{ starts_at: string; ends_at: string }>;
  affected_components: Array<{ component_id: string; display_name: string }>;
  /** Newest first; the announcement is last. */
  updates: MaintenanceUpdate[];
  created_at: string;
  updated_at: string;
};

/** What POST and PATCH /maintenances accept. */
export type MaintenancePayload = {
  title?: string;
  body?: string;
  component_ids?: string[];
  starts_at?: string;
  duration_minutes?: number;
  recurrence?: MaintenanceRecurrenceDto | null;
  time_zone?: string;
};

export const DURATION_OPTIONS = [
  15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 720, 1440, 2880,
] as const;

export function durationOptions(current?: number) {
  const values = [...DURATION_OPTIONS] as number[];
  // An edit keeps whatever length the maintenance already has, even one the
  // presets do not offer.
  if (current !== undefined && !values.includes(current)) {
    values.push(current);
    values.sort((a, b) => a - b);
  }
  return values.map((minutes) => ({
    value: String(minutes),
    label: formatDuration(minutes * 60_000),
  }));
}

/** The console schedules in the operator's own zone. */
export function localTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function toRecurrence(dto: MaintenanceRecurrenceDto | null): MaintenanceRecurrence | null {
  if (!dto) {
    return null;
  }
  return {
    frequency: dto.frequency,
    interval: dto.interval,
    ...(dto.by_weekday ? { byWeekday: dto.by_weekday } : {}),
    until: dto.until == null ? null : Date.parse(dto.until),
  };
}

export function toRecurrenceDto(
  recurrence: MaintenanceRecurrence | null,
): MaintenanceRecurrenceDto | null {
  if (!recurrence) {
    return null;
  }
  return {
    frequency: recurrence.frequency,
    interval: recurrence.interval,
    ...(recurrence.byWeekday ? { by_weekday: recurrence.byWeekday } : {}),
    until: recurrence.until == null ? null : new Date(recurrence.until).toISOString(),
  };
}

/** The announcement: the oldest timeline entry. */
export function announcementOf(maintenance: Maintenance): MaintenanceUpdate | undefined {
  return maintenance.updates[maintenance.updates.length - 1];
}
