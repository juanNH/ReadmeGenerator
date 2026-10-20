import { useId, useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export const settingsSelectClassName =
  "min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 text-base focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none sm:text-sm";

export const settingsSummaryClassName =
  "min-h-7 cursor-pointer rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring";

export function SettingsToggle({
  label,
  help,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  help?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex min-w-0 items-start gap-1">
      <Checkbox
        id={id}
        checked={checked}
        disabled={disabled}
        aria-describedby={help ? `${id}-help` : undefined}
        onCheckedChange={(next) => onChange(next === true)}
      />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer py-2.5 text-sm leading-5">
        {label}
        {help && (
          <span id={`${id}-help`} className="mt-1 block text-xs leading-5 text-muted-foreground">
            {help}
          </span>
        )}
      </label>
    </div>
  );
}

/** Invalid number text stays in the field until corrected; only valid values enter the document. */
export function SettingsNumber({
  label,
  help,
  value,
  min,
  max,
  step = 1,
  validate,
  errorMessage,
  onChange,
}: {
  label: string;
  help?: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  validate?: (value: number) => boolean;
  errorMessage: string;
  onChange: (value: number) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState<string>();
  const text = draft ?? String(value);
  const parsed = Number(text);
  const valid =
    text.trim() !== "" &&
    Number.isFinite(parsed) &&
    parsed >= min &&
    parsed <= max &&
    (step !== 1 || Number.isInteger(parsed)) &&
    (!validate || validate(parsed));
  return (
    <Field htmlFor={id} label={label} description={help} error={valid ? undefined : errorMessage}>
      <Input
        type="number"
        min={min}
        max={max}
        step={step}
        value={text}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          const number = Number(next);
          if (
            next.trim() !== "" &&
            Number.isFinite(number) &&
            number >= min &&
            number <= max &&
            (step !== 1 || Number.isInteger(number)) &&
            (!validate || validate(number))
          ) {
            onChange(number);
          }
        }}
        onBlur={() => {
          if (valid) {
            if (draft !== undefined && parsed !== value) onChange(parsed);
            setDraft(undefined);
          }
        }}
      />
    </Field>
  );
}

export function splitSettingsList(source: string): string[] {
  return source
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
