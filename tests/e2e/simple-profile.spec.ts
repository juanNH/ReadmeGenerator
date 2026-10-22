import { showSectionOrganizer } from "./editor-test-helpers";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";

const draftKey = "github-profile-generator.profile.v2";

async function openEditor(page: Page, locale: "en" | "es" = "en") {
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("checkbox", {
      name: locale === "en" ? "About you" : "Presentación",
      exact: true,
      includeHidden: true,
    }),
  ).toBeEnabled();
}

async function showSections(page: Page) {
  await expect(
    page.getByRole("navigation", { name: /^(Your sections|Tus secciones)$/, exact: true }),
  ).toBeVisible();
}

async function addSection(page: Page, name: string) {
  await showSections(page);
  await showSectionOrganizer(page);
  await page.getByRole("checkbox", { name, exact: true, includeHidden: true }).check();
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.locator("#editor-section-title")).toHaveText(name);
}

async function showPreview(page: Page, locale: "en" | "es" = "en") {
  const button = page.getByRole("button", {
    name: locale === "en" ? "Preview" : "Vista previa",
    exact: true,
  });
  if (await button.isVisible()) await button.click();
}

async function storedProfile(page: Page): Promise<ProfileDocument> {
  await expect(page.getByText("Saved on this browser", { exact: true })).toBeVisible();
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null") as ProfileDocument,
    draftKey,
  );
}

async function downloadReadme(page: Page) {
  await showPreview(page);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download README", exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("README.md");
  const path = await download.path();
  if (!path) throw new Error("The generated README must be available locally.");
  return readFile(path, "utf8");
}

test("a fresh profile offers five optional sections and a short introduction without duplicated questions", async ({
  page,
}) => {
  await openEditor(page);
  const navigation = page.getByRole("navigation", {
    name: "Your sections",
    exact: true,
    includeHidden: true,
  });
  await expect(navigation.getByRole("checkbox", { includeHidden: true })).toHaveCount(5);
  await expect(
    navigation.getByRole("checkbox", { checked: true, includeHidden: true }),
  ).toHaveCount(0);
  await expect(
    navigation.getByRole("checkbox", { name: "Knowledge", exact: true, includeHidden: true }),
  ).toHaveCount(0);
  await expect(
    navigation.getByRole("checkbox", {
      name: "Education & training",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveCount(0);
  await expect(
    navigation.getByRole("checkbox", { name: "Right now", exact: true, includeHidden: true }),
  ).toHaveCount(0);
  await addSection(page, "About you");
  await page.getByRole("textbox", { name: "Display name", exact: true }).fill("Alex Example");
  const bio = "I enjoy building useful interfaces and learning Docker";
  await page.getByRole("textbox", { name: "About you", exact: true }).fill(bio);
  await expect(page.getByRole("textbox", { name: "Headline", exact: true })).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Location", exact: true })).toBeVisible();
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview).toContainText("Alex Example");
  await expect(preview).toContainText(bio);
  await expect(preview.getByRole("heading", { name: "Knowledge", exact: true })).toHaveCount(0);
  await expect(preview.getByRole("heading", { name: "Right now", exact: true })).toHaveCount(0);
  const markdown = await downloadReadme(page);
  expect(markdown).toContain('<h1 align="center">Alex Example</h1>');
  expect(markdown).toContain(bio);
  const stored = await storedProfile(page);
  expect(stored.schemaVersion).toBe(2);
  expect(stored.sectionOrder).toHaveLength(9);
  expect(stored.data.knowledge.items).toEqual([]);
  expect(stored.data.education.items).toEqual([]);
  expect(stored.data.current.items).toEqual([]);
  expect(stored.visibility.knowledge).toBe(false);
  expect(stored.visibility.education).toBe(false);
  expect(stored.visibility.current).toBe(false);
  const edit = page.getByRole("button", { name: "Edit", exact: true });
  if (await edit.isVisible()) await edit.click();
  const userImage =
    '<img width="32" height="32" src="https://raw.githubusercontent.com/devicons/devicon/6a37858047b0e8d9c9c0e68f4a071fc410652e89/icons/react/react-original.svg" alt="React" />';
  await page.getByRole("textbox", { name: "About you", exact: true }).fill(userImage);
  await showPreview(page);
  await expect(preview).toContainText(userImage);
  await expect(preview.locator("img")).toHaveCount(0);
});

test("technologies autocomplete with local icons, accept custom names and avoid duplicate aliases", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openEditor(page);
  await addSection(page, "Technologies & tools");
  const search = page.getByRole("combobox", { name: "Add technologies", exact: true });
  await search.fill("React");
  await expect(search).toHaveAttribute("aria-expanded", "true");
  const suggestions = page.getByRole("listbox", { name: "Technology suggestions", exact: true });
  await expect(suggestions.getByRole("option", { name: "React", exact: true })).toBeVisible();
  await search.press("ArrowDown");
  await search.press("ArrowUp");
  await search.press("Enter");
  await expect(page.getByRole("button", { name: "Remove React", exact: true })).toBeVisible();
  await expect(
    page
      .getByRole("region", { name: "Technologies & tools", exact: true })
      .locator('img[src="/technology-icons/react.svg"]'),
  ).toBeVisible();
  await expect(search).toBeFocused();
  await search.fill("reactjs");
  await expect(
    page.getByRole("status").filter({ hasText: "React is already in your list." }),
  ).toBeVisible();
  await expect(page.getByRole("option", { name: "React", exact: true })).toHaveCount(0);
  await search.fill("My small toolkit");
  await page.getByRole("option", { name: "Add “My small toolkit”", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Remove My small toolkit", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("textbox", { name: "How you use it", exact: true })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Category name", exact: true })).toHaveCount(0);
  const stored = await storedProfile(page);
  expect(stored.data.technologies.groups).toHaveLength(2);
  expect(
    stored.data.technologies.groups.map((group) => ({
      name: group.name,
      tools: group.items.map((item) => item.name),
    })),
  ).toEqual([
    { name: "Frontend", tools: ["React"] },
    { name: "", tools: ["My small toolkit"] },
  ]);
  expect(
    stored.data.technologies.groups.every((group) =>
      group.items.every((item) => item.context === ""),
    ),
  ).toBe(true);
  await page.screenshot({ path: "work/previews/simple-technologies-desktop.png", fullPage: true });
  const markdown = await downloadReadme(page);
  expect(markdown).toMatch(
    /<img width="20" height="20" src="https:\/\/raw\.githubusercontent\.com\/devicons\/devicon\/[a-f0-9]{40}\/icons\/react\/react-original\.svg" alt="" \/>/,
  );
  expect(markdown).toContain("&nbsp;React");
  expect(markdown).toContain("My small toolkit");
  await page.reload();
  await expect(page.getByRole("button", { name: "Remove React", exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove My small toolkit", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Remove React", exact: true }).click();
  await expect(search).toBeFocused();
  await expect(page.getByRole("article", { name: "README preview", exact: true })).toContainText(
    "My small toolkit",
  );
});

test("a project can stand alone with only a name and no public activity or external link", async ({
  page,
}) => {
  await openEditor(page);
  await addSection(page, "Projects");
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  const name = page.getByRole("textbox", { name: "Project name", exact: true });
  await expect(name).toBeFocused();
  await name.fill("My tiny tool");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  const stored = await storedProfile(page);
  expect(stored.data.projects.items).toHaveLength(1);
  expect(stored.data.projects.items[0]).toMatchObject({
    name: "My tiny tool",
    description: "",
    role: "",
    technologies: [],
    links: [],
  });
  expect(stored.visibility.presentation).toBe(false);
  expect(stored.visibility.metrics).toBe(false);
  expect(await downloadReadme(page)).toContain("My tiny tool");
});
test("a saved contact label stays editable when cleared without changing its link or other profile data", async ({
  page,
}) => {
  const profile = createEmptyProfile("en");
  profile.visibility.presentation = true;
  profile.visibility.contact = true;
  profile.data.presentation.displayName = "Alex Example";
  const link = { id: "saved-email", label: "Say hello", url: "mailto:hello@example.com" };
  profile.data.contact.links = [link];
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(profile),
  });
  await openEditor(page);
  await addSection(page, "Contact");
  await page.getByText("Customize label (optional)", { exact: true }).click();
  const label = page.getByRole("textbox", { name: "Link label", exact: true });
  await expect(label).toHaveValue("Say hello");
  await label.fill("");
  await expect(label).toBeVisible();
  await expect(label).toBeFocused();
  await expect(label).toHaveValue("");
  await expect(page.getByRole("textbox", { name: "URL", exact: true })).toHaveValue(link.url);
  await label.fill("Write to me");
  await expect(label).toBeFocused();
  const stored = await storedProfile(page);
  expect(stored.data).toEqual({
    ...profile.data,
    contact: { links: [{ ...link, label: "Write to me" }] },
  });
  expect(stored.sectionOrder).toEqual(profile.sectionOrder);
  expect(stored.visibility).toEqual(profile.visibility);
  expect(stored.schemaVersion).toBe(2);
});
test("accessibility: the simple Spanish editor fits 360px with autocomplete, projects and preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openEditor(page, "es");
  await expect(page.getByRole("checkbox", { includeHidden: true })).toHaveCount(5);
  await addSection(page, "Presentación");
  await page.getByRole("textbox", { name: "Nombre para mostrar", exact: true }).fill("Sol Ejemplo");
  await page
    .getByRole("textbox", { name: "Sobre vos", exact: true })
    .fill("Me gusta crear interfaces y estoy aprendiendo Docker.");
  await addSection(page, "Tecnologías y herramientas");
  const search = page.getByRole("combobox", { name: "Agregar tecnologías", exact: true });
  await search.fill("React");
  await expect(page.getByRole("option", { name: "React", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  const autocomplete = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(autocomplete.violations).toEqual([]);
  await page.getByRole("option", { name: "React", exact: true }).click();
  await addSection(page, "Proyectos");
  await page.getByRole("button", { name: "Agregar proyecto", exact: true }).click();
  await page
    .getByRole("textbox", { name: "Nombre del proyecto", exact: true })
    .fill("Un cuaderno para ideas pequeñas");
  await page
    .getByRole("textbox", { name: "Descripción del proyecto", exact: true })
    .fill("Un espacio para aprender y compartir");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  const projects = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(projects.violations).toEqual([]);
  await page.screenshot({ path: "work/previews/focused-projects-mobile.png", fullPage: true });
  await showPreview(page, "es");
  const preview = page.getByRole("article", { name: "Vista previa del README", exact: true });
  await expect(preview).toContainText("Sol Ejemplo");
  await expect(preview).toContainText("Un cuaderno para ideas pequeñas");
  await expect(preview.locator('img[src="/technology-icons/react.svg"]')).toBeVisible();
  await expect(preview.locator('img[src="/technology-icons/react.svg"]')).toHaveAttribute(
    "width",
    "20",
  );
  await expect(preview).toContainText("React");
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({ path: "work/previews/focused-profile-mobile.png", fullPage: true });
});
