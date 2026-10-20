import { describe, expect, it } from "vitest";
import { profileActivityCardIds as metricCardIds } from "../profile/module-content";
import type { ActivitySnapshot } from "./activity-types";
import { renderActivityCard, renderActivityUnavailable } from "./render-card";

function snapshot(): ActivitySnapshot {
  return {
    username: "sample-developer",
    fetchedAt: "2026-10-19T00:30:00Z",
    period: { from: "2025-10-19", to: "2026-10-19" },
    calendar: {
      total: 19,
      includesPrivateCounts: false,
      weeks: [
        { days: [{ date: "2026-10-18", count: 0, level: 0 }] },
        { days: [{ date: "2026-10-19", count: 19, level: 4 }] },
      ],
    },
    summary: { commits: 12, pullRequests: 3, issues: 1, reviews: 2 },
    languages: {
      items: [
        { name: "JavaScript", bytes: 200, color: "#f1e05a" },
        { name: "TypeScript", bytes: 600, color: "#3178c6" },
      ],
      repositoriesAnalyzed: 3,
      repositoriesTotal: 3,
      truncated: false,
    },
    highlights: [],
  };
}

describe("public activity SVG cards", () => {
  it.each(metricCardIds)("renders %s as a standalone accessible, responsive image", (card) => {
    const svg = renderActivityCard(snapshot(), card, "en");
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www.w3.org\/2000\/svg"/);
    expect(svg).toContain('viewBox="0 0 700 ');
    expect(svg).toContain('role="img" aria-labelledby="card-title card-description"');
    expect(svg).toContain('<title id="card-title">');
    expect(svg).toContain('<desc id="card-description">');
    expect(svg).toContain("@sample-developer");
    expect(svg).toContain("Updated: Oct 19, 2026 (UTC)");
    expect(svg).not.toMatch(/<script|<foreignObject|<image|<a\s|\bon\w+=|\b(?:href|src)=/i);
    expect(svg).not.toContain("Last available data");
  });

  it.each(metricCardIds)("labels stale %s data without replacing its genuine counts", (card) => {
    const svg = renderActivityCard(snapshot(), card, "es", { stale: true });
    expect(svg).toContain("Últimos datos disponibles");
    expect(svg).toMatch(/<desc id="card-description">[^<]*Últimos datos disponibles/);
    expect(svg).toContain("Actualizado: 19 de oct de 2026 (UTC)");
    expect(svg).not.toContain("no están disponibles temporalmente");
  });

  it("renders calendar dates and counts independently of the host time zone", () => {
    const svg = renderActivityCard(snapshot(), "calendar", "en");
    expect(svg).toContain("Oct 19, 2025 – Oct 19, 2026");
    expect(svg).toContain("Oct 18, 2026: 0");
    expect(svg).toContain("Oct 19, 2026: 19");
    expect(svg).toContain("19 contributions in this period");
  });

  it("explains opted-in private aggregates without inventing private details", () => {
    const value = snapshot();
    value.calendar.includesPrivateCounts = true;
    const svg = renderActivityCard(value, "calendar", "en");
    expect(svg).toContain("Includes anonymous private counts shared on GitHub.");
    expect(svg).not.toContain("restrictedContributionsCount");
  });

  it("treats a real zero-activity calendar as a successful empty state", () => {
    const value = snapshot();
    value.calendar.total = 0;
    value.calendar.weeks = [{ days: [{ date: "2026-10-19", count: 0, level: 0 }] }];
    const svg = renderActivityCard(value, "calendar", "en");
    expect(svg).toContain("No contributions recorded in this period.");
    expect(svg).toContain("Oct 19, 2026: 0");
    expect(svg).not.toContain("temporarily unavailable");
  });

  it("shows the four summary counts without asserting their sum equals the calendar", () => {
    const svg = renderActivityCard(snapshot(), "summary", "en");
    expect(svg).toContain("Commits: 12. Pull requests: 3. Issues: 1. Reviews: 2.");
    expect(svg).toContain("The calendar can include other types of contributions.");
    expect(svg).not.toContain("19 contributions");
  });

  it("keeps genuine zero summary counts visible", () => {
    const value = snapshot();
    value.summary = { commits: 0, pullRequests: 0, issues: 0, reviews: 0 };
    const svg = renderActivityCard(value, "summary", "es");
    expect(svg).toContain("Commits: 0. Pull requests: 0. Issues: 0. Revisiones: 0.");
    expect(svg).not.toContain("temporalmente");
  });

  it("uses compact large counts visually while keeping exact counts in the description", () => {
    const value = snapshot();
    value.summary.commits = 1_234_567;
    const svg = renderActivityCard(value, "summary", "en");
    expect(svg).toContain("Commits: 1,234,567");
    expect(svg).toContain(">1.2M</text>");
  });

  it("shows code-byte proportions and explains repository scope without skill claims", () => {
    const svg = renderActivityCard(snapshot(), "languages", "en");
    expect(svg).toContain(">75%</text>");
    expect(svg).toContain(">25%</text>");
    expect(svg.indexOf(">TypeScript</text>")).toBeLessThan(svg.indexOf(">JavaScript</text>"));
    expect(svg).toContain("3 of 3 public, owned repositories analyzed. Forks excluded.");
    expect(svg).toContain("this does not measure skill");
    expect(svg).toContain("Repository snapshot; not limited to the contribution period.");
    expect(svg).not.toContain("Oct 19, 2025 – Oct 19, 2026");
  });

  it("limits visible language bars to ten while retaining the complete byte denominator", () => {
    const value = snapshot();
    value.languages.items = Array.from({ length: 12 }, (_, index) => ({
      name: `Language ${index.toString().padStart(2, "0")}`,
      bytes: 100,
      color: null,
    }));
    const svg = renderActivityCard(value, "languages", "en");
    expect(svg.match(/>8\.3%<\/text>/g)).toHaveLength(10);
    expect(svg).toContain(">Language 09</text>");
    expect(svg).not.toContain(">Language 10</text>");
  });

  it("identifies a truncated repository or language sample", () => {
    const value = snapshot();
    value.languages.repositoriesTotal = 20;
    value.languages.truncated = true;
    const svg = renderActivityCard(value, "languages", "es");
    expect(svg).toContain("3 de 20 repositorios públicos propios analizados. Sin forks.");
    expect(svg).toContain("Muestra parcial: se alcanzaron límites de repositorios o lenguajes.");
  });

  it.each([{ items: [] }, { items: [{ name: "No code", bytes: 0, color: null }] }])(
    "explains an empty language result without fake percentage bars: $items",
    ({ items }) => {
      const value = snapshot();
      value.languages.items = items;
      const svg = renderActivityCard(value, "languages", "en");
      expect(svg).toContain("No language data in the public repositories analyzed.");
      expect(svg).not.toContain('x="224"');
      expect(svg).not.toContain("NaN");
      expect(svg).not.toContain("temporarily unavailable");
    },
  );

  it("escapes untrusted text and ignores unsafe language colors", () => {
    const value = snapshot();
    value.username = 'a<image href="x"/> & b';
    value.languages.items = [{ name: '<script>"&', bytes: 100, color: 'url("https://evil.test")' }];
    const svg = renderActivityCard(value, "languages", "en");
    expect(svg).toContain("&lt;script&gt;&quot;&amp;");
    expect(svg).toContain("a&lt;image href=&quot;x&quot;/&gt; &amp; b");
    expect(svg).not.toContain("https://evil.test");
    expect(svg).not.toMatch(/<script|<image|\bfill="url/);
    expect(svg).toContain('fill="#327c50"');
  });

  it("removes forbidden XML characters and bounds displayed language names", () => {
    const value = snapshot();
    value.languages.items = [
      { name: `Safe\u0000\ud800${"x".repeat(2000)}`, bytes: 1, color: null },
    ];
    const svg = renderActivityCard(value, "languages", "en");
    expect(svg).not.toContain("\u0000");
    expect(svg).not.toContain("\ud800");
    expect(svg).not.toContain("x".repeat(501));
    expect(svg).toContain(">Safe");
  });

  it("never mutates the remote snapshot or reorders its language collection", () => {
    const value = snapshot();
    const before = JSON.stringify(value);
    for (const card of metricCardIds) {
      expect(renderActivityCard(value, card, "en")).toBe(renderActivityCard(value, card, "en"));
    }
    expect(JSON.stringify(value)).toBe(before);
  });

  it.each(metricCardIds)("distinguishes unavailable %s data from a valid zero result", (card) => {
    const svg = renderActivityUnavailable(card, "en");
    expect(svg).toContain("GitHub data is temporarily unavailable.");
    expect(svg).toContain("No activity figures are displayed.");
    expect(svg).not.toContain("Updated:");
    expect(svg).not.toMatch(/>0<\/text>|>0%<\/text>/);
    expect(svg).not.toContain("sample-developer");
  });
});
