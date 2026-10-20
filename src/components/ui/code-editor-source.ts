/** CodeMirror and textarea positions use LF internally; persisted source stays untouched. */
export function normalizeEditorLineBreaks(source: string): string {
  return source.replace(/\r\n?/g, "\n");
}

export function preferredEditorLineBreak(source: string): string {
  return source.match(/\r\n|\r|\n/)?.[0] ?? "\n";
}

export function editorPositionToSource(source: string, position: number): number {
  const target = Math.max(0, position);
  let normalized = 0;
  let raw = 0;
  while (raw < source.length && normalized < target) {
    if (source[raw] === "\r" && source[raw + 1] === "\n") raw += 2;
    else raw += 1;
    normalized += 1;
  }
  return raw;
}

export function sourcePositionToEditor(source: string, position: number): number {
  const target = Math.min(source.length, Math.max(0, position));
  let normalized = 0;
  let raw = 0;
  while (raw < target) {
    if (source[raw] === "\r" && source[raw + 1] === "\n") raw += 2;
    else raw += 1;
    normalized += 1;
  }
  return normalized;
}

export type EditorSourceChange = { from: number; to: number; insert: string };

/** Changes refer to the old LF document. Existing line endings outside edits are preserved. */
export function applyEditorSourceChanges(
  source: string,
  changes: readonly EditorSourceChange[],
): string {
  let result = source;
  for (const change of [...changes].sort((a, b) => b.from - a.from)) {
    const start = editorPositionToSource(source, change.from);
    const end = editorPositionToSource(source, change.to);
    result = result.slice(0, start) + change.insert + result.slice(end);
  }
  return result;
}

/** Textarea edits have one normalized value; keep the untouched prefix/suffix in raw form. */
export function applyTextareaSourceChange(source: string, nextValue: string): string {
  const previous = normalizeEditorLineBreaks(source);
  const next = normalizeEditorLineBreaks(nextValue);
  let start = 0;
  while (start < previous.length && start < next.length && previous[start] === next[start]) start++;
  let previousEnd = previous.length;
  let nextEnd = next.length;
  while (
    previousEnd > start &&
    nextEnd > start &&
    previous[previousEnd - 1] === next[nextEnd - 1]
  ) {
    previousEnd--;
    nextEnd--;
  }
  if (start === previousEnd && start === nextEnd) return source;
  return applyEditorSourceChanges(source, [
    {
      from: start,
      to: previousEnd,
      insert: next.slice(start, nextEnd).replace(/\n/g, preferredEditorLineBreak(source)),
    },
  ]);
}
