import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Download, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { parseReadmeManifest } from "../../src/core/readme";
import editorEn from "../../src/messages/en/editor.json" with { type: "json" };
import editorEs from "../../src/messages/es/editor.json" with { type: "json" };
import en from "../../src/messages/en/readme-import.json" with { type: "json" };
import es from "../../src/messages/es/readme-import.json" with { type: "json" };

const draftKey = "github-profile-generator.profile.v2";
const legacyKey = "github-profile-generator.profile.v1";
const backupKey = "github-profile-generator.import-backup.v1";
const messages = { en, es };
const editorMessages = { en: editorEn, es: editorEs };
type Locale = keyof typeof messages;
const source =
  "## Hello\n\nI make small tools.\n\n## Things I use\n\n- TypeScript\n- PostgreSQL\n\n## Find me\n\n[My notes](https://example.com/notes)\n";

function previousProfile(locale: Locale = "en"): ProfileDocument {
  const document = createEmptyProfile(locale);
  document.visibility.presentation = true;
  document.data.presentation.displayName = "Alex Example";
  document.data.presentation.bio = "The current draft stays until confirmation.";
  document.customSections.push({
    id: "hidden-previous-section",
    title: "Hidden idea",
    visible: false,
    blocks: [{ id: "hidden-previous-block", type: "paragraph", text: "Keep this hidden note." }],
  });
  document.sectionOrder.splice(1, 0, { kind: "custom", sectionId: "hidden-previous-section" });
  return document;
}

function recoveryProfile(locale: Locale): ProfileDocument {
  const document = createEmptyProfile(locale);
  document.customSections.push(
    {
      id: "roundtrip-visible-section",
      title: "A current note",
      visible: true,
      blocks: [
        {
          id: "roundtrip-visible-block",
          type: "paragraph",
          text: "A note that should change.",
        },
      ],
    },
    {
      id: "roundtrip-hidden-section",
      title: "Private editor note",
      visible: false,
      blocks: [
        {
          id: "roundtrip-hidden-block",
          type: "paragraph",
          text: "This hidden editor note is part of the saved profile.",
        },
      ],
    },
  );
  document.sectionOrder.push(
    { kind: "custom", sectionId: "roundtrip-visible-section" },
    { kind: "custom", sectionId: "roundtrip-hidden-section" },
  );
  return document;
}

async function openEditor(
  page: Page,
  locale: Locale = "en",
  entries: Record<string, string> = { [draftKey]: JSON.stringify(previousProfile(locale)) },
) {
  await page.addInitScript((values) => {
    if (sessionStorage.getItem("readme-import-fixture")) return;
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
    sessionStorage.setItem("readme-import-fixture", "ready");
  }, entries);
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("button", {
      name: locale === "en" ? "Import README" : "Importar README",
      exact: true,
    }),
  ).toBeEnabled();
}

function panel(page: Page) {
  return page.getByRole("region", { name: /^(Import a README|Importar un README)$/, exact: true });
}

async function openImporter(page: Page, locale: Locale = "en") {
  const trigger = page.getByRole("button", {
    name: locale === "en" ? "Import README" : "Importar README",
    exact: true,
  });
  await trigger.click();
  await expect(panel(page)).toBeVisible();
  return panel(page);
}

async function detect(page: Page, text = source, locale: Locale = "en") {
  const t = messages[locale];
  await panel(page).getByRole("textbox", { name: t.sourceLabel, exact: true }).fill(text);
  await panel(page).getByRole("button", { name: t.analyze, exact: true }).click();
  await expect(
    panel(page).getByRole("heading", { name: t.reviewTitle, exact: true }),
  ).toBeVisible();
}

async function reachConfirmation(page: Page, locale: Locale = "en") {
  const t = messages[locale];
  await panel(page).getByRole("button", { name: t.continue, exact: true }).click();
  await expect(panel(page).getByRole("button", { name: t.confirm, exact: true })).toBeDisabled();
  await panel(page).getByRole("checkbox", { name: t.confirmLabel, exact: true }).check();
}

async function confirmImport(page: Page, locale: Locale = "en") {
  await reachConfirmation(page, locale);
  await panel(page).getByRole("button", { name: messages[locale].confirm, exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
}

async function stored(page: Page, key = draftKey): Promise<string | null> {
  return page.evaluate((storageKey) => localStorage.getItem(storageKey), key);
}

async function storedProfile(page: Page): Promise<ProfileDocument> {
  return JSON.parse((await stored(page)) ?? "null");
}

async function downloaded(download: Download) {
  const path = await download.path();
  if (!path) throw new Error("Expected the local download to be available.");
  return readFile(path, "utf8");
}

async function downloadReadme(page: Page, locale: Locale) {
  const downloadEvent = page.waitForEvent("download");
  await page
    .getByRole("button", { name: editorMessages[locale].export.download, exact: true })
    .click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe("README.md");
  return download;
}

async function openDownloadedReadme(page: Page, download: Download, locale: Locale) {
  const markdown = await downloaded(download);
  await panel(page)
    .locator('input[type="file"]')
    .setInputFiles({
      name: download.suggestedFilename(),
      mimeType: "text/markdown",
      buffer: Buffer.from(markdown, "utf8"),
    });
  await expect(
    panel(page).getByRole("textbox", { name: messages[locale].sourceLabel, exact: true }),
  ).toHaveValue(markdown);
  return markdown;
}

for (const locale of ["en", "es"] as const) {
  test(`README round trip ${locale}: one downloaded file restores the complete profile`, async ({
    page,
  }) => {
    const original = recoveryProfile(locale);
    const t = messages[locale];
    const exportText = editorMessages[locale].export;
    await openEditor(page, locale, { [draftKey]: JSON.stringify(original) });
    const snapshotToggle = page.getByRole("checkbox", {
      name: exportText.recoverySnapshotLabel,
      exact: true,
    });
    await expect(snapshotToggle).not.toBeChecked();
    await expect(page.getByText(exportText.recoverySnapshotWarning, { exact: true })).toHaveCount(
      0,
    );

    const structuralDownload = await downloadReadme(page, locale);
    const structural = parseReadmeManifest(await downloaded(structuralDownload));
    expect(structural.status).toBe("valid");
    if (structural.status !== "valid") throw new Error("Expected an app-generated manifest.");
    expect(structural.manifest.recoverySnapshot).toBeUndefined();

    await snapshotToggle.check();
    await expect(page.getByText(exportText.recoverySnapshotWarning, { exact: true })).toBeVisible();
    const fullDownload = await downloadReadme(page, locale);
    const markdown = await downloaded(fullDownload);
    const parsed = parseReadmeManifest(markdown);
    expect(parsed.status).toBe("valid");
    if (parsed.status !== "valid") throw new Error("Expected a valid full recovery manifest.");
    expect(parsed.manifest.recoverySnapshot).toEqual(original);
    expect(markdown).toContain("This hidden editor note is part of the saved profile.");

    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: draftKey,
      value: JSON.stringify(createEmptyProfile(locale)),
    });
    await page.reload();
    await openImporter(page, locale);
    await openDownloadedReadme(page, fullDownload, locale);
    await panel(page).getByRole("button", { name: t.analyze, exact: true }).click();
    await expect(
      panel(page).getByRole("heading", { name: t.reviewTitle, exact: true }),
    ).toBeVisible();
    await expect(panel(page).getByText(t.recovery.snapshotMatch, { exact: true })).toBeVisible();
    await expect(
      panel(page).getByRole("radio", { name: t.recovery.exactOption, exact: true }),
    ).toBeChecked();
    await expect(panel(page).locator("ol")).toHaveCount(0);
    await expect(
      panel(page).getByRole("button", { name: t.recovery.continueSnapshot, exact: true }),
    ).toBeEnabled();
    await panel(page)
      .getByRole("button", { name: t.recovery.continueSnapshot, exact: true })
      .click();
    await expect(
      panel(page).getByRole("button", { name: t.recovery.confirmSnapshot, exact: true }),
    ).toBeDisabled();
    await panel(page)
      .getByRole("checkbox", { name: t.recovery.confirmSnapshotLabel, exact: true })
      .check();
    await panel(page)
      .getByRole("button", { name: t.recovery.confirmSnapshot, exact: true })
      .click();
    await expect(panel(page)).toHaveCount(0);
    expect(await storedProfile(page)).toEqual(original);
    expect(JSON.parse((await stored(page, backupKey)) ?? "null").originalSource).toBe(markdown);
  });

  test(`README round trip ${locale}: edited visible text offers both saved and current content`, async ({
    page,
  }) => {
    const original = recoveryProfile(locale);
    const t = messages[locale];
    await openEditor(page, locale, { [draftKey]: JSON.stringify(original) });
    await page
      .getByRole("checkbox", {
        name: editorMessages[locale].export.recoverySnapshotLabel,
        exact: true,
      })
      .check();
    const download = await downloadReadme(page, locale);
    const markdown = await downloaded(download);
    const parsed = parseReadmeManifest(markdown);
    expect(parsed.status).toBe("valid");
    if (parsed.status !== "valid") throw new Error("Expected a valid full recovery manifest.");
    const edited = `${parsed.markdown}\nThis README was edited outside the app.\n${markdown.slice(parsed.markdown.length)}`;
    expect(parseReadmeManifest(edited)).toMatchObject({ status: "valid", matchesSource: false });

    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: draftKey,
      value: JSON.stringify(createEmptyProfile(locale)),
    });
    await page.reload();
    await openImporter(page, locale);
    await panel(page)
      .locator('input[type="file"]')
      .setInputFiles({
        name: download.suggestedFilename(),
        mimeType: "text/markdown",
        buffer: Buffer.from(edited, "utf8"),
      });
    await expect(
      panel(page).getByRole("textbox", { name: t.sourceLabel, exact: true }),
    ).toHaveValue(edited);
    await panel(page).getByRole("button", { name: t.analyze, exact: true }).click();
    await expect(panel(page).getByText(t.recovery.snapshotEdited, { exact: true })).toBeVisible();
    const restoreOption = panel(page).getByRole("radio", {
      name: t.recovery.exactOption,
      exact: true,
    });
    const markdownOption = panel(page).getByRole("radio", {
      name: t.recovery.markdownOption,
      exact: true,
    });
    await expect(restoreOption).not.toBeChecked();
    await expect(markdownOption).toBeChecked();
    await restoreOption.check();
    await expect(panel(page).locator("ol")).toHaveCount(0);
    await markdownOption.check();
    await expect(panel(page).locator("ol")).toBeVisible();
    await panel(page).getByRole("button", { name: t.continue, exact: true }).click();
    await expect(
      panel(page).getByRole("checkbox", { name: t.confirmLabel, exact: true }),
    ).not.toBeChecked();
    await panel(page).getByRole("checkbox", { name: t.confirmLabel, exact: true }).check();
    await panel(page).getByRole("button", { name: t.confirm, exact: true }).click();
    await expect(panel(page)).toHaveCount(0);
    const imported = await storedProfile(page);
    expect(JSON.stringify(imported)).toContain("This README was edited outside the app.");
    expect(JSON.stringify(imported)).not.toContain("roundtrip-hidden-section");
    expect(JSON.parse((await stored(page, backupKey)) ?? "null").originalSource).toBe(edited);
  });
}

async function backupFiles(page: Page, locale: Locale) {
  const t = messages[locale];
  const details = panel(page)
    .locator("details")
    .filter({ has: page.getByText(t.backupTitle, { exact: true }) });
  await details.locator("summary").click();
  return details;
}

for (const locale of ["en", "es"] as const) {
  test(`README import ${locale}: review, exclusions and cancellation keep the draft unchanged`, async ({
    page,
  }) => {
    const t = messages[locale];
    await openEditor(page, locale);
    const before = await stored(page);
    const importer = await openImporter(page, locale);
    await expect(importer.getByRole("heading", { name: t.title, exact: true })).toBeFocused();
    await detect(page, source, locale);
    await expect(importer.getByRole("heading", { level: 4 })).toHaveText([
      "Hello",
      "Things I use",
      "Find me",
    ]);
    await expect(importer.getByRole("heading", { name: t.reviewTitle, exact: true })).toBeFocused();
    await importer
      .getByRole("checkbox", {
        name: t.includeSection.replace("{name}", "Things I use"),
        exact: true,
      })
      .uncheck();
    await expect(importer.getByRole("button", { name: t.continue, exact: true })).toBeEnabled();
    expect(await stored(page)).toBe(before);
    expect(await stored(page, backupKey)).toBeNull();
    await reachConfirmation(page, locale);
    await importer.getByRole("button", { name: t.cancel, exact: true }).click();
    await expect(importer).toHaveCount(0);
    await expect(
      page.getByRole("button", {
        name: locale === "en" ? "Import README" : "Importar README",
        exact: true,
      }),
    ).toBeFocused();
    expect(await stored(page)).toBe(before);
    await openImporter(page, locale);
    await expect(importer.getByRole("heading", { name: t.reviewTitle, exact: true })).toBeVisible();
    await expect(
      importer.getByRole("checkbox", {
        name: t.includeSection.replace("{name}", "Things I use"),
        exact: true,
      }),
    ).not.toBeChecked();
    await importer.getByRole("button", { name: t.continue, exact: true }).click();
    await expect(
      importer.getByRole("checkbox", { name: t.confirmLabel, exact: true }),
    ).not.toBeChecked();
    await expect(importer.getByRole("button", { name: t.confirm, exact: true })).toBeDisabled();
    await importer.getByRole("button", { name: t.backToReview, exact: true }).click();
    await importer.getByRole("button", { name: t.editSource, exact: true }).click();
    await expect(importer.getByRole("textbox", { name: t.sourceLabel, exact: true })).toHaveValue(
      source,
    );
    await importer.getByRole("button", { name: t.cancel, exact: true }).click();
    expect(await stored(page)).toBe(before);
    await page.reload();
    expect(await stored(page)).toBe(before);
  });

  test(`README import ${locale}: a UTF-8 file preserves its exact source and a restorable complete draft`, async ({
    page,
  }) => {
    const t = messages[locale];
    const previous = previousProfile(locale);
    await page.setViewportSize({ width: 1440, height: 1000 });
    const untouchedLegacy = '{"a":"legacy value kept exactly"}';
    const original =
      "\uFEFF## Café 👋\r\n\r\nConstruyo pequeñas herramientas.\r\n\r\n## Links\r\n\r\n[Notes](https://example.com/notes)\r\n";
    await openEditor(page, locale, {
      [draftKey]: JSON.stringify(previous),
      [legacyKey]: untouchedLegacy,
    });
    await openImporter(page, locale);
    await panel(page)
      .locator('input[type="file"]')
      .setInputFiles({
        name: "profile.md",
        mimeType: "text/markdown",
        buffer: Buffer.from(original, "utf8"),
      });
    await expect(
      panel(page).getByRole("textbox", { name: t.sourceLabel, exact: true }),
    ).toHaveValue(original.replace(/\r\n/g, "\n"));
    expect(await storedProfile(page)).toEqual(previous);
    await panel(page).screenshot({ path: `work/previews/import-source-${locale}-desktop.png` });
    await panel(page).getByRole("button", { name: t.analyze, exact: true }).click();
    await panel(page).screenshot({ path: `work/previews/import-review-${locale}-desktop.png` });
    await reachConfirmation(page, locale);
    await panel(page).screenshot({ path: `work/previews/import-confirm-${locale}-desktop.png` });
    await panel(page).getByRole("button", { name: t.confirm, exact: true }).click();
    await expect(panel(page)).toHaveCount(0);
    const imported = await storedProfile(page);
    expect(imported.customSections.map((section) => section.title)).toEqual(["Café 👋"]);
    expect(imported.visibility.contact).toBe(true);
    expect(imported.data.contact.links).toEqual([
      expect.objectContaining({ label: "Notes", url: "https://example.com/notes" }),
    ]);
    const savedBackup = JSON.parse((await stored(page, backupKey)) ?? "null");
    expect(savedBackup).toEqual({
      schemaVersion: 1,
      previousDocument: previous,
      originalSource: original,
    });
    expect(await stored(page, legacyKey)).toBe(untouchedLegacy);
    await openImporter(page, locale);
    await expect(
      panel(page).getByRole("heading", { name: t.sourceTitle, exact: true }),
    ).toBeVisible();
    await expect(
      panel(page).getByRole("textbox", { name: t.sourceLabel, exact: true }),
    ).toHaveValue("");
    await panel(page).getByRole("button", { name: t.close, exact: true }).click();
    await page.reload();
    await openImporter(page, locale);
    const files = await backupFiles(page, locale);
    await panel(page).screenshot({ path: `work/previews/import-backup-${locale}-desktop.png` });
    await page.setViewportSize({ width: 320, height: 568 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await panel(page).screenshot({ path: `work/previews/import-backup-${locale}-mobile.png` });
    await page.setViewportSize({ width: 1440, height: 1000 });
    const originalEvent = page.waitForEvent("download");
    await files.getByRole("button", { name: t.downloadOriginal, exact: true }).click();
    const originalDownload = await originalEvent;
    expect(originalDownload.suggestedFilename()).toBe("imported-original.md");
    expect(await downloaded(originalDownload)).toBe(original);
    const profileEvent = page.waitForEvent("download");
    await files.getByRole("button", { name: t.downloadProfile, exact: true }).click();
    const profileDownload = await profileEvent;
    expect(profileDownload.suggestedFilename()).toBe("previous-profile.json");
    expect(JSON.parse(await downloaded(profileDownload))).toEqual(previous);
    await files.getByRole("button", { name: t.restore, exact: true }).click();
    await expect(
      panel(page).getByRole("button", { name: t.confirmRestore, exact: true }),
    ).toBeDisabled();
    expect(await storedProfile(page)).toEqual(imported);
    await panel(page).getByRole("button", { name: t.cancelRestore, exact: true }).click();
    expect(await storedProfile(page)).toEqual(imported);
    await files.getByRole("button", { name: t.restore, exact: true }).click();
    await panel(page).getByRole("checkbox", { name: t.restoreLabel, exact: true }).check();
    await panel(page).getByRole("button", { name: t.confirmRestore, exact: true }).click();
    await expect(panel(page)).toHaveCount(0);
    expect(await storedProfile(page)).toEqual(previous);
    expect(JSON.parse((await stored(page, backupKey)) ?? "null")).toEqual(savedBackup);
    await openImporter(page, locale);
    await expect(
      panel(page).getByRole("heading", { name: t.sourceTitle, exact: true }),
    ).toBeVisible();
    await expect(
      panel(page).getByRole("textbox", { name: t.sourceLabel, exact: true }),
    ).toHaveValue("");
    await panel(page).getByRole("button", { name: t.close, exact: true }).click();
    await page.reload();
    await expect(
      page.getByRole("textbox", {
        name: locale === "en" ? "Display name" : "Nombre para mostrar",
        exact: true,
      }),
    ).toHaveValue("Alex Example");
    expect(await storedProfile(page)).toEqual(previous);
  });

  test(`README import ${locale}: problem sections require correction or explicit exclusion`, async ({
    page,
  }) => {
    const t = messages[locale];
    const blocked =
      "## Keep\n\nA useful thought.\n\n## Relative\n\n![A local illustration](./image.png)\n\n## Tasks\n\n- [x] A finished experiment\n";
    await openEditor(page, locale);
    const before = await stored(page);
    await openImporter(page, locale);
    await detect(page, blocked, locale);
    await expect(panel(page).getByText(t.problems.relative_url).first()).toBeVisible();
    await expect(panel(page).getByText(t.problems.unsupported_format).first()).toBeVisible();
    await expect(panel(page).getByRole("button", { name: t.continue, exact: true })).toBeDisabled();
    await panel(page)
      .getByRole("checkbox", { name: t.includeSection.replace("{name}", "Relative"), exact: true })
      .uncheck();
    await expect(panel(page).getByRole("button", { name: t.continue, exact: true })).toBeDisabled();
    await panel(page)
      .getByRole("checkbox", { name: t.includeSection.replace("{name}", "Tasks"), exact: true })
      .uncheck();
    await expect(panel(page).getByRole("button", { name: t.continue, exact: true })).toBeEnabled();
    expect(await stored(page)).toBe(before);
    await confirmImport(page, locale);
    expect((await storedProfile(page)).customSections.map((section) => section.title)).toEqual([
      "Keep",
    ]);
    expect(JSON.parse((await stored(page, backupKey)) ?? "null").originalSource).toBe(blocked);
  });

  test(`README import ${locale}: review is inert text and exposes HTML conversions and filtering`, async ({
    page,
  }) => {
    const t = messages[locale];
    const requests: string[] = [];
    await page.route("https://import-assets.example.com/**", (route) => route.abort());
    page.on("request", (request) => {
      if (
        /import-assets\.example\.com|github-readme-stats\.vercel\.app|\/api\/github\//.test(
          request.url(),
        )
      )
        requests.push(request.url());
    });
    await openEditor(page, locale);
    await openImporter(page, locale);
    await detect(
      page,
      '## Format\n\n**Bold idea**\n\n| Tool | Why |\n| --- | --- |\n| A | Small |\n\n## Images\n\n![A banner](https://import-assets.example.com/banner.svg)\n\n![Stats](https://github-readme-stats.vercel.app/api?username=fake-import-example)\n\n## HTML\n\n<p onclick="window.importExecuted=true" style="color:red">A safe thought</p><script src="https://import-assets.example.com/script.js">window.importExecuted=true</script>\n',
      locale,
    );
    await expect(panel(page).getByText(t.notices.converted_to_html).first()).toBeVisible();
    await expect(
      panel(page).getByText(t.notices.html_unsupported_attributes).first(),
    ).toBeVisible();
    await expect(panel(page).getByText(t.notices.html_unsupported_elements).first()).toBeVisible();
    await panel(page).getByText(t.resultDetails, { exact: true }).click();
    const result = panel(page).getByRole("region", { name: t.resultDetails, exact: true });
    await expect(result).toContainText("<table>");
    await expect(result).toContainText("<strong>Bold idea</strong>");
    await expect(result).not.toContainText("onclick");
    await panel(page).getByText(t.originalDetails, { exact: true }).click();
    await expect(
      panel(page).getByRole("region", { name: t.originalDetails, exact: true }),
    ).toContainText("window.importExecuted=true");
    await expect(panel(page).locator("img,script,iframe,table")).toHaveCount(0);
    expect(await page.evaluate(() => "importExecuted" in window)).toBe(false);
    await page.waitForTimeout(200);
    expect(requests).toEqual([]);
    expect(await stored(page, backupKey)).toBeNull();
  });

  test(`README import ${locale}: editing source discards the old proposal and an empty selection cannot apply`, async ({
    page,
  }) => {
    const t = messages[locale];
    await openEditor(page, locale);
    await openImporter(page, locale);
    await detect(page, "## Old idea\n\nOriginal thought.\n", locale);
    await panel(page)
      .getByRole("checkbox", { name: t.includeSection.replace("{name}", "Old idea"), exact: true })
      .uncheck();
    await expect(panel(page).getByRole("button", { name: t.continue, exact: true })).toBeDisabled();
    await expect(
      panel(page).getByText(t.problems.no_sections_selected, { exact: true }),
    ).toBeVisible();
    await panel(page).getByRole("button", { name: t.editSource, exact: true }).click();
    await expect(
      panel(page).getByRole("textbox", { name: t.sourceLabel, exact: true }),
    ).toBeFocused();
    await detect(page, "## New idea\n\nA different thought.\n", locale);
    await expect(panel(page).getByRole("heading", { level: 4 })).toHaveText(["New idea"]);
    await confirmImport(page, locale);
    expect((await storedProfile(page)).customSections[0]?.title).toBe("New idea");
    expect(await stored(page, backupKey)).not.toContain("Original thought.");
  });
}

test("README import: pending edits are backed up live and cannot overwrite an imported profile", async ({
  page,
}) => {
  await openEditor(page);
  await openImporter(page);
  await detect(page);
  await reachConfirmation(page);
  await page.clock.install();
  await page
    .getByRole("textbox", { name: "Display name", exact: true })
    .fill("Latest unsaved name");
  await panel(page).getByRole("button", { name: en.confirm, exact: true }).click();
  await expect(panel(page)).toHaveCount(0);
  const imported = await storedProfile(page);
  expect(imported.customSections.map((section) => section.title)).toEqual([
    "Hello",
    "Things I use",
  ]);
  expect(imported.visibility.technologies).toBe(false);
  expect(imported.visibility.contact).toBe(true);
  expect(
    JSON.parse((await stored(page, backupKey)) ?? "null").previousDocument.data.presentation
      .displayName,
  ).toBe("Latest unsaved name");
  await page.clock.fastForward(1_000);
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
  expect(await storedProfile(page)).toEqual(imported);
});

for (const failure of [
  "quota-backup",
  "quota-profile",
  "invalid-backup",
  "invalid-profile",
] as const) {
  test(`README import: ${failure} requires a second explicit memory-only decision and preserves protected storage`, async ({
    page,
  }) => {
    const invalid = "{kept-invalid-record";
    const previous = JSON.stringify(previousProfile());
    const entries = {
      [draftKey]: failure === "invalid-profile" ? invalid : previous,
      ...(failure === "invalid-backup" ? { [backupKey]: invalid } : {}),
    };
    await openEditor(page, "en", entries);
    if (failure.startsWith("quota")) {
      await page.evaluate(
        (key) => {
          const nativeSetItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (storageKey, value) {
            if (storageKey === key)
              throw new DOMException("Synthetic quota for recovery test", "QuotaExceededError");
            return nativeSetItem.call(this, storageKey, value);
          };
        },
        failure === "quota-backup" ? backupKey : draftKey,
      );
    }
    await openImporter(page);
    await detect(page);
    await reachConfirmation(page);
    await panel(page).getByRole("button", { name: en.confirm, exact: true }).click();
    await expect(
      panel(page).getByRole("heading", { name: en.memoryTitle, exact: true }),
    ).toBeFocused();
    expect(await stored(page)).toBe(entries[draftKey]);
    if (failure === "invalid-backup") expect(await stored(page, backupKey)).toBe(invalid);
    if (failure === "quota-backup" || failure === "invalid-profile")
      expect(await stored(page, backupKey)).toBeNull();
    await panel(page).getByRole("button", { name: en.continueMemory, exact: true }).click();
    await expect(panel(page)).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Hello", exact: true })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await page.waitForTimeout(700);
    await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));
    expect(await stored(page)).toBe(entries[draftKey]);
    if (failure === "invalid-backup") expect(await stored(page, backupKey)).toBe(invalid);
    await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
    await expect(page).toHaveURL(/\/es\/editor$/);
    await expect(page.getByRole("button", { name: "Hello", exact: true })).toHaveAttribute(
      "aria-current",
      "step",
    );
    expect(await stored(page)).toBe(entries[draftKey]);
    await openImporter(page, "es");
    await backupFiles(page, "es");
    await expect(
      panel(page).getByRole("button", { name: es.downloadOriginal, exact: true }),
    ).toBeVisible();
  });
}

test("README import: changing interface language preserves the unconfirmed source without replacing storage", async ({
  page,
}) => {
  await openEditor(page);
  const before = await stored(page);
  await openImporter(page);
  await detect(page);
  await panel(page).getByRole("checkbox", { name: "Include Things I use", exact: true }).uncheck();
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page).toHaveURL(/\/es\/editor$/);
  if (!(await panel(page).isVisible())) await openImporter(page, "es");
  await expect(panel(page).getByRole("heading", { name: es.title, exact: true })).toBeVisible();
  await panel(page).getByRole("button", { name: es.editSource, exact: true }).click();
  await expect(panel(page).getByRole("textbox", { name: es.sourceLabel, exact: true })).toHaveValue(
    source,
  );
  expect(await stored(page)).toBe(before);
  expect(await stored(page, backupKey)).toBeNull();
  await panel(page).getByRole("button", { name: es.analyze, exact: true }).click();
  await expect(panel(page).getByRole("heading", { level: 4 })).toHaveText([
    "Hello",
    "Things I use",
    "Find me",
  ]);
  await panel(page).getByRole("button", { name: es.cancel, exact: true }).click();
  expect(await stored(page)).toBe(before);
});

test("README import: invalid files and oversized or empty text retain the current source and draft", async ({
  page,
}) => {
  await openEditor(page);
  const before = await stored(page);
  await openImporter(page);
  await panel(page).getByRole("button", { name: en.analyze, exact: true }).click();
  await expect(
    panel(page).getByText(en.problems.empty_source, { exact: true }).first(),
  ).toBeVisible();
  const field = panel(page).getByRole("textbox", { name: en.sourceLabel, exact: true });
  await field.fill(source);
  for (const file of [
    { name: "wrong.txt", buffer: Buffer.from("Other text"), error: en.fileTypeError },
    { name: "wrong.md", buffer: Buffer.from([0xc3, 0x28]), error: en.fileEncodingError },
    {
      name: "large.md",
      buffer: Buffer.alloc(800_001, 65),
      error: en.fileSizeError.replace("{limit}", "800"),
    },
  ]) {
    await panel(page)
      .locator('input[type="file"]')
      .setInputFiles({ name: file.name, mimeType: "text/plain", buffer: file.buffer });
    await expect(panel(page).getByText(file.error, { exact: true })).toBeVisible();
    await expect(field).toHaveValue(source);
  }
  await field.fill("a".repeat(100_001));
  await panel(page).getByRole("button", { name: en.analyze, exact: true }).click();
  await expect(
    panel(page).getByText(en.problems.source_too_large, { exact: true }).first(),
  ).toBeVisible();
  expect(await stored(page)).toBe(before);
  expect(await stored(page, backupKey)).toBeNull();
});

for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`accessibility: README importer source, review and confirmation at 320px ${locale} ${theme}`, async ({
      page,
    }) => {
      const t = messages[locale];
      await page.setViewportSize({ width: 320, height: 568 });
      await page.emulateMedia({ colorScheme: theme });
      await openEditor(page, locale);
      await openImporter(page, locale);
      async function checkPanel() {
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        const box = await panel(page).boundingBox();
        expect(box?.width).toBeLessThanOrEqual(320);
      }
      await checkPanel();
      await panel(page).screenshot({
        path: `work/previews/import-source-${locale}-${theme}-mobile.png`,
      });
      await detect(page, source, locale);
      await checkPanel();
      await panel(page).screenshot({
        path: `work/previews/import-review-${locale}-${theme}-mobile.png`,
      });
      await panel(page).getByRole("heading", { name: t.reviewTitle, exact: true }).press("Tab");
      await expect(panel(page).getByRole("checkbox").first()).toBeFocused();
      await panel(page).getByRole("button", { name: t.continue, exact: true }).click();
      await checkPanel();
      await panel(page).screenshot({
        path: `work/previews/import-confirm-${locale}-${theme}-mobile.png`,
      });
      await expect(
        panel(page).getByRole("heading", { name: t.confirmTitle, exact: true }),
      ).toBeFocused();
      await panel(page).getByRole("heading", { name: t.confirmTitle, exact: true }).press("Tab");
      await expect(
        panel(page).getByRole("checkbox", { name: t.confirmLabel, exact: true }),
      ).toBeFocused();
      await panel(page).getByRole("checkbox", { name: t.confirmLabel, exact: true }).press("Space");
      await expect(panel(page).getByRole("button", { name: t.confirm, exact: true })).toBeEnabled();
      await panel(page).getByRole("button", { name: t.cancel, exact: true }).click();
      expect(await stored(page, backupKey)).toBeNull();
    });
  }
}
