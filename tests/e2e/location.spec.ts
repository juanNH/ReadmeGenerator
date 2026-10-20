import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";

type Locale = "en" | "es";
const draftKey = "github-profile-generator.profile.v2";
const copy = {
  en: {
    section: "About you",
    details: "Extra details",
    location: "Location",
    suggestions: "Country suggestions",
    preview: "Preview",
    document: "README preview",
    download: "Download README",
    theme: "Toggle dark mode",
  },
  es: {
    section: "Presentación",
    details: "Detalles opcionales",
    location: "Ubicación",
    suggestions: "Sugerencias de países",
    preview: "Vista previa",
    document: "Vista previa del README",
    download: "Descargar README",
    theme: "Activar o desactivar el modo oscuro",
  },
} as const;

async function openPresentation(page: Page, locale: Locale) {
  await page.goto(`/${locale}/editor`);
  const checkbox = page.getByRole("checkbox", {
    name: copy[locale].section,
    exact: true,
    includeHidden: true,
  });
  await expect(checkbox).toBeEnabled();
  await expect(
    page.getByRole("navigation", { name: /^(Your sections|Tus secciones)$/, exact: true }),
  ).toBeVisible();
  await checkbox.check();
  await page.getByRole("button", { name: copy[locale].section, exact: true }).click();
  await page.getByText(copy[locale].details, { exact: true }).click();
  return page.getByRole("combobox", { name: copy[locale].location, exact: true });
}

async function showPreview(page: Page, locale: Locale) {
  const button = page.getByRole("button", { name: copy[locale].preview, exact: true });
  if (await button.isVisible()) await button.click();
  return page.getByRole("article", { name: copy[locale].document, exact: true });
}

async function savedLocation(page: Page): Promise<string | null> {
  return page.evaluate((key) => {
    const stored = localStorage.getItem(key);
    if (!stored) return null;
    return (JSON.parse(stored) as { data: { presentation: { location: string } } }).data
      .presentation.location;
  }, draftKey);
}

for (const locale of ["en", "es"] as const) {
  test(`${locale} location autocompletes a country with its flag and preserves it through recovery and export`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: locale === "es" ? 360 : 1440, height: 1000 });
    const input = await openPresentation(page, locale);
    const name = locale === "en" ? "Argentina" : "España";
    const code = locale === "en" ? "ar" : "es";
    const stored = locale === "en" ? "🇦🇷 Argentina" : "🇪🇸 España";
    await input.fill(locale === "en" ? "arg" : "spain");
    const suggestions = page.getByRole("listbox", { name: copy[locale].suggestions, exact: true });
    await expect(suggestions.getByRole("option", { name, exact: true })).toBeVisible();
    await input.press("Escape");
    await expect(input).toBeFocused();
    await expect(suggestions).toHaveCount(0);
    await input.press("ArrowDown");
    await input.press("Enter");
    await expect(input).toHaveValue(name);
    await expect(input).toBeFocused();
    await expect(input).toHaveAttribute("aria-expanded", "false");
    await expect(input).toHaveCSS("background-image", new RegExp(`/country-flags/${code}\\.svg`));
    await expect.poll(() => savedLocation(page)).toBe(stored);
    await page.reload();
    const recovered = await openPresentation(page, locale);
    await expect(recovered).toHaveValue(name);
    const preview = await showPreview(page, locale);
    const flag = preview.locator(`img[src="/country-flags/${code}.svg"]`);
    await expect(flag).toBeVisible();
    await expect(flag).toHaveAttribute("width", "20");
    await expect(flag).toHaveAttribute("height", "15");
    await expect(flag).toHaveAttribute("alt", "");
    await expect(preview).toContainText(`${copy[locale].location}: ${name}`);
    const pending = page.waitForEvent("download");
    await page.getByRole("button", { name: copy[locale].download, exact: true }).click();
    const path = await (await pending).path();
    if (!path) throw new Error("Expected a generated README");
    const markdown = await readFile(path, "utf8");
    expect(markdown).toContain(
      `<img width="20" height="15" src="https://raw.githubusercontent.com/lipis/flag-icons/fe15c16e7463d0c66d6c5730e9d0e832438d98e1/flags/4x3/${code}.svg" alt="" /> ${name}`,
    );
    const otherLocale = locale === "en" ? "es" : "en";
    const otherInput = await openPresentation(page, otherLocale);
    await expect(otherInput).toHaveValue(name);
    expect(await savedLocation(page)).toBe(stored);
    await otherInput.fill("Remote / worldwide");
    await otherInput.press("Tab");
    await expect.poll(() => savedLocation(page)).toBe("Remote / worldwide");
    const freePreview = await showPreview(page, otherLocale);
    await expect(freePreview.locator("img")).toHaveCount(0);
    await expect(freePreview).toContainText("Remote / worldwide");
  });
}

test("old and custom locations stay untouched and never load user-supplied flag images", async ({
  page,
}) => {
  const profile = createEmptyProfile("en");
  profile.visibility.presentation = true;
  profile.data.presentation.location = "Buenos Aires, Argentina";
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(profile),
  });
  const input = await openPresentation(page, "en");
  await expect(input).toHaveValue(profile.data.presentation.location);
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.locator("img")).toHaveCount(0);
  const hostile = '🇦🇷 <img src="https://example.com/track.svg">';
  await input.fill(hostile);
  await input.press("Tab");
  await expect(preview).toContainText('<img src="https://example.com/track.svg">');
  await expect(preview.locator("img")).toHaveCount(0);
  await expect(preview.locator('img[src="https://example.com/track.svg"]')).toHaveCount(0);
});

for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`accessibility: ${locale} country suggestions and selected flag fit 360px in ${theme} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      const input = await openPresentation(page, locale);
      if (theme === "dark")
        await page.getByRole("button", { name: copy[locale].theme, exact: true }).click();
      await input.fill("ar");
      await expect(page.getByRole("option", { name: "Argentina", exact: true })).toBeVisible();
      if (locale === "es" && theme === "dark")
        await page.screenshot({
          path: "work/previews/location-suggestions-mobile.png",
          fullPage: true,
        });
      const open = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(open.violations).toEqual([]);
      await page.getByRole("option", { name: "Argentina", exact: true }).click();
      await expect(input).toHaveValue("Argentina");
      if (locale === "es" && theme === "dark")
        await page.screenshot({ path: "work/previews/location-mobile.png", fullPage: true });
      const preview = await showPreview(page, locale);
      await expect(preview.locator('img[src="/country-flags/ar.svg"]')).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      ).toBe(false);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    });
  }
}
