import { describe, expect, it } from "vitest";
import { moduleContentSchemas, type ProfileModuleData } from "../profile/module-content";
import { getTechnologyCategoryName } from "./categories";
import {
  moveTechnologyGroup,
  moveTechnologyItem,
  organizeTechnologyGroups,
  removeTechnologyCategory,
  reorderTechnologyItem,
} from "./technology-groups";

type Technologies = ProfileModuleData["technologies"];
type TechnologyGroup = Technologies["groups"][number];
type TechnologyItem = TechnologyGroup["items"][number];

function item(id: string, name: string, context = ""): TechnologyItem {
  return { id, name, context };
}

function group(id: string, name: string, items: TechnologyItem[]): TechnologyGroup {
  return { id, name, items };
}

function freeze(data: Technologies): Technologies {
  for (const entry of data.groups) {
    for (const value of entry.items) Object.freeze(value);
    Object.freeze(entry.items);
    Object.freeze(entry);
  }
  Object.freeze(data.groups);
  return Object.freeze(data);
}

function sequence(...ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] ?? `generated-${index}`;
}

function unexpectedId(): never {
  throw new Error("This operation should not need a new ID");
}

describe("explicit technology organization", () => {
  it("uses fixed category order and localized titles while retaining relative item order", () => {
    const data = freeze({
      groups: [
        group("original", "My tools", [
          item("custom-one", "Personal engine", "Keep my own explanation"),
          item("ai", "Codex"),
          item("cloud", "Docker"),
          item("frontend-one", "React", "Work and personal projects"),
          item("data", "PostgreSQL"),
          item("language", "Python"),
          item("frontend-two", "Vue"),
          item("custom-two", "Personal engine", "Another usage"),
        ]),
      ],
    });
    const result = organizeTechnologyGroups(data, "en", sequence());
    expect(result.groups.map((entry) => entry.name)).toEqual([
      getTechnologyCategoryName("languages", "en"),
      getTechnologyCategoryName("frontend", "en"),
      getTechnologyCategoryName("data", "en"),
      getTechnologyCategoryName("cloud", "en"),
      getTechnologyCategoryName("ai", "en"),
      "",
    ]);
    expect(result.groups.map((entry) => entry.items.map((value) => value.id))).toEqual([
      ["language"],
      ["frontend-one", "frontend-two"],
      ["data"],
      ["cloud"],
      ["ai"],
      ["custom-one", "custom-two"],
    ]);
    expect(result.groups[1]?.items[0]).toBe(data.groups[0]?.items[3]);
    expect(result.groups.at(-1)?.items.map((entry) => entry.context)).toEqual([
      "Keep my own explanation",
      "Another usage",
    ]);
    expect(moduleContentSchemas.technologies.safeParse(result).success).toBe(true);
    expect(data.groups[0]?.name).toBe("My tools");
    expect(data.groups[0]?.items).toHaveLength(8);
  });

  it("changes only generated titles when explicitly organized in another locale", () => {
    const python = item("language", "Python", "My original English context");
    const react = item("frontend", "React", "Mi contexto original");
    const data = freeze({ groups: [group("one", "", [react, python])] });
    const english = organizeTechnologyGroups(data, "en", sequence("second"));
    const spanish = organizeTechnologyGroups(freeze(english), "es", unexpectedId);
    expect(spanish.groups.map((entry) => entry.name)).toEqual([
      getTechnologyCategoryName("languages", "es"),
      getTechnologyCategoryName("frontend", "es"),
    ]);
    expect(spanish.groups.map((entry) => entry.id)).toEqual(
      english.groups.map((entry) => entry.id),
    );
    expect(spanish.groups[0]?.items[0]).toBe(python);
    expect(spanish.groups[1]?.items[0]).toBe(react);
  });

  it("retains unknown names, blank names with context and duplicate technology selections", () => {
    const entries = [
      item("custom-one", "Unlisted tool", "First context"),
      item("custom-two", "Unlisted tool", "Second context"),
      item("context-only", "", "I keep this context even without a tool name"),
      item("duplicate-one", "React"),
      item("duplicate-two", "reactjs", "Alias with a different context"),
    ];
    const data = freeze({ groups: [group("opaque-\ud800", "Custom", entries)] });
    const result = organizeTechnologyGroups(data, "en", sequence("another-group"));
    expect(result.groups.flatMap((entry) => entry.items)).toHaveLength(entries.length);
    expect(result.groups[0]?.items).toEqual(entries.slice(3));
    expect(result.groups[1]?.name).toBe("");
    expect(result.groups[1]?.items).toEqual(entries.slice(0, 3));
    expect(result.groups.flatMap((entry) => entry.items.map((value) => value.id))).toContain(
      "context-only",
    );
    expect(moduleContentSchemas.technologies.safeParse(result).success).toBe(true);
  });

  it("reuses all contributing group IDs when an assignment exists", () => {
    const data = freeze({
      groups: [
        group("mixed", "Mixed", [item("python", "Python"), item("react", "React")]),
        group("only-language", "Languages I use", [item("java", "Java")]),
      ],
    });
    const result = organizeTechnologyGroups(data, "en", unexpectedId);
    expect(result.groups.map((entry) => entry.id)).toEqual(["only-language", "mixed"]);
    expect(result.groups[0]?.items.map((entry) => entry.name)).toEqual(["Python", "Java"]);
    expect(result.groups[1]?.items.map((entry) => entry.name)).toEqual(["React"]);
  });

  it("only changes the incoming colliding item ID, even when it precedes a retained item", () => {
    const incoming = item("shared", "React", "Incoming context");
    const retained = item("shared", "Vue", "Retained context");
    const data = freeze({
      groups: [
        group("mixed", "Mixed", [item("language", "Python"), incoming]),
        group("frontend", "My frontend", [retained]),
      ],
    });
    const result = organizeTechnologyGroups(data, "en", sequence("shared", "", "new-incoming"));
    const frontend = result.groups[1]!;
    expect(frontend.id).toBe("frontend");
    expect(frontend.items).toEqual([{ ...incoming, id: "new-incoming" }, retained]);
    expect(frontend.items[1]).toBe(retained);
    expect(data.groups[0]?.items[1]?.id).toBe("shared");
    expect(moduleContentSchemas.technologies.safeParse(result).success).toBe(true);
  });

  it("does not assign a generated collision ID already used by a later item in that category", () => {
    const data = freeze({
      groups: [
        group("first", "", [item("shared", "React")]),
        group("second", "", [item("shared", "Vue"), item("later", "Angular")]),
      ],
    });
    const result = organizeTechnologyGroups(data, "en", sequence("later", "fresh"));
    expect(result.groups[0]?.items.map((entry) => entry.id)).toEqual(["shared", "fresh", "later"]);
    expect(moduleContentSchemas.technologies.safeParse(result).success).toBe(true);
  });

  it("preserves empty groups at the end without changing their title, ID or items", () => {
    const empty = group("__proto__", "An empty category I named", []);
    const data = freeze({ groups: [empty, group("\ud800", "", [item(" opaque ", "React")])] });
    const result = organizeTechnologyGroups(data, "es", unexpectedId);
    expect(result.groups[0]?.id).toBe("\ud800");
    expect(result.groups[1]).toBe(empty);
    expect(result.groups[0]?.items[0]?.id).toBe(" opaque ");
  });

  it("is a no-op for empty content and already organized groups", () => {
    const empty = freeze({ groups: [group("empty", "Keep this", [])] });
    expect(organizeTechnologyGroups(empty, "en", unexpectedId)).toBe(empty);
    const grouped = freeze({
      groups: [
        group("frontend", getTechnologyCategoryName("frontend", "en"), [item("react", "React")]),
      ],
    });
    expect(organizeTechnologyGroups(grouped, "en", unexpectedId)).toBe(grouped);
  });

  it("abandons the complete operation if it cannot allocate a fresh group ID", () => {
    const data = freeze({
      groups: [group("same", "Original", [item("py", "Python"), item("react", "React")])],
    });
    let calls = 0;
    const result = organizeTechnologyGroups(data, "en", () => {
      calls += 1;
      return "same";
    });
    expect(result).toBe(data);
    expect(calls).toBe(100);
    expect(data.groups[0]?.name).toBe("Original");
  });

  it("abandons the complete operation when colliding item IDs cannot be replaced", () => {
    const data = freeze({
      groups: [
        group("one", "", [item("shared", "React")]),
        group("two", "", [item("shared", "Vue")]),
      ],
    });
    expect(organizeTechnologyGroups(data, "en", () => "shared")).toBe(data);
  });
});

describe("moving technology items between groups", () => {
  it("appends the item without changing its data and retains the empty source group", () => {
    const moved = item("\ud800", "React", "Keep this exact context");
    const unaffected = group("untouched", "Other", [item("git", "Git")]);
    const data = freeze({
      groups: [
        group("source", "Source", [moved]),
        group("target", "Target", [item("vue", "Vue")]),
        unaffected,
      ],
    });
    const result = moveTechnologyItem(data, "source", "\ud800", "target", unexpectedId);
    expect(result.groups.map((entry) => entry.id)).toEqual(["source", "target", "untouched"]);
    expect(result.groups[0]?.items).toEqual([]);
    expect(result.groups[1]?.items.at(-1)).toBe(moved);
    expect(result.groups[2]).toBe(unaffected);
    expect(data.groups[0]?.items).toEqual([moved]);
    expect(moduleContentSchemas.technologies.safeParse(result).success).toBe(true);
  });

  it("uses the first unnamed group for a null target and preserves its existing whitespace", () => {
    const data = freeze({
      groups: [
        group("source", "Frontend", [item("react", "React")]),
        group("unnamed", "  ", [item("git", "Git")]),
        group("also-unnamed", "", []),
      ],
    });
    const result = moveTechnologyItem(data, "source", "react", null, unexpectedId);
    expect(result.groups[1]?.name).toBe("  ");
    expect(result.groups[1]?.items.map((entry) => entry.name)).toEqual(["Git", "React"]);
    expect(result.groups[2]).toBe(data.groups[2]);
  });

  it("creates an unnamed group only when none exists, skipping colliding and blank group IDs", () => {
    const data = freeze({ groups: [group("source", "Frontend", [item("react", "React")])] });
    const result = moveTechnologyItem(
      data,
      "source",
      "react",
      null,
      sequence("source", " ", " new-group "),
    );
    expect(result.groups).toEqual([
      group("source", "Frontend", []),
      group(" new-group ", "", [item("react", "React")]),
    ]);
    expect(moduleContentSchemas.technologies.safeParse(result).success).toBe(true);
  });

  it("replaces only a moved ID that collides inside the destination collection", () => {
    const moved = item("same", "React", "Moved context");
    const retained = item("same", "Vue", "Existing context");
    const data = freeze({
      groups: [group("source", "Source", [moved]), group("target", "Target", [retained])],
    });
    const result = moveTechnologyItem(
      data,
      "source",
      "same",
      "target",
      sequence("same", "", "\ud800"),
    );
    expect(result.groups[1]?.items).toEqual([retained, { ...moved, id: "\ud800" }]);
    expect(result.groups[1]?.items[0]).toBe(retained);
    expect(moved.id).toBe("same");
    expect(moduleContentSchemas.technologies.safeParse(result).success).toBe(true);
  });

  it.each([
    ["missing", "react", "target"],
    ["source", "missing", "target"],
    ["source", "react", "missing"],
    ["source", "react", "source"],
  ])("ignores invalid or same-group movement %s / %s / %s", (source, entry, target) => {
    const data = freeze({
      groups: [group("source", "", [item("react", "React")]), group("target", "Target", [])],
    });
    expect(moveTechnologyItem(data, source, entry, target, unexpectedId)).toBe(data);
  });

  it("does not move within the same first unnamed group for a null target", () => {
    const data = freeze({ groups: [group("source", "", [item("react", "React")])] });
    expect(moveTechnologyItem(data, "source", "react", null, unexpectedId)).toBe(data);
  });

  it("preserves everything when the item ID supplier cannot provide a unique ID", () => {
    const data = freeze({
      groups: [
        group("source", "Source", [item("same", "React")]),
        group("target", "Target", [item("same", "Vue")]),
      ],
    });
    let calls = 0;
    const result = moveTechnologyItem(data, "source", "same", "target", () => {
      calls += 1;
      return "same";
    });
    expect(result).toBe(data);
    expect(calls).toBe(100);
  });

  it("preserves everything if a fresh unnamed group cannot be created", () => {
    const data = freeze({ groups: [group("source", "Source", [item("react", "React")])] });
    expect(moveTechnologyItem(data, "source", "react", null, () => "source")).toBe(data);
    expect(moveTechnologyItem(data, "source", "react", null, unexpectedId)).toBe(data);
  });
});

describe("category and item order", () => {
  it("moves a complete group one position without mutating its contents", () => {
    const data = freeze({
      groups: [
        group("first", "One", [item("react", "React")]),
        group("\ud800", "Two", [item("git", "Git")]),
        group("third", "Three", []),
      ],
    });
    const up = moveTechnologyGroup(data, "\ud800", -1);
    expect(up.groups.map((entry) => entry.id)).toEqual(["\ud800", "first", "third"]);
    expect(up.groups[0]).toBe(data.groups[1]);
    const down = moveTechnologyGroup(data, "\ud800", 1);
    expect(down.groups.map((entry) => entry.id)).toEqual(["first", "third", "\ud800"]);
    expect(data.groups.map((entry) => entry.id)).toEqual(["first", "\ud800", "third"]);
  });

  it("ignores group boundaries, unknown groups and invalid runtime directions", () => {
    const data = freeze({ groups: [group("first", "First", []), group("last", "Last", [])] });
    expect(moveTechnologyGroup(data, "first", -1)).toBe(data);
    expect(moveTechnologyGroup(data, "last", 1)).toBe(data);
    expect(moveTechnologyGroup(data, "missing", 1)).toBe(data);
    expect(moveTechnologyGroup(data, "first", 0 as -1)).toBe(data);
  });

  it("swaps visible neighbors while empty unnamed groups retain their exact positions", () => {
    const first = group("first", "Frontend", [item("react", "React", "Keep context")]);
    const hidden = group("__proto__", "", []);
    const last = group("\ud800", "", [item("git", "Git")]);
    const data = freeze({ groups: [first, hidden, last] });
    const up = moveTechnologyGroup(data, "\ud800", -1);
    expect(up.groups.map((entry) => entry.id)).toEqual(["\ud800", "__proto__", "first"]);
    expect(up.groups).toEqual([last, hidden, first]);
    expect(up.groups[1]).toBe(hidden);
    expect(up.groups[0]).toBe(last);
    expect(up.groups[2]).toBe(first);
    const down = moveTechnologyGroup(data, "first", 1);
    expect(down.groups).toEqual([last, hidden, first]);
    expect(data.groups).toEqual([first, hidden, last]);
    expect(moduleContentSchemas.technologies.safeParse(up).success).toBe(true);
  });

  it("skips multiple whitespace-only empty groups and keeps them fixed", () => {
    const data = freeze({
      groups: [
        group("first", "A title alone is visible", []),
        group("hidden-one", " ", []),
        group("hidden-two", "\t\n", []),
        group("last", "Last", []),
      ],
    });
    const result = moveTechnologyGroup(data, "first", 1);
    expect(result.groups.map((entry) => entry.id)).toEqual([
      "last",
      "hidden-one",
      "hidden-two",
      "first",
    ]);
    expect(result.groups[1]).toBe(data.groups[1]);
    expect(result.groups[2]).toBe(data.groups[2]);
    expect(moveTechnologyGroup(data, "hidden-one", -1)).toBe(data);
    expect(moveTechnologyGroup(data, "hidden-one", 1)).toBe(data);
  });

  it("uses visible boundaries even when hidden groups precede or follow them", () => {
    const data = freeze({
      groups: [
        group("leading", "", []),
        group("first", "First", []),
        group("last", "", [item("git", "Git")]),
        group("trailing", " ", []),
      ],
    });
    expect(moveTechnologyGroup(data, "first", -1)).toBe(data);
    expect(moveTechnologyGroup(data, "last", 1)).toBe(data);
    const onlyVisible = freeze({ groups: [data.groups[0]!, data.groups[1]!, data.groups[3]!] });
    expect(moveTechnologyGroup(onlyVisible, "first", -1)).toBe(onlyVisible);
    expect(moveTechnologyGroup(onlyVisible, "first", 1)).toBe(onlyVisible);
  });

  it("moves one item while retaining all IDs, contexts and other groups", () => {
    const data = freeze({
      groups: [
        group("main", "", [
          item("react", "React"),
          item("\ud800", "Vue", "Personal context"),
          item("angular", "Angular"),
        ]),
        group("other", "Other", [item("git", "Git")]),
      ],
    });
    const up = reorderTechnologyItem(data, "main", "\ud800", -1);
    expect(up.groups[0]?.items.map((entry) => entry.id)).toEqual(["\ud800", "react", "angular"]);
    expect(up.groups[0]?.items[0]).toBe(data.groups[0]?.items[1]);
    expect(up.groups[1]).toBe(data.groups[1]);
    const down = reorderTechnologyItem(data, "main", "\ud800", 1);
    expect(down.groups[0]?.items.map((entry) => entry.id)).toEqual(["react", "angular", "\ud800"]);
    expect(data.groups[0]?.items.map((entry) => entry.id)).toEqual(["react", "\ud800", "angular"]);
  });

  it("ignores item boundaries and unknown entries without allocating another object", () => {
    const data = freeze({
      groups: [group("main", "", [item("first", "React"), item("last", "Vue")])],
    });
    expect(reorderTechnologyItem(data, "main", "first", -1)).toBe(data);
    expect(reorderTechnologyItem(data, "main", "last", 1)).toBe(data);
    expect(reorderTechnologyItem(data, "missing", "first", 1)).toBe(data);
    expect(reorderTechnologyItem(data, "main", "missing", 1)).toBe(data);
    expect(reorderTechnologyItem(data, "main", "first", 0 as 1)).toBe(data);
  });
});

describe("removing a category", () => {
  it("clears only the title, preserving its position, ID, item collection and contexts", () => {
    const data = freeze({
      groups: [
        group("first", "One", []),
        group("\ud800", "Frontend", [item("react", "React", "Keep my context")]),
        group("last", "Last", []),
      ],
    });
    const result = removeTechnologyCategory(data, "\ud800");
    expect(result.groups.map((entry) => entry.id)).toEqual(["first", "\ud800", "last"]);
    expect(result.groups[1]?.name).toBe("");
    expect(result.groups[1]?.items).toBe(data.groups[1]?.items);
    expect(result.groups[0]).toBe(data.groups[0]);
    expect(result.groups[2]).toBe(data.groups[2]);
    expect(data.groups[1]?.name).toBe("Frontend");
    expect(moduleContentSchemas.technologies.safeParse(result).success).toBe(true);
  });

  it("is a no-op for an unnamed or unknown category", () => {
    const data = freeze({ groups: [group("unnamed", "", [item("git", "Git")])] });
    expect(removeTechnologyCategory(data, "unnamed")).toBe(data);
    expect(removeTechnologyCategory(data, "missing")).toBe(data);
  });
});
