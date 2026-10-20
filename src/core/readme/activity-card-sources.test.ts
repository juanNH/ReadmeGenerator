import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "../profile/profile-operations";
import { generateReadme } from "./generate-readme";

function profile() {
  const document = createEmptyProfile("en");
  document.visibility.metrics = true;
  document.data.metrics = {
    username: "example-dev",
    cards: ["extended-stats", "extended-repository", "extended-gist", "extended-wakatime"],
    extended: {
      stats: { items: ["commits", "followers"] },
      repositories: ["owner/first", "owner/second"],
      gists: ["abcde"],
      wakatimeUsername: "public-example",
    },
  };
  return document;
}

describe("derived activity card sources", () => {
  it.each([undefined, "https://cards.example.com"])(
    "matches the generated Markdown exactly with base %s",
    (activityCardBaseUrl) => {
      const result = generateReadme(profile(), { activityCardBaseUrl });
      expect(result.success).toBe(true);
      if (!result.success) return;
      expect(result.activityCards).toHaveLength(5);
      const markdownTargets = [...result.markdown.matchAll(/\]\(([^)]+)\)/g)].map(
        (match) => match[1],
      );
      expect(markdownTargets).toEqual(result.activityCards?.flatMap((url) => [url, url]));
      expect(
        result.activityCards?.every((url) => url.startsWith(activityCardBaseUrl ?? "/cards/")),
      ).toBe(true);
    },
  );

  it("omits metadata for hidden cards and retains manual contributions", () => {
    const document = profile();
    document.visibility.metrics = false;
    document.visibility.contributions = true;
    document.data.contributions.items = [
      { id: "manual", title: "Documentation", description: "Public guide", url: "" },
    ];
    const result = generateReadme(document);
    expect(result).toMatchObject({ success: true });
    expect(result).not.toHaveProperty("activityCards");
  });

  it("does not return partial approval metadata when card configuration is invalid", () => {
    const document = profile();
    document.data.metrics.username = "not a username";
    const result = generateReadme(document);
    expect(result.success).toBe(false);
    expect(result).not.toHaveProperty("activityCards");
  });

  it("does not treat a card URL inside literal code as a generated activity card", () => {
    const document = createEmptyProfile("en");
    document.customSections = [
      {
        id: "example",
        title: "",
        visible: true,
        blocks: [
          {
            id: "code",
            type: "code",
            language: "",
            source: "![card](/cards/github/example-dev/summary.svg?locale=en)",
          },
        ],
      },
    ];
    document.sectionOrder.push({ kind: "custom", sectionId: "example" });
    const result = generateReadme(document);
    expect(result).toMatchObject({ success: true });
    expect(result).not.toHaveProperty("activityCards");
  });
});
