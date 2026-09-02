import { useState, type ReactNode } from 'react';
import { Menu } from './Menu.tsx';

export type SelectOption = {
  value: string;
  label: string;
  /** Leading visual for the option and the closed trigger. 16px square. */
  icon?: ReactNode;
};

/**
 * The form field that replaces a native `<select>`, whose popup the theme
 * cannot reach. The panel, keyboard handling, and placement all come from
 * Menu; this adds the value: held in state, mirrored into a hidden input so
 * `new FormData(form)` reads it under `name` exactly as it read the native
 * control.
 *
 * Uncontrolled, like the `<select defaultValue>` it stands in for. Without a
 * `defaultValue` it opens on the first option, as the native control would.
 */
export function Select({
  id,
  name,
  options,
  defaultValue,
  label,
  disabled = false,
  onChange,
}: {
  /** Reached by the surrounding Field's `<label htmlFor>`. */
  id?: string;
  /** Key the value submits under; omit for a select outside any form. */
  name?: string;
  options: SelectOption[];
  defaultValue?: string;
  /** Accessible name, when no `<label htmlFor={id}>` provides one. */
  label?: string;
  disabled?: boolean;
  onChange?: (value: string) => void;
}) {
  const [value, setValue] = useState(() => defaultValue ?? options[0]?.value ?? '');
  const current = options.find((option) => option.value === value);
  return (
    <>
      <Menu
        variant="field"
        align="start"
        label={label}
        triggerId={id}
        disabled={disabled}
        items={options.map((option) => ({
          id: option.value,
          label: option.label,
          icon: option.icon,
          selected: option.value === value,
          onSelect: () => {
            setValue(option.value);
            onChange?.(option.value);
          },
        }))}
      >
        {current?.icon}
        {current?.label ?? ''}
      </Menu>
      {name == null ? null : <input type="hidden" name={name} value={value} />}
    </>
  );
}
