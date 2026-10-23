import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ContentLocale } from "../../src/core/profile/profile-schema";
import { mobileTest } from "./mobile-test";

const key = "github-profile-generator.profile.v2";
function profile(locale: ContentLocale) {
  const document = createEmptyProfile(locale);
  document.visibility.technologies = true;
  document.data.technologies.groups = [
    {
      id: "frontend",
      name: "Frontend",
      tools: ["React", "Next.js", "Tailwind CSS", "TanStack Query"],
    },
    { id: "backend", name: "Backend", tools: ["NestJS", ".NET", "Django", "FastAPI"] },
    { id: "languages", name: "Languages", tools: ["TypeScript", "JavaScript", "C#", "Python"] },
    { id: "quality", name: "Quality", tools: ["Postman", "Vitest", "Jest"] },
    { id: "data", name: "Data", tools: ["PostgreSQL", "MongoDB", "Supabase"] },
    { id: "tools", name: "Tools", tools: ["Git", "GitHub", "Visual Studio Code"] },
    { id: "cloud", name: "Cloud", tools: ["AWS", "Docker", "Vercel"] },
    { id: "ai", name: "AI", tools: ["Codex", "ChatGPT"] },
  ].map(({ id, name, tools }) => ({
    id,
    name,
    items: tools.map((tool, index) => ({ id: `${id}-${index}`, name: tool, context: "" })),
  }));
  return document;
}
async function open(page: Page, locale: ContentLocale, legacy = false) {
  const document = profile(locale);
  if (legacy) delete document.data.technologies.layout;
  await page.goto(`/${locale}`);
  await page.evaluate(({ key, document }) => localStorage.setItem(key, JSON.stringify(document)), {
    key,
    document,
  });
  await page.goto(`/${locale}/editor`);
  const select = page.getByRole("combobox", {
    name: locale === "en" ? "README layout" : "Diseño en el README",
    exact: true,
  });
  await expect(select).toBeEnabled();
  return { select, document };
}

for (const locale of ["en", "es"] as const) {
  test(`${locale}: compact export reduces height, keeps local icons and persists layout after editing`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const { select, document } = await open(page, locale, true);
    const preview = page.getByRole("article", {
      name: locale === "en" ? "README preview" : "Vista previa del README",
      exact: true,
    });
    await expect(select).toHaveValue("grouped");
    await expect(preview.getByRole("heading", { name: "Frontend", exact: true })).toBeVisible();
    const previousHeight = await preview.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    await select.selectOption("compact");
    await expect(preview.locator("kbd")).toHaveCount(26);
    await expect(preview.getByRole("heading", { name: "Frontend", exact: true })).toHaveCount(0);
    await expect(preview.locator('img[src="/technology-icons/react.svg"]')).toHaveAttribute(
      "alt",
      "",
    );
    const compactHeight = await preview.evaluate(
      (element) => element.getBoundingClientRect().height,
    );
    expect(compactHeight).toBeLessThan(previousHeight * 0.8);
    await page.screenshot({
      path: `work/previews/compact-technologies-${locale}-desktop.png`,
      fullPage: true,
    });
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", {
        name: locale === "en" ? "Download README" : "Descargar README",
        exact: true,
      })
      .click();
    const download = await downloadPromise;
    const path = await download.path();
    if (!path) throw new Error("Expected downloaded README");
    const source = await readFile(path, "utf8");
    expect(source).toContain("<kbd>");
    expect(source).not.toContain("### Frontend");
    const search = page.getByRole("combobox", {
      name: locale === "en" ? "Add technologies" : "Agregar tecnologías",
      exact: true,
    });
    await search.fill("Vue");
    await page.getByRole("option", { name: "Vue", exact: true }).click();
    await expect
      .poll(async () =>
        page.evaluate(
          (key) =>
            JSON.parse(localStorage.getItem(key) ?? "null")?.data.technologies.groups.flatMap(
              (group: { items: unknown[] }) => group.items,
            ).length,
          key,
        ),
      )
      .toBe(27);
    const stored = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
      key,
    );
    expect(stored.data.technologies.layout).toBe("compact");
    expect(
      stored.data.technologies.groups.flatMap((group: { items: unknown[] }) => group.items),
    ).toHaveLength(27);
    expect(stored.data.technologies.groups[0].items.slice(0, 4)).toEqual(
      document.data.technologies.groups[0]!.items,
    );
    await page.reload();
    await expect(select).toHaveValue("compact");
    await expect(preview.locator("kbd")).toHaveCount(27);
  });

  mobileTest(
    `${locale}: phone-height initial controls and long compact preview stay within the viewport width`,
    async ({ page }) => {
      await page.setViewportSize({ width: 390, height: 667 });
      const { select } = await open(page, locale);
      // Capturar y medir antes de hacer clic o enfocar el control evaluado.
      await page.screenshot({
        path: `work/previews/compact-technologies-${locale}-mobile-initial.png`,
        fullPage: false,
      });
      const bounds = await select.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.y).toBeGreaterThanOrEqual(0);
      expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(667);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        390,
      );
      await page
        .getByRole("button", { name: locale === "en" ? "Preview" : "Vista previa", exact: true })
        .click();
      const preview = page.getByRole("article", {
        name: locale === "en" ? "README preview" : "Vista previa del README",
        exact: true,
      });
      await expect(preview.locator("kbd")).toHaveCount(26);
      await page.screenshot({
        path: `work/previews/compact-technologies-${locale}-mobile-preview.png`,
        fullPage: true,
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
        390,
      );
    },
  );
}
