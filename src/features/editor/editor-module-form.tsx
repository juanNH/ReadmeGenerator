import type { ProfileModuleData } from "@/core/profile/module-content";
import type { ProfileDocument } from "@/core/profile/profile-schema";
import type { ReadmeIssue } from "@/core/readme";
import { ContactForm } from "@/modules/contact/contact-form";
import { ContributionsForm } from "@/modules/contributions/contributions-form";
import { PresentationForm } from "@/modules/presentation/presentation-form";
import { ProjectsForm } from "@/modules/projects/projects-form";
import { TechnologiesForm } from "@/modules/technologies/technologies-form";
import { isModuleIncluded, type EditableModuleId } from "./module-composition";

type EditorModuleFormProps = {
  id: EditableModuleId;
  profile: ProfileDocument;
  errors: readonly ReadmeIssue[];
  onChange: (next: ProfileDocument) => void;
};

export function EditorModuleForm({ id, profile, errors, onChange }: EditorModuleFormProps) {
  function update<K extends EditableModuleId>(moduleId: K, value: ProfileModuleData[K]) {
    onChange({ ...profile, data: { ...profile.data, [moduleId]: value } });
  }

  switch (id) {
    case "presentation":
      return (
        <PresentationForm
          value={profile.data.presentation}
          errors={errors}
          onChange={(value) => update(id, value)}
        />
      );
    case "technologies":
      return (
        <TechnologiesForm
          value={profile.data.technologies}
          errors={errors}
          onChange={(value) => update(id, value)}
        />
      );
    case "projects":
      return (
        <ProjectsForm
          value={profile.data.projects}
          errors={errors}
          onChange={(value) => update(id, value)}
        />
      );
    case "contributions":
      return (
        <ContributionsForm
          value={profile.data.contributions}
          metrics={profile.data.metrics}
          metricsVisible={profile.visibility.metrics}
          sectionIncluded={isModuleIncluded(profile, "contributions")}
          errors={errors}
          onChange={(value) =>
            onChange({
              ...profile,
              data: { ...profile.data, contributions: value },
              visibility: {
                ...profile.visibility,
                contributions: isModuleIncluded(profile, "contributions"),
              },
            })
          }
          onActivityChange={(metrics, visible) =>
            onChange({
              ...profile,
              data: { ...profile.data, metrics },
              visibility: {
                ...profile.visibility,
                metrics: visible && isModuleIncluded(profile, "contributions"),
              },
            })
          }
        />
      );
    case "contact":
      return (
        <ContactForm
          value={profile.data.contact}
          errors={errors}
          onChange={(value) => update(id, value)}
        />
      );
  }
}
