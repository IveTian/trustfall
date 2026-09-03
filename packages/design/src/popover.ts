import { space } from './tokens/space.stylex.ts';

export type PopoverAnchor = {
  blockStart: string;
  blockEnd: string;
  inlineStart: string;
  inlineEnd: string;
  maxBlock: string;
  minWidth: string;
  dropsDown: boolean;
};

function isRtl(element: HTMLElement): boolean {
  return getComputedStyle(element).direction === 'rtl';
}

/**
 * Where a popup panel hangs off its trigger. Shared by every control that
 * opens one — Menu, DateTimePicker — so they all pick the same side.
 *
 * The panel is `position: fixed` so a scrolling row or a panel with
 * `overflow: hidden` cannot clip it; that costs a measurement against the
 * viewport, repeated while the panel is open.
 *
 * The panel hangs off whichever side of the trigger has the room — down from a
 * row with space below, up from one at the foot of the viewport — and never
 * grows past the space it chose.
 */
export function measurePopover(trigger: HTMLElement, align: 'start' | 'end'): PopoverAnchor {
  const rect = trigger.getBoundingClientRect();
  const rtl = isRtl(trigger);
  const startInset = rtl ? window.innerWidth - rect.right : rect.left;
  const endInset = rtl ? rect.left : window.innerWidth - rect.right;
  const below = window.innerHeight - rect.bottom;
  const dropsDown = below >= rect.top;
  return {
    blockStart: dropsDown ? `${rect.bottom}px` : 'auto',
    blockEnd: dropsDown ? 'auto' : `${window.innerHeight - rect.top}px`,
    inlineStart: align === 'start' ? `${startInset}px` : 'auto',
    inlineEnd: align === 'end' ? `${endInset}px` : 'auto',
    maxBlock: `calc(${dropsDown ? below : rect.top}px - ${space[5]})`,
    minWidth: `${rect.width}px`,
    dropsDown,
  };
}
