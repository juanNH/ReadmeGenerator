import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import type { CustomHeadingLevel, CustomTextAlignment } from "@/core/profile/custom-content";
import type { CustomTextKind } from "./custom-text-formatting";

const selectClassName =
  "min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 text-base focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none sm:text-sm";

type CustomFormatFieldsProps = {
  id: string;
  alignment: CustomTextAlignment;
  onAlignmentChange: (alignment: CustomTextAlignment) => void;
} & (
  | {
      target: "title";
      level: CustomHeadingLevel;
      onLevelChange: (level: CustomHeadingLevel) => void;
    }
  | {
      target: "text";
      kind: CustomTextKind;
      onKindChange: (kind: CustomTextKind) => void;
    }
);

export function CustomFormatFields(props: CustomFormatFieldsProps) {
  const t = useTranslations("EditorModules.custom");
  return (
    <details className="min-w-0 rounded-md border border-border p-3">
      <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
        {t(props.target === "title" ? "format.titleOptions" : "format.textOptions")}
      </summary>
      <div className="mt-3 min-w-0 space-y-4">
        <p className="text-xs leading-5 text-muted-foreground">{t("format.help")}</p>
        <div className="grid min-w-0 gap-4 @min-[22em]/configuration:grid-cols-2">
          <Field
            htmlFor={`${props.id}-kind`}
            label={t(props.target === "title" ? "format.titleLevel" : "format.textType")}
          >
            <select
              className={selectClassName}
              value={props.target === "title" ? String(props.level) : props.kind}
              onChange={(event) => {
                if (props.target === "title")
                  props.onLevelChange(Number(event.target.value) as CustomHeadingLevel);
                else props.onKindChange(event.target.value as CustomTextKind);
              }}
            >
              {props.target === "text" && (
                <option value="paragraph">{t("format.paragraph")}</option>
              )}
              <option value="1">{t("format.heading1")}</option>
              <option value="2">{t("format.heading2")}</option>
              <option value="3">{t("format.heading3")}</option>
            </select>
          </Field>
          <Field htmlFor={`${props.id}-alignment`} label={t("format.alignment")}>
            <select
              className={selectClassName}
              value={props.alignment}
              onChange={(event) =>
                props.onAlignmentChange(event.target.value as CustomTextAlignment)
              }
            >
              <option value="left">{t("format.left")}</option>
              <option value="center">{t("format.center")}</option>
              <option value="right">{t("format.right")}</option>
            </select>
          </Field>
        </div>
      </div>
    </details>
  );
}
