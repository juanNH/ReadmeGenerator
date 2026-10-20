import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cardAppearanceSchema, type CardAppearance } from "@/core/profile/module-content";
import {
  SettingsNumber,
  SettingsToggle,
  settingsSelectClassName,
  settingsSummaryClassName,
  splitSettingsList,
} from "./activity-settings-controls";

const colorFields = [
  "titleColor",
  "textColor",
  "iconColor",
  "borderColor",
  "backgroundColor",
] as const;
const flagFields = ["hideTitle", "hideBorder", "showIcons", "textBold"] as const;

export function AdvancedAppearanceFields({
  value,
  onChange,
}: {
  value: CardAppearance | undefined;
  onChange: (value: CardAppearance) => void;
}) {
  const t = useTranslations("EditorModules.contributions.activity.appearance.advanced");
  const baseId = useId();
  return (
    <details className="min-w-0 rounded-md border border-border p-3">
      <summary className={settingsSummaryClassName}>{t("title")}</summary>
      <div className="mt-3 min-w-0 space-y-4">
        <p className="text-xs leading-5 text-muted-foreground">{t("help")}</p>
        <Field
          htmlFor={`${baseId}-custom-title`}
          label={t("customTitle")}
          description={t("customTitleHelp")}
        >
          <Input
            value={value?.customTitle ?? ""}
            maxLength={100}
            onChange={(event) => {
              const next = { ...value };
              if (event.target.value) next.customTitle = event.target.value;
              else delete next.customTitle;
              onChange(next);
            }}
          />
        </Field>
        <div className="grid min-w-0 gap-4 @min-[22em]/configuration:grid-cols-2">
          <SettingsNumber
            label={t("borderRadius")}
            value={value?.borderRadius ?? 14}
            min={0}
            max={30}
            step={0.5}
            errorMessage={t("numberError", { min: 0, max: 30 })}
            onChange={(borderRadius) => onChange({ ...value, borderRadius })}
          />
          <SettingsNumber
            label={t("width")}
            help={t("widthHelp")}
            value={value?.width ?? (value?.size === "wide" ? 1000 : 700)}
            min={700}
            max={1200}
            errorMessage={t("numberError", { min: 700, max: 1200 })}
            onChange={(width) => onChange({ ...value, width })}
          />
          <SettingsNumber
            label={t("lineHeight")}
            value={value?.lineHeight ?? 28}
            min={22}
            max={50}
            errorMessage={t("numberError", { min: 22, max: 50 })}
            onChange={(lineHeight) => onChange({ ...value, lineHeight })}
          />
          <SettingsNumber
            label={t("numberPrecision")}
            value={value?.numberPrecision ?? 1}
            min={0}
            max={2}
            errorMessage={t("numberError", { min: 0, max: 2 })}
            onChange={(numberPrecision) => onChange({ ...value, numberPrecision })}
          />
          <Field htmlFor={`${baseId}-number-format`} label={t("numberFormat.label")}>
            <select
              className={settingsSelectClassName}
              value={value?.numberFormat ?? "long"}
              onChange={(event) =>
                onChange({
                  ...value,
                  numberFormat: event.target.value as CardAppearance["numberFormat"],
                })
              }
            >
              <option value="short">{t("numberFormat.short")}</option>
              <option value="long">{t("numberFormat.long")}</option>
            </select>
          </Field>
        </div>
        <fieldset className="min-w-0">
          <legend className="text-sm font-medium">{t("visibility")}</legend>
          {flagFields.map((field) => (
            <SettingsToggle
              key={field}
              label={t(field)}
              checked={value?.[field] ?? field === "textBold"}
              onChange={(checked) => onChange({ ...value, [field]: checked })}
            />
          ))}
        </fieldset>
        <CustomColorFields value={value} onChange={onChange} />
      </div>
    </details>
  );
}

function CustomColorFields({
  value,
  onChange,
}: {
  value: CardAppearance | undefined;
  onChange: (value: CardAppearance) => void;
}) {
  const t = useTranslations("EditorModules.contributions.activity.appearance.advanced");
  const baseId = useId();
  const [drafts, setDrafts] = useState<
    Partial<Record<(typeof colorFields)[number] | "gradientColors" | "gradientAngle", string>>
  >({});
  const [invalidFields, setInvalidFields] = useState<ReadonlySet<string>>(new Set());
  function edit(field: keyof typeof drafts, text: string) {
    setDrafts({ ...drafts, [field]: text });
    setInvalidFields(new Set());
  }
  return (
    <details className="min-w-0 rounded-md border border-border p-3">
      <summary className={settingsSummaryClassName}>{t("colorsTitle")}</summary>
      <div className="mt-3 min-w-0 space-y-4">
        <p className="text-xs leading-5 text-muted-foreground">{t("colorsHelp")}</p>
        <div className="grid min-w-0 gap-4 @min-[22em]/configuration:grid-cols-2">
          {colorFields.map((field) => (
            <Field
              key={field}
              htmlFor={`${baseId}-${field}`}
              label={t(field)}
              error={invalidFields.has(field) ? t("colorError") : undefined}
            >
              <Input
                value={drafts[field] ?? value?.[field] ?? ""}
                placeholder="#336699"
                spellCheck={false}
                autoCapitalize="none"
                onChange={(event) => edit(field, event.target.value)}
              />
            </Field>
          ))}
        </div>
        <Field
          htmlFor={`${baseId}-gradient-colors`}
          label={t("gradientColors")}
          description={t("gradientHelp")}
          error={invalidFields.has("backgroundGradient") ? t("gradientError") : undefined}
        >
          <Textarea
            rows={2}
            value={drafts.gradientColors ?? value?.backgroundGradient?.colors.join("\n") ?? ""}
            placeholder={"#ffffff\n#dce9ff"}
            spellCheck={false}
            autoCapitalize="none"
            onChange={(event) => edit("gradientColors", event.target.value)}
          />
        </Field>
        <Field
          htmlFor={`${baseId}-gradient-angle`}
          label={t("gradientAngle")}
          error={invalidFields.has("backgroundGradient") ? t("gradientError") : undefined}
        >
          <Input
            type="number"
            min={0}
            max={360}
            value={drafts.gradientAngle ?? value?.backgroundGradient?.angle ?? 0}
            onChange={(event) => edit("gradientAngle", event.target.value)}
          />
        </Field>
        <Button
          size="sm"
          variant="outline"
          disabled={Object.keys(drafts).length === 0}
          onClick={() => {
            const next = { ...value };
            for (const field of colorFields) {
              if (drafts[field] === undefined) continue;
              const color = drafts[field].trim();
              if (color) next[field] = color;
              else delete next[field];
            }
            if (drafts.gradientColors !== undefined || drafts.gradientAngle !== undefined) {
              const colors = splitSettingsList(
                drafts.gradientColors ?? value?.backgroundGradient?.colors.join("\n") ?? "",
              );
              const angleText =
                drafts.gradientAngle ?? String(value?.backgroundGradient?.angle ?? 0);
              if (colors.length)
                next.backgroundGradient = {
                  colors,
                  angle: angleText.trim() ? Number(angleText) : Number.NaN,
                };
              else delete next.backgroundGradient;
            }
            const parsed = cardAppearanceSchema.safeParse(next);
            if (parsed.success) {
              onChange(parsed.data);
              setDrafts({});
              setInvalidFields(new Set());
            } else {
              setInvalidFields(new Set(parsed.error.issues.map((issue) => String(issue.path[0]))));
            }
          }}
        >
          {t("applyColors")}
        </Button>
        <p className="text-xs leading-5 text-muted-foreground">{t("draftHelp")}</p>
      </div>
    </details>
  );
}
