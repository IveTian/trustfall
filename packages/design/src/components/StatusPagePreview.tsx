import * as stylex from '@stylexjs/stylex';
import { color } from '../tokens/color.stylex.ts';
import { mesh } from '../tokens/const.stylex.ts';
import type { PublicComponent } from './ComponentGroupSection.tsx';
import { ServiceGroupList, type PublicServiceGroup } from './ServiceGroupList.tsx';
import { SiteCanvas, SiteHeading, SitePanel } from './SiteShell.tsx';
import { Text } from './Text.tsx';

/**
 * The public Status page as the console sees it: the same heading, canvas
 * and folding tree of group and service blocks the site renders, drawn by
 * the same components, in a frame. Only the history differs — the bars show
 * a clean record, since the point is the shape the setting produces, not the
 * history itself.
 */
export function StatusPagePreview({
  groups,
  ungrouped,
  showHistory,
  now,
}: {
  groups: PublicServiceGroup[];
  ungrouped: PublicComponent[];
  showHistory: boolean;
  now: number;
}) {
  const withHistory = (component: PublicComponent): PublicComponent =>
    showHistory ? { ...component, history: [] } : { ...component, history: undefined };
  const shownGroups = groups
    .filter((group) => group.components.length > 0)
    .map((group) => ({ ...group, components: group.components.map(withHistory) }));
  const shownUngrouped = ungrouped.map(withHistory);

  return (
    <div {...stylex.props(styles.frame)}>
      <SiteCanvas as="div">
        <SiteHeading as="h1">Status</SiteHeading>
        {shownGroups.length === 0 && shownUngrouped.length === 0 ? (
          <SitePanel density="row">
            <Text tone="muted">No components have been published yet.</Text>
          </SitePanel>
        ) : (
          <ServiceGroupList
            // Remount on toggle: the block heights are re-measured from scratch.
            key={showHistory ? 'history' : 'plain'}
            groups={shownGroups}
            ungrouped={shownUngrouped}
            now={now}
          />
        )}
      </SiteCanvas>
    </div>
  );
}

const styles = stylex.create({
  // The site shell's ground, as `site-shell.css` paints it.
  frame: {
    backgroundColor: 'light-dark(#efefef, #141414)',
    borderColor: color.border,
    borderStyle: 'solid',
    borderWidth: mesh.line,
    overflow: 'hidden',
  },
});
