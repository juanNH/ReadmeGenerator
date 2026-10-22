import { expect, test, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ContentLocale } from "../../src/core/profile/profile-schema";

const imageUrl = "https://images.example.com/app.png";
const labels = {
  en: {
    name: "Project name",
    titleUrl: "Project URL for title",
    coverUrl: "Preview image URL",
    cover: "Preview image (optional)",
    review: "Review fields in Projects",
    preview: "README preview",
    show: "Preview",
  },
  es: {
    name: "Nombre del proyecto",
    titleUrl: "URL del proyecto para el título",
    coverUrl: "URL de la imagen de vista previa",
    cover: "Imagen de vista previa (opcional)",
    review: "Revisar campos en Proyectos",
    preview: "Vista previa del README",
    show: "Vista previa",
  },
} as const;
async function open(page: Page, locale: ContentLocale) {
  const profile = createEmptyProfile(locale);
  profile.visibility.projects = true;
  profile.data.projects.items = [
    {
      id: "app",
      name: "Readme Generator",
      description: "A small app for making a personal README.",
      role: "Author",
      technologies: ["TypeScript", "React"],
      links: [
        { id: "demo", label: "Live app", url: "https://app.example.com/" },
        { id: "repo", label: "Repository", url: "https://github.com/example/app" },
      ],
      cover: { url: imageUrl, alt: "README editor with two panels" },
    },
  ];
  await page.route(imageUrl, (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="960" height="480" viewBox="0 0 960 480"><rect width="960" height="480" fill="#d1e9de"/><rect x="30" y="30" width="430" height="420" rx="12" fill="#fff"/><rect x="490" y="30" width="440" height="420" rx="12" fill="#16372b"/><text x="525" y="95" fill="#fff" font-size="28">README preview</text></svg>',
    }),
  );
  await page.goto(`/${locale}`);
  await page.evaluate(
    (profile) =>
      localStorage.setItem("github-profile-generator.profile.v2", JSON.stringify(profile)),
    profile,
  );
  await page.goto(`/${locale}/editor`);
  await expect(page.getByRole("textbox", { name: labels[locale].name, exact: true })).toBeEnabled();
}

for (const locale of ["en", "es"] as const) {
  test(`${locale}: one title URL and the cover render safely, and review opens cover errors`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await open(page, locale);
    const copy = labels[locale];
    const preview = page.getByRole("article", { name: copy.preview, exact: true });
    await expect(
      preview.getByRole("link", { name: "Readme Generator", exact: true }),
    ).toHaveAttribute("href", "https://app.example.com/");
    await expect(preview.getByRole("link", { name: "Live app", exact: true })).toHaveCount(0);
    await expect(preview.getByRole("link", { name: "Repository", exact: true })).toHaveCount(0);
    const titleUrl = page.getByRole("textbox", { name: copy.titleUrl, exact: true });
    await expect(titleUrl).toHaveValue("https://app.example.com/");
    await titleUrl.fill("javascript:alert(1)");
    await expect(titleUrl).toHaveAttribute("aria-invalid", "true");
    await titleUrl.fill("https://app.example.com/updated");
    await expect(
      preview.getByRole("link", { name: "Readme Generator", exact: true }),
    ).toHaveAttribute("href", "https://app.example.com/updated");
    const image = preview.getByRole("img", { name: "README editor with two panels", exact: true });
    await expect(image).toHaveAttribute("width", "480");
    await expect(image).toHaveAttribute("loading", "lazy");
    await expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
    await expect
      .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBe(960);
    await page.screenshot({
      path: `work/previews/project-showcase-${locale}-desktop.png`,
      fullPage: true,
    });
    const coverUrl = page.getByRole("textbox", { name: copy.coverUrl, exact: true });
    await coverUrl.fill("http://localhost/preview.png");
    await expect(coverUrl).toHaveAttribute("aria-invalid", "true");
    const summary = page.locator("summary").filter({ hasText: copy.cover });
    await summary.click();
    await expect(coverUrl).not.toBeVisible();
    await page.getByRole("button", { name: copy.review, exact: true }).click();
    await expect(coverUrl).toBeVisible();
    await expect(coverUrl).toBeFocused();
    await coverUrl.fill(imageUrl);
    await expect(image).toBeVisible();
  });

  test(`${locale}: project editing and mini preview fit a phone-height viewport`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 667 });
    await open(page, locale);
    const copy = labels[locale];
    const firstField = page.getByRole("textbox", { name: copy.name, exact: true });
    // Initial reachability is measured before any interaction can scroll this field.
    await page.screenshot({
      path: `work/previews/project-showcase-${locale}-mobile-initial.png`,
      fullPage: false,
    });
    const bounds = await firstField.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.y).toBeGreaterThanOrEqual(0);
    expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(667);
    await page.getByRole("button", { name: copy.show, exact: true }).click();
    const image = page
      .getByRole("article", { name: copy.preview, exact: true })
      .getByRole("img", { name: "README editor with two panels", exact: true });
    await expect(image).toBeVisible();
    await expect
      .poll(() => image.evaluate((node) => (node as HTMLImageElement).naturalWidth))
      .toBe(960);
    const imageBounds = await image.boundingBox();
    expect(imageBounds!.width).toBeLessThanOrEqual(390);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      390,
    );
    await page.screenshot({
      path: `work/previews/project-showcase-${locale}-mobile-preview.png`,
      fullPage: true,
    });
  });
}
