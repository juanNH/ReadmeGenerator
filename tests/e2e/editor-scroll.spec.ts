import { expect, test, type Locator, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ContentLocale } from "../../src/core/profile/profile-schema";
import { mobileTest } from "./mobile-test";

const draftKey = "github-profile-generator.profile.v2";
const copy = {
  en: { title: "Section name", text: "Text", preview: "Preview", document: "README preview" },
  es: {
    title: "Nombre de la sección",
    text: "Texto",
    preview: "Vista previa",
    document: "Vista previa del README",
  },
};

function longProfile(locale: ContentLocale) {
  const profile = createEmptyProfile(locale);
  profile.customSections = Array.from({ length: 12 }, (_, section) => ({
    id: `notes-${section}`,
    title: `Notes ${section + 1}`,
    visible: true,
    blocks: Array.from({ length: section === 0 ? 12 : 2 }, (_, block) => ({
      id: `text-${section}-${block}`,
      type: "paragraph" as const,
      text: `Section ${section + 1}, paragraph ${block + 1}. ${"A useful note to keep and share. ".repeat(8)}`,
    })),
  }));
  profile.sectionOrder.push(
    ...profile.customSections.map(({ id }) => ({ kind: "custom" as const, sectionId: id })),
  );
  return profile;
}

async function openEditor(page: Page, locale: ContentLocale) {
  await page.goto(`/${locale}`);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(longProfile(locale)),
  });
  await page.goto(`/${locale}/editor`);
  await expect(page.getByRole("textbox", { name: copy[locale].title, exact: true })).toHaveValue(
    "Notes 1",
  );
}

async function scrollTop(panel: Locator) {
  return panel.evaluate((element) => element.scrollTop);
}

async function wheelOver(page: Page, panel: Locator, deltaY: number) {
  const bounds = await panel.boundingBox();
  if (!bounds) throw new Error("The scroll region must be visible.");
  await page.mouse.move(bounds.x + bounds.width - 24, bounds.y + bounds.height / 2);
  await page.mouse.wheel(0, deltaY);
}

async function expectNaturalFlow(page: Page) {
  const configuration = page.locator('[data-editor-scroll-panel="configuration"]');
  await expect(configuration).toHaveCSS("overflow-y", "visible");
  await expect(page.locator("[data-editor-scroll-grid]")).toHaveCSS("position", "static");
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
  ).toBeLessThanOrEqual(1);
}

for (const locale of ["en", "es"] as const) {
  test(`editor scroll: desktop columns scroll independently and retain keyboard editing ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openEditor(page, locale);
    const configuration = page.locator('[data-editor-scroll-panel="configuration"]');
    const preview = page.locator('[data-editor-scroll-panel="preview"]');
    await expect(configuration).toHaveCSS("overflow-y", "auto");
    await expect(preview).toHaveCSS("overflow-y", "auto");
    for (const panel of [configuration, preview]) {
      expect(
        await panel.evaluate((element) => element.scrollHeight - element.clientHeight),
      ).toBeGreaterThan(300);
      const bounds = await panel.boundingBox();
      expect(bounds?.height).toBeGreaterThan(320);
      expect((bounds?.y ?? 0) + (bounds?.height ?? 0)).toBeLessThanOrEqual(1000);
      await expect(panel).toHaveAttribute("tabindex", "0");
      await expect(panel).toHaveAccessibleName(/.+/);
    }

    const originalPreview = await scrollTop(preview);
    await wheelOver(page, configuration, 420);
    await expect.poll(() => scrollTop(configuration)).toBeGreaterThan(100);
    expect(await scrollTop(preview)).toBe(originalPreview);
    const originalConfiguration = await scrollTop(configuration);
    await wheelOver(page, preview, 420);
    await expect.poll(() => scrollTop(preview)).toBeGreaterThan(originalPreview + 100);
    expect(await scrollTop(configuration)).toBe(originalConfiguration);

    await configuration.focus();
    await page.keyboard.press("PageDown");
    await expect.poll(() => scrollTop(configuration)).toBeGreaterThan(originalConfiguration);
    await expect(configuration).toBeFocused();

    const lastText = configuration
      .getByRole("textbox", { name: copy[locale].text, exact: true })
      .last();
    // Browser focus must reveal a deep field in its own column without moving the preview.
    const previewBeforeFocus = await scrollTop(preview);
    await lastText.focus();
    await expect(lastText).toBeFocused();
    const fieldBounds = await lastText.boundingBox();
    const panelBounds = await configuration.boundingBox();
    expect(fieldBounds?.y).toBeGreaterThanOrEqual(panelBounds?.y ?? 0);
    expect((fieldBounds?.y ?? 0) + (fieldBounds?.height ?? 0)).toBeLessThanOrEqual(
      (panelBounds?.y ?? 0) + (panelBounds?.height ?? 0),
    );
    expect(await scrollTop(preview)).toBe(previewBeforeFocus);
    await lastText.fill("A final note edited after scrolling.");
    await expect(preview).toContainText("A final note edited after scrolling.");
    await page.keyboard.press("Tab");
    expect(
      await configuration.evaluate((element) => element.contains(document.activeElement)),
    ).toBe(true);
    await page.screenshot({ path: `work/previews/editor-independent-scroll-${locale}.png` });
    await page.getByRole("button", { name: "Notes 2", exact: true }).click();
    await expect.poll(() => scrollTop(configuration)).toBe(0);
    const language = page.getByRole("combobox", {
      name: locale === "en" ? "README language" : "Idioma del README",
      exact: true,
    });
    const languageBounds = await language.boundingBox();
    const configurationBounds = await configuration.boundingBox();
    expect(languageBounds!.y).toBeGreaterThanOrEqual(configurationBounds!.y);
    expect(languageBounds!.y + languageBounds!.height).toBeLessThanOrEqual(
      configurationBounds!.y + configurationBounds!.height,
    );
    await expect(page.getByRole("button", { name: "Notes 2", exact: true })).toBeFocused();
    const firstSection = page.getByRole("button", { name: "Notes 1", exact: true });
    await firstSection.click();
    await configuration.evaluate((element) => {
      element.scrollTop = element.scrollHeight;
    });
    expect(await scrollTop(configuration)).toBeGreaterThan(100);
    await firstSection.click();
    await expect.poll(() => scrollTop(configuration)).toBe(0);
    await expect(firstSection).toBeFocused();
    expect((await language.boundingBox())!.y).toBeGreaterThanOrEqual(
      (await configuration.boundingBox())!.y,
    );
  });

  mobileTest(
    `editor scroll: phone keeps natural page scrolling and reachable first field ${locale}`,
    async ({ page }) => {
      await page.setViewportSize({ width: 320, height: 568 });
      await openEditor(page, locale);
      const title = page.getByRole("textbox", { name: copy[locale].title, exact: true });
      // Medir la posición inicial antes de enfocar o interactuar con el campo.
      const initialBounds = await title.boundingBox();
      expect(initialBounds?.y).toBeGreaterThanOrEqual(0);
      expect((initialBounds?.y ?? 0) + (initialBounds?.height ?? 0)).toBeLessThanOrEqual(568);
      await page.screenshot({ path: `work/previews/editor-scroll-phone-initial-${locale}.png` });
      await expectNaturalFlow(page);
      const lastText = page.getByRole("textbox", { name: copy[locale].text, exact: true }).last();
      await lastText.focus();
      await lastText.fill("A final note reached on a phone.");
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
      await page.getByRole("button", { name: copy[locale].preview, exact: true }).click();
      const article = page.getByRole("article", { name: copy[locale].document, exact: true });
      await expect(article).toContainText("A final note reached on a phone.");
      await expect(page.locator('[data-editor-scroll-panel="preview"]')).toHaveCSS(
        "overflow-y",
        "visible",
      );
      await expectNaturalFlow(page);
    },
  );
}

test("editor scroll: enlarged text returns to natural flow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEditor(page, "en");
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "32px";
  });
  await expectNaturalFlow(page);
  const lastText = page.getByRole("textbox", { name: "Text", exact: true }).last();
  await lastText.focus();
  await expect(lastText).toBeFocused();
  await expect(lastText).toBeInViewport();
  await expectNaturalFlow(page);
});

test("editor scroll: short desktop viewport retains natural flow", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 640 });
  await openEditor(page, "en");
  await expectNaturalFlow(page);
});

test("editor scroll: forced colors retain native scrollbars and reduced motion", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.emulateMedia({ forcedColors: "active", reducedMotion: "reduce" });
  await openEditor(page, "en");
  const configuration = page.locator('[data-editor-scroll-panel="configuration"]');
  await expect(configuration).toHaveCSS("overflow-y", "auto");
  await expect(configuration).toHaveCSS("scrollbar-color", "auto");
  await expect(configuration).toHaveCSS("forced-color-adjust", "auto");
  await expect(configuration).toHaveCSS("scroll-behavior", "auto");
  expect(
    await configuration.evaluate(
      (element) => getComputedStyle(element, "::-webkit-scrollbar-thumb").borderRadius,
    ),
  ).not.toBe("999px");
  await configuration.focus();
  await page.keyboard.press("PageDown");
  await expect.poll(() => scrollTop(configuration)).toBeGreaterThan(100);
});
