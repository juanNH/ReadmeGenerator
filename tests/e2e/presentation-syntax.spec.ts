import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { generateReadme } from "../../src/core/readme";
import en from "../../src/messages/en/editor.json" with { type: "json" };
import es from "../../src/messages/es/editor.json" with { type: "json" };
import custom from "../../src/messages/en/modules/custom.json" with { type: "json" };

const key = "github-profile-generator.profile.v2";
const messages = { en, es };

async function open(page: Page, profile: ProfileDocument, locale: "en" | "es") {
  await page.addInitScript(
    ({ source, key }) => {
      if (sessionStorage.getItem("presentation-syntax-fixture")) return;
      localStorage.setItem(key, source);
      sessionStorage.setItem("presentation-syntax-fixture", "ready");
    },
    { source: JSON.stringify(profile), key },
  );
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("button", { name: messages[locale].reset.action, exact: true }),
  ).toBeEnabled();
}

async function stored(page: Page): Promise<ProfileDocument> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), key);
}

function introduction(locale: "en" | "es") {
  const profile = createEmptyProfile(locale);
  profile.visibility.presentation = true;
  profile.data.presentation = {
    displayName: "Alex",
    headline: "Building useful things",
    bio: "Code <b>stays literal</b>",
    location: "🇦🇷 Argentina",
  };
  return profile;
}

test("C# highlights keywords and classes in editor and preview, with canonical aliases", async ({
  page,
}) => {
  const profile = createEmptyProfile("en");
  const source = 'public class Hola {\n  public string Message => "Hello";\n}';
  profile.customSections = [
    {
      id: "snippet",
      title: "",
      visible: true,
      blocks: [{ id: "code", type: "code", language: "csharp", source }],
    },
  ];
  profile.sectionOrder.unshift({ kind: "custom", sectionId: "snippet" });
  await page.setViewportSize({ width: 1500, height: 1000 });
  await open(page, profile, "en");
  const field = page.getByRole("textbox", { name: custom.code.source, exact: true });
  await expect(field).toHaveClass(/cm-content/);
  const keyword = field
    .locator("span")
    .filter({ hasText: /\bclass\b/ })
    .first();
  await expect(keyword).toBeVisible();
  expect(await keyword.evaluate((element) => getComputedStyle(element).color)).not.toBe(
    await field.evaluate((element) => getComputedStyle(element).color),
  );
  const preview = page.getByRole("article", { name: en.preview.documentLabel, exact: true });
  await expect(preview.locator(".tok-keyword").filter({ hasText: /\bclass\b/ })).toBeVisible();
  await expect(preview.locator("pre code")).toHaveText(source);
  await page.getByRole("combobox", { name: custom.code.language, exact: true }).fill("C#");
  await expect
    .poll(async () => (await stored(page)).customSections[0]?.blocks[0])
    .toMatchObject({ language: "C#", source });
  const result = generateReadme(await stored(page));
  expect(result.success && result.markdown).toContain("```csharp\n");
  await page.screenshot({ path: "work/previews/csharp-highlight-final.png", fullPage: true });
});

test("accessibility: a small left-aligned presentation name keeps a valid heading outline", async ({
  page,
}) => {
  const profile = createEmptyProfile("en");
  profile.visibility.presentation = true;
  profile.data.presentation.displayName = "Alex";
  profile.data.presentation.format = { displayNameLevel: 3 };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await open(page, profile, "en");
  const preview = page.getByRole("article", { name: en.preview.documentLabel, exact: true });
  await expect(preview.getByRole("heading", { name: "Alex", level: 3, exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  const result = generateReadme(await stored(page));
  expect(result.success && result.markdown).toBe("### Alex\n");
});

for (const locale of ["en", "es"] as const) {
  test(`presentation ${locale}: format survives reload, exports safely and can be reset`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1500, height: 1100 });
    const t = messages[locale];
    const profile = introduction(locale);
    await open(page, profile, locale);
    expect((await stored(page)).data.presentation).not.toHaveProperty("format");
    await page.getByText(t.presentation.format.options, { exact: true }).click();
    await page.locator("#presentation-displayNameAlignment").selectOption("center");
    await page.locator("#presentation-displayNameLevel").selectOption("3");
    await page.locator("#presentation-headlineAlignment").selectOption("right");
    await page.locator("#presentation-bioAlignment").selectOption("center");
    await page.locator("#presentation-locationAlignment").selectOption("center");
    await expect
      .poll(async () => (await stored(page)).data.presentation.format)
      .toMatchObject({
        displayNameLevel: 3,
        displayNameAlignment: "center",
        headlineAlignment: "right",
        bioAlignment: "center",
        locationAlignment: "center",
      });
    const preview = page.getByRole("article", { name: t.preview.documentLabel, exact: true });
    await expect(preview.getByRole("heading", { name: "Alex", exact: true })).toHaveCSS(
      "text-align",
      "center",
    );
    await expect(
      preview.getByRole("heading", { name: "Building useful things", exact: true }),
    ).toHaveCSS("text-align", "right");
    await expect(preview.getByText(profile.data.presentation.bio, { exact: true })).toHaveCSS(
      "text-align",
      "center",
    );
    await expect(preview.locator("b,script")).toHaveCount(0);
    await expect(preview.locator("img")).toHaveAttribute("src", "/country-flags/ar.svg");
    const result = generateReadme(await stored(page));
    if (!result.success) throw new Error("Expected a valid formatted presentation");
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: t.export.download, exact: true }).click();
    const path = await (await pending).path();
    expect(await readFile(path!, "utf8")).toBe(result.markdown);
    await page.reload();
    await page.getByText(t.presentation.format.options, { exact: true }).click();
    await expect(page.locator("#presentation-displayNameLevel")).toHaveValue("3");
    await expect(page.locator("#presentation-displayNameAlignment")).toHaveValue("center");
    await page.getByRole("button", { name: t.presentation.format.reset, exact: true }).click();
    await expect
      .poll(async () => (await stored(page)).data.presentation)
      .not.toHaveProperty("format");
    expect((await stored(page)).data.presentation.displayName).toBe("Alex");
    await expect(preview.getByRole("heading", { name: "Alex", exact: true })).toHaveCSS(
      "text-align",
      "start",
    );
  });

  for (const theme of ["light", "dark"] as const) {
    test(`accessibility: formatted presentation and reset fit 320px in ${locale} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await page.emulateMedia({ colorScheme: theme });
      const t = messages[locale];
      const profile = introduction(locale);
      profile.data.presentation.format = {
        displayNameAlignment: "center",
        headlineAlignment: "center",
        bioAlignment: "center",
        locationAlignment: "center",
      };
      await open(page, profile, locale);
      const name = page.getByRole("textbox", { name: t.presentation.displayName, exact: true });
      const box = await name.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(568);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.getByText(t.presentation.format.options, { exact: true }).click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await page.getByRole("button", { name: t.settings.preview, exact: true }).click();
      await expect(
        page.getByRole("article", { name: t.preview.documentLabel, exact: true }),
      ).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({ path: `work/previews/presentation-${locale}-${theme}-320.png` });
    });
  }
}
