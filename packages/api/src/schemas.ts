import { z } from '@hono/zod-openapi';
import {
  COMPONENT_STATUSES,
  INCIDENT_IMPACTS,
  INCIDENT_STATUSES,
} from '@trustfall/shared';

export const componentStatusSchema = z.enum(COMPONENT_STATUSES).openapi({
  description: 'Lifecycle of a component.',
});

export const incidentStatusSchema = z.enum(INCIDENT_STATUSES);
export const incidentImpactSchema = z.enum(INCIDENT_IMPACTS);

export const errorSchema = z.object({
  error: z.object({
    code: z.number().int(),
    message: z.string(),
    status: z.string(),
    details: z.array(z.unknown()),
  }),
});

export const componentSchema = z
  .object({
    name: z.string().openapi({ example: 'components/cmp_abc' }),
    displayName: z.string(),
    description: z.string().nullable(),
    status: componentStatusSchema,
    group: z.string().nullable(),
    position: z.number().int(),
    createTime: z.string(),
    updateTime: z.string(),
  })
  .openapi('Component');

export const componentGroupSchema = z
  .object({
    name: z.string(),
    displayName: z.string(),
    description: z.string().nullable(),
    position: z.number().int(),
    createTime: z.string(),
    updateTime: z.string(),
  })
  .openapi('ComponentGroup');

export const incidentUpdateSchema = z
  .object({
    name: z.string(),
    status: incidentStatusSchema,
    body: z.string(),
    createTime: z.string(),
  })
  .openapi('IncidentUpdate');

export const incidentSchema = z
  .object({
    name: z.string(),
    title: z.string(),
    status: incidentStatusSchema,
    impact: incidentImpactSchema,
    startTime: z.string(),
    resolveTime: z.string().nullable(),
    createTime: z.string(),
    updateTime: z.string(),
    components: z.array(
      z.object({
        component: z.string(),
        displayName: z.string(),
        status: componentStatusSchema,
      }),
    ),
    updates: z.array(incidentUpdateSchema),
  })
  .openapi('Incident');

export const summarySchema = z
  .object({
    name: z.literal('summary'),
    overallStatus: componentStatusSchema,
    siteName: z.string(),
    siteDescription: z.string(),
    componentGroups: z.array(
      componentGroupSchema.extend({
        components: z.array(componentSchema),
      }),
    ),
    ungroupedComponents: z.array(componentSchema),
    activeIncidents: z.array(incidentSchema),
  })
  .openapi('Summary');

export const settingsSchema = z
  .object({
    name: z.literal('settings'),
    siteName: z.string(),
    siteDescription: z.string(),
  })
  .openapi('Settings');

export const setupSchema = z
  .object({
    initialized: z.boolean(),
  })
  .openapi('Setup');

export const listMeta = {
  nextPageToken: z.string().optional(),
};

export function resourceName(collection: string, id: string): string {
  return `${collection}/${id}`;
}

export function parseResourceId(name: string, collection: string): string {
  const prefix = `${collection}/`;
  if (name.startsWith(prefix)) {
    return name.slice(prefix.length);
  }
  return name;
}

export function resourceIdFromCustomMethod(
  pathname: string,
  collection: string,
  method: string,
): string {
  const marker = `/${collection}/`;
  const suffix = `:${method}`;
  const start = pathname.lastIndexOf(marker);
  const end = pathname.endsWith(suffix) ? pathname.length - suffix.length : -1;
  if (start === -1 || end <= start) {
    return '';
  }
  return decodeURIComponent(pathname.slice(start + marker.length, end));
}
