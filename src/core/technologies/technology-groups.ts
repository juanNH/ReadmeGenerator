import type { ProfileModuleData } from "../profile/module-content";
import {
  getTechnologyCategory,
  getTechnologyCategoryName,
  technologyCategoryIds,
  type TechnologyCategoryId,
} from "./categories";

type Technologies = ProfileModuleData["technologies"];
type TechnologyGroup = Technologies["groups"][number];
type TechnologyItem = TechnologyGroup["items"][number];
type CreateId = () => string;
type Direction = -1 | 1;
type Bucket = {
  category: TechnologyCategoryId | null;
  entries: { item: TechnologyItem; sourceGroupId: string }[];
};

/** A broken ID supplier must not produce an invalid or partially changed document. */
function freshId(taken: ReadonlySet<string>, createId: CreateId): string | null {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    let id: string;
    try {
      id = createId();
    } catch {
      return null;
    }
    if (typeof id === "string" && id.trim() && !taken.has(id)) return id;
  }
  return null;
}

function sameItems(left: readonly TechnologyItem[], right: readonly TechnologyItem[]): boolean {
  return left.length === right.length && left.every((item, index) => item === right[index]);
}

/** Reuse as many contributing group IDs as possible when one group splits into categories. */
function retainedGroupIds(buckets: readonly Bucket[]): Map<number, string> {
  const candidates = buckets.map((bucket) => [
    ...new Set(bucket.entries.map((entry) => entry.sourceGroupId)),
  ]);
  const owners = new Map<string, number>();

  function assign(bucketIndex: number, visited: Set<string>): boolean {
    for (const groupId of candidates[bucketIndex] ?? []) {
      if (visited.has(groupId)) continue;
      visited.add(groupId);
      const owner = owners.get(groupId);
      if (owner === undefined || assign(owner, visited)) {
        owners.set(groupId, bucketIndex);
        return true;
      }
    }
    return false;
  }

  for (let index = 0; index < buckets.length; index += 1) assign(index, new Set());
  return new Map([...owners].map(([groupId, index]) => [index, groupId]));
}

/** Explicit user action: replace category titles, preserving item text, contexts and duplicates. */
export function organizeTechnologyGroups(
  data: Technologies,
  locale: "en" | "es",
  createId: CreateId,
): Technologies {
  const byCategory = new Map<TechnologyCategoryId | null, Bucket>();
  for (const group of data.groups) {
    for (const item of group.items) {
      const category = getTechnologyCategory(item.name);
      let bucket = byCategory.get(category);
      if (!bucket) {
        bucket = { category, entries: [] };
        byCategory.set(category, bucket);
      }
      bucket.entries.push({ item, sourceGroupId: group.id });
    }
  }
  const buckets = [...technologyCategoryIds, null]
    .map((category) => byCategory.get(category))
    .filter((bucket): bucket is Bucket => bucket !== undefined);
  if (buckets.length === 0) return data;

  const retained = retainedGroupIds(buckets);
  const takenGroupIds = new Set(data.groups.map((group) => group.id));
  const groups: TechnologyGroup[] = [];

  for (const [index, bucket] of buckets.entries()) {
    const retainedId = retained.get(index);
    const groupId = retainedId ?? freshId(takenGroupIds, createId);
    if (groupId === null) return data;
    takenGroupIds.add(groupId);

    // Existing items in a retained destination keep their IDs, even if a moved item comes first.
    const reservedItemIds = new Set(
      bucket.entries
        .filter((entry) => entry.sourceGroupId === retainedId)
        .map((entry) => entry.item.id),
    );
    const takenItemIds = new Set(reservedItemIds);
    const unavailableItemIds = new Set(bucket.entries.map((entry) => entry.item.id));
    const items: TechnologyItem[] = [];
    for (const { item, sourceGroupId } of bucket.entries) {
      if (sourceGroupId === retainedId || !takenItemIds.has(item.id)) {
        items.push(item);
        takenItemIds.add(item.id);
      } else {
        const id = freshId(unavailableItemIds, createId);
        if (id === null) return data;
        items.push({ ...item, id });
        takenItemIds.add(id);
        unavailableItemIds.add(id);
      }
    }
    const name = bucket.category === null ? "" : getTechnologyCategoryName(bucket.category, locale);
    const previous = data.groups.find((group) => group.id === groupId);
    groups.push(
      previous && previous.name === name && sameItems(previous.items, items)
        ? previous
        : { id: groupId, name, items },
    );
  }

  groups.push(...data.groups.filter((group) => group.items.length === 0));
  return groups.length === data.groups.length &&
    groups.every((group, index) => group === data.groups[index])
    ? data
    : { ...data, groups };
}

/** Append to an existing group; null chooses the first unnamed group or creates one. */
export function moveTechnologyItem(
  data: Technologies,
  sourceGroupId: string,
  itemId: string,
  targetGroupId: string | null,
  createId: CreateId,
): Technologies {
  const source = data.groups.find((group) => group.id === sourceGroupId);
  const item = source?.items.find((entry) => entry.id === itemId);
  if (!source || !item) return data;

  let target =
    targetGroupId === null
      ? data.groups.find((group) => !group.name.trim())
      : data.groups.find((group) => group.id === targetGroupId);
  let created = false;
  if (!target && targetGroupId === null) {
    const id = freshId(new Set(data.groups.map((group) => group.id)), createId);
    if (id === null) return data;
    target = { id, name: "", items: [] };
    created = true;
  }
  if (!target || source === target) return data;

  const takenIds = new Set(target.items.map((entry) => entry.id));
  let moved = item;
  if (takenIds.has(item.id)) {
    const id = freshId(takenIds, createId);
    if (id === null) return data;
    moved = { ...item, id };
  }
  const destination = { ...target, items: [...target.items, moved] };
  const groups = data.groups.map((group) =>
    group === source
      ? { ...group, items: group.items.filter((entry) => entry !== item) }
      : group === target
        ? destination
        : group,
  );
  if (created) groups.push(destination);
  return { ...data, groups };
}

/** Swap visible neighbors while keeping empty unnamed slots at their existing positions. */
export function moveTechnologyGroup(
  data: Technologies,
  groupId: string,
  direction: Direction,
): Technologies {
  if (direction !== -1 && direction !== 1) return data;
  const index = data.groups.findIndex((group) => group.id === groupId);
  const source = data.groups[index];
  if (!source || (!source.name.trim() && source.items.length === 0)) return data;
  let nextIndex = index + direction;
  while (nextIndex >= 0 && nextIndex < data.groups.length) {
    const candidate = data.groups[nextIndex]!;
    if (candidate.name.trim() || candidate.items.length > 0) break;
    nextIndex += direction;
  }
  if (nextIndex < 0 || nextIndex >= data.groups.length) return data;
  const groups = [...data.groups];
  groups[index] = groups[nextIndex]!;
  groups[nextIndex] = source;
  return { ...data, groups };
}

export function reorderTechnologyItem(
  data: Technologies,
  groupId: string,
  itemId: string,
  direction: Direction,
): Technologies {
  if (direction !== -1 && direction !== 1) return data;
  const group = data.groups.find((entry) => entry.id === groupId);
  const index = group?.items.findIndex((item) => item.id === itemId) ?? -1;
  const nextIndex = index + direction;
  if (!group || index < 0 || nextIndex < 0 || nextIndex >= group.items.length) return data;
  const items = [...group.items];
  const moved = items.splice(index, 1)[0]!;
  items.splice(nextIndex, 0, moved);
  return {
    ...data,
    groups: data.groups.map((entry) => (entry === group ? { ...group, items } : entry)),
  };
}

/** Remove the category title, never its group, position or items. */
export function removeTechnologyCategory(data: Technologies, groupId: string): Technologies {
  const group = data.groups.find((entry) => entry.id === groupId);
  if (!group || group.name === "") return data;
  return {
    ...data,
    groups: data.groups.map((entry) => (entry === group ? { ...group, name: "" } : entry)),
  };
}
