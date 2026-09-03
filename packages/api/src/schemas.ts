import { z } from '@hono/zod-openapi';
import {
  COMPONENT_STATUSES,
  INCIDENT_IMPACTS,
  INCIDENT_STATUSES,
  MAINTENANCE_FREQUENCIES,
  MAINTENANCE_STATUSES,
} from '@trustfall/shared';

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

const timestamp = (description: string) =>
  z.string().openapi({
    description,
    format: 'date-time',
    example: '2026-09-01T12:30:00Z',
  });

export const componentStatusSchema = z.enum(COMPONENT_STATUSES).openapi({
  description:
    'Health of a component. The set grows over time; clients should tolerate values they do not know.',
});

export const incidentStatusSchema = z.enum(INCIDENT_STATUSES).openapi({
  description: 'Where an incident sits in its lifecycle. Only RESOLVED closes it.',
});

export const incidentImpactSchema = z.enum(INCIDENT_IMPACTS).openapi({
  description: 'How badly the incident affects users.',
});

export const maintenanceStatusSchema = z.enum(MAINTENANCE_STATUSES).openapi({
  description:
    'Where a maintenance sits in its life. SCHEDULED is the window ahead (for a series, the next one); IN_PROGRESS is the window under way. COMPLETED and CANCELLED are terminal.',
});

export const maintenanceFrequencySchema = z.enum(MAINTENANCE_FREQUENCIES);

export const problemSchema = z
  .object({
    type: z.string().openapi({
      description: 'Stable identifier for the kind of failure. Branch on this, not on `detail`.',
      example: '/problems/not-found',
    }),
    title: z.string().openapi({ example: 'Not found' }),
    status: z.number().int().openapi({ example: 404 }),
    detail: z.string().openapi({ example: 'Incident not found.' }),
    instance: z.string().optional().openapi({ example: '/api/incidents/inc_9f2' }),
    invalid_params: z
      .array(z.object({ name: z.string(), reason: z.string() }))
      .optional()
      .openapi({ description: 'Field-level causes, present on validation failures.' }),
  })
  .openapi('Problem');

export const componentSchema = z
  .object({
    id: z.string().openapi({ description: 'Opaque identifier.', example: 'cmp_1f0a' }),
    display_name: z.string(),
    description: z.string().nullable(),
    status: componentStatusSchema,
    group_id: z
      .string()
      .nullable()
      .openapi({ description: 'Owning group, or null when ungrouped.' }),
    position: z.number().int().openapi({ description: 'Sort order within its group, ascending.' }),
    created_at: timestamp('When the component was created.'),
    updated_at: timestamp('When the component last changed.'),
  })
  .openapi('Component');

export const componentGroupSchema = z
  .object({
    id: z.string().openapi({ example: 'grp_4c81' }),
    display_name: z.string(),
    description: z.string().nullable(),
    position: z.number().int(),
    created_at: timestamp('When the group was created.'),
    updated_at: timestamp('When the group last changed.'),
  })
  .openapi('ComponentGroup');

export const affectedComponentSchema = z
  .object({
    component_id: z.string(),
    display_name: z.string(),
    status: componentStatusSchema,
  })
  .openapi('AffectedComponent');

export const incidentUpdateSchema = z
  .object({
    id: z.string().openapi({ example: 'upd_7b39' }),
    incident_id: z.string(),
    status: incidentStatusSchema,
    body: z.string(),
    created_at: timestamp('When the update was posted.'),
    affected_components: z.array(affectedComponentSchema).openapi({
      description:
        'The affected set as this update left it. A RESOLVED update lists every component at OPERATIONAL.',
    }),
  })
  .openapi('IncidentUpdate');

export const incidentSchema = z
  .object({
    id: z.string().openapi({ example: 'inc_a53d' }),
    title: z.string(),
    status: incidentStatusSchema,
    impact: incidentImpactSchema,
    started_at: timestamp('When the incident began.'),
    resolved_at: timestamp('When the incident was resolved, or null while it is open.').nullable(),
    created_at: timestamp('When the incident record was created.'),
    updated_at: timestamp('When the incident last changed.'),
    affected_components: z.array(affectedComponentSchema),
    updates: z.array(incidentUpdateSchema).openapi({
      description:
        'Timeline, newest first. Paginate /incidents/{incident_id}/updates for long ones.',
    }),
  })
  .openapi('Incident');

export const maintenanceRecurrenceSchema = z
  .object({
    frequency: maintenanceFrequencySchema,
    interval: z
      .number()
      .int()
      .min(1)
      .max(99)
      .openapi({ description: 'The step: every 2 weeks, every 3 months.' }),
    by_weekday: z.array(z.number().int().min(0).max(6)).min(1).max(7).optional().openapi({
      description:
        'WEEKLY only: days of the week, 0 = Sunday. Defaults to the weekday of the first window.',
    }),
    until: timestamp('Last instant a window may start. Omit or null for a series with no end.')
      .nullable()
      .optional(),
  })
  .openapi('MaintenanceRecurrence');

export const maintenanceWindowSchema = z
  .object({
    starts_at: timestamp('When the window opens.'),
    ends_at: timestamp('When the window closes.'),
  })
  .openapi('MaintenanceWindow');

export const maintenanceUpdateSchema = z
  .object({
    id: z.string().openapi({ example: 'mup_7b39' }),
    maintenance_id: z.string(),
    status: maintenanceStatusSchema,
    body: z.string(),
    automatic: z.boolean().openapi({
      description:
        'True when the scheduler wrote the entry as a window opened or closed on its own.',
    }),
    created_at: timestamp('When the update was posted.'),
  })
  .openapi('MaintenanceUpdate');

export const maintenanceSchema = z
  .object({
    id: z.string().openapi({ example: 'mnt_a53d' }),
    title: z.string(),
    status: maintenanceStatusSchema,
    starts_at: timestamp(
      'When the tracked window opens: the one under way, or the next to open. For a finished maintenance, its last window. A window started by hand keeps its planned start; the IN_PROGRESS update says when it really began.',
    ),
    ends_at: timestamp('When the tracked window closes.'),
    schedule: z
      .object({
        starts_at: timestamp('When the first (or only) window was planned to open.'),
        ends_at: timestamp('When the first window was planned to close.'),
        duration_minutes: z.number().int(),
        recurrence: maintenanceRecurrenceSchema.nullable(),
        time_zone: z.string().openapi({
          description: 'IANA zone the recurrence keeps its wall-clock time in.',
          example: 'Asia/Shanghai',
        }),
      })
      .openapi({ description: 'What the operator set; the tracked window is derived from it.' }),
    next_windows: z.array(maintenanceWindowSchema).openapi({
      description: 'For a series, up to five windows after the tracked one. Empty otherwise.',
    }),
    affected_components: z.array(z.object({ component_id: z.string(), display_name: z.string() })),
    updates: z.array(maintenanceUpdateSchema).openapi({
      description:
        'Timeline, newest first. Paginate /maintenances/{maintenance_id}/updates for long ones.',
    }),
    created_at: timestamp('When the maintenance record was created.'),
    updated_at: timestamp('When the maintenance last changed.'),
  })
  .openapi('Maintenance');

export const statusSchema = z
  .object({
    overall_status: componentStatusSchema.openapi({
      description: 'Worst status across every component.',
    }),
    site_name: z.string(),
    site_description: z.string(),
    component_groups: z.array(
      componentGroupSchema.extend({ components: z.array(componentSchema) }),
    ),
    ungrouped_components: z.array(componentSchema),
    active_incidents: z.array(incidentSchema),
    active_maintenances: z.array(maintenanceSchema).openapi({
      description: 'Windows under way, then the next to open, soonest first.',
    }),
  })
  .openapi('Status');

export const settingsSchema = z
  .object({
    site_name: z.string(),
    site_description: z.string(),
  })
  .openapi('Settings');

export const setupSchema = z
  .object({
    initialized: z.boolean().openapi({ description: 'True once the owner account exists.' }),
  })
  .openapi('Setup');

export const inviteLinkStateSchema = z.enum(['ACTIVE', 'EXHAUSTED', 'REVOKED']).openapi({
  description:
    'ACTIVE can still be used to register. EXHAUSTED has hit `max_uses`. REVOKED was cancelled.',
});

export const inviteLinkSchema = z
  .object({
    id: z.string().openapi({ example: 'inv_1f0a' }),
    token: z.string().openapi({
      description:
        'Secret in the registration URL. Anyone who has it can register until the link is spent or revoked.',
    }),
    url: z.string().openapi({
      description: 'Absolute registration URL to share.',
      example: 'https://status.example.com/admin/register?invite=ab12',
    }),
    max_uses: z.number().int().openapi({ description: 'How many accounts this link may create.' }),
    use_count: z
      .number()
      .int()
      .openapi({ description: 'How many accounts have already been created with it.' }),
    remaining_uses: z.number().int(),
    state: inviteLinkStateSchema,
    created_by: z
      .string()
      .openapi({ description: 'User id of the operator who generated the link.' }),
    revoked_at: timestamp('When the link was revoked, or null while it is active.').nullable(),
    created_at: timestamp('When the link was generated.'),
    updated_at: timestamp('When the link last changed.'),
  })
  .openapi('InviteLink');

export const publicInviteSchema = z
  .object({
    state: inviteLinkStateSchema,
    remaining_uses: z.number().int(),
  })
  .openapi('PublicInvite');

export const registrationSchema = z
  .object({
    email: z.email(),
    display_name: z.string(),
  })
  .openapi('Registration');

/**
 * Collections are objects, never bare arrays, so page metadata and later
 * additions have somewhere to live.
 */
export function collectionSchema<T extends z.ZodType>(item: T, name: string) {
  return z
    .object({
      items: z.array(item),
      next_cursor: z.string().optional().openapi({
        description: 'Pass back as `cursor` for the next page. Absent on the last page.',
      }),
    })
    .openapi(name);
}

export const pageQuery = z.object({
  page_size: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .optional()
    .openapi({
      description: `Items per page. Defaults to ${DEFAULT_PAGE_SIZE}, capped at ${MAX_PAGE_SIZE}.`,
      example: 25,
    }),
  cursor: z.string().optional().openapi({
    description: 'Opaque cursor from a previous response. Treat it as unreadable.',
  }),
});
