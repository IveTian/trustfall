import type { ComponentStatus } from '@trustfall/shared';
import { Card, type CardSurface } from './Card.tsx';
import { ComponentRow } from './ComponentRow.tsx';
import { Stack } from './Stack.tsx';
import { Text } from './Text.tsx';

export type PublicComponent = {
  id: string;
  displayName: string;
  description?: string | null;
  status: ComponentStatus;
};

export function ComponentGroupSection({
  displayName,
  description,
  components,
  surface,
}: {
  displayName: string;
  description?: string | null;
  components: PublicComponent[];
  surface?: CardSurface;
}) {
  return (
    <Card as="section" surface={surface}>
      <Stack gap={3}>
        <div>
          <Text as="h2" tone="title">
            {displayName}
          </Text>
          {description ? <Text tone="muted">{description}</Text> : null}
        </div>
        <Stack as="ul" gap={0}>
          {components.map((component, index) => (
            <ComponentRow
              key={component.id}
              displayName={component.displayName}
              description={component.description}
              status={component.status}
              last={index === components.length - 1}
            />
          ))}
        </Stack>
      </Stack>
    </Card>
  );
}
