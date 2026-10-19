"use client";

import { useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  Download,
  Globe2,
  Link2,
  RotateCcw,
  Save,
  UserRound,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, Label } from "@/components/ui/field";
import { moduleRegistry } from "@/core/modules/module-registry";
import { setModuleVisibility } from "@/core/profile/profile-operations";
import type { ContentLocale, ProfileDocument } from "@/core/profile/profile-schema";
import { generateReadme } from "@/core/readme";
import { cn } from "@/lib/cn";
import { ContactForm } from "@/modules/contact/contact-form";
import { PresentationForm } from "@/modules/presentation/presentation-form";
import { ReadmePreview } from "./readme-preview";
import { useProfileDraft } from "./use-profile-draft";

const editableModules = [
  { id: "presentation", icon: UserRound },
  { id: "contact", icon: Link2 },
] as const;

type ExportFeedback = "idle" | "copying" | "copied" | "copyError" | "downloaded" | "downloadError";

export function EditorWorkspace({ initialContentLocale }: { initialContentLocale: ContentLocale }) {
  const t = useTranslations("Editor");
  const moduleLabels = useTranslations("Modules");
  const {
    document: profile,
    updateDocument,
    hydration,
    storageStatus,
    recoveryBlocked,
    startNewDraft,
  } = useProfileDraft(initialContentLocale);
  const [exportFeedback, setExportFeedback] = useState<ExportFeedback>("idle");
  const isLoading = hydration === "loading";
  const result = generateReadme(profile);
  const readmeErrors = result.success ? [] : result.errors;
  const isEmpty = readmeErrors.some((error) => error.code === "empty_profile");
  const hasUrlErrors = readmeErrors.some((error) => error.code === "invalid_url");
  const hasUnsupportedModules = readmeErrors.some((error) => error.code === "unsupported_module");
  const canExport = !isLoading && result.success;
  const exportGuidance = isLoading
    ? t("storage.loading")
    : isEmpty
      ? t("export.empty")
      : hasUnsupportedModules
        ? t("export.unsupported")
        : hasUrlErrors
          ? t("export.invalidLinks")
          : t("export.ready");

  function editDocument(nextDocument: ProfileDocument) {
    setExportFeedback("idle");
    updateDocument(nextDocument);
  }

  function toggleModule(moduleId: "presentation" | "contact", checked: boolean) {
    const nextDocument = setModuleVisibility(profile, moduleId, checked);
    if (nextDocument.success) editDocument(nextDocument.data);
  }

  async function copyReadme() {
    if (!canExport || !result.success) return;
    setExportFeedback("copying");
    try {
      await navigator.clipboard.writeText(result.markdown);
      setExportFeedback("copied");
    } catch {
      setExportFeedback("copyError");
    }
  }

  function downloadReadme() {
    if (!canExport || !result.success) return;
    let objectUrl: string | null = null;
    const anchor = document.createElement("a");
    try {
      objectUrl = URL.createObjectURL(
        new Blob([result.markdown], { type: "text/markdown;charset=utf-8" }),
      );
      anchor.href = objectUrl;
      anchor.download = "README.md";
      document.body.appendChild(anchor);
      anchor.click();
      setExportFeedback("downloaded");
    } catch {
      setExportFeedback("downloadError");
    } finally {
      anchor.remove();
      if (objectUrl !== null) {
        const completedUrl = objectUrl;
        window.setTimeout(() => URL.revokeObjectURL(completedUrl), 0);
      }
    }
  }

  function recoverWithNewDraft() {
    if (window.confirm(t("storage.resetConfirmation"))) {
      setExportFeedback("idle");
      startNewDraft();
    }
  }

  return (
    <div className="grid min-w-0 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)] lg:gap-10">
      <section className="min-w-0 space-y-6" aria-labelledby="editor-content-title">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="editor-content-title" className="text-xl font-semibold tracking-tight">
              {t("workspaceTitle")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("workspaceDescription")}
            </p>
          </div>
          <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
            <Save className="size-3.5 shrink-0" aria-hidden="true" />
            {isLoading ? t("storage.loading") : t(`storage.${storageStatus}`)}
          </p>
        </div>

        {recoveryBlocked && (
          <div
            role="status"
            className="rounded-lg border border-warning/30 bg-warning-soft p-5 text-warning"
          >
            <p className="flex items-start gap-2 text-sm font-semibold">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t(storageStatus === "invalid" ? "storage.invalidTitle" : "storage.unavailableTitle")}
            </p>
            <p className="mt-2 text-sm leading-6">
              {t(storageStatus === "invalid" ? "storage.invalidHelp" : "storage.unavailableHelp")}
            </p>
            <Button variant="outline" className="mt-4" onClick={recoverWithNewDraft}>
              <RotateCcw aria-hidden="true" />
              {t("storage.startNew")}
            </Button>
          </div>
        )}
        {storageStatus === "unavailable" && !recoveryBlocked && (
          <div
            role="status"
            className="rounded-lg border border-warning/30 bg-warning-soft p-5 text-warning"
          >
            <p className="flex items-start gap-2 text-sm font-semibold">
              <CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {t("storage.writeFailureTitle")}
            </p>
            <p className="mt-2 text-sm leading-6">{t("storage.writeFailureHelp")}</p>
          </div>
        )}

        <fieldset
          disabled={isLoading}
          aria-describedby={isLoading ? "editor-loading-help" : undefined}
          className="min-w-0 space-y-6"
        >
          <legend className="sr-only">{t("workspaceTitle")}</legend>
          {isLoading && (
            <p id="editor-loading-help" className="text-sm leading-6 text-muted-foreground">
              {t("storage.loadingHelp")}
            </p>
          )}
          <Card>
            <CardHeader>
              <CardTitle>{t("sectionsTitle")}</CardTitle>
              <CardDescription>{t("sectionsDescription")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {editableModules.map(({ id, icon: Icon }) => (
                <div
                  key={id}
                  className={cn(
                    "flex items-start gap-2 rounded-md border p-3 transition-colors motion-reduce:transition-none",
                    profile.visibility[id]
                      ? "border-accent/40 bg-accent-soft/40"
                      : "border-border bg-surface",
                  )}
                >
                  <Checkbox
                    id={`module-${id}`}
                    checked={profile.visibility[id]}
                    onCheckedChange={(checked) => toggleModule(id, checked === true)}
                    aria-describedby={`module-${id}-help`}
                  />
                  <div className="min-w-0 flex-1 py-2">
                    <Label
                      htmlFor={`module-${id}`}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                      {moduleLabels(moduleRegistry[id].labelKey)}
                    </Label>
                    <p
                      id={`module-${id}-help`}
                      className="mt-1 text-xs leading-5 text-muted-foreground"
                    >
                      {t(`sectionHelp.${id}`)}
                    </p>
                  </div>
                </div>
              ))}
              <p className="pt-1 text-xs leading-5 text-muted-foreground">{t("hiddenHelp")}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5 sm:pt-6">
              <Field
                htmlFor="readme-language"
                label={t("contentLanguage")}
                description={t("contentLanguageHelp")}
              >
                <select
                  value={profile.contentLocale}
                  onChange={(event) => {
                    const contentLocale = event.target.value;
                    if (contentLocale === "en" || contentLocale === "es") {
                      editDocument({ ...profile, contentLocale });
                    }
                  }}
                  className="min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-base focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 sm:text-sm"
                >
                  <option value="en">{t("languageOptions.en")}</option>
                  <option value="es">{t("languageOptions.es")}</option>
                </select>
              </Field>
            </CardContent>
          </Card>

          {profile.visibility.presentation && (
            <Card>
              <CardHeader>
                <CardTitle>{moduleLabels(moduleRegistry.presentation.labelKey)}</CardTitle>
                <CardDescription>{t("presentation.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <PresentationForm
                  value={profile.data.presentation}
                  onChange={(presentation) =>
                    editDocument({ ...profile, data: { ...profile.data, presentation } })
                  }
                />
              </CardContent>
            </Card>
          )}

          {profile.visibility.contact && (
            <Card>
              <CardHeader>
                <CardTitle>{moduleLabels(moduleRegistry.contact.labelKey)}</CardTitle>
                <CardDescription>{t("contact.description")}</CardDescription>
              </CardHeader>
              <CardContent>
                <ContactForm
                  value={profile.data.contact}
                  errors={readmeErrors}
                  onChange={(contact) =>
                    editDocument({ ...profile, data: { ...profile.data, contact } })
                  }
                />
              </CardContent>
            </Card>
          )}
        </fieldset>
        <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
          <Globe2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          {t("storage.privacy")}
        </p>
      </section>

      <section
        className="min-w-0 space-y-5 lg:sticky lg:top-8"
        aria-labelledby="readme-preview-title"
      >
        <div>
          <h2 id="readme-preview-title" className="text-xl font-semibold tracking-tight">
            {t("preview.title")}
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{t("preview.description")}</p>
        </div>
        <ReadmePreview
          markdown={result.success ? result.markdown : null}
          contentLocale={profile.contentLocale}
          loading={isLoading}
          hasErrors={!isEmpty && readmeErrors.length > 0}
        />
        <div className="space-y-4">
          <p
            id="readme-export-guidance"
            className={cn(
              "text-sm leading-6",
              !isEmpty && !result.success && !isLoading
                ? "text-destructive"
                : "text-muted-foreground",
            )}
          >
            {exportGuidance}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button
              onClick={copyReadme}
              disabled={!canExport || exportFeedback === "copying"}
              aria-describedby="readme-export-guidance"
            >
              {exportFeedback === "copied" ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {t(exportFeedback === "copying" ? "export.copying" : "export.copy")}
            </Button>
            <Button
              variant="outline"
              onClick={downloadReadme}
              disabled={!canExport}
              aria-describedby="readme-export-guidance"
            >
              <Download aria-hidden="true" />
              {t("export.download")}
            </Button>
          </div>
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className={cn(
              "min-h-6 text-sm leading-6",
              exportFeedback === "copyError" || exportFeedback === "downloadError"
                ? "text-destructive"
                : "text-accent",
            )}
          >
            {exportFeedback !== "idle" && exportFeedback !== "copying"
              ? t(`export.feedback.${exportFeedback}`)
              : ""}
          </p>
        </div>
        <div className="rounded-md border border-border bg-surface-raised/50 p-4">
          <h3 className="text-sm font-medium">{t("publish.title")}</h3>
          <p className="mt-2 text-xs leading-6 text-muted-foreground">
            {t("publish.instructions")}
          </p>
          <a
            href="https://docs.github.com/en/account-and-profile/how-tos/profile-customization/managing-your-profile-readme"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-11 items-center gap-1.5 text-xs font-medium text-accent underline underline-offset-4"
          >
            {t("publish.guide")}
            <ArrowUpRight className="size-3.5" aria-hidden="true" />
          </a>
        </div>
      </section>
    </div>
  );
}
