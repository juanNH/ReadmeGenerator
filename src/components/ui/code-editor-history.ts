/** Small temporary history while the optional editor chunk is loading. */
export type CodeEditorSourceHistory = { entries: readonly string[]; position: number };

export function createCodeEditorHistory(source: string): CodeEditorSourceHistory {
  return { entries: [source], position: 0 };
}

export function recordCodeEditorHistory(
  history: CodeEditorSourceHistory,
  source: string,
): CodeEditorSourceHistory {
  if (history.entries[history.position] === source) return history;
  const entries = [...history.entries.slice(0, history.position + 1), source].slice(-100);
  return { entries, position: entries.length - 1 };
}

export function moveCodeEditorHistory(
  history: CodeEditorSourceHistory,
  direction: -1 | 1,
): CodeEditorSourceHistory {
  const position = Math.max(0, Math.min(history.entries.length - 1, history.position + direction));
  return position === history.position ? history : { ...history, position };
}
