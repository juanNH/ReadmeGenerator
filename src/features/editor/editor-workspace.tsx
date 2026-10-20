"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  Check,
  CircleAlert,
  Copy,
  Download,
  Eye,
  FileUp,
  FolderOpen,
  Globe2,
  PenLine,
  Plus,
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

function ImportLoading() {
  const t = useTranslations("Editor");
  return (
    <p role="status" className="p-4 text-sm text-muted-foreground">
      {t("settings.importLoading")}
    </p>
  );
}

const ReadmeImportPanel = dynamic(
  () => import("./readme-import-panel").then((module) => module.ReadmeImportPanel),
  { loading: ImportLoading },
);

function ProjectLoading() {
  const t = useTranslations("Editor");
  return (
    <p role="status" className="p-4 text-sm text-muted-foreground">
      {t("project.loading")}
    </p>
  );
}

const ProjectPanel = dynamic(
  () => import("./project-panel").then((module) => module.ProjectPanel),
  { loading: ProjectLoading },
);

type ExportFeedback = "idle" | "copying" | "copied" | "copyError" | "downloaded" | "downloadError";

// Changed only by browser events. Locale navigation may remount the workspace.
let pendingReadmeImportOpen = false;

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
    clearReadme,
    importBackup,
    importBackupStatus,
    importMemoryOnly,
    replaceWithImport,
    restoreImportBackup,
    projectBackup,
    projectBackupStatus,
    replaceWithProject,
    restoreProjectBackup,
  } = useProfileDraft(initialContentLocale);
  const [exportFeedback, setExportFeedback] = useState<ExportFeedback>("idle");
  const [selectedId, setSelectedId] = useState<EditableSectionId | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [clearFeedback, setClearFeedback] = useState<"saved" | "memory_only" | null>(null);
  const [compactView, setCompactView] = useState<"edit" | "preview">("edit");
  const [importOpen, setImportOpen] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const projectTriggerRef = useRef<HTMLButtonElement>(null);
  const importTriggerRef = useRef<HTMLButtonElement>(null);
  const [toolbarSize, setToolbarSize] = useState({ height: 0, sticky: true });
  const toolbarRef = useRef<HTMLDivElement>(null);
  const pendingViewScroll = useRef<"edit" | "preview" | null>(null);
  const previewHeadingRef = useRef<HTMLHeadingElement>(null);
  const workspaceHeadingRef = useRef<HTMLHeadingElement>(null);
  const configurationHeadingRef = useRef<HTMLHeadingElement>(null);
  const pendingWorkspaceFocus = useRef(false);
  const navigationRefs = useRef(new Map<EditableSectionId, HTMLButtonElement>());
  const panelRefs = useRef(new Map<EditableSectionId, HTMLDivElement>());
  const moveRefs = useRef(new Map<string, HTMLButtonElement>());
  const pendingFocus = useRef<{
    id: EditableSectionId;
    kind: "settings" | "navigation" | "title" | "error" | "up" | "down";
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
  const activeHeading = activeCustom
    ? t("custom.untitled", { number: profile.customSections.indexOf(activeCustom) + 1 })
    : activeLabel;
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
  const hasInvalidActivityOptions = readmeErrors.some(
    (error) => error.code === "invalid_activity_options",
  );
  const hasMissingImageAlt = readmeErrors.some((error) => error.code === "missing_image_alt");
  const hasHtmlErrors = readmeErrors.some((error) => error.code === "invalid_html");
  const hasCodeErrors = readmeErrors.some((error) => error.code === "invalid_code");
  const hasLocalCards = result.success && Boolean(result.exportIssues?.length);
  const canExport = !isLoading && result.success && !hasLocalCards;
  const exportGuidance = isLoading
    ? t("storage.loading")
    : isEmpty
      ? t("export.empty")
      : hasInvalidActivityOptions
        ? t("export.invalidActivityOptions")
        : hasInvalidUsername
          ? t("export.invalidUsername")
          : hasCodeErrors
            ? t("export.invalidCode")
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
    const timer = window.setTimeout(() => {
      if (pendingReadmeImportOpen) setImportOpen(true);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    const toolbar = toolbarRef.current;
    if (!toolbar) return;
    function measureToolbar() {
      const height = toolbar!.getBoundingClientRect().height;
      const availableHeight = window.visualViewport?.height ?? window.innerHeight;
      // A large toolbar or the on-screen keyboard must not cover the editing area.
      const sticky = height <= availableHeight * 0.4;
      setToolbarSize((previous) =>
        previous.height === height && previous.sticky === sticky ? previous : { height, sticky },
      );
    }
    measureToolbar();
    const observer = new ResizeObserver(measureToolbar);
    observer.observe(toolbar);
    window.addEventListener("resize", measureToolbar);
    window.visualViewport?.addEventListener("resize", measureToolbar);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measureToolbar);
      window.visualViewport?.removeEventListener("resize", measureToolbar);
    };
  }, []);

  useEffect(() => {
    if (pendingViewScroll.current) {
      const heading =
        pendingViewScroll.current === "edit"
          ? configurationHeadingRef.current
          : previewHeadingRef.current;
      pendingViewScroll.current = null;
      heading?.scrollIntoView({ block: "start" });
    }
    if (pendingWorkspaceFocus.current) {
      pendingWorkspaceFocus.current = false;
      workspaceHeadingRef.current?.focus();
      return;
    }
    const pending = pendingFocus.current;
    if (!pending) return;
    pendingFocus.current = null;
    if (pending.kind === "settings") configurationHeadingRef.current?.focus();
    else if (pending.kind === "navigation")
      configurationHeadingRef.current?.scrollIntoView({ block: "start" });
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
  }, [profile, activeId, compactView]);

  function editDocument(next: ProfileDocument) {
    setExportFeedback("idle");
    setClearFeedback(null);
    updateDocument(next);
  }

  function selectModule(id: EditableSectionId) {
    if (!isSectionIncluded(profile, id)) {
      const next = setSectionVisibility(profile, id, true);
      if (next.success) editDocument(next.data);
    }
    setSelectedId(id);
    setCompactView("edit");
    if (activeId === id && compactView === "edit")
      configurationHeadingRef.current?.scrollIntoView({ block: "start" });
    else pendingFocus.current = { id, kind: "navigation" };
  }

  function toggleModule(id: EditableSectionId, visible: boolean) {
    const next = setSectionVisibility(profile, id, visible);
    if (!next.success) return;
    setSelectedId(activeId ?? (visible ? id : null));
    if (!visible && activeId === id)
      setAnnouncement(t("settings.sectionHidden", { module: sectionLabels.get(id) ?? "" }));
    editDocument(next.data);
  }

  function switchView(view: "edit" | "preview") {
    if (compactView === view) {
      const heading = view === "edit" ? configurationHeadingRef.current : previewHeadingRef.current;
      heading?.scrollIntoView({ block: "start" });
    } else {
      pendingViewScroll.current = view;
      setCompactView(view);
    }
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
          case "code":
            return Boolean(block.source.length || block.language.trim());
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
      setClearFeedback(null);
      setExportFeedback("idle");
      setSelectedId(null);
      setCompactView("edit");
      setProjectOpen(false);
      startNewDraft();
    }
  }

  function clearCurrentReadme() {
    if (isLoading || !window.confirm(t("reset.confirmation"))) return;
    const cleared = clearReadme();
    if (cleared.status === "not_ready") return;
    pendingReadmeImportOpen = false;
    setImportOpen(false);
    setProjectOpen(false);
    setSelectedId(null);
    setCompactView("edit");
    setExportFeedback("idle");
    pendingFocus.current = null;
    pendingViewScroll.current = null;
    pendingWorkspaceFocus.current = true;
    setClearFeedback(cleared.status);
    setAnnouncement(t(cleared.status === "saved" ? "reset.cleared" : "reset.memoryOnly"));
  }

  function completeImport(next: ProfileDocument) {
    setClearFeedback(null);
    setExportFeedback("idle");
    pendingReadmeImportOpen = false;
    setImportOpen(false);
    setProjectOpen(false);
    setCompactView("edit");
    const id = visibleEditableSections(next)[0] ?? null;
    setSelectedId(id);
    if (id) pendingFocus.current = { id, kind: "settings" };
    else pendingWorkspaceFocus.current = true;
    setAnnouncement(t("settings.importCompleted"));
  }

  function changeImportOpen(open: boolean) {
    if (open) setProjectOpen(false);
    pendingReadmeImportOpen = open;
    setImportOpen(open);
    if (!open) importTriggerRef.current?.focus();
  }

  function changeProjectOpen(open: boolean) {
    if (open) {
      pendingReadmeImportOpen = false;
      setImportOpen(false);
    }
    setProjectOpen(open);
    if (!open) projectTriggerRef.current?.focus();
  }

  function completeProject(next: ProfileDocument) {
    setClearFeedback(null);
    setExportFeedback("idle");
    setProjectOpen(false);
    setCompactView("edit");
    pendingFocus.current = null;
    pendingViewScroll.current = null;
    const id = visibleEditableSections(next)[0] ?? null;
    setSelectedId(id);
    if (id) pendingFocus.current = { id, kind: "settings" };
    else pendingWorkspaceFocus.current = true;
    setAnnouncement(t("project.completed"));
  }

  return (
    <div
      className="@container/editor min-w-0 space-y-3 [&_input]:scroll-mt-[var(--editor-toolbar-offset)] [&_select]:scroll-mt-[var(--editor-toolbar-offset)] [&_textarea]:scroll-mt-[var(--editor-toolbar-offset)]"
      style={
        {
          "--editor-toolbar-offset":
            toolbarSize.sticky && !projectOpen ? `${toolbarSize.height + 16}px` : "1rem",
        } as CSSProperties
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2
          ref={workspaceHeadingRef}
          tabIndex={-1}
          id="editor-content-title"
          className="sr-only text-lg font-semibold tracking-tight focus:not-sr-only sm:not-sr-only"
        >
          {t("workspaceTitle")}
        </h2>
        <div className="ml-auto flex max-w-full min-w-0 items-center gap-2 sm:gap-3">
          <p className="flex min-w-0 items-center gap-2 text-xs leading-5 text-muted-foreground">
            <Save className="size-3.5 shrink-0" aria-hidden="true" />
            {isLoading ? t("storage.loading") : t(`storage.${storageStatus}`)}
          </p>
          <Button
            ref={projectTriggerRef}
            variant={projectOpen ? "secondary" : "ghost"}
            size="icon"
            className="shrink-0 sm:w-auto sm:px-3"
            disabled={isLoading}
            aria-label={t("project.action")}
            title={t("project.action")}
            aria-controls="project-panel"
            aria-expanded={projectOpen}
            onClick={() => changeProjectOpen(!projectOpen)}
          >
            <FolderOpen aria-hidden="true" />
            <span className="hidden sm:inline">{t("project.action")}</span>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 text-destructive sm:w-auto sm:px-3"
            disabled={isLoading}
            aria-label={t("reset.action")}
            title={t("reset.action")}
            onClick={clearCurrentReadme}
          >
            <Trash2 aria-hidden="true" />
            <span className="hidden sm:inline">{t("reset.action")}</span>
          </Button>
        </div>
      </div>
      {clearFeedback === "memory_only" && (
        <p
          role="note"
          className="rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-warning"
        >
          {t("reset.memoryOnly")}
        </p>
      )}
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
      <div
        ref={toolbarRef}
        role="region"
        aria-label={t("settings.controls")}
        className={cn(
          "z-20 min-w-0 rounded-lg border border-border bg-background p-2 shadow-soft",
          toolbarSize.sticky && !projectOpen && "sticky top-0",
        )}
      >
        <EditorSectionNavigation
          profile={profile}
          labels={sectionLabels}
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
          actions={
            <div className="ml-auto flex max-w-full min-w-0 flex-wrap items-center justify-end gap-0 sm:gap-2">
              <div
                role="group"
                aria-label={t("settings.viewLabel")}
                className="inline-flex max-w-full min-w-0 flex-wrap gap-0 rounded-md border border-border bg-surface sm:gap-1 @min-[75em]/editor:hidden"
              >
                <Button
                  size="icon"
                  className="sm:w-auto sm:px-3"
                  variant={compactView === "edit" ? "secondary" : "ghost"}
                  aria-pressed={compactView === "edit"}
                  aria-label={t("settings.edit")}
                  title={t("settings.edit")}
                  onClick={() => switchView("edit")}
                >
                  <Settings2 aria-hidden="true" />
                  <span className="hidden sm:inline">{t("settings.edit")}</span>
                </Button>
                <Button
                  size="icon"
                  className="sm:w-auto sm:px-3"
                  variant={compactView === "preview" ? "secondary" : "ghost"}
                  aria-pressed={compactView === "preview"}
                  aria-label={t("settings.preview")}
                  title={t("settings.preview")}
                  onClick={() => switchView("preview")}
                >
                  <Eye aria-hidden="true" />
                  <span className="hidden sm:inline">{t("settings.preview")}</span>
                </Button>
              </div>
              <Button
                ref={importTriggerRef}
                variant="outline"
                size="icon"
                className="sm:w-auto sm:px-3"
                disabled={isLoading}
                aria-label={t("settings.importReadme")}
                title={t("settings.importReadme")}
                aria-controls="readme-import-panel"
                aria-expanded={importOpen}
                onClick={() => changeImportOpen(!importOpen)}
              >
                <FileUp aria-hidden="true" />
                <span className="hidden sm:inline">{t("settings.importReadme")}</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="sm:w-auto sm:px-3"
                disabled={isLoading}
                aria-label={t("custom.addAction")}
                title={t("custom.addAction")}
                onClick={addSection}
              >
                <Plus aria-hidden="true" />
                <span className="hidden sm:inline">{t("custom.addAction")}</span>
              </Button>
            </div>
          }
        />
      </div>
      <div id="project-panel" hidden={!projectOpen}>
        {projectOpen && (
          <ProjectPanel
            profile={profile}
            isLoading={isLoading}
            projectBackup={projectBackup}
            projectBackupStatus={projectBackupStatus}
            onReplace={replaceWithProject}
            onRestore={restoreProjectBackup}
            onComplete={completeProject}
            onClose={() => changeProjectOpen(false)}
          />
        )}
      </div>
      <div id="readme-import-panel" hidden={!importOpen}>
        {importOpen && (
          <ReadmeImportPanel
            open
            onOpenChange={changeImportOpen}
            currentLocale={profile.contentLocale}
            disabled={isLoading}
            backup={importBackup}
            backupStatus={importBackupStatus}
            onReplace={replaceWithImport}
            onRestore={restoreImportBackup}
            onImported={completeImport}
          />
        )}
      </div>
      {importMemoryOnly && (
        <p
          role="status"
          className="rounded-md border border-warning/30 bg-warning-soft p-3 text-sm text-warning"
        >
          {t("storage.importMemoryHelp")}
        </p>
      )}
      <div className="grid min-w-0 items-start gap-5 @min-[75em]/editor:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] @min-[75em]/editor:gap-6">
        <div
          className={cn(
            "min-w-0 space-y-4 @min-[75em]/editor:block",
            compactView === "preview" && "hidden",
          )}
        >
          <Card>
            <CardHeader className="gap-1 border-b border-border px-4 py-2 sm:gap-2 sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                <span className="hidden items-center gap-2 font-medium sm:flex">
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
                className="scroll-mt-[var(--editor-toolbar-offset)] text-xl font-semibold tracking-tight wrap-anywhere"
              >
                {activeHeading ?? t("settings.chooseTitle")}
              </h2>
              <p className="hidden text-sm leading-6 text-muted-foreground sm:block">
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
                <div className="flex flex-wrap gap-2 sm:pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={isLoading}
                    onClick={duplicateSection}
                  >
                    <Copy aria-hidden="true" />
                    {t("custom.duplicate")}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="sm:w-auto sm:px-3"
                    aria-label={t("custom.delete")}
                    title={t("custom.delete")}
                    disabled={isLoading}
                    onClick={deleteSection}
                  >
                    <Trash2 aria-hidden="true" />
                    <span className="hidden sm:inline">{t("custom.delete")}</span>
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardContent className="@container/configuration px-4 pt-4 pb-4 sm:px-6 sm:pt-6 sm:pb-6">
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
          <p className="flex items-start gap-2 text-xs leading-5 text-muted-foreground">
            <Globe2 className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
            {t("storage.privacy")}
          </p>
        </div>
        <section
          className={cn(
            "min-w-0 space-y-4 @min-[75em]/editor:sticky @min-[75em]/editor:top-[var(--editor-toolbar-offset)] @min-[75em]/editor:block",
            compactView === "edit" && "hidden",
          )}
          aria-labelledby="readme-preview-title"
        >
          <div>
            <h2
              id="readme-preview-title"
              ref={previewHeadingRef}
              className="scroll-mt-[var(--editor-toolbar-offset)] text-xl font-semibold tracking-tight"
            >
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
