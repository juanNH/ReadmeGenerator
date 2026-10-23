import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { PresentationFormat } from "@/core/profile/module-content";

const selectClassName =
  "min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 text-base focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none sm:text-sm";

type PresentationFormatFieldsProps = {
  value: PresentationFormat | undefined;
  onChange: (value: PresentationFormat | undefined) => void;
};

/** Stored choices are written only when a control is changed, never on initial render. */
export function PresentationFormatFields({ value, onChange }: PresentationFormatFieldsProps) {
  const t = useTranslations("Editor.presentation");
  function alignmentField(
    field: "displayNameAlignment" | "headlineAlignment" | "bioAlignment" | "locationAlignment",
  ) {
    return (
      <Field htmlFor={`presentation-${field}`} label={t("format.alignment")}>
        <select
          className={selectClassName}
          value={
            value?.[field] ??
            (field === "displayNameAlignment" || field === "headlineAlignment" ? "center" : "left")
          }
          onChange={(event) =>
            onChange({ ...value, [field]: event.target.value as "left" | "center" | "right" })
          }
        >
          <option value="left">{t("format.left")}</option>
          <option value="center">{t("format.center")}</option>
          <option value="right">{t("format.right")}</option>
        </select>
      </Field>
    );
  }
  function levelField(field: "displayNameLevel" | "headlineLevel", defaultLevel: 1 | 2) {
    return (
      <Field htmlFor={`presentation-${field}`} label={t("format.level")}>
        <select
          className={selectClassName}
          value={String(value?.[field] ?? defaultLevel)}
          onChange={(event) => {
            onChange({ ...value, [field]: Number(event.target.value) as 1 | 2 | 3 });
          }}
        >
          <option value="1">{t("format.heading1")}</option>
          <option value="2">{t("format.heading2")}</option>
          <option value="3">{t("format.heading3")}</option>
        </select>
      </Field>
    );
  }

  function typographyField(field: "displayNameTypography" | "headlineTypography") {
    return (
      <Field htmlFor={`presentation-${field}`} label={t("format.typography")}>
        <select
          className={selectClassName}
          value={value?.[field] ?? ""}
          onChange={(event) => {
            const updated = { ...value };
            if (event.target.value === "italic" || event.target.value === "monospace")
              updated[field] = event.target.value;
            else delete updated[field];
            onChange(Object.keys(updated).length ? updated : undefined);
          }}
        >
          <option value="">{t("format.typographyDefault")}</option>
          <option value="italic">{t("format.typographyItalic")}</option>
          <option value="monospace">{t("format.typographyMonospace")}</option>
        </select>
      </Field>
    );
  }

  return (
    <details className="min-w-0 rounded-md border border-border bg-surface-raised/40 p-4">
      <summary className="min-h-7 cursor-pointer rounded-sm text-sm font-semibold focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
        {t("format.options")}
      </summary>
      <div className="mt-3 min-w-0 space-y-5">
        <p className="text-xs leading-5 text-muted-foreground">{t("format.help")}</p>
        <p className="text-xs leading-5 text-muted-foreground">{t("format.typographyHelp")}</p>
        <fieldset className="min-w-0 space-y-3">
          <legend className="text-sm font-medium">{t("displayName")}</legend>
          <div className="grid min-w-0 gap-4 @min-[22em]/configuration:grid-cols-2">
            {levelField("displayNameLevel", 1)}
            {alignmentField("displayNameAlignment")}
          </div>
          {typographyField("displayNameTypography")}
        </fieldset>
        <fieldset className="min-w-0 space-y-3">
          <legend className="text-sm font-medium">{t("headline")}</legend>
          <div className="grid min-w-0 gap-4 @min-[22em]/configuration:grid-cols-2">
            {levelField("headlineLevel", 2)}
            {alignmentField("headlineAlignment")}
          </div>
          {typographyField("headlineTypography")}
        </fieldset>
        <div className="grid min-w-0 gap-5 @min-[22em]/configuration:grid-cols-2">
          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-medium">{t("bio")}</legend>
            {alignmentField("bioAlignment")}
          </fieldset>
          <fieldset className="min-w-0 space-y-3">
            <legend className="text-sm font-medium">{t("location")}</legend>
            {alignmentField("locationAlignment")}
            {value?.locationPlacement && (
              <p className="text-xs leading-5 text-muted-foreground">
                {t("style.inlineAlignment")}
              </p>
            )}
          </fieldset>
        </div>
        <Button variant="ghost" size="sm" disabled={!value} onClick={() => onChange(undefined)}>
          {t("format.reset")}
        </Button>
      </div>
    </details>
  );
}
