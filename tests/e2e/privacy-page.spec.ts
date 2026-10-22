import { expect, test } from "@playwright/test";

const labels = {
  en: {
    title: "Privacy and data",
    exploreNavigation: "Explore the site",
    projectNavigation: "Project resources",
    privacy: "Privacy",
    notices: "Third-party notices",
    contributing: "Contribution guide",
  },
  es: {
    title: "Privacidad y datos",
    exploreNavigation: "Explorar el sitio",
    projectNavigation: "Recursos del proyecto",
    privacy: "Privacidad",
    notices: "Avisos de terceros",
    contributing: "Guía para contribuir",
  },
} as const;

for (const locale of ["en", "es"] as const) {
  test(`${locale}: privacy page and project links are available in the site footer`, async ({
    page,
  }) => {
    const copy = labels[locale];
    await page.goto(`/${locale}/privacy`);

    await expect(
      page.getByRole("heading", { level: 1, name: copy.title, exact: true }),
    ).toBeVisible();

    const main = page.getByRole("main");
    await expect(main.getByRole("link", { name: copy.contributing, exact: true })).toHaveAttribute(
      "href",
      "https://github.com/juanNH/ReadmeGenerator/blob/dev/CONTRIBUTING.md",
    );

    const footer = page.getByRole("contentinfo");
    const explore = footer.getByRole("navigation", { name: copy.exploreNavigation, exact: true });
    await expect(explore.getByRole("link", { name: copy.privacy, exact: true })).toHaveAttribute(
      "href",
      `/${locale}/privacy`,
    );

    const project = footer.getByRole("navigation", { name: copy.projectNavigation, exact: true });
    await expect(project.getByRole("link", { name: copy.notices, exact: true })).toHaveAttribute(
      "href",
      "https://github.com/juanNH/ReadmeGenerator/blob/main/THIRD_PARTY_NOTICES.md",
    );
  });
}
