import { describe, expect, it } from "vitest";
import { reorderContributionItem } from "./contribution-operations";

describe("reorderContributionItem", () => {
  it("moves the selected complete contribution while preserving identities and fields", () => {
    const first = { id: "first", title: "First", links: [{ id: "link", url: "one" }] };
    const second = { id: "second", title: "Second", images: [{ id: "image", alt: "Two" }] };
    const original = [first, second];

    const moved = reorderContributionItem(original, "second", -1);

    expect(moved).toEqual([second, first]);
    expect(moved[0]).toBe(second);
    expect(moved[1]).toBe(first);
    expect(original).toEqual([first, second]);
  });

  it.each([
    ["first", -1],
    ["last", 1],
    ["missing", 1],
  ] as const)("does not change the array when a move is out of bounds (%s)", (id, direction) => {
    const items = [{ id: "first" }, { id: "last" }];
    expect(reorderContributionItem(items, id, direction)).toBe(items);
  });
});
