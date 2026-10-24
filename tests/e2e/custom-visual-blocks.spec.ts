import { showCustomBlockPicker, showSectionOrganizer } from "./editor-test-helpers";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { generateReadme } from "../../src/core/readme";

const draftKey = "github-profile-generator.profile.v2";
const imageUrl = "https://images.example.com/banner.svg?theme=light&size=wide";
const imageDescription = "A small garden of ideas [notes] & projects";
const banner =
  '<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="280" viewBox="0 0 1200 280"><rect width="1200" height="280" rx="20" fill="#173e34"/><circle cx="1040" cy="140" r="85" fill="#8ce5be"/><path d="M985 140h110M1040 85v110" stroke="#173e34" stroke-width="6"/><text x="60" y="130" fill="#eafff5" font-family="sans-serif" font-size="42">A little space for my ideas</text><text x="60" y="184" fill="#b4d9cc" font-family="sans-serif" font-size="25">Build, explore and share.</text></svg>';

async function mockImages(page: Page) {
  await page.route("https://images.example.com/**", async (route) => {
    if (route.request().url().includes("missing"))
      await route.fulfill({ status: 404, body: "Unavailable" });
    else await route.fulfill({ status: 200, contentType: "image/svg+xml", body: banner });
  });
}

async function openEditor(page: Page, profile?: ProfileDocument, locale: "en" | "es" = "en") {
  await page.goto(`/${locale}`);
  if (profile)
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: draftKey,
      value: JSON.stringify(profile),
    });
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("checkbox", {
      name: locale === "en" ? "About you" : "Presentación",
      exact: true,
      includeHidden: true,
    }),
  ).toBeEnabled();
}

async function storedProfile(page: Page): Promise<ProfileDocument> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), draftKey);
}

async function downloadReadme(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download README", exact: true }).click();
  const path = await (await event).path();
  if (!path) throw new Error("Missing README download");
  return readFile(path, "utf8");
}

function visualProfile(locale: "en" | "es" = "en"): ProfileDocument {
  const profile = createEmptyProfile(locale);
  profile.customSections = [
    {
      id: "personal-corner",
      title: "My corner",
      visible: true,
      blocks: [
        { id: "cover", type: "image", url: imageUrl, alt: imageDescription },
        { id: "subtitle", type: "heading", text: "Small experiments" },
        { id: "quote", type: "quote", text: "Build something useful.\nShare what you learn." },
        { id: "line", type: "divider" },
        { id: "note", type: "paragraph", text: "A small profile can tell a personal story." },
      ],
    },
  ];
  profile.sectionOrder.push({ kind: "custom", sectionId: "personal-corner" });
  return profile;
}

test("visual choices have local samples and create empty blocks with the right focus", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  const imageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") imageRequests.push(request.url());
  });
  await openEditor(page);
  await page.getByRole("button", { name: "Add custom section", exact: true }).click();
  const picker = page.getByRole("group", { name: "Add section content", exact: true });
  await expect(picker.getByRole("button")).toHaveCount(10);
  for (const name of [
    "Add subtitle",
    "Add divider",
    "Add highlighted quote",
    "Add image / banner",
  ]) {
    const option = picker.getByRole("button", { name, exact: true });
    await expect(option).toHaveAccessibleDescription(/.+/);
    await expect(option.locator('[aria-hidden="true"]')).toHaveCount(1);
  }
  await expect(picker.locator("img")).toHaveCount(0);
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add image / banner", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Public image URL", exact: true })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Image description", exact: true })).toHaveValue(
    "",
  );
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add subtitle", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Subtitle", exact: true })).toBeFocused();
  await expect(page.getByRole("textbox", { name: "Subtitle", exact: true })).toHaveValue("");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add highlighted quote", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Highlighted quote", exact: true })).toBeFocused();
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add divider", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Divider 4", exact: true })).toBeFocused();
  await expect
    .poll(async () => (await storedProfile(page))?.customSections[0]?.blocks.length)
    .toBe(4);
  expect((await storedProfile(page)).customSections[0]?.blocks).toMatchObject([
    { type: "image", url: "", alt: "" },
    { type: "heading", text: "" },
    { type: "quote", text: "" },
    { type: "divider" },
  ]);
  expect(imageRequests).toEqual([]);
});

test("image, subtitle, quote and divider share the preview and exported README and recover independently", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await mockImages(page);
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const imageRequests: { url: string; referer?: string }[] = [];
  const optimizerRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://images.example.com/"))
      imageRequests.push({ url: request.url(), referer: request.headers()["referer"] });
    if (request.url().includes("/_next/image?")) optimizerRequests.push(request.url());
  });
  await openEditor(page);
  await page.getByRole("button", { name: "Add custom section", exact: true }).click();
  await page.getByRole("textbox", { name: "Section name", exact: true }).fill("My corner");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add image / banner", exact: true }).click();
  await page.getByRole("textbox", { name: "Public image URL", exact: true }).fill(imageUrl);
  await expect(
    page.getByRole("textbox", { name: "Image description", exact: true }),
  ).toHaveAttribute("aria-invalid", "true");
  expect(imageRequests).toEqual([]);
  await page
    .getByRole("textbox", { name: "Image description", exact: true })
    .fill(imageDescription);
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add subtitle", exact: true }).click();
  await page.getByRole("textbox", { name: "Subtitle", exact: true }).fill("Small experiments");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add highlighted quote", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Highlighted quote", exact: true })
    .fill("Build something useful.\nShare what you learn.");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add divider", exact: true }).click();
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  const image = preview.getByRole("img", { name: imageDescription, exact: true });
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
  await expect(image).toHaveAttribute("loading", "lazy");
  await expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
  await expect(
    preview.getByRole("heading", { name: "Small experiments", level: 4, exact: true }),
  ).toBeVisible();
  await expect(preview.locator("blockquote")).toContainText("Share what you learn.");
  await expect(preview.locator("hr")).toHaveCount(1);
  await expect
    .poll(async () => (await storedProfile(page))?.customSections[0]?.blocks.length)
    .toBe(4);
  const original = (await storedProfile(page)).customSections[0]!;
  const readme = await downloadReadme(page);
  const result = generateReadme(await storedProfile(page));
  expect(result.success).toBe(true);
  if (!result.success) throw new Error("Expected valid visual README");
  expect(readme).toBe(result.markdown);
  expect(result.customImages).toEqual([{ src: imageUrl, alt: imageDescription }]);
  expect(readme).toContain("### Small experiments");
  expect(readme).toContain("> Build something useful\\.");
  expect(readme).toContain("\n\n---\n");
  await page.getByRole("button", { name: "Copy README", exact: true }).click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe(
    readme,
  );
  expect(imageRequests.length).toBeGreaterThan(0);
  expect(imageRequests.every((request) => request.referer === undefined)).toBe(true);
  expect(optimizerRequests).toEqual([]);
  await page.getByRole("button", { name: "Duplicate section", exact: true }).click();
  await page.getByRole("textbox", { name: "Section name", exact: true }).fill("My experiments");
  await page
    .getByRole("textbox", { name: "Image description", exact: true })
    .fill("An independent cover description");
  await showSectionOrganizer(page);
  await page
    .getByRole("checkbox", { name: "My corner", exact: true, includeHidden: true })
    .uncheck();
  await showSectionOrganizer(page);
  await page
    .getByRole("checkbox", { name: "Technologies & tools", exact: true, includeHidden: true })
    .check();
  await showSectionOrganizer(page);
  await page.getByRole("button", { name: "Move My experiments left", exact: true }).click();
  await expect
    .poll(async () => (await storedProfile(page))?.customSections[0]?.visible)
    .toBe(false);
  const saved = await storedProfile(page);
  expect(saved.customSections[0]).toEqual({ ...original, visible: false });
  const copy = saved.customSections[1]!;
  expect(copy.blocks.every((block) => original.blocks.every((old) => old.id !== block.id))).toBe(
    true,
  );
  expect(saved).not.toHaveProperty("customImages");
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Section name", exact: true })).toHaveValue(
    "My experiments",
  );
  await expect(page.getByRole("textbox", { name: "Image description", exact: true })).toHaveValue(
    "An independent cover description",
  );
  await page.screenshot({ path: "work/previews/custom-visual-en-desktop.png", fullPage: true });
});

test("image field errors review exactly, hide without loss and never request invalid destinations", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  const profile = visualProfile();
  profile.customSections[0]!.blocks[0] = {
    id: "cover",
    type: "image",
    url: "https://127.0.0.1/secret.svg",
    alt: "",
  };
  profile.visibility.presentation = true;
  profile.data.presentation.bio = "A little about me";
  const forbiddenRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://127.0.0.1")) forbiddenRequests.push(request.url());
  });
  await openEditor(page, profile);
  await showSectionOrganizer(page);
  await page.getByRole("button", { name: "Review fields in My corner", exact: true }).click();
  const url = page.getByRole("textbox", { name: "Public image URL", exact: true });
  const alt = page.getByRole("textbox", { name: "Image description", exact: true });
  await expect(url).toBeFocused();
  await expect(url).toHaveAttribute("aria-invalid", "true");
  await expect(alt).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  await showSectionOrganizer(page);
  await page
    .getByRole("checkbox", { name: "My corner", exact: true, includeHidden: true })
    .uncheck();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  expect(await downloadReadme(page)).not.toContain("127.0.0.1");
  await showSectionOrganizer(page);
  await page.getByRole("checkbox", { name: "My corner", exact: true, includeHidden: true }).check();
  await mockImages(page);
  await url.fill(imageUrl);
  await showSectionOrganizer(page);
  await page.getByRole("button", { name: "About you", exact: true }).click();
  await showSectionOrganizer(page);
  await page.getByRole("button", { name: "Review fields in My corner", exact: true }).click();
  await expect(alt).toBeFocused();
  await alt.fill("Accessible cover");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  expect(forbiddenRequests).toEqual([]);
});

test("a load failure preserves the URL and export and resets when the image address changes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await mockImages(page);
  let failedRequests = 0;
  page.on("request", (request) => {
    if (request.url() === "https://images.example.com/missing.svg") failedRequests += 1;
  });
  const profile = visualProfile();
  profile.customSections[0]!.blocks[0] = {
    id: "cover",
    type: "image",
    url: "https://images.example.com/missing.svg",
    alt: "A missing image",
  };
  await openEditor(page, profile);
  await expect(page.getByText("This image could not be loaded", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Open image address", exact: true })).toHaveAttribute(
    "href",
    "https://images.example.com/missing.svg",
  );
  expect(await downloadReadme(page)).toContain("https://images.example.com/missing.svg");
  const attempts = failedRequests;
  expect(attempts).toBeGreaterThan(0);
  await page
    .getByRole("textbox", { name: "Highlighted quote", exact: true })
    .fill("An unrelated edit");
  await page
    .getByRole("textbox", { name: "Image description", exact: true })
    .fill("Updated description of the same image");
  await expect
    .poll(async () => (await storedProfile(page))?.customSections[0]?.blocks[2])
    .toMatchObject({ type: "quote", text: "An unrelated edit" });
  await expect(page.getByText("This image could not be loaded", { exact: true })).toBeVisible();
  expect(failedRequests).toBe(attempts);
  await page.getByRole("textbox", { name: "Public image URL", exact: true }).fill(imageUrl);
  const replacement = page.getByRole("img", {
    name: "Updated description of the same image",
    exact: true,
  });
  await replacement.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      replacement.evaluate(
        (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
  await expect(page.getByText("This image could not be loaded", { exact: true })).toHaveCount(0);
});

test("visual text fields cannot inject image nodes, HTML, scripts or links", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await mockImages(page);
  const profile = visualProfile();
  const attack =
    '![remote](https://images.example.com/attack.png) <img src="https://images.example.com/attack.png" onerror="alert(1)">';
  profile.customSections[0]!.blocks[1] = { id: "subtitle", type: "heading", text: attack };
  profile.customSections[0]!.blocks[2] = { id: "quote", type: "quote", text: attack };
  profile.customSections[0]!.blocks[4] = { id: "note", type: "paragraph", text: attack };
  const attacks: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/attack.png")) attacks.push(request.url());
  });
  await openEditor(page, profile);
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.locator("img")).toHaveCount(1);
  await expect(preview.locator("script, iframe")).toHaveCount(0);
  await expect(preview).toContainText(attack);
  expect(attacks).toEqual([]);
  await showSectionOrganizer(page);
  await page
    .getByRole("checkbox", { name: "My corner", exact: true, includeHidden: true })
    .uncheck();
  await expect(preview.locator("img")).toHaveCount(0);
});

for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`accessibility: visual custom blocks and samples fit 360px in ${locale} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await mockImages(page);
      await openEditor(page, visualProfile(locale), locale);
      await showCustomBlockPicker(page);
      const picker = page.getByRole("group", {
        name: locale === "en" ? "Add section content" : "Agregar contenido a la sección",
        exact: true,
      });
      await expect(picker.getByRole("button")).toHaveCount(10);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `work/previews/custom-visual-${locale}-${theme}-edit-mobile.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: locale === "en" ? "Preview" : "Vista previa", exact: true })
        .click();
      const image = page.getByRole("img", { name: imageDescription, exact: true });
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const imageBox = await image.boundingBox();
      expect(imageBox!.x + imageBox!.width).toBeLessThanOrEqual(360);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `work/previews/custom-visual-${locale}-${theme}-preview-mobile.png`,
        fullPage: true,
      });
    });
  }
}
