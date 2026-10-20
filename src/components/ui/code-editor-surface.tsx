"use client";

import { useEffect, useImperativeHandle, useRef } from "react";
import type { Ref } from "react";
import { Compartment, EditorSelection, EditorState, Transaction } from "@codemirror/state";
import {
  EditorView,
  drawSelection,
  keymap,
  lineNumbers,
  placeholder as editorPlaceholder,
} from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentLess,
  indentMore,
  redo,
  undo,
} from "@codemirror/commands";
import {
  HighlightStyle,
  bracketMatching,
  indentOnInput,
  indentUnit,
  syntaxHighlighting,
} from "@codemirror/language";
import { tags } from "@lezer/highlight";
import type { CodeEditorHandle, CodeEditorProps } from "./code-editor";
import type { CodeEditorSourceHistory } from "./code-editor-history";
import { recordCodeEditorHistory } from "./code-editor-history";
import { loadCodeLanguage } from "./code-editor-language";
import {
  editorPositionToSource,
  normalizeEditorLineBreaks,
  sourcePositionToEditor,
} from "./code-editor-source";
import {
  editorSourceField,
  editorSourceTracking,
  exactSourceChanges,
  rawSourceEffect,
  restoreEditorSourceHistory,
} from "./code-editor-state";

export type CodeEditorSurfaceHandle = CodeEditorHandle & {
  indent: (less: boolean) => void;
  undo: () => boolean;
  redo: () => boolean;
};
export type CodeEditorSurfaceProps = Omit<CodeEditorProps, "ref" | "className"> & {
  ref?: Ref<CodeEditorSurfaceHandle>;
  wrap: boolean;
  active: boolean;
  scrollLabel: string;
  getInitialHistory: () => CodeEditorSourceHistory;
};

const editorTheme = EditorView.theme({
  "&": {
    color: "var(--foreground)",
    backgroundColor: "var(--surface)",
    border: "1px solid var(--border-strong)",
    borderRadius: "var(--ds-radius-md)",
    fontSize: "16px",
    maxWidth: "100%",
    minWidth: "0",
  },
  "&.cm-focused": { outline: "2px solid var(--ring)", outlineOffset: "2px" },
  ".cm-scroller": {
    fontFamily: "var(--font-geist-mono), monospace",
    lineHeight: "1.7",
    minHeight: "13rem",
    maxHeight: "24rem",
    overflow: "auto",
    overscrollBehavior: "contain",
  },
  ".cm-content": { padding: "0.625rem 0", caretColor: "var(--foreground)", minWidth: "0" },
  ".cm-line": { padding: "0 0.75rem" },
  ".cm-gutters": {
    backgroundColor: "var(--surface-raised)",
    color: "var(--muted-foreground)",
    borderRight: "1px solid var(--border)",
    paddingLeft: "0.25rem",
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "var(--accent-soft)",
  },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--foreground)" },
  ".cm-placeholder": { color: "var(--muted-foreground)" },
  ".cm-matchingBracket": {
    backgroundColor: "var(--accent-soft)",
    color: "var(--accent-soft-foreground)",
    outline: "1px solid var(--border-strong)",
  },
  "&[data-invalid=true]": { borderColor: "var(--destructive)" },
  "&[data-disabled=true]": { opacity: "0.6", backgroundColor: "var(--surface-raised)" },
  "@media (min-width: 640px)": { "&": { fontSize: "14px" } },
});

const sourceHighlighting = syntaxHighlighting(
  HighlightStyle.define([
    {
      tag: [
        tags.keyword,
        tags.tagName,
        tags.modifier,
        tags.definitionKeyword,
        tags.typeName,
        tags.className,
        tags.namespace,
      ],
      color: "var(--syntax-keyword, var(--warning))",
    },
    {
      tag: [tags.string, tags.special(tags.string), tags.regexp],
      color: "var(--syntax-string, var(--accent))",
    },
    {
      tag: [tags.number, tags.bool, tags.null, tags.atom],
      color: "var(--syntax-number, var(--destructive))",
    },
    {
      tag: [tags.comment, tags.meta],
      color: "var(--syntax-comment, var(--muted-foreground))",
      fontStyle: "italic",
    },
    {
      tag: [
        tags.variableName,
        tags.propertyName,
        tags.attributeName,
        tags.macroName,
        tags.labelName,
      ],
      color: "var(--syntax-variable, var(--foreground))",
    },
    { tag: tags.heading, color: "var(--syntax-keyword)", fontWeight: "600" },
    { tag: tags.emphasis, fontStyle: "italic" },
    { tag: tags.strong, fontWeight: "700" },
    { tag: [tags.link, tags.url], color: "var(--syntax-variable)", textDecoration: "underline" },
    { tag: tags.inserted, color: "var(--syntax-string)" },
    { tag: tags.deleted, color: "var(--syntax-number)" },
    { tag: [tags.punctuation, tags.operator], color: "var(--foreground)" },
  ]),
);

/** Imperative CodeMirror state is per mounted block; React only synchronizes actual external changes. */
export function CodeEditorSurface(props: CodeEditorSurfaceProps) {
  const { ref, value, language = "", wrap } = props;
  const parentRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const latestProps = useRef(props);
  const compartments = useRef({ language: new Compartment(), options: new Compartment() });

  useEffect(() => {
    latestProps.current = props;
  }, [props]);

  useEffect(() => {
    if (!parentRef.current) return;
    const current = latestProps.current;
    const initialHistory = recordCodeEditorHistory(current.getInitialHistory(), current.value);
    const initialSource = initialHistory.entries[0] ?? current.value;
    const view = new EditorView({
      parent: parentRef.current,
      state: restoreEditorSourceHistory(
        EditorState.create({
          doc: normalizeEditorLineBreaks(initialSource),
          extensions: [
            ...editorSourceTracking(initialSource),
            history(),
            lineNumbers(),
            drawSelection(),
            indentOnInput(),
            indentUnit.of("  "),
            bracketMatching(),
            sourceHighlighting,
            editorTheme,
            keymap.of([
              ...defaultKeymap.filter(
                (binding) => binding.key !== "Tab" && binding.key !== "Shift-Tab",
              ),
              ...historyKeymap,
            ]),
            compartments.current.language.of([]),
            compartments.current.options.of(editorOptions(current)),
            EditorView.updateListener.of((update) => {
              const source = update.state.field(editorSourceField);
              if (source === update.startState.field(editorSourceField)) return;
              if (source !== latestProps.current.value) latestProps.current.onChange(source);
            }),
            EditorView.domEventHandlers({
              paste(event, editor) {
                if (latestProps.current.disabled || latestProps.current.readOnly) return false;
                const source = event.clipboardData?.getData("text/plain");
                if (!source) return false;
                const range = editor.state.selection.main;
                editor.dispatch({
                  changes: {
                    from: range.from,
                    to: range.to,
                    insert: normalizeEditorLineBreaks(source),
                  },
                  selection: EditorSelection.cursor(
                    range.from + normalizeEditorLineBreaks(source).length,
                  ),
                  annotations: [
                    exactSourceChanges.of([{ from: range.from, to: range.to, insert: source }]),
                    Transaction.userEvent.of("input.paste"),
                  ],
                  scrollIntoView: true,
                });
                event.preventDefault();
                return true;
              },
            }),
          ],
        }),
        initialHistory,
      ),
    });
    view.setTabFocusMode(true);
    view.scrollDOM.tabIndex = current.disabled ? -1 : 0;
    view.scrollDOM.setAttribute("role", "group");
    view.scrollDOM.setAttribute("aria-label", current.scrollLabel);
    viewRef.current = view;
    return () => {
      viewRef.current = null;
      view.destroy();
    };
  }, []);

  useEffect(() => {
    if (props.active) viewRef.current?.requestMeasure();
  }, [props.active]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view || view.state.field(editorSourceField) === value) return;
    const previousSource = view.state.field(editorSourceField);
    const previous = normalizeEditorLineBreaks(previousSource);
    const next = normalizeEditorLineBreaks(value);
    let from = 0;
    while (from < previous.length && from < next.length && previous[from] === next[from]) from++;
    let previousEnd = previous.length;
    let nextEnd = next.length;
    while (
      previousEnd > from &&
      nextEnd > from &&
      previous[previousEnd - 1] === next[nextEnd - 1]
    ) {
      previousEnd--;
      nextEnd--;
    }
    view.dispatch({
      ...(previous !== next
        ? { changes: { from, to: previousEnd, insert: next.slice(from, nextEnd) } }
        : {}),
      effects: rawSourceEffect.of(value),
    });
  }, [value]);

  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.scrollDOM.tabIndex = props.disabled ? -1 : 0;
    view.scrollDOM.setAttribute("aria-label", props.scrollLabel);
    view.dispatch({ effects: compartments.current.options.reconfigure(editorOptions(props)) });
  }, [props]);

  useEffect(() => {
    let active = true;
    const view = viewRef.current;
    if (!view) return;
    // Clear the previous parser immediately; a late response cannot recolor a different language.
    view.dispatch({ effects: compartments.current.language.reconfigure([]) });
    loadCodeLanguage(language)
      .then((support) => {
        if (active && viewRef.current === view)
          view.dispatch({ effects: compartments.current.language.reconfigure(support ?? []) });
      })
      .catch(() => {
        // A parser failure leaves a functional literal code editor.
      });
    return () => {
      active = false;
    };
  }, [language]);

  useImperativeHandle(ref, () => ({
    focus() {
      viewRef.current?.focus();
    },
    setSelectionRange(start, end) {
      const view = viewRef.current;
      if (!view) return;
      const source = view.state.field(editorSourceField);
      view.dispatch({
        selection: EditorSelection.single(
          sourcePositionToEditor(source, start),
          sourcePositionToEditor(source, end),
        ),
        scrollIntoView: true,
      });
    },
    get selectionStart() {
      const view = viewRef.current;
      return view
        ? editorPositionToSource(
            view.state.field(editorSourceField),
            view.state.selection.main.from,
          )
        : 0;
    },
    get selectionEnd() {
      const view = viewRef.current;
      return view
        ? editorPositionToSource(view.state.field(editorSourceField), view.state.selection.main.to)
        : 0;
    },
    indent(less) {
      const view = viewRef.current;
      if (!view || latestProps.current.disabled || latestProps.current.readOnly) return;
      (less ? indentLess : indentMore)(view);
      view.focus();
    },
    undo() {
      const view = viewRef.current;
      return view && !latestProps.current.disabled && !latestProps.current.readOnly
        ? undo(view)
        : false;
    },
    redo() {
      const view = viewRef.current;
      return view && !latestProps.current.disabled && !latestProps.current.readOnly
        ? redo(view)
        : false;
    },
  }));

  return (
    <div
      ref={parentRef}
      className="max-w-full min-w-0"
      data-code-editor-language={language}
      data-code-editor-wrap={wrap}
    />
  );
}

function editorOptions(props: CodeEditorSurfaceProps) {
  return [
    EditorState.readOnly.of(Boolean(props.readOnly || props.disabled)),
    EditorView.editable.of(!props.disabled),
    EditorView.contentAttributes.of({
      ...(props.id ? { id: props.id } : {}),
      ...(props["aria-label"] ? { "aria-label": props["aria-label"] } : {}),
      ...(props["aria-describedby"] ? { "aria-describedby": props["aria-describedby"] } : {}),
      ...(props["aria-invalid"] ? { "aria-invalid": String(props["aria-invalid"]) } : {}),
      ...(props.required ? { "aria-required": "true" } : {}),
      "aria-readonly": String(Boolean(props.readOnly || props.disabled)),
      ...(props.disabled ? { "aria-disabled": "true", tabindex: "-1" } : {}),
      spellcheck: "false",
      autocapitalize: "off",
      autocorrect: "off",
      "data-code-editor-input": "true",
    }),
    EditorView.editorAttributes.of({
      "data-invalid": String(Boolean(props["aria-invalid"])),
      "data-disabled": String(Boolean(props.disabled)),
    }),
    ...(props.wrap ? [EditorView.lineWrapping] : []),
    ...(props.placeholder ? [editorPlaceholder(props.placeholder)] : []),
  ];
}
