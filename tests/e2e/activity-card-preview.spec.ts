import { expect, test, type Page, type Route } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { parseCardOptions } from "../../src/core/activity/card-options";

const draftKey = "github-profile-generator.profile.v2";
const updating = "Updating card… The previous version stays visible while it loads.";

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

function cardStubs(page: Page) {
  let hold = false;
  let failNext = false;
  const queued: { url: string; finish: () => Promise<void> }[] = [];
  const requests: string[] = [];
  const unauthorized: string[] = [];
  const fulfill = (route: Route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      headers: { "Cache-Control": "no-store" },
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="260"><text x="20" y="40">Public card fixture</text></svg>',
    });
  const ready = page.route("**/cards/**", async (route) => {
    const url = route.request().url();
    requests.push(url);
    if (route.request().headers().authorization) unauthorized.push(url);
    if (failNext) {
      failNext = false;
      return route.abort("failed");
    }
    if (!hold) return fulfill(route);
    await new Promise<void>((resolve) => {
      queued.push({
        url,
        finish: async () => {
          await fulfill(route).catch(() => undefined);
          resolve();
        },
      });
    });
  });
  return {
    ready,
    queued,
    requests,
    unauthorized,
    setHold(value: boolean) {
      hold = value;
    },
    failNext() {
      failNext = true;
    },
    async releaseAll() {
      await Promise.all(queued.splice(0).map((request) => request.finish()));
    },
  };
}

async function open(page: Page, document: ProfileDocument = profile()) {
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(document),
  });
  await page.goto("/en/editor");
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  await page.getByText("Extended statistics and language options", { exact: true }).click();
  await page.getByText("Statistics and optional rank", { exact: true }).click();
  await expect(page.getByRole("img", { name: /GitHub Stats Extended · activity/ })).toBeVisible();
  await expect(page.getByRole("status").filter({ hasText: "Loading card…" })).toHaveCount(0);
}

function cardImage(page: Page) {
  return page.getByRole("img", { name: /GitHub Stats Extended · activity/ });
}

async function expectCounters(page: Page, items: string[]) {
  await expect
    .poll(async () => {
      const source = await cardImage(page).getAttribute("src");
      if (!source) return undefined;
      return parseCardOptions(new URL(source, "https://preview.example").searchParams)?.extended
        ?.stats?.items;
    })
    .toEqual(items);
  await expect(cardImage(page)).toHaveJSProperty("naturalWidth", 700);
  await expect(page.getByRole("status").filter({ hasText: updating })).toHaveCount(0);
}

test("changing Extended counters keeps a loaded card visible, ignores late images and survives recovery", async ({
  page,
}) => {
  const stubs = cardStubs(page);
  await stubs.ready;
  try {
    await open(page);
    const original = await cardImage(page).getAttribute("src");
    stubs.setHold(true);
    await page.getByRole("checkbox", { name: "Commits", exact: true }).uncheck();
    await expect.poll(() => stubs.queued.length).toBe(1);
    await expect(page.getByRole("status").filter({ hasText: updating })).toBeVisible();
    await expect(cardImage(page)).toHaveAttribute("src", original!);
    await expect(cardImage(page)).toHaveJSProperty("naturalWidth", 700);

    await page.getByRole("checkbox", { name: "Followers", exact: true }).check();
    await expect.poll(() => stubs.queued.length).toBe(2);
    const latest = stubs.queued.pop()!;
    await latest.finish();
    await expectCounters(page, [
      "stars",
      "pullRequests",
      "issues",
      "reviews",
      "repositoriesContributedTo",
      "followers",
    ]);
    const newest = await cardImage(page).getAttribute("src");
    expect(stubs.requests.filter((url) => url === latest.url)).toHaveLength(1);
    await stubs.releaseAll();
    await expect(cardImage(page)).toHaveAttribute("src", newest!);
    stubs.setHold(false);

    for (const label of [
      "Stars received",
      "Pull requests",
      "Issues",
      "Reviews",
      "Repositories contributed to in the period",
    ])
      await page.getByRole("checkbox", { name: label, exact: true }).uncheck();
    await expectCounters(page, ["followers"]);
    await expect(page.getByRole("checkbox", { name: "Followers", exact: true })).toBeDisabled();
    await page.getByRole("checkbox", { name: "Commits", exact: true }).check();
    await page.getByRole("checkbox", { name: "Stars received", exact: true }).check();
    await expectCounters(page, ["followers", "commits", "stars"]);
    const settled = await cardImage(page).getAttribute("src");
    stubs.setHold(true);
    const rank = page.getByRole("checkbox", { name: /^Show the optional activity rank/ });
    await rank.uncheck();
    await expect.poll(() => stubs.queued.length).toBe(1);
    await rank.check();
    await expect(page.getByRole("status").filter({ hasText: updating })).toHaveCount(0);
    await expect(cardImage(page)).toHaveAttribute("src", settled!);
    await expect(cardImage(page)).toHaveJSProperty("naturalWidth", 700);
    await stubs.releaseAll();
    await expect(cardImage(page)).toHaveAttribute("src", settled!);
    stubs.setHold(false);
    await expect
      .poll(() =>
        page.evaluate(
          (key) =>
            JSON.parse(localStorage.getItem(key) ?? "null")?.data.metrics.extended.stats.items,
          draftKey,
        ),
      )
      .toEqual(["followers", "commits", "stars"]);
    await page.reload();
    await expectCounters(page, ["followers", "commits", "stars"]);
    expect(stubs.unauthorized).toEqual([]);
  } finally {
    stubs.setHold(false);
    await stubs.releaseAll();
  }
});

test("a failed card update offers retry and changing public identity clears the previous image", async ({
  page,
}) => {
  const stubs = cardStubs(page);
  await stubs.ready;
  try {
    await open(page);
    const original = await cardImage(page).getAttribute("src");
    stubs.failNext();
    await page.getByRole("checkbox", { name: "Commits", exact: true }).uncheck();
    await expect(
      page.getByRole("status").filter({
        hasText: "We could not update this card. The previous version is still visible.",
      }),
    ).toBeVisible();
    await expect(cardImage(page)).toHaveAttribute("src", original!);
    const retry = page.getByRole("button", { name: "Retry card", exact: true });
    expect(await retry.evaluate((element) => element.closest("a"))).toBeNull();
    await retry.click();
    await expectCounters(page, [
      "stars",
      "pullRequests",
      "issues",
      "reviews",
      "repositoriesContributedTo",
    ]);
    stubs.setHold(true);
    await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("another-dev");
    await expect.poll(() => stubs.queued.length).toBe(1);
    await expect(page.getByRole("status").filter({ hasText: "Loading card…" })).toBeVisible();
    await expect(page.getByRole("status").filter({ hasText: updating })).toHaveCount(0);
    await expect(cardImage(page)).toHaveAttribute("src", /\/another-dev\//);
    await expect(cardImage(page)).toHaveJSProperty("naturalWidth", 0);
    await stubs.releaseAll();
    await expect(cardImage(page)).toHaveJSProperty("naturalWidth", 700);
  } finally {
    stubs.setHold(false);
    await stubs.releaseAll();
  }
});

test("resource counters retain the card only for the same public target", async ({ page }) => {
  const stubs = cardStubs(page);
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
  try {
    await page.goto("/en");
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: draftKey,
      value: JSON.stringify(document),
    });
    await page.goto("/en/editor");
    await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
    const image = page.getByRole("img", { name: /Public repository/ });
    await expect(image).toHaveJSProperty("naturalWidth", 700);
    const original = await image.getAttribute("src");
    await page.getByText("Extended repository, Gist, and WakaTime cards", { exact: true }).click();
    await page.getByText("Resource card details", { exact: true }).click();
    await page.getByText("A user's contributions in each repository", { exact: true }).click();
    stubs.setHold(true);
    await page.getByRole("checkbox", { name: "Commented issues", exact: true }).check();
    await page
      .getByRole("button", { name: "Apply repository contribution settings", exact: true })
      .click();
    await expect.poll(() => stubs.queued.length).toBe(1);
    await expect(image).toHaveAttribute("src", original!);
    await expect(page.getByRole("status").filter({ hasText: updating })).toBeVisible();
    await stubs.releaseAll();
    await expect(image).not.toHaveAttribute("src", original!);
    await page
      .getByRole("textbox", { name: "Repository targets", exact: true })
      .fill("octocat/Spoon-Knife");
    await page.getByRole("button", { name: "Apply resource targets", exact: true }).first().click();
    await expect.poll(() => stubs.queued.length).toBe(1);
    await expect(page.getByRole("status").filter({ hasText: "Loading card…" })).toBeVisible();
    await expect(image).toHaveAttribute("src", /target=octocat%2Fspoon-knife/);
    await expect(image).toHaveJSProperty("naturalWidth", 0);
    await stubs.releaseAll();
    await expect(image).toHaveJSProperty("naturalWidth", 700);
  } finally {
    stubs.setHold(false);
    await stubs.releaseAll();
  }
});

for (const { interfaceLocale, contentLocale, failure, loading, retry } of [
  {
    interfaceLocale: "es",
    contentLocale: "en",
    failure: "No pudimos cargar esta tarjeta.",
    loading: "Cargando tarjeta…",
    retry: "Reintentar tarjeta",
  },
  {
    interfaceLocale: "en",
    contentLocale: "es",
    failure: "We could not load this card.",
    loading: "Loading card…",
    retry: "Retry card",
  },
] as const) {
  test(`initial card failure and retry use ${interfaceLocale} while the README stays ${contentLocale}`, async ({
    page,
  }) => {
    const stubs = cardStubs(page);
    await stubs.ready;
    stubs.failNext();
    const document = profile();
    document.contentLocale = contentLocale;
    const image = page.getByRole("img", { name: /GitHub Stats Extended/ });
    try {
      await page.goto(`/${interfaceLocale}`);
      await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
        key: draftKey,
        value: JSON.stringify(document),
      });
      await page.goto(`/${interfaceLocale}/editor`);
      const failureStatus = page.getByRole("status").filter({ hasText: failure });
      await expect(failureStatus).toBeVisible();
      await expect(failureStatus).toHaveAttribute("lang", interfaceLocale);
      await expect(page.getByRole("article")).toHaveAttribute("lang", contentLocale);
      await expect(image).toHaveCount(0);
      stubs.setHold(true);
      const retryButton = page.getByRole("button", { name: retry, exact: true });
      await expect(retryButton).toHaveAttribute("lang", interfaceLocale);
      await retryButton.click();
      await expect.poll(() => stubs.queued.length).toBe(1);
      const loadingStatus = page.getByRole("status").filter({ hasText: loading });
      await expect(loadingStatus).toBeVisible();
      await expect(loadingStatus).toHaveAttribute("lang", interfaceLocale);
      await stubs.releaseAll();
      await expect(image).toHaveJSProperty("naturalWidth", 700);
      await expect(loadingStatus).toHaveCount(0);
      expect(stubs.unauthorized).toEqual([]);
    } finally {
      stubs.setHold(false);
      await stubs.releaseAll();
    }
  });
}
