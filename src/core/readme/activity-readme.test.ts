import { describe, expect, it } from "vitest";
import { createEmptyProfile } from "../profile/profile-operations";
import { generateReadme } from "./generate-readme";

function activityProfile() {
  const profile = createEmptyProfile("en");
  profile.visibility.metrics = true;
  profile.data.metrics = { username: "@Alex-Example", cards: ["calendar", "summary", "languages"] };
  return profile;
}

describe("one optional activity and contributions section", () => {
  it("renders a metrics-only saved profile at the contributions slot once", () => {
    const profile = activityProfile();
    profile.visibility.contact = true;
    profile.data.contact.links = [{ id: "mail", label: "Email", url: "mailto:alex@example.com" }];
    profile.sectionOrder = [
      { kind: "module", moduleId: "metrics" },
      ...profile.sectionOrder.filter(
        (reference) => reference.kind !== "module" || reference.moduleId !== "metrics",
      ),
    ];
    const original = structuredClone(profile);
    const result = generateReadme(profile, { activityCardBaseUrl: "https://profiles.example.com" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.exportIssues).toBeUndefined();
    expect(result.markdown.match(/^## Activity & contributions$/gm)).toHaveLength(1);
    expect(result.markdown.match(/!\[/g)).toHaveLength(3);
    expect(result.markdown).toContain(
      "https://profiles.example.com/cards/github/alex-example/calendar.svg?locale=en",
    );
    expect(result.markdown.indexOf("## Activity")).toBeLessThan(
      result.markdown.indexOf("## Contact"),
    );
    expect(profile).toEqual(original);
  });

  it("allows local preview but explicitly prevents publishing local card URLs", () => {
    const result = generateReadme(activityProfile());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.markdown).toContain("](/cards/github/alex-example/calendar.svg?locale=en)");
    expect(result.exportIssues).toEqual([
      { code: "activity_not_configured", path: ["data", "metrics"] },
    ]);
    expect(result.markdown).not.toContain("| [![");
  });

  it("keeps selected card order in two-column rows and gives an odd card its own row", () => {
    const profile = activityProfile();
    profile.data.metrics.cardColumns = 2;
    const result = generateReadme(profile, { activityCardBaseUrl: "https://profiles.example.com" });
    expect(result.success).toBe(true);
    if (!result.success) return;

    const calendar = result.markdown.indexOf("[![GitHub contribution calendar");
    const summary = result.markdown.indexOf("[![GitHub activity summary");
    const languages = result.markdown.indexOf("[![Languages in analyzed repositories");
    expect(calendar).toBeGreaterThanOrEqual(0);
    expect(calendar).toBeLessThan(summary);
    expect(summary).toBeLessThan(languages);
    expect(result.markdown).toContain("| --- | --- |");
    expect(result.markdown).toContain("| --- |");
    expect(result.markdown.match(/^\| \[!\[/gm)).toHaveLength(2);
    expect(result.markdown.match(/^\| \[!\[.*\| \[!\[/gm)).toHaveLength(1);
  });

  it("keeps manual content exportable after excluding cards without deleting choices", () => {
    const profile = activityProfile();
    profile.visibility.metrics = false;
    profile.visibility.contributions = true;
    profile.data.contributions.items = [
      { id: "own", title: "A clearer guide", description: "Helped others get started", url: "" },
    ];
    const result = generateReadme(profile);
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.exportIssues).toBeUndefined();
    expect(result.markdown).toContain("A clearer guide");
    expect(result.markdown).not.toContain("cards/github");
    expect(profile.data.metrics.cards).toHaveLength(3);
  });

  it("exports manual contributions without a host or username when no cards are selected", () => {
    const profile = activityProfile();
    profile.visibility.contributions = true;
    profile.data.metrics = { username: "not/a/username", cards: [] };
    profile.data.contributions.items = [
      { id: "guide", title: "A useful guide", description: "", url: "" },
    ];
    const result = generateReadme(profile, { activityCardBaseUrl: "http://localhost:3000" });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.exportIssues).toBeUndefined();
    expect(result.markdown).toContain("A useful guide");
    expect(result.activityCards).toBeUndefined();
  });

  it("combines cards and highlights, preserving private hidden manual entries", () => {
    const profile = activityProfile();
    profile.data.contributions.items = [
      { id: "saved", title: "My own contribution", description: "", url: "" },
    ];
    const hidden = generateReadme(profile);
    expect(hidden.success && hidden.markdown).not.toContain("My own contribution");
    profile.visibility.contributions = true;
    profile.contentLocale = "es";
    const shown = generateReadme(profile);
    expect(shown.success && shown.markdown).toContain("### Aportes destacados");
    expect(shown.success && shown.markdown).toContain("?locale=es");
  });

  it("validates a username only for selected visible cards", () => {
    const profile = activityProfile();
    profile.data.metrics.username = "https://example.com/";
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "invalid_username", path: ["data", "metrics", "username"] }],
    });
    profile.visibility.metrics = false;
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "empty_profile", path: [] }],
    });
  });
});
