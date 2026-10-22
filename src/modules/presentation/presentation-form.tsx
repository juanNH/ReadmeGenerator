import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PresentationFormat, ProfileModuleData } from "@/core/profile/module-content";
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
  function updateFormat(format: PresentationFormat | undefined) {
    if (format && Object.keys(format).length) onChange({ ...value, format });
    else {
      const updated = { ...value };
      delete updated.format;
      onChange(updated);
    }
  }
  function updateLocationPlacement(placement: string) {
    const format = { ...value.format };
    if (placement === "displayName" || placement === "headline")
      format.locationPlacement = placement;
    else delete format.locationPlacement;
    updateFormat(format);
  }
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
  return (
    <div className="space-y-5">
      <Field
        htmlFor="profile-display-name"
        label={t("displayName")}
        description={t("displayNameHelp")}
        error={fieldError("displayName")}
      >
        <Input
          autoComplete="nickname"
          value={value.displayName}
          placeholder={t("displayNamePlaceholder")}
          onChange={(event) => onChange({ ...value, displayName: event.target.value })}
        />
      </Field>
      <div className="space-y-2">
        <Field
          htmlFor="profile-headline"
          label={t("headline")}
          description={t("headlineHelp")}
          error={fieldError("headline")}
        >
          <Input
            value={value.headline}
            placeholder={t("headlinePlaceholder")}
            onChange={(event) => onChange({ ...value, headline: event.target.value })}
          />
        </Field>
      </div>
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
      <LocationField
        value={value.location}
        error={fieldError("location")}
        onChange={(location) => onChange({ ...value, location })}
      />
      <Field
        htmlFor="presentation-location-placement"
        label={t("style.locationPlacement")}
        description={t("style.locationHelp")}
      >
        <select
          id="presentation-location-placement"
          className="min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 text-base focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none sm:text-sm"
          value={value.format?.locationPlacement ?? ""}
          onChange={(event) => updateLocationPlacement(event.target.value)}
        >
          <option value="">{t("style.locationSeparate")}</option>
          <option value="displayName">{t("displayName")}</option>
          <option value="headline">{t("headline")}</option>
        </select>
      </Field>
      <PresentationFormatFields value={value.format} onChange={updateFormat} />
    </div>
  );
}
