import { createElement as h, forwardRef, useId } from 'react';

// Source SVG markup is provided by the installed Central Icons package.
// Scope clip paths and masks per instance, including repeated copies of an icon.
export function createIcon(name, markup, fallbackTitle) {
  const Icon = forwardRef(function Icon({
    size = 24, color, style, title, ariaHidden, mode = 'masked',
    children: _children, dangerouslySetInnerHTML: _html, ...props
  }, ref) {
    const instanceId = useId();
    const prefix = `ci-${name}-${Array.from(instanceId, char => char.codePointAt(0).toString(16)).join('-')}`;
    const maskId = `${prefix}-mask`;
    const scoped = markup.replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}-${id}"`)
      .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}-${id})`);
    const hidden = props['aria-hidden'] ?? ariaHidden ?? !title;
    const isHidden = hidden === true || hidden === 'true';
    const accessibleTitle = isHidden ? undefined : (title || fallbackTitle);
    const content = h('g', { dangerouslySetInnerHTML: { __html: scoped } });
    return h('svg', {
      width: size, height: size, ...props, ref,
      xmlns: 'http://www.w3.org/2000/svg', viewBox: '0 0 24 24', fill: 'none',
      'aria-hidden': hidden, role: isHidden ? undefined : 'img',
      style: { color, ...style },
    }, accessibleTitle ? h('title', null, accessibleTitle) : null,
    mode === 'raw' ? content : [
      h('mask', { key: 'mask', id: maskId, maskUnits: 'userSpaceOnUse', x: 0, y: 0, width: 24, height: 24, style: { maskType: 'luminance' } },
        h('rect', { width: 24, height: 24, fill: '#000' }),
        h('g', { fill: 'none', style: { color: '#fff' } }, content)),
      h('rect', { key: 'paint', width: 24, height: 24, fill: 'currentColor', mask: `url(#${maskId})` }),
    ]);
  });
  Icon.displayName = name;
  return Icon;
}
