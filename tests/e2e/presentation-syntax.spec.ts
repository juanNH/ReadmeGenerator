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

test("accessibility: a centered small presentation name keeps a valid heading outline", async ({
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
  expect(result.success && result.markdown).toBe('<div><h3 align="center">Alex</h3></div>\n');
});

for (const locale of ["en", "es"] as const) {
  test(`presentation ${locale}: inline country and reload preserve the writing`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1500, height: 1100 });
    const t = messages[locale];
    const profile = introduction(locale);
    const original = structuredClone(profile.data.presentation);
    await open(page, profile, locale);
    await expect(
      page.getByRole("combobox", { name: t.presentation.location, exact: true }),
    ).toBeVisible();
    await page.locator("#presentation-location-placement").selectOption("headline");
    await expect
      .poll(async () => (await stored(page)).data.presentation)
      .toEqual({ ...original, format: { locationPlacement: "headline" } });

    const preview = page.getByRole("article", { name: t.preview.documentLabel, exact: true });
    await expect(preview.getByRole("heading", { name: "Alex", exact: true })).toHaveCSS(
      "text-align",
      "center",
    );
    const headline = preview.getByRole("heading", { name: /Building useful things/ });
    await expect(headline).toContainText(locale === "en" ? "from" : "desde");
    await expect(headline).toContainText("Argentina");
    await expect(headline.locator("img")).toHaveAttribute("src", "/country-flags/ar.svg");
    await expect(headline).toHaveCSS("text-align", "center");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await page.screenshot({
      path: `work/previews/presentation-location-${locale}.png`,
      fullPage: true,
    });
    const result = generateReadme(await stored(page));
    if (!result.success) throw new Error("Expected a valid presentation");
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: t.export.download, exact: true }).click();
    expect(await readFile((await (await pending).path())!, "utf8")).toBe(result.markdown);

    await page.reload();
    await page.getByText(t.presentation.format.options, { exact: true }).click();
    await expect(page.locator("#presentation-headlineLevel")).toHaveValue("2");
    await expect(page.locator("#presentation-headlineAlignment")).toHaveValue("center");
    await page.getByRole("button", { name: t.presentation.format.reset, exact: true }).click();
    await expect.poll(async () => (await stored(page)).data.presentation).toEqual(original);
  });

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
    await page.locator("#presentation-displayNameTypography").selectOption("italic");
    await page.locator("#presentation-headlineAlignment").selectOption("right");
    await page.locator("#presentation-headlineTypography").selectOption("monospace");
    await page.locator("#presentation-bioAlignment").selectOption("center");
    await page.locator("#presentation-locationAlignment").selectOption("center");
    await expect
      .poll(async () => (await stored(page)).data.presentation.format)
      .toMatchObject({
        displayNameLevel: 3,
        displayNameAlignment: "center",
        displayNameTypography: "italic",
        headlineAlignment: "right",
        headlineTypography: "monospace",
        bioAlignment: "center",
        locationAlignment: "center",
      });
    const preview = page.getByRole("article", { name: t.preview.documentLabel, exact: true });
    await expect(preview.getByRole("heading", { name: "Alex", exact: true })).toHaveCSS(
      "text-align",
      "center",
    );
    await expect(
      preview.getByRole("heading", { name: "Alex", exact: true }).locator("em"),
    ).toHaveText("Alex");
    await expect(
      preview.getByRole("heading", { name: "Building useful things", exact: true }).locator("code"),
    ).toHaveText("Building useful things");
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
    await expect(page.locator("#presentation-displayNameTypography")).toHaveValue("italic");
    await expect(page.locator("#presentation-headlineTypography")).toHaveValue("monospace");
    await page.getByRole("button", { name: t.presentation.format.reset, exact: true }).click();
    await expect
      .poll(async () => (await stored(page)).data.presentation)
      .not.toHaveProperty("format");
    expect((await stored(page)).data.presentation.displayName).toBe("Alex");
    await expect(preview.getByRole("heading", { name: "Alex", exact: true })).toHaveCSS(
      "text-align",
      "center",
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
      expect(box!.y).toBeGreaterThanOrEqual(0);
      await page.screenshot({
        path: `work/previews/presentation-${locale}-${theme}-320-initial.png`,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      // Record the initial reach first, then use native scrolling to reach the field.
      if (box!.y + box!.height > 568) await page.mouse.wheel(0, box!.y + box!.height - 568 + 24);
      await expect
        .poll(async () => {
          const reached = await name.boundingBox();
          return Boolean(reached && reached.y >= 0 && reached.y + reached.height <= 568);
        })
        .toBe(true);
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

test("presentation writing tips stay in their field help and never replace user text", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 1000 });
  const profile = introduction("en");
  profile.data.presentation.displayName = "";
  profile.data.presentation.headline = "";
  await open(page, profile, "en");
  const name = page.getByRole("textbox", { name: en.presentation.displayName, exact: true });
  const headline = page.getByRole("textbox", { name: en.presentation.headline, exact: true });
  const bio = page.getByRole("textbox", { name: en.presentation.bio, exact: true });
  await expect(headline).toHaveValue(profile.data.presentation.headline);
  await expect(name).toHaveValue("");
  await expect(name).toHaveAttribute("placeholder", en.presentation.displayNamePlaceholder);
  await expect(name).toHaveAccessibleDescription(en.presentation.displayNameHelp);
  await expect(headline).toHaveAttribute("placeholder", en.presentation.headlinePlaceholder);
  await expect(headline).toHaveAccessibleDescription(en.presentation.headlineHelp);
  await expect(bio).toHaveAccessibleDescription(en.presentation.bioHelp);
  await expect(page.locator("#presentation-friendly-style")).toHaveCount(0);
  await expect(page.getByText("Editor.presentation.style.friendly", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("Editor.presentation.style.help", { exact: true })).toHaveCount(0);
  const fieldIds = await Promise.all(
    [
      name,
      headline,
      bio,
      page.getByRole("combobox", { name: en.presentation.location, exact: true }),
    ].map((field) => field.evaluate((element) => element.id)),
  );
  const fieldOrder = await page.evaluate((ids) => {
    const inputs = Array.from(document.querySelectorAll("input, textarea"));
    return ids.map((id) => inputs.findIndex((input) => input.id === id));
  }, fieldIds);
  expect(fieldOrder).toEqual([...fieldOrder].sort((left, right) => left - right));
  await expect(
    page.getByRole("button", { name: /building useful things|personal note/i }),
  ).toHaveCount(0);
  await page.screenshot({
    path: "work/previews/presentation-writing-examples.png",
    fullPage: true,
  });
  await name.fill(en.presentation.displayNamePlaceholder);
  const preview = page.getByRole("article", { name: en.preview.documentLabel, exact: true });
  await expect(
    preview.getByRole("heading", { name: en.presentation.displayNamePlaceholder, exact: true }),
  ).toBeVisible();
  await headline.fill("I enjoy building useful things, especially tiny tools");
  await expect
    .poll(async () => (await stored(page)).data.presentation.headline)
    .toBe("I enjoy building useful things, especially tiny tools");
});

test("presentation on a short phone keeps the first field reachable and supports a long edit", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 667 });
  await open(page, introduction("en"), "en");
  const name = page.getByRole("textbox", { name: en.presentation.displayName, exact: true });
  // Measure and capture before any control interaction can scroll the page.
  const initialBox = await name.boundingBox();
  expect(initialBox!.y).toBeGreaterThanOrEqual(0);
  expect(initialBox!.y + initialBox!.height).toBeLessThanOrEqual(667);
  await page.screenshot({ path: "work/previews/presentation-phone-initial.png" });
  const bio = Array.from({ length: 40 }, (_, index) => `A personal note ${index + 1}.`).join(
    "\n\n",
  );
  await page.getByRole("textbox", { name: en.presentation.bio, exact: true }).fill(bio);
  await page.locator("#presentation-location-placement").selectOption("headline");
  await expect.poll(async () => (await stored(page)).data.presentation.bio).toBe(bio);
  await expect
    .poll(async () => (await stored(page)).data.presentation.format?.locationPlacement)
    .toBe("headline");
  await page.getByRole("button", { name: en.settings.preview, exact: true }).click();
  const preview = page.getByRole("article", { name: en.preview.documentLabel, exact: true });
  await expect(preview.getByRole("heading", { name: /Building useful things/ })).toContainText(
    "from",
  );
  await expect(preview).toContainText("A personal note 40.");
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await page.screenshot({ path: "work/previews/presentation-phone-preview.png", fullPage: true });
});
