"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CODE_MAX_SOURCE_LENGTH } from "@/core/code";

type CodeToken = { from: number; to: number; className: string };
type HighlightedSource = { source: string; language: string; tokens: readonly CodeToken[] };

/** Source is always text. Optional parser results only choose decorative span classes. */
export function CodePreview({ source, language }: { source: string; language: string }) {
  const t = useTranslations("Editor.preview");
  const [highlighted, setHighlighted] = useState<HighlightedSource | null>(null);
  const [feedback, setFeedback] = useState<{ source: string; status: "copied" | "error" } | null>(
    null,
  );

  useEffect(() => {
    if (!language || source.length > CODE_MAX_SOURCE_LENGTH) return;
    let active = true;
    Promise.all([import("@/components/ui/code-editor-language"), import("@lezer/highlight")])
      .then(async ([languages, highlighting]) => {
        const support = await languages.loadCodeLanguage(language);
        if (!active || !support) return;
        const tokens: CodeToken[] = [];
        highlighting.highlightTree(
          support.language.parser.parse(source),
          highlighting.classHighlighter,
          (from, to, className) => tokens.push({ from, to, className }),
        );
        if (active) setHighlighted({ source, language, tokens });
      })
      .catch(() => {
        // A missing parser keeps the already rendered literal source usable.
      });
    return () => {
      active = false;
    };
  }, [source, language]);

  const tokens =
    highlighted?.source === source && highlighted.language === language ? highlighted.tokens : [];
  const content: ReactNode[] = [];
  let cursor = 0;
  for (const token of tokens) {
    if (token.from < cursor || token.to > source.length || token.to <= token.from) continue;
    if (token.from > cursor) content.push(source.slice(cursor, token.from));
    content.push(
      <span key={token.from} className={token.className}>
        {source.slice(token.from, token.to)}
      </span>,
    );
    cursor = token.to;
  }
  content.push(source.slice(cursor));
  const currentFeedback = feedback?.source === source ? feedback.status : null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(source);
      setFeedback({ source, status: "copied" });
    } catch {
      setFeedback({ source, status: "error" });
    }
  }

  return (
    <div className="my-5 max-w-full min-w-0 rounded-md border border-border bg-surface-raised">
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-1">
        <span className="min-w-0 font-mono text-xs text-muted-foreground">
          {language || t("codePlain")}
        </span>
        <Button variant="ghost" size="sm" onClick={copy} aria-label={t("copyCode")}>
          {currentFeedback === "copied" ? (
            <Check aria-hidden="true" />
          ) : (
            <Copy aria-hidden="true" />
          )}
          {t(currentFeedback === "copied" ? "codeCopied" : "copyCode")}
        </Button>
      </div>
      <pre
        tabIndex={0}
        role="group"
        aria-label={t("codeRegion", { language: language || t("codePlain") })}
        className="profile-code max-h-[32rem] max-w-full min-w-0 overflow-auto rounded-b-md p-4 font-mono text-xs leading-6 whitespace-pre focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
      >
        <code>{content}</code>
      </pre>
      <p
        role="status"
        aria-live="polite"
        className={currentFeedback === "error" ? "px-4 pb-3 text-xs text-destructive" : "sr-only"}
      >
        {currentFeedback ? t(currentFeedback === "copied" ? "codeCopied" : "codeCopyError") : ""}
      </p>
    </div>
  );
}
