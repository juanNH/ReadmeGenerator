import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import type { CardAppearance } from "@/core/profile/module-content";
import { extendedThemeIds } from "@/core/activity/extended-themes";
import { AdvancedAppearanceFields } from "./advanced-appearance-fields";

const selectClassName =
  "min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 text-base focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none sm:text-sm";

const designs = ["classic", "panels", "minimal"] as const;

type CardAppearanceFieldsProps = {
  value: CardAppearance | undefined;
  onChange: (value: CardAppearance | undefined) => void;
};

/** Defaults only describe the current rendering; choices are stored after an explicit edit. */
export function CardAppearanceFields({ value, onChange }: CardAppearanceFieldsProps) {
  const t = useTranslations("EditorModules.contributions.activity.appearance");
  const baseId = useId();
  const [resetVersion, setResetVersion] = useState(0);

  return (
    <details className="min-w-0 rounded-md border border-border bg-surface-raised/40 p-3">
      <summary className="min-h-7 cursor-pointer rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
        {t("title")}
      </summary>
      <div className="mt-3 min-w-0 space-y-4">
        <p className="text-xs leading-5 text-muted-foreground">{t("help")}</p>
        <div className="grid min-w-0 gap-4 @min-[22em]/configuration:grid-cols-2">
          <Field htmlFor={`${baseId}-theme`} label={t("theme.label")}>
            <select
              className={selectClassName}
              value={value?.theme ?? "light"}
              onChange={(event) =>
                onChange({ ...value, theme: event.target.value as CardAppearance["theme"] })
              }
            >
              <option value="light">{t("theme.light")}</option>
              <option value="dark">{t("theme.dark")}</option>
            </select>
          </Field>
          <Field htmlFor={`${baseId}-palette`} label={t("palette.label")}>
            <select
              className={selectClassName}
              value={value?.palette ?? "forest"}
              onChange={(event) =>
                onChange({ ...value, palette: event.target.value as CardAppearance["palette"] })
              }
            >
              <option value="forest">{t("palette.forest")}</option>
              <option value="ocean">{t("palette.ocean")}</option>
              <option value="violet">{t("palette.violet")}</option>
            </select>
          </Field>
          <Field htmlFor={`${baseId}-design`} label={t("design.label")}>
            <select
              className={selectClassName}
              value={value?.design ?? "classic"}
              onChange={(event) =>
                onChange({ ...value, design: event.target.value as CardAppearance["design"] })
              }
            >
              {designs.map((design) => (
                <option key={design} value={design}>
                  {t(`design.${design}`)}
                </option>
              ))}
            </select>
          </Field>
          <Field htmlFor={`${baseId}-size`} label={t("size.label")} description={t("size.help")}>
            <select
              className={selectClassName}
              value={value?.size ?? "compact"}
              onChange={(event) =>
                onChange({ ...value, size: event.target.value as CardAppearance["size"] })
              }
            >
              <option value="compact">{t("size.compact")}</option>
              <option value="wide">{t("size.wide")}</option>
            </select>
          </Field>
        </div>
        <Field
          htmlFor={`${baseId}-preset`}
          label={t("preset.label")}
          description={t("preset.help")}
        >
          <select
            className={selectClassName}
            value={value?.preset ?? ""}
            onChange={(event) => {
              const next = { ...value };
              if (event.target.value) next.preset = event.target.value as CardAppearance["preset"];
              else delete next.preset;
              onChange(next);
            }}
          >
            <option value="">{t("preset.base")}</option>
            {extendedThemeIds.map((preset) => (
              <option key={preset} value={preset}>
                {preset}
              </option>
            ))}
          </select>
        </Field>
        <div className="space-y-2">
          <p className="text-xs leading-5 text-muted-foreground">{t("samples")}</p>
          <div aria-hidden="true" className="grid min-w-0 grid-cols-3 gap-2">
            {designs.map((design) => (
              <div key={design} className="min-w-0 space-y-1.5">
                <DesignSample design={design} />
                <p className="text-center text-xs text-muted-foreground">{t(`design.${design}`)}</p>
              </div>
            ))}
          </div>
        </div>
        <AdvancedAppearanceFields key={resetVersion} value={value} onChange={onChange} />
        <Button
          variant="ghost"
          size="sm"
          disabled={!value}
          onClick={() => {
            onChange(undefined);
            setResetVersion((version) => version + 1);
          }}
        >
          {t("reset")}
        </Button>
      </div>
    </details>
  );
}

function DesignSample({ design }: { design: NonNullable<CardAppearance["design"]> }) {
  return (
    <div className="flex h-20 min-w-0 flex-col gap-2 rounded-md border border-border bg-surface p-2.5">
      <span className="h-1.5 w-2/3 shrink-0 rounded-sm bg-accent/55" />
      {design === "classic" && (
        <>
          <div className="grid flex-1 grid-cols-4 gap-1">
            {[0, 1, 2, 3].map((index) => (
              <span key={index} className="rounded-sm bg-surface-raised" />
            ))}
          </div>
          <span className="h-1 w-full rounded-sm bg-accent/25" />
        </>
      )}
      {design === "panels" && (
        <div className="grid flex-1 grid-cols-3 gap-1">
          {[0, 1, 2].map((index) => (
            <span
              key={index}
              className="flex items-end rounded-sm border border-border bg-surface-raised p-1"
            >
              <span className="h-1 w-full rounded-sm bg-accent/35" />
            </span>
          ))}
        </div>
      )}
      {design === "minimal" && (
        <div className="flex flex-1 flex-col justify-around">
          <span className="h-1 w-full rounded-sm bg-border-strong" />
          <span className="h-1 w-4/5 rounded-sm bg-border-strong" />
          <span className="h-1 w-3/5 rounded-sm bg-accent/35" />
        </div>
      )}
    </div>
  );
}
