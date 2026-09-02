import { useEffect, useRef, useState, type ReactNode } from 'react';
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
  const fallback = defaultValue ?? options[0]?.value ?? '';
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(fallback);
  const current = options.find((option) => option.value === value);

  // form.reset() must return this field to its default, as it would the
  // native select. The hidden input's form association names the owner to
  // listen to; the browser itself never resets a hidden input.
  useEffect(() => {
    const form = inputRef.current?.form;
    if (!form) {
      return;
    }
    const onReset = () => setValue(fallback);
    form.addEventListener('reset', onReset);
    return () => form.removeEventListener('reset', onReset);
  }, [fallback]);
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
      {/* Disabled with the control: a disabled native select never reaches
      FormData, and neither may its stand-in. Rendered even without a name for
      its .form pointer. */}
      <input ref={inputRef} type="hidden" name={name} value={value} disabled={disabled} />
    </>
  );
}
