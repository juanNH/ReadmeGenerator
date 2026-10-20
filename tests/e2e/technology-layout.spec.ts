import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import { findTechnology } from "../../src/core/technologies";

const toolNames = [
  "React",
  "Docker",
  "Node.js",
  "Tailwind CSS",
  "JavaScript",
  "PostgreSQL",
  "Postman",
  "LangGraph",
  "Claude",
  "Codex",
  "Apache Kafka",
  "RabbitMQ",
  "Cursor",
  "Ollama",
];

async function openTools(page: Page, locale: "en" | "es") {
  const profile = createEmptyProfile(locale);
  profile.visibility.technologies = true;
  profile.data.technologies.groups = [
    {
      id: "tools",
      name: "",
      items: toolNames.map((name, index) => {
        const entry = findTechnology(name);
        if (!entry) throw new Error(`The expanded catalog must include ${name}.`);
        return { id: `tool-${index}`, name: entry.name, context: "" };
      }),
    },
  ];
  await page.addInitScript(
    (document) =>
      localStorage.setItem("github-profile-generator.profile.v2", JSON.stringify(document)),
    profile,
  );
  await page.goto(`/${locale}/editor`);
  const previewButton = page.getByRole("button", {
    name: locale === "en" ? "Preview" : "Vista previa",
    exact: true,
  });
  if (await previewButton.isVisible()) await previewButton.click();
  const preview = page.getByRole("article", {
    name: locale === "en" ? "README preview" : "Vista previa del README",
    exact: true,
  });
  await expect(preview.locator("img")).toHaveCount(toolNames.length);
  return preview;
}

test("named technology icons share a compact row and export readable labels with fixed dimensions", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const preview = await openTools(page, "en");
  const icons = preview.locator("img");
  const first = await icons.nth(0).boundingBox();
  const second = await icons.nth(1).boundingBox();
  if (!first || !second) throw new Error("Technology icons must be visible.");
  expect(Math.abs(first.y - second.y)).toBeLessThan(1);
  expect(second.x).toBeGreaterThan(first.x + first.width);
  expect(first.width).toBe(20);
  expect(first.height).toBe(20);
  expect(second.width).toBe(20);
  expect(second.height).toBe(20);
  for (const name of toolNames) await expect(preview).toContainText(name);
  for (let index = 0; index < toolNames.length; index += 1) {
    await expect(icons.nth(index)).toHaveAttribute("alt", "");
    await expect(icons.nth(index)).toHaveAttribute("aria-hidden", "true");
  }
  await expect(preview.locator("p:has(img)")).toHaveCount(1);
  await expect(preview.locator("p p")).toHaveCount(0);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download README", exact: true }).click();
  const path = await (await downloadPromise).path();
  if (!path) throw new Error("The exported README must be available.");
  const markdown = await readFile(path, "utf8");
  expect(markdown.match(/<img width="20" height="20"[^>]+alt=""/g)).toHaveLength(toolNames.length);
  expect(markdown).not.toContain('width="32"');
  for (const name of ["React", "Docker", "PostgreSQL", "LangGraph", "Claude", "Codex"]) {
    expect(markdown).toContain(`&nbsp;${name}`);
  }
  expect(markdown).toContain("&nbsp;Node\\.js");
  expect(markdown).toContain(" · ");
  await page.screenshot({
    path: "work/previews/expanded-technologies-desktop.png",
    fullPage: true,
  });
});

for (const locale of ["en", "es"] as const) {
  test(`accessibility: ${locale} named technology icons wrap into compact rows at 360px in both themes`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 900 });
    const preview = await openTools(page, locale);
    for (const theme of ["light", "dark"] as const) {
      await page.evaluate((value) => {
        localStorage.setItem("theme", value);
      }, theme);
      await page.reload();
      const previewButton = page.getByRole("button", {
        name: locale === "en" ? "Preview" : "Vista previa",
        exact: true,
      });
      if (await previewButton.isVisible()) await previewButton.click();
      const first = await preview.locator("img").first().boundingBox();
      const second = await preview.locator("img").nth(1).boundingBox();
      const last = await preview.locator("img").last().boundingBox();
      if (!first || !second || !last) throw new Error("Technology icons must be visible.");
      expect(Math.abs(first.y - second.y)).toBeLessThan(1);
      expect(last.y).toBeGreaterThan(first.y);
      for (const dimensions of [first, second, last]) {
        expect(dimensions.width).toBe(20);
        expect(dimensions.height).toBe(20);
      }
      for (const name of toolNames) await expect(preview).toContainText(name);
      // An inline group keeps the compact icon and its readable name together.
      const namedRows = await preview.locator("img").evaluateAll((icons) =>
        icons.map((icon) => {
          const name = icon.nextElementSibling;
          if (name?.tagName !== "SPAN" || !name.textContent) return false;
          const label = name.getBoundingClientRect();
          const image = icon.getBoundingClientRect();
          return Math.abs(label.y - image.y) < 6 && label.height < image.height * 1.5;
        }),
      );
      expect(namedRows).toEqual(toolNames.map(() => true));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      const scan = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      expect(scan.violations).toEqual([]);
    }
    if (locale === "es")
      await page.screenshot({
        path: "work/previews/expanded-technologies-mobile.png",
        fullPage: true,
      });
  });
}
