/** Canonical object keys make generated URLs stable before and after schema parsing.
 * Arrays retain their authored order (selected counters, colors and resources).
 */
export function cardConfigJson(value: object): string {
  return JSON.stringify(value, (_key, entry: unknown) => {
    if (entry && typeof entry === "object" && !Array.isArray(entry))
      return Object.fromEntries(
        Object.entries(entry).sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0)),
      );
    return entry;
  });
}
