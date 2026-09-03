import type { SVGProps, ForwardRefExoticComponent, RefAttributes } from 'react';

export type IconProps = Omit<SVGProps<SVGSVGElement>, 'children' | 'dangerouslySetInnerHTML'> & {
  size?: number | string;
  title?: string;
  ariaHidden?: boolean;
  mode?: 'masked' | 'raw';
};
export type IconComponent = ForwardRefExoticComponent<Omit<IconProps, 'ref'> & RefAttributes<SVGSVGElement>>;
export declare function createIcon(name: string, markup: string, fallbackTitle: string): IconComponent;
