"use client";

import { useEffect, useId, useRef, useState, type ChangeEvent, type ReactNode } from "react";
import { ArrowLeft, Check, ChevronDown, Download, FileUp, RotateCcw, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  analyzeReadmeImport,
  buildImportedProfile,
  README_IMPORT_MAX_LENGTH,
  type ReadmeImportAnalysis,
  type ReadmeImportNotice,
  type ReadmeImportProblem,
} from "@/core/import";
import type { ContentLocale, ProfileDocument } from "@/core/profile/profile-schema";
import type { ImportBackup } from "./import-backup";
import type { ImportBackupStatus, ImportOperationResult } from "./use-profile-draft";

type ImportStep = "source" | "review" | "confirm" | "restore";
type ImportSession = {
  source: string;
  analysis: ReadmeImportAnalysis | null;
  selectedIds: readonly string[];
  step: "source" | "review";
};

// Client effects only: preserves an unfinished import across locale navigation in this tab.
// A full reload clears it. Confirmation and file reads are deliberately not resumed.
let inMemoryImportSession: ImportSession | null = null;

function clearImportSession() {
  inMemoryImportSession = null;
}

export type ReadmeImportPanelProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentLocale: ContentLocale;
  disabled?: boolean;
  backup: ImportBackup | null;
  backupStatus: ImportBackupStatus;
  onReplace: (
    candidate: ProfileDocument,
    source: string,
    allowMemoryOnly?: boolean,
  ) => ImportOperationResult;
  onRestore: (allowMemoryOnly?: boolean) => ImportOperationResult;
  onImported: (document: ProfileDocument) => void;
};

const MAX_FILE_BYTES = README_IMPORT_MAX_LENGTH * 4;
const detailsSummaryClass =
  "flex min-h-11 cursor-pointer items-center rounded-md px-2 py-2 text-sm font-medium text-accent-soft-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none";

function SourceDetails({ label, source }: { label: string; source: string }) {
  return (
    <details className="group min-w-0 rounded-md border border-border bg-surface">
      <summary className={`${detailsSummaryClass} justify-between gap-2`}>
        {label}
        <ChevronDown aria-hidden="true" className="size-4 shrink-0 group-open:rotate-180" />
      </summary>
      <pre
        className="max-h-80 min-w-0 overflow-auto border-t border-border p-3 text-xs leading-6 whitespace-pre-wrap focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
        tabIndex={0}
        role="region"
        aria-label={label}
      >
        <code className="[overflow-wrap:anywhere]">{source}</code>
      </pre>
    </details>
  );
}

function downloadText(source: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([source], { type }));
  try {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    link.remove();
  } finally {
    window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
}

export function ReadmeImportPanel({
  open,
  onOpenChange,
  currentLocale,
  disabled = false,
  backup,
  backupStatus,
  onReplace,
  onRestore,
  onImported,
}: ReadmeImportPanelProps) {
  const t = useTranslations("ReadmeImport");
  const baseId = useId();
  const [source, setSource] = useState(() => inMemoryImportSession?.source ?? "");
  const [analysis, setAnalysis] = useState<ReadmeImportAnalysis | null>(
    () => inMemoryImportSession?.analysis ?? null,
  );
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(
    () => inMemoryImportSession?.selectedIds ?? [],
  );
  const [step, setStep] = useState<ImportStep>(() => inMemoryImportSession?.step ?? "source");
  const [inputError, setInputError] = useState<string | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [readingFile, setReadingFile] = useState(false);
  const [acknowledged, setAcknowledged] = useState(false);
  const [memoryOperation, setMemoryOperation] = useState<"import" | "restore" | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const memoryHeadingRef = useRef<HTMLHeadingElement>(null);
  const sourceRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const fileReaderRef = useRef<FileReader | null>(null);
  const readGeneration = useRef(0);
  const focusRequest = useRef<"step" | "source" | "memory" | null>(null);

  const analysisCurrent =
    analysis !== null && analysis.source === source && analysis.contentLocale === currentLocale;
  const proposal = analysisCurrent ? buildImportedProfile(analysis, selectedIds) : null;
  const excludedCount = analysis ? analysis.sections.length - selectedIds.length : 0;

  useEffect(() => {
    inMemoryImportSession = {
      source,
      analysis,
      selectedIds,
      step: step === "review" || step === "confirm" ? "review" : "source",
    };
  }, [source, analysis, selectedIds, step]);

  useEffect(() => {
    if (open) headingRef.current?.focus();
    else {
      readGeneration.current += 1;
      fileReaderRef.current?.abort();
    }
  }, [open]);

  useEffect(() => {
    if (!open || focusRequest.current === null) return;
    const target =
      focusRequest.current === "source"
        ? sourceRef.current
        : focusRequest.current === "memory"
          ? memoryHeadingRef.current
          : stepHeadingRef.current;
    target?.focus();
    focusRequest.current = null;
  });

  useEffect(
    () => () => {
      readGeneration.current += 1;
      const reader = fileReaderRef.current;
      if (!reader) return;
      reader.onload = null;
      reader.onerror = null;
      reader.onabort = null;
      reader.onloadend = null;
      reader.abort();
    },
    [],
  );

  function cancelFileRead() {
    readGeneration.current += 1;
    fileReaderRef.current?.abort();
    fileReaderRef.current = null;
    setReadingFile(false);
  }

  function close() {
    cancelFileRead();
    setMemoryOperation(null);
    setAcknowledged(false);
    setOperationError(null);
    onOpenChange(false);
  }

  function changeSource(next: string) {
    cancelFileRead();
    setSource(next);
    setAnalysis(null);
    setSelectedIds([]);
    setAcknowledged(false);
    setMemoryOperation(null);
    setInputError(null);
    setOperationError(null);
    setAnnouncement("");
  }

  function openFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    cancelFileRead();
    setInputError(null);
    setOperationError(null);
    setAnnouncement("");
    if (!file.name.toLowerCase().endsWith(".md")) {
      setInputError(t("fileTypeError"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setInputError(t("fileSizeError", { limit: MAX_FILE_BYTES / 1_000 }));
      return;
    }
    setReadingFile(true);
    const generation = readGeneration.current;
    const reader = new FileReader();
    fileReaderRef.current = reader;
    reader.onload = () => {
      if (generation !== readGeneration.current) return;
      try {
        if (!(reader.result instanceof ArrayBuffer)) throw new Error("invalid_file_result");
        const next = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
          reader.result,
        );
        if (next.length > README_IMPORT_MAX_LENGTH) {
          setInputError(t("problems.source_too_large"));
          return;
        }
        setSource(next);
        setAnalysis(null);
        setSelectedIds([]);
        setAcknowledged(false);
        setMemoryOperation(null);
        setAnnouncement(t("fileLoaded", { name: file.name }));
      } catch {
        setInputError(t("fileEncodingError"));
      }
    };
    reader.onerror = () => {
      if (generation === readGeneration.current) setInputError(t("fileReadError"));
    };
    reader.onabort = () => {
      if (generation === readGeneration.current) setReadingFile(false);
    };
    reader.onloadend = () => {
      if (generation !== readGeneration.current) return;
      fileReaderRef.current = null;
      setReadingFile(false);
    };
    try {
      reader.readAsArrayBuffer(file);
    } catch {
      fileReaderRef.current = null;
      setReadingFile(false);
      setInputError(t("fileReadError"));
    }
  }

  function analyze() {
    cancelFileRead();
    setInputError(null);
    setOperationError(null);
    setAcknowledged(false);
    setMemoryOperation(null);
    const next = analyzeReadmeImport(source, currentLocale);
    setAnalysis(next);
    setSelectedIds(next.sections.map((section) => section.id));
    if (next.errors.length > 0) {
      focusRequest.current = "source";
      setAnnouncement(next.errors.map((error) => t(`problems.${error.code}`)).join(" "));
      return;
    }
    setStep("review");
    focusRequest.current = "step";
    setAnnouncement(t("reviewReady"));
  }

  function goTo(next: ImportStep) {
    setStep(next);
    setAcknowledged(false);
    setMemoryOperation(null);
    setOperationError(null);
    focusRequest.current = next === "source" ? "source" : "step";
  }

  function finish(document: ProfileDocument) {
    // The parent closes and unmounts this panel in the same batch, before effects can run.
    clearImportSession();
    cancelFileRead();
    setSource("");
    setAnalysis(null);
    setSelectedIds([]);
    setStep("source");
    setAcknowledged(false);
    setMemoryOperation(null);
    setInputError(null);
    setOperationError(null);
    setAnnouncement("");
    onImported(document);
  }

  function apply(allowMemoryOnly = false) {
    if (disabled || !acknowledged || !analysisCurrent || !proposal?.success) return;
    const result = onReplace(proposal.document, source, allowMemoryOnly);
    if (result.status === "saved" || result.status === "memory_only") {
      finish(proposal.document);
    } else if (result.status === "needs_memory_confirmation") {
      setMemoryOperation("import");
      focusRequest.current = "memory";
    } else {
      setOperationError(
        t(result.status === "not_ready" ? "operationNotReady" : "operationInvalid"),
      );
    }
  }

  function restore(allowMemoryOnly = false) {
    if (disabled || !acknowledged || !backup) return;
    const previous = backup.previousDocument;
    const result = onRestore(allowMemoryOnly);
    if (result.status === "saved" || result.status === "memory_only") {
      finish(previous);
    } else if (result.status === "needs_memory_confirmation") {
      setMemoryOperation("restore");
      focusRequest.current = "memory";
    } else {
      setOperationError(
        t(result.status === "not_ready" ? "operationNotReady" : "operationInvalid"),
      );
    }
  }

  function downloadBackup(kind: "profile" | "original") {
    if (!backup) return;
    try {
      if (kind === "profile") {
        downloadText(
          `${JSON.stringify(backup.previousDocument, null, 2)}\n`,
          "previous-profile.json",
          "application/json;charset=utf-8",
        );
      } else {
        downloadText(backup.originalSource, "imported-original.md", "text/markdown;charset=utf-8");
      }
      setAnnouncement(t("downloaded"));
    } catch {
      setAnnouncement(t("downloadError"));
    }
  }

  function diagnostics(entries: readonly ReadmeImportProblem[], kind: "problems"): ReactNode;
  function diagnostics(entries: readonly ReadmeImportNotice[], kind: "notices"): ReactNode;
  function diagnostics(
    entries: readonly (ReadmeImportProblem | ReadmeImportNotice)[],
    kind: "problems" | "notices",
  ) {
    if (entries.length === 0) return null;
    return (
      <ul
        className={`list-disc space-y-1 pl-5 text-sm leading-6 ${kind === "problems" ? "text-destructive" : "text-muted-foreground"}`}
      >
        {entries.map((entry, index) => (
          <li key={`${entry.code}-${index}`}>
            {kind === "problems"
              ? t(`problems.${(entry as ReadmeImportProblem).code}`)
              : t(`notices.${(entry as ReadmeImportNotice).code}`)}
            {entry.start !== undefined && entry.end !== undefined && (
              <span className="block text-xs text-muted-foreground">
                {t("sourceRange", { start: entry.start + 1, end: entry.end })}
              </span>
            )}
          </li>
        ))}
      </ul>
    );
  }

  if (!open) return null;

  return (
    <Card role="region" aria-labelledby={`${baseId}-title`} className="mt-4 scroll-mt-4">
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

        {(backup || backupStatus === "invalid" || backupStatus === "unavailable") && (
          <details className="min-w-0 rounded-md border border-border bg-surface-raised p-3">
            <summary className={detailsSummaryClass}>{t("backupTitle")}</summary>
            <div className="space-y-3 px-2 pt-2">
              <p className="text-sm leading-6 text-muted-foreground">
                {t(
                  backupStatus === "invalid"
                    ? "backupInvalid"
                    : backupStatus === "unavailable"
                      ? "backupUnavailable"
                      : "backupAvailable",
                )}
              </p>
              {backup && (
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => downloadBackup("profile")}>
                    <Download aria-hidden="true" />
                    {t("downloadProfile")}
                  </Button>
                  <Button variant="outline" onClick={() => downloadBackup("original")}>
                    <Download aria-hidden="true" />
                    {t("downloadOriginal")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => goTo("restore")}
                    disabled={disabled || backupStatus === "loading"}
                  >
                    <RotateCcw aria-hidden="true" />
                    {t("restore")}
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
            {t(
              step === "source"
                ? "sourceTitle"
                : step === "review"
                  ? "reviewTitle"
                  : step === "confirm"
                    ? "confirmTitle"
                    : "restoreTitle",
            )}
          </h3>

          {step === "source" && (
            <>
              <div className="space-y-2">
                <input
                  id={`${baseId}-file`}
                  ref={fileRef}
                  type="file"
                  accept=".md,text/markdown"
                  className="hidden"
                  tabIndex={-1}
                  onChange={openFile}
                  aria-label={t("openFile")}
                  disabled={disabled}
                />
                <Button
                  variant="outline"
                  onClick={() => fileRef.current?.click()}
                  aria-describedby={`${baseId}-file-help`}
                  disabled={disabled}
                >
                  <FileUp aria-hidden="true" />
                  {t("openFile")}
                </Button>
                <p id={`${baseId}-file-help`} className="text-xs leading-5 text-muted-foreground">
                  {t("fileHelp", { limit: MAX_FILE_BYTES / 1_000 })}
                </p>
              </div>
              <Field
                htmlFor={`${baseId}-source`}
                label={t("sourceLabel")}
                description={t("sourceHelp")}
                error={inputError ?? undefined}
              >
                <Textarea
                  ref={sourceRef}
                  rows={10}
                  value={source}
                  spellCheck={false}
                  onChange={(event) => changeSource(event.target.value)}
                  className="font-mono"
                  disabled={disabled}
                  aria-describedby={`${baseId}-limit`}
                />
              </Field>
              <p id={`${baseId}-limit`} className="text-xs leading-5 text-muted-foreground">
                {t("sourceLimit", { limit: README_IMPORT_MAX_LENGTH })}
              </p>
              {readingFile && (
                <p role="status" className="text-sm text-muted-foreground">
                  {t("readingFile")}
                </p>
              )}
              {analysisCurrent && diagnostics(analysis.errors, "problems")}
              <div className="flex flex-wrap gap-2">
                <Button onClick={analyze} disabled={disabled || readingFile}>
                  {t("analyze")}
                </Button>
                <Button variant="ghost" onClick={close}>
                  {t("cancel")}
                </Button>
              </div>
            </>
          )}

          {step === "review" && analysis && (
            <>
              <p className="text-sm leading-6 text-muted-foreground">{t("reviewHelp")}</p>
              {!analysisCurrent && (
                <p role="alert" className="text-sm text-destructive">
                  {t("stale")}
                </p>
              )}
              <p className="text-sm font-medium" aria-live="polite" aria-atomic="true">
                {t("reviewCount", { count: selectedIds.length, total: analysis.sections.length })}
              </p>
              {diagnostics(analysis.notices, "notices")}
              <ol className="space-y-3">
                {analysis.sections.map((section, index) => {
                  const checked = selectedIds.includes(section.id);
                  const id = `${baseId}-section-${index}`;
                  return (
                    <li
                      key={section.id}
                      className="min-w-0 rounded-md border border-border p-3 sm:p-4"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <Checkbox
                          id={id}
                          checked={checked}
                          disabled={disabled || !analysisCurrent}
                          aria-label={t("includeSection", { name: section.label })}
                          onCheckedChange={(next) => {
                            setSelectedIds((current) =>
                              next === true
                                ? [...current, section.id]
                                : current.filter((entry) => entry !== section.id),
                            );
                            setAcknowledged(false);
                          }}
                        />
                        <div className="min-w-0 flex-1 space-y-1 pt-2">
                          <h4 className="text-sm font-semibold">
                            <label htmlFor={id}>{section.label}</label>
                          </h4>
                          <p className="text-xs leading-5 text-muted-foreground">
                            {t("sectionNumber", { number: index + 1 })} ·{" "}
                            {t(section.representation)}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-3">
                        {diagnostics(section.notices, "notices")}
                        {diagnostics(section.errors, "problems")}
                        <SourceDetails label={t("sourceDetails")} source={section.source} />
                      </div>
                    </li>
                  );
                })}
              </ol>
              {excludedCount > 0 && (
                <p className="rounded-md border border-border bg-surface-raised p-3 text-sm leading-6">
                  {t("excluded", { count: excludedCount })}
                </p>
              )}
              {proposal && !proposal.success && (
                <div className="space-y-2">
                  {diagnostics(proposal.errors, "problems")}
                  <p className="text-sm leading-6 text-muted-foreground">{t("blockedHelp")}</p>
                </div>
              )}
              {proposal?.success && (
                <SourceDetails label={t("resultDetails")} source={proposal.readme.markdown} />
              )}
              <SourceDetails label={t("originalDetails")} source={source} />
              <p className="text-xs leading-5 text-muted-foreground">{t("noRemotePreview")}</p>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => goTo("confirm")}
                  disabled={disabled || !analysisCurrent || !proposal?.success}
                >
                  {t("continue")}
                </Button>
                <Button variant="outline" onClick={() => goTo("source")}>
                  <ArrowLeft aria-hidden="true" />
                  {t("editSource")}
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
              {step === "confirm" && (
                <>
                  <p className="text-sm leading-6 text-muted-foreground">{t("backupHelp")}</p>
                  {(backup || backupStatus === "invalid" || backupStatus === "unavailable") && (
                    <p className="rounded-md border border-border bg-surface-raised p-3 text-sm leading-6">
                      {t(
                        backupStatus === "invalid"
                          ? "backupInvalid"
                          : backupStatus === "unavailable"
                            ? "backupUnavailable"
                            : "backupReplace",
                      )}
                    </p>
                  )}
                  {excludedCount > 0 && (
                    <p className="text-sm leading-6">{t("excluded", { count: excludedCount })}</p>
                  )}
                  {!analysisCurrent && (
                    <p role="alert" className="text-sm text-destructive">
                      {t("stale")}
                    </p>
                  )}
                </>
              )}
              <div className="flex items-start gap-2">
                <Checkbox
                  id={`${baseId}-confirm`}
                  checked={acknowledged}
                  onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  disabled={disabled}
                />
                <label htmlFor={`${baseId}-confirm`} className="min-h-11 py-2 text-sm leading-6">
                  {t(step === "restore" ? "restoreLabel" : "confirmLabel")}
                </label>
              </div>
              {operationError && (
                <p role="alert" className="text-sm text-destructive">
                  {operationError}
                </p>
              )}
              {memoryOperation ? (
                <div className="space-y-3 rounded-md border border-border-strong bg-surface-raised p-4">
                  <h4
                    ref={memoryHeadingRef}
                    tabIndex={-1}
                    className="text-sm font-semibold focus:outline-none"
                  >
                    {t("memoryTitle")}
                  </h4>
                  <p className="text-sm leading-6">{t("memoryHelp")}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      onClick={() => (memoryOperation === "restore" ? restore(true) : apply(true))}
                      disabled={disabled || !acknowledged}
                    >
                      {t("continueMemory")}
                    </Button>
                    <Button variant="outline" onClick={() => goTo("source")}>
                      {t("memoryCancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => (step === "restore" ? restore() : apply())}
                    disabled={
                      disabled ||
                      !acknowledged ||
                      (step === "confirm" && (!analysisCurrent || !proposal?.success)) ||
                      (step === "restore" && !backup)
                    }
                  >
                    <Check aria-hidden="true" />
                    {t(step === "restore" ? "confirmRestore" : "confirm")}
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
        </div>
      </CardContent>
    </Card>
  );
}
