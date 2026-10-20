import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { CustomBlock } from "../../src/core/profile/custom-content";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { generateReadme } from "../../src/core/readme";
import en from "../../src/messages/en/modules/custom.json" with { type: "json" };
import es from "../../src/messages/es/modules/custom.json" with { type: "json" };
import importEn from "../../src/messages/en/readme-import.json" with { type: "json" };
import { expectCodeSource, fillCodeSource } from "./editor-test-helpers";

const draftKey = "github-profile-generator.profile.v2";
const messages = { en, es };
type Locale = keyof typeof messages;

function customProfile(blocks: CustomBlock[], locale: Locale = "en"): ProfileDocument {
  const profile = createEmptyProfile(locale);
  profile.customSections = [{ id: "playground", title: "Playground", visible: true, blocks }];
  profile.sectionOrder.unshift({ kind: "custom", sectionId: "playground" });
  return profile;
}

async function stored(page: Page): Promise<ProfileDocument> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), draftKey);
}

async function openEditor(page: Page, profile?: ProfileDocument, locale: Locale = "en") {
  if (profile) {
    await page.addInitScript(
      ({ key, source }) => {
        if (sessionStorage.getItem("code-format-fixture")) return;
        localStorage.setItem(key, source);
        sessionStorage.setItem("code-format-fixture", "ready");
      },
      { key: draftKey, source: JSON.stringify(profile) },
    );
  }
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("button", {
      name: locale === "en" ? "Add custom section" : "Agregar sección personalizada",
      exact: true,
    }),
  ).toBeEnabled();
}

function codeField(page: Page, locale: Locale = "en") {
  return page.getByRole("textbox", { name: messages[locale].code.source, exact: true });
}

async function enhanced(control: Locator) {
  await expect(control).toHaveClass(/cm-content/);
}

async function download(page: Page, locale: Locale = "en") {
  const pending = page.waitForEvent("download");
  await page
    .getByRole("button", {
      name: locale === "en" ? "Download README" : "Descargar README",
      exact: true,
    })
    .click();
  const path = await (await pending).path();
  if (!path) throw new Error("README download is missing");
  return readFile(path, "utf8");
}

for (const locale of ["en", "es"] as const) {
  test(`custom code ${locale}: empty creation, literal content, local highlighting and one export`, async ({
    page,
    context,
  }) => {
    await page.setViewportSize({ width: 1500, height: 1100 });
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const requests: string[] = [];
    page.on("request", (request) => {
      if (request.url().includes("code-attack.example.com")) requests.push(request.url());
    });
    const t = messages[locale];
    await openEditor(page, undefined, locale);
    await page
      .getByRole("button", {
        name: locale === "en" ? "Add custom section" : "Agregar sección personalizada",
        exact: true,
      })
      .click();
    const picker = page.getByRole("group", { name: t.addContent, exact: true });
    await expect(picker.getByRole("button")).toHaveCount(10);
    const option = picker.getByRole("button", { name: t.addCode, exact: true });
    await expect(option).toHaveAccessibleDescription(t.pickerCodeHelp);
    await expect(option.locator("img")).toHaveCount(0);
    await option.focus();
    await option.press("Enter");
    const field = codeField(page, locale);
    await expect(field).toBeFocused();
    await enhanced(field);
    await expect(field).toBeFocused();
    await expectCodeSource(field, "");
    const language = page.getByRole("combobox", { name: t.code.language, exact: true });
    await expect(language).toHaveValue("");
    await language.fill("toml");
    const source =
      'name = "Alex"\n\n[profile]\nlikes = ["building", "sharing"]\n\t# keep this tab\n```\n<img src="https://code-attack.example.com/icon.svg" alt="literal"><script>window.codeExecuted=true</script>';
    await fillCodeSource(field, source);
    await expect.poll(() => field.locator("span").count()).toBeGreaterThan(0);
    await expect
      .poll(async () => (await stored(page))?.customSections[0]?.blocks[0])
      .toMatchObject({ type: "code", source, language: "toml" });
    const preview = page.getByRole("article", {
      name: locale === "en" ? "README preview" : "Vista previa del README",
      exact: true,
    });
    await expect(preview.locator("pre code")).toHaveText(source);
    await expect.poll(() => preview.locator("pre code span.tok-string").count()).toBeGreaterThan(0);
    await expect(preview.locator("img,script")).toHaveCount(0);
    expect(await page.evaluate(() => "codeExecuted" in window)).toBe(false);
    await preview
      .getByRole("button", { name: locale === "en" ? "Copy code" : "Copiar código", exact: true })
      .click();
    expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe(
      source,
    );
    const generated = generateReadme(await stored(page));
    if (!generated.success) throw new Error("Expected valid literal code");
    const output = await download(page, locale);
    expect(output).toBe(generated.markdown);
    expect(output).toContain("````toml\n" + source + "\n````");
    await page
      .getByRole("button", { name: locale === "en" ? "Copy README" : "Copiar README", exact: true })
      .click();
    expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe(
      output,
    );
    await field.focus();
    await field.press("Tab");
    await expect(field).not.toBeFocused();
    expect(requests).toEqual([]);
    for (const theme of ["light", "dark"] as const) {
      await page.emulateMedia({ colorScheme: theme });
      await page.screenshot({
        path: `work/previews/code-${locale}-${theme}-desktop.png`,
        fullPage: true,
      });
    }
  });
}

test("a JSON example is explicit, can be cancelled and keeps focus after replacement", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEditor(
    page,
    customProfile([{ id: "snippet", type: "code", source: "original", language: "rust" }]),
  );
  const field = codeField(page);
  await enhanced(field);
  await page.getByText(en.code.exampleTitle, { exact: true }).click();
  const use = page.getByRole("button", { name: en.code.useExample, exact: true });
  page.once("dialog", (dialog) => dialog.dismiss());
  await use.click();
  await expectCodeSource(field, "original");
  await expect(use).toBeFocused();
  page.once("dialog", (dialog) => dialog.accept());
  await use.click();
  await expectCodeSource(field, en.code.exampleSource);
  await expect(field).toBeFocused();
  await expect(page.getByRole("combobox", { name: en.code.language, exact: true })).toHaveValue(
    "json",
  );
});

test("HTML editor closes tags, indents, preserves undo and offers a standard text alternative", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEditor(page, customProfile([{ id: "html", type: "html", source: "<p>Ready</p>" }]));
  const field = page.getByRole("textbox", { name: en.html.code, exact: true });
  await enhanced(field);
  await expect.poll(() => field.locator("span").count()).toBeGreaterThan(0);
  await fillCodeSource(field, "");
  await field.pressSequentially("<p>");
  await expectCodeSource(field, "<p></p>");
  await fillCodeSource(field, "<p>Keep this source</p>\n<p>And this line</p>");
  await field.press("Control+Home");
  await page.getByRole("button", { name: "Indent selection", exact: true }).click();
  await expectCodeSource(field, "  <p>Keep this source</p>\n<p>And this line</p>");
  await field.press("Control+z");
  await expectCodeSource(field, "<p>Keep this source</p>\n<p>And this line</p>");
  await field.press("Tab");
  await expect(field).not.toBeFocused();
  await page.getByRole("button", { name: "Plain text", exact: true }).click();
  await expect(field).toHaveJSProperty("tagName", "TEXTAREA");
  await expect(field).toHaveValue("<p>Keep this source</p>\n<p>And this line</p>");
  await field.fill("<p>Edited in plain text</p>");
  await page.getByRole("button", { name: "Code editor", exact: true }).click();
  await enhanced(field);
  await expectCodeSource(field, "<p>Edited in plain text</p>");
  await expect(page.getByRole("article", { name: "README preview", exact: true })).toContainText(
    "Edited in plain text",
  );
});

test("code retains BOM and CRLF through edits, undo, mode and locale changes", async ({
  page,
  context,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const source = '\uFEFFname = "Alex"\r\n\r\n[profile]\r\ncity = "Buenos Aires"\r\n';
  await openEditor(page, customProfile([{ id: "exact", type: "code", source, language: "toml" }]));
  const field = codeField(page);
  await enhanced(field);
  expect((await stored(page)).customSections[0]!.blocks[0]).toMatchObject({ source });
  await page
    .getByRole("article", { name: "README preview", exact: true })
    .getByRole("button", { name: "Copy code", exact: true })
    .click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(source);
  await field.focus();
  await field.press("Control+End");
  await field.pressSequentially("# note");
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ source: source + "# note" });
  await field.press("Control+z");
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ source });
  await page.getByRole("button", { name: "Plain text", exact: true }).click();
  await expectCodeSource(field, source);
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await enhanced(codeField(page, "es"));
  await expectCodeSource(codeField(page, "es"), source);
  expect((await stored(page)).customSections[0]!.blocks[0]).toMatchObject({
    source,
    language: "toml",
  });
  await page.reload();
  await enhanced(codeField(page, "es"));
  await expectCodeSource(codeField(page, "es"), source);
});

test("plain-mode paste keeps exact newlines and can be undone after switching editor modes", async ({
  page,
}) => {
  const original = '\uFEFFname = "Alex"\r\n';
  const pasted = '# keep pasted CRLF\r\nlikes = ["sharing"]\r\n';
  await openEditor(
    page,
    customProfile([{ id: "paste-history", type: "code", source: original, language: "toml" }]),
  );
  const field = codeField(page);
  await enhanced(field);
  await page.getByRole("button", { name: "Plain text", exact: true }).click();
  await expect(field).toHaveJSProperty("tagName", "TEXTAREA");
  await field.focus();
  await field.press("Control+End");
  await field.evaluate((element, source) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", source);
    element.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }),
    );
  }, pasted);
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ source: original + pasted });
  await field.press("Control+z");
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ source: original });
  await field.press("Control+y");
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ source: original + pasted });
  await page.getByRole("button", { name: "Code editor", exact: true }).click();
  await enhanced(field);
  await field.focus();
  await field.press("Control+z");
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ source: original });
  await page.getByRole("button", { name: "Plain text", exact: true }).click();
  await field.focus();
  await field.press("Control+y");
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ source: original + pasted });
});

test("newline-only plain paste remains an authored edit with undo and redo", async ({ page }) => {
  const original = "a\nb";
  const replacement = "a\r\nb";
  await openEditor(
    page,
    customProfile([{ id: "newlines", type: "code", source: original, language: "" }]),
  );
  const field = codeField(page);
  await enhanced(field);
  await page.getByRole("button", { name: "Plain text", exact: true }).click();
  await field.focus();
  await field.press("Control+a");
  await field.evaluate((element, source) => {
    const clipboardData = new DataTransfer();
    clipboardData.setData("text/plain", source);
    element.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData, bubbles: true, cancelable: true }),
    );
  }, replacement);
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ source: replacement });
  await field.press("Control+z");
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ source: original });
  await field.press("Control+y");
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ source: replacement });
});

test("custom title and text formatting keep literal content, survive duplication, hiding and recovery", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 1100 });
  const profile = customProfile([
    { id: "words", type: "paragraph", text: "<b>Literal words</b>" },
    { id: "code", type: "code", source: "name = 'Alex'", language: "toml" },
  ]);
  await openEditor(page, profile);
  await page.getByText(en.format.titleOptions, { exact: true }).click();
  await page.getByRole("combobox", { name: en.format.titleLevel, exact: true }).selectOption("1");
  const titleOptions = page
    .locator("details")
    .filter({ has: page.getByText(en.format.titleOptions, { exact: true }) });
  await titleOptions
    .getByRole("combobox", { name: en.format.alignment, exact: true })
    .selectOption("center");
  const paragraph = page.getByRole("group", { name: "Text block 1", exact: true });
  await paragraph.getByText(en.format.textOptions, { exact: true }).click();
  const type = page.getByRole("combobox", { name: en.format.textType, exact: true });
  await type.focus();
  await type.selectOption("1");
  await expect(type).toBeFocused();
  await page
    .getByRole("group", { name: "Subtitle 1", exact: true })
    .getByRole("combobox", { name: en.format.alignment, exact: true })
    .selectOption("right");
  await type.focus();
  await type.selectOption("paragraph");
  await expect(type).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue(
    "<b>Literal words</b>",
  );
  await expect
    .poll(async () => (await stored(page)).customSections[0])
    .toMatchObject({
      titleLevel: 1,
      titleAlignment: "center",
      blocks: [
        { id: "words", type: "paragraph", text: "<b>Literal words</b>", alignment: "right" },
        { id: "code", type: "code", source: "name = 'Alex'", language: "toml" },
      ],
    });
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.getByRole("heading", { name: "Playground", exact: true })).toHaveCSS(
    "text-align",
    "center",
  );
  await expect(preview.getByText("<b>Literal words</b>", { exact: true })).toHaveCSS(
    "text-align",
    "right",
  );
  await expect(preview.locator("b")).toHaveCount(0);
  const output = await download(page);
  expect(output).toContain('<h1 align="center">Playground</h1>');
  expect(output).toContain('<p align="right">&#x3C;b>Literal words&#x3C;/b></p>');
  await page.getByRole("button", { name: "Duplicate section", exact: true }).click();
  await page.getByRole("textbox", { name: "Section title", exact: true }).fill("Independent copy");
  await page.getByRole("checkbox", { name: "Playground", exact: true }).uncheck();
  await expect.poll(async () => (await stored(page)).customSections.length).toBe(2);
  const saved = await stored(page);
  expect(saved.customSections[0]).toEqual({
    ...profile.customSections[0],
    titleLevel: 1,
    titleAlignment: "center",
    visible: false,
    blocks: [
      { ...profile.customSections[0]!.blocks[0], alignment: "right" },
      profile.customSections[0]!.blocks[1],
    ],
  });
  expect(saved.customSections[1]).toMatchObject({ titleLevel: 1, titleAlignment: "center" });
  expect(saved.customSections[1]!.blocks.map((block) => block.id)).not.toEqual(
    saved.customSections[0]!.blocks.map((block) => block.id),
  );
  await page.reload();
  await page.getByRole("button", { name: "Independent copy", exact: true }).click();
  await expectCodeSource(codeField(page), "name = 'Alex'");
  expect((await stored(page)).customSections).toEqual(saved.customSections);
});

test("untitled legacy headings reflect their effective level until an explicit choice fixes it", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const profile = customProfile([
    { id: "legacy-heading", type: "heading", text: "Legacy heading" },
  ]);
  profile.customSections[0]!.title = "";
  await openEditor(page, profile);
  await page.getByText(en.format.textOptions, { exact: true }).click();
  const type = page.getByRole("combobox", { name: en.format.textType, exact: true });
  await expect(type).toHaveValue("2");
  expect((await stored(page)).customSections[0]!.blocks[0]).not.toHaveProperty("level");
  expect(await download(page)).toContain("## Legacy heading");
  await type.focus();
  await type.selectOption("3");
  await expect(type).toBeFocused();
  expect(await download(page)).toContain("### Legacy heading");
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ level: 3 });
  await page.getByRole("textbox", { name: en.title, exact: true }).fill("An optional title");
  expect(await download(page)).toContain("### Legacy heading");
  await page.getByRole("textbox", { name: en.title, exact: true }).fill("");
  expect(await download(page)).toContain("### Legacy heading");
  await page.reload();
  await page.getByText(en.format.textOptions, { exact: true }).click();
  await expect(type).toHaveValue("3");
  await type.selectOption("2");
  expect(await download(page)).toContain("## Legacy heading");
});

test("code errors disable export and review reaches the affected source; hidden invalid code stays saved", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const profile = customProfile([
    { id: "too-long", type: "code", source: "x".repeat(30_001), language: "toml" },
  ]);
  profile.visibility.presentation = true;
  profile.data.presentation.displayName = "A short profile";
  await openEditor(page, profile);
  const field = codeField(page);
  await enhanced(field);
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveAccessibleDescription(/30,000/);
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "About you", exact: true }).click();
  await page.getByRole("button", { name: "Review fields in Playground", exact: true }).click();
  await expect(field).toBeFocused();
  await page.getByRole("checkbox", { name: "Playground", exact: true }).uncheck();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  await expect.poll(async () => (await stored(page)).customSections[0]?.visible).toBe(false);
  expect((await stored(page)).customSections[0]!.blocks[0]).toMatchObject({
    source: "x".repeat(30_001),
  });
  await fillCodeSource(field, "name = 'fixed'");
  await page.getByRole("checkbox", { name: "Playground", exact: true }).check();
  const language = page.getByRole("combobox", { name: en.code.language, exact: true });
  await language.fill("bad language");
  await expect(language).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  await language.fill("my-dialect");
  await expect(language).not.toHaveAttribute("aria-invalid", "true");
  expect(await download(page)).toContain("```my-dialect");
});

test("imported fences become editable code with a language and retain literal HTML", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Import README", exact: true }).click();
  const importer = page.getByRole("region", { name: importEn.title, exact: true });
  const source =
    '## My configuration\n\n```toml\nname = "Alex"\nhtml = "<script>literal</script>"\n```\n';
  await importer.getByRole("textbox", { name: importEn.sourceLabel, exact: true }).fill(source);
  await importer.getByRole("button", { name: importEn.analyze, exact: true }).click();
  await expect(
    importer.getByRole("heading", { name: "My configuration", exact: true }),
  ).toBeVisible();
  await importer.getByRole("button", { name: importEn.continue, exact: true }).click();
  await importer.getByRole("checkbox", { name: importEn.confirmLabel, exact: true }).check();
  await importer.getByRole("button", { name: importEn.confirm, exact: true }).click();
  await expect(importer).toHaveCount(0);
  await enhanced(codeField(page));
  await expectCodeSource(codeField(page), 'name = "Alex"\nhtml = "<script>literal</script>"');
  await expect(page.getByRole("combobox", { name: en.code.language, exact: true })).toHaveValue(
    "toml",
  );
  await expect(
    page.getByRole("article", { name: "README preview", exact: true }).locator("script"),
  ).toHaveCount(0);
  expect((await stored(page)).customSections[0]?.blocks[0]).toMatchObject({
    type: "code",
    language: "toml",
  });
});

for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`accessibility: code and formatting fit 320px in ${locale} ${theme} and keep scroll local`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 640 });
      await page.emulateMedia({ colorScheme: theme });
      const t = messages[locale];
      const profile = customProfile(
        [
          {
            id: "long-code",
            type: "code",
            source:
              'name = "' +
              "a long profile line ".repeat(35) +
              '"\n\n[profile]\nlikes = ["building", "sharing"]',
            language: "toml",
          },
          {
            id: "second-code",
            type: "code",
            source: '[extras]\nlikes = ["reading", "learning"]',
            language: "toml",
          },
          { id: "html", type: "html", source: '<p align="center">A small HTML note</p>' },
        ],
        locale,
      );
      profile.customSections[0]!.titleAlignment = "center";
      await openEditor(page, profile, locale);
      // Reach and screenshots are measured before Playwright scrolls a control into view.
      const title = page.getByRole("textbox", { name: t.title, exact: true });
      const initialTitle = await title.boundingBox();
      expect(initialTitle).not.toBeNull();
      expect(initialTitle!.y + initialTitle!.height).toBeLessThanOrEqual(640);
      await page.screenshot({
        path: `work/previews/code-${locale}-${theme}-initial-320.png`,
        fullPage: false,
      });
      const field = codeField(page, locale).first();
      await enhanced(field);
      const scrollArea = page
        .getByRole("group", { name: t.codeLabel.replace("{number}", "1"), exact: true })
        .getByRole("group", {
          name:
            locale === "en" ? "Code editor scroll area" : "Área desplazable del editor de código",
          exact: true,
        });
      await scrollArea.focus();
      await expect(scrollArea).toBeFocused();
      await scrollArea.press("ArrowDown");
      await scrollArea.press("Tab");
      await expect(field).toBeFocused();
      await field.scrollIntoViewIfNeeded();
      const reached = await field.boundingBox();
      expect(reached!.y).toBeGreaterThanOrEqual(0);
      expect(reached!.y + Math.min(reached!.height, 200)).toBeLessThanOrEqual(640);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const block = page.getByRole("group", {
        name: t.codeLabel.replace("{number}", "1"),
        exact: true,
      });
      await block
        .getByRole("button", {
          name: locale === "en" ? "Wrap lines" : "Ajustar líneas",
          exact: true,
        })
        .click();
      await expect(block.locator(".cm-scroller")).toHaveCSS("overflow-x", "auto");
      expect(
        await block
          .locator(".cm-scroller")
          .evaluate((element) => element.scrollWidth > element.clientWidth),
      ).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await block
        .getByRole("button", {
          name: locale === "en" ? "Wrap lines" : "Ajustar líneas",
          exact: true,
        })
        .click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await field.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `work/previews/code-${locale}-${theme}-edit-viewport-320.png`,
        fullPage: false,
      });
      await page.screenshot({
        path: `work/previews/code-${locale}-${theme}-edit-320.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: locale === "en" ? "Preview" : "Vista previa", exact: true })
        .click();
      const preview = page.getByRole("article", {
        name: locale === "en" ? "README preview" : "Vista previa del README",
        exact: true,
      });
      await expect(preview.locator("pre code")).toHaveCount(2);
      await expect(preview.locator("pre code").first()).toContainText("[profile]");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await preview.locator("pre code").first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `work/previews/code-${locale}-${theme}-preview-viewport-320.png`,
        fullPage: false,
      });
      await page.screenshot({
        path: `work/previews/code-${locale}-${theme}-preview-320.png`,
        fullPage: true,
      });
    });
  }
}
