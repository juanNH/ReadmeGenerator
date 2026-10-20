import { expect, test } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";

for (const locale of ["en", "es"] as const) {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 390, height: 844 },
    { width: 1440, height: 1000 },
  ]) {
    test(`README language is above a long form and initially reachable ${locale} ${viewport.width}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      const profile = createEmptyProfile("en");
      profile.visibility.presentation = true;
      profile.data.presentation.displayName = "Public example";
      profile.data.presentation.bio = "A long personal introduction. ".repeat(100);
      await page.goto(`/${locale}`);
      await page.evaluate(
        (profile) =>
          localStorage.setItem("github-profile-generator.profile.v2", JSON.stringify(profile)),
        profile,
      );
      const requests: string[] = [];
      page.on("request", (request) => {
        if (/\/(cards\/|api\/github\/)/.test(new URL(request.url()).pathname))
          requests.push(request.url());
      });
      await page.goto(`/${locale}/editor`);
      const language = page.getByRole("combobox", {
        name: locale === "en" ? "README language" : "Idioma del README",
        exact: true,
      });
      await expect(language).toHaveValue("en");
      // Measure before focus, clicking or any operation that can scroll the page.
      const initial = await language.evaluate((element) => ({
        top: element.getBoundingClientRect().top,
        bottom: element.getBoundingClientRect().bottom,
        viewport: innerHeight,
        headingTop: document.getElementById("editor-section-title")!.getBoundingClientRect().top,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      expect(initial.top).toBeGreaterThanOrEqual(0);
      expect(initial.bottom).toBeLessThanOrEqual(initial.viewport);
      expect(initial.bottom).toBeLessThanOrEqual(initial.headingTop);
      expect(initial.overflow).toBe(false);
      await page.screenshot({
        path: `work/explicit-cards/language-${locale}-${viewport.width}.png`,
      });
      await language.focus();
      await language.selectOption("es");
      await expect(language).toBeFocused();
      await expect(page.locator("html")).toHaveAttribute("lang", locale);
      await expect(page).toHaveURL(new RegExp(`/${locale}/editor$`));
      await expect(page.getByPlaceholder("Alex Rivera")).toHaveValue("Public example");
      await expect
        .poll(async () =>
          page.evaluate(
            () =>
              JSON.parse(localStorage.getItem("github-profile-generator.profile.v2")!)
                .contentLocale,
          ),
        )
        .toBe("es");
      expect(requests).toEqual([]);
    });
  }
}
