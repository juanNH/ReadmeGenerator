import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createContributorExampleProfile } from "../../src/core/profile/fixtures";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ContentLocale, ProfileDocument } from "../../src/core/profile/profile-schema";

const draftKey = "github-profile-generator.profile.v2";
const copy = {
  en: {
    section: "Technologies & tools",
    search: "Add technologies",
    destination: "Organize new tools",
    suggested: "Automatic categories",
    guide: "See the 9 suggested categories",
    withoutCategory: "Without category",
    settings: "Edit category and arrange tools",
    categoryName: "Category name",
    categoryTools: "Create or organize categories",
    organize: "Organize by category",
    saved: "Saved on this browser",
    preview: "README preview",
    theme: "Toggle dark mode",
  },
  es: {
    section: "Tecnologías y herramientas",
    search: "Agregar tecnologías",
    destination: "Organizar nuevas herramientas",
    suggested: "Categorías automáticas",
    guide: "Ver las 9 categorías sugeridas",
    withoutCategory: "Sin categoría",
    settings: "Editar categoría y ordenar herramientas",
    categoryName: "Nombre de la categoría",
    categoryTools: "Crear u organizar categorías",
    organize: "Organizar por categoría",
    saved: "Guardado en este navegador",
    preview: "Vista previa del README",
    theme: "Activar o desactivar el modo oscuro",
  },
} as const;

function technologiesProfile(locale: ContentLocale = "en") {
  const profile = createEmptyProfile(locale);
  profile.visibility.technologies = true;
  return profile;
}

async function openEditor(page: Page, profile: ProfileDocument, locale: ContentLocale = "en") {
  await page.goto(`/${locale}`);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(profile),
  });
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("combobox", { name: copy[locale].search, exact: true }),
  ).toBeEnabled();
}

async function readStored(page: Page): Promise<ProfileDocument> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null") as ProfileDocument,
    draftKey,
  );
}

async function savedProfile(page: Page, locale: ContentLocale = "en") {
  await expect(page.getByText(copy[locale].saved, { exact: true })).toBeVisible();
  return readStored(page);
}

async function addTool(page: Page, name: string, locale: ContentLocale = "en", query = name) {
  const search = page.getByRole("combobox", { name: copy[locale].search, exact: true });
  await search.fill(query);
  await page.getByRole("option", { name, exact: true }).click();
  await expect(search).toBeFocused();
}

async function expand(summary: Locator) {
  if (!(await summary.evaluate((node) => (node.parentElement as HTMLDetailsElement).open)))
    await summary.click();
}

function category(page: Page, name: string) {
  return page.getByRole("group", { name, exact: true });
}

async function editCategory(page: Page, name: string, locale: ContentLocale = "en") {
  const group = category(page, name);
  await expand(group.getByText(copy[locale].settings, { exact: true }));
  return group;
}

for (const locale of ["en", "es"] as const) {
  test(`${locale}: new tools use suggested categories and named decorative icons`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openEditor(page, technologiesProfile(locale), locale);
    const destination = page.getByRole("combobox", { name: copy[locale].destination, exact: true });
    await expect(destination.locator("option:checked")).toHaveText(copy[locale].suggested);
    for (const [name, query] of [
      ["React", "reactjs"],
      ["Drizzle ORM", "drizzle"],
      ["Hono", "honojs"],
      ["OpenRouter", "open router"],
    ] as const) {
      await addTool(page, name, locale, query);
    }
    const stored = await savedProfile(page, locale);
    expect(stored.schemaVersion).toBe(2);
    expect(
      stored.data.technologies.groups.map((group) => ({
        name: group.name,
        tools: group.items.map((item) => item.name),
      })),
    ).toEqual([
      { name: "Frontend", tools: ["React"] },
      { name: locale === "en" ? "Data & messaging" : "Datos y mensajería", tools: ["Drizzle ORM"] },
      { name: "Backend", tools: ["Hono"] },
      { name: locale === "en" ? "AI & automation" : "IA y automatización", tools: ["OpenRouter"] },
    ]);
    const preview = page.getByRole("article", { name: copy[locale].preview, exact: true });
    for (const [id, name] of [
      ["react", "React"],
      ["drizzle", "Drizzle ORM"],
      ["hono", "Hono"],
      ["openrouter", "OpenRouter"],
    ] as const) {
      const icon = preview.locator(`img[src="/technology-icons/${id}.svg"]`);
      await expect(icon).toHaveAttribute("width", "20");
      await expect(icon).toHaveAttribute("height", "20");
      await expect(icon).toHaveAttribute("alt", "");
      await expect(preview).toContainText(name);
    }
    await destination.selectOption("uncategorized");
    await addTool(page, "Vue", locale, "vue");
    const withoutCategory = await savedProfile(page, locale);
    expect(withoutCategory.data.technologies.groups).toHaveLength(5);
    expect(withoutCategory.data.technologies.groups[4]).toMatchObject({
      name: "",
      items: [{ name: "Vue", context: "" }],
    });
    await expect(destination.locator("option:checked")).toHaveText(
      locale === "en" ? "Without category" : "Sin categoría",
    );
    await page.screenshot({
      path: `work/previews/technology-categories-${locale}-desktop.png`,
      fullPage: true,
    });
  });
}

test("renaming or removing category titles keeps tools and selects that destination for additions", async ({
  page,
}) => {
  const profile = technologiesProfile();
  await openEditor(page, profile);
  await page
    .getByRole("combobox", { name: "Organize new tools", exact: true })
    .selectOption("uncategorized");
  await addTool(page, "React");
  expect((await savedProfile(page)).data.technologies.groups[0]?.name).toBe("");
  const frontend = await editCategory(page, "Without category · 1");
  await frontend
    .getByRole("textbox", { name: "Category name", exact: true })
    .fill("Interface craft");
  await addTool(page, "Vue", "en", "vue");
  let stored = await savedProfile(page);
  expect(stored.data.technologies.groups).toHaveLength(1);
  expect(stored.data.technologies.groups[0]?.name).toBe("Interface craft");
  await category(page, "Interface craft")
    .getByRole("button", { name: "Remove category title 1", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Without category · 1", exact: true }),
  ).toBeFocused();
  await addTool(page, "Svelte");
  await expand(page.getByText("Create or organize categories", { exact: true }));
  await page.getByRole("textbox", { name: "New category name", exact: true }).fill("Small stack");
  await page.getByRole("button", { name: "Create category", exact: true }).click();
  await addTool(page, "Hono");
  stored = await savedProfile(page);
  expect(
    stored.data.technologies.groups.map((group) => ({
      name: group.name,
      tools: group.items.map((item) => item.name),
    })),
  ).toEqual([
    { name: "", tools: ["React", "Vue", "Svelte"] },
    { name: "Small stack", tools: ["Hono"] },
  ]);
  expect(stored.data).toEqual({ ...profile.data, technologies: stored.data.technologies });
  expect(stored.sectionOrder).toEqual(profile.sectionOrder);
  expect(stored.visibility).toEqual(profile.visibility);
  await expect(
    page
      .getByRole("combobox", { name: "Organize new tools", exact: true })
      .locator("option:checked"),
  ).toHaveText("Small stack");
  await page.getByRole("textbox", { name: "New category name", exact: true }).fill("Future tools");
  await page.getByRole("button", { name: "Create category", exact: true }).click();
  const futureCategory = await editCategory(page, "Future tools");
  const futureName = futureCategory.getByRole("textbox", { name: "Category name", exact: true });
  await futureName.fill("");
  await expect(futureName).toBeFocused();
  await expect(category(page, "Future tools")).toBeVisible();
  await futureName.fill("Future toolkit");
  await futureName.press("Enter");
  await expect(
    page.getByRole("textbox", { name: "Category name", exact: true }).last(),
  ).toBeFocused();
  await category(page, "Future toolkit")
    .getByRole("button", { name: "Remove category title 3", exact: true })
    .click();
  await expect(category(page, "Future tools")).toHaveCount(0);
  await expect(category(page, "Future toolkit")).toHaveCount(0);
  await expect(page.getByRole("combobox", { name: "Add technologies", exact: true })).toBeFocused();
  const destination = page.getByRole("combobox", { name: "Organize new tools", exact: true });
  await expect(destination.locator("option:checked")).toHaveText("Automatic categories");
  await expect(
    destination.getByRole("option", { name: "Future toolkit", exact: true }),
  ).toHaveCount(0);
  stored = await savedProfile(page);
  expect(stored.data.technologies.groups[2]).toMatchObject({ name: "", items: [] });
});

test("moving tools requires confirmation and category ordering skips empty unnamed slots", async ({
  page,
}) => {
  const profile = technologiesProfile();
  profile.data.technologies.groups = [
    {
      id: "\ud800",
      name: "Frontend",
      items: [
        { id: "shared", name: "React", context: "Keep this note" },
        { id: "next", name: "Next.js", context: "" },
      ],
    },
    { id: "empty-preserved-slot", name: "", items: [] },
    { id: "backend-group", name: "Backend", items: [{ id: "shared", name: "Hono", context: "" }] },
  ];
  await openEditor(page, profile);
  const frontend = await editCategory(page, "Frontend");
  const destination = frontend.getByRole("combobox", { name: "Category for React", exact: true });
  const move = frontend.getByRole("button", {
    name: "Move React to selected category",
    exact: true,
  });
  await expect(move).toBeDisabled();
  await destination.focus();
  await destination.selectOption({ label: "Backend" });
  await expect(destination).toBeFocused();
  expect((await readStored(page)).data.technologies).toEqual(profile.data.technologies);
  await move.click();
  await expect(
    category(page, "Backend").getByRole("heading", { name: "Backend", exact: true }),
  ).toBeFocused();
  let stored = await savedProfile(page);
  const backendData = stored.data.technologies.groups.find((group) => group.name === "Backend");
  expect(backendData?.items.map((item) => item.name)).toEqual(["Hono", "React"]);
  expect(backendData?.items.find((item) => item.name === "Hono")?.id).toBe("shared");
  expect(backendData?.items.find((item) => item.name === "React")?.id).not.toBe("shared");
  expect(backendData?.items.find((item) => item.name === "React")?.context).toBe("Keep this note");
  const backend = await editCategory(page, "Backend");
  await backend
    .getByRole("button", { name: "Move React up within its category", exact: true })
    .click();
  await expect(backend.getByRole("heading", { name: "Backend", exact: true })).toBeFocused();
  await backend.getByRole("button", { name: "Move category Backend up", exact: true }).click();
  stored = await savedProfile(page);
  expect(stored.data.technologies.groups.map((group) => group.id)).toEqual([
    "backend-group",
    "empty-preserved-slot",
    "\ud800",
  ]);
  expect(stored.data.technologies.groups[0]?.items.map((item) => item.name)).toEqual([
    "React",
    "Hono",
  ]);
  const honoDestination = backend.getByRole("combobox", { name: "Category for Hono", exact: true });
  await honoDestination.focus();
  await honoDestination.selectOption("uncategorized");
  await expect(honoDestination).toBeFocused();
  await backend
    .getByRole("button", { name: "Move Hono to selected category", exact: true })
    .click();
  stored = await savedProfile(page);
  expect(stored.data.technologies.groups[1]).toEqual({
    id: "empty-preserved-slot",
    name: "",
    items: [{ id: "shared", name: "Hono", context: "" }],
  });
  expect(stored.sectionOrder).toEqual(profile.sectionOrder);
});

test("organizing an inherited draft is explicit, cancelable and preserves notes, opaque IDs and other data", async ({
  page,
}) => {
  const profile = createContributorExampleProfile();
  for (const id of ["presentation", "projects", "contributions", "metrics", "contact"] as const)
    profile.visibility[id] = false;
  profile.visibility.technologies = true;
  profile.data.technologies.groups = [
    {
      id: "\ud800",
      name: "Legacy stack",
      items: [
        { id: "\ud800", name: "React", context: "Keep the first note" },
        { id: "ts", name: "TypeScript", context: "" },
        { id: "hono", name: "Hono", context: "" },
      ],
    },
    {
      id: "second-group",
      name: "Notes",
      items: [{ id: "\ud800", name: "Vue", context: "Keep the second note" }],
    },
    { id: "future-group", name: "Someday", items: [] },
  ];
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openEditor(page, profile);
  expect(await readStored(page)).toEqual(profile);
  await expect(category(page, "Legacy stack")).toBeVisible();
  await expand(page.getByText("Create or organize categories", { exact: true }));
  page.once("dialog", (dialog) => dialog.dismiss());
  await page.getByRole("button", { name: "Organize by category", exact: true }).click();
  expect(await readStored(page)).toEqual(profile);
  await expect(category(page, "Legacy stack")).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Organize by category", exact: true }).click();
  const stored = await savedProfile(page);
  expect(stored.data.technologies.groups.map((group) => group.name)).toEqual([
    "Languages",
    "Frontend",
    "Backend",
    "Someday",
  ]);
  const tools = stored.data.technologies.groups.flatMap((group) => group.items);
  expect(tools.map(({ name, context }) => ({ name, context }))).toEqual(
    expect.arrayContaining(
      profile.data.technologies.groups.flatMap((group) =>
        group.items.map(({ name, context }) => ({ name, context })),
      ),
    ),
  );
  expect(tools).toHaveLength(4);
  const frontend = stored.data.technologies.groups.find((group) => group.name === "Frontend");
  expect(frontend?.items.filter((item) => item.id === "\ud800")).toHaveLength(1);
  expect(new Set(frontend?.items.map((item) => item.id)).size).toBe(frontend?.items.length);
  expect(stored.data).toEqual({ ...profile.data, technologies: stored.data.technologies });
  expect(stored.visibility).toEqual(profile.visibility);
  expect(stored.sectionOrder).toEqual(profile.sectionOrder);
  expect(stored.schemaVersion).toBe(2);
  expect(errors).toEqual([]);
});

test("reopening or switching interface language keeps inherited categories and the README language", async ({
  page,
}) => {
  const profile = technologiesProfile();
  profile.data.technologies.groups = [
    {
      id: "uncategorized",
      name: "My inherited toolkit",
      items: [{ id: "old-react", name: "React", context: "Original context" }],
    },
  ];
  await openEditor(page, profile);
  await expect(
    page
      .getByRole("combobox", { name: "Organize new tools", exact: true })
      .locator("option:checked"),
  ).toHaveText("My inherited toolkit");
  await addTool(page, "Hono");
  await savedProfile(page);
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page).toHaveURL(/\/es\/editor$/);
  await expect(page.getByRole("combobox", { name: "Idioma del README", exact: true })).toHaveValue(
    "en",
  );
  await expect(
    page
      .getByRole("combobox", { name: "Organizar nuevas herramientas", exact: true })
      .locator("option:checked"),
  ).toHaveText("My inherited toolkit");
  await addTool(page, "Drizzle ORM", "es", "drizzle");
  const stored = await savedProfile(page, "es");
  expect(stored.data.technologies.groups).toHaveLength(1);
  expect(stored.data.technologies.groups[0]?.name).toBe("My inherited toolkit");
  expect(stored.data.technologies.groups[0]?.items.map((item) => item.name)).toEqual([
    "React",
    "Hono",
    "Drizzle ORM",
  ]);
  expect(stored.data.technologies.groups[0]?.items[0]).toEqual(
    profile.data.technologies.groups[0]?.items[0],
  );
  await page.reload();
  await expect(
    page
      .getByRole("combobox", { name: "Organizar nuevas herramientas", exact: true })
      .locator("option:checked"),
  ).toHaveText("My inherited toolkit");
  expect(await readStored(page)).toEqual(stored);
});

for (const locale of ["en", "es"] as const) {
  test(`${locale}: category guidance explains automatic placement and previews the actual destination`, async ({
    page,
  }) => {
    const profile = technologiesProfile(locale);
    await openEditor(page, profile, locale);
    const destination = page.getByRole("combobox", { name: copy[locale].destination, exact: true });
    await expect(destination).toHaveAccessibleDescription(/React.*Frontend/);
    const guideSummary = page.getByText(copy[locale].guide, { exact: true });
    await guideSummary.focus();
    await guideSummary.press("Enter");
    const guide = page.getByRole("region", { name: copy[locale].guide, exact: true });
    await expect(guide).toBeVisible();
    await expect(guide.getByRole("term")).toHaveCount(9);
    for (const example of [
      "Python",
      "React",
      "Node.js",
      "Flutter",
      "PostgreSQL",
      "Docker",
      "Jest",
      "Claude",
      "Figma",
    ])
      await expect(guide).toContainText(example);
    await guide.screenshot({ path: `work/previews/category-guide-${locale}.png` });
    expect(await readStored(page)).toEqual(profile);
    await guideSummary.click();

    const search = page.getByRole("combobox", { name: copy[locale].search, exact: true });
    await search.fill("reactjs");
    await expect(
      page.getByRole("option", { name: "React", exact: true }),
    ).toHaveAccessibleDescription(/Frontend/);
    await page
      .getByRole("listbox")
      .screenshot({ path: `work/previews/category-destination-${locale}.png` });
    await search.fill("My own small tool");
    const customOptionName =
      locale === "en" ? "Add “My own small tool”" : "Agregar “My own small tool”";
    await expect(
      page.getByRole("option", { name: customOptionName, exact: true }),
    ).toHaveAccessibleDescription(new RegExp(copy[locale].withoutCategory));

    await destination.selectOption("uncategorized");
    await search.fill("reactjs");
    const react = page.getByRole("option", { name: "React", exact: true });
    await expect(react).toHaveAccessibleDescription(new RegExp(copy[locale].withoutCategory));
    await react.click();
    await expect(search).toBeFocused();
    await expect(page.getByRole("status").filter({ hasText: "React" })).toContainText(
      copy[locale].withoutCategory,
    );

    await expand(page.getByText(copy[locale].categoryTools, { exact: true }));
    await page
      .getByRole("textbox", {
        name: locale === "en" ? "New category name" : "Nombre de la nueva categoría",
        exact: true,
      })
      .fill("Everyday kit");
    await page
      .getByRole("button", {
        name: locale === "en" ? "Create category" : "Crear categoría",
        exact: true,
      })
      .click();
    await expect(destination).toHaveAccessibleDescription(/Everyday kit/);
    await search.fill("docker");
    await expect(
      page.getByRole("option", { name: "Docker", exact: true }),
    ).toHaveAccessibleDescription(/Everyday kit/);
    await search.fill("My own small tool");
    const custom = page.getByRole("option", { name: customOptionName, exact: true });
    await expect(custom).toHaveAccessibleDescription(/Everyday kit/);
    await custom.click();
    await expect(search).toBeFocused();

    await destination.selectOption("suggested");
    await search.fill("docker");
    const docker = page.getByRole("option", { name: "Docker", exact: true });
    const cloudName = locale === "en" ? "Cloud & DevOps" : "Cloud y DevOps";
    await expect(docker).toHaveAccessibleDescription(new RegExp(cloudName));
    await docker.click();
    const stored = await savedProfile(page, locale);
    expect(
      stored.data.technologies.groups.map((group) => [
        group.name,
        group.items.map((item) => item.name),
      ]),
    ).toEqual([
      ["", ["React"]],
      ["Everyday kit", ["My own small tool"]],
      [cloudName, ["Docker"]],
    ]);
  });

  test(`accessibility: ${locale} categories fit 360px in both themes with keyboard controls`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const profile = technologiesProfile(locale);
    const title = "My deliberately long category title for a small collection of useful tools";
    profile.data.technologies.groups = [
      {
        id: "mobile-group",
        name: title,
        items: [
          { id: "react", name: "React", context: "A saved note that remains optional" },
          { id: "hono", name: "Hono", context: "" },
        ],
      },
    ];
    await openEditor(page, profile, locale);
    const group = await editCategory(page, title, locale);
    await expand(page.getByText(copy[locale].guide, { exact: true }));
    await expect(page.getByRole("region", { name: copy[locale].guide, exact: true })).toBeVisible();
    const search = page.getByRole("combobox", { name: copy[locale].search, exact: true });
    await search.fill("drizzle");
    await expect(page.getByRole("option", { name: "Drizzle ORM", exact: true })).toBeVisible();
    await search.press("Escape");
    await expect(search).toHaveAttribute("aria-expanded", "false");
    const destination = group.getByRole("combobox", {
      name: locale === "en" ? "Category for Hono" : "Categoría de Hono",
      exact: true,
    });
    await destination.focus();
    await expect(destination).toBeFocused();
    const theme = page.getByRole("button", { name: copy[locale].theme, exact: true });
    for (const dark of [false, true]) {
      if ((await theme.getAttribute("aria-pressed")) !== String(dark)) await theme.click();
      await expect(theme).toHaveAttribute("aria-pressed", String(dark));
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      ).toBe(false);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(result.violations).toEqual([]);
      await page.screenshot({
        path: `work/previews/technology-categories-${locale}-mobile-${dark ? "dark" : "light"}.png`,
        fullPage: true,
      });
    }
    expect(await readStored(page)).toEqual(profile);
  });
}
