import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileModuleData } from "@/core/profile/module-content";

type PresentationFormProps = {
  value: ProfileModuleData["presentation"];
  onChange: (value: ProfileModuleData["presentation"]) => void;
};

export function PresentationForm({ value, onChange }: PresentationFormProps) {
  const t = useTranslations("Editor.presentation");

  return (
    <div className="space-y-5">
      <Field
        htmlFor="profile-display-name"
        label={t("displayName")}
        description={t("displayNameHelp")}
      >
        <Input
          autoComplete="nickname"
          value={value.displayName}
          placeholder={t("displayNamePlaceholder")}
          onChange={(event) => onChange({ ...value, displayName: event.target.value })}
        />
      </Field>
      <Field htmlFor="profile-headline" label={t("headline")} description={t("headlineHelp")}>
        <Input
          value={value.headline}
          placeholder={t("headlinePlaceholder")}
          onChange={(event) => onChange({ ...value, headline: event.target.value })}
        />
      </Field>
      <Field htmlFor="profile-bio" label={t("bio")} description={t("bioHelp")}>
        <Textarea
          value={value.bio}
          placeholder={t("bioPlaceholder")}
          rows={4}
          onChange={(event) => onChange({ ...value, bio: event.target.value })}
        />
      </Field>
      <Field htmlFor="profile-location" label={t("location")} description={t("locationHelp")}>
        <Input
          autoComplete="off"
          value={value.location}
          placeholder={t("locationPlaceholder")}
          onChange={(event) => onChange({ ...value, location: event.target.value })}
        />
      </Field>
    </div>
  );
}
