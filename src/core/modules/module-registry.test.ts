import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { defaultModuleOrder, isModuleId, moduleIds } from "./module-ids";
import { moduleRegistry } from "./module-registry";

describe("profile module registry", () => {
  it("exposes exactly the nine independent product sections", () => {
    const expectedIds = [
      "presentation",
      "knowledge",
      "technologies",
      "education",
      "current",
      "projects",
      "contributions",
      "metrics",
      "contact",
    ];
    expect(moduleIds).toEqual(expectedIds);
    expect(new Set(moduleIds).size).toBe(9);
    expect(Object.keys(moduleRegistry).sort()).toEqual([...expectedIds].sort());
    expect(defaultModuleOrder).toEqual(expectedIds);
  });

  it.each(moduleIds)(
    "associates %s with valid fresh draft data and English/Spanish labels",
    (id) => {
      const definition = moduleRegistry[id];
      const data = definition.createEmptyData();
      expect(definition.id).toBe(id);
      expect(definition.schema.safeParse(data).success).toBe(true);
      expect(definition.createEmptyData()).toEqual(data);
      expect(definition.createEmptyData()).not.toBe(data);
      expect(en.Modules[definition.labelKey].trim().length).toBeGreaterThan(0);
      expect(es.Modules[definition.labelKey].trim().length).toBeGreaterThan(0);
      expect(isModuleId(id)).toBe(true);
    },
  );

  it.each(["", "unknown", "__proto__", "constructor", null, undefined, {}, 1])(
    "does not accept an unknown identifier %j",
    (id) => {
      expect(isModuleId(id)).toBe(false);
    },
  );
});
