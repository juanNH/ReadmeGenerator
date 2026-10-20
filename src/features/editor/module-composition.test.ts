import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import { moduleIds } from "@/core/modules/module-ids";
import type { ProfileDocument } from "@/core/profile/profile-schema";
import {
  moveVisibleModule,
  editableModuleIds,
  isModuleIncluded,
  setEditableModuleVisibility,
  isEditableModuleId,
  moveVisibleModuleToIndex,
  visibleEditableModules,
  editableSectionIds,
  visibleEditableSections,
  moveVisibleSectionToIndex,
  getCustomSection,
  setSectionVisibility,
  sectionHasErrors,
} from "./module-composition";

function fixedOrder(document: ProfileDocument) {
  return document.sectionOrder.flatMap((reference) =>
    reference.kind === "module" ? [reference.moduleId] : [],
  );
}

function example() {
  const profile = createEmptyProfile("en");
  profile.visibility.technologies = true;
  profile.visibility.projects = true;
  profile.visibility.contributions = true;
  profile.visibility.knowledge = true;
  profile.visibility.education = true;
  profile.visibility.current = true;
  profile.visibility.metrics = true;
  profile.data.education.items = [
    {
      id: "\ud800",
      kind: null,
      title: "Studies",
      institution: "",
      status: null,
      startDate: "",
      endDate: "",
      description: "",
      url: "",
    },
  ];
  return profile;
}

describe("visible module composition", () => {
  it("keeps repeated custom titles and opaque identities separate from fixed modules", () => {
    const profile = example();
    profile.customSections = [
      { id: "presentation", title: "My section", visible: true, blocks: [] },
      { id: "\ud800", title: "My section", visible: false, blocks: [] },
    ];
    profile.sectionOrder.splice(3, 0, { kind: "custom", sectionId: "presentation" });
    profile.sectionOrder.push({ kind: "custom", sectionId: "\ud800" });
    expect(editableSectionIds(profile)).toContain("custom:presentation");
    expect(visibleEditableSections(profile)).toEqual([
      "technologies",
      "custom:presentation",
      "projects",
      "contributions",
    ]);
    expect(getCustomSection(profile, "custom:presentatio")).toBeUndefined();
    const next = moveVisibleSectionToIndex(profile, "custom:presentation", 0);
    if (!next.success) throw new Error("Mixed sections must be reorderable.");
    expect(visibleEditableSections(next.data)).toEqual([
      "custom:presentation",
      "technologies",
      "projects",
      "contributions",
    ]);
    expect(next.data.sectionOrder.at(-1)).toEqual({ kind: "custom", sectionId: "\ud800" });
    expect(next.data.data).toBe(profile.data);
    const hidden = setSectionVisibility(next.data, "custom:presentation", false);
    if (!hidden.success) throw new Error("Custom visibility must be editable.");
    expect(hidden.data.customSections[0]?.visible).toBe(false);
    expect(profile.customSections[0]?.visible).toBe(true);
    expect(
      sectionHasErrors(profile, "custom:presentatio", [
        { code: "invalid_url", path: ["customSections", 0, "blocks", 0, "url"] },
      ]),
    ).toBe(false);
    expect(
      sectionHasErrors(profile, "custom:presentation", [
        { code: "invalid_url", path: ["customSections", 0, "blocks", 0, "url"] },
      ]),
    ).toBe(true);
  });
  it("includes a metrics-only saved document as one contributions section without normalizing it", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.metrics = true;
    profile.data.metrics = { username: "alex", cards: ["calendar"] };
    const before = structuredClone(profile);
    expect(visibleEditableModules(profile)).toEqual(["contributions"]);
    expect(isModuleIncluded(profile, "contributions")).toBe(true);
    expect(profile).toEqual(before);
  });

  it("hides and restores the whole group while preserving selections and nine slots", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.metrics = true;
    profile.data.metrics = { username: "alex", cards: ["languages"] };
    const hidden = setEditableModuleVisibility(profile, "contributions", false);
    expect(hidden.success).toBe(true);
    if (!hidden.success) return;
    expect(hidden.data.visibility.metrics).toBe(false);
    expect(hidden.data.visibility.contributions).toBe(false);
    expect(hidden.data.data).toBe(profile.data);
    const restored = setEditableModuleVisibility(hidden.data, "contributions", true);
    expect(restored.success).toBe(true);
    if (!restored.success) return;
    expect(restored.data.visibility.contributions).toBe(true);
    expect(restored.data.visibility.metrics).toBe(true);
    expect(fixedOrder(restored.data)).toEqual(fixedOrder(profile));
    expect(restored.data.data).toBe(profile.data);
  });

  it("moves a metrics-only group at the contributions slot and leaves the metric slot fixed", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.metrics = true;
    profile.visibility.contact = true;
    const result = moveVisibleModule(profile, "contributions", "down");
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(visibleEditableModules(result.data)).toEqual(["contact", "contributions"]);
    expect(fixedOrder(result.data).indexOf("metrics")).toBe(fixedOrder(profile).indexOf("metrics"));
    expect(profile.visibility.contributions).toBe(false);
  });
  it("offers exactly five sections without changing the stored nine slots", () => {
    const profile = createEmptyProfile("en");
    expect(editableModuleIds).toEqual([
      "presentation",
      "technologies",
      "projects",
      "contributions",
      "contact",
    ]);
    expect(fixedOrder(profile)).toEqual(moduleIds);
  });

  it("never offers retired sections even when saved as visible with entries", () => {
    const profile = createEmptyProfile("en");
    profile.data.knowledge.items = [{ id: "saved", title: "", description: "My words" }];
    profile.visibility.current = true;
    profile.visibility.knowledge = true;
    profile.visibility.education = true;
    expect(visibleEditableModules(profile)).toEqual([]);
    expect(isEditableModuleId("knowledge")).toBe(false);
    expect(isEditableModuleId("education")).toBe(false);
    expect(isEditableModuleId("current")).toBe(false);
    expect(profile.visibility.knowledge).toBe(true);
  });
  it("selects visible manual modules in their authored order", () => {
    const profile = example();
    profile.sectionOrder.reverse();
    expect(visibleEditableModules(profile)).toEqual(["contributions", "projects", "technologies"]);
  });

  it.each(["up", "down"] as const)(
    "moves a module %s without moving hidden slots or metrics",
    (direction) => {
      const profile = example();
      const original = structuredClone(profile);
      const result = moveVisibleModule(profile, "projects", direction);
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(visibleEditableModules(result.data)).toEqual(
        direction === "up"
          ? ["projects", "technologies", "contributions"]
          : ["technologies", "contributions", "projects"],
      );
      for (const [index, id] of fixedOrder(profile).entries()) {
        if (!isEditableModuleId(id) || !profile.visibility[id])
          expect(fixedOrder(result.data)[index]).toBe(id);
      }
      expect(result.data.data).toBe(profile.data);
      expect(result.data.visibility).toBe(profile.visibility);
      expect([...fixedOrder(result.data)].sort()).toEqual([...moduleIds].sort());
      expect(profile).toEqual(original);
    },
  );

  it.each([
    ["technologies", "up"],
    ["contributions", "down"],
    ["presentation", "up"],
  ] as const)("leaves %s unchanged when it cannot move %s", (id, direction) => {
    const profile = example();
    expect(moveVisibleModule(profile, id, direction)).toEqual({ success: true, data: profile });
  });

  it("keeps the order when a moved section is hidden and shown again", () => {
    const result = moveVisibleModule(example(), "projects", "up");
    if (!result.success) throw new Error("The sample must be reorderable.");
    const originalOrder = [...fixedOrder(result.data)];
    result.data.visibility.projects = false;
    expect(visibleEditableModules(result.data)).toEqual(["technologies", "contributions"]);
    result.data.visibility.projects = true;
    expect(visibleEditableModules(result.data)).toEqual([
      "projects",
      "technologies",
      "contributions",
    ]);
    expect(fixedOrder(result.data)).toEqual(originalOrder);
  });

  it.each([
    ["technologies", 2, ["projects", "contributions", "technologies"]],
    ["contributions", 0, ["contributions", "technologies", "projects"]],
    ["projects", 0, ["projects", "technologies", "contributions"]],
    ["technologies", 1, ["projects", "technologies", "contributions"]],
  ] as const)("moves %s to visible index %i without changing hidden slots", (id, index, order) => {
    const profile = example();
    const original = structuredClone(profile);
    const result = moveVisibleModuleToIndex(profile, id, index);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(visibleEditableModules(result.data)).toEqual(order);
    for (const [slot, moduleId] of fixedOrder(profile).entries()) {
      if (!isEditableModuleId(moduleId) || !profile.visibility[moduleId])
        expect(fixedOrder(result.data)[slot]).toBe(moduleId);
    }
    expect(result.data.data).toBe(profile.data);
    expect(result.data.visibility).toBe(profile.visibility);
    expect(result.data.sectionOrder).not.toBe(profile.sectionOrder);
    expect(fixedOrder(result.data)).toHaveLength(9);
    expect([...fixedOrder(result.data)].sort()).toEqual([...moduleIds].sort());
    expect(profile).toEqual(original);
  });

  it.each([-1, 3, 1.5, Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY])(
    "ignores invalid visible index %s without mutating the document",
    (index) => {
      const profile = example();
      const result = moveVisibleModuleToIndex(profile, "projects", index);
      expect(result.success).toBe(true);
      if (result.success) expect(result.data).toBe(profile);
    },
  );

  it("keeps the same document for the current index, a hidden module or no visible modules", () => {
    const profile = example();
    const currentIndex = moveVisibleModuleToIndex(profile, "projects", 1);
    const hidden = moveVisibleModuleToIndex(profile, "presentation", 0);
    expect(currentIndex.success).toBe(true);
    expect(hidden.success).toBe(true);
    if (currentIndex.success) expect(currentIndex.data).toBe(profile);
    if (hidden.success) expect(hidden.data).toBe(profile);
    const empty = createEmptyProfile("es");
    const withoutVisibleModules = moveVisibleModuleToIndex(empty, "technologies", 0);
    expect(withoutVisibleModules.success).toBe(true);
    if (withoutVisibleModules.success) expect(withoutVisibleModules.data).toBe(empty);
  });
});
