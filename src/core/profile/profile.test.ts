import { describe, expect, it, vi } from "vitest";
import { moduleIds } from "../modules/module-ids";
import {
  createContributorExampleProfile,
  createEmptyExampleProfile,
  createKnowledgeExampleProfile,
} from "./fixtures";
import {
  createEmptyProfile,
  createEmptyProfileV1,
  reorderModules,
  setModuleVisibility,
} from "./profile-operations";
import type { ProfileIssue, ProfileResult } from "./profile-result";
import { parseProfileDocument } from "./profile-validation";

function unwrap<T>(result: ProfileResult<T>): T {
  if (!result.success) throw new Error(`Expected success: ${JSON.stringify(result.errors)}`);
  return result.data;
}

function expectIssue(result: ProfileResult<unknown>, issue: ProfileIssue) {
  expect(result.success).toBe(false);
  if (result.success) throw new Error("Expected a rejected input.");
  expect(result.errors).toContainEqual(issue);
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) deepFreeze(child);
    Object.freeze(value);
  }
  return value;
}

/** Deliberately bypasses TypeScript for validation tests against imported, unknown data. */
function inputWithValue(path: readonly (string | number)[], value: unknown): unknown {
  const input = structuredClone(createContributorExampleProfile());
  let target = input as unknown as Record<string | number, unknown>;
  for (const part of path.slice(0, -1)) {
    target = target[part] as Record<string | number, unknown>;
  }
  const key = path.at(-1);
  if (key === undefined) throw new Error("A test input path must not be empty.");
  target[key] = value;
  return input;
}

const exampleFactories = [
  ["empty", createEmptyExampleProfile],
  ["knowledge", createKnowledgeExampleProfile],
  ["contributor", createContributorExampleProfile],
] as const;

describe("profile drafts and reference examples", () => {
  it.each(exampleFactories)(
    "accepts and round-trips the %s example as JSON",
    (_name, createExample) => {
      const profile = createExample();
      expect(unwrap(parseProfileDocument(profile))).toEqual(profile);
      expect(unwrap(parseProfileDocument(JSON.parse(JSON.stringify(profile))))).toEqual(profile);
    },
  );

  it("starts empty without requiring any public activity or personal data", () => {
    const profile = createEmptyProfile("en");
    expect(createEmptyExampleProfile()).toEqual(profile);
    expect(profile.schemaVersion).toBe(2);
    expect(profile.sectionOrder).toEqual(
      moduleIds.map((moduleId) => ({ kind: "module", moduleId })),
    );
    expect(profile.customSections).toEqual([]);
    expect(Object.values(profile.visibility)).toEqual(moduleIds.map(() => false));
    expect(profile.data.presentation).toEqual({
      displayName: "",
      headline: "",
      bio: "",
      location: "",
    });
    expect(profile.data.metrics).toEqual({ username: "", cards: [] });
    expect(profile.data.contact.links).toEqual([]);
    expect(profile.data.projects.items).toEqual([]);
    expect(unwrap(parseProfileDocument(profile))).toEqual(profile);
  });

  it("represents knowledge and education without contact, repositories or metrics", () => {
    const profile = createKnowledgeExampleProfile();
    expect(profile.contentLocale).toBe("es");
    expect(profile.visibility.knowledge).toBe(true);
    expect(profile.visibility.education).toBe(true);
    expect(profile.data.knowledge.items.length).toBeGreaterThan(0);
    expect(profile.data.education.items.length).toBeGreaterThan(0);
    expect(profile.data.projects.items).toEqual([]);
    expect(profile.data.contact.links).toEqual([]);
    expect(profile.data.metrics).toEqual({ username: "", cards: [] });
    expect(profile.visibility.metrics).toBe(false);
    expect(profile.visibility.contact).toBe(false);
    expect(profile.visibility.projects).toBe(false);
  });

  it("allows every module to contain data while metrics contain configuration only", () => {
    const profile = createContributorExampleProfile();
    expect(profile.contentLocale).toBe("en");
    expect(Object.values(profile.visibility).every(Boolean)).toBe(true);
    expect(profile.data.metrics).toEqual({
      username: "fictional-profile-example",
      cards: ["calendar", "summary", "languages"],
    });
    expect(profile.data.projects.items.length).toBeGreaterThan(0);
    expect(profile.data.contributions.items.length).toBeGreaterThan(0);
  });

  it("does not infer a content language or use time and random IDs", () => {
    vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("The factory must not read the clock.");
    });
    vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("The factory must not generate random values.");
    });
    expect(createEmptyProfile("es")).toEqual(createEmptyProfile("es"));
    expect(createEmptyProfile("es").contentLocale).toBe("es");
    expect(createEmptyProfile("en").contentLocale).toBe("en");
  });

  it.each(exampleFactories)("creates independent mutable %s examples", (_name, createExample) => {
    const first = createExample();
    const second = createExample();
    const originalSecond = structuredClone(second);
    first.data.presentation.displayName = "Changed";
    first.data.knowledge.items.push({ id: "new-knowledge", title: "", description: "" });
    first.data.technologies.groups.push({ id: "new-group", name: "", items: [] });
    first.data.education.items.push({
      id: "new-education",
      kind: null,
      title: "",
      institution: "",
      status: null,
      startDate: "",
      endDate: "",
      description: "",
      url: "",
    });
    first.data.current.items.push({ id: "new-current", kind: null, description: "", url: "" });
    first.data.projects.items.push({
      id: "new-project",
      name: "",
      description: "",
      role: "",
      technologies: [],
      links: [],
    });
    first.data.contributions.items.push({
      id: "new-contribution",
      title: "",
      description: "",
      url: "",
    });
    first.data.metrics.cards.push("summary");
    first.data.contact.links.push({ id: "new-contact", label: "", url: "" });
    first.sectionOrder.reverse();
    first.visibility.presentation = !first.visibility.presentation;
    expect(second).toEqual(originalSecond);
  });

  it("preserves incomplete text and links literally instead of sanitizing or completing drafts", () => {
    const profile = createEmptyProfile("es");
    profile.data.presentation.bio = "  Hola <script>alert('example')</script> & **texto**\n ";
    profile.data.education.items = [
      {
        id: "unfinished-education",
        kind: null,
        title: "",
        institution: "",
        status: null,
        startDate: "20",
        endDate: "",
        description: "",
        url: "https://",
      },
    ];
    profile.data.contact.links = [{ id: "unfinished-link", label: "", url: "javascript:example" }];
    profile.visibility.contact = true;
    expect(unwrap(parseProfileDocument(deepFreeze(profile)))).toEqual(profile);
  });

  it("allows an entry ID to be reused in independent collections", () => {
    const profile = createContributorExampleProfile();
    profile.data.knowledge.items[0]!.id = "independent-entry";
    profile.data.education.items[0]!.id = "independent-entry";
    expect(unwrap(parseProfileDocument(profile))).toEqual(profile);
  });
});

describe("invalid imported documents", () => {
  it.each([0, 3, "1", null])(
    "rejects unsupported schema version %j explicitly",
    (schemaVersion) => {
      expectIssue(parseProfileDocument({ ...createEmptyProfile("en"), schemaVersion }), {
        code: "unsupported_version",
        path: ["schemaVersion"],
      });
    },
  );

  it.each([null, [], "profile", 1, undefined])("rejects a non-document %j", (input) => {
    expectIssue(parseProfileDocument(input), { code: "invalid_type", path: [] });
  });

  it("rejects an unsupported content language", () => {
    expectIssue(parseProfileDocument(inputWithValue(["contentLocale"], "fr")), {
      code: "invalid_value",
      path: ["contentLocale"],
    });
  });

  it.each([
    ["data", "presentation", "displayName"],
    ["data", "education", "items"],
    ["visibility", "knowledge"],
  ])("rejects undefined instead of supplying a default at %j", (...path) => {
    expectIssue(parseProfileDocument(inputWithValue(path, undefined)), {
      code: "invalid_type",
      path,
    });
  });

  it.each([
    ["extra"],
    ["data", "extra"],
    ["visibility", "extra"],
    ["data", "presentation", "extra"],
    ["data", "knowledge", "extra"],
    ["data", "knowledge", "items", 0, "extra"],
    ["data", "technologies", "extra"],
    ["data", "technologies", "groups", 0, "extra"],
    ["data", "technologies", "groups", 0, "items", 0, "extra"],
    ["data", "education", "extra"],
    ["data", "education", "items", 0, "extra"],
    ["data", "current", "extra"],
    ["data", "current", "items", 0, "extra"],
    ["data", "projects", "extra"],
    ["data", "projects", "items", 0, "extra"],
    ["data", "projects", "items", 0, "links", 0, "extra"],
    ["data", "contributions", "extra"],
    ["data", "contributions", "items", 0, "extra"],
    ["data", "metrics", "extra"],
    ["data", "contact", "extra"],
    ["data", "contact", "links", 0, "extra"],
  ])("rejects an unknown property without discarding it at %j", (...path) => {
    expectIssue(parseProfileDocument(inputWithValue(path, "unexpected")), {
      code: "unknown_property",
      path,
    });
  });

  it("rejects remote counters in authored metric configuration", () => {
    expectIssue(parseProfileDocument(inputWithValue(["data", "metrics", "commits"], 0)), {
      code: "unknown_property",
      path: ["data", "metrics", "commits"],
    });
  });

  it("rejects duplicate and unknown metric cards", () => {
    expectIssue(
      parseProfileDocument(inputWithValue(["data", "metrics", "cards"], ["summary", "summary"])),
      {
        code: "duplicate_card",
        path: ["data", "metrics", "cards", 1],
      },
    );
    expectIssue(parseProfileDocument(inputWithValue(["data", "metrics", "cards"], ["ranking"])), {
      code: "invalid_value",
      path: ["data", "metrics", "cards", 0],
    });
  });

  it.each([
    ["knowledge", "items"],
    ["technologies", "groups"],
    ["technologies", "groups", 0, "items"],
    ["education", "items"],
    ["current", "items"],
    ["projects", "items"],
    ["projects", "items", 0, "links"],
    ["contributions", "items"],
    ["contact", "links"],
  ])("rejects repeated entry IDs inside %j", (...collectionPath) => {
    const profile = createContributorExampleProfile();
    const path = ["data", ...collectionPath];
    let collection: unknown = profile;
    for (const part of path) collection = (collection as Record<string | number, unknown>)[part];
    if (!Array.isArray(collection)) throw new Error("Expected an example collection.");
    const first = collection[0];
    expectIssue(parseProfileDocument(inputWithValue(path, [first, structuredClone(first)])), {
      code: "duplicate_id",
      path: [...path, 1, "id"],
    });
  });

  it.each(["", "   ", "\n\t"])("rejects an empty entry ID %j", (id) => {
    expectIssue(parseProfileDocument(inputWithValue(["data", "knowledge", "items", 0, "id"], id)), {
      code: "invalid_id",
      path: ["data", "knowledge", "items", 0, "id"],
    });
  });
});

describe("module visibility and order operations", () => {
  it.each(moduleIds)(
    "hides and restores %s without changing authored data or order",
    (moduleId) => {
      const original = deepFreeze(createContributorExampleProfile());
      const before = structuredClone(original);
      const hidden = unwrap(setModuleVisibility(original, moduleId, false));
      expect(hidden.visibility).toEqual({ ...before.visibility, [moduleId]: false });
      expect(hidden.data).toEqual(before.data);
      expect(hidden.sectionOrder).toEqual(before.sectionOrder);
      const restored = unwrap(setModuleVisibility(deepFreeze(hidden), moduleId, true));
      expect(restored).toEqual(before);
      expect(original).toEqual(before);
      expect(hidden.visibility[moduleId]).toBe(false);
    },
  );

  it.each(["unknown", "__proto__", "constructor", null, 1])(
    "rejects unknown module %j",
    (moduleId) => {
      expectIssue(setModuleVisibility(createEmptyProfile("en"), moduleId, true), {
        code: "unknown_module",
        path: ["moduleId"],
      });
    },
  );

  it.each(["false", 0, null, undefined])("rejects a non-boolean visibility %j", (visible) => {
    expectIssue(setModuleVisibility(createEmptyProfile("en"), "knowledge", visible), {
      code: "invalid_type",
      path: ["visible"],
    });
  });

  it("reorders all modules including hidden ones without changing content or locale", () => {
    const original = deepFreeze(createKnowledgeExampleProfile());
    const before = structuredClone(original);
    const order = [...moduleIds].reverse();
    const reordered = unwrap(reorderModules(original, order));
    expect(reordered).toEqual({
      ...before,
      sectionOrder: order.map((moduleId) => ({ kind: "module", moduleId })),
    });
    expect(original).toEqual(before);
    order.reverse();
    expect(reordered.sectionOrder).toEqual(
      [...moduleIds].reverse().map((moduleId) => ({ kind: "module", moduleId })),
    );
    expect(unwrap(parseProfileDocument(reordered))).toEqual(reordered);
  });

  it.each([
    {
      name: "incomplete",
      order: moduleIds.slice(1),
      issue: { code: "invalid_order", path: ["moduleOrder"] },
    },
    { name: "empty", order: [], issue: { code: "invalid_order", path: ["moduleOrder"] } },
    {
      name: "duplicate",
      order: [...moduleIds.slice(0, -1), "presentation"],
      issue: { code: "invalid_order", path: ["moduleOrder", 8] },
    },
    {
      name: "unknown",
      order: [...moduleIds.slice(0, -1), "unknown"],
      issue: { code: "unknown_module", path: ["moduleOrder", 8] },
    },
    {
      name: "non-array",
      order: "presentation",
      issue: { code: "invalid_type", path: ["moduleOrder"] },
    },
  ] as const)("rejects $name orders in both imported data and operations", ({ order, issue }) => {
    const original = deepFreeze(createContributorExampleProfile());
    const before = structuredClone(original);
    expectIssue(reorderModules(original, order), issue);
    expectIssue(
      parseProfileDocument({
        ...createEmptyProfileV1(original.contentLocale),
        data: original.data,
        visibility: original.visibility,
        moduleOrder: order,
      }),
      issue,
    );
    expect(original).toEqual(before);
  });
});
