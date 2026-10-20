import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CodeEditor, type CodeEditorHandle } from "@/components/ui/code-editor";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  codeLanguages,
  CODE_MAX_DOCUMENT_LENGTH,
  CODE_MAX_SOURCE_LENGTH,
  normalizeCodeLanguage,
} from "@/core/code";
import type { CustomBlock } from "@/core/profile/custom-content";

type CodeBlock = Extract<CustomBlock, { type: "code" }>;

type CodeBlockFieldsProps = {
  controlId: string;
  value: CodeBlock;
  inputRef: (control: CodeEditorHandle | null) => void;
  hasSourceError: boolean;
  onChange: (value: CodeBlock) => void;
  onUseExample: (source: string) => void;
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
  const tooLong = value.source.length > CODE_MAX_SOURCE_LENGTH;
  const exampleSource: string = t.raw("code.exampleSource");
  return (
    <div className="min-w-0 space-y-4">
      <Field
        htmlFor={`${controlId}-language`}
        label={t("code.language")}
        description={
          language && !hasLocalHighlighting
            ? t("code.plainLanguageHelp", { language: value.language.trim() })
            : t("code.languageHelp")
        }
        error={language === null ? t("code.invalidLanguage") : undefined}
      >
        <Input
          value={value.language}
          list={`${controlId}-languages`}
          placeholder={t("code.languagePlaceholder")}
          spellCheck={false}
          autoCorrect="off"
          autoCapitalize="off"
          autoComplete="off"
          onChange={(event) => onChange({ ...value, language: event.target.value })}
        />
      </Field>
      <datalist id={`${controlId}-languages`}>
        {codeLanguages.map((entry) => (
          <option key={entry.id} value={entry.id} label={entry.label} />
        ))}
      </datalist>
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
            onClick={() => onUseExample(exampleSource)}
          >
            {t("code.useExample")}
          </Button>
        </div>
      </details>
    </div>
  );
}
