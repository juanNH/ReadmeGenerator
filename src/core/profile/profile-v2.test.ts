import { describe, expect, it, vi } from "vitest";
import { moduleIds } from "../modules/module-ids";
import type { CustomBlock } from "./custom-content";
import { createContributorExampleProfile, createCustomExampleProfile } from "./fixtures";
import {
  addCustomSection,
  createEmptyProfile,
  createEmptyProfileV1,
  duplicateCustomSection,
  removeCustomSection,
  reorderModules,
  reorderSections,
  setCustomSectionVisibility,
  updateCustomSection,
} from "./profile-operations";
import type { ProfileIssue, ProfileResult } from "./profile-result";
import type { ProfileDocumentV1 } from "./profile-schema";
import { profileDocumentSchema, profileDocumentV1Schema } from "./profile-schema";
import { migrateProfileV1, parseProfileDocument } from "./profile-validation";

function unwrap<T>(result: ProfileResult<T>): T {
  if (!result.success) throw new Error(`Expected success: ${JSON.stringify(result.errors)}`);
  return result.data;
}

function expectIssue(result: ProfileResult<unknown>, issue: ProfileIssue) {
  expect(result.success).toBe(false);
  if (result.success) throw new Error("Expected a rejected operation.");
  expect(result.errors).toContainEqual(issue);
}

function freeze<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}

function sequence(...ids: string[]): () => string {
  let index = 0;
  return () => ids[index++] ?? `generated-${index}`;
}

function legacyContributor(): ProfileDocumentV1 {
  const current = createContributorExampleProfile();
  return {
    ...createEmptyProfileV1(current.contentLocale),
    data: current.data,
    visibility: current.visibility,
    moduleOrder: [...moduleIds].reverse(),
  };
}

/** Deliberately unknown inputs verify that no newer or nested fields are silently removed. */
function changedInput(path: readonly (string | number)[], value: unknown): unknown {
  const document = structuredClone(createCustomExampleProfile());
  let target = document as unknown as Record<string | number, unknown>;
  for (const key of path.slice(0, -1)) target = target[key] as Record<string | number, unknown>;
  target[path.at(-1)!] = value;
  return document;
}

describe("version-one recovery into the current document", () => {
  it("migrates every fixed slot, hidden data, retired fields, opaque IDs and metric flags exactly", () => {
    const legacy = legacyContributor();
    legacy.visibility.contributions = false;
    legacy.visibility.metrics = true;
    legacy.visibility.contact = false;
    legacy.data.contact.links[0]!.id = "\ud800__proto__";
    legacy.data.education.items[0]!.url = "javascript:retired-draft";
    const original = structuredClone(legacy);
    const migrated = migrateProfileV1(freeze(legacy));
    expect(migrated).toEqual({
      schemaVersion: 2,
      contentLocale: legacy.contentLocale,
      data: legacy.data,
      visibility: legacy.visibility,
      sectionOrder: legacy.moduleOrder.map((moduleId) => ({ kind: "module", moduleId })),
      customSections: [],
    });
    expect(migrated).not.toHaveProperty("moduleOrder");
    expect(legacy).toEqual(original);
    expect(unwrap(parseProfileDocument(legacy))).toEqual(migrated);
    expect(unwrap(parseProfileDocument(JSON.parse(JSON.stringify(legacy))))).toEqual(migrated);
    expect(unwrap(parseProfileDocument(migrated))).toEqual(migrated);
    expect(migrated.data).not.toBe(legacy.data);
    migrated.data.contact.links[0]!.label = "Independent migrated copy";
    expect(legacy.data.contact.links[0]!.label).not.toBe("Independent migrated copy");
  });

  it("needs no clock, randomness or generated identities", () => {
    const legacy = legacyContributor();
    vi.spyOn(Date, "now").mockImplementation(() => {
      throw new Error("Migration must not read time");
    });
    vi.spyOn(Math, "random").mockImplementation(() => {
      throw new Error("Migration must not generate IDs");
    });
    expect(migrateProfileV1(legacy)).toEqual(migrateProfileV1(legacy));
    expect(createEmptyProfile("es").schemaVersion).toBe(2);
    expect(createEmptyProfileV1("es").schemaVersion).toBe(1);
  });

  it("validates the exact legacy format before migration instead of accepting v2 fields", () => {
    const legacy = legacyContributor();
    expect(profileDocumentV1Schema.safeParse(legacy).success).toBe(true);
    expectIssue(parseProfileDocument({ ...legacy, customSections: [] }), {
      code: "unknown_property",
      path: ["customSections"],
    });
    expectIssue(parseProfileDocument({ ...legacy, sectionOrder: [] }), {
      code: "unknown_property",
      path: ["sectionOrder"],
    });
    expectIssue(parseProfileDocument({ ...legacy, moduleOrder: moduleIds.slice(1) }), {
      code: "invalid_order",
      path: ["moduleOrder"],
    });
  });
});

describe("strict mixed section documents", () => {
  it("accepts repeated titles and IDs reused only in independent collections", () => {
    const document = createCustomExampleProfile();
    expect(unwrap(parseProfileDocument(freeze(document)))).toEqual(document);
    expect(document.customSections[0]?.title).toBe(document.customSections[1]?.title);
    expect(profileDocumentSchema.safeParse(document).success).toBe(true);
    expect(unwrap(parseProfileDocument(JSON.parse(JSON.stringify(document))))).toEqual(document);
  });

  it("does not confuse a custom identity with a fixed module ID", () => {
    const document = unwrap(addCustomSection(createEmptyProfile("en"), () => "presentation"));
    expect(document.sectionOrder).toContainEqual({ kind: "module", moduleId: "presentation" });
    expect(document.sectionOrder).toContainEqual({ kind: "custom", sectionId: "presentation" });
    expect(unwrap(parseProfileDocument(document))).toEqual(document);
  });

  it("rejects missing, repeated and unknown fixed module references", () => {
    const document = createEmptyProfile("en");
    expectIssue(
      parseProfileDocument({ ...document, sectionOrder: document.sectionOrder.slice(1) }),
      {
        code: "invalid_order",
        path: ["sectionOrder"],
      },
    );
    expectIssue(
      parseProfileDocument({
        ...document,
        sectionOrder: [...document.sectionOrder, document.sectionOrder[0]],
      }),
      { code: "invalid_order", path: ["sectionOrder", 9] },
    );
    expectIssue(
      parseProfileDocument({
        ...document,
        sectionOrder: [{ kind: "module", moduleId: "unknown" }, ...document.sectionOrder.slice(1)],
      }),
      { code: "unknown_module", path: ["sectionOrder", 0, "moduleId"] },
    );
  });

  it("rejects an orphaned instance, dangling reference and duplicate custom reference", () => {
    const document = createCustomExampleProfile();
    expectIssue(
      parseProfileDocument({
        ...document,
        sectionOrder: document.sectionOrder.filter(
          (entry) => entry.kind !== "custom" || entry.sectionId !== document.customSections[0]!.id,
        ),
      }),
      { code: "invalid_reference", path: ["customSections", 0, "id"] },
    );
    expectIssue(
      parseProfileDocument({
        ...document,
        sectionOrder: [...document.sectionOrder, { kind: "custom", sectionId: "missing" }],
      }),
      {
        code: "invalid_reference",
        path: ["sectionOrder", document.sectionOrder.length, "sectionId"],
      },
    );
    expectIssue(
      parseProfileDocument({
        ...document,
        sectionOrder: [
          ...document.sectionOrder,
          { kind: "custom", sectionId: document.customSections[0]!.id },
        ],
      }),
      { code: "invalid_order", path: ["sectionOrder", document.sectionOrder.length] },
    );
  });

  it.each([
    ["moduleOrder"],
    ["sectionOrder", 0, "extra"],
    ["customSections", 0, "extra"],
    ["customSections", 0, "blocks", 0, "html"],
    ["customSections", 0, "blocks", 1, "items", 0, "extra"],
    ["customSections", 0, "blocks", 2, "image"],
  ])("rejects unknown fields without discarding their content: %j", (...path) => {
    expectIssue(parseProfileDocument(changedInput(path, "unrecognized")), {
      code: "unknown_property",
      path,
    });
  });

  it.each([
    ["customSections", 0, "id"],
    ["customSections", 0, "blocks", 0, "id"],
    ["customSections", 0, "blocks", 1, "items", 0, "id"],
  ])("rejects a blank identity at %j", (...path) => {
    expectIssue(parseProfileDocument(changedInput(path, " \t")), {
      code: "invalid_id",
      path,
    });
  });

  it("rejects duplicate IDs inside sections, blocks or list items", () => {
    const document = createCustomExampleProfile();
    const section = document.customSections[0]!;
    const list = section.blocks.find((block) => block.type === "list")!;
    expectIssue(parseProfileDocument({ ...document, customSections: [section, section] }), {
      code: "duplicate_id",
      path: ["customSections", 1, "id"],
    });
    expectIssue(
      parseProfileDocument(
        changedInput(["customSections", 0, "blocks"], [section.blocks[0], section.blocks[0]]),
      ),
      { code: "duplicate_id", path: ["customSections", 0, "blocks", 1, "id"] },
    );
    expectIssue(
      parseProfileDocument(
        changedInput(["customSections", 0, "blocks", 1, "items"], [list.items[0], list.items[0]]),
      ),
      { code: "duplicate_id", path: ["customSections", 0, "blocks", 1, "items", 1, "id"] },
    );
  });

  it("keeps incomplete custom fields literal and leaves URL export checks to the generator", () => {
    const document = createCustomExampleProfile();
    document.customSections[0]!.title = "";
    document.customSections[0]!.blocks = [
      { id: "p", type: "paragraph", text: "  <script>x</script>\n- not parsed at recovery" },
      { id: "l", type: "list", style: "ordered", items: [{ id: "empty", text: "" }] },
      { id: "url", type: "link", label: "", url: "javascript:unfinished" },
    ];
    expect(unwrap(parseProfileDocument(document))).toEqual(document);
  });
});

describe("additive custom block types in version two", () => {
  const addedBlocks: CustomBlock[] = [
    { id: "heading-\ud800", type: "heading", text: "A heading <with> [plain] text" },
    { id: "divider", type: "divider" },
    { id: "quote", type: "quote", text: "Own words\n\nA second paragraph" },
    {
      id: "image",
      type: "image",
      url: "https://cdn.example.com/render?size=640",
      alt: "A project preview",
    },
  ];

  it.each(addedBlocks)(
    "round-trips a $type block without introducing another document version",
    (block) => {
      const document = createCustomExampleProfile();
      document.customSections[0]!.blocks = [structuredClone(block)];
      const original = structuredClone(document);
      expect(unwrap(parseProfileDocument(freeze(document)))).toEqual(original);
      expect(unwrap(parseProfileDocument(JSON.parse(JSON.stringify(document))))).toEqual(original);
      expect(document.schemaVersion).toBe(2);
      expect(document.sectionOrder).toEqual(original.sectionOrder);
    },
  );

  it("continues accepting old v2 blocks without introducing required properties", () => {
    const document = createCustomExampleProfile();
    expect(unwrap(parseProfileDocument(document))).toEqual(document);
    expect(document.customSections[0]!.blocks).toEqual([
      { id: "paragraph", type: "paragraph", text: "Simple, accessible interfaces." },
      {
        id: "list",
        type: "list",
        style: "unordered",
        items: [
          { id: "one", text: "Sharing clear documentation" },
          { id: "two", text: "Building small useful tools" },
        ],
      },
      {
        id: "link",
        type: "link",
        label: "Fictional notes",
        url: "https://example.com/fictional-notes",
      },
    ]);
  });

  it("preserves empty headings, quotes and image fields as incomplete draft content", () => {
    const document = createCustomExampleProfile();
    document.customSections[0]!.blocks = [
      { id: "heading", type: "heading", text: "" },
      { id: "divider", type: "divider" },
      { id: "quote", type: "quote", text: "" },
      { id: "image", type: "image", url: "", alt: "" },
      { id: "invalid-image", type: "image", url: "javascript:unfinished", alt: "" },
    ];
    expect(unwrap(parseProfileDocument(document))).toEqual(document);
  });

  it.each(addedBlocks)(
    "rejects unknown properties in a $type block instead of discarding them",
    (block) => {
      expectIssue(
        parseProfileDocument(
          changedInput(["customSections", 0, "blocks"], [{ ...block, arbitrary: "unrecognized" }]),
        ),
        { code: "unknown_property", path: ["customSections", 0, "blocks", 0, "arbitrary"] },
      );
    },
  );

  it.each([
    [{ id: "h", type: "heading" }, "text"],
    [{ id: "q", type: "quote" }, "text"],
    [{ id: "i", type: "image", url: "https://cdn.example.com/image" }, "alt"],
    [{ id: "i", type: "image", alt: "Description" }, "url"],
  ])(
    "requires the declared string fields even while permitting empty drafts: %j",
    (block, field) => {
      expectIssue(parseProfileDocument(changedInput(["customSections", 0, "blocks"], [block])), {
        code: "invalid_type",
        path: ["customSections", 0, "blocks", 0, field as string],
      });
    },
  );

  it("duplicates a mixed old/new tree with independent objects, fresh identities and the same order", () => {
    const document = createCustomExampleProfile();
    const source = document.customSections[0]!;
    source.visible = false;
    source.blocks.splice(1, 0, ...structuredClone(addedBlocks));
    const original = structuredClone(document);
    freeze(document);
    const duplicate = unwrap(duplicateCustomSection(document, source.id, sequence()));
    const copy = duplicate.customSections.at(-1)!;
    expect(copy.id).not.toBe(source.id);
    expect(copy.title).toBe(source.title);
    expect(copy.visible).toBe(false);
    expect(copy.blocks.map((block) => block.type)).toEqual(
      source.blocks.map((block) => block.type),
    );
    const oldIds = new Set([
      source.id,
      ...source.blocks.flatMap((block) =>
        block.type === "list" ? [block.id, ...block.items.map((item) => item.id)] : [block.id],
      ),
    ]);
    const newIds = [copy.id];
    for (const [index, block] of copy.blocks.entries()) {
      const previous = source.blocks[index]!;
      expect(block).not.toBe(previous);
      expect(oldIds.has(block.id)).toBe(false);
      newIds.push(block.id);
      if (block.type === "list" && previous.type === "list") {
        expect(block.style).toBe(previous.style);
        expect(block.items.map((item) => item.text)).toEqual(
          previous.items.map((item) => item.text),
        );
        for (const [itemIndex, item] of block.items.entries()) {
          expect(item).not.toBe(previous.items[itemIndex]);
          expect(oldIds.has(item.id)).toBe(false);
          newIds.push(item.id);
        }
      } else {
        expect({ ...block, id: previous.id }).toEqual(previous);
      }
    }
    expect(new Set(newIds).size).toBe(newIds.length);
    expect(duplicate.data).toBe(document.data);
    expect(duplicate.visibility).toBe(document.visibility);
    expect(document).toEqual(original);
    const image = copy.blocks.find((block) => block.type === "image")!;
    image.alt = "Changed in the copy only";
    const quote = copy.blocks.find((block) => block.type === "quote")!;
    quote.text = "Changed quote";
    expect(source.blocks.find((block) => block.type === "image")!.alt).toBe("A project preview");
    expect(source.blocks.find((block) => block.type === "quote")!.text).toBe(
      "Own words\n\nA second paragraph",
    );
    const sourceIndex = duplicate.sectionOrder.findIndex(
      (reference) => reference.kind === "custom" && reference.sectionId === source.id,
    );
    expect(duplicate.sectionOrder[sourceIndex + 1]).toEqual({ kind: "custom", sectionId: copy.id });
    expect(unwrap(parseProfileDocument(duplicate))).toEqual(duplicate);
  });
});

describe("custom instance operations", () => {
  it("adds independent empty included sections with opaque IDs at explicit positions", () => {
    const original = freeze(createEmptyProfile("es"));
    const first = unwrap(
      addCustomSection(original, () => "__proto__", { kind: "module", moduleId: "technologies" }),
    );
    const second = unwrap(addCustomSection(first, () => "\ud800"));
    expect(first.customSections).toEqual([
      { id: "__proto__", title: "", visible: true, blocks: [] },
    ]);
    expect(first.sectionOrder[3]).toEqual({ kind: "custom", sectionId: "__proto__" });
    expect(second.customSections[1]).toEqual({
      id: "\ud800",
      title: "",
      visible: true,
      blocks: [],
    });
    expect(second.sectionOrder.at(-1)).toEqual({ kind: "custom", sectionId: "\ud800" });
    expect(original.customSections).toEqual([]);
    expect(second.data).toBe(original.data);
    expect(second.visibility).toBe(original.visibility);
    expect(unwrap(parseProfileDocument(second))).toEqual(second);
  });

  it("does not allocate or change anything for an unknown insertion reference", () => {
    const document = freeze(createEmptyProfile("en"));
    const createId = vi.fn(() => "unused");
    expectIssue(addCustomSection(document, createId, { kind: "custom", sectionId: "missing" }), {
      code: "unknown_section",
      path: ["after"],
    });
    expect(createId).not.toHaveBeenCalled();
    expect(document.customSections).toEqual([]);
  });

  it("validates replacement data, fixes the identity and avoids aliasing the supplied tree", () => {
    const document = freeze(createCustomExampleProfile());
    const source = document.customSections[0]!;
    const value = structuredClone(source);
    value.title = "My exact own title";
    const result = unwrap(updateCustomSection(document, source.id, value));
    expect(result.customSections[0]).toEqual(value);
    expect(result.customSections[0]).not.toBe(value);
    expect(result.customSections[1]).toBe(document.customSections[1]);
    expect(result.sectionOrder).toBe(document.sectionOrder);
    value.blocks[0] = { id: "replacement", type: "paragraph", text: "External later change" };
    expect(result.customSections[0]!.blocks[0]).toEqual(source.blocks[0]);
    expectIssue(updateCustomSection(document, source.id, { ...source, id: "renamed" }), {
      code: "invalid_id",
      path: ["customSections", 0, "id"],
    });
    expectIssue(updateCustomSection(document, source.id, { ...source, extra: true }), {
      code: "unknown_property",
      path: ["customSections", 0, "extra"],
    });
  });

  it("hides and restores only the requested section without rewriting data or flags", () => {
    const document = freeze(createCustomExampleProfile());
    const section = document.customSections[0]!;
    const hidden = unwrap(setCustomSectionVisibility(document, section.id, false));
    expect(hidden.customSections[0]).toEqual({ ...section, visible: false });
    expect(hidden.customSections[0]!.blocks).toBe(section.blocks);
    expect(hidden.data).toBe(document.data);
    expect(hidden.visibility).toBe(document.visibility);
    expect(hidden.sectionOrder).toBe(document.sectionOrder);
    expect(unwrap(setCustomSectionVisibility(hidden, section.id, true))).toEqual(document);
    expect(unwrap(setCustomSectionVisibility(hidden, section.id, false))).toBe(hidden);
    expectIssue(setCustomSectionVisibility(document, section.id, "false"), {
      code: "invalid_type",
      path: ["visible"],
    });
  });

  it("duplicates every nested identity and tree while preserving exact text, order and visibility", () => {
    const document = createCustomExampleProfile();
    document.customSections[0]!.visible = false;
    const source = document.customSections[0]!;
    freeze(document);
    const result = unwrap(
      duplicateCustomSection(
        document,
        source.id,
        sequence("copy", "p-copy", "list-copy", "one-copy", "two-copy", "link-copy"),
      ),
    );
    const copy = result.customSections.at(-1)!;
    expect(copy).toEqual({
      id: "copy",
      title: source.title,
      visible: false,
      blocks: [
        { ...source.blocks[0], id: "p-copy" },
        {
          id: "list-copy",
          type: "list",
          style: "unordered",
          items: [
            { id: "one-copy", text: "Sharing clear documentation" },
            { id: "two-copy", text: "Building small useful tools" },
          ],
        },
        { ...source.blocks[2], id: "link-copy" },
      ],
    });
    expect(copy).not.toBe(source);
    expect(copy.blocks).not.toBe(source.blocks);
    copy.blocks.forEach((block, index) => expect(block).not.toBe(source.blocks[index]));
    const copiedList = copy.blocks[1]!;
    const sourceList = source.blocks[1]!;
    if (copiedList.type !== "list" || sourceList.type !== "list")
      throw new Error("Expected list blocks");
    expect(copiedList.items).not.toBe(sourceList.items);
    copiedList.items.forEach((item, index) => expect(item).not.toBe(sourceList.items[index]));
    const index = result.sectionOrder.findIndex(
      (entry) => entry.kind === "custom" && entry.sectionId === source.id,
    );
    expect(result.sectionOrder[index + 1]).toEqual({ kind: "custom", sectionId: "copy" });
    expect(
      result.sectionOrder.filter((entry) => entry.kind !== "custom" || entry.sectionId !== "copy"),
    ).toEqual(document.sectionOrder);
    expect(result.data).toBe(document.data);
    expect(result.visibility).toBe(document.visibility);
    copiedList.items[0]!.text = "Changed only in the copy";
    expect(sourceList.items[0]!.text).toBe("Sharing clear documentation");
    expect(unwrap(parseProfileDocument(result))).toEqual(result);
  });

  it("retries blank, original and previously allocated identities without reusing them", () => {
    const document = freeze(createCustomExampleProfile());
    const result = unwrap(
      duplicateCustomSection(
        document,
        document.customSections[0]!.id,
        sequence(
          "",
          "paragraph",
          "copy",
          "copy",
          "p-copy",
          "list-copy",
          "one-copy",
          "two-copy",
          "link-copy",
        ),
      ),
    );
    expect(result.customSections.at(-1)!.id).toBe("copy");
    expect(result.customSections.at(-1)!.blocks[0]!.id).toBe("p-copy");
    expect(unwrap(parseProfileDocument(result))).toEqual(result);
  });

  it("fails atomically when ID allocation fails midway through a clone", () => {
    const document = freeze(createCustomExampleProfile());
    const before = structuredClone(document);
    let index = 0;
    const createId = () => ["copy", "p-copy"][index++] ?? "paragraph";
    expectIssue(duplicateCustomSection(document, document.customSections[0]!.id, createId), {
      code: "id_generation_failed",
      path: ["customSections"],
    });
    expect(document).toEqual(before);
  });

  it("reports failures rather than adding partial sections with an invalid ID supplier", () => {
    const document = freeze(createCustomExampleProfile());
    for (const createId of [
      () => " ",
      () => "paragraph",
      () => {
        throw new Error("Unavailable IDs");
      },
    ]) {
      expectIssue(addCustomSection(document, createId), {
        code: "id_generation_failed",
        path: ["customSections"],
      });
    }
    expect(document.customSections).toHaveLength(2);
  });

  it("removes only one instance and reference while preserving all other positions and objects", () => {
    const document = freeze(createCustomExampleProfile());
    const section = document.customSections[0]!;
    const result = unwrap(removeCustomSection(document, section.id));
    expect(result.customSections).toEqual([document.customSections[1]]);
    expect(result.customSections[0]).toBe(document.customSections[1]);
    expect(result.sectionOrder).toEqual(
      document.sectionOrder.filter(
        (entry) => entry.kind !== "custom" || entry.sectionId !== section.id,
      ),
    );
    expect(result.data).toBe(document.data);
    expect(result.visibility).toBe(document.visibility);
    expect(unwrap(parseProfileDocument(result))).toEqual(result);
  });

  it.each([undefined, null, 1, "", "  ", "missing"])(
    "rejects an invalid or unknown custom identity %j",
    (id) => {
      const document = freeze(createCustomExampleProfile());
      const createId = vi.fn(() => "unused");
      const operations = [
        removeCustomSection(document, id),
        setCustomSectionVisibility(document, id, true),
        updateCustomSection(document, id, document.customSections[0]),
        duplicateCustomSection(document, id, createId),
      ];
      for (const operation of operations) expect(operation.success).toBe(false);
      expect(createId).not.toHaveBeenCalled();
      expect(document.customSections).toHaveLength(2);
    },
  );
});

describe("one mixed section order", () => {
  it("reorders both kinds without mutating the input, authored data or external order array", () => {
    const document = freeze(createCustomExampleProfile());
    const order = [...document.sectionOrder].reverse();
    const result = unwrap(reorderSections(document, order));
    expect(result.sectionOrder).toEqual(order);
    expect(result.data).toBe(document.data);
    expect(result.visibility).toBe(document.visibility);
    expect(result.customSections).toBe(document.customSections);
    order.reverse();
    expect(result.sectionOrder).toEqual([...document.sectionOrder].reverse());
    expect(unwrap(parseProfileDocument(result))).toEqual(result);
    expect(unwrap(reorderSections(document, structuredClone(document.sectionOrder)))).toBe(
      document,
    );
  });

  it("rejects dangling, orphaned and duplicate mixed references atomically", () => {
    const document = freeze(createCustomExampleProfile());
    const before = structuredClone(document);
    for (const order of [
      [],
      "custom",
      [...document.sectionOrder, { kind: "custom", sectionId: "missing" }],
      [...document.sectionOrder, document.sectionOrder.at(-1)],
      document.sectionOrder.filter((entry) => entry.kind !== "custom"),
    ])
      expect(reorderSections(document, order).success).toBe(false);
    expect(document).toEqual(before);
  });

  it("keeps custom slots fixed when callers use the legacy module-only reorder API", () => {
    const document = freeze(createCustomExampleProfile());
    const result = unwrap(reorderModules(document, [...moduleIds].reverse()));
    expect(
      result.sectionOrder.filter((entry) => entry.kind === "module").map((entry) => entry.moduleId),
    ).toEqual([...moduleIds].reverse());
    document.sectionOrder.forEach((entry, index) => {
      if (entry.kind === "custom") expect(result.sectionOrder[index]).toEqual(entry);
    });
    expect(result).not.toHaveProperty("moduleOrder");
    expect(unwrap(parseProfileDocument(result))).toEqual(result);
  });
});
