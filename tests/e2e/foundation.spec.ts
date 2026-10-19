import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test("defaults to English and keeps the page, query and anchor when switching languages", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/en$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await page.goto("/en/design-system?example=profile#modules");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page).toHaveURL(/\/es\/design-system\?example=profile#modules$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("estructura");
  await page.getByRole("combobox", { name: "Idioma", exact: true }).selectOption("en");
  await expect(page).toHaveURL(/\/en\/design-system\?example=profile#modules$/);
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

test("optional modules can be toggled with the keyboard and fields explain errors", async ({
  page,
}) => {
  await page.goto("/en/design-system");
  const technologies = page.getByRole("checkbox", { name: "Show technologies", exact: true });
  await expect(page.getByTestId("demo-technologies-module")).toBeVisible();
  await technologies.focus();
  await page.keyboard.press("Space");
  await expect(page.getByTestId("demo-technologies-module")).toHaveCount(0);
  await page.keyboard.press("Space");
  await expect(page.getByTestId("demo-technologies-module")).toBeVisible();
  const activity = page.getByRole("checkbox", { name: "Show activity", exact: true });
  await expect(page.getByTestId("demo-activity-module")).toHaveCount(0);
  await activity.check();
  await expect(page.getByTestId("demo-activity-module")).toBeVisible();
  const contact = page.getByRole("textbox", { name: "Contact link", exact: true });
  await expect(contact).toHaveAttribute("aria-invalid", "true");
  await expect(contact).toHaveAccessibleDescription(/Enter a complete link/);
  await expect(page.getByRole("button", { name: "Publish profile", exact: true })).toBeDisabled();
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
  for (const route of ["", "/design-system"]) {
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

test("accessibility: dark design system has no detected WCAG AA violations", async ({ page }) => {
  await page.goto("/en/design-system");
  await page.getByRole("button", { name: "Toggle dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("mobile pages fit a narrow viewport", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const route of ["/en", "/es", "/en/design-system", "/es/design-system"]) {
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
