import {
  Annotation,
  EditorSelection,
  EditorState,
  StateEffect,
  StateField,
} from "@codemirror/state";
import type { Transaction } from "@codemirror/state";
import { invertedEffects, isolateHistory, undo } from "@codemirror/commands";
import {
  applyEditorSourceChanges,
  normalizeEditorLineBreaks,
  preferredEditorLineBreak,
} from "./code-editor-source";
import type { EditorSourceChange } from "./code-editor-source";
import type { CodeEditorSourceHistory } from "./code-editor-history";

export const rawSourceEffect = StateEffect.define<string>();
export const exactSourceChanges = Annotation.define<readonly EditorSourceChange[]>();
export const editorSourceField = StateField.define<string>({
  create() {
    return "";
  },
  update(source, transaction) {
    let result = source;
    for (const effect of transaction.effects) if (effect.is(rawSourceEffect)) result = effect.value;
    return result;
  },
});

/** Raw source and undo state are local to this editor, never shared between duplicate blocks. */
export function editorSourceTracking(source: string) {
  return [
    editorSourceField.init(() => source),
    EditorState.transactionExtender.of((transaction) => {
      if (
        !transaction.docChanged ||
        transaction.effects.some((effect) => effect.is(rawSourceEffect))
      )
        return null;
      const previous = transaction.startState.field(editorSourceField);
      const changes: EditorSourceChange[] = [...(transaction.annotation(exactSourceChanges) ?? [])];
      if (changes.length === 0) {
        transaction.changes.iterChanges((from, to, _fromNew, _toNew, inserted) => {
          changes.push({
            from,
            to,
            insert: inserted.toString().replace(/\n/g, preferredEditorLineBreak(previous)),
          });
        });
      }
      return { effects: rawSourceEffect.of(applyEditorSourceChanges(previous, changes)) };
    }),
    invertedEffects.of((transaction) =>
      transaction.docChanged ||
      transaction.effects.some(
        (effect) =>
          effect.is(rawSourceEffect) &&
          effect.value !== transaction.startState.field(editorSourceField),
      )
        ? [rawSourceEffect.of(transaction.startState.field(editorSourceField))]
        : [],
    ),
  ];
}

/** Replay loading-phase edits before mounting the view, including any available redo entries. */
export function restoreEditorSourceHistory(
  initialState: EditorState,
  history: CodeEditorSourceHistory,
): EditorState {
  let state = initialState;
  for (const source of history.entries.slice(1)) {
    const normalized = normalizeEditorLineBreaks(source);
    state = state.update({
      changes: { from: 0, to: state.doc.length, insert: normalized },
      effects: rawSourceEffect.of(source),
      selection: EditorSelection.cursor(normalized.length),
      annotations: isolateHistory.of("full"),
    }).state;
  }
  const target = {
    get state() {
      return state;
    },
    dispatch(transaction: Transaction) {
      state = transaction.state;
    },
  };
  for (let index = history.entries.length - 1; index > history.position; index--) undo(target);
  return state;
}
