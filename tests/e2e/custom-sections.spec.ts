import { showCustomBlockPicker, showSectionOrganizer } from "./editor-test-helpers";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import {
  createEmptyProfile,
  createEmptyProfileV1,
} from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import type { CustomBlock } from "../../src/core/profile/custom-content";
import { createCustomExampleProfile } from "../../src/core/profile/fixtures";

const draftKey = "github-profile-generator.profile.v2";
const legacyKey = "github-profile-generator.profile.v1";

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

async function addSection(page: Page, title = "How I work") {
  await page.getByRole("button", { name: "Add custom section", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Section title", exact: true });
  await expect(input).toBeFocused();
  await input.fill(title);
}

async function downloadReadme(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download README", exact: true }).click();
  const path = await (await event).path();
  if (!path) throw new Error("README download missing");
  return readFile(path, "utf8");
}

test("custom sections compose, duplicate independently, hide, reorder and recover", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await openEditor(page);
  await addSection(page);
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByRole("textbox", { name: "Text", exact: true }).fill("- ");
  const first = page.getByRole("textbox", { name: "List item 1", exact: true });
  await expect(first).toBeFocused();
  await first.fill("Build small accessible interfaces");
  await first.press("End");
  await first.press("Enter");
  await expect(page.getByRole("textbox", { name: "List item 2", exact: true })).toBeFocused();
  await page.getByRole("textbox", { name: "List item 2", exact: true }).fill("Share useful notes");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  await page.getByRole("textbox", { name: "Link label", exact: true }).fill("My notes");
  await page.getByRole("textbox", { name: "URL", exact: true }).fill("https://example.com/notes");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add numbered list", exact: true }).click();
  const ordered = page.getByRole("group", { name: "Numbered list 3", exact: true });
  await ordered.getByRole("textbox", { name: "List item 1", exact: true }).fill("Explore an idea");
  await expect
    .poll(async () => (await storedProfile(page))?.customSections[0]?.blocks.length)
    .toBe(3);
  const original = (await storedProfile(page)).customSections[0]!;
  await page.getByRole("button", { name: "Duplicate section", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Section title", exact: true })).toBeFocused();
  await expect(
    page.getByRole("checkbox", { name: "How I work · custom 1", exact: true, includeHidden: true }),
  ).toBeEnabled();
  await expect(
    page.getByRole("checkbox", { name: "How I work · custom 2", exact: true, includeHidden: true }),
  ).toBeEnabled();
  await page.getByRole("textbox", { name: "Section title", exact: true }).fill("Exploring");
  await page
    .getByRole("group", { name: "Bullet list 1", exact: true })
    .getByRole("textbox", { name: "List item 1", exact: true })
    .fill("An independent copy");
  await showSectionOrganizer(page);
  await page
    .getByRole("checkbox", { name: "How I work", exact: true, includeHidden: true })
    .uncheck();
  await showSectionOrganizer(page);
  await page
    .getByRole("checkbox", { name: "Technologies & tools", exact: true, includeHidden: true })
    .check();
  await showSectionOrganizer(page);
  await page.getByRole("button", { name: "Move Exploring left", exact: true }).click();
  await expect.poll(async () => (await storedProfile(page))?.customSections.length).toBe(2);
  const saved = await storedProfile(page);
  expect(saved.customSections[0]).toEqual({ ...original, visible: false });
  const copy = saved.customSections[1]!;
  expect(copy.id).not.toBe(original.id);
  for (let index = 0; index < original.blocks.length; index++) {
    expect(copy.blocks[index]?.id).not.toBe(original.blocks[index]?.id);
    const source = original.blocks[index];
    const target = copy.blocks[index];
    if (source?.type === "list" && target?.type === "list")
      expect(target.items.every((item) => source.items.every((old) => old.id !== item.id))).toBe(
        true,
      );
  }
  await showSectionOrganizer(page);
  await page.getByRole("button", { name: "Technologies & tools", exact: true }).click();
  await page.getByRole("combobox", { name: "Add technologies", exact: true }).fill("React");
  await page.getByRole("option", { name: "React", exact: true }).click();
  const markdown = await downloadReadme(page);
  expect(markdown).toContain("## Exploring\n\n+ An independent copy\n+ Share useful notes");
  expect(markdown).toContain("[My notes](<https://example.com/notes>)");
  expect(markdown).toContain("1) Explore an idea");
  expect(markdown).not.toContain("## How I work");
  expect(markdown.indexOf("## Exploring")).toBeLessThan(markdown.indexOf("## Technologies"));
  await expect
    .poll(async () =>
      (await storedProfile(page))?.data.technologies.groups
        .flatMap((group) => group.items)
        .some((item) => item.name === "React"),
    )
    .toBe(true);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "How I work", exact: true, includeHidden: true }),
  ).not.toBeChecked();
  await showSectionOrganizer(page);
  await page.getByRole("button", { name: "Exploring", exact: true }).click();
  await expect(
    page
      .getByRole("group", { name: "Bullet list 1", exact: true })
      .getByRole("textbox", { name: "List item 1", exact: true }),
  ).toHaveValue("An independent copy");
  expect(await downloadReadme(page)).toBe(markdown);
  await page.screenshot({ path: "work/previews/custom-en-desktop.png", fullPage: true });
});

test("custom lists support paste, Enter to finish, format conversion and block order", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await openEditor(page);
  await addSection(page, "");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add bullet list", exact: true }).click();
  const first = page.getByRole("textbox", { name: "List item 1", exact: true });
  await first.fill("Keep suffix");
  await first.evaluate((element: HTMLTextAreaElement) => element.setSelectionRange(5, 5));
  await first.evaluate((element) => {
    const data = new DataTransfer();
    data.setData("text/plain", "- first\n- second");
    element.dispatchEvent(
      new ClipboardEvent("paste", { clipboardData: data, bubbles: true, cancelable: true }),
    );
  });
  const second = page.getByRole("textbox", { name: "List item 2", exact: true });
  await expect(first).toHaveValue("Keep first");
  await expect(second).toHaveValue("secondsuffix");
  await expect(second).toBeFocused();
  await second.press("End");
  await second.press("Enter");
  const third = page.getByRole("textbox", { name: "List item 3", exact: true });
  await expect(third).toBeFocused();
  await third.press("Enter");
  const paragraph = page.getByRole("textbox", { name: "Text", exact: true });
  await expect(paragraph).toBeFocused();
  await paragraph.fill("A short closing note");
  await page.getByRole("button", { name: "Move Text block 2 up", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Text block 1", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Convert to text: list 2", exact: true }).click();
  const converted = page
    .getByRole("group", { name: "Text block 2", exact: true })
    .getByRole("textbox", { name: "Text", exact: true });
  await expect(converted).toBeFocused();
  await expect(converted).toHaveValue("- Keep first\n- secondsuffix");
  await converted.press("End");
  await converted.pressSequentially("!");
  await expect(page.getByRole("group", { name: "Bullet list 2", exact: true })).toHaveCount(0);
  const markdown = await downloadReadme(page);
  expect(markdown).toContain("A short closing note");
  expect(markdown).toContain("\\- Keep first");
  expect(markdown).not.toContain("## Custom section");
  await page.getByRole("button", { name: "Remove Text block 2", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Text", exact: true })).toBeFocused();
});

test("custom links show exact errors, hiding preserves them and deletion affects one instance", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await openEditor(page);
  await addSection(page, "Contact");
  await expect(
    page.getByRole("checkbox", { name: "Contact · custom 1", exact: true, includeHidden: true }),
  ).toBeEnabled();
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  const url = page.getByRole("textbox", { name: "URL", exact: true });
  await url.fill("javascript:alert(1)");
  await expect(url).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Duplicate section", exact: true }).click();
  await page.getByRole("textbox", { name: "Section title", exact: true }).fill("Notes");
  await page.getByRole("textbox", { name: "URL", exact: true }).fill("https://example.com");
  await showSectionOrganizer(page);
  await page
    .getByRole("button", { name: "Review fields in Contact · custom 1", exact: true })
    .click();
  await expect(url).toBeFocused();
  await showSectionOrganizer(page);
  await page
    .getByRole("checkbox", { name: "Contact · custom 1", exact: true, includeHidden: true })
    .uncheck();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  expect(await downloadReadme(page)).toContain("https://example.com");
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Delete section", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "URL", exact: true })).toHaveValue(
    "javascript:alert(1)",
  );
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete section", exact: true }).click();
  await expect.poll(async () => (await storedProfile(page))?.customSections.length).toBe(1);
  const saved = await storedProfile(page);
  expect(saved.customSections[0]?.title).toBe("Notes");
  expect(saved.customSections[0]?.blocks[0]).toMatchObject({
    type: "link",
    url: "https://example.com",
  });
});

test("legacy recovery is read only until an edit and preserves the complete v1 backup", async ({
  page,
}) => {
  const legacy = createEmptyProfileV1("es");
  legacy.visibility.presentation = true;
  legacy.data.presentation.displayName = "A preserved profile";
  legacy.data.knowledge.items = [
    { id: "old", title: "Hidden history", description: "Kept exactly" },
  ];
  legacy.moduleOrder.reverse();
  const raw = JSON.stringify(legacy);
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: legacyKey,
    value: raw,
  });
  await page.goto("/en/editor");
  await expect(page.getByRole("textbox", { name: "Display name", exact: true })).toHaveValue(
    "A preserved profile",
  );
  await expect(page.getByText("Draft restored", { exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page).toHaveURL(/\/es\/editor$/);
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
  await page.getByRole("button", { name: "Agregar sección personalizada", exact: true }).click();
  await page.getByRole("textbox", { name: "Título de la sección", exact: true }).fill("Mis notas");
  await expect.poll(async () => (await storedProfile(page))?.customSections.length).toBe(1);
  const saved = await storedProfile(page);
  expect(saved.schemaVersion).toBe(2);
  expect(saved.data).toEqual(legacy.data);
  expect(saved.visibility).toEqual(legacy.visibility);
  expect(saved.contentLocale).toBe("es");
  expect(
    saved.sectionOrder.filter((ref) => ref.kind === "module").map((ref) => ref.moduleId),
  ).toEqual(legacy.moduleOrder);
  expect(await page.evaluate((key) => localStorage.getItem(key), legacyKey)).toBe(raw);
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: "Mis notas", exact: true, includeHidden: true }),
  ).toBeEnabled();
});

test("an invalid current draft never falls back to a legacy copy", async ({ page }) => {
  const legacy = createEmptyProfileV1("en");
  legacy.data.presentation.displayName = "Do not restore stale data";
  await page.goto("/en");
  await page.evaluate(
    ({ current, old, value }) => {
      localStorage.setItem(current, "invalid current");
      localStorage.setItem(old, value);
    },
    { current: draftKey, old: legacyKey, value: JSON.stringify(legacy) },
  );
  await page.goto("/en/editor");
  await expect(page.getByText("We could not open the saved draft", { exact: true })).toBeVisible();
  await expect(page.getByText("Do not restore stale data", { exact: true })).toHaveCount(0);
  await addSection(page, "In memory");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByRole("textbox", { name: "Text", exact: true }).fill("Still able to write");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(
    page.getByRole("textbox", { name: "Título de la sección", exact: true }),
  ).toHaveValue("In memory");
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBe("invalid current");
});

test("custom content stays exportable in memory across languages when the browser quota fails", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.addInitScript((key) => {
    const setItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException("Storage full", "QuotaExceededError");
      return setItem.call(this, name, value);
    };
  }, draftKey);
  await openEditor(page);
  await addSection(page, "Personal notes");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add bullet list", exact: true }).click();
  await page
    .getByRole("textbox", { name: "List item 1", exact: true })
    .fill("My work is still here");
  await expect(page.getByText("Recent changes could not be saved", { exact: true })).toBeVisible();
  const markdown = await downloadReadme(page);
  expect(markdown).toContain("+ My work is still here");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(
    page.getByRole("textbox", { name: "Título de la sección", exact: true }),
  ).toHaveValue("Personal notes");
  await expect(page.getByRole("textbox", { name: "Elemento de lista 1", exact: true })).toHaveValue(
    "My work is still here",
  );
  await expect(
    page.getByText("No se pudieron guardar los últimos cambios", { exact: true }),
  ).toBeVisible();
  await page.getByRole("combobox", { name: "Idioma", exact: true }).selectOption("en");
  expect(await downloadReadme(page)).toBe(markdown);
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
});

test("long custom titles and text wrap within the mobile editor and preview", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 900 });
  await openEditor(page);
  await addSection(page, "A".repeat(140));
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Add text", exact: true }).click();
  await page.getByRole("textbox", { name: "Text", exact: true }).fill("B".repeat(200));
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole("button", { name: "Preview", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.getByRole("article", { name: "README preview", exact: true })).toContainText(
    "B".repeat(200),
  );
});

test("authored titles cannot collide with provisional or disambiguated navigation names", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  const profile = createEmptyProfile("en");
  profile.customSections = ["Custom section 2", "", "Custom section 2 · custom 1"].map(
    (title, index) => ({
      id: `section-${index}`,
      title,
      visible: true,
      blocks: [{ id: "paragraph", type: "paragraph", text: `Personal text ${index}` }],
    }),
  );
  profile.sectionOrder.push(
    ...profile.customSections.map(({ id }) => ({ kind: "custom" as const, sectionId: id })),
  );
  await openEditor(page, profile);
  const labels = [
    "Custom section 2 · custom 1",
    "Custom section 2 · custom 2",
    "Custom section 2 · custom 1 · custom 3",
  ];
  for (const [index, label] of labels.entries()) {
    const checkbox = page.getByRole("checkbox", { name: label, exact: true, includeHidden: true });
    await expect(checkbox).toHaveCount(1);
    await showSectionOrganizer(page);
    await page.getByRole("button", { name: label, exact: true }).click();
    await expect(page.getByRole("textbox", { name: "Section title", exact: true })).toHaveValue(
      profile.customSections[index]!.title,
    );
  }
  const markdown = await downloadReadme(page);
  expect(markdown).toContain("## Custom section 2\n");
  expect(markdown).toContain("## Custom section 2 · custom 1\n");
  expect(markdown).not.toContain("## Custom section 2 · custom 2\n");
});

test("consecutive lists stay independent across empty blocks, untitled sections and built-in lists", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  const profile = createEmptyProfile("en");
  profile.visibility.projects = true;
  profile.data.projects.items = [
    {
      id: "project",
      name: "My small project",
      description: "",
      role: "",
      technologies: [],
      links: [],
    },
  ];
  const list = (id: string, style: "ordered" | "unordered"): CustomBlock => ({
    id,
    type: "list",
    style,
    items: [
      { id: "first", text: `${id} first` },
      { id: "second", text: `${id} second` },
    ],
  });
  profile.customSections = [
    {
      id: "one",
      title: "",
      visible: true,
      blocks: [
        list("one", "unordered"),
        { id: "empty", type: "paragraph", text: "" },
        list("two", "unordered"),
        list("three", "ordered"),
        list("four", "ordered"),
      ],
    },
    {
      id: "two",
      title: "",
      visible: true,
      blocks: [list("five", "ordered"), list("six", "unordered")],
    },
  ];
  profile.sectionOrder.push(
    { kind: "custom", sectionId: "one" },
    { kind: "custom", sectionId: "two" },
  );
  await openEditor(page, profile);
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.locator("ul")).toHaveCount(4);
  await expect(preview.locator("ol")).toHaveCount(3);
  for (const ordered of await preview.locator("ol").all()) {
    await expect(ordered.locator(":scope > li")).toHaveCount(2);
    expect(await ordered.evaluate((element: HTMLOListElement) => element.start)).toBe(1);
  }
  const markdown = await downloadReadme(page);
  expect(markdown).toContain("+ one first");
  expect(markdown).toContain("* two first");
  expect(markdown).toContain("1. three first");
  expect(markdown).toContain("1) four first");
  expect(markdown).toContain("1. five first");
});

test("Spanish list choices explain points and automatic numbering before writing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await openEditor(page, undefined, "es");
  await page.getByRole("button", { name: "Agregar sección personalizada", exact: true }).click();
  await page.getByRole("textbox", { name: "Título de la sección", exact: true }).fill("Mis ideas");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Agregar lista con puntos", exact: true }).click();
  const points = page.getByRole("group", { name: "Lista con puntos 1", exact: true });
  const item = points.getByRole("textbox", { name: "Elemento de lista 1", exact: true });
  await expect(item).toBeFocused();
  await expect(item).toHaveAccessibleDescription(
    /Cada elemento lleva un punto \(•\).*Los puntos se agregan automáticamente/,
  );
  await item.fill("Compartir lo que aprendo");
  await showCustomBlockPicker(page);
  await page.getByRole("button", { name: "Agregar lista numerada", exact: true }).click();
  const numbers = page.getByRole("group", { name: "Lista numerada 2", exact: true });
  const step = numbers.getByRole("textbox", { name: "Elemento de lista 1", exact: true });
  await expect(step).toHaveAccessibleDescription(
    /Los números \(1\., 2\., 3\.\) se agregan automáticamente/,
  );
  await step.fill("Explorar una idea");
  await step.press("End");
  await step.press("Enter");
  await numbers
    .getByRole("textbox", { name: "Elemento de lista 2", exact: true })
    .fill("Compartir un proyecto");
  const preview = page.getByRole("article", { name: "Vista previa del README", exact: true });
  await expect(preview.locator("ul > li")).toHaveText(["Compartir lo que aprendo"]);
  await expect(preview.locator("ol > li")).toHaveText([
    "Explorar una idea",
    "Compartir un proyecto",
  ]);
  await expect(page.getByRole("button", { name: /viñetas/ })).toHaveCount(0);
});

for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`custom sections accessibility ${locale} ${theme} on mobile`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      const profile = createCustomExampleProfile();
      profile.customSections[1]!.visible = true;
      profile.contentLocale = locale;
      await openEditor(page, profile, locale);
      await showSectionOrganizer(page);
      const title = profile.customSections[0]!.title;
      const label = locale === "en" ? `${title} · custom 1` : `${title} · personalizada 1`;
      await page.getByRole("button", { name: label, exact: true }).click();
      await expect(
        page.getByRole("textbox", {
          name: locale === "en" ? "Section title" : "Título de la sección",
          exact: true,
        }),
      ).toHaveValue(title);
      expect(
        await page
          .getByRole("textbox", {
            name: locale === "en" ? "List item 1" : "Elemento de lista 1",
            exact: true,
          })
          .evaluate((element) => element.scrollHeight <= element.clientHeight + 2),
      ).toBe(true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.screenshot({
        path: `work/previews/custom-${locale}-${theme}-mobile.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: locale === "en" ? "Preview" : "Vista previa", exact: true })
        .click();
      const preview = page.getByRole("article", {
        name: locale === "en" ? "README preview" : "Vista previa del README",
        exact: true,
      });
      await expect(preview.locator("ul li")).not.toHaveCount(0);
      await expect(preview.locator("ol li")).not.toHaveCount(0);
      await page.screenshot({
        path: `work/previews/custom-${locale}-${theme}-preview-mobile.png`,
        fullPage: true,
      });
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
    });
  }
}
