import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import { moduleIds } from "@/core/modules/module-ids";
import {
  moveVisibleModule,
  editableModuleIds,
  isModuleIncluded,
  setEditableModuleVisibility,
  isEditableModuleId,
  moveVisibleModuleToIndex,
  visibleEditableModules,
} from "./module-composition";

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
    expect(restored.data.moduleOrder).toEqual(profile.moduleOrder);
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
    expect(result.data.moduleOrder.indexOf("metrics")).toBe(profile.moduleOrder.indexOf("metrics"));
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
    expect(profile.moduleOrder).toEqual(moduleIds);
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
    profile.moduleOrder.reverse();
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
      for (const [index, id] of profile.moduleOrder.entries()) {
        if (!isEditableModuleId(id) || !profile.visibility[id])
          expect(result.data.moduleOrder[index]).toBe(id);
      }
      expect(result.data.data).toBe(profile.data);
      expect(result.data.visibility).toBe(profile.visibility);
      expect([...result.data.moduleOrder].sort()).toEqual([...moduleIds].sort());
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
    const originalOrder = [...result.data.moduleOrder];
    result.data.visibility.projects = false;
    expect(visibleEditableModules(result.data)).toEqual(["technologies", "contributions"]);
    result.data.visibility.projects = true;
    expect(visibleEditableModules(result.data)).toEqual([
      "projects",
      "technologies",
      "contributions",
    ]);
    expect(result.data.moduleOrder).toEqual(originalOrder);
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
    for (const [slot, moduleId] of profile.moduleOrder.entries()) {
      if (!isEditableModuleId(moduleId) || !profile.visibility[moduleId])
        expect(result.data.moduleOrder[slot]).toBe(moduleId);
    }
    expect(result.data.data).toBe(profile.data);
    expect(result.data.visibility).toBe(profile.visibility);
    expect(result.data.moduleOrder).not.toBe(profile.moduleOrder);
    expect(result.data.moduleOrder).toHaveLength(9);
    expect([...result.data.moduleOrder].sort()).toEqual([...moduleIds].sort());
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
