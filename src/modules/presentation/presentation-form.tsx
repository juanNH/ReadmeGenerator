import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileModuleData } from "@/core/profile/module-content";
import { LocationField } from "./location-field";

type PresentationFormProps = {
  value: ProfileModuleData["presentation"];
  onChange: (value: ProfileModuleData["presentation"]) => void;
};

export function PresentationForm({ value, onChange }: PresentationFormProps) {
  const t = useTranslations("Editor.presentation");

  return (
    <div className="space-y-5">
      <Field htmlFor="profile-display-name" label={t("displayName")}>
        <Input
          autoComplete="nickname"
          value={value.displayName}
          placeholder={t("displayNamePlaceholder")}
          onChange={(event) => onChange({ ...value, displayName: event.target.value })}
        />
      </Field>
      <Field htmlFor="profile-bio" label={t("bio")} description={t("bioHelp")}>
        <Textarea
          value={value.bio}
          placeholder={t("bioPlaceholder")}
          rows={5}
          onChange={(event) => onChange({ ...value, bio: event.target.value })}
        />
      </Field>
      <details className="group text-sm">
        <summary className="flex min-h-11 cursor-pointer items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
          {t("details")}
        </summary>
        <div className="mt-3 space-y-4">
          <Field htmlFor="profile-headline" label={t("headline")}>
            <Input
              value={value.headline}
              placeholder={t("headlinePlaceholder")}
              onChange={(event) => onChange({ ...value, headline: event.target.value })}
            />
          </Field>
          <LocationField
            value={value.location}
            onChange={(location) => onChange({ ...value, location })}
          />
        </div>
      </details>
    </div>
  );
}
