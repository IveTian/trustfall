import * as stylex from '@stylexjs/stylex';
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react';
import { control } from '../tokens/const.stylex.ts';
import { color } from '../tokens/color.stylex.ts';
import { radius } from '../tokens/radius.stylex.ts';
import { space } from '../tokens/space.stylex.ts';
import { text } from '../tokens/text.stylex.ts';
import { Stack } from './Stack.tsx';
import { Text } from './Text.tsx';

const styles = stylex.create({
  control: {
    backgroundColor: color.surface,
    borderRadius: radius.md,
    borderStyle: 'solid',
    borderWidth: '1px',
    color: color.textPrimary,
    fontFamily: text.familyUi,
    fontSize: text.sizeBody,
    lineHeight: text.lineBody,
    paddingBlock: space[2],
    paddingInline: space[3],
    width: '100%',
    borderColor: {
      default: color.border,
      ':focus-visible': color.accent,
    },
    outlineColor: {
      ':focus-visible': color.focus,
    },
    outlineOffset: {
      ':focus-visible': control.focusOffset,
    },
    outlineStyle: {
      ':focus-visible': 'solid',
    },
    outlineWidth: {
      ':focus-visible': control.focusWidth,
    },
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
      <Text as="legend" tone="caption">
        <label htmlFor={htmlFor}>{label}</label>
      </Text>
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

export function Select({
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select {...props} {...stylex.props(styles.control)}>
      {children}
    </select>
  );
}
