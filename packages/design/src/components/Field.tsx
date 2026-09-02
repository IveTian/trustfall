import * as stylex from '@stylexjs/stylex';
import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';
import { breakpoints, control, mesh, motion } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Stack } from './Stack.tsx';
import { Text } from './Text.tsx';

const styles = stylex.create({
  control: {
    backgroundColor: color.surfaceSunken,
    // Focus reads as an inner ring: the border turns accent and an inset
    // shadow doubles its weight, so nothing is painted outside the field.
    borderColor: {
      default: color.surfaceSunken,
      ':hover': color.border,
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
    fontFamily: text.familyUi,
    fontSize: text.sizeBody,
    lineHeight: text.lineBody,
    minHeight: control.heightLg,
    outlineStyle: 'none',
    paddingBlock: space[2],
    paddingInline: space[3],
    transitionDuration: {
      default: motion.fast,
      [breakpoints.reduceMotion]: '0ms',
    },
    transitionProperty: 'border-color, box-shadow',
    transitionTimingFunction: motion.ease,
    width: '100%',
  },
  area: {
    minHeight: space[8],
    resize: 'vertical',
  },
});

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <Stack gap={1} as="div">
      <label htmlFor={htmlFor}>
        <Text as="span" tone="caption">
          {label}
        </Text>
      </label>
      {children}
      {hint ? <Text tone="caption">{hint}</Text> : null}
    </Stack>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} {...stylex.props(styles.control)} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} {...stylex.props(styles.control, styles.area)} />;
}
