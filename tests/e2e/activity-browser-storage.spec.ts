import { expect, test, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { extendedStatIds } from "../../src/core/activity/extended-options";
import { activityDataStubs, localCardSvg } from "./helpers/activity-fixtures";

const draftKey = "github-profile-generator.profile.v2";
const databaseName = "github-profile-generator.activity-cache.v1";
const storeName = "cache";
const recordKey = "public-data";
const savedText = /Activity data saved in this browser/;
const memoryText =
  /Browser storage is unavailable\. Activity data is reused while this editor remains open/;
type StoredCache = { version: number; entries: { key: string; value: Record<string, unknown> }[] };

function profile(): ProfileDocument {
  const document = createEmptyProfile("en");
  document.visibility.contributions = true;
  document.visibility.metrics = true;
  document.data.metrics = {
    username: "example-dev",
    cards: ["extended-stats"],
    extended: { stats: { items: [...extendedStatIds] } },
  };
  return document;
}

const search = (page: Page) => page.getByRole("button", { name: "Search data", exact: true });

async function open(page: Page, document = profile()) {
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(document),
  });
  await page.goto("/en/editor");
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
}

async function ready(page: Page, count = 1) {
  const images = page.getByRole("article").locator("img");
  await expect(images).toHaveCount(count);
  await expect
    .poll(() =>
      images.evaluateAll((nodes) =>
        nodes.every((node) => {
          const image = node as HTMLImageElement;
          return image.src.startsWith("blob:") && image.complete && image.naturalWidth > 0;
        }),
      ),
    )
    .toBe(true);
}

async function readCache(page: Page): Promise<StoredCache | undefined> {
  return page.evaluate(
    ({ database, store, key }) =>
      new Promise<StoredCache | undefined>((resolve, reject) => {
        const request = indexedDB.open(database, 1);
        request.onupgradeneeded = () => request.transaction?.abort();
        request.onerror = () =>
          request.error?.name === "AbortError" ? resolve(undefined) : reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          if (!db.objectStoreNames.contains(store)) {
            db.close();
            resolve(undefined);
            return;
          }
          const transaction = db.transaction(store, "readonly");
          const read = transaction.objectStore(store).get(key);
          transaction.oncomplete = () => {
            db.close();
            resolve(read.result as StoredCache | undefined);
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
    { database: databaseName, store: storeName, key: recordKey },
  );
}

async function writeCache(page: Page, value: StoredCache) {
  await page.evaluate(
    ({ database, store, key, value }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(database, 1);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const transaction = db.transaction(store, "readwrite");
          transaction.objectStore(store).put(value, key);
          transaction.oncomplete = () => {
            db.close();
            resolve();
          };
          transaction.onerror = () => {
            db.close();
            reject(transaction.error);
          };
        };
      }),
    { database: databaseName, store: storeName, key: recordKey, value },
  );
}

test("all counters survive reload and adding covered cards uses IndexedDB without HTTP", async ({
  page,
}) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page);
  await search(page).click();
  await ready(page);
  await expect(page.getByText(savedText)).toBeVisible();
  const stored = await readCache(page);
  expect(stored?.version).toBe(1);
  expect(stored?.entries.length).toBeGreaterThan(17);
  const local = await page.evaluate(() => Object.values(localStorage).join("\n"));
  expect(local).not.toMatch(/fetchedAt|repositoriesAnalyzed|includesPrivateCounts/);
  expect(JSON.stringify(stored)).not.toMatch(/GITHUB_TOKEN|Authorization|ghp_[A-Za-z0-9]/);
  expect(JSON.stringify(stored)).not.toMatch(/<svg|blob:/);
  await page.reload();
  await ready(page);
  expect(stubs.requests).toHaveLength(2);
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  await page.getByRole("checkbox", { name: "Activity summary", exact: true }).check();
  await page.getByRole("checkbox", { name: "Extended repository languages", exact: true }).check();
  await ready(page, 3);
  expect(stubs.requests).toHaveLength(2);
  expect(stubs.cardRequests).toEqual([]);
  expect(stubs.unauthorized).toEqual([]);
});

test("leaving and returning to the editor restores data without a request", async ({ page }) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page);
  await search(page).click();
  await ready(page);
  await expect(page.getByText(savedText)).toBeVisible();
  await page.getByRole("link", { name: "GitHub Profile Generator home", exact: true }).click();
  await expect(page).toHaveURL(/\/en$/);
  await page.goto("/en/editor");
  await ready(page);
  expect(stubs.requests).toHaveLength(2);
  expect(stubs.cardRequests).toEqual([]);
});

test("a different scope after reload waits for Search and requests only missing data", async ({
  page,
}) => {
  await page.clock.install({ time: new Date() });
  const stubs = activityDataStubs(page);
  await stubs.ready;
  const document = profile();
  document.data.metrics.extended = { stats: { items: ["stars", "commits"] } };
  await open(page, document);
  await search(page).click();
  await ready(page);
  await expect(page.getByText(savedText)).toBeVisible();
  await page.reload();
  await ready(page);
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  await page.getByText("Extended statistics and language options", { exact: true }).click();
  await page.getByText("Statistics and optional rank", { exact: true }).click();
  await page.getByRole("combobox", { name: "Commit period", exact: true }).selectOption("year");
  await page
    .getByRole("spinbutton", { name: "Calendar year (2008–2100)", exact: true })
    .fill("2024");
  await page.clock.runFor(1_000);
  await expect(search(page)).toBeEnabled();
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  expect(stubs.requests).toHaveLength(2);
  await search(page).click();
  await ready(page);
  expect(stubs.requests).toHaveLength(3);
  const options = JSON.parse(stubs.requests.at(-1)!.searchParams.get("stats") ?? "{}");
  expect(options.items).toEqual(["commits"]);
  expect(options.year).toBe(2024);
});

test("expired saved data does not refresh itself after reload", async ({ page }) => {
  const start = Date.now();
  await page.clock.install({ time: new Date(start) });
  let offset = 0;
  const stubs = activityDataStubs(page);
  await stubs.ready;
  stubs.transform((_url, data) => ({
    ...(data as object),
    fetchedAt: new Date(start + offset).toISOString(),
  }));
  await open(page);
  await search(page).click();
  await ready(page);
  await expect(page.getByText(savedText)).toBeVisible();
  offset = 31 * 60_000;
  await page.clock.fastForward(offset);
  await page.reload();
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  await expect(search(page)).toBeEnabled();
  await page.clock.runFor(1_000);
  expect(stubs.requests).toHaveLength(2);
  await search(page).click();
  await ready(page);
  expect(stubs.requests).toHaveLength(4);
});

test("saved snapshots never appear for another username", async ({ page }) => {
  await page.clock.install({ time: new Date() });
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page);
  await search(page).click();
  await ready(page);
  await expect(page.getByText(savedText)).toBeVisible();
  await page.reload();
  await ready(page);
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  const username = page.getByRole("textbox", { name: "GitHub username", exact: true });
  await username.fill("another-dev");
  await page.clock.runFor(1_000);
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  expect(stubs.requests).toHaveLength(2);
  await username.fill("example-dev");
  await ready(page);
  expect(await localCardSvg(page)).toContain("example-dev");
  expect(stubs.requests).toHaveLength(2);
});

test("clearing the profile purges the saved cache before reload", async ({ page }) => {
  const stubs = activityDataStubs(page);
  await stubs.ready;
  await open(page);
  await search(page).click();
  await ready(page);
  await expect(page.getByText(savedText)).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Clear README", exact: true }).click();
  await expect.poll(async () => (await readCache(page))?.entries.length ?? 0).toBe(0);
  await page.reload();
  await page.getByRole("checkbox", { name: "Activity & contributions", exact: true }).check();
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  await page.getByText("GitHub activity (optional)", { exact: true }).click();
  await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("example-dev");
  await page.getByRole("checkbox", { name: "Extended activity summary", exact: true }).check();
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  expect(stubs.requests).toHaveLength(2);
  await search(page).click();
  await ready(page);
  expect(stubs.requests).toHaveLength(4);
});

for (const failure of ["blocked", "quota"] as const) {
  test(`${failure} IndexedDB falls back to memory and honestly loses data after reload`, async ({
    page,
  }) => {
    await page.addInitScript((failure) => {
      if (failure === "blocked")
        Object.defineProperty(window, "indexedDB", {
          configurable: true,
          get: () => {
            throw new DOMException("Storage blocked by fixture", "SecurityError");
          },
        });
      else
        IDBObjectStore.prototype.put = () => {
          throw new DOMException("Storage full by fixture", "QuotaExceededError");
        };
    }, failure);
    const stubs = activityDataStubs(page);
    await stubs.ready;
    await open(page);
    await search(page).click();
    await ready(page);
    await page.getByRole("checkbox", { name: "Activity summary", exact: true }).check();
    await ready(page, 2);
    expect(stubs.requests).toHaveLength(2);
    await expect(page.getByText(memoryText)).toBeVisible();
    await page.reload();
    await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
    await expect(search(page)).toBeEnabled();
    await expect(page.getByRole("article").locator("img")).toHaveCount(0);
    expect(stubs.requests).toHaveLength(2);
    await search(page).click();
    await ready(page, 2);
    await expect(page.getByText(memoryText)).toBeVisible();
    expect(stubs.requests).toHaveLength(4);
  });
}

test("tampered cached data is validated and cannot restore an invalid snapshot", async ({
  page,
}) => {
  await page.clock.install({ time: new Date() });
  const stubs = activityDataStubs(page);
  await stubs.ready;
  const document = profile();
  document.data.metrics.cards = ["summary"];
  await open(page, document);
  await search(page).click();
  await ready(page);
  await expect(page.getByText(savedText)).toBeVisible();
  const stored = await readCache(page);
  if (!stored) throw new Error("The public snapshot must have been saved.");
  stored.entries = stored.entries.map((entry) =>
    entry.value.kind === "basic"
      ? {
          ...entry,
          value: {
            ...entry.value,
            data: {
              ...(entry.value.data as Record<string, unknown>),
              summary: { commits: -1, pullRequests: 2, issues: 1, reviews: 0 },
            },
          },
        }
      : entry,
  );
  await writeCache(page, stored);
  await page.reload();
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  await page.clock.runFor(1_000);
  await expect(search(page)).toBeEnabled();
  await expect(page.getByRole("article").locator("img")).toHaveCount(0);
  expect(stubs.requests).toHaveLength(2);
  await search(page).click();
  await ready(page);
  expect(stubs.requests.slice(2).some((url) => url.pathname === "/api/github/activity")).toBe(true);
  expect(stubs.cardRequests).toEqual([]);
});
