import { describe, expect, it } from "vitest";
import { technologyCatalog } from ".";
import {
  getTechnologyCategory,
  getTechnologyCategoryName,
  technologyCategoryIds,
} from "./categories";

describe("suggested technology categories", () => {
  it("offers nine named categories in English and Spanish", () => {
    expect(technologyCategoryIds).toHaveLength(9);
    for (const id of technologyCategoryIds) {
      expect(getTechnologyCategoryName(id, "en").trim()).not.toBe("");
      expect(getTechnologyCategoryName(id, "es").trim()).not.toBe("");
    }
    expect(getTechnologyCategoryName("data", "es")).toBe("Datos y mensajería");
  });

  it("has a curated suggestion for every catalog tool without classifying personal text", () => {
    for (const entry of technologyCatalog) {
      expect(getTechnologyCategory(entry.name), entry.name).not.toBeNull();
      for (const alias of entry.aliases)
        expect(getTechnologyCategory(alias)).toBe(getTechnologyCategory(entry.name));
    }
    expect(getTechnologyCategory("My small library")).toBeNull();
    expect(getTechnologyCategory("")).toBeNull();
  });

  it.each([
    ["TypeScript", "languages"],
    ["React", "frontend"],
    ["Node.js", "backend"],
    ["React Native", "mobile"],
    ["Prisma", "data"],
    ["Apache Kafka", "data"],
    ["Docker", "cloud"],
    ["Postman", "testing"],
    ["LangGraph", "ai"],
    ["Figma", "tools"],
  ] as const)("suggests %s in %s without consulting activity", (name, category) => {
    expect(getTechnologyCategory(name)).toBe(category);
  });
});
