import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CodeEditor, type CodeEditorHandle } from "@/components/ui/code-editor";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  codeLanguages,
  CODE_MAX_DOCUMENT_LENGTH,
  CODE_MAX_LANGUAGE_LENGTH,
  CODE_MAX_SOURCE_LENGTH,
  normalizeCodeLanguage,
} from "@/core/code";
import type { CustomBlock } from "@/core/profile/custom-content";

type CodeBlock = Extract<CustomBlock, { type: "code" }>;
const CUSTOM_LANGUAGE = "__custom_language__";
const languageSelectClassName =
  "min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 text-base text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none sm:text-sm";

type CodeBlockFieldsProps = {
  controlId: string;
  value: CodeBlock;
  inputRef: (control: CodeEditorHandle | null) => void;
  hasSourceError: boolean;
  onChange: (value: CodeBlock) => void;
  onUseExample: (source: string) => boolean;
};

export function CodeBlockFields({
  controlId,
  value,
  inputRef,
  hasSourceError,
  onChange,
  onUseExample,
}: CodeBlockFieldsProps) {
  const t = useTranslations("EditorModules.custom");
  const language = normalizeCodeLanguage(value.language);
  const hasLocalHighlighting = codeLanguages.some((entry) => entry.id === language);
  const [customLanguageFor, setCustomLanguageFor] = useState<string | null>(null);
  const hasCustomLanguage =
    language === null ||
    (language !== "" && !hasLocalHighlighting) ||
    customLanguageFor === value.language;
  const tooLong = value.source.length > CODE_MAX_SOURCE_LENGTH;
  const exampleSource: string = t.raw("code.exampleSource");
  return (
    <div className="min-w-0 space-y-4">
      <Field
        htmlFor={`${controlId}-language`}
        label={t("code.language")}
        description={t("code.languageHelp")}
      >
        <select
          value={hasCustomLanguage ? CUSTOM_LANGUAGE : (language ?? "")}
          onChange={(event) => {
            const selected = event.target.value;
            if (selected === CUSTOM_LANGUAGE) {
              const nextLanguage = language === "" || hasLocalHighlighting ? "" : value.language;
              setCustomLanguageFor(nextLanguage);
              if (language === "" || hasLocalHighlighting) {
                onChange({ ...value, language: nextLanguage });
              }
              return;
            }
            setCustomLanguageFor(null);
            onChange({ ...value, language: selected });
          }}
          className={languageSelectClassName}
        >
          <option value="">{t("code.plainText")}</option>
          {codeLanguages.map((entry) => (
            <option key={entry.id} value={entry.id}>
              {entry.label}
            </option>
          ))}
          <option value={CUSTOM_LANGUAGE}>{t("code.customLanguage")}</option>
        </select>
      </Field>
      {hasCustomLanguage && (
        <Field
          htmlFor={`${controlId}-custom-language`}
          label={t("code.customLanguageInput")}
          description={
            language && !hasLocalHighlighting
              ? t("code.plainLanguageHelp", { language: value.language.trim() })
              : t("code.customLanguageHelp", { limit: CODE_MAX_LANGUAGE_LENGTH })
          }
          error={language === null ? t("code.invalidLanguage") : undefined}
        >
          <Input
            value={value.language}
            placeholder={t("code.languagePlaceholder")}
            spellCheck={false}
            autoCorrect="off"
            autoCapitalize="off"
            autoComplete="off"
            onChange={(event) => {
              setCustomLanguageFor(event.target.value);
              onChange({ ...value, language: event.target.value });
            }}
          />
        </Field>
      )}
      <Field
        htmlFor={`${controlId}-source`}
        label={t("code.source")}
        description={t("code.help")}
        error={
          tooLong
            ? t("code.tooLong", { limit: CODE_MAX_SOURCE_LENGTH })
            : hasSourceError
              ? t("code.documentLimit", { limit: CODE_MAX_DOCUMENT_LENGTH })
              : undefined
        }
      >
        <CodeEditor
          ref={inputRef}
          aria-label={t("code.source")}
          value={value.source}
          language={language ?? ""}
          aria-describedby={`${controlId}-code-count`}
          onChange={(source) => onChange({ ...value, source })}
        />
      </Field>
      <p id={`${controlId}-code-count`} className="text-xs leading-5 text-muted-foreground">
        {t("code.characterCount", { count: value.source.length, limit: CODE_MAX_SOURCE_LENGTH })}
      </p>
      <details className="min-w-0 rounded-md border border-border p-3">
        <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
          {t("code.exampleTitle")}
        </summary>
        <div className="mt-3 min-w-0 space-y-3">
          <p className="text-xs leading-5 text-muted-foreground">{t("code.exampleHelp")}</p>
          <pre
            tabIndex={0}
            role="group"
            aria-label={t("code.exampleTitle")}
            className="max-h-52 min-w-0 overflow-auto rounded-md border border-border bg-surface-raised p-3 font-mono text-xs leading-5 whitespace-pre focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
          >
            <code>{exampleSource}</code>
          </pre>
          <Button
            variant="outline"
            size="sm"
            className="max-w-full whitespace-normal"
            onClick={() => {
              if (onUseExample(exampleSource)) setCustomLanguageFor(null);
            }}
          >
            {t("code.useExample")}
          </Button>
        </div>
      </details>
    </div>
  );
}
