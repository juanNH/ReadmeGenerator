"use client";

import { useEffect, useRef } from "react";

/** Keep focus predictable when a form adds or removes an entry with an opaque ID. */
export function useEntryFocus(entries: readonly { id: string }[]) {
  const controls = useRef(new Map<string, HTMLElement>());
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const pendingId = useRef<string | null>(null);

  useEffect(() => {
    if (pendingId.current === null) return;
    controls.current.get(pendingId.current)?.focus();
    pendingId.current = null;
  }, [entries]);

  function entryRef(id: string) {
    return (control: HTMLElement | null) => {
      if (control) controls.current.set(id, control);
      else controls.current.delete(id);
    };
  }

  function focusNewEntry(id: string) {
    pendingId.current = id;
  }

  function focusAfterRemoval(index: number) {
    const next = entries[index + 1] ?? entries[index - 1];
    if (next) controls.current.get(next.id)?.focus();
    else addButtonRef.current?.focus();
  }

  return { entryRef, addButtonRef, focusNewEntry, focusAfterRemoval };
}
