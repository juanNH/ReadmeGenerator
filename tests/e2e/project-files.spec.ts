import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Download, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { PROJECT_FILE_MAX_BYTES } from "../../src/core/project";
import {
  createEmptyProfile,
  createEmptyProfileV1,
} from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { createImportBackup } from "../../src/features/editor/import-backup";
import editorEn from "../../src/messages/en/editor.json" with { type: "json" };
import editorEs from "../../src/messages/es/editor.json" with { type: "json" };
import en from "../../src/messages/en/project.json" with { type: "json" };
import es from "../../src/messages/es/project.json" with { type: "json" };
import importEn from "../../src/messages/en/readme-import.json" with { type: "json" };

const draftKey = "github-profile-generator.profile.v2";
const legacyKey = "github-profile-generator.profile.v1";
const projectBackupKey = "github-profile-generator.project-backup.v1";
const importBackupKey = "github-profile-generator.import-backup.v1";
const messages = { en, es };
const editorMessages = { en: editorEn, es: editorEs };
type Locale = keyof typeof messages;
type Failure = "none" | "quota-backup" | "quota-profile" | "getter";
type FixtureWindow = Window & { projectReadStored?: (key: string) => string | null };

function currentProfile(contentLocale: Locale = "en"): ProfileDocument {
  const profile = createEmptyProfile(contentLocale);
  profile.visibility.presentation = true;
  profile.data.presentation = {
    displayName: "Current fictional profile",
    headline: "Small useful tools",
    bio: "My current work stays until confirmation.",
    location: "🇦🇷 Argentina",
    format: { displayNameLevel: 2, displayNameAlignment: "center" },
  };
  profile.data.technologies.groups = [
    {
      id: "own-category",
      name: "My category",
      items: [{ id: "ts", name: "TypeScript", context: "" }],
    },
  ];
  profile.data.knowledge.items = [
    { id: "legacy-knowledge", title: "Kept", description: "Legacy data" },
  ];
  profile.data.contact.links = [
    { id: "hidden-contact", label: "My notes", url: "https://example.com" },
  ];
  profile.data.metrics = {
    username: "fictional-hidden-cards",
    cards: ["calendar", "summary", "languages"],
  };
  profile.customSections = [
    {
      id: "hidden-current",
      title: "Unpublished idea",
      titleAlignment: "right",
      visible: false,
      blocks: [
        { id: "html", type: "html", source: '\ufeff<p align="center">Exact\r\nHTML</p>' },
        {
          id: "code",
          type: "code",
          source: '\ufeff{\r\n  "keep": true\r\n}\r\n',
          language: "JSON",
        },
      ],
    },
  ];
  profile.sectionOrder.splice(1, 0, { kind: "custom", sectionId: "hidden-current" });
  return profile;
}

function candidateProfile(contentLocale: Locale = "es"): ProfileDocument {
  const profile = currentProfile(contentLocale);
  profile.data.presentation.displayName = "Opened fictional project";
  profile.data.presentation.bio = "This came from a saved JSON file.";
  profile.data.presentation.format = {
    displayNameLevel: 3,
    displayNameAlignment: "right",
    bioAlignment: "center",
  };
  profile.data.technologies.groups[0]!.name = "A different category";
  profile.customSections.push({
    id: "candidate-note",
    title: "Imported project note",
    visible: true,
    titleLevel: 3,
    blocks: [{ id: "note", type: "paragraph", text: "Kept as authored", alignment: "center" }],
  });
  profile.sectionOrder.push({ kind: "custom", sectionId: "candidate-note" });
  return profile;
}

function preservedRecords(profile = currentProfile()): Record<string, string> {
  const legacy = createEmptyProfileV1("es");
  legacy.data.presentation.displayName = "Preserved legacy copy";
  const backup = createImportBackup(
    profile,
    "\ufeff# Previous Markdown\r\n\r\nExact original.\r\n",
  );
  if (!backup.success) throw new Error("Expected valid Markdown backup fixture");
  return {
    [draftKey]: JSON.stringify(profile),
    [legacyKey]: JSON.stringify(legacy),
    [importBackupKey]: JSON.stringify(backup.backup),
  };
}

async function openEditor(
  page: Page,
  locale: Locale = "en",
  entries = preservedRecords(),
  failure: Failure = "none",
  holdDebounce = false,
) {
  // Each test uses an isolated browser context and fictional data, never the user's open tab.
  await page.addInitScript(
    ({ entries, failure, holdDebounce, draftKey, projectBackupKey }) => {
      const storage = window.localStorage;
      const nativeGetItem = Storage.prototype.getItem;
      const nativeSetItem = Storage.prototype.setItem;
      if (!sessionStorage.getItem("project-files-fixture")) {
        for (const [key, value] of Object.entries(entries)) storage.setItem(key, value);
        sessionStorage.setItem("project-files-fixture", "ready");
        sessionStorage.setItem("project-files-writes", "[]");
      }
      (window as FixtureWindow).projectReadStored = (key) => nativeGetItem.call(storage, key);
      Storage.prototype.setItem = function (key, value) {
        if (this === storage && (key === draftKey || key === projectBackupKey)) {
          const attempts = JSON.parse(sessionStorage.getItem("project-files-writes") ?? "[]");
          attempts.push({ key, value });
          nativeSetItem.call(sessionStorage, "project-files-writes", JSON.stringify(attempts));
          if (
            (failure === "quota-backup" && key === projectBackupKey) ||
            (failure === "quota-profile" && key === draftKey)
          )
            throw new DOMException("Synthetic project quota failure", "QuotaExceededError");
        }
        return nativeSetItem.call(this, key, value);
      };
      if (failure === "getter")
        Object.defineProperty(window, "localStorage", {
          configurable: true,
          get() {
            throw new DOMException("Synthetic storage failure", "SecurityError");
          },
        });
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
    { entries, failure, holdDebounce, draftKey, projectBackupKey },
  );
  await page.route("https://project-assets.example/**", (route) => route.abort());
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("button", { name: editorMessages[locale].project.open, exact: true }),
  ).toBeEnabled();
}

function panel(page: Page, locale: Locale = "en") {
  return page.getByRole("dialog", { name: messages[locale].title, exact: true });
}

async function openProject(page: Page, locale: Locale = "en") {
  await page
    .getByRole("button", { name: editorMessages[locale].project.open, exact: true })
    .click();
  await expect(
    panel(page, locale).getByRole("heading", { name: messages[locale].title, exact: true }),
  ).toBeFocused();
}

async function chooseFile(
  page: Page,
  document: unknown,
  locale: Locale = "en",
  filename = "fictional.project.json",
) {
  await panel(page, locale)
    .locator('input[type="file"]')
    .setInputFiles({
      name: filename,
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(document)),
    });
  await expect(
    panel(page, locale).getByRole("heading", { name: messages[locale].steps.review, exact: true }),
  ).toBeFocused();
}

async function acknowledgeReplacement(page: Page, locale: Locale = "en") {
  const p = panel(page, locale);
  const t = messages[locale];
  await p.getByRole("button", { name: t.continue, exact: true }).click();
  await expect(p.getByRole("heading", { name: t.steps.confirm, exact: true })).toBeFocused();
  await expect(p.getByRole("button", { name: t.confirmReplace, exact: true })).toBeDisabled();
  await p.getByRole("checkbox", { name: t.confirmLabel, exact: true }).check();
}

async function replaceProject(page: Page, locale: Locale = "en") {
  await acknowledgeReplacement(page, locale);
  await panel(page, locale)
    .getByRole("button", { name: messages[locale].confirmReplace, exact: true })
    .click();
  await expect(panel(page, locale)).toHaveCount(0);
}

async function stored(page: Page, key = draftKey): Promise<string | null> {
  return page.evaluate((key) => (window as FixtureWindow).projectReadStored?.(key) ?? null, key);
}

async function writes(page: Page): Promise<{ key: string; value: string }[]> {
  return page.evaluate(() => JSON.parse(sessionStorage.getItem("project-files-writes") ?? "[]"));
}

async function downloaded(download: Download) {
  const path = await download.path();
  if (!path) throw new Error("Expected local project download");
  return readFile(path, "utf8");
}

async function backupDetails(page: Page, locale: Locale = "en") {
  const details = panel(page, locale)
    .locator("details")
    .filter({ has: page.getByText(messages[locale].backup.title, { exact: true }) });
  if (!(await details.evaluate((node) => (node as HTMLDetailsElement).open)))
    await details.locator("summary").click();
  return details;
}

for (const locale of ["en", "es"] as const) {
  test(`project files ${locale}: download preserves complete authored state even when the README cannot export`, async ({
    page,
  }) => {
    const current = currentProfile(locale);
    current.visibility.contact = true;
    current.data.contact.links[0]!.url = "javascript:unfinished";
    const entries = preservedRecords(current);
    await openEditor(page, locale, entries);
    await expect(
      page.getByRole("button", { name: editorMessages[locale].export.copy, exact: true }),
    ).toBeDisabled();
    const promise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: editorMessages[locale].project.save, exact: true })
      .click();
    const download = await promise;
    expect(download.suggestedFilename()).toBe("github-profile.project.json");
    const source = await downloaded(download);
    expect(JSON.parse(source)).toEqual(current);
    expect(source).toBe(`${JSON.stringify(current, null, 2)}\n`);
    expect(await stored(page)).toBe(entries[draftKey]);
    expect(await stored(page, projectBackupKey)).toBeNull();
    expect(await writes(page)).toEqual([]);
  });

  test(`project files ${locale}: the visible import action opens a review dialog before replacement`, async ({
    page,
  }) => {
    const entries = preservedRecords(currentProfile(locale));
    await openEditor(page, locale, entries);
    const trigger = page.getByRole("button", {
      name: editorMessages[locale].project.open,
      exact: true,
    });
    await trigger.click();
    const importDialog = panel(page, locale);
    await expect(importDialog).toBeVisible();
    const pickerPromise = page.waitForEvent("filechooser");
    await importDialog
      .getByRole("button", { name: messages[locale].openFile, exact: true })
      .click();
    const picker = await pickerPromise;
    expect(await writes(page)).toEqual([]);
    await picker.setFiles({
      name: "saved.project.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(candidateProfile())),
    });
    await expect(
      panel(page, locale).getByRole("heading", {
        name: messages[locale].steps.review,
        exact: true,
      }),
    ).toBeFocused();
    expect(await stored(page)).toBe(entries[draftKey]);
    expect(await writes(page)).toEqual([]);
    await panel(page, locale)
      .getByRole("button", { name: messages[locale].cancel, exact: true })
      .click();
    await expect(trigger).toBeFocused();
    await expect(panel(page, locale)).toHaveCount(0);
    expect(await stored(page)).toBe(entries[draftKey]);
  });

  test(`project files ${locale}: review and cancellation never replace storage and closing restores focus`, async ({
    page,
  }) => {
    const entries = preservedRecords(currentProfile(locale));
    await openEditor(page, locale, entries);
    await openProject(page, locale);
    const candidate = candidateProfile(locale === "en" ? "es" : "en");
    await chooseFile(page, candidate, locale);
    const p = panel(page, locale);
    await expect(
      p.getByText(messages[locale].languages[candidate.contentLocale], { exact: true }),
    ).toBeVisible();
    await expect(
      p.getByRole("heading", { name: "Imported project note", exact: true }),
    ).toBeVisible();
    await expect(
      p.getByText(messages[locale].summary.hidden, { exact: true }).first(),
    ).toBeVisible();
    await acknowledgeReplacement(page, locale);
    expect(await writes(page)).toEqual([]);
    await p.getByRole("button", { name: messages[locale].backToReview, exact: true }).click();
    await p.getByRole("button", { name: messages[locale].continue, exact: true }).click();
    await expect(
      p.getByRole("checkbox", { name: messages[locale].confirmLabel, exact: true }),
    ).not.toBeChecked();
    await expect(
      p.getByRole("button", { name: messages[locale].confirmReplace, exact: true }),
    ).toBeDisabled();
    await p.getByRole("button", { name: messages[locale].cancel, exact: true }).click();
    await expect(p).toHaveCount(0);
    await expect(
      page.getByRole("button", { name: editorMessages[locale].project.open, exact: true }),
    ).toBeFocused();
    for (const [key, value] of Object.entries(entries)) expect(await stored(page, key)).toBe(value);
    expect(await stored(page, projectBackupKey)).toBeNull();
    expect(await writes(page)).toEqual([]);
  });

  test(`project files ${locale}: confirmation backs up first, reloads exactly and restores the previous profile`, async ({
    page,
  }) => {
    const current = currentProfile(locale);
    const candidate = candidateProfile(locale === "en" ? "es" : "en");
    const entries = preservedRecords(current);
    await openEditor(page, locale, entries);
    await openProject(page, locale);
    await chooseFile(page, candidate, locale);
    await replaceProject(page, locale);
    expect(
      (await writes(page)).map(({ key, value }) => ({ key, value: JSON.parse(value) })),
    ).toEqual([
      {
        key: projectBackupKey,
        value: { schemaVersion: 1, previousDocument: current },
      },
      { key: draftKey, value: candidate },
    ]);
    expect(JSON.parse((await stored(page))!)).toEqual(candidate);
    expect(await stored(page, importBackupKey)).toBe(entries[importBackupKey]);
    expect(await stored(page, legacyKey)).toBe(entries[legacyKey]);
    await expect(
      page.getByRole("combobox", { name: editorMessages[locale].contentLanguage, exact: true }),
    ).toHaveValue(candidate.contentLocale);
    await expect(page).toHaveURL(new RegExp(`/${locale}/editor$`));
    await page.reload();
    await expect(
      page.getByRole("textbox", {
        name: editorMessages[locale].presentation.displayName,
        exact: true,
      }),
    ).toHaveValue(candidate.data.presentation.displayName);
    await openProject(page, locale);
    const details = await backupDetails(page, locale);
    const downloadPromise = page.waitForEvent("download");
    await details
      .getByRole("button", { name: messages[locale].backup.download, exact: true })
      .click();
    expect(JSON.parse(await downloaded(await downloadPromise))).toEqual(current);
    await details
      .getByRole("button", { name: messages[locale].backup.restore, exact: true })
      .click();
    const p = panel(page, locale);
    await expect(
      p.getByRole("button", { name: messages[locale].confirmRestore, exact: true }),
    ).toBeDisabled();
    await p.getByRole("checkbox", { name: messages[locale].restoreLabel, exact: true }).check();
    await p.getByRole("button", { name: messages[locale].confirmRestore, exact: true }).click();
    await expect(p).toHaveCount(0);
    expect(JSON.parse((await stored(page))!)).toEqual(current);
    expect(JSON.parse((await stored(page, projectBackupKey))!)).toEqual({
      schemaVersion: 1,
      previousDocument: current,
    });
    expect(await stored(page, importBackupKey)).toBe(entries[importBackupKey]);
    expect(await stored(page, legacyKey)).toBe(entries[legacyKey]);
    await page.reload();
    await expect(
      page.getByRole("textbox", {
        name: editorMessages[locale].presentation.displayName,
        exact: true,
      }),
    ).toHaveValue(current.data.presentation.displayName);
  });
}

test("project files: a UTF-8 BOM v1 file migrates for review and keeps the existing v1 storage key exact", async ({
  page,
}) => {
  const legacy = createEmptyProfileV1("es");
  legacy.visibility.presentation = true;
  legacy.data.presentation.displayName = "Legacy file candidate";
  legacy.moduleOrder.reverse();
  const entries = preservedRecords();
  await openEditor(page, "en", entries);
  await openProject(page);
  await panel(page)
    .locator('input[type="file"]')
    .setInputFiles({
      name: "legacy-with-bom.json",
      mimeType: "application/json",
      buffer: Buffer.from(`\ufeff${JSON.stringify(legacy)}`),
    });
  await expect(
    panel(page).getByRole("heading", { name: en.steps.review, exact: true }),
  ).toBeFocused();
  await expect(panel(page).getByText(en.migrated, { exact: true })).toBeVisible();
  expect(await stored(page)).toBe(entries[draftKey]);
  await replaceProject(page);
  const migrated = JSON.parse((await stored(page))!);
  expect(migrated.schemaVersion).toBe(2);
  expect(migrated.data).toEqual(legacy.data);
  expect(migrated.sectionOrder).toEqual(
    legacy.moduleOrder.map((moduleId) => ({ kind: "module", moduleId })),
  );
  expect(migrated).not.toHaveProperty("moduleOrder");
  expect(await stored(page, legacyKey)).toBe(entries[legacyKey]);
});

test("project files: replacing a draft recovered from v1 backs up its migrated state without rewriting v1", async ({
  page,
}) => {
  const legacy = createEmptyProfileV1("es");
  legacy.visibility.presentation = true;
  legacy.data.presentation.displayName = "Current from v1";
  await openEditor(page, "en", { [legacyKey]: JSON.stringify(legacy) });
  expect(await stored(page)).toBeNull();
  await openProject(page);
  await chooseFile(page, candidateProfile());
  await replaceProject(page);
  const backup = JSON.parse((await stored(page, projectBackupKey))!);
  expect(backup.previousDocument.schemaVersion).toBe(2);
  expect(backup.previousDocument.data).toEqual(legacy.data);
  expect(await stored(page, legacyKey)).toBe(JSON.stringify(legacy));
});

test("project files: candidate HTML, images and cards remain inert during review and confirmation", async ({
  page,
}) => {
  await openEditor(page);
  await openProject(page);
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("project-assets.example") ||
      request.url().includes("/api/github/") ||
      request.url().includes("/cards/github/")
    )
      requests.push(request.url());
  });
  const candidate = candidateProfile();
  candidate.visibility.metrics = true;
  candidate.data.metrics = {
    username: "fictional-review-only",
    cards: ["calendar", "summary", "languages"],
  };
  candidate.customSections[1]!.blocks = [
    {
      id: "html",
      type: "html",
      source:
        '<img src="https://project-assets.example/remote.png" alt="Banner" onerror="window.projectExecuted=true"><script>window.projectExecuted=true</script>',
    },
    { id: "image", type: "image", url: "https://project-assets.example/banner.svg", alt: "Banner" },
    {
      id: "code",
      type: "code",
      source: "<script>window.projectExecuted=true</script>",
      language: "html",
    },
  ];
  await chooseFile(page, candidate);
  await expect(panel(page).locator("img,script,iframe,pre")).toHaveCount(0);
  expect(await page.evaluate(() => "projectExecuted" in window)).toBe(false);
  await acknowledgeReplacement(page);
  await page.waitForTimeout(250);
  expect(requests).toEqual([]);
  expect(await stored(page, projectBackupKey)).toBeNull();
  expect(await writes(page)).toEqual([]);
});

const invalidFiles = [
  { name: "malformed.json", buffer: Buffer.from("{unfinished"), code: "invalid_json" },
  {
    name: "unknown.json",
    buffer: Buffer.from(JSON.stringify({ ...candidateProfile(), unrecognized: "keep original" })),
    code: "invalid_document",
  },
  {
    name: "future.json",
    buffer: Buffer.from(JSON.stringify({ ...candidateProfile(), schemaVersion: 999 })),
    code: "unsupported_version",
  },
  { name: "bad-encoding.json", buffer: Buffer.from([0xc3, 0x28]), code: "encoding" },
  { name: "large.json", buffer: Buffer.alloc(PROJECT_FILE_MAX_BYTES + 1, 65), code: "too_large" },
  { name: "wrong.md", buffer: Buffer.from("# Not a project"), code: "file_type" },
  { name: "empty.json", buffer: Buffer.alloc(0), code: "invalid_json" },
] as const;

for (const file of invalidFiles) {
  test(`project files: ${file.name} keeps current profile and both backup records intact`, async ({
    page,
  }) => {
    const entries = {
      ...preservedRecords(),
      [projectBackupKey]: JSON.stringify({
        schemaVersion: 1,
        previousDocument: currentProfile("es"),
      }),
    };
    await openEditor(page, "en", entries);
    await openProject(page);
    await panel(page)
      .locator('input[type="file"]')
      .setInputFiles({ name: file.name, mimeType: "application/json", buffer: file.buffer });
    const text = en.errors[file.code].replace("{limit}", "4");
    await expect(panel(page).getByRole("alert")).toHaveText(text);
    await expect(panel(page).getByRole("alert")).toBeFocused();
    await expect(
      panel(page).getByRole("heading", { name: en.steps.source, exact: true }),
    ).toBeVisible();
    for (const [key, value] of Object.entries(entries)) expect(await stored(page, key)).toBe(value);
    expect(await writes(page)).toEqual([]);
  });
}

for (const failure of [
  "invalid-profile",
  "invalid-backup",
  "quota-backup",
  "quota-profile",
  "getter",
] as const) {
  test(`project files: ${failure} requires explicit memory-only continuation and keeps protected records`, async ({
    page,
  }) => {
    const invalid = "{protected-invalid-project-value";
    const entries = preservedRecords();
    if (failure === "invalid-profile") entries[draftKey] = invalid;
    if (failure === "invalid-backup") entries[projectBackupKey] = invalid;
    const storageFailure = failure.startsWith("invalid") ? "none" : failure;
    await openEditor(page, "en", entries, storageFailure as Failure);
    await openProject(page);
    const candidate = candidateProfile();
    await chooseFile(page, candidate);
    await acknowledgeReplacement(page);
    await panel(page).getByRole("button", { name: en.confirmReplace, exact: true }).click();
    await expect(
      panel(page).getByRole("heading", { name: en.memory.title, exact: true }),
    ).toBeFocused();
    expect(await stored(page)).toBe(entries[draftKey]);
    expect(await stored(page, importBackupKey)).toBe(entries[importBackupKey]);
    if (failure === "invalid-backup") expect(await stored(page, projectBackupKey)).toBe(invalid);
    if (failure === "quota-backup" || failure === "invalid-profile" || failure === "getter")
      expect(await stored(page, projectBackupKey)).toBeNull();
    const attempts = await writes(page);
    const recoveryPromise = page.waitForEvent("download");
    await panel(page).getByRole("button", { name: en.downloadCurrent, exact: true }).click();
    const recovery = JSON.parse(await downloaded(await recoveryPromise));
    expect(recovery.data.presentation.displayName).toBe(
      failure === "invalid-profile" || failure === "getter"
        ? ""
        : currentProfile().data.presentation.displayName,
    );
    await panel(page).getByRole("button", { name: en.memory.continue, exact: true }).click();
    await expect(panel(page)).toHaveCount(0);
    const name = page.getByRole("textbox", {
      name: editorEn.presentation.displayName,
      exact: true,
    });
    await expect(name).toHaveValue(candidate.data.presentation.displayName);
    await name.fill("A later memory-only edit");
    await page.waitForTimeout(650);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    expect(await stored(page)).toBe(entries[draftKey]);
    expect(await writes(page)).toEqual(attempts);
    expect(await stored(page, importBackupKey)).toBe(entries[importBackupKey]);
    expect(await stored(page, legacyKey)).toBe(entries[legacyKey]);
    await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
    await expect(page).toHaveURL(/\/es\/editor$/);
    await expect(
      page.getByRole("textbox", { name: editorEs.presentation.displayName, exact: true }),
    ).toHaveValue("A later memory-only edit");
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    expect(await stored(page)).toBe(entries[draftKey]);
    expect(await writes(page)).toEqual(attempts);
  });
}

test("project files: cancelling the memory-only offer leaves the active profile unchanged", async ({
  page,
}) => {
  const entries = { ...preservedRecords(), [projectBackupKey]: "{invalid-kept" };
  await openEditor(page, "en", entries);
  await openProject(page);
  await chooseFile(page, candidateProfile());
  await acknowledgeReplacement(page);
  await panel(page).getByRole("button", { name: en.confirmReplace, exact: true }).click();
  await panel(page).getByRole("button", { name: en.memory.cancel, exact: true }).click();
  await expect(
    panel(page).getByRole("heading", { name: en.steps.review, exact: true }),
  ).toBeFocused();
  await panel(page).getByRole("button", { name: en.cancel, exact: true }).click();
  await expect(
    page.getByRole("textbox", { name: editorEn.presentation.displayName, exact: true }),
  ).toHaveValue(currentProfile().data.presentation.displayName);
  for (const [key, value] of Object.entries(entries)) expect(await stored(page, key)).toBe(value);
  expect(await writes(page)).toEqual([]);
});

test("project files: latest pending edits are backed up and pagehide cannot revive the old profile", async ({
  page,
}) => {
  const entries = preservedRecords();
  const candidate = candidateProfile();
  await openEditor(page, "en", entries, "none", true);
  await openProject(page);
  await chooseFile(page, candidate);
  await acknowledgeReplacement(page);
  await page
    .getByRole("textbox", { name: editorEn.presentation.displayName, exact: true })
    .fill("Latest unsaved current name");
  expect(await stored(page)).toBe(entries[draftKey]);
  await panel(page).getByRole("button", { name: en.confirmReplace, exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  const backup = JSON.parse((await stored(page, projectBackupKey))!);
  expect(backup.previousDocument.data.presentation.displayName).toBe("Latest unsaved current name");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  expect(JSON.parse((await stored(page))!)).toEqual(candidate);
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page).toHaveURL(/\/es\/editor$/);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  expect(JSON.parse((await stored(page))!)).toEqual(candidate);
  expect(await stored(page, importBackupKey)).toBe(entries[importBackupKey]);
});

test("project files: choosing another file discards old confirmation and cannot apply the first candidate", async ({
  page,
}) => {
  await openEditor(page);
  await openProject(page);
  await chooseFile(page, candidateProfile(), "en", "first.json");
  await acknowledgeReplacement(page);
  await panel(page).getByRole("button", { name: en.backToReview, exact: true }).click();
  await panel(page).getByRole("button", { name: en.chooseAnother, exact: true }).click();
  const second = candidateProfile("en");
  second.data.presentation.displayName = "Second reviewed candidate";
  await chooseFile(page, second, "en", "second.json");
  await replaceProject(page);
  expect(JSON.parse((await stored(page))!)).toEqual(second);
});

async function delayFirstFile(page: Page) {
  await page.evaluate(() => {
    const nativeRead = FileReader.prototype.readAsArrayBuffer;
    FileReader.prototype.readAsArrayBuffer = function (file) {
      if (file instanceof File && file.name === "slow.json")
        window.setTimeout(() => nativeRead.call(this, file), 300);
      else nativeRead.call(this, file);
    };
  });
}

test("project files: a late first file cannot replace the newer reviewed candidate", async ({
  page,
}) => {
  await openEditor(page);
  await openProject(page);
  await delayFirstFile(page);
  const p = panel(page);
  const first = candidateProfile();
  first.customSections[1]!.title = "Stale file summary";
  await p.locator('input[type="file"]').setInputFiles({
    name: "slow.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(first)),
  });
  const second = candidateProfile("en");
  second.customSections[1]!.title = "Latest file summary";
  await chooseFile(page, second, "en", "latest.json");
  await page.waitForTimeout(450);
  await expect(p.getByRole("heading", { name: "Latest file summary", exact: true })).toBeVisible();
  await expect(p.getByRole("heading", { name: "Stale file summary", exact: true })).toHaveCount(0);
  expect(await writes(page)).toEqual([]);
  await replaceProject(page);
  expect(JSON.parse((await stored(page))!)).toEqual(second);
});

test("project files: closing during file reading ignores its late result", async ({ page }) => {
  await openEditor(page);
  await openProject(page);
  await delayFirstFile(page);
  await panel(page)
    .locator('input[type="file"]')
    .setInputFiles({
      name: "slow.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(candidateProfile())),
    });
  await panel(page).getByRole("button", { name: en.close, exact: true }).click();
  await page.waitForTimeout(450);
  await expect(panel(page)).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: editorEn.project.open, exact: true }),
  ).toBeFocused();
  expect(await writes(page)).toEqual([]);
  await openProject(page);
  await expect(
    panel(page).getByRole("heading", { name: en.steps.source, exact: true }),
  ).toBeVisible();
});

test("project files: an earlier memory-only Markdown import stays protected when opening a project", async ({
  page,
}) => {
  const entries = { ...preservedRecords(), [importBackupKey]: "{protected-markdown-backup" };
  await openEditor(page, "en", entries);
  await page.getByRole("button", { name: editorEn.settings.importReadme, exact: true }).click();
  const importer = page.getByRole("region", { name: importEn.title, exact: true });
  await importer
    .getByRole("textbox", { name: importEn.sourceLabel, exact: true })
    .fill("## Memory-only note\n\nKept after importing.");
  await importer.getByRole("button", { name: importEn.analyze, exact: true }).click();
  await importer.getByRole("button", { name: importEn.continue, exact: true }).click();
  await importer.getByRole("checkbox", { name: importEn.confirmLabel, exact: true }).check();
  await importer.getByRole("button", { name: importEn.confirm, exact: true }).click();
  await importer.getByRole("button", { name: importEn.continueMemory, exact: true }).click();
  await expect(importer).toHaveCount(0);
  await openProject(page);
  await chooseFile(page, candidateProfile());
  await acknowledgeReplacement(page);
  await panel(page).getByRole("button", { name: en.confirmReplace, exact: true }).click();
  await expect(
    panel(page).getByRole("heading", { name: en.memory.title, exact: true }),
  ).toBeFocused();
  expect(await stored(page, projectBackupKey)).toBeNull();
  await panel(page).getByRole("button", { name: en.memory.continue, exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  await page.waitForTimeout(650);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  for (const [key, value] of Object.entries(entries)) expect(await stored(page, key)).toBe(value);
  expect(await writes(page)).toEqual([]);
});

test("project files: restoring after a write failure requires explicit memory-only confirmation and preserves backups", async ({
  page,
}) => {
  const previous = currentProfile("es");
  const entries = {
    ...preservedRecords(),
    [projectBackupKey]: JSON.stringify({ schemaVersion: 1, previousDocument: previous }),
  };
  await openEditor(page, "en", entries, "quota-profile");
  await openProject(page);
  const details = await backupDetails(page);
  await details.getByRole("button", { name: en.backup.restore, exact: true }).click();
  await panel(page).getByRole("checkbox", { name: en.restoreLabel, exact: true }).check();
  await panel(page).getByRole("button", { name: en.confirmRestore, exact: true }).click();
  await expect(
    panel(page).getByRole("heading", { name: en.memory.title, exact: true }),
  ).toBeFocused();
  await panel(page).getByRole("button", { name: en.memory.continue, exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  await expect(
    page.getByRole("combobox", { name: editorEn.contentLanguage, exact: true }),
  ).toHaveValue("es");
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  for (const [key, value] of Object.entries(entries)) expect(await stored(page, key)).toBe(value);
});

for (const locale of ["en", "es"] as const) {
  test(`project files ${locale}: JSON actions stay aligned at 305px usable width`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 305, height: 568 });
    await openEditor(page, locale, preservedRecords(currentProfile(locale)));
    // A desktop scrollbar can leave 305 CSS pixels inside a 320px browser window.
    // Measure the JSON actions before any interaction; navigation may need natural scrolling.
    const bounds = [];
    for (const name of [
      editorMessages[locale].project.saveCompact,
      editorMessages[locale].project.openCompact,
    ]) {
      const action = page.getByRole("button", { name, exact: true });
      await expect(action.locator("span:visible")).toHaveText(name);
      const box = await action.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBe(44);
      expect(box!.width).toBeGreaterThanOrEqual(44);
      expect(box!.y).toBeGreaterThanOrEqual(0);
      expect(box!.y + box!.height).toBeLessThanOrEqual(568);
      bounds.push(box!);
    }
    expect(bounds[0]!.y).toBe(bounds[1]!.y);
    expect(
      await page.evaluate(
        () =>
          Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth,
      ),
    ).toBe(true);
  });

  for (const theme of ["light", "dark"] as const) {
    test(`accessibility: project actions keep the initial field reachable and review usable on a 320px phone ${locale} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.emulateMedia({ colorScheme: theme });
      await openEditor(page, locale, preservedRecords(currentProfile(locale)));
      const firstField = page.getByRole("textbox", {
        name: editorMessages[locale].presentation.displayName,
        exact: true,
      });
      await expect(firstField).toHaveValue("Current fictional profile");
      // Measure before click, typing or scrollIntoView; visibility alone cannot establish reach.
      for (const name of [
        editorMessages[locale].project.saveCompact,
        editorMessages[locale].project.openCompact,
      ]) {
        const action = page.getByRole("button", { name, exact: true });
        await expect(action.locator("span:visible")).toHaveText(name);
        const actionBounds = await action.boundingBox();
        expect(actionBounds).not.toBeNull();
        expect(actionBounds!.y).toBeGreaterThanOrEqual(0);
        expect(actionBounds!.y + actionBounds!.height).toBeLessThanOrEqual(568);
        expect(actionBounds!.width).toBeGreaterThanOrEqual(44);
        expect(actionBounds!.height).toBeGreaterThanOrEqual(44);
      }
      const bounds = await firstField.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(568);
      await page.screenshot({ path: `work/previews/project-initial-${locale}-${theme}-320.png` });
      await openProject(page, locale);
      const check = async () => {
        expect(
          await page.evaluate(
            () =>
              Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <=
              innerWidth,
          ),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      };
      const expectStepUncovered = async (name: string) => {
        const heading = panel(page, locale).getByRole("heading", { name, exact: true });
        const box = await heading.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.y).toBeGreaterThanOrEqual(0);
        expect(box!.y + box!.height).toBeLessThanOrEqual(568);
        const controls = await page
          .getByRole("region", { name: editorMessages[locale].settings.controls, exact: true })
          .boundingBox();
        expect(controls).not.toBeNull();
        expect(
          box!.y >= controls!.y + controls!.height || box!.y + box!.height <= controls!.y,
        ).toBe(true);
        expect(
          await heading.evaluate((node) => {
            const rectangle = node.getBoundingClientRect();
            const hit = document.elementFromPoint(
              rectangle.x + rectangle.width / 2,
              rectangle.y + rectangle.height / 2,
            );
            return hit !== null && node.contains(hit);
          }),
        ).toBe(true);
      };
      await check();
      await chooseFile(page, candidateProfile(), locale);
      // Focus may intentionally reveal the new step; no click or screenshot scroll comes first.
      await expectStepUncovered(messages[locale].steps.review);
      await check();
      await page.screenshot({
        path: `work/previews/project-review-${locale}-${theme}-320.png`,
      });
      await panel(page, locale)
        .getByRole("button", { name: messages[locale].continue, exact: true })
        .click();
      await expectStepUncovered(messages[locale].steps.confirm);
      await check();
      await page.screenshot({ path: `work/previews/project-confirm-${locale}-${theme}-320.png` });
      await panel(page, locale)
        .getByRole("heading", { name: messages[locale].steps.confirm, exact: true })
        .press("Tab");
      await expect(
        panel(page, locale).getByRole("checkbox", {
          name: messages[locale].confirmLabel,
          exact: true,
        }),
      ).toBeFocused();
      await panel(page, locale)
        .getByRole("checkbox", { name: messages[locale].confirmLabel, exact: true })
        .press("Space");
      await expect(
        panel(page, locale).getByRole("button", {
          name: messages[locale].confirmReplace,
          exact: true,
        }),
      ).toBeEnabled();
      await panel(page, locale)
        .getByRole("button", { name: messages[locale].cancel, exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: editorMessages[locale].project.open, exact: true }),
      ).toBeFocused();
      expect(await writes(page)).toEqual([]);
    });
  }
}

test("accessibility: project controls remain usable after long editing with 200 percent text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 375, height: 667 });
  await openEditor(page);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await page
    .getByRole("textbox", { name: editorEn.presentation.bio, exact: true })
    .fill("A long fictional editing session.\n".repeat(80));
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await openProject(page);
  await expect(
    panel(page).getByRole("button", { name: en.downloadCurrent, exact: true }),
  ).toBeVisible();
  await chooseFile(page, candidateProfile());
  expect(
    await page.evaluate(
      () => Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) <= innerWidth,
    ),
  ).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await panel(page).getByRole("button", { name: en.cancel, exact: true }).click();
  await expect(
    page.getByRole("button", { name: editorEn.project.open, exact: true }),
  ).toBeFocused();
});
