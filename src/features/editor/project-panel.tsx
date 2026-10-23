"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent } from "react";
import { ArrowLeft, Check, Download, FileUp, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { PROJECT_FILE_MAX_BYTES, parseProjectFile, serializeProjectFile } from "@/core/project";
import type { ProfileDocument } from "@/core/profile/profile-schema";
import {
  editableSectionIds,
  getCustomSection,
  isEditableModuleId,
  isSectionIncluded,
} from "./module-composition";
import type { ProjectBackup } from "./project-backup";
import type { ImportOperationResult } from "./use-profile-draft";
import { downloadProjectFile } from "./download-project-file";

type ProjectStep = "source" | "review" | "confirm" | "restore";
type ProjectCandidate = { document: ProfileDocument; sourceVersion: 1 | 2; filename: string };

export type ProjectPanelProps = {
  profile: ProfileDocument;
  isLoading: boolean;
  projectBackup: ProjectBackup | null;
  projectBackupStatus: "loading" | "empty" | "available" | "invalid" | "unavailable";
  onReplace: (candidate: ProfileDocument, allowMemoryOnly?: boolean) => ImportOperationResult;
  onRestore: (allowMemoryOnly?: boolean) => ImportOperationResult;
  onComplete: (document: ProfileDocument) => void;
  onClose: () => void;
};

const summaryClass =
  "flex min-h-11 cursor-pointer items-center rounded-md px-2 py-2 text-sm font-medium focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none";

/** Authored labels and counts only: review never activates HTML, URLs or GitHub cards. */
function ProjectSummary({ profile }: { profile: ProfileDocument }) {
  const t = useTranslations("Project");
  const sections = editableSectionIds(profile);
  const included = sections.filter((id) => isSectionIncluded(profile, id)).length;

  function describe(id: string): string {
    switch (id) {
      case "presentation":
        return t("summary.presentation", {
          count: Object.entries(profile.data.presentation).filter(
            ([key, value]) => key !== "format" && typeof value === "string" && value.trim(),
          ).length,
        });
      case "technologies":
        return t("summary.technologies", {
          count: profile.data.technologies.groups.reduce(
            (sum, group) => sum + group.items.length,
            0,
          ),
          groups: profile.data.technologies.groups.length,
        });
      case "projects":
        return t("summary.projects", { count: profile.data.projects.items.length });
      case "contributions":
        return t("summary.contributions", {
          count: profile.data.contributions.items.length,
          cards: profile.data.metrics.cards.length,
        });
      case "contact":
        return t("summary.contact", { count: profile.data.contact.links.length });
      default:
        return t("summary.custom", { count: getCustomSection(profile, id)?.blocks.length ?? 0 });
    }
  }

  return (
    <div className="min-w-0 space-y-3">
      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div className="min-w-0 rounded-md bg-surface-raised p-3">
          <dt className="text-xs text-muted-foreground">{t("summary.language")}</dt>
          <dd className="mt-1 font-medium">{t(`languages.${profile.contentLocale}`)}</dd>
        </div>
        <div className="min-w-0 rounded-md bg-surface-raised p-3">
          <dt className="text-xs text-muted-foreground">{t("summary.visibility")}</dt>
          <dd className="mt-1 font-medium">
            {t("summary.sectionCounts", { included, hidden: sections.length - included })}
          </dd>
        </div>
      </dl>
      <ol className="space-y-2">
        {sections.map((id, index) => {
          const section = getCustomSection(profile, id);
          const title = isEditableModuleId(id)
            ? t(`sections.${id}`)
            : section?.title.trim() || t("sections.custom", { number: index + 1 });
          return (
            <li key={id} className="min-w-0 rounded-md border border-border p-3">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                <h4 className="min-w-0 flex-1 text-sm font-semibold wrap-anywhere">{title}</h4>
                <span className="text-xs leading-5 text-muted-foreground">
                  {t(isSectionIncluded(profile, id) ? "summary.included" : "summary.hidden")}
                </span>
              </div>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{describe(id)}</p>
              {section && section.blocks.length > 0 && (
                <p className="mt-1 text-xs leading-5 wrap-anywhere">
                  {Array.from(new Set(section.blocks.map((block) => block.type)))
                    .map((type) => t(`blocks.${type}`))
                    .join(" · ")}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <p className="text-xs leading-5 text-muted-foreground">{t("summary.preserved")}</p>
    </div>
  );
}

export function ProjectPanel({
  profile,
  isLoading,
  projectBackup,
  projectBackupStatus,
  onReplace,
  onRestore,
  onComplete,
  onClose,
}: ProjectPanelProps) {
  const t = useTranslations("Project");
  const baseId = useId();
  const [step, setStep] = useState<ProjectStep>("source");
  const [candidate, setCandidate] = useState<ProjectCandidate | null>(null);
  const [readingFile, setReadingFile] = useState(false);
  const [inputError, setInputError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [acknowledged, setAcknowledged] = useState(false);
  const [memoryOperation, setMemoryOperation] = useState<"open" | "restore" | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const dialogRef = useRef<HTMLDialogElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const memoryHeadingRef = useRef<HTMLHeadingElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const readerRef = useRef<FileReader | null>(null);
  const readGeneration = useRef(0);
  const focusRequest = useRef<"step" | "memory" | "error" | null>(null);
  const operationDisabled = isLoading || projectBackupStatus === "loading";
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    headingRef.current?.focus();
    return () => {
      readGeneration.current += 1;
      const reader = readerRef.current;
      if (reader) {
        reader.onload = null;
        reader.onerror = null;
        reader.onabort = null;
        reader.onloadend = null;
        reader.abort();
      }
      if (dialog.open) dialog.close();
    };
  }, []);

  useEffect(() => {
    if (!focusRequest.current) return;
    const target =
      focusRequest.current === "step"
        ? stepHeadingRef.current
        : focusRequest.current === "memory"
          ? memoryHeadingRef.current
          : errorRef.current;
    target?.focus();
    focusRequest.current = null;
  });

  function cancelRead() {
    readGeneration.current += 1;
    readerRef.current?.abort();
    readerRef.current = null;
    setReadingFile(false);
  }

  function close() {
    cancelRead();
    onClose();
  }

  function goTo(next: ProjectStep) {
    cancelRead();
    setStep(next);
    setAcknowledged(false);
    setMemoryOperation(null);
    setOperationError(null);
    setInputError(null);
    focusRequest.current = "step";
  }

  function failFile(message: string) {
    setInputError(message);
    focusRequest.current = "error";
  }

  function openFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    readProjectFile(file);
  }

  function readProjectFile(file: File) {
    cancelRead();
    setCandidate(null);
    setStep("source");
    setAcknowledged(false);
    setMemoryOperation(null);
    setOperationError(null);
    setInputError(null);
    setAnnouncement("");
    if (!file.name.toLowerCase().endsWith(".json")) {
      failFile(t("errors.file_type"));
      return;
    }
    if (file.size > PROJECT_FILE_MAX_BYTES) {
      failFile(t("errors.too_large", { limit: PROJECT_FILE_MAX_BYTES / 1024 / 1024 }));
      return;
    }
    setReadingFile(true);
    const generation = readGeneration.current;
    const reader = new FileReader();
    readerRef.current = reader;
    reader.onload = () => {
      if (generation !== readGeneration.current) return;
      try {
        if (!(reader.result instanceof ArrayBuffer)) throw new Error("invalid_file_result");
        const source = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
          reader.result,
        );
        const result = parseProjectFile(source);
        if (!result.success) {
          failFile(t(`errors.${result.code}`, { limit: PROJECT_FILE_MAX_BYTES / 1024 / 1024 }));
          return;
        }
        setCandidate({
          document: result.document,
          sourceVersion: result.sourceVersion,
          filename: file.name,
        });
        setStep("review");
        focusRequest.current = "step";
        setAnnouncement(t("reviewReady"));
      } catch {
        failFile(t("errors.encoding"));
      }
    };
    reader.onerror = () => {
      if (generation === readGeneration.current) failFile(t("errors.read"));
    };
    reader.onloadend = () => {
      if (generation !== readGeneration.current) return;
      readerRef.current = null;
      setReadingFile(false);
    };
    try {
      reader.readAsArrayBuffer(file);
    } catch {
      readerRef.current = null;
      setReadingFile(false);
      failFile(t("errors.read"));
    }
  }

  function download(document: ProfileDocument, filename: string) {
    const result = downloadProjectFile(document, filename);
    if (!result.success) {
      setOperationError(
        t(
          result.code === "too_large"
            ? "errors.download_too_large"
            : result.code === "download"
              ? "errors.download"
              : "errors.download_invalid",
        ),
      );
      return;
    }
    setOperationError(null);
    setAnnouncement(t("downloaded"));
  }

  function finish(document: ProfileDocument) {
    cancelRead();
    setCandidate(null);
    setAcknowledged(false);
    setMemoryOperation(null);
    onComplete(document);
  }

  function replace(allowMemoryOnly = false) {
    if (operationDisabled || !acknowledged || !candidate) return;
    const recovery = serializeProjectFile(profile);
    if (!recovery.success) {
      setOperationError(
        t(recovery.code === "too_large" ? "errors.current_too_large" : "errors.current_invalid"),
      );
      return;
    }
    const result = onReplace(candidate.document, allowMemoryOnly);
    if (result.status === "saved" || result.status === "memory_only") {
      finish(candidate.document);
    } else if (result.status === "needs_memory_confirmation") {
      setMemoryOperation("open");
      focusRequest.current = "memory";
    } else {
      setOperationError(
        t(result.status === "not_ready" ? "errors.not_ready" : "errors.operation_invalid"),
      );
    }
  }

  function restore(allowMemoryOnly = false) {
    if (operationDisabled || !acknowledged || !projectBackup) return;
    const previousDocument = projectBackup.previousDocument;
    const result = onRestore(allowMemoryOnly);
    if (result.status === "saved" || result.status === "memory_only") {
      finish(previousDocument);
    } else if (result.status === "needs_memory_confirmation") {
      setMemoryOperation("restore");
      focusRequest.current = "memory";
    } else {
      setOperationError(
        t(result.status === "not_ready" ? "errors.not_ready" : "errors.operation_invalid"),
      );
    }
  }

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={`${baseId}-title`}
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-5xl overflow-y-auto rounded-xl border border-border bg-background p-0 text-foreground shadow-2xl backdrop:bg-black/60"
    >
      <div className="min-w-0">
        <CardHeader>
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <h2
                id={`${baseId}-title`}
                ref={headingRef}
                tabIndex={-1}
                className="text-xl font-semibold tracking-tight focus:outline-none"
              >
                {t("title")}
              </h2>
              <p className="text-sm leading-6 text-muted-foreground">{t("description")}</p>
            </div>
            <Button variant="ghost" size="icon" aria-label={t("close")} onClick={close}>
              <X aria-hidden="true" />
            </Button>
          </div>
          <p className="text-xs leading-5 text-muted-foreground">{t("privacy")}</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
            {announcement}
          </p>
          {(projectBackup ||
            projectBackupStatus === "invalid" ||
            projectBackupStatus === "unavailable") && (
            <details className="min-w-0 rounded-md border border-border p-3">
              <summary className={summaryClass}>{t("backup.title")}</summary>
              <div className="space-y-3 px-2 pt-2">
                <p className="text-sm leading-6 text-muted-foreground">
                  {t(
                    projectBackupStatus === "invalid"
                      ? "backup.invalid"
                      : projectBackupStatus === "unavailable"
                        ? "backup.unavailable"
                        : "backup.available",
                  )}
                </p>
                <p className="text-xs leading-5 text-muted-foreground">{t("backup.independent")}</p>
                {projectBackup && (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      onClick={() =>
                        download(projectBackup.previousDocument, "previous-profile.project.json")
                      }
                    >
                      <Download aria-hidden="true" />
                      {t("backup.download")}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => goTo("restore")}
                      disabled={operationDisabled}
                    >
                      <RotateCcw aria-hidden="true" />
                      {t("backup.restore")}
                    </Button>
                  </div>
                )}
              </div>
            </details>
          )}

          <div className="min-w-0 space-y-4">
            <h3
              ref={stepHeadingRef}
              tabIndex={-1}
              className="text-base font-semibold focus:outline-none"
            >
              {t(`steps.${step}`)}
            </h3>

            {step === "source" && (
              <>
                <p className="text-sm leading-6 text-muted-foreground">{t("openHelp")}</p>
                <input
                  id={`${baseId}-file`}
                  ref={fileRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  tabIndex={-1}
                  onChange={openFile}
                  aria-label={t("openFile")}
                  aria-invalid={inputError !== null || undefined}
                  aria-describedby={`${baseId}-file-help${inputError ? ` ${baseId}-file-error` : ""}`}
                  disabled={isLoading}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => fileRef.current?.click()}
                    aria-describedby={`${baseId}-file-help${inputError ? ` ${baseId}-file-error` : ""}`}
                    disabled={isLoading}
                  >
                    <FileUp aria-hidden="true" />
                    {t("openFile")}
                  </Button>
                  <Button variant="ghost" onClick={close}>
                    {t("cancel")}
                  </Button>
                </div>
                <p id={`${baseId}-file-help`} className="text-xs leading-5 text-muted-foreground">
                  {t("fileHelp", { limit: PROJECT_FILE_MAX_BYTES / 1024 / 1024 })}
                </p>
                {readingFile && (
                  <p role="status" className="text-sm text-muted-foreground">
                    {t("readingFile")}
                  </p>
                )}
              </>
            )}

            {inputError && (
              <p
                id={`${baseId}-file-error`}
                ref={errorRef}
                tabIndex={-1}
                role="alert"
                className="text-sm leading-6 text-destructive focus:outline-none"
              >
                {inputError}
              </p>
            )}

            {step === "review" && candidate && (
              <>
                <p className="text-sm font-medium wrap-anywhere">{candidate.filename}</p>
                <p className="text-sm leading-6 text-muted-foreground">{t("reviewHelp")}</p>
                {candidate.sourceVersion === 1 && (
                  <p className="rounded-md border border-border bg-surface-raised p-3 text-sm leading-6">
                    {t("migrated")}
                  </p>
                )}
                <ProjectSummary profile={candidate.document} />
                <p className="text-xs leading-5 text-muted-foreground">{t("reviewInert")}</p>
                <div className="flex flex-wrap gap-2">
                  <Button onClick={() => goTo("confirm")} disabled={operationDisabled}>
                    {t("continue")}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setCandidate(null);
                      goTo("source");
                    }}
                  >
                    <ArrowLeft aria-hidden="true" />
                    {t("chooseAnother")}
                  </Button>
                  <Button variant="ghost" onClick={close}>
                    {t("cancel")}
                  </Button>
                </div>
              </>
            )}

            {(step === "confirm" || step === "restore") && (
              <>
                <p className="text-sm leading-6">
                  {t(step === "restore" ? "restoreHelp" : "confirmHelp")}
                </p>
                {step === "restore" && (
                  <Button
                    variant="outline"
                    onClick={() => download(profile, "github-profile.project.json")}
                    disabled={isLoading}
                  >
                    <Download aria-hidden="true" />
                    {t("downloadCurrent")}
                  </Button>
                )}
                {step === "confirm" && (
                  <>
                    <p className="text-sm leading-6 text-muted-foreground">
                      {t("backup.beforeReplace")}
                    </p>
                    {projectBackupStatus === "available" && (
                      <p className="rounded-md border border-border bg-surface-raised p-3 text-sm leading-6">
                        {t("backup.replace")}
                      </p>
                    )}
                    {(projectBackupStatus === "invalid" ||
                      projectBackupStatus === "unavailable") && (
                      <p className="rounded-md border border-border bg-surface-raised p-3 text-sm leading-6">
                        {t(
                          projectBackupStatus === "invalid"
                            ? "backup.invalid"
                            : "backup.unavailable",
                        )}
                      </p>
                    )}
                  </>
                )}
                {step === "restore" && projectBackup && (
                  <ProjectSummary profile={projectBackup.previousDocument} />
                )}
                <div className="flex items-start gap-2">
                  <Checkbox
                    id={`${baseId}-confirm`}
                    checked={acknowledged}
                    disabled={operationDisabled}
                    onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  />
                  <label htmlFor={`${baseId}-confirm`} className="min-h-11 py-2 text-sm leading-6">
                    {t(step === "restore" ? "restoreLabel" : "confirmLabel")}
                  </label>
                </div>
                {memoryOperation ? (
                  <div className="space-y-3 rounded-md border border-border-strong bg-surface-raised p-4">
                    <h4
                      ref={memoryHeadingRef}
                      tabIndex={-1}
                      className="text-sm font-semibold focus:outline-none"
                    >
                      {t("memory.title")}
                    </h4>
                    <p className="text-sm leading-6">{t("memory.help")}</p>
                    <p className="text-xs leading-5 text-muted-foreground">
                      {t("memory.saveFirst")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        variant="outline"
                        onClick={() => download(profile, "github-profile.project.json")}
                        disabled={isLoading}
                      >
                        <Download aria-hidden="true" />
                        {t("downloadCurrent")}
                      </Button>
                      <Button
                        onClick={() =>
                          memoryOperation === "restore" ? restore(true) : replace(true)
                        }
                        disabled={operationDisabled || !acknowledged}
                      >
                        {t("memory.continue")}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => goTo(step === "restore" ? "source" : "review")}
                      >
                        {t("memory.cancel")}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => (step === "restore" ? restore() : replace())}
                      disabled={
                        operationDisabled ||
                        !acknowledged ||
                        (step === "confirm" ? !candidate : !projectBackup)
                      }
                    >
                      <Check aria-hidden="true" />
                      {t(step === "restore" ? "confirmRestore" : "confirmReplace")}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => goTo(step === "restore" ? "source" : "review")}
                    >
                      <ArrowLeft aria-hidden="true" />
                      {t(step === "restore" ? "cancelRestore" : "backToReview")}
                    </Button>
                    <Button variant="ghost" onClick={close}>
                      {t("cancel")}
                    </Button>
                  </div>
                )}
              </>
            )}
            {operationError && (
              <p role="alert" className="text-sm leading-6 text-destructive">
                {operationError}
              </p>
            )}
          </div>
        </CardContent>
      </div>
    </dialog>
  );
}
