import { showSectionOrganizer } from "./editor-test-helpers";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { mobileTest } from "./mobile-test";
import { createContributorExampleProfile } from "../../src/core/profile/fixtures";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { generateReadme } from "../../src/core/readme";

const draftKey = "github-profile-generator.profile.v2";

async function openEditor(page: Page, profile?: ProfileDocument, locale: "en" | "es" = "en") {
  if (profile) {
    await page.goto(`/${locale}`);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: draftKey,
      value: JSON.stringify(profile),
    });
  }
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("checkbox", {
      name: locale === "en" ? "About you" : "Presentación",
      exact: true,
      includeHidden: true,
    }),
  ).toBeEnabled();
}

async function openSection(page: Page, name: string) {
  await showSections(page);
  const choice = page.getByRole("button", { name, exact: true, includeHidden: true });
  await choice.click();
  await expect(choice).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#editor-section-title")).toHaveText(name);
}

async function showSections(page: Page) {
  await expect(
    page.getByRole("navigation", { name: /^(Your sections|Tus secciones)$/, exact: true }),
  ).toBeVisible();
}

async function showPreview(page: Page, locale: "en" | "es" = "en") {
  const preview = page.getByRole("button", {
    name: locale === "en" ? "Preview" : "Vista previa",
    exact: true,
  });
  if (await preview.isVisible()) await preview.click();
}

async function enableSection(page: Page, name: string) {
  await showSections(page);
  await showSectionOrganizer(page);
  await page.getByRole("checkbox", { name, exact: true, includeHidden: true }).check();
  await openSection(page, name);
}

async function savedProfile(page: Page): Promise<ProfileDocument> {
  await expect(page.getByText("Saved on this browser", { exact: true })).toBeVisible();
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null") as ProfileDocument,
    draftKey,
  );
}

async function downloadReadme(page: Page): Promise<string> {
  await showPreview(page);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download README", exact: true }).click();
  const download = await event;
  expect(download.suggestedFilename()).toBe("README.md");
  const path = await download.path();
  if (!path) throw new Error("The README download must be available locally.");
  return readFile(path, "utf8");
}

test("retired sections never return from a saved draft and invalid retired links cannot block export", async ({
  page,
}) => {
  const profile = createContributorExampleProfile();
  profile.visibility.metrics = false;
  profile.visibility.technologies = false;
  profile.visibility.projects = false;
  profile.visibility.contributions = false;
  profile.visibility.contact = false;
  const study = profile.data.education.items[0];
  const activity = profile.data.current.items[0];
  if (!study || !activity) throw new Error("The compatibility fixture must contain retired data.");
  study.url = "javascript:alert(1)";
  activity.url = "https://user:secret@example.com/private";
  await openEditor(page, profile);
  const navigation = page.getByRole("navigation", {
    name: "Your sections",
    exact: true,
    includeHidden: true,
  });
  await expect(navigation.getByRole("checkbox", { includeHidden: true })).toHaveCount(5);
  for (const name of ["Knowledge", "Education & training", "Right now"])
    await expect(
      navigation.getByRole("checkbox", { name, exact: true, includeHidden: true }),
    ).toHaveCount(0);
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview).toContainText("Alex Example");
  await expect(preview).not.toContainText("Accessible interfaces");
  await expect(preview).not.toContainText("Accessible web foundations");
  await expect(preview).not.toContainText("Fictional example: interested in collaborating");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  const generated = generateReadme(profile);
  if (!generated.success) throw new Error("Retired section links must not affect active output.");
  expect(await downloadReadme(page)).toBe(generated.markdown);
  await page.getByRole("textbox", { name: "Display name", exact: true }).fill("Alex Updated");
  const stored = await savedProfile(page);
  expect(stored.data.knowledge).toEqual(profile.data.knowledge);
  expect(stored.data.education).toEqual(profile.data.education);
  expect(stored.data.current).toEqual(profile.data.current);
  expect(stored.visibility).toEqual(profile.visibility);
  expect(stored.sectionOrder).toEqual(profile.sectionOrder);
  expect(stored.schemaVersion).toBe(2);
  await page.reload();
  await expect(navigation.getByRole("checkbox", { includeHidden: true })).toHaveCount(5);
  await expect(preview).toContainText("Alex Updated");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
});

test("contributions work alone with keyboard, stable list focus and immediate language navigation", async ({
  page,
}) => {
  await openEditor(page);
  const choice = page.getByRole("checkbox", {
    name: "Activity & contributions",
    exact: true,
    includeHidden: true,
  });
  await showSectionOrganizer(page);
  await choice.focus();
  await page.keyboard.press("Space");
  await expect(page.locator("#editor-section-title")).toHaveText("Activity & contributions");
  await expect(choice).toBeFocused();
  await page.getByRole("button", { name: "Add contribution", exact: true }).click();
  const titles = page.getByRole("textbox", { name: "Contribution title", exact: true });
  await expect(titles).toBeFocused();
  await titles.fill("Temporary entry");
  await page.getByRole("button", { name: "Add contribution", exact: true }).click();
  await expect(titles.last()).toBeFocused();
  await titles.last().fill("Clear setup instructions");
  await page
    .getByRole("textbox", { name: "How you contributed", exact: true })
    .last()
    .fill("Helped others get started");
  await page.getByRole("button", { name: "Remove contribution 1", exact: true }).click();
  await expect(titles).toHaveCount(1);
  await expect(titles).toBeFocused();
  await expect(titles).toHaveValue("Clear setup instructions");
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview).toContainText("Helped others get started");
  await choice.uncheck();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  await choice.check();
  await expect(titles).toHaveValue("Clear setup instructions");
  await page
    .getByRole("textbox", { name: "How you contributed", exact: true })
    .fill("Latest contribution before changing the interface language");
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page).toHaveURL(/\/es\/editor$/);
  await expect(page.getByRole("textbox", { name: "Cómo contribuiste", exact: true })).toHaveValue(
    "Latest contribution before changing the interface language",
  );
  await expect(page.getByRole("combobox", { name: "Idioma del README", exact: true })).toHaveValue(
    "en",
  );
  await expect(page.getByText("Borrador recuperado", { exact: true })).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole("textbox", { name: "Título de la contribución", exact: true }),
  ).toHaveValue("Clear setup instructions");
  await expect(
    page.getByRole("checkbox", { name: "Presentación", exact: true, includeHidden: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Proyectos", exact: true, includeHidden: true }),
  ).not.toBeChecked();
});

test("active sections share the same preview, copied and downloaded Markdown without requiring public activity", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as Window & { copiedReadme?: string }).copiedReadme = text;
        },
      },
    });
  });
  const profile = createContributorExampleProfile();
  profile.contentLocale = "es";
  profile.visibility.metrics = false;
  const project = profile.data.projects.items[0];
  if (!project) throw new Error("The example profile must include a project.");
  project.id = "\ud800";
  await openEditor(page, profile);
  await expect(page.getByRole("checkbox", { checked: true, includeHidden: true })).toHaveCount(5);
  await expect(page.getByRole("checkbox", { includeHidden: true })).toHaveCount(5);
  await openSection(page, "Projects");
  await page
    .getByRole("textbox", { name: "Project description", exact: true })
    .fill("An accessible notebook for small ideas");
  const stored = await savedProfile(page);
  expect(stored.data.projects.items[0]?.id).toBe("\ud800");
  const generated = generateReadme(stored);
  if (!generated.success) throw new Error("The active profile must be exportable.");
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview).toHaveAttribute("lang", "es");
  await expect(preview.getByRole("heading", { name: "Proyectos", exact: true })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Contribuciones", exact: true })).toBeVisible();
  await expect(preview.getByRole("heading", { name: "Formación", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Copy README", exact: true }).click();
  await expect(page.getByText("README copied to your clipboard.", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => (window as Window & { copiedReadme?: string }).copiedReadme),
  ).toBe(generated.markdown);
  expect(await downloadReadme(page)).toBe(generated.markdown);
  await page.keyboard.press("Control+Home");
  await expect
    .poll(() =>
      page.locator('[data-editor-scroll-panel="preview"]').evaluate((element) => element.scrollTop),
    )
    .toBe(0);
  // Native Home acts on the focused column. Reset the page only for the overview capture.
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    document.querySelector('[data-editor-scroll-panel="configuration"]')!.scrollTop = 0;
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: "work/previews/focused-profile-desktop.png", fullPage: true });
});

test("saved technology groups retain their names and context while offering simple chip removal", async ({
  page,
}) => {
  const profile = createEmptyProfile("en");
  profile.visibility.technologies = true;
  profile.data.technologies.groups = [
    {
      id: "legacy-language-group",
      name: "Learning languages",
      items: [
        { id: "legacy-typescript", name: "TypeScript", context: "Practicing typed functions." },
      ],
    },
    {
      id: "legacy-database-group",
      name: "Data experiments",
      items: [{ id: "legacy-sql", name: "SQL", context: "Exploring relationships." }],
    },
  ];
  await openEditor(page, profile);
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview).toContainText("Practicing typed functions.");
  await expect(preview).toContainText("Exploring relationships.");
  const details = page.getByText("Edit category and arrange tools", { exact: true });
  await expect(details).toHaveCount(2);
  await details.first().click();
  await details.last().click();
  const groups = page.getByRole("textbox", { name: "Category name", exact: true });
  await expect(groups.first()).toHaveValue("Learning languages");
  await expect(groups.last()).toHaveValue("Data experiments");
  await groups.first().fill("Language practice");
  await page.getByText("Name and optional note for TypeScript", { exact: true }).click();
  await page
    .getByRole("textbox", { name: "Note for TypeScript", exact: true })
    .fill("Writing typed functions.");
  const stored = await savedProfile(page);
  expect(stored.data.technologies.groups).toEqual([
    {
      ...profile.data.technologies.groups[0],
      name: "Language practice",
      items: [{ id: "legacy-typescript", name: "TypeScript", context: "Writing typed functions." }],
    },
    profile.data.technologies.groups[1],
  ]);
  await page.reload();
  await expect(preview).toContainText("Language practice");
  await expect(preview).toContainText("Writing typed functions.");
  await page.getByRole("button", { name: "Remove TypeScript", exact: true }).click();
  await expect(preview).not.toContainText("Writing typed functions.");
  await expect(preview).toContainText("Exploring relationships.");
  const search = page.getByRole("combobox", { name: "Add technologies", exact: true });
  await expect(search).toBeFocused();
  await expect(search).toHaveAttribute("aria-expanded", "false");
  await page.getByRole("button", { name: "Remove SQL", exact: true }).click();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
});

test("contribution web links and contact email links follow their own validation rules", async ({
  page,
}) => {
  await openEditor(page);
  await enableSection(page, "Activity & contributions");
  await page.getByRole("button", { name: "Add contribution", exact: true }).click();
  await page
    .getByRole("textbox", { name: "How you contributed", exact: true })
    .fill("Helped a study group understand setup instructions");
  const link = page.getByRole("textbox", { name: "Contribution link", exact: true });
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  await link.fill("mailto:group@example.com");
  await expect(link).toHaveAttribute("aria-invalid", "true");
  await enableSection(page, "Contact");
  await page.getByRole("button", { name: "Add social network", exact: true }).click();
  await page.getByText("Customize label (optional)", { exact: true }).click();
  await page.getByRole("textbox", { name: "Link label", exact: true }).fill("Email");
  await page.getByRole("textbox", { name: "URL", exact: true }).fill("mailto:group@example.com");
  await showSectionOrganizer(page);
  await page
    .getByRole("checkbox", { name: "Activity & contributions", exact: true, includeHidden: true })
    .uncheck();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  await showSectionOrganizer(page);
  await page
    .getByRole("checkbox", { name: "Activity & contributions", exact: true, includeHidden: true })
    .check();
  await openSection(page, "Activity & contributions");
  await expect(link).toHaveValue("mailto:group@example.com");
  await link.fill("https://example.com/community-guide");
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.getByRole("link", { name: "Email", exact: true })).toHaveAttribute(
    "href",
    "mailto:group@example.com",
  );
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
});

test("project edits preserve legacy details and keep descriptions as text", async ({ page }) => {
  const profile = createEmptyProfile("en");
  profile.visibility.projects = true;
  profile.data.projects.items = [
    {
      id: "notebook",
      name: "A learning notebook",
      description: "A fictional project.",
      role: "Wrote and reviewed the exercises",
      technologies: ["TypeScript", "SQL"],
      links: [{ id: "reference", label: "Reference", url: "https://example.com/reference" }],
      titleUrl: "https://example.com/notebook",
    },
  ];
  const requestedMedia: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://example.com/attack")) requestedMedia.push(request.url());
  });
  await openEditor(page, profile);
  await openSection(page, "Projects");
  const name = page.getByRole("textbox", { name: "Project name", exact: true });
  await name.fill("A learning notebook");
  const description = page.getByRole("textbox", { name: "Project description", exact: true });
  await description.fill(
    'Wrote and reviewed the exercises.\n<img src="https://example.com/attack.png">\n[Unexpected](javascript:alert(1))',
  );
  const titleUrl = page.getByRole("textbox", { name: "Project URL for title", exact: true });
  await titleUrl.fill("javascript:alert(1)");
  await expect(titleUrl).toHaveAttribute("aria-invalid", "true");
  await titleUrl.fill("https://example.com/notebook");
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.locator("img, iframe, script")).toHaveCount(0);
  await expect(
    preview.getByRole("link", { name: "A learning notebook", exact: true }),
  ).toHaveAttribute("href", "https://example.com/notebook");
  await expect(preview).toContainText("[Unexpected](javascript:alert(1))");
  await expect(preview).toContainText('<img src="https://example.com/attack.png">');
  expect(requestedMedia).toEqual([]);
  const stored = await savedProfile(page);
  expect(stored.data.projects.items[0]).toMatchObject({
    role: "Wrote and reviewed the exercises",
    technologies: ["TypeScript", "SQL"],
    links: [{ id: "reference", label: "Reference", url: "https://example.com/reference" }],
  });
  await page.reload();
  await expect(page.getByRole("textbox", { name: "Project name", exact: true })).toHaveValue(
    "A learning notebook",
  );
  await expect(
    page.getByRole("textbox", { name: "Project URL for title", exact: true }),
  ).toHaveValue("https://example.com/notebook");
  await page.getByRole("button", { name: "Remove project 1", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add project", exact: true })).toBeFocused();
});

test("keyboard ordering preserves hidden positions and metrics settings until hiding activity explicitly", async ({
  page,
}) => {
  const profile = createContributorExampleProfile();
  profile.visibility.presentation = false;
  profile.visibility.technologies = true;
  profile.visibility.projects = true;
  profile.visibility.contact = false;
  await openEditor(page, profile);
  await expect(
    page.getByRole("button", { name: "Exclude GitHub cards and keep their settings", exact: true }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key) ?? "null").visibility.metrics,
      draftKey,
    ),
  ).toBe(true);
  await showSectionOrganizer(page);
  await page.getByRole("button", { name: "Activity & contributions", exact: true }).click();
  const moveUp = page.getByRole("button", {
    name: "Move Activity & contributions left",
    exact: true,
  });
  await moveUp.focus();
  await page.keyboard.press("Enter");
  await expect(moveUp).toBeFocused();
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Activity & contributions moved to position 2 of 3." }),
  ).toBeVisible();
  await page.keyboard.press("Enter");
  await expect(moveUp).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Move Activity & contributions right", exact: true }),
  ).toBeFocused();
  const stored = await savedProfile(page);
  const expectedOrder = [...profile.sectionOrder];
  [expectedOrder[2], expectedOrder[5], expectedOrder[6]] = [
    { kind: "module", moduleId: "contributions" },
    { kind: "module", moduleId: "technologies" },
    { kind: "module", moduleId: "projects" },
  ];
  expect(stored.sectionOrder).toEqual(expectedOrder);
  expect(stored.sectionOrder).toHaveLength(9);
  expect(
    new Set(
      stored.sectionOrder
        .filter((reference) => reference.kind === "module")
        .map((reference) => reference.moduleId),
    ).size,
  ).toBe(9);
  expect(stored.data).toEqual(profile.data);
  expect(stored.visibility.metrics).toBe(true);
  await showSectionOrganizer(page);
  await page
    .getByRole("button", { name: "Exclude GitHub cards and keep their settings", exact: true })
    .click();
  await expect(page.getByRole("heading", { name: "Make it yours", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  const hidden = await savedProfile(page);
  expect(hidden.data.metrics).toEqual(profile.data.metrics);
  expect(hidden.visibility.metrics).toBe(false);
  expect(hidden.sectionOrder).toEqual(expectedOrder);
  await page.reload();
  await expect(
    page.getByRole("button", {
      name: "Activity & contributions",
      exact: true,
      includeHidden: true,
    }),
  ).toHaveAttribute("aria-current", "step");
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.getByRole("heading").first()).toHaveText("Contributions");
});

test("an inactive section announces link errors and review selects its form at the invalid field", async ({
  page,
}) => {
  const profile = createEmptyProfile("en");
  profile.visibility.presentation = true;
  profile.visibility.contributions = true;
  profile.data.presentation.displayName = "Alex Example";
  profile.data.contributions.items = [
    {
      id: "contribution-example",
      title: "Clear setup instructions",
      description: "Helped others get started",
      url: "https://user:secret@example.com/private",
    },
  ];
  await openEditor(page, profile);
  const contribution = page.getByRole("button", {
    name: "Activity & contributions",
    exact: true,
    includeHidden: true,
  });
  await expect(contribution).not.toHaveAttribute("aria-current", "step");
  await expect(page.getByRole("textbox", { name: "Contribution link", exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  await showSectionOrganizer(page);
  await page
    .getByRole("button", { name: "Review fields in Activity & contributions", exact: true })
    .click();
  const link = page.getByRole("textbox", { name: "Contribution link", exact: true });
  await expect(contribution).toHaveAttribute("aria-current", "step");
  await expect(link).toBeFocused();
  await expect(link).toHaveAttribute("aria-invalid", "true");
  await link.fill("https://example.com/community-guide");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  await showSectionOrganizer(page);
  await page
    .getByRole("button", { name: "Activity & contributions", exact: true, includeHidden: true })
    .click();
  await expect(contribution).toBeFocused();
  await expect(contribution).toHaveAttribute("aria-current", "step");
  await expect(link).toBeVisible();
});

for (const locale of ["en", "es"] as const) {
  mobileTest(
    `accessibility: ${locale} content modules fit 360px with a selected form, errors and both themes`,
    async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      const profile = createContributorExampleProfile();
      profile.visibility.metrics = false;
      const firstProject = profile.data.projects.items[0];
      const firstGroup = profile.data.technologies.groups[0];
      if (!firstProject || !firstGroup)
        throw new Error("The contributor fixture must include a project and technology group.");
      firstProject.titleUrl = "incomplete";
      firstGroup.name =
        "A deliberately long technology group name to exercise wrapping on mobile screens";
      await openEditor(page, profile, locale);
      await showPreview(page, locale);
      await showSections(page);
      const projects = locale === "en" ? "Projects" : "Proyectos";
      await page
        .getByRole("button", {
          name: locale === "en" ? `Review fields in ${projects}` : `Revisar campos en ${projects}`,
          exact: true,
        })
        .click();
      await expect(
        page.getByRole("textbox", {
          name: locale === "en" ? "Project URL for title" : "URL del proyecto para el título",
          exact: true,
        }),
      ).toBeFocused();
      const theme = page.getByRole("button", {
        name: locale === "en" ? "Toggle dark mode" : "Activar o desactivar el modo oscuro",
        exact: true,
      });
      for (const dark of [false, true]) {
        const isDark = Boolean(
          (await page.locator("html").getAttribute("class"))?.split(" ").includes("dark"),
        );
        if (isDark !== dark) await theme.click();
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
        ).toBe(false);
        const results = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
          .analyze();
        expect(results.violations).toEqual([]);
      }
      await page.keyboard.press("Control+Home");
      await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
      await page.screenshot({
        path: `work/previews/content-modules-${locale}-mobile.png`,
        fullPage: true,
      });
      if (locale === "es")
        await page.screenshot({ path: "work/previews/content-mobile.png", fullPage: true });
    },
  );
}
