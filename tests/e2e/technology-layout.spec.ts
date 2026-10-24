import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import { generateReadme } from "../../src/core/readme";
import { mobileTest } from "./mobile-test";
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
  expect(
    markdown.match(/<kbd><img width="20" height="20"[^>]+alt=""[^>]*> [^<]+<\/kbd>/g),
  ).toHaveLength(toolNames.length);
  expect(markdown).not.toContain('width="32"');
  for (const name of toolNames) expect(markdown).toContain(` ${name}</kbd>`);
  await page.screenshot({
    path: "work/previews/expanded-technologies-desktop.png",
    fullPage: true,
  });
});

test("exported technology labels align without application CSS in an unstyled browser", async ({
  page,
}) => {
  const document = createEmptyProfile("en");
  document.visibility.technologies = true;
  const names = ["React", "Next.js", "Python"];
  document.data.technologies.groups = [
    {
      id: "tools",
      name: "Technologies",
      items: names.map((name, index) => ({ id: `tool-${index}`, name, context: "" })),
    },
  ];
  const result = generateReadme(document);
  if (!result.success || !result.customHtml?.[0]) throw new Error("Expected exported HTML");
  for (const name of names) {
    const technology = findTechnology(name)!;
    await page.route(technology.iconUrl, async (route) =>
      route.fulfill({
        contentType: "image/svg+xml",
        body: await readFile(`public${technology.iconPath}`),
      }),
    );
  }
  // Use only the exported HTML: no application CSS or layout correction for kbd.
  await page.setContent(`<!doctype html><html><body>${result.customHtml[0].html}</body></html>`);
  await expect(page.locator("kbd img")).toHaveCount(names.length);
  await expect(page.locator("img")).toHaveCount(names.length);
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              image instanceof HTMLImageElement &&
              image.complete &&
              image.naturalWidth > 0 &&
              image.closest("kbd") !== null,
          ),
        ),
    )
    .toBe(true);
  expect(
    await page
      .locator("kbd")
      .first()
      .evaluate((element) => getComputedStyle(element).display),
  ).toBe("inline");
  for (const width of [360, 1000]) {
    await page.setViewportSize({ width, height: 360 });
    const bounds = await page.locator("p").evaluate((element) =>
      [...element.querySelectorAll("img")].map((image) => {
        const label = image.nextSibling;
        const badge = image.closest("kbd");
        if (!(label instanceof Text) || !badge) throw new Error("Expected the complete badge");
        const labelRange = window.document.createRange();
        labelRange.setStart(label, 1);
        labelRange.setEnd(label, label.length);
        const iconBox = image.getBoundingClientRect();
        const labelBox = labelRange.getBoundingClientRect();
        const badgeBox = badge.getBoundingClientRect();
        return {
          width: iconBox.width,
          height: iconBox.height,
          iconRight: iconBox.right,
          badgeLeft: badgeBox.left,
          badgeRight: badgeBox.right,
          labelLeft: labelBox.left,
          labelRight: labelBox.right,
          centerDistance: Math.abs(
            iconBox.y + iconBox.height / 2 - labelBox.y - labelBox.height / 2,
          ),
        };
      }),
    );
    for (const bound of bounds) {
      expect(bound.width).toBe(20);
      expect(bound.height).toBe(20);
      expect(bound.badgeLeft).toBeLessThanOrEqual(bound.iconRight);
      expect(bound.badgeRight).toBeGreaterThanOrEqual(bound.labelRight);
      expect(bound.labelLeft).toBeGreaterThan(bound.iconRight);
      expect(bound.centerDistance).toBeLessThanOrEqual(6);
    }
  }
  // An external reader controls wrapping at extreme widths; all complete labels remain readable.
  await page.setViewportSize({ width: 120, height: 360 });
  for (const name of names) await expect(page.locator("kbd", { hasText: name })).toBeVisible();
  expect(
    await page.evaluate(() => window.document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(120);
  await page.setViewportSize({ width: 360, height: 180 });
  await page.screenshot({ path: "work/previews/exported-technology-labels-native.png" });
});

for (const locale of ["en", "es"] as const) {
  mobileTest(
    `accessibility: ${locale} named technology icons wrap into compact rows at 360px in both themes`,
    async ({ page }) => {
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
        for (const name of toolNames)
          await expect(preview.getByText(name, { exact: true })).toBeVisible();
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
    },
  );
}
