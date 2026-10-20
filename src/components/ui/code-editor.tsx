"use client";

import { useEffect, useId, useImperativeHandle, useRef, useState } from "react";
import type { AriaAttributes, ComponentType, Ref } from "react";
import { IndentDecrease, IndentIncrease } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/cn";
import {
  applyEditorSourceChanges,
  applyTextareaSourceChange,
  editorPositionToSource,
  normalizeEditorLineBreaks,
  sourcePositionToEditor,
} from "./code-editor-source";
import type { CodeEditorSurfaceHandle, CodeEditorSurfaceProps } from "./code-editor-surface";
import {
  createCodeEditorHistory,
  moveCodeEditorHistory,
  recordCodeEditorHistory,
} from "./code-editor-history";

export type CodeEditorHandle = {
  focus: () => void;
  setSelectionRange: (start: number, end: number) => void;
  readonly selectionStart: number;
  readonly selectionEnd: number;
};

export type CodeEditorProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  language?: string;
  ref?: Ref<CodeEditorHandle>;
  "aria-label"?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: AriaAttributes["aria-invalid"];
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  placeholder?: string;
  className?: string;
};

/** Small shell: the editor and its parsers only load when a source block is opened. */
export function CodeEditor({
  id,
  value,
  onChange,
  language = "",
  ref,
  "aria-label": ariaLabel,
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
  disabled = false,
  readOnly = false,
  required = false,
  placeholder,
  className,
}: CodeEditorProps) {
  const t = useTranslations("CodeEditor");
  const generatedId = useId();
  const controlId = id ?? `${generatedId}-source`;
  const helpId = `${controlId}-keyboard-help`;
  const [mode, setMode] = useState<"code" | "plain">("code");
  const [wrap, setWrap] = useState(true);
  const [Surface, setSurface] = useState<ComponentType<CodeEditorSurfaceProps> | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const surfaceRef = useRef<CodeEditorSurfaceHandle>(null);
  const pendingSelection = useRef<{ start: number; end: number; focus: boolean } | null>(null);
  const currentValue = useRef(value);
  const loadingHistory = useRef(createCodeEditorHistory(value));
  const isEnhanced = mode === "code" && Surface !== null;

  useEffect(() => {
    currentValue.current = value;
    if (!Surface) loadingHistory.current = recordCodeEditorHistory(loadingHistory.current, value);
  }, [Surface, value]);

  useEffect(() => {
    let active = true;
    import("./code-editor-surface")
      .then((module) => {
        if (!active) return;
        const control = textareaRef.current;
        if (control && document.activeElement === control) {
          pendingSelection.current = {
            start: editorPositionToSource(currentValue.current, control.selectionStart),
            end: editorPositionToSource(currentValue.current, control.selectionEnd),
            focus: true,
          };
        }
        setSurface(() => module.CodeEditorSurface);
      })
      .catch(() => {
        if (active) setLoadFailed(true);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const selection = pendingSelection.current;
    if (!selection) return;
    const control = isEnhanced ? surfaceRef.current : textareaRef.current;
    if (!control) return;
    if (selection.focus) control.focus();
    if (isEnhanced) control.setSelectionRange(selection.start, selection.end);
    else {
      control.setSelectionRange(
        sourcePositionToEditor(value, selection.start),
        sourcePositionToEditor(value, selection.end),
      );
    }
    pendingSelection.current = null;
  }, [Surface, isEnhanced, mode, value]);

  useEffect(() => {
    if (!isEnhanced) return;
    // A contenteditable is not a labelable HTML element. Preserve Field label click behavior.
    const label = Array.from(document.getElementsByTagName("label")).find(
      (entry) => entry.htmlFor === controlId,
    );
    if (!label) return;
    const focus = () => surfaceRef.current?.focus();
    label.addEventListener("click", focus);
    return () => label.removeEventListener("click", focus);
  }, [controlId, isEnhanced]);

  useImperativeHandle(ref, () => ({
    focus() {
      (isEnhanced ? surfaceRef.current : textareaRef.current)?.focus();
    },
    setSelectionRange(start, end) {
      if (isEnhanced) surfaceRef.current?.setSelectionRange(start, end);
      else {
        textareaRef.current?.setSelectionRange(
          sourcePositionToEditor(value, start),
          sourcePositionToEditor(value, end),
        );
      }
    },
    get selectionStart() {
      return isEnhanced
        ? (surfaceRef.current?.selectionStart ?? 0)
        : editorPositionToSource(value, textareaRef.current?.selectionStart ?? 0);
    },
    get selectionEnd() {
      return isEnhanced
        ? (surfaceRef.current?.selectionEnd ?? 0)
        : editorPositionToSource(value, textareaRef.current?.selectionEnd ?? 0);
    },
  }));

  function changeMode(next: "code" | "plain") {
    if (next === mode) return;
    // A toolbar click keeps focus on that button; switching never traps the keyboard.
    const enhanced = surfaceRef.current;
    const plain = textareaRef.current;
    pendingSelection.current = {
      start: isEnhanced
        ? (enhanced?.selectionStart ?? 0)
        : editorPositionToSource(value, plain?.selectionStart ?? 0),
      end: isEnhanced
        ? (enhanced?.selectionEnd ?? 0)
        : editorPositionToSource(value, plain?.selectionEnd ?? 0),
      focus: false,
    };
    setMode(next);
  }

  function changeSource(next: string) {
    currentValue.current = next;
    if (!Surface) loadingHistory.current = recordCodeEditorHistory(loadingHistory.current, next);
    onChange(next);
  }

  function moveSourceHistory(redo: boolean) {
    if (disabled || readOnly) return;
    const editor = surfaceRef.current;
    if (editor) {
      if (!(redo ? editor.redo() : editor.undo())) return;
      pendingSelection.current = {
        start: editor.selectionStart,
        end: editor.selectionEnd,
        focus: true,
      };
      return;
    }
    const previous = loadingHistory.current;
    const next = moveCodeEditorHistory(previous, redo ? 1 : -1);
    if (previous === next) return;
    loadingHistory.current = next;
    const source = next.entries[next.position] ?? "";
    pendingSelection.current = { start: source.length, end: source.length, focus: true };
    currentValue.current = source;
    onChange(source);
  }

  return (
    <div className={cn("max-w-full min-w-0 space-y-2", className)} data-slot="code-editor">
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          aria-pressed={mode === "code"}
          onClick={() => changeMode("code")}
          disabled={disabled}
        >
          {t("codeMode")}
        </Button>
        <Button
          variant="outline"
          size="sm"
          aria-pressed={mode === "plain"}
          onClick={() => changeMode("plain")}
          disabled={disabled}
        >
          {t("plainMode")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          aria-pressed={wrap}
          onClick={() => setWrap(!wrap)}
          disabled={disabled}
        >
          {t("wrap")}
        </Button>
        {isEnhanced && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("indent")}
              title={t("indent")}
              onClick={() => surfaceRef.current?.indent(false)}
              disabled={disabled || readOnly}
            >
              <IndentIncrease aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t("outdent")}
              title={t("outdent")}
              onClick={() => surfaceRef.current?.indent(true)}
              disabled={disabled || readOnly}
            >
              <IndentDecrease aria-hidden="true" />
            </Button>
          </>
        )}
      </div>
      {Surface && (
        <div hidden={!isEnhanced}>
          <Surface
            ref={surfaceRef}
            id={isEnhanced ? controlId : undefined}
            value={value}
            onChange={changeSource}
            language={language}
            wrap={wrap}
            active={isEnhanced}
            scrollLabel={t("scrollRegion")}
            getInitialHistory={() => loadingHistory.current}
            aria-label={
              isEnhanced
                ? (ariaLabel ?? t(language === "html" ? "htmlLabel" : "codeLabel"))
                : undefined
            }
            aria-describedby={
              isEnhanced ? [describedBy, helpId].filter(Boolean).join(" ") : undefined
            }
            aria-invalid={isEnhanced ? invalid : undefined}
            disabled={disabled}
            readOnly={readOnly}
            required={required}
            placeholder={placeholder}
          />
        </div>
      )}
      {!isEnhanced && (
        <Textarea
          ref={textareaRef}
          id={controlId}
          value={normalizeEditorLineBreaks(value)}
          onChange={(event) =>
            changeSource(applyTextareaSourceChange(value, event.currentTarget.value))
          }
          onPaste={(event) => {
            const pasted = event.clipboardData.getData("text/plain");
            if (!pasted || disabled || readOnly) return;
            event.preventDefault();
            const control = event.currentTarget;
            const from = control.selectionStart;
            const to = control.selectionEnd;
            const next = applyEditorSourceChanges(value, [{ from, to, insert: pasted }]);
            const caret = editorPositionToSource(value, from) + pasted.length;
            if (next === value) {
              const position = sourcePositionToEditor(value, caret);
              control.setSelectionRange(position, position);
              return;
            }
            pendingSelection.current = {
              start: caret,
              end: caret,
              focus: true,
            };
            changeSource(next);
          }}
          onKeyDown={(event) => {
            if ((!event.ctrlKey && !event.metaKey) || event.altKey) return;
            const key = event.key.toLowerCase();
            if (key !== "z" && key !== "y") return;
            event.preventDefault();
            moveSourceHistory(key === "y" || event.shiftKey);
          }}
          aria-label={ariaLabel ?? t(language === "html" ? "htmlLabel" : "codeLabel")}
          aria-describedby={[describedBy, helpId].filter(Boolean).join(" ")}
          aria-invalid={invalid}
          disabled={disabled}
          readOnly={readOnly}
          required={required}
          placeholder={placeholder}
          rows={10}
          wrap={wrap ? "soft" : "off"}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          className="max-h-96 min-h-52 overflow-auto font-mono text-base leading-6 sm:text-sm"
        />
      )}
      <p id={helpId} className="text-xs leading-5 text-muted-foreground">
        {mode === "plain" ? t("plainHelp") : t("keyboardHelp")}
      </p>
      {mode === "code" && !Surface && (
        <p role="status" className="text-xs leading-5 text-muted-foreground">
          {t(loadFailed ? "loadError" : "loading")}
        </p>
      )}
    </div>
  );
}
