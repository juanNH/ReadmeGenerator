import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { createContributorExampleProfile } from "../../src/core/profile/fixtures";
import {
  createEmptyProfile,
  createEmptyProfileV1,
} from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { createImportBackup } from "../../src/features/editor/import-backup";
import en from "../../src/messages/en/editor.json" with { type: "json" };
import es from "../../src/messages/es/editor.json" with { type: "json" };
import importEn from "../../src/messages/en/readme-import.json" with { type: "json" };

const draftKey = "github-profile-generator.profile.v2";
const legacyKey = "github-profile-generator.profile.v1";
const backupKey = "github-profile-generator.import-backup.v1";
const messages = { en, es };
type Locale = keyof typeof messages;
type FixtureWindow = Window & {
  resetReadStored?: (key: string) => string | null;
};
const sectionName = { en: "About you", es: "Presentación" };

function populatedProfile(contentLocale: Locale = "en"): ProfileDocument {
  const profile = createContributorExampleProfile();
  profile.contentLocale = contentLocale;
  profile.visibility.contact = false;
  profile.data.presentation.format = { displayNameLevel: 2, displayNameAlignment: "center" };
  profile.customSections = [
    {
      id: "visible-code",
      title: "Visible custom source",
      visible: true,
      titleAlignment: "right",
      blocks: [{ id: "code", type: "code", source: '{"kept": true}', language: "json" }],
    },
    {
      id: "hidden-note",
      title: "Hidden custom source",
      visible: false,
      blocks: [{ id: "note", type: "paragraph", text: "Remove hidden data too." }],
    },
  ];
  profile.sectionOrder.push(
    { kind: "custom", sectionId: "visible-code" },
    { kind: "custom", sectionId: "hidden-note" },
  );
  return profile;
}

function preservedRecords(profile: ProfileDocument) {
  const legacy = createEmptyProfileV1("es");
  legacy.data.presentation.displayName = "Preserved legacy profile";
  const backup = createImportBackup(profile, "\ufeff# Previous import\r\n\r\nExact source\n");
  if (!backup.success) throw new Error("The test profile must create a valid import backup.");
  return {
    [draftKey]: JSON.stringify(profile),
    [legacyKey]: JSON.stringify(legacy),
    [backupKey]: JSON.stringify(backup.backup),
  };
}

async function openEditor(
  page: Page,
  locale: Locale,
  entries: Record<string, string>,
  failure: "none" | "getter" | "quota" = "none",
  holdDebounce = false,
) {
  // Every Playwright page has an isolated browser context. Fixtures never touch a user's tab.
  await page.addInitScript(
    ({ entries, failure, holdDebounce, draftKey }) => {
      const storage = window.localStorage;
      const nativeGetItem = Storage.prototype.getItem;
      const nativeSetItem = Storage.prototype.setItem;
      if (!sessionStorage.getItem("reset-readme-fixture")) {
        for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
        sessionStorage.setItem("reset-readme-fixture", "ready");
        sessionStorage.setItem("reset-readme-writes", "[]");
      }
      (window as FixtureWindow).resetReadStored = (key) => nativeGetItem.call(storage, key);
      Storage.prototype.setItem = function (key: string, value: string) {
        if (this === storage && key === draftKey) {
          const writes = JSON.parse(sessionStorage.getItem("reset-readme-writes") ?? "[]");
          writes.push(value);
          nativeSetItem.call(sessionStorage, "reset-readme-writes", JSON.stringify(writes));
          if (failure === "quota")
            throw new DOMException("Synthetic draft quota failure", "QuotaExceededError");
        }
        return nativeSetItem.call(this, key, value);
      };
      if (failure === "getter") {
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get() {
            throw new DOMException("Synthetic storage getter failure", "SecurityError");
          },
        });
      }
      if (holdDebounce) {
        const nativeSetTimeout = window.setTimeout.bind(window);
        window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
          nativeSetTimeout(
            handler,
            timeout === 500 ? 60_000 : timeout,
            ...args,
          )) as typeof window.setTimeout;
      }
    },
    { entries, failure, holdDebounce, draftKey },
  );
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("button", { name: messages[locale].reset.action, exact: true }),
  ).toBeEnabled();
}

async function stored(page: Page, key = draftKey) {
  return page.evaluate((key) => (window as FixtureWindow).resetReadStored?.(key) ?? null, key);
}

async function writes(page: Page): Promise<string[]> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("reset-readme-writes") ?? "[]"));
}

async function confirmClear(page: Page, locale: Locale) {
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    expect(dialog.message()).toBe(messages[locale].reset.confirmation);
    await dialog.accept();
  });
  await page.getByRole("button", { name: messages[locale].reset.action, exact: true }).click();
}

async function expectEmpty(page: Page, locale: Locale, contentLocale: Locale) {
  const t = messages[locale];
  const checks = page
    .getByRole("navigation", { name: /^(Your sections|Tus secciones)$/, exact: true })
    .getByRole("checkbox");
  await expect(checks).toHaveCount(5);
  for (const checkbox of await checks.all()) await expect(checkbox).not.toBeChecked();
  await expect(page.getByRole("combobox", { name: t.contentLanguage, exact: true })).toHaveValue(
    contentLocale,
  );
  await expect(page.getByRole("button", { name: t.export.copy, exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: t.export.download, exact: true })).toBeDisabled();
  await expect(
    page.getByRole("heading", { name: t.settings.chooseTitle, exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("textbox", { name: t.presentation.displayName, exact: true }),
  ).toHaveCount(0);
}

async function editInMemoryName(page: Page, locale: Locale, text: string) {
  await page.getByRole("checkbox", { name: sectionName[locale], exact: true }).check();
  await page.getByRole("button", { name: sectionName[locale], exact: true }).click();
  await page
    .getByRole("textbox", { name: messages[locale].presentation.displayName, exact: true })
    .fill(text);
}

for (const locale of ["en", "es"] as const) {
  test(`clear README ${locale}: cancellation preserves the selected form, source, storage and button focus`, async ({
    page,
  }) => {
    const profile = populatedProfile(locale);
    const entries = preservedRecords(profile);
    await openEditor(page, locale, entries);
    const trigger = page.getByRole("button", { name: messages[locale].reset.action, exact: true });
    await expect(
      page.getByRole("textbox", { name: messages[locale].presentation.displayName, exact: true }),
    ).toHaveValue(profile.data.presentation.displayName);
    page.once("dialog", async (dialog) => {
      expect(dialog.type()).toBe("confirm");
      expect(dialog.message()).toBe(messages[locale].reset.confirmation);
      await dialog.dismiss();
    });

    await trigger.click();

    await expect(trigger).toBeFocused();
    await expect(
      page.getByRole("button", { name: sectionName[locale], exact: true }),
    ).toHaveAttribute("aria-current", "step");
    await expect(
      page.getByRole("textbox", { name: messages[locale].presentation.displayName, exact: true }),
    ).toHaveValue(profile.data.presentation.displayName);
    for (const [key, value] of Object.entries(entries)) expect(await stored(page, key)).toBe(value);
    expect(await writes(page)).toEqual([]);
  });

  test(`clear README ${locale}: confirmation clears every visible, hidden and retired value while keeping language and backups`, async ({
    page,
  }) => {
    const contentLocale = locale === "en" ? "es" : "en";
    const entries = preservedRecords(populatedProfile(contentLocale));
    await openEditor(page, locale, entries);

    await confirmClear(page, locale);

    await expectEmpty(page, locale, contentLocale);
    await expect(
      page.getByRole("status").filter({ hasText: messages[locale].reset.cleared }),
    ).toHaveText(messages[locale].reset.cleared);
    await expect(page.locator("#editor-content-title")).toBeFocused();
    expect(JSON.parse((await stored(page))!)).toEqual(createEmptyProfile(contentLocale));
    expect(await stored(page, legacyKey)).toBe(entries[legacyKey]);
    expect(await stored(page, backupKey)).toBe(entries[backupKey]);
    expect(await writes(page)).toEqual([JSON.stringify(createEmptyProfile(contentLocale))]);

    await page.reload();

    await expectEmpty(page, locale, contentLocale);
    expect(JSON.parse((await stored(page))!)).toEqual(createEmptyProfile(contentLocale));
    expect(await stored(page, legacyKey)).toBe(entries[legacyKey]);
    expect(await stored(page, backupKey)).toBe(entries[backupKey]);
  });
}

test("clear README: a pending debounce, pagehide and locale navigation cannot restore the previous profile", async ({
  page,
}) => {
  const profile = populatedProfile("es");
  const entries = preservedRecords(profile);
  await openEditor(page, "en", entries, "none", true);
  await page
    .getByRole("textbox", { name: en.presentation.displayName, exact: true })
    .fill("A newer unsaved name");
  expect(await writes(page)).toEqual([]);
  expect(await stored(page)).toBe(entries[draftKey]);

  await confirmClear(page, "en");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  await expectEmpty(page, "en", "es");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page).toHaveURL(/\/es\/editor$/);
  await expectEmpty(page, "es", "es");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  expect(await writes(page)).toEqual([JSON.stringify(createEmptyProfile("es"))]);
  expect(JSON.parse((await stored(page))!)).toEqual(createEmptyProfile("es"));
  expect(await stored(page, legacyKey)).toBe(entries[legacyKey]);
  expect(await stored(page, backupKey)).toBe(entries[backupKey]);
});

for (const failure of ["invalid", "getter", "quota"] as const) {
  test(`clear README: ${failure} storage stays protected and reports that clearing only affected memory`, async ({
    page,
  }) => {
    const entries = preservedRecords(populatedProfile("en"));
    if (failure === "invalid") entries[draftKey] = "{original-invalid-value";
    await openEditor(page, "en", entries, failure === "invalid" ? "none" : failure);
    if (failure !== "quota") await editInMemoryName(page, "en", "Unpersisted profile");

    await confirmClear(page, "en");

    await expectEmpty(page, "en", "en");
    await expect(page.getByRole("note").filter({ hasText: en.reset.memoryOnly })).toBeVisible();
    await expect(page.getByRole("note").filter({ hasText: en.reset.memoryOnly })).toHaveText(
      en.reset.memoryOnly,
    );
    expect(await stored(page)).toBe(entries[draftKey]);
    expect(await stored(page, legacyKey)).toBe(entries[legacyKey]);
    expect(await stored(page, backupKey)).toBe(entries[backupKey]);
    const attemptsAfterClear = await writes(page);
    await editInMemoryName(page, "en", "A new memory-only profile");
    await page.waitForTimeout(650);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    expect(await stored(page)).toBe(entries[draftKey]);
    expect(await writes(page)).toEqual(attemptsAfterClear);
    await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
    await expect(page).toHaveURL(/\/es\/editor$/);
    await expect(
      page.getByRole("textbox", { name: es.presentation.displayName, exact: true }),
    ).toHaveValue("A new memory-only profile");
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    expect(await stored(page)).toBe(entries[draftKey]);
    expect(await stored(page, backupKey)).toBe(entries[backupKey]);
    expect(await writes(page)).toEqual(attemptsAfterClear);
  });
}

test("clear README: a draft that became invalid after hydration is not overwritten", async ({
  page,
}) => {
  const entries = preservedRecords(populatedProfile());
  await openEditor(page, "en", entries);
  const invalid = "{changed-by-another-tab";
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: invalid,
  });
  const before = await writes(page);

  await confirmClear(page, "en");

  await expectEmpty(page, "en", "en");
  await expect(page.getByText(en.storage.invalidTitle, { exact: true })).toBeVisible();
  await expect(page.getByRole("note").filter({ hasText: en.reset.memoryOnly })).toBeVisible();
  await expect(page.getByRole("note").filter({ hasText: en.reset.memoryOnly })).toHaveText(
    en.reset.memoryOnly,
  );
  expect(await stored(page)).toBe(invalid);
  expect(await writes(page)).toEqual(before);
});

test("clear README: a confirmed memory-only import remains memory-only and keeps both saved records intact", async ({
  page,
}) => {
  const entries = {
    ...preservedRecords(populatedProfile()),
    [backupKey]: "{protected-invalid-backup",
  };
  await openEditor(page, "en", entries);
  await page.getByRole("button", { name: en.settings.importReadme, exact: true }).click();
  const importer = page.getByRole("region", { name: importEn.title, exact: true });
  await importer
    .getByRole("textbox", { name: importEn.sourceLabel, exact: true })
    .fill("## Imported note\n\nA profile available only in memory.");
  await importer.getByRole("button", { name: importEn.analyze, exact: true }).click();
  await importer.getByRole("button", { name: importEn.continue, exact: true }).click();
  await importer.getByRole("checkbox", { name: importEn.confirmLabel, exact: true }).check();
  await importer.getByRole("button", { name: importEn.confirm, exact: true }).click();
  await expect(
    importer.getByRole("heading", { name: importEn.memoryTitle, exact: true }),
  ).toBeVisible();
  await importer.getByRole("button", { name: importEn.continueMemory, exact: true }).click();
  await expect(importer).toHaveCount(0);
  await expect(page.getByText(en.storage.importMemoryHelp, { exact: true })).toBeVisible();

  await confirmClear(page, "en");

  await expectEmpty(page, "en", "en");
  await expect(page.getByRole("note").filter({ hasText: en.reset.memoryOnly })).toBeVisible();
  await expect(page.getByRole("note").filter({ hasText: en.reset.memoryOnly })).toHaveText(
    en.reset.memoryOnly,
  );
  await expect(page.getByText(en.storage.importMemoryHelp, { exact: true })).toBeVisible();
  await editInMemoryName(page, "en", "New writing after a memory-only reset");
  await page.waitForTimeout(650);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  expect(await stored(page)).toBe(entries[draftKey]);
  expect(await stored(page, backupKey)).toBe(entries[backupKey]);
  expect(await stored(page, legacyKey)).toBe(entries[legacyKey]);
  expect(await writes(page)).toEqual([]);
});

for (const locale of ["en", "es"] as const) {
  test(`accessibility: clear README stays reachable without pushing the first field below a 320px phone viewport ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 568 });
    await page.emulateMedia({ colorScheme: locale === "en" ? "light" : "dark" });
    const profile = createEmptyProfile(locale);
    profile.visibility.presentation = true;
    profile.data.presentation.displayName = "Alex Example";
    await openEditor(page, locale, { [draftKey]: JSON.stringify(profile) });
    const trigger = page.getByRole("button", { name: messages[locale].reset.action, exact: true });
    const firstField = page.getByRole("textbox", {
      name: messages[locale].presentation.displayName,
      exact: true,
    });
    // These measurements and the screenshot precede click, typing, or scrollIntoView.
    await expect(firstField).toHaveValue("Alex Example");
    const measurement = await firstField.boundingBox();
    const buttonBounds = await trigger.boundingBox();
    expect(measurement).not.toBeNull();
    expect(measurement!.y).toBeGreaterThanOrEqual(0);
    expect(measurement!.y + measurement!.height).toBeLessThanOrEqual(568);
    expect(buttonBounds).not.toBeNull();
    expect(buttonBounds!.width).toBeGreaterThanOrEqual(44);
    expect(buttonBounds!.height).toBeGreaterThanOrEqual(44);
    expect(buttonBounds!.y).toBeGreaterThanOrEqual(0);
    expect(buttonBounds!.y + buttonBounds!.height).toBeLessThanOrEqual(568);
    expect(buttonBounds!.x).toBeGreaterThanOrEqual(0);
    expect(buttonBounds!.x + buttonBounds!.width).toBeLessThanOrEqual(320);
    expect(
      await page.evaluate(
        () =>
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth,
      ),
    ).toBe(true);
    await page.screenshot({ path: `work/previews/reset-initial-${locale}-320.png` });
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await trigger.focus();
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toBe(messages[locale].reset.confirmation);
      await dialog.dismiss();
    });
    await trigger.press("Enter");
    await expect(trigger).toBeFocused();
    await expect(firstField).toHaveValue("Alex Example");
  });
}
