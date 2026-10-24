import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import en from "../../src/messages/en/editor.json" with { type: "json" };
import es from "../../src/messages/es/editor.json" with { type: "json" };

test.skip(
  process.env.EXPORTED_ACTIVITY_FIXTURES !== "1",
  "Run with the isolated exported-cards configuration and its synthetic public origin.",
);

const draftKey = "github-profile-generator.profile.v2";

async function openEditor(page: Page, locale: "en" | "es" = "en") {
  const profile = createEmptyProfile(locale);
  profile.visibility.presentation = true;
  profile.data.presentation.displayName = "A short profile";
  profile.data.presentation.bio = "A short introduction.";
  profile.visibility.metrics = true;
  profile.data.metrics = {
    username: "fixture-dev",
    cards: ["extended-stats", "extended-languages"],
    cardColumns: 2,
  };
  await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(profile),
  });
  await page.goto(`/${locale}/editor`);
}

for (const locale of ["en", "es"] as const) {
  test(`public export ${locale}: checks only on request, explains protected images and retries`, async ({
    page,
  }) => {
    const t = locale === "en" ? en : es;
    let checks = 0;
    await page.route("**/api/cards/export-check", async (route) => {
      const { sources } = route.request().postDataJSON() as { sources: string[] };
      expect(sources).toHaveLength(2);
      for (const source of sources) expect(source).toContain("columns=2");
      checks++;
      await route.fulfill({
        json:
          checks === 1
            ? { status: "failed", reason: "protected" }
            : { status: "ready", stale: false },
      });
    });
    await openEditor(page, locale);
    const check = page.getByRole("button", { name: t.export.cards.check, exact: true });
    const download = page.getByRole("button", { name: t.export.download, exact: true });
    await expect(check).toBeEnabled();
    expect(checks).toBe(0);
    await expect(download).toBeDisabled();
    await check.click();
    await expect(page.getByText(t.export.cards.errors.protected, { exact: true })).toBeVisible();
    await expect(download).toBeDisabled();
    await expect(
      page.getByRole("link", { name: t.export.cards.openImage, exact: true }),
    ).toHaveAttribute("target", "_blank");
    await check.click();
    await expect(download).toBeEnabled();
    expect(checks).toBe(2);
    const pendingDownload = page.waitForEvent("download");
    await download.click();
    const path = await (await pendingDownload).path();
    if (!path) throw new Error("Expected a verified README download");
    const markdown = await readFile(path, "utf8");
    expect(markdown).toContain("columns=2");
    expect(markdown).toContain("https://profiles.example.com/cards/");
    await page
      .getByRole("combobox", { name: t.contentLanguage, exact: true })
      .selectOption(locale === "en" ? "es" : "en");
    await expect(download).toBeDisabled();
    await expect(check).toBeEnabled();
    expect(checks).toBe(2);
    await page.getByRole("button", { name: t.export.cards.exclude, exact: true }).click();
    await expect(download).toBeEnabled();
    await expect(check).toHaveCount(0);
    expect(checks).toBe(2);
  });
}

test("a late success cannot verify changed cards, and verification expires without a new request", async ({
  page,
}) => {
  await page.clock.install();
  let checks = 0;
  let releaseFirst!: () => void;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  await page.route("**/api/cards/export-check", async (route) => {
    checks++;
    if (checks === 1) await firstGate;
    await route.fulfill({ json: { status: "ready", stale: false } }).catch(() => {});
  });
  await openEditor(page);
  const download = page.getByRole("button", { name: en.export.download, exact: true });
  await page.getByRole("button", { name: en.export.cards.check, exact: true }).click();
  await expect(
    page.getByRole("button", { name: en.export.cards.checking, exact: true }),
  ).toBeDisabled();
  await page.getByRole("combobox", { name: en.contentLanguage, exact: true }).selectOption("es");
  await expect(
    page.getByRole("button", { name: en.export.cards.check, exact: true }),
  ).toBeEnabled();
  releaseFirst();
  await expect(download).toBeDisabled();
  await page.getByRole("button", { name: en.export.cards.check, exact: true }).click();
  await expect(download).toBeEnabled();
  await page.clock.fastForward(5 * 60 * 1000 + 1);
  await expect(download).toBeDisabled();
  expect(checks).toBe(2);
});
