import { describe, expect, it } from "vitest";
import { EditorState, Transaction } from "@codemirror/state";
import type { TransactionSpec } from "@codemirror/state";
import { history, redo, undo } from "@codemirror/commands";
import {
  applyEditorSourceChanges,
  applyTextareaSourceChange,
  editorPositionToSource,
  normalizeEditorLineBreaks,
  preferredEditorLineBreak,
  sourcePositionToEditor,
} from "./code-editor-source";
import {
  editorSourceField,
  editorSourceTracking,
  exactSourceChanges,
  rawSourceEffect,
  restoreEditorSourceHistory,
} from "./code-editor-state";
import {
  createCodeEditorHistory,
  moveCodeEditorHistory,
  recordCodeEditorHistory,
} from "./code-editor-history";

describe("exact editor source", () => {
  it("normalizes only the editing view and keeps the BOM and Unicode", () => {
    expect(normalizeEditorLineBreaks("\uFEFFHola 👋\r\nToml\rfin\n")).toBe(
      "\uFEFFHola 👋\nToml\nfin\n",
    );
  });

  it("maps positions between the raw source and normalized editing view", () => {
    const source = "\uFEFFa\r\nb\rc\n";
    const rawPositions = [0, 1, 2, 4, 5, 6, 7, 8];
    rawPositions.forEach((raw, normalized) => {
      expect(editorPositionToSource(source, normalized)).toBe(raw);
      expect(sourcePositionToEditor(source, raw)).toBe(normalized);
    });
    expect(editorPositionToSource(source, 999)).toBe(source.length);
    expect(sourcePositionToEditor(source, -1)).toBe(0);
  });

  it("chooses the first existing line ending for newly typed lines", () => {
    expect(preferredEditorLineBreak("a\r\nb\nc")).toBe("\r\n");
    expect(preferredEditorLineBreak("a\rb")).toBe("\r");
    expect(preferredEditorLineBreak("a")).toBe("\n");
  });

  it("edits selected ranges without replacing mixed endings elsewhere", () => {
    const source = "\uFEFFalpha\r\nbeta\rgamma\n";
    expect(applyEditorSourceChanges(source, [{ from: 7, to: 11, insert: "BETA" }])).toBe(
      "\uFEFFalpha\r\nBETA\rgamma\n",
    );
  });

  it("applies simultaneous changes against the original positions", () => {
    expect(
      applyEditorSourceChanges("a\r\nb\nc", [
        { from: 0, to: 1, insert: "A" },
        { from: 4, to: 5, insert: "C" },
      ]),
    ).toBe("A\r\nb\nC");
  });

  it("keeps pasted line endings exactly as supplied", () => {
    expect(applyEditorSourceChanges("a\r\nb", [{ from: 2, to: 3, insert: "x\ny\r\nz\r" }])).toBe(
      "a\r\nx\ny\r\nz\r",
    );
  });

  it("does not emit a normalized replacement for an unchanged textarea value", () => {
    const source = "\uFEFFa\r\nb\rc\n";
    expect(applyTextareaSourceChange(source, "\uFEFFa\nb\nc\n")).toBe(source);
  });

  it("preserves untouched textarea lines and gives typed new lines the preferred ending", () => {
    const source = "a\r\nb\rc\n";
    expect(applyTextareaSourceChange(source, "a\nb!\nnew\nc\n")).toBe("a\r\nb!\r\nnew\rc\n");
  });
});

function editor(source: string) {
  let state = EditorState.create({
    doc: normalizeEditorLineBreaks(source),
    extensions: [editorSourceTracking(source), history()],
  });
  const target = {
    get state() {
      return state;
    },
    dispatch(transaction: Transaction) {
      state = transaction.state;
    },
  };
  return {
    get source() {
      return state.field(editorSourceField);
    },
    get normalized() {
      return state.doc.toString();
    },
    change(spec: TransactionSpec) {
      state = state.update(spec).state;
    },
    undo() {
      return undo(target);
    },
    redo() {
      return redo(target);
    },
  };
}

describe("editor source history", () => {
  it("does not change the source while recovering an editor", () => {
    const source = "\uFEFFa\r\nb\rc\n";
    const instance = editor(source);
    expect(instance.source).toBe(source);
    expect(instance.normalized).toBe(normalizeEditorLineBreaks(source));
  });

  it("retains mixed line endings across typed edits, undo, and redo", () => {
    const source = "\uFEFFa\r\nb\rc\n";
    const instance = editor(source);
    instance.change({ changes: { from: 4, insert: "!\nnew" } });
    const changed = "\uFEFFa\r\nb!\r\nnew\rc\n";
    expect(instance.source).toBe(changed);
    expect(instance.normalized).toBe(normalizeEditorLineBreaks(changed));
    expect(instance.undo()).toBe(true);
    expect(instance.source).toBe(source);
    expect(instance.redo()).toBe(true);
    expect(instance.source).toBe(changed);
  });

  it("restores the original raw source when grouped typing is undone", () => {
    const instance = editor("a\r\nb\n");
    instance.change({
      changes: { from: 1, insert: "x" },
      annotations: [Transaction.userEvent.of("input.type"), Transaction.time.of(1)],
    });
    instance.change({
      changes: { from: 2, insert: "y" },
      annotations: [Transaction.userEvent.of("input.type"), Transaction.time.of(2)],
    });
    expect(instance.source).toBe("axy\r\nb\n");
    expect(instance.undo()).toBe(true);
    expect(instance.source).toBe("a\r\nb\n");
    expect(instance.normalized).toBe("a\nb\n");
    expect(instance.redo()).toBe(true);
    expect(instance.source).toBe("axy\r\nb\n");
  });

  it("preserves a pasted fragment and its raw line endings through history", () => {
    const instance = editor("a\r\nb\n");
    const pasted = "\uFEFFx\ry\r\nz\n";
    instance.change({
      changes: { from: 2, insert: normalizeEditorLineBreaks(pasted) },
      annotations: exactSourceChanges.of([{ from: 2, to: 2, insert: pasted }]),
    });
    const changed = "a\r\n" + pasted + "b\n";
    expect(instance.source).toBe(changed);
    instance.undo();
    expect(instance.source).toBe("a\r\nb\n");
    instance.redo();
    expect(instance.source).toBe(changed);
  });

  it("keeps an explicitly replaced source undoable without corrupting its raw value", () => {
    const instance = editor("a\r\nb\n");
    const next = "alpha\nbeta\r\n";
    instance.change({
      changes: { from: 0, to: instance.normalized.length, insert: normalizeEditorLineBreaks(next) },
      effects: rawSourceEffect.of(next),
    });
    expect(instance.source).toBe(next);
    instance.undo();
    expect(instance.source).toBe("a\r\nb\n");
    instance.redo();
    expect(instance.source).toBe(next);
  });

  it("records and restores edits that change only raw line endings", () => {
    const instance = editor("a\nb");
    instance.change({ effects: rawSourceEffect.of("a\r\nb") });
    expect(instance.normalized).toBe("a\nb");
    expect(instance.source).toBe("a\r\nb");
    expect(instance.undo()).toBe(true);
    expect(instance.source).toBe("a\nb");
    expect(instance.normalized).toBe("a\nb");
    expect(instance.redo()).toBe(true);
    expect(instance.source).toBe("a\r\nb");
    expect(instance.normalized).toBe("a\nb");
  });

  it("keeps independent source and undo state for duplicated editors", () => {
    const original = editor("a\r\nb");
    const duplicate = editor(original.source);
    duplicate.change({ changes: { from: 0, to: 1, insert: "copy" } });
    expect(original.source).toBe("a\r\nb");
    expect(duplicate.source).toBe("copy\r\nb");
    expect(original.undo()).toBe(false);
  });
});

describe("history while loading the optional editor", () => {
  it("records an exact paste with undo and redo before the editor is available", () => {
    const original = "\uFEFFa\r\nb\n";
    const pasted = "\uFEFFnew\rx\r\ny\n";
    const initial = createCodeEditorHistory(original);
    const edited = recordCodeEditorHistory(initial, original + pasted);
    const undone = moveCodeEditorHistory(edited, -1);
    expect(undone.entries[undone.position]).toBe(original);
    const redone = moveCodeEditorHistory(undone, 1);
    expect(redone.entries[redone.position]).toBe(original + pasted);
  });

  it("replays loading edits into CodeMirror with the same undo and redo position", () => {
    const original = "\uFEFFa\r\nb\n";
    const typed = original + "!";
    const pasted = typed + "x\ry\r\nz\n";
    let snapshots = recordCodeEditorHistory(createCodeEditorHistory(original), typed);
    snapshots = recordCodeEditorHistory(snapshots, pasted);
    snapshots = moveCodeEditorHistory(snapshots, -1);
    let state = restoreEditorSourceHistory(
      EditorState.create({
        doc: normalizeEditorLineBreaks(original),
        extensions: [editorSourceTracking(original), history()],
      }),
      snapshots,
    );
    const target = {
      get state() {
        return state;
      },
      dispatch(transaction: Transaction) {
        state = transaction.state;
      },
    };
    expect(state.field(editorSourceField)).toBe(typed);
    expect(state.doc.toString()).toBe(normalizeEditorLineBreaks(typed));
    expect(undo(target)).toBe(true);
    expect(state.field(editorSourceField)).toBe(original);
    expect(redo(target)).toBe(true);
    expect(state.field(editorSourceField)).toBe(typed);
    expect(redo(target)).toBe(true);
    expect(state.field(editorSourceField)).toBe(pasted);
    expect(state.doc.toString()).toBe(normalizeEditorLineBreaks(pasted));
  });

  it("discards a redo branch only after a new edit", () => {
    const initial = createCodeEditorHistory("a");
    const edited = recordCodeEditorHistory(initial, "b");
    const undone = moveCodeEditorHistory(edited, -1);
    expect(recordCodeEditorHistory(undone, "a")).toBe(undone);
    const different = recordCodeEditorHistory(undone, "c");
    expect(different.entries).toEqual(["a", "c"]);
    expect(moveCodeEditorHistory(different, 1)).toBe(different);
  });

  it("bounds temporary source snapshots while the chunk is unavailable", () => {
    let snapshots = createCodeEditorHistory("0");
    for (let index = 1; index <= 150; index++)
      snapshots = recordCodeEditorHistory(snapshots, String(index));
    expect(snapshots.entries).toHaveLength(100);
    expect(snapshots.entries[0]).toBe("51");
    expect(snapshots.entries[snapshots.position]).toBe("150");
  });
});
