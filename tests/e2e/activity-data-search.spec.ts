import { expect, test, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import type { ExtendedProfileSnapshot } from "../../src/core/activity/extended-types";
import { extendedStatIds } from "../../src/core/activity/extended-options";
import { activityDataStubs, localCardSvg } from "./helpers/activity-fixtures";

const draftKey = "github-profile-generator.profile.v2";
const ownLabels = [
  "Contribution calendar",
  "Activity summary",
  "Repository languages",
  "Activity panorama",
  "Activity by month",
];
const search = (page: Page) => page.getByRole("button", { name: "Search data", exact: true });

function profile() {
  const document = createEmptyProfile("en");
  document.visibility.metrics = true;
  document.visibility.contributions = true;
  document.data.metrics = { username: "example-dev", cards: ["summary"] };
  return document;
}

async function open(page: Page, document: ProfileDocument) {
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(document),
  });
  await page.goto("/en/editor");
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
}

async function ready(page: Page, count: number) {
  const images = page.getByRole("article").locator("img");
  await expect(images).toHaveCount(count);
  await expect
    .poll(() =>
      images.evaluateAll((nodes) =>
        nodes.every(
          (node) =>
            (node as HTMLImageElement).complete && (node as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true);
}

for (const locale of ["en", "es"] as const) {
  test(`search works without cards and appears directly below the username in ${locale}`, async ({
    page,
  }) => {
    const stubs = activityDataStubs(page);
    await stubs.ready;
    const document = profile();
    document.data.metrics.cards = [];
    document.data.metrics.username = "";
    await page.goto(`/${locale}`);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: draftKey,
      value: JSON.stringify(document),
    });
    await page.goto(`/${locale}/editor`);
    await page
      .getByRole("button", {
        name: locale === "en" ? "Activity & contributions" : "Actividad y contribuciones",
        exact: true,
      })
      .click();
    await page
      .getByText(
        locale === "en" ? "GitHub activity (optional)" : "Actividad de GitHub (opcional)",
        { exact: true },
      )
      .click();
    const username = page.getByRole("textbox", {
      name: locale === "en" ? "GitHub username" : "Usuario de GitHub",
      exact: true,
    });
    const button = page.getByRole("button", {
      name: locale === "en" ? "Search data" : "Buscar datos",
      exact: true,
    });
    await expect(button).toBeDisabled();
    await username.fill("example-dev");
    await expect(button).toBeEnabled();
    const bounds = await username.boundingBox();
    const buttonBounds = await button.boundingBox();
    const choices = page.getByRole("group", {
      name: locale === "en" ? "What would you like to include?" : "¿Qué te gustaría incluir?",
      exact: true,
    });
    const choicesBounds = await choices.boundingBox();
    expect(buttonBounds!.y).toBeGreaterThanOrEqual(bounds!.y + bounds!.height);
    expect(buttonBounds!.y + buttonBounds!.height).toBeLessThanOrEqual(choicesBounds!.y);
    expect(stubs.requests).toEqual([]);
    await button.click();
    await expect.poll(() => stubs.requests.length).toBe(2);
    await expect(button).toHaveAttribute("aria-busy", "false");
    await expect(page.getByRole("article").locator("img")).toHaveCount(0);
    const extended = stubs.requests.find((url) => url.pathname.endsWith("extended"))!;
    expect(extended.searchParams.has("languages")).toBe(true);
    // The percentage is derived from the two underlying public counters.
    expect(JSON.parse(extended.searchParams.get("stats") ?? "{}").items).toEqual(
      extendedStatIds.filter((id) => id !== "mergedPullRequestPercentage"),
    );
    await page
      .getByRole("checkbox", {
        name: locale === "en" ? "Activity summary" : "Resumen de actividad",
        exact: true,
      })
      .check();
    await ready(page, 1);
    expect(stubs.requests).toHaveLength(2);
    expect(stubs.cardRequests).toEqual([]);
  });
}

test("rapid repository scope changes are grouped and fetched automatically after the account is searched", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  const document = profile();
  document.data.metrics.cards = ["extended-stats"];
  document.data.metrics.extended = { stats: { items: ["stars"] } };
  await open(page, document);
  await search(page).click();
  await ready(page, 1);
  await page.getByText("Extended statistics and language options", { exact: true }).click();
  await page.getByText("Statistics and optional rank", { exact: true }).click();
  await page.getByText("Public repository filters", { exact: true }).first().click();
  for (const name of ["Owner", "Organization member", "Collaborator"]) {
    const checkbox = page.getByRole("checkbox", { name, exact: true });
    await checkbox.focus();
    await checkbox.press("Space");
  }
  await expect.poll(() => stubs.requests.length).toBe(3);
  await ready(page, 1);
  const options = JSON.parse(stubs.requests.at(-1)!.searchParams.get("stats") ?? "{}");
  expect(new Set(options.roles)).toEqual(new Set(["OWNER", "ORGANIZATION_MEMBER", "COLLABORATOR"]));
  expect(new Set(options.items)).toEqual(
    new Set(
      extendedStatIds.filter((id) => id !== "mergedPullRequestPercentage" && id !== "followers"),
    ),
  );
  expect(await localCardSvg(page)).toContain("Stars received");
  expect(stubs.cardRequests).toEqual([]);
});

test("partial search without cards reports the failed source and reuses available summary data", async ({
  page,
}) => {
  await page.clock.install({ time: new Date() });
  const stubs = activityDataStubs(page);
  await stubs.ready;
  stubs.failNext("/api/github/extended");
  const document = profile();
  document.data.metrics.cards = [];
  await open(page, document);
  await search(page).click();
  const status = page.getByRole("status").filter({ hasText: "Some data is available." });
  await expect(status).toBeVisible();
  await expect(status).toContainText(
    "GitHub activity could not be loaded. Try again; you can keep editing your profile.",
  );
  await expect(search(page)).toBeEnabled();
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  expect(stubs.requests.map((url) => url.pathname).sort()).toEqual([
    "/api/github/activity",
    "/api/github/extended",
  ]);
  await page.getByRole("checkbox", { name: "Activity summary", exact: true }).check();
  await ready(page, 1);
  await page.clock.runFor(1_000);
  expect(stubs.requests).toHaveLength(2);
  expect(stubs.cardRequests).toEqual([]);
  await expect(page.getByRole("button", { name: "Retry card", exact: true })).toHaveCount(0);
});

test("searching without cards loads all eighteen counters before selection, toggling or hiding", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  const document = profile();
  document.data.metrics.cards = [];
  await open(page, document);
  await search(page).click();
  await expect.poll(() => stubs.requests.length).toBe(2);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Extended activity summary", exact: true }).check();
  await ready(page, 1);
  await page.getByText("Extended statistics and language options", { exact: true }).click();
  await page.getByText("Statistics and optional rank", { exact: true }).click();
  const labels = [
    "Stars received",
    "Commits",
    "Pull requests",
    "Issues",
    "Reviews",
    "Repositories contributed to in the period",
    "All-time contributions",
    "All-time repositories contributed to",
    "Discussions started",
    "Discussions answered",
    "Merged pull requests",
    "Merged pull request percentage",
    "Authored pull requests",
    "Commented pull requests",
    "Reviewed pull requests",
    "Authored issues",
    "Commented issues",
    "Followers",
  ];
  for (const name of labels) {
    await page.getByRole("checkbox", { name, exact: true }).check();
    await ready(page, 1);
  }
  await expect.poll(() => localCardSvg(page)).toContain("Pull requests merged");
  const fullSvg = await localCardSvg(page);
  for (const label of [
    "All-time contributions",
    "All-time repositories contributed to",
    "Discussions started",
    "Discussions answered",
    "Followers",
    "100%",
  ])
    expect(fullSvg).toContain(label);
  expect(fullSvg).not.toContain(">—</text>");
  expect(stubs.requests).toHaveLength(2);
  for (const name of labels) {
    const checkbox = page.getByRole("checkbox", { name, exact: true });
    await checkbox.uncheck();
    await ready(page, 1);
    await checkbox.check();
    await ready(page, 1);
  }
  const selection = page.getByRole("checkbox", { name: "Extended activity summary", exact: true });
  await selection.uncheck();
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  await selection.check();
  await ready(page, 1);
  const section = page.getByRole("checkbox", { name: "Activity & contributions", exact: true });
  await section.uncheck();
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  await section.check();
  await ready(page, 1);
  expect(stubs.requests).toHaveLength(2);
  expect(stubs.cardRequests).toEqual([]);
});

test("searching without cards respects current year and repository filters before selection", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  const document = profile();
  document.data.metrics.cards = [];
  document.data.metrics.extended = {
    stats: { commitsPeriod: "year", year: 2024, owners: ["octocat"] },
    languages: { owners: ["sample-org"], roles: ["COLLABORATOR"] },
  };
  await open(page, document);
  expect(stubs.requests).toEqual([]);
  await search(page).click();
  await expect.poll(() => stubs.requests.length).toBe(2);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  const request = stubs.requests.find((url) => url.pathname.endsWith("extended"))!;
  expect(JSON.parse(request.searchParams.get("stats") ?? "{}")).toMatchObject({
    commitsPeriod: "year",
    year: 2024,
    owners: ["octocat"],
  });
  expect(JSON.parse(request.searchParams.get("languages") ?? "{}")).toMatchObject({
    owners: ["sample-org"],
    roles: ["COLLABORATOR"],
  });
  await page.getByRole("checkbox", { name: "Extended activity summary", exact: true }).check();
  await page.getByRole("checkbox", { name: "Extended repository languages", exact: true }).check();
  await ready(page, 2);
  expect(await localCardSvg(page)).toContain("2024");
  expect(stubs.requests).toHaveLength(2);
  expect(stubs.cardRequests).toEqual([]);
});

test("editing a username to an account that has not been searched makes no automatic request", async ({
  page,
}) => {
  await page.clock.install({ time: new Date() });
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page, profile());
  await search(page).click();
  await ready(page, 1);
  await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("another-dev");
  await page.getByRole("checkbox", { name: "Activity by month", exact: true }).check();
  await page.clock.runFor(1_000);
  expect(stubs.requests).toHaveLength(2);
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  await search(page).click();
  await ready(page, 2);
  expect(stubs.requests).toHaveLength(4);
  expect(
    stubs.requests.slice(2).every((url) => url.searchParams.get("username") === "another-dev"),
  ).toBe(true);
});

test("one common search supplies all five own cards, including newly selected covered cards", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page, profile());
  expect(stubs.requests).toEqual([]);
  await search(page).click();
  await ready(page, 1);
  for (const label of ownLabels)
    await page.getByRole("checkbox", { name: label, exact: true }).check();
  await ready(page, 5);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  expect(stubs.requests.map((url) => url.pathname).sort()).toEqual([
    "/api/github/activity",
    "/api/github/extended",
  ]);
  expect(stubs.cardRequests).toEqual([]);
  const localValues = await page.evaluate(() => Object.values(localStorage));
  expect(localValues.join("\n")).not.toMatch(
    /fetchedAt|repositoriesAnalyzed|includesPrivateCounts/,
  );
});

test("appearance, layout, widths and language distribution update from browser data", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  const document = profile();
  document.data.metrics.cards = ["extended-stats", "extended-languages"];
  document.data.metrics.extended = { stats: { items: ["stars"] } };
  await open(page, document);
  await search(page).click();
  await ready(page, 2);
  expect(stubs.requests).toHaveLength(2);
  const extendedRequest = stubs.requests.find((url) => url.pathname.endsWith("extended"))!;
  expect(extendedRequest.searchParams.has("stats")).toBe(true);
  expect(extendedRequest.searchParams.has("languages")).toBe(true);
  const before = await localCardSvg(page);
  await page.getByText("Card appearance", { exact: true }).click();
  await page.getByRole("combobox", { name: "Card theme", exact: true }).selectOption("dark");
  await page.getByRole("combobox", { name: "Color palette", exact: true }).selectOption("violet");
  await page.getByRole("combobox", { name: "Layout", exact: true }).selectOption("panels");
  await page.getByRole("combobox", { name: "Card width", exact: true }).selectOption("wide");
  await expect.poll(() => localCardSvg(page)).not.toBe(before);
  await page.getByText("Extended statistics and language options", { exact: true }).click();
  await page.getByText("Language distribution", { exact: true }).click();
  const languageBefore = await localCardSvg(page, 1);
  await page.getByRole("combobox", { name: "Language layout", exact: true }).selectOption("donut");
  await page.getByRole("combobox", { name: "Language values", exact: true }).selectOption("bytes");
  await page.getByRole("spinbutton", { name: "Number of languages (1–20)", exact: true }).fill("1");
  await expect.poll(() => localCardSvg(page, 1)).not.toBe(languageBefore);
  await ready(page, 2);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  expect(stubs.requests).toHaveLength(2);
  expect(stubs.cardRequests).toEqual([]);
});

test("independent sources settle progressively and retry fetches only the failed source", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  const stubs = activityDataStubs(page);
  await stubs.ready;
  stubs.setHold(true);
  const document = profile();
  document.data.metrics.cards = ["summary", "extended-stats"];
  document.data.metrics.extended = { stats: { items: ["stars"] } };
  try {
    await open(page, document);
    await search(page).click();
    await expect.poll(() => stubs.queued.length).toBe(2);
    await expect(search(page)).toBeDisabled();
    await expect(
      page.getByRole("status").filter({ hasText: "Loading public data:" }),
    ).toBeVisible();
    await expect(page.getByRole("article").locator('[aria-busy="true"]')).not.toHaveCount(0);
    const skeleton = page.getByRole("article").locator(".animate-skeleton").first();
    await expect
      .poll(() => skeleton.evaluate((element) => getComputedStyle(element).animationName))
      .toBe("skeleton-pulse");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await expect
      .poll(() => skeleton.evaluate((element) => getComputedStyle(element).animationName))
      .toBe("none");
    const own = stubs.queued.find((item) => item.url.pathname.endsWith("activity"))!;
    const extended = stubs.queued.find((item) => item.url.pathname.endsWith("extended"))!;
    stubs.queued.splice(0);
    await own.finish();
    await ready(page, 1);
    await expect(page.getByRole("status").filter({ hasText: "Loading card…" })).toBeVisible();
    await extended.fail();
    await expect(
      page.getByRole("status").filter({ hasText: "We could not load this card." }),
    ).toBeVisible();
    stubs.setHold(false);
    await page.getByRole("button", { name: "Retry card", exact: true }).click();
    await ready(page, 2);
    expect(stubs.requests.map((url) => url.pathname).sort()).toEqual([
      "/api/github/activity",
      "/api/github/extended",
      "/api/github/extended",
    ]);
    expect(stubs.cardRequests).toEqual([]);
  } finally {
    stubs.setHold(false);
    await stubs.releaseAll();
  }
});

test("unavailable metrics remain visible among all eighteen counters and do not trigger repeated searches", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  stubs.transform((url, data) => {
    if (!url.pathname.endsWith("extended")) return data;
    const snapshot = data as ExtendedProfileSnapshot;
    snapshot.stats.commits = { value: null, scope: "period", partial: false };
    return snapshot;
  });
  const document = profile();
  document.data.metrics.cards = [];
  document.data.metrics.extended = { stats: { items: [...extendedStatIds] } };
  await open(page, document);
  await search(page).click();
  await expect(
    page.getByRole("status").filter({ hasText: "Some data is available." }),
  ).toBeVisible();
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Extended activity summary", exact: true }).check();
  await ready(page, 1);
  const svg = await localCardSvg(page);
  expect(svg).toContain("Commits");
  expect(svg).toContain("Followers");
  expect(svg).toContain(">—</text>");
  expect(svg).toContain(">0</text>");
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  await page.getByText("Extended statistics and language options", { exact: true }).click();
  await page.getByText("Statistics and optional rank", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Commits", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Commits", exact: true }).check();
  await ready(page, 1);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  expect(stubs.requests).toHaveLength(2);
});

test("changing commit year requests missing period data and reuses snapshot metrics", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  const document = profile();
  document.data.metrics.cards = ["extended-stats"];
  document.data.metrics.extended = { stats: { items: ["stars", "commits"] } };
  await open(page, document);
  await search(page).click();
  await ready(page, 1);
  await page.getByText("Extended statistics and language options", { exact: true }).click();
  await page.getByText("Statistics and optional rank", { exact: true }).click();
  await page.getByRole("combobox", { name: "Commit period", exact: true }).selectOption("year");
  await page
    .getByRole("spinbutton", { name: "Calendar year (2008–2100)", exact: true })
    .fill("2024");
  await expect.poll(() => stubs.requests.length).toBe(3);
  await ready(page, 1);
  const options = JSON.parse(stubs.requests.at(-1)!.searchParams.get("stats") ?? "{}");
  expect(options.items).toEqual(["commits"]);
  expect(options.year).toBe(2024);
  await expect.poll(() => localCardSvg(page)).toContain("2024");
  expect(stubs.cardRequests).toEqual([]);
});

test("expired browser data requires an explicit refresh without an automatic query", async ({
  page,
}) => {
  await page.clock.install({ time: new Date() });
  const stubs = activityDataStubs(page);
  await stubs.ready;
  let offset = 0;
  stubs.transform((_url, data) => ({
    ...(data as object),
    fetchedAt: new Date(Date.now() + offset - 1_000).toISOString(),
  }));
  await open(page, profile());
  await search(page).click();
  await ready(page, 1);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  offset = 31 * 60_000;
  await page.clock.fastForward(offset);
  await expect(search(page)).toBeEnabled();
  expect(stubs.requests).toHaveLength(2);
  await search(page).click();
  await ready(page, 1);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  expect(stubs.requests).toHaveLength(4);
  expect(stubs.cardRequests).toEqual([]);
});

test("clearing the profile invalidates an in-flight lookup and its eventual response", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  stubs.setHold(true);
  try {
    await open(page, profile());
    await search(page).click();
    await expect.poll(() => stubs.queued.length).toBe(2);
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Clear README", exact: true }).click();
    await stubs.releaseAll();
    await expect(page.getByRole("article").locator("img")).toHaveCount(0);
    await page.getByRole("checkbox", { name: "Activity & contributions", exact: true }).check();
    await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
    await page.getByText("GitHub activity (optional)", { exact: true }).click();
    await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("example-dev");
    await page.getByRole("checkbox", { name: "Activity summary", exact: true }).check();
    await expect(page.getByRole("article").locator("img")).toHaveCount(0);
    await expect(search(page)).toBeEnabled();
    expect(stubs.requests).toHaveLength(2);
    stubs.setHold(false);
    await search(page).click();
    await ready(page, 1);
    expect(stubs.requests).toHaveLength(4);
  } finally {
    stubs.setHold(false);
    await stubs.releaseAll();
  }
});

test("repository metadata remains visible when contribution counters fail, and retry loads only counters", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  stubs.failNext();
  const document = profile();
  document.data.metrics = {
    username: "",
    cards: ["extended-repository"],
    extended: {
      repositories: ["octocat/hello-world"],
      resourceOptions: {
        contributionUsername: "example-dev",
        contributionStats: ["authoredPullRequests"],
      },
    },
  };
  await open(page, document);
  await search(page).click();
  await ready(page, 1);
  expect(await localCardSvg(page)).toContain("A public repository fixture");
  expect(await localCardSvg(page)).toContain("PRs authored: —");
  await expect(
    page.getByRole("status").filter({ hasText: "Some contribution data could not be loaded." }),
  ).toBeVisible();
  const retry = page.getByRole("button", { name: "Retry card", exact: true });
  await expect(retry).toBeVisible();
  expect(stubs.requests.filter((url) => url.pathname.endsWith("resource"))).toHaveLength(1);
  expect(stubs.requests.filter((url) => url.pathname.endsWith("extended"))).toHaveLength(1);
  await retry.click();
  await expect(retry).toHaveCount(0);
  await ready(page, 1);
  await expect.poll(() => localCardSvg(page)).toContain("PRs authored: 12");
  expect(stubs.requests.filter((url) => url.pathname.endsWith("resource"))).toHaveLength(1);
  expect(stubs.requests.filter((url) => url.pathname.endsWith("extended"))).toHaveLength(2);
  expect(stubs.cardRequests).toEqual([]);
});

test("retrying a local SVG decode failure generates another Blob without querying the provider", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const create = URL.createObjectURL.bind(URL);
    let failSvg = true;
    Object.assign(window, {
      allowActivitySvg: () => {
        failSvg = false;
      },
    });
    URL.createObjectURL = (blob) => {
      if (failSvg && blob instanceof Blob && blob.type === "image/svg+xml") {
        return "blob:invalid-local-preview-fixture";
      }
      return create(blob);
    };
  });
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page, profile());
  await search(page).click();
  const retry = page.getByRole("button", { name: "Retry card", exact: true });
  await expect(retry).toBeVisible();
  await expect(
    page.getByRole("status").filter({ hasText: "The local preview could not be displayed." }),
  ).toBeVisible();
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  expect(stubs.requests).toHaveLength(2);
  await page.evaluate(() =>
    (window as unknown as { allowActivitySvg: () => void }).allowActivitySvg(),
  );
  await retry.click();
  await ready(page, 1);
  expect(stubs.requests).toHaveLength(2);
  expect(stubs.cardRequests).toEqual([]);
});
