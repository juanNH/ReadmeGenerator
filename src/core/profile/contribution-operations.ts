/** Move one contribution by one position without mutating the stored array. */
export function reorderContributionItem<T extends { readonly id: string }>(
  items: T[],
  itemId: string,
  direction: -1 | 1,
): T[] {
  const index = items.findIndex((item) => item.id === itemId);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= items.length) return items;

  const next = [...items];
  [next[index], next[target]] = [next[target]!, next[index]!];
  return next;
}
