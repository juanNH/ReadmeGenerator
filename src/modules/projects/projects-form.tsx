"use client";

import { useEffect, useId, useRef } from "react";
import { ImagePlus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileModuleData } from "@/core/profile/module-content";
import type { ReadmeIssue } from "@/core/readme";
import { hasUrlError } from "@/modules/shared/has-url-error";
import { useEntryFocus } from "@/modules/shared/use-entry-focus";

type Project = ProfileModuleData["projects"]["items"][number];

type ProjectsFormProps = {
  value: ProfileModuleData["projects"];
  errors: readonly ReadmeIssue[];
  onChange: (value: ProfileModuleData["projects"]) => void;
};

export function ProjectsForm({ value, errors, onChange }: ProjectsFormProps) {
  const t = useTranslations("EditorModules.projects");
  const baseId = useId();
  const { entryRef, addButtonRef, focusNewEntry, focusAfterRemoval } = useEntryFocus(value.items);

  function editProject(id: string, next: Project) {
    const current = value.items.find((item) => item.id === id);
    const updated =
      current && current.titleUrl === undefined && next.titleUrl === undefined
        ? { ...next, titleUrl: legacyTitleUrl(current) }
        : next;
    onChange({ items: value.items.map((item) => (item.id === id ? updated : item)) });
  }

  return (
    <div className="space-y-3">
      {value.items.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-4 py-5 text-sm leading-6 text-muted-foreground">
          {t("empty")}
        </p>
      )}
      {value.items.map((project, index) => {
        const controlId = `${baseId}-project-${index}`;
        return (
          <fieldset
            key={project.id}
            className="min-w-0 space-y-3 rounded-xl border border-border bg-surface-raised/20 p-3"
          >
            <legend className="px-1 text-sm font-medium">
              {t("entry", { number: index + 1 })}
            </legend>
            <Field htmlFor={`${controlId}-name`} label={t("name")} description={t("nameHelp")}>
              <Input
                data-emoji-target="true"
                ref={entryRef(project.id)}
                value={project.name}
                placeholder={t("namePlaceholder")}
                onChange={(event) =>
                  editProject(project.id, { ...project, name: event.target.value })
                }
              />
            </Field>
            <Field
              htmlFor={`${controlId}-description`}
              label={t("projectDescription")}
              description={t("projectDescriptionHelp")}
            >
              <Textarea
                data-emoji-target="true"
                value={project.description}
                placeholder={t("projectDescriptionPlaceholder")}
                onChange={(event) =>
                  editProject(project.id, { ...project, description: event.target.value })
                }
              />
            </Field>
            <ProjectCover
              value={project.cover}
              projectIndex={index}
              errors={errors}
              onChange={(cover) => {
                const next = { ...project };
                if (cover) next.cover = cover;
                else delete next.cover;
                editProject(project.id, next);
              }}
            />
            <ProjectTitleUrl
              project={project}
              projectIndex={index}
              errors={errors}
              onChange={(titleUrl) => editProject(project.id, { ...project, titleUrl })}
            />
            <Button
              variant="ghost"
              aria-label={t("remove", { number: index + 1 })}
              aria-describedby={`${baseId}-remove-help`}
              onClick={() => {
                focusAfterRemoval(index);
                onChange({ items: value.items.filter((item) => item.id !== project.id) });
              }}
            >
              <Trash2 aria-hidden="true" />
              {t("removeVisible")}
            </Button>
          </fieldset>
        );
      })}
      <p id={`${baseId}-remove-help`} className="text-xs leading-5 text-muted-foreground">
        {t("removeHelp")}
      </p>
      <Button
        ref={addButtonRef}
        variant="outline"
        onClick={() => {
          const id = crypto.randomUUID();
          focusNewEntry(id);
          onChange({
            items: [
              ...value.items,
              {
                id,
                name: "",
                description: "",
                role: "",
                technologies: [],
                links: [],
                titleUrl: "",
              },
            ],
          });
        }}
      >
        <Plus aria-hidden="true" />
        {t("add")}
      </Button>
    </div>
  );
}

function ProjectCover({
  value,
  projectIndex,
  errors,
  onChange,
}: {
  value: Project["cover"];
  projectIndex: number;
  errors: readonly ReadmeIssue[];
  onChange: (value: Project["cover"]) => void;
}) {
  const t = useTranslations("EditorModules.projects");
  const baseId = useId();
  const summaryRef = useRef<HTMLElement>(null);
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const path = ["data", "projects", "items", projectIndex, "cover"];
  function hasError(field: "url" | "alt") {
    return errors.some(
      (error) =>
        error.path.length === path.length + 1 &&
        path.every((part, index) => error.path[index] === part) &&
        error.path.at(-1) === field,
    );
  }
  const coverHasErrors = hasError("url") || hasError("alt");
  useEffect(() => {
    if (coverHasErrors && detailsRef.current) detailsRef.current.open = true;
  }, [coverHasErrors]);
  return (
    <details
      ref={detailsRef}
      className="group rounded-lg border border-border bg-surface-raised/30 p-3"
      open={Boolean(value)}
    >
      <summary
        ref={summaryRef}
        className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      >
        <ImagePlus aria-hidden="true" className="mr-2 inline size-4" />
        {t("coverTitle")}
      </summary>
      <div className="mt-3 space-y-3">
        <p className="text-xs leading-5 text-muted-foreground">{t("coverHelp")}</p>
        <Field
          htmlFor={`${baseId}-url`}
          label={t("coverUrl")}
          error={hasError("url") ? t("invalidCoverUrl") : undefined}
        >
          <Input
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck={false}
            placeholder={t("coverUrlPlaceholder")}
            value={value?.url ?? ""}
            onChange={(event) => onChange({ url: event.target.value, alt: value?.alt ?? "" })}
          />
        </Field>
        <Field
          htmlFor={`${baseId}-alt`}
          label={t("coverAlt")}
          description={t("coverAltHelp")}
          error={hasError("alt") ? t("missingCoverAlt") : undefined}
        >
          <Input
            data-emoji-target="true"
            placeholder={t("coverAltPlaceholder")}
            value={value?.alt ?? ""}
            onChange={(event) => onChange({ url: value?.url ?? "", alt: event.target.value })}
          />
        </Field>
        {value && (
          <Button
            variant="ghost"
            aria-label={t("removeCover", { number: projectIndex + 1 })}
            onClick={() => {
              summaryRef.current?.focus();
              onChange(undefined);
            }}
          >
            <Trash2 aria-hidden="true" />
            {t("removeCoverVisible")}
          </Button>
        )}
      </div>
    </details>
  );
}

function legacyTitleLinkIndex(project: Project) {
  return project.links.findIndex((link) => Boolean(link.url.trim() || link.label.trim()));
}

function legacyTitleUrl(project: Project) {
  const index = legacyTitleLinkIndex(project);
  return index < 0 ? "" : (project.links[index]?.url ?? "");
}

function ProjectTitleUrl({
  project,
  projectIndex,
  errors,
  onChange,
}: {
  project: Project;
  projectIndex: number;
  errors: readonly ReadmeIssue[];
  onChange: (value: string) => void;
}) {
  const t = useTranslations("EditorModules.projects");
  const id = useId();
  const legacyIndex = legacyTitleLinkIndex(project);
  const path =
    project.titleUrl === undefined
      ? ["data", "projects", "items", projectIndex, "links", legacyIndex, "url"]
      : ["data", "projects", "items", projectIndex, "titleUrl"];
  const invalidUrl =
    project.titleUrl === undefined
      ? legacyIndex >= 0 && hasUrlError(errors, path)
      : hasUrlError(errors, path);

  return (
    <Field
      htmlFor={id}
      label={t("titleUrl")}
      description={t("titleUrlHelp")}
      error={invalidUrl ? t("invalidTitleUrl") : undefined}
    >
      <Input
        id={id}
        type="url"
        inputMode="url"
        autoComplete="url"
        spellCheck={false}
        value={project.titleUrl ?? legacyTitleUrl(project)}
        placeholder={t("titleUrlPlaceholder")}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  );
}
