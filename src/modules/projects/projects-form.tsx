"use client";

import { useEffect, useId, useRef } from "react";
import { Plus, Trash2 } from "lucide-react";
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
    onChange({ items: value.items.map((item) => (item.id === id ? next : item)) });
  }

  return (
    <div className="space-y-5">
      {value.items.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-4 py-5 text-sm leading-6 text-muted-foreground">
          {t("empty")}
        </p>
      )}
      {value.items.map((project, index) => {
        const controlId = `${baseId}-project-${index}`;
        return (
          <fieldset key={project.id} className="min-w-0 space-y-5 border-t border-border pt-4">
            <legend className="px-1 text-sm font-medium">
              {t("entry", { number: index + 1 })}
            </legend>
            <Field htmlFor={`${controlId}-name`} label={t("name")}>
              <Input
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
                value={project.description}
                placeholder={t("projectDescriptionPlaceholder")}
                onChange={(event) =>
                  editProject(project.id, { ...project, description: event.target.value })
                }
              />
            </Field>
            <Field htmlFor={`${controlId}-role`} label={t("role")} description={t("roleHelp")}>
              <Input
                value={project.role}
                placeholder={t("rolePlaceholder")}
                onChange={(event) =>
                  editProject(project.id, { ...project, role: event.target.value })
                }
              />
            </Field>
            <ProjectTechnologies
              value={project.technologies}
              projectNumber={index + 1}
              onChange={(next) => editProject(project.id, { ...project, technologies: next })}
            />
            <ProjectLinks
              value={project.links}
              projectIndex={index}
              errors={errors}
              onChange={(next) => editProject(project.id, { ...project, links: next })}
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
              { id, name: "", description: "", role: "", technologies: [], links: [] },
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

function ProjectTechnologies({
  value,
  projectNumber,
  onChange,
}: {
  value: string[];
  projectNumber: number;
  onChange: (value: string[]) => void;
}) {
  const t = useTranslations("EditorModules.projects");
  const baseId = useId();
  const controls = useRef(new Map<number, HTMLInputElement>());
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pendingIndex = useRef<number | null>(null);

  useEffect(() => {
    if (pendingIndex.current === null) return;
    controls.current.get(pendingIndex.current)?.focus();
    pendingIndex.current = null;
  }, [value]);

  return (
    <fieldset className="min-w-0 space-y-4 rounded-lg border border-border bg-surface-raised/30 p-4">
      <legend className="px-1 text-sm font-medium">{t("technologiesTitle")}</legend>
      <p id={`${baseId}-help`} className="text-xs leading-5 text-muted-foreground">
        {t("technologiesHelp")}
      </p>
      {value.map((technology, index) => (
        <div key={index} className="min-w-0 space-y-2">
          <Field
            htmlFor={`${baseId}-technology-${index}`}
            label={t("technologyLabel", { number: index + 1 })}
          >
            <Input
              ref={(control) => {
                if (control) controls.current.set(index, control);
                else controls.current.delete(index);
              }}
              value={technology}
              placeholder={t("technologyPlaceholder")}
              onChange={(event) =>
                onChange(
                  value.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                )
              }
            />
          </Field>
          <Button
            variant="ghost"
            aria-label={t("removeTechnology", { number: index + 1, projectNumber })}
            aria-describedby={`${baseId}-help`}
            onClick={() => {
              if (value.length === 1) addButtonRef.current?.focus();
              else pendingIndex.current = Math.min(index, value.length - 2);
              onChange(value.filter((_, itemIndex) => itemIndex !== index));
            }}
          >
            <Trash2 aria-hidden="true" />
            {t("removeTechnologyVisible")}
          </Button>
        </div>
      ))}
      <Button
        ref={addButtonRef}
        variant="outline"
        aria-label={t("addTechnology", { projectNumber })}
        onClick={() => {
          pendingIndex.current = value.length;
          onChange([...value, ""]);
        }}
      >
        <Plus aria-hidden="true" />
        {t("addTechnologyVisible")}
      </Button>
    </fieldset>
  );
}

function ProjectLinks({
  value,
  projectIndex,
  errors,
  onChange,
}: {
  value: Project["links"];
  projectIndex: number;
  errors: readonly ReadmeIssue[];
  onChange: (value: Project["links"]) => void;
}) {
  const t = useTranslations("EditorModules.projects");
  const baseId = useId();
  const { entryRef, addButtonRef, focusNewEntry, focusAfterRemoval } = useEntryFocus(value);

  function editLink(id: string, key: "label" | "url", text: string) {
    onChange(value.map((link) => (link.id === id ? { ...link, [key]: text } : link)));
  }

  return (
    <fieldset className="min-w-0 space-y-4 rounded-lg border border-border bg-surface-raised/30 p-4">
      <legend className="px-1 text-sm font-medium">{t("linksTitle")}</legend>
      <p id={`${baseId}-help`} className="text-xs leading-5 text-muted-foreground">
        {t("linksHelp")}
      </p>
      {value.map((link, index) => {
        const controlId = `${baseId}-link-${index}`;
        const invalidUrl = hasUrlError(errors, [
          "data",
          "projects",
          "items",
          projectIndex,
          "links",
          index,
          "url",
        ]);
        return (
          <fieldset key={link.id} className="min-w-0 space-y-4 border-t border-border pt-4">
            <legend className="px-1 text-sm font-medium">
              {t("linkEntry", { number: index + 1 })}
            </legend>
            <Field
              htmlFor={`${controlId}-label`}
              label={t("linkLabel")}
              description={t("linkLabelHelp")}
            >
              <Input
                ref={entryRef(link.id)}
                value={link.label}
                placeholder={t("linkLabelPlaceholder")}
                onChange={(event) => editLink(link.id, "label", event.target.value)}
              />
            </Field>
            <Field
              htmlFor={`${controlId}-url`}
              label={t("url")}
              description={t("urlHelp")}
              error={invalidUrl ? t("invalidUrl") : undefined}
            >
              <Input
                type="url"
                inputMode="url"
                autoComplete="url"
                spellCheck={false}
                value={link.url}
                placeholder={t("urlPlaceholder")}
                onChange={(event) => editLink(link.id, "url", event.target.value)}
              />
            </Field>
            <Button
              variant="ghost"
              aria-label={t("removeLink", { number: index + 1, projectNumber: projectIndex + 1 })}
              aria-describedby={`${baseId}-help`}
              onClick={() => {
                focusAfterRemoval(index);
                onChange(value.filter((item) => item.id !== link.id));
              }}
            >
              <Trash2 aria-hidden="true" />
              {t("removeLinkVisible")}
            </Button>
          </fieldset>
        );
      })}
      <Button
        ref={addButtonRef}
        variant="outline"
        aria-label={t("addLink", { projectNumber: projectIndex + 1 })}
        onClick={() => {
          const id = crypto.randomUUID();
          focusNewEntry(id);
          onChange([...value, { id, label: "", url: "" }]);
        }}
      >
        <Plus aria-hidden="true" />
        {t("addLinkVisible")}
      </Button>
    </fieldset>
  );
}
