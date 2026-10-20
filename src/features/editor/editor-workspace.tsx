"use client";

import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  Download,
  Eye,
  Globe2,
  ListOrdered,
  PenLine,
  RotateCcw,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { moduleRegistry } from "@/core/modules/module-registry";
import {
  addCustomSection,
  duplicateCustomSection,
  removeCustomSection,
  setModuleVisibility,
  updateCustomSection,
} from "@/core/profile/profile-operations";
import { CustomSectionForm } from "@/modules/custom/custom-section-form";
import type { ContentLocale, ProfileDocument } from "@/core/profile/profile-schema";
import { generateReadme } from "@/core/readme";
import { cn } from "@/lib/cn";
import { EditorModuleForm } from "./editor-module-form";
import { EditorSectionNavigation } from "./editor-section-navigation";
import {
  moveVisibleSection,
  isSectionIncluded,
  setSectionVisibility,
  moveVisibleSectionToIndex,
  visibleEditableSections,
  editableSectionIds,
  getCustomSection,
  isEditableModuleId,
  sectionKey,
  type EditableSectionId,
} from "./module-composition";
import { ReadmePreview } from "./readme-preview";
import { useProfileDraft } from "./use-profile-draft";

type ExportFeedback = "idle" | "copying" | "copied" | "copyError" | "downloaded" | "downloadError";

export function EditorWorkspace({
  initialContentLocale,
  activityCardBaseUrl,
}: {
  initialContentLocale: ContentLocale;
  activityCardBaseUrl?: string;
}) {
  const t = useTranslations("Editor");
  const formText = useTranslations("EditorModules");
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
  const [selectedId, setSelectedId] = useState<EditableSectionId | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [compactView, setCompactView] = useState<"edit" | "preview">("edit");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState<boolean | null>(null);
  const workspaceHeadingRef = useRef<HTMLHeadingElement>(null);
  const configurationHeadingRef = useRef<HTMLHeadingElement>(null);
  const pendingWorkspaceFocus = useRef(false);
  const navigationRefs = useRef(new Map<EditableSectionId, HTMLButtonElement>());
  const panelRefs = useRef(new Map<EditableSectionId, HTMLDivElement>());
  const moveRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<{
    id: EditableSectionId;
    kind: "settings" | "title" | "error" | "up" | "down";
  } | null>(null);
  const visibleModules = visibleEditableSections(profile);
  const allIds = editableSectionIds(profile);
  const activeId =
    selectedId && allIds.includes(selectedId) ? selectedId : (visibleModules[0] ?? null);
  const labelCandidates = new Map(
    allIds.map((id) => {
      if (isEditableModuleId(id)) return [id, moduleLabels(moduleRegistry[id].labelKey)] as const;
      const section = getCustomSection(profile, id);
      const number = profile.customSections.findIndex((entry) => entry === section) + 1;
      const title = section?.title.trim();
      return [id, title || t("custom.untitled", { number })] as const;
    }),
  );
  const sectionLabels = new Map([...labelCandidates].filter(([id]) => isEditableModuleId(id)));
  const usedLabels = new Set(sectionLabels.values());
  for (const [id, title] of labelCandidates) {
    if (isEditableModuleId(id)) continue;
    const section = getCustomSection(profile, id);
    let number = profile.customSections.findIndex((entry) => entry === section) + 1;
    const repeated = [...labelCandidates.values()].filter((label) => label === title).length > 1;
    let label = repeated ? t("custom.namedInstance", { title, number }) : title;
    while (usedLabels.has(label)) {
      label = t("custom.namedInstance", { title, number: number++ });
    }
    usedLabels.add(label);
    sectionLabels.set(id, label);
  }
  const activeLabel = activeId ? (sectionLabels.get(activeId) ?? null) : null;
  const activeCustom = getCustomSection(profile, activeId);
  const navigationOpen = mobileNavigationOpen ?? activeId === null;
  const isLoading = hydration === "loading";
  const result = generateReadme(profile, { activityCardBaseUrl });
  const readmeErrors = result.success ? [] : result.errors;
  const isEmpty = readmeErrors.some((error) => error.code === "empty_profile");
  const hasUrlErrors = readmeErrors.some((error) => error.code === "invalid_url");
  const hasImageUrlErrors = readmeErrors.some(
    (error) =>
      error.code === "invalid_url" &&
      error.path[0] === "customSections" &&
      typeof error.path[1] === "number" &&
      error.path[2] === "blocks" &&
      typeof error.path[3] === "number" &&
      profile.customSections[error.path[1]]?.blocks[error.path[3]]?.type === "image",
  );
  const hasInvalidUsername = readmeErrors.some((error) => error.code === "invalid_username");
  const hasMissingImageAlt = readmeErrors.some((error) => error.code === "missing_image_alt");
  const hasHtmlErrors = readmeErrors.some((error) => error.code === "invalid_html");
  const hasLocalCards = result.success && Boolean(result.exportIssues?.length);
  const canExport = !isLoading && result.success && !hasLocalCards;
  const exportGuidance = isLoading
    ? t("storage.loading")
    : isEmpty
      ? t("export.empty")
      : hasInvalidUsername
        ? t("export.invalidUsername")
        : hasHtmlErrors
          ? t("export.invalidHtml")
          : hasImageUrlErrors
            ? t("export.invalidImages")
            : hasMissingImageAlt
              ? t("export.missingImageDescription")
              : hasUrlErrors
                ? t("export.invalidLinks")
                : hasLocalCards
                  ? t("export.localCards")
                  : t("export.ready");

  useEffect(() => {
    if (pendingWorkspaceFocus.current) {
      pendingWorkspaceFocus.current = false;
      workspaceHeadingRef.current?.focus();
      return;
    }
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    if (pending.kind === "settings") configurationHeadingRef.current?.focus();
    else if (pending.kind === "title")
      panelRefs.current.get(pending.id)?.querySelector<HTMLInputElement>("input")?.focus();
    else if (pending.kind === "error")
      panelRefs.current
        .get(pending.id)
        ?.querySelector<HTMLElement>('[aria-invalid="true"]')
        ?.focus();
    else {
      const control = moveRefs.current.get(`${pending.id}-${pending.kind}`);
      const alternative = moveRefs.current.get(
        `${pending.id}-${pending.kind === "up" ? "down" : "up"}`,
      );
      if (control && !control.disabled) control.focus();
      else if (alternative && !alternative.disabled) alternative.focus();
      else navigationRefs.current.get(pending.id)?.focus();
    }
  }, [profile, activeId, compactView, navigationOpen]);

  function editDocument(next: ProfileDocument) {
    setExportFeedback("idle");
    updateDocument(next);
  }

  function selectModule(id: EditableSectionId) {
    if (!isSectionIncluded(profile, id)) {
      const next = setSectionVisibility(profile, id, true);
      if (next.success) editDocument(next.data);
    }
    setSelectedId(id);
    setCompactView("edit");
    setMobileNavigationOpen(false);
    if (activeId === id && compactView === "edit") configurationHeadingRef.current?.focus();
    else pendingFocus.current = { id, kind: "settings" };
  }

  function toggleModule(id: EditableSectionId, visible: boolean) {
    const next = setSectionVisibility(profile, id, visible);
    if (!next.success) return;
    setMobileNavigationOpen(true);
    setSelectedId(activeId ?? (visible ? id : null));
    if (!visible && activeId === id)
      setAnnouncement(t("settings.sectionHidden", { module: sectionLabels.get(id) ?? "" }));
    editDocument(next.data);
  }

  function announceOrder(next: ProfileDocument, id: EditableSectionId) {
    setAnnouncement(
      t("composition.moved", {
        module: sectionLabels.get(id) ?? "",
        position: visibleEditableSections(next).indexOf(id) + 1,
        total: visibleModules.length,
      }),
    );
  }

  function moveModule(id: EditableSectionId, direction: "up" | "down") {
    const next = moveVisibleSection(profile, id, direction);
    if (!next.success || next.data === profile) return;
    setSelectedId(activeId);
    pendingFocus.current = { id, kind: direction };
    editDocument(next.data);
    announceOrder(next.data, id);
  }

  function reorderModule(id: EditableSectionId, destination: number) {
    const next = moveVisibleSectionToIndex(profile, id, destination);
    if (!next.success || next.data === profile) return;
    setSelectedId(activeId);
    editDocument(next.data);
  }

  function reviewErrors(id: EditableSectionId) {
    setSelectedId(id);
    setCompactView("edit");
    setMobileNavigationOpen(false);
    if (activeId === id && compactView === "edit")
      panelRefs.current.get(id)?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    else pendingFocus.current = { id, kind: "error" };
  }

  function focusNewCustom(next: ProfileDocument, previousIds: ReadonlySet<string>) {
    const section = next.customSections.find((entry) => !previousIds.has(entry.id));
    if (!section) return;
    const id = `custom:${section.id}`;
    editDocument(next);
    setSelectedId(id);
    setCompactView("edit");
    setMobileNavigationOpen(false);
    pendingFocus.current = { id, kind: "title" };
  }

  function addSection() {
    const after = profile.sectionOrder.find((reference) => sectionKey(reference) === activeId);
    const next = addCustomSection(profile, () => crypto.randomUUID(), after);
    if (!next.success) {
      setAnnouncement(t("custom.failed"));
      return;
    }
    focusNewCustom(next.data, new Set(profile.customSections.map((section) => section.id)));
    setAnnouncement(t("custom.added"));
  }

  function duplicateSection() {
    if (!activeCustom) return;
    const next = duplicateCustomSection(profile, activeCustom.id, () => crypto.randomUUID());
    if (!next.success) {
      setAnnouncement(t("custom.failed"));
      return;
    }
    focusNewCustom(next.data, new Set(profile.customSections.map((section) => section.id)));
    setAnnouncement(t("custom.duplicated", { section: activeLabel ?? "" }));
  }

  function deleteSection() {
    if (!activeCustom || !activeId) return;
    const hasContent =
      activeCustom.title.trim() ||
      activeCustom.blocks.some((block) => {
        switch (block.type) {
          case "paragraph":
          case "heading":
          case "quote":
            return Boolean(block.text.trim());
          case "html":
            return Boolean(block.source.trim());
          case "link":
            return Boolean(block.label.trim() || block.url.trim());
          case "image":
            return Boolean(block.url.trim() || block.alt.trim());
          case "divider":
            return true;
          case "list":
            return block.items.some((item) => item.text.trim());
        }
      });
    if (
      hasContent &&
      !window.confirm(t("custom.deleteConfirmation", { section: activeLabel ?? "" }))
    )
      return;
    const next = removeCustomSection(profile, activeCustom.id);
    if (!next.success) {
      setAnnouncement(t("custom.failed"));
      return;
    }
    const remaining = allIds.filter((id) => id !== activeId);
    const following = remaining[Math.min(allIds.indexOf(activeId), remaining.length - 1)] ?? null;
    setSelectedId(following);
    if (following) pendingFocus.current = { id: following, kind: "settings" };
    else pendingWorkspaceFocus.current = true;
    editDocument(next.data);
    setAnnouncement(t("custom.deleted", { section: activeLabel ?? "" }));
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
      setSelectedId(null);
      setMobileNavigationOpen(true);
      setCompactView("edit");
      startNewDraft();
    }
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          ref={workspaceHeadingRef}
          tabIndex={-1}
          id="editor-content-title"
          className="text-lg font-semibold tracking-tight"
        >
          {t("workspaceTitle")}
        </h2>
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
      {hasLocalCards && (
        <div
          role="status"
          className="rounded-lg border border-warning/30 bg-warning-soft p-5 text-warning"
        >
          <p className="text-sm font-semibold">{t("metrics.title")}</p>
          <p className="mt-2 text-sm leading-6">{t("metrics.help")}</p>
          <Button
            variant="outline"
            className="mt-3"
            disabled={isLoading}
            onClick={() => {
              const next = setModuleVisibility(profile, "metrics", false);
              if (next.success) {
                pendingWorkspaceFocus.current = true;
                editDocument(next.data);
                setAnnouncement(t("metrics.hidden"));
              }
            }}
          >
            {t("metrics.hide")}
          </Button>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 xl:hidden">
        <Button
          className="lg:hidden"
          variant="outline"
          aria-label={t("settings.sections")}
          aria-controls="editor-section-navigation"
          aria-expanded={navigationOpen}
          onClick={() => setMobileNavigationOpen(!navigationOpen)}
        >
          <ListOrdered aria-hidden="true" />
          {t("settings.sections")}
        </Button>
        <div
          role="group"
          aria-label={t("settings.viewLabel")}
          className="inline-flex gap-1 rounded-lg border border-border bg-surface p-1"
        >
          <Button
            variant={compactView === "edit" ? "secondary" : "ghost"}
            aria-pressed={compactView === "edit"}
            onClick={() => setCompactView("edit")}
          >
            <Settings2 aria-hidden="true" />
            {t("settings.edit")}
          </Button>
          <Button
            variant={compactView === "preview" ? "secondary" : "ghost"}
            aria-pressed={compactView === "preview"}
            onClick={() => setCompactView("preview")}
          >
            <Eye aria-hidden="true" />
            {t("settings.preview")}
          </Button>
        </div>
      </div>
      <div className="grid min-w-0 items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)] xl:grid-cols-[15rem_minmax(0,1fr)_minmax(0,1.08fr)] xl:gap-6">
        <aside
          id="editor-section-navigation"
          className={cn(
            "min-w-0 lg:sticky lg:top-6 lg:block lg:max-h-[calc(100svh-3rem)] lg:overflow-y-auto",
            !navigationOpen && "hidden",
          )}
        >
          <EditorSectionNavigation
            profile={profile}
            labels={sectionLabels}
            onAddCustom={addSection}
            activeId={activeId}
            errors={readmeErrors}
            disabled={isLoading}
            onSelect={selectModule}
            onVisibility={toggleModule}
            onMove={moveModule}
            onReorder={reorderModule}
            onReview={reviewErrors}
            buttonRef={(id, node) => {
              if (node) navigationRefs.current.set(id, node);
              else navigationRefs.current.delete(id);
            }}
            moveButtonRef={(id, direction, node) => {
              if (node) moveRefs.current.set(`${id}-${direction}`, node);
              else moveRefs.current.delete(`${id}-${direction}`);
            }}
          />
        </aside>
        <div className={cn("min-w-0 space-y-4 xl:block", compactView === "preview" && "hidden")}>
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 px-1">
            <label
              htmlFor="readme-language"
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground"
            >
              <Globe2 className="size-3.5" aria-hidden="true" />
              {t("contentLanguage")}
            </label>
            <select
              id="readme-language"
              aria-describedby="readme-language-help"
              value={profile.contentLocale}
              disabled={isLoading}
              onChange={(event) => {
                const contentLocale = event.target.value;
                if (contentLocale === "en" || contentLocale === "es")
                  editDocument({ ...profile, contentLocale });
              }}
              className="min-h-11 max-w-full rounded-md border border-border-strong bg-surface px-3 py-2 text-base focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:opacity-60 sm:text-sm"
            >
              <option value="en">{t("languageOptions.en")}</option>
              <option value="es">{t("languageOptions.es")}</option>
            </select>
            <p id="readme-language-help" className="sr-only">
              {t("settings.languageHelp")}
            </p>
          </div>
          <Card>
            <CardHeader className="border-b border-border">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-2 font-medium">
                  <PenLine className="size-3.5" aria-hidden="true" />
                  {t("settings.configuring")}
                </span>
                {activeId && (
                  <span>
                    {isSectionIncluded(profile, activeId)
                      ? t("settings.position", {
                          position: visibleModules.indexOf(activeId) + 1,
                          total: visibleModules.length,
                        })
                      : t("settings.notIncluded")}
                  </span>
                )}
              </div>
              <h2
                id="editor-section-title"
                ref={configurationHeadingRef}
                tabIndex={-1}
                className="text-xl font-semibold tracking-tight wrap-anywhere"
              >
                {activeLabel ?? t("settings.chooseTitle")}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">
                {activeId
                  ? activeCustom
                    ? formText("custom.description")
                    : activeId === "presentation" || activeId === "contact"
                      ? t(`${activeId}.description`)
                      : activeId === "technologies" ||
                          activeId === "projects" ||
                          activeId === "contributions"
                        ? formText(`${activeId}.description`)
                        : ""
                  : t("settings.chooseHelp")}
              </p>
              {activeCustom && (
                <div className="flex flex-wrap gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={duplicateSection}
                  >
                    <Copy aria-hidden="true" />
                    {t("custom.duplicate")}
                  </Button>
                  <Button variant="ghost" size="sm" disabled={isLoading} onClick={deleteSection}>
                    <Trash2 aria-hidden="true" />
                    {t("custom.delete")}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="pt-5 sm:pt-6">
              <fieldset disabled={isLoading} className="min-w-0">
                <legend className="sr-only">{activeLabel ?? t("settings.chooseTitle")}</legend>
                {isLoading && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {t("storage.loadingHelp")}
                  </p>
                )}
                {activeId && (
                  <div
                    key={activeId}
                    role="region"
                    aria-label={activeLabel ?? undefined}
                    ref={(node) => {
                      if (node) panelRefs.current.set(activeId, node);
                      else panelRefs.current.delete(activeId);
                    }}
                  >
                    {activeCustom ? (
                      <CustomSectionForm
                        value={activeCustom}
                        errors={readmeErrors.filter(
                          (error) =>
                            error.path[0] === "customSections" &&
                            error.path[1] === profile.customSections.indexOf(activeCustom),
                        )}
                        onChange={(value) => {
                          const next = updateCustomSection(profile, activeCustom.id, value);
                          if (next.success) editDocument(next.data);
                        }}
                      />
                    ) : isEditableModuleId(activeId) ? (
                      <EditorModuleForm
                        id={activeId}
                        profile={profile}
                        errors={readmeErrors}
                        onChange={editDocument}
                      />
                    ) : null}
                  </div>
                )}
              </fieldset>
            </CardContent>
          </Card>
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <Globe2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {t("storage.privacy")}
          </p>
        </div>
        <section
          className={cn(
            "min-w-0 space-y-4 xl:sticky xl:top-6 xl:block",
            compactView === "edit" && "hidden",
          )}
          aria-labelledby="readme-preview-title"
        >
          <div>
            <h2 id="readme-preview-title" className="text-xl font-semibold tracking-tight">
              {t("preview.title")}
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              {t("preview.description")}
            </p>
          </div>
          {activeLabel && (
            <p className="inline-flex max-w-full items-center gap-2 rounded-md border border-accent/25 bg-accent-soft px-3 py-1.5 text-xs font-medium wrap-anywhere text-accent-soft-foreground">
              <PenLine aria-hidden="true" className="size-3.5" />
              {t("settings.nowEditing", { module: activeLabel })}
            </p>
          )}
          <ReadmePreview
            markdown={result.success ? result.markdown : null}
            contentLocale={profile.contentLocale}
            loading={isLoading}
            hasErrors={!isEmpty && readmeErrors.length > 0}
            activityCardBaseUrl={activityCardBaseUrl}
            customImages={result.success ? result.customImages : undefined}
            customHtml={result.success ? result.customHtml : undefined}
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
      <p role="status" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
