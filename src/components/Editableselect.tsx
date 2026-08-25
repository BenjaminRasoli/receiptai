"use client";

import { useState } from "react";

type Props = {
  value: string;
  options: string[];
  onChange: (value: string) => void;
  placeholder?: string;
  selectClassName?: string;
  inputClassName?: string;
  linkClassName?: string;
};

const ADD_NEW = "__add_new__";

export default function EditableSelect({
  value,
  options,
  onChange,
  placeholder = "Type a new value...",
  selectClassName,
  inputClassName,
  linkClassName,
}: Props) {
  const [isAdding, setIsAdding] = useState(
    () => Boolean(value) && !options.includes(value),
  );

  const effectiveOptions =
    value && !options.includes(value) ? [...options, value] : options;

  if (isAdding) {
    return (
      <div className="flex items-center gap-2">
        <input
          autoFocus
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          className={inputClassName}
        />
        {options.length > 0 ? (
          <button
            type="button"
            onClick={() => setIsAdding(false)}
            className={
              linkClassName ??
              "cursor-pointer whitespace-nowrap text-xs font-medium text-slate-500 hover:text-slate-900"
            }
          >
            Choose existing
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <select
      value={value}
      onChange={(event) => {
        if (event.target.value === ADD_NEW) {
          setIsAdding(true);
          return;
        }
        onChange(event.target.value);
      }}
      className={selectClassName}
    >
      <option value="" disabled={value !== ""}>
        Select...
      </option>
      {effectiveOptions.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
      <option value={ADD_NEW}>+ Add new…</option>
    </select>
  );
}
