import { describe, expect, it } from "vitest";
import { cardConfigJson } from "./card-config-json";

describe("card configuration serialization", () => {
  it("sorts object keys recursively while retaining the authored order of arrays", () => {
    const edited = {
      showRank: true,
      items: ["followers", "stars"],
      filters: { owners: ["zulu", "alpha"], first: false },
      gradient: { colors: ["#ffeeaa", "#112233"], angle: 45 },
    };
    const recovered = {
      filters: { first: false, owners: ["zulu", "alpha"] },
      gradient: { angle: 45, colors: ["#ffeeaa", "#112233"] },
      items: ["followers", "stars"],
      showRank: true,
    };
    expect(cardConfigJson(edited)).toBe(cardConfigJson(recovered));
    expect(JSON.parse(cardConfigJson(edited))).toEqual(edited);
    expect(JSON.parse(cardConfigJson(edited)).items).toEqual(["followers", "stars"]);
    expect(JSON.parse(cardConfigJson(edited)).gradient.colors).toEqual(["#ffeeaa", "#112233"]);
  });
});
