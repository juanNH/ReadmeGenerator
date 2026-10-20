import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileModuleData } from "@/core/profile/module-content";
import type { ReadmeIssue } from "@/core/readme";
import { LocationField } from "./location-field";
import { PresentationFormatFields } from "./presentation-format-fields";

type PresentationFormProps = {
  value: ProfileModuleData["presentation"];
  onChange: (value: ProfileModuleData["presentation"]) => void;
  errors?: readonly ReadmeIssue[];
};

export function PresentationForm({ value, onChange, errors = [] }: PresentationFormProps) {
  const t = useTranslations("Editor.presentation");
  const detailsRef = useRef<HTMLDetailsElement>(null);
  function fieldError(field: "displayName" | "headline" | "bio" | "location") {
    return errors.some(
      (error) =>
        error.code === "invalid_html" &&
        error.path.length === 3 &&
        error.path[0] === "data" &&
        error.path[1] === "presentation" &&
        error.path[2] === field,
    )
      ? t("format.invalid")
      : undefined;
  }
  const detailsHaveErrors = Boolean(fieldError("headline") || fieldError("location"));
  useEffect(() => {
    // Reveal errors without closing the fields again when the user corrects their writing.
    if (detailsHaveErrors && detailsRef.current) detailsRef.current.open = true;
  }, [detailsHaveErrors]);

  return (
    <div className="space-y-5">
      <Field
        htmlFor="profile-display-name"
        label={t("displayName")}
        error={fieldError("displayName")}
      >
        <Input
          autoComplete="nickname"
          value={value.displayName}
          placeholder={t("displayNamePlaceholder")}
          onChange={(event) => onChange({ ...value, displayName: event.target.value })}
        />
      </Field>
      <Field
        htmlFor="profile-bio"
        label={t("bio")}
        description={t("bioHelp")}
        error={fieldError("bio")}
      >
        <Textarea
          value={value.bio}
          placeholder={t("bioPlaceholder")}
          rows={5}
          onChange={(event) => onChange({ ...value, bio: event.target.value })}
        />
      </Field>
      <details ref={detailsRef} className="group text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
          {t("details")}
        </summary>
        <div className="mt-3 space-y-4">
          <Field htmlFor="profile-headline" label={t("headline")} error={fieldError("headline")}>
            <Input
              value={value.headline}
              placeholder={t("headlinePlaceholder")}
              onChange={(event) => onChange({ ...value, headline: event.target.value })}
            />
          </Field>
          <LocationField
            value={value.location}
            error={fieldError("location")}
            onChange={(location) => onChange({ ...value, location })}
          />
        </div>
      </details>
      <PresentationFormatFields
        value={value.format}
        onChange={(format) => {
          if (format) onChange({ ...value, format });
          else {
            const updated = { ...value };
            delete updated.format;
            onChange(updated);
          }
        }}
      />
    </div>
  );
}
