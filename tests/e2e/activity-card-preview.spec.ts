import { expect, test, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { activityDataStubs, localCardSvg } from "./helpers/activity-fixtures";

const draftKey = "github-profile-generator.profile.v2";
const requestLabel = "Search data";

function profile() {
  const document = createEmptyProfile("en");
  document.visibility.contributions = true;
  document.visibility.metrics = true;
  document.data.metrics = {
    username: "example-dev",
    cards: ["extended-stats"],
    extended: { stats: { showRank: true } },
  };
  return document;
}

async function open(page: Page, document: ProfileDocument = profile(), requestCards = true) {
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(document),
  });
  await page.goto("/en/editor");
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  await page.getByText("Extended statistics and language options", { exact: true }).click();
  await page.getByText("Statistics and optional rank", { exact: true }).click();
  if (requestCards) {
    await search(page).click();
    await readyImages(page, 1);
  }
}

function search(page: Page) {
  return page.getByRole("button", { name: requestLabel, exact: true });
}
function cardImage(page: Page) {
  return page.getByRole("img", { name: /GitHub Stats Extended · activity/ });
}
function pendingCard(page: Page) {
  return page.getByRole("article").getByRole("group", { name: /GitHub Stats Extended · activity/ });
}

async function readyImages(page: Page, count: number) {
  const images = page.getByRole("article").locator("img");
  await expect(images).toHaveCount(count);
  await expect
    .poll(() =>
      images.evaluateAll((nodes) =>
        nodes.every((node) => {
          const image = node as HTMLImageElement;
          return image.complete && image.naturalWidth > 0 && image.src.startsWith("blob:");
        }),
      ),
    )
    .toBe(true);
}

async function expectCounters(page: Page, items: string[]) {
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.data.metrics.extended.stats.items,
        draftKey,
      ),
    )
    .toEqual(items);
  await readyImages(page, 1);
}

test("recovering and editing selections starts no data or SVG request before Search", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page, profile(), false);
  await expect(pendingCard(page)).toBeVisible();
  await expect(cardImage(page)).toHaveCount(0);
  await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("another-dev");
  await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("example-dev");
  await page.getByRole("checkbox", { name: "Commits", exact: true }).uncheck();
  await page.getByRole("checkbox", { name: "Followers", exact: true }).check();
  await page.getByRole("checkbox", { name: "Issues", exact: true }).uncheck();
  expect(stubs.requests).toEqual([]);
  expect(stubs.cardRequests).toEqual([]);
  await search(page).click();
  await expectCounters(page, [
    "stars",
    "pullRequests",
    "reviews",
    "repositoriesContributedTo",
    "followers",
  ]);
  expect(stubs.requests).toHaveLength(2);
  expect(stubs.requests.map((url) => url.pathname).sort()).toEqual([
    "/api/github/activity",
    "/api/github/extended",
  ]);
  expect(stubs.unauthorized).toEqual([]);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    draftKey,
  );
  expect(JSON.stringify(stored)).not.toMatch(/requestedActivityCards|approved|fetchedAt|snapshot/i);
});

test("all ten card types use local samples, grouped JSON and locally rendered SVG", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  const document = profile();
  document.data.metrics.cards = [];
  document.data.metrics.extended = {
    repositories: ["octocat/Hello-World"],
    gists: ["abcdef12345"],
    wakatimeUsername: "public-coder",
  };
  await open(page, document, false);
  for (const label of [
    "Contribution calendar",
    "Activity summary",
    "Repository languages",
    "Activity panorama",
    "Activity by month",
    "Extended activity summary",
    "Extended repository languages",
  ])
    await page.getByRole("checkbox", { name: label, exact: true }).check();
  await page.getByText("Extended repository, Gist, and WakaTime cards", { exact: true }).click();
  for (const label of [
    /^Include repository cards/,
    /^Include Gist cards/,
    /^Include the WakaTime card/,
  ])
    await page.getByRole("checkbox", { name: label }).check();
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.getByRole("group")).toHaveCount(10);
  await expect(preview.locator("img")).toHaveCount(0);
  await page.getByRole("combobox", { name: "README language", exact: true }).selectOption("es");
  expect(stubs.requests).toEqual([]);
  await search(page).click();
  await readyImages(page, 10);
  expect(stubs.requests.filter((url) => url.pathname === "/api/github/activity")).toHaveLength(1);
  expect(stubs.requests.filter((url) => url.pathname === "/api/github/extended")).toHaveLength(1);
  expect(stubs.requests.filter((url) => url.pathname === "/api/github/resource")).toHaveLength(3);
  expect(stubs.cardRequests).toEqual([]);
  expect(stubs.unauthorized).toEqual([]);
  await expect(preview).toHaveAttribute("lang", "es");
  expect(await localCardSvg(page)).toContain("<svg");
  await page.getByRole("button", { name: "Add contribution", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Contribution title", exact: true })
    .fill("Community documentation");
  await readyImages(page, 10);
  expect(stubs.requests).toHaveLength(5);
});

test("opening an identical project clears browser snapshots and waits for Search", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page);
  await page.getByRole("button", { name: "Project", exact: true }).click();
  const project = page.getByRole("region", { name: "Your project", exact: true });
  await project.locator('input[type="file"]').setInputFiles({
    name: "same-cards.project.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(profile())),
  });
  await expect(
    project.getByRole("heading", { name: "1. Review your project", exact: true }),
  ).toBeVisible();
  expect(stubs.requests).toHaveLength(2);
  await project.getByRole("button", { name: "Continue to confirmation", exact: true }).click();
  await project
    .getByRole("checkbox", {
      name: "I have reviewed the project and want to replace my current profile.",
      exact: true,
    })
    .check();
  await project
    .getByRole("button", { name: "Replace profile and keep backup", exact: true })
    .click();
  await expect(project).toHaveCount(0);
  await expect(pendingCard(page)).toBeVisible();
  await expect(cardImage(page)).toHaveCount(0);
  expect(stubs.requests).toHaveLength(2);
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  await search(page).click();
  await readyImages(page, 1);
  expect(stubs.requests).toHaveLength(4);
});

test("clearing the README discards snapshots even when identical choices are entered again", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page);
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear README", exact: true }).click();
  await expect(cardImage(page)).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Activity & contributions", exact: true }).check();
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  await page.getByText("GitHub activity (optional)", { exact: true }).click();
  await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("example-dev");
  await page.getByRole("checkbox", { name: "Extended activity summary", exact: true }).check();
  await expect(pendingCard(page)).toBeVisible();
  expect(stubs.requests).toHaveLength(2);
  await search(page).click();
  await readyImages(page, 1);
  expect(stubs.requests).toHaveLength(4);
  expect(stubs.cardRequests).toEqual([]);
});

test("covered counters, optional rank and README language update immediately without requests", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page);
  expect(await localCardSvg(page)).toContain("Activity formula");
  await page.getByRole("checkbox", { name: /^Show the optional activity rank/ }).uncheck();
  await expect.poll(() => localCardSvg(page)).not.toContain("Activity formula");
  await page.getByRole("checkbox", { name: "Commits", exact: true }).uncheck();
  await readyImages(page, 1);
  await page.getByRole("checkbox", { name: "Commits", exact: true }).check();
  await page.getByRole("combobox", { name: "README language", exact: true }).selectOption("es");
  await expect.poll(() => localCardSvg(page)).toContain("Estrellas recibidas");
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  expect(stubs.requests).toHaveLength(2);
  expect(stubs.cardRequests).toEqual([]);
});

test("hiding and showing cards reuses cached data after covered counter edits", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page);
  await page.getByRole("checkbox", { name: "Commits", exact: true }).uncheck();
  const section = page.getByRole("checkbox", { name: "Activity & contributions", exact: true });
  await section.uncheck();
  await expect(cardImage(page)).toHaveCount(0);
  await section.check();
  await expectCounters(page, [
    "stars",
    "pullRequests",
    "issues",
    "reviews",
    "repositoriesContributedTo",
  ]);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  expect(stubs.requests).toHaveLength(2);
});

for (const outcome of ["loaded", "failed"] as const) {
  test(`a late ${outcome} response for another identity cannot replace current cards`, async ({
    page,
  }) => {
    const stubs = activityDataStubs(page);
    await stubs.ready;
    stubs.setHold(true);
    try {
      await open(page, profile(), false);
      await search(page).click();
      await expect.poll(() => stubs.queued.length).toBe(2);
      const initial = stubs.queued.splice(0);
      await expect(page.getByRole("status").filter({ hasText: "Loading card…" })).toBeVisible();
      await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("second-dev");
      await expect(search(page)).toBeEnabled();
      expect(stubs.requests).toHaveLength(2);
      stubs.setHold(false);
      await search(page).click();
      await readyImages(page, 1);
      expect(await localCardSvg(page)).toContain("second-dev");
      await Promise.all(
        initial.map((request) => (outcome === "loaded" ? request.finish() : request.fail())),
      );
      await expect.poll(() => localCardSvg(page)).toContain("second-dev");
      await expect(page.getByRole("button", { name: "Retry card", exact: true })).toHaveCount(0);
      expect(stubs.cardRequests).toEqual([]);
    } finally {
      stubs.setHold(false);
      await stubs.releaseAll();
    }
  });
}

test("counter ordering and validated cached data survive reload without HTTP", async ({ page }) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  const document = profile();
  document.data.metrics.extended = { stats: { showRank: false } };
  await open(page, document);
  for (const label of ["Stars received", "Commits", "Pull requests", "Issues", "Reviews"])
    await page.getByRole("checkbox", { name: label, exact: true }).uncheck();
  const last = page.getByRole("checkbox", {
    name: "Repositories contributed to in the period",
    exact: true,
  });
  await expect(last).toBeDisabled();
  await page.getByRole("checkbox", { name: "Followers", exact: true }).check();
  await last.uncheck();
  await page.getByRole("checkbox", { name: "Commits", exact: true }).check();
  await page.getByRole("checkbox", { name: "Stars received", exact: true }).check();
  await expectCounters(page, ["followers", "commits", "stars"]);
  expect(stubs.requests).toHaveLength(2);
  const svg = await localCardSvg(page);
  expect(svg.indexOf("Followers")).toBeLessThan(svg.indexOf("Commits"));
  expect(svg.indexOf("Commits")).toBeLessThan(svg.indexOf("Stars received"));
  await expect(page.getByText(/Activity data saved in this browser/)).toBeVisible();
  await page.reload();
  await readyImages(page, 1);
  const restored = await localCardSvg(page);
  expect(restored.indexOf("Followers")).toBeLessThan(restored.indexOf("Commits"));
  expect(restored.indexOf("Commits")).toBeLessThan(restored.indexOf("Stars received"));
  expect(stubs.requests).toHaveLength(2);
});

test("a failed source can be retried without HTTP SVG or client Authorization", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  stubs.failNext();
  await open(page, profile(), false);
  await search(page).click();
  await expect(
    page.getByRole("status").filter({ hasText: "We could not load this card." }),
  ).toBeVisible();
  const retry = page.getByRole("button", { name: "Retry card", exact: true });
  expect(await retry.evaluate((element) => element.closest("a"))).toBeNull();
  await retry.click();
  await readyImages(page, 1);
  expect(stubs.requests).toHaveLength(3);
  expect(stubs.cardRequests).toEqual([]);
  expect(stubs.unauthorized).toEqual([]);
});

test("resources use independent identities and request only changed targets or missing contributions", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  const document = profile();
  document.data.metrics = {
    username: "",
    cards: ["extended-repository"],
    extended: {
      repositories: ["octocat/Hello-World"],
      resourceOptions: {
        contributionUsername: "example-dev",
        contributionStats: ["authoredPullRequests"],
      },
    },
  };
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(document),
  });
  await page.goto("/en/editor");
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  await expect(page.getByRole("img", { name: /Public repository/ })).toHaveCount(0);
  expect(stubs.requests).toEqual([]);
  await search(page).click();
  await readyImages(page, 1);
  expect(stubs.requests.filter((url) => url.pathname.endsWith("resource"))).toHaveLength(1);
  expect(stubs.requests.filter((url) => url.pathname.endsWith("extended"))).toHaveLength(1);
  await page.getByText("Extended repository, Gist, and WakaTime cards", { exact: true }).click();
  await page.getByText("Resource card details", { exact: true }).click();
  await page.getByText("A user's contributions in each repository", { exact: true }).click();
  await page.getByRole("checkbox", { name: "Commented issues", exact: true }).check();
  await page
    .getByRole("button", { name: "Apply repository contribution settings", exact: true })
    .click();
  expect(stubs.requests).toHaveLength(2);
  await expect.poll(() => stubs.requests.length).toBe(3);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  await readyImages(page, 1);
  expect(stubs.requests).toHaveLength(3);
  expect(stubs.requests[2]!.pathname).toBe("/api/github/extended");
  expect(JSON.parse(stubs.requests[2]!.searchParams.get("stats") ?? "{}").items).toEqual([
    "commentedIssues",
  ]);
  await page
    .getByRole("textbox", { name: "Repository targets", exact: true })
    .fill("octocat/Spoon-Knife");
  await page.getByRole("button", { name: "Apply resource targets", exact: true }).first().click();
  expect(stubs.requests).toHaveLength(3);
  await expect.poll(() => stubs.requests.length).toBe(5);
  await expect(search(page)).toHaveAttribute("aria-busy", "false");
  await readyImages(page, 1);
  expect(stubs.requests).toHaveLength(5);
  expect(
    stubs.requests
      .filter((url) => url.pathname.endsWith("resource"))
      .at(-1)!
      .searchParams.get("target"),
  ).toBe("octocat/spoon-knife");
  expect(stubs.cardRequests).toEqual([]);
});

for (const locale of ["en", "es"] as const) {
  test(`failure, animation and retry use interface ${locale} independently of README language`, async ({
    page,
  }) => {
    const stubs = activityDataStubs(page);
    await stubs.ready;
    stubs.failNext();
    const document = profile();
    document.contentLocale = locale === "en" ? "es" : "en";
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
      .getByRole("button", {
        name: locale === "en" ? requestLabel : "Buscar datos",
        exact: true,
      })
      .click();
    const failure = page.getByRole("status").filter({
      hasText: locale === "en" ? "We could not load this card." : "No pudimos cargar esta tarjeta.",
    });
    await expect(failure).toBeVisible();
    await expect(failure).toHaveAttribute("lang", locale);
    await expect(page.getByRole("article")).toHaveAttribute("lang", document.contentLocale);
    stubs.setHold(true);
    try {
      await page
        .getByRole("button", {
          name: locale === "en" ? "Retry card" : "Reintentar tarjeta",
          exact: true,
        })
        .click();
      await expect.poll(() => stubs.queued.length).toBe(1);
      const loading = page
        .getByRole("status")
        .filter({ hasText: locale === "en" ? "Loading card…" : "Cargando tarjeta…" });
      await expect(loading).toBeVisible();
      await expect(loading).toHaveAttribute("lang", locale);
      const bounds = await page.getByRole("article").getByRole("group").boundingBox();
      expect(bounds?.width).toBeGreaterThan(200);
      expect(
        await page.evaluate(() => window.document.documentElement.scrollWidth > innerWidth),
      ).toBe(false);
      await stubs.releaseAll();
      await readyImages(page, 1);
      await expect(loading).toHaveCount(0);
      expect(stubs.cardRequests).toEqual([]);
    } finally {
      stubs.setHold(false);
      await stubs.releaseAll();
    }
  });
}
