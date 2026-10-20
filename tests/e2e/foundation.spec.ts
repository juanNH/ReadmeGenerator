import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("defaults to English and keeps the page, query and anchor when switching languages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  const destinations = [
    "/editor?example=profile&tool=React&tool=TypeScript#main-content",
    "/editor?example=profile#intro%20notes",
    "/editor?example=profile",
  ];
  for (const destination of destinations) {
    await page.goto(`/en${destination}`);
    for (const locale of ["es", "en", "es", "en"]) {
      const currentLocale = locale === "en" ? "es" : "en";
      const language = page.getByRole("combobox", {
        name: currentLocale === "en" ? "Language" : "Idioma",
        exact: true,
      });
      await language.focus();
      await language.selectOption(locale);
      await expect
        .poll(() => {
          const url = new URL(page.url());
          return `${url.pathname}${url.search}${url.hash}`;
        })
        .toBe(`/${locale}${destination}`);
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(
        page.getByRole("combobox", { name: locale === "en" ? "Language" : "Idioma", exact: true }),
      ).toBeFocused();
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        locale === "en" ? "Your GitHub profile" : "Tu perfil de GitHub",
      );
    }
  }
  await page.goBack();
  await expect
    .poll(() => {
      const url = new URL(page.url());
      return `${url.pathname}${url.search}${url.hash}`;
    })
    .toBe("/en/editor?example=profile#intro%20notes");
});

test("theme choice persists across reloads", async ({ page }) => {
  await page.goto("/en");
  const theme = page.getByRole("button", { name: "Toggle dark mode", exact: true });
  await expect(theme).toHaveAttribute("aria-pressed", "false");
  await theme.click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(theme).toHaveAttribute("aria-pressed", "true");
});

test("skip link moves keyboard focus to main content", async ({ page }) => {
  await page.goto("/en");
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content", exact: true })).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/#main-content$/);
  await expect(page.getByRole("main")).toBeFocused();
});

for (const locale of ["en", "es"]) {
  for (const route of [""]) {
    test(`accessibility: ${locale}${route || "/"} has no detected WCAG AA violations`, async ({
      page,
    }) => {
      await page.goto(`/${locale}${route}`);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(results.violations).toEqual([]);
    });
  }
}

test("the internal design kit is unavailable in production and is absent from public navigation", async ({
  page,
}) => {
  for (const locale of ["en", "es"]) {
    await page.goto(`/${locale}`);
    await expect(page.locator('a[href*="/design-system"]')).toHaveCount(0);
    const response = await page.goto(`/${locale}/design-system`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      locale === "en" ? "This page isn't here." : "Esta página no está acá.",
    );
  }
});

test("mobile pages fit a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of ["/en", "/es"]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    const hasOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    );
    expect(hasOverflow, route).toBe(false);
    await expect(page.getByRole("combobox")).toBeVisible();
  }
});

test("unknown localized pages show a usable translated 404", async ({ page }) => {
  const response = await page.goto("/es/no-such-page");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Esta página no está acá.");
  await page.getByRole("link", { name: "Volver al inicio", exact: true }).click();
  await expect(page).toHaveURL(/\/es$/);
});
