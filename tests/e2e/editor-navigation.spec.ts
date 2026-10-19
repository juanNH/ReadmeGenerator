import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";

const draftKey = "github-profile-generator.profile.v1";

function navigationProfile() {
  const profile = createEmptyProfile("en");
  profile.visibility.technologies = true;
  profile.visibility.projects = true;
  profile.visibility.contributions = true;
  profile.visibility.knowledge = true;
  profile.visibility.education = true;
  profile.visibility.current = true;
  profile.data.knowledge.items = [
    { id: "retired-knowledge", title: "Old knowledge", description: "Saved only" },
  ];
  profile.data.education.items = [
    {
      id: "retired-study",
      title: "Old certification",
      institution: "Example Academy",
      kind: "certification",
      status: null,
      startDate: "",
      endDate: "",
      description: "Saved only",
      url: "invalid-retired-link",
    },
  ];
  profile.data.current.items = [
    {
      id: "retired-activity",
      kind: "learning",
      description: "Old activity",
      url: "invalid-retired-link",
    },
  ];
  profile.data.technologies.groups = [
    {
      id: "technology-group",
      name: "",
      items: [{ id: "technology-react", name: "React", context: "" }],
    },
  ];
  profile.data.projects.items = [
    {
      id: "project-example",
      name: "A useful notebook",
      description: "Practice exercises",
      role: "Author",
      technologies: [],
      links: [],
    },
  ];
  profile.data.contributions.items = [
    {
      id: "contribution-example",
      title: "Useful documentation",
      description: "Clear setup instructions",
      url: "",
    },
  ];
  return profile;
}
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

async function storedProfile(page: Page): Promise<ProfileDocument> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null") as ProfileDocument,
    draftKey,
  );
}

async function expectStoredOrder(page: Page, order: ProfileDocument["moduleOrder"]) {
  await expect.poll(async () => (await storedProfile(page)).moduleOrder).toEqual(order);
}

async function moveMouseDrag(page: Page, source: Locator, target: Locator) {
  // Medir ambos tiradores después del scroll; un destino fuera del viewport
  // dispara autoscroll y convierte la caída en una cancelación real.
  await target.scrollIntoViewIfNeeded();
  await source.scrollIntoViewIfNeeded();
  await expect(source).toBeInViewport({ ratio: 1 });
  await expect(target).toBeInViewport({ ratio: 1 });
  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Both reorder handles must be visible.");
  const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
  const end = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await expect(source).toHaveAttribute("aria-pressed", "true");
  await page.mouse.move(start.x + 10, start.y + 10, { steps: 3 });
  await page.mouse.move(end.x, end.y, { steps: 20 });
  // El destino se desplaza cuando la lista refleja el nuevo orden provisional.
  await expect
    .poll(async () => {
      const box = await target.boundingBox();
      return box ? Math.sign(box.y - targetBox.y) : 0;
    })
    .toBe(start.y < end.y ? -1 : 1);
}

async function mouseDrag(page: Page, source: Locator, target: Locator) {
  await moveMouseDrag(page, source, target);
  await page.mouse.up();
}

async function expectNavigationOrder(
  page: Page,
  order = ["technologies", "projects", "contributions"],
) {
  const navigation = page.getByRole("navigation", { name: "Your sections", exact: true });
  await expect
    .poll(() =>
      navigation
        .locator("li[data-module-id]:not([data-dnd-placeholder])")
        .evaluateAll((items) =>
          items.slice(0, 3).map((item) => item.getAttribute("data-module-id")),
        ),
    )
    .toEqual(order);
}

test("one configuration panel identifies the active section and keeps settings beside its fields", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const profile = createEmptyProfile("en");

  await openEditor(page, profile);
  const navigation = page.getByRole("navigation", { name: "Your sections", exact: true });
  await navigation.getByRole("button", { name: "Add and edit About you", exact: true }).click();
  const heading = page.locator("#editor-section-title");
  await expect(heading).toHaveText("About you");
  await expect(heading).toBeFocused();
  await expect(navigation.getByRole("checkbox", { name: "About you", exact: true })).toBeChecked();
  await expect(navigation.getByRole("button", { name: "About you", exact: true })).toHaveAttribute(
    "aria-current",
    "step",
  );
  await expect(navigation.getByText("Editing now", { exact: true })).toBeVisible();
  const displayName = page.getByRole("textbox", { name: "Display name", exact: true });
  await displayName.fill("Alex Example");
  await navigation.getByRole("button", { name: "Add and edit Projects", exact: true }).click();
  await expect(heading).toHaveText("Projects");
  await expect(heading).toBeFocused();
  await expect(displayName).toHaveCount(0);
  await page.getByRole("button", { name: "Add project", exact: true }).click();
  await page.getByRole("textbox", { name: "Project name", exact: true }).fill("Clear forms");
  await expect(navigation.locator('[aria-current="step"]')).toHaveCount(1);
  await navigation.getByRole("button", { name: "About you", exact: true }).click();
  await expect(heading).toBeFocused();
  await expect(displayName).toHaveValue("Alex Example");
  await expect(page.getByRole("textbox", { name: "Project name", exact: true })).toHaveCount(0);
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview).toContainText("Alex Example");
  await expect(preview).toContainText("Clear forms");
  const inclusion = navigation.getByRole("checkbox", { name: "About you", exact: true });
  await inclusion.uncheck();
  await expect(inclusion).toBeFocused();
  await expect(heading).toHaveText("About you");
  await expect(displayName).toHaveValue("Alex Example");
  await expect(page.getByText("Not included in README", { exact: true })).toBeVisible();
  await expect(preview).not.toContainText("Alex Example");
  await displayName.fill("Alex Updated");
  await expect(preview).not.toContainText("Alex Updated");
  await navigation.getByRole("button", { name: "Add and edit About you", exact: true }).click();
  await expect(heading).toBeFocused();
  await expect(displayName).toHaveValue("Alex Updated");
  await expect(preview).toContainText("Alex Updated");
  const navigationBox = await navigation.boundingBox();
  const fieldBox = await displayName.boundingBox();
  const languageBox = await page
    .getByRole("combobox", { name: "README language", exact: true })
    .boundingBox();
  const previewBox = await preview.boundingBox();
  if (!navigationBox || !fieldBox || !languageBox || !previewBox)
    throw new Error("All three desktop columns must be visible.");
  expect(navigationBox.x + navigationBox.width).toBeLessThanOrEqual(fieldBox.x);
  expect(fieldBox.x + fieldBox.width).toBeLessThanOrEqual(previewBox.x);
  expect(languageBox.x).toBeGreaterThanOrEqual(navigationBox.x + navigationBox.width);
  expect(languageBox.x + languageBox.width).toBeLessThanOrEqual(previewBox.x);
  await expect(page.getByText("Saved on this browser", { exact: true })).toBeVisible();
  await page.screenshot({ path: "work/previews/navigation-desktop.png", fullPage: true });
});

test("pointer dragging reorders visible sections while preserving hidden slots, values and the active editor", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const profile = navigationProfile();
  await openEditor(page, profile);
  const navigation = page.getByRole("navigation", { name: "Your sections", exact: true });
  await mouseDrag(
    page,
    navigation.getByRole("button", { name: "Drag Technologies & tools to reorder", exact: true }),
    navigation.getByRole("button", {
      name: "Drag Activity & contributions to reorder",
      exact: true,
    }),
  );
  const order = [...profile.moduleOrder];
  [order[2], order[5], order[6]] = ["projects", "contributions", "technologies"];
  await expectStoredOrder(page, order);
  const stored = await storedProfile(page);
  expect(stored.data).toEqual(profile.data);
  expect(stored.visibility).toEqual(profile.visibility);
  expect(stored.moduleOrder).toHaveLength(9);
  expect(new Set(stored.moduleOrder).size).toBe(9);
  await expect(page.locator("#editor-section-title")).toHaveText("Technologies & tools");
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.getByRole("heading").first()).toHaveText("Projects");
  await page.reload();
  await expectStoredOrder(page, order);
  await expect(preview.getByRole("heading").first()).toHaveText("Projects");
});

test("touch dragging uses the browser pointer pipeline and saves the new visible section order", async ({
  browser,
  browserName,
  baseURL,
}) => {
  test.skip(browserName !== "chromium", "Touch movement uses the Chromium DevTools Protocol.");
  // CDP envía entradas táctiles al navegador; no llama callbacks de React ni del drag.
  // La emulación cubre Pointer Events y la espera al presionar. No reproduce
  // latencia física, gestos del sistema, Safari móvil ni tecnologías de asistencia táctil.
  const context = await browser.newContext({
    baseURL,
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 1200 },
    reducedMotion: "reduce",
  });
  try {
    const page = await context.newPage();
    const profile = navigationProfile();
    await openEditor(page, profile);
    expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
    await page.getByRole("button", { name: "Sections", exact: true }).tap();
    const source = page.getByRole("button", {
      name: "Drag Technologies & tools to reorder",
      exact: true,
    });
    const target = page.getByRole("button", {
      name: "Drag Activity & contributions to reorder",
      exact: true,
    });
    await target.scrollIntoViewIfNeeded();
    await source.scrollIntoViewIfNeeded();
    const sourceBox = await source.boundingBox();
    const targetBox = await target.boundingBox();
    if (!sourceBox || !targetBox) throw new Error("Both touch drag handles must be visible.");
    const start = { x: sourceBox.x + sourceBox.width / 2, y: sourceBox.y + sourceBox.height / 2 };
    const end = { x: targetBox.x + targetBox.width / 2, y: targetBox.y + targetBox.height / 2 };
    const session = await context.newCDPSession(page);
    await session.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...start, id: 1 }],
    });
    // Esperar la activación real del sensor táctil, cuya demora inicial es de 250 ms.
    await expect(source).toHaveAttribute("aria-pressed", "true");
    for (let step = 1; step <= 20; step++) {
      await session.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [
          {
            x: start.x + ((end.x - start.x) * step) / 20,
            y: start.y + ((end.y - start.y) * step) / 20,
            id: 1,
          },
        ],
      });
    }
    await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const order = [...profile.moduleOrder];
    [order[2], order[5], order[6]] = ["projects", "contributions", "technologies"];
    await expectStoredOrder(page, order);
    expect((await storedProfile(page)).data).toEqual(profile.data);
    await page.reload();
    await expectStoredOrder(page, order);
  } finally {
    await context.close();
  }
});

test("dropping outside all section targets keeps the original order and saved profile", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const profile = navigationProfile();
  await openEditor(page, profile);
  const source = page.getByRole("button", {
    name: "Drag Technologies & tools to reorder",
    exact: true,
  });
  const target = page.getByRole("button", {
    name: "Drag Activity & contributions to reorder",
    exact: true,
  });
  const viewport = page.viewportSize();
  if (!viewport) throw new Error("The drag viewport must be available.");
  await moveMouseDrag(page, source, target);
  await expect(source).toHaveAttribute("aria-pressed", "true");
  await expectNavigationOrder(page, ["projects", "contributions", "technologies"]);
  // La cabecera queda fuera de los destinos que permiten ordenar secciones.
  await page.mouse.move(viewport.width - 12, 12, { steps: 20 });
  await page.mouse.up();
  await expect(source).toHaveAttribute("aria-pressed", "false");
  await expectNavigationOrder(page);
  expect(await storedProfile(page)).toEqual(profile);
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.getByRole("heading").first()).toHaveText("Technologies");
  await page.reload();
  await expectStoredOrder(page, profile.moduleOrder);
});

test("keyboard dragging moves a section with Space and arrows and preserves the saved order after reload", async ({
  page,
}) => {
  const profile = navigationProfile();
  await openEditor(page, profile);
  const handle = page.getByRole("button", {
    name: "Drag Technologies & tools to reorder",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(
    page
      .getByRole("status")
      .filter({ hasText: "Picked up Technologies & tools, position 1 of 3." }),
  ).toBeVisible();
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Space");
  const order = [...profile.moduleOrder];
  [order[2], order[5]] = ["projects", "technologies"];
  await expectStoredOrder(page, order);
  await expect(handle).toBeFocused();
  await expect(page.locator("#editor-section-title")).toHaveText("Technologies & tools");
  await page.reload();
  await expectStoredOrder(page, order);
});

test("Escape cancels an in-progress keyboard drag without changing the saved profile", async ({
  page,
}) => {
  const profile = navigationProfile();
  await openEditor(page, profile);
  const handle = page.getByRole("button", {
    name: "Drag Technologies & tools to reorder",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowDown");
  await page.keyboard.press("Escape");
  await expect(handle).toBeFocused();
  await expectNavigationOrder(page);
  expect(await storedProfile(page)).toEqual(profile);
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.getByRole("heading").first()).toHaveText("Technologies");
  await page.reload();
  await expectStoredOrder(page, profile.moduleOrder);
});

test("editing and selecting text never starts a drag or changes the module order", async ({
  page,
}) => {
  const profile = navigationProfile();
  await openEditor(page, profile);
  await page.getByRole("button", { name: "Projects", exact: true }).click();
  const name = page.getByRole("textbox", { name: "Project name", exact: true });
  await name.fill("Selecting words stays inside this input");
  const box = await name.boundingBox();
  if (!box) throw new Error("The active project field must be visible.");
  await page.mouse.move(box.x + 16, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 16, box.y + box.height / 2, { steps: 15 });
  await page.mouse.up();
  await expect(name).toBeFocused();
  await expect(name).toHaveValue("Selecting words stays inside this input");
  await expect(page.getByText("Saved on this browser", { exact: true })).toBeVisible();
  expect((await storedProfile(page)).moduleOrder).toEqual(profile.moduleOrder);
  await expect(page.locator("#editor-section-title")).toHaveText("Projects");
});
for (const locale of ["en", "es"] as const) {
  test(`accessibility: ${locale} mobile navigation keeps one selected form and switches to its preview`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    const profile = navigationProfile();
    await openEditor(page, profile, locale);
    const labels =
      locale === "en"
        ? {
            sections: "Sections",
            technologies: "Technologies & tools",
            projects: "Projects",
            search: "Add technologies",
            name: "Project name",
            edit: "Edit",
            preview: "Preview",
            document: "README preview",
            navigation: "Your sections",
          }
        : {
            sections: "Secciones",
            technologies: "Tecnologías y herramientas",
            projects: "Proyectos",
            search: "Agregar tecnologías",
            name: "Nombre del proyecto",
            edit: "Editar",
            preview: "Vista previa",
            document: "Vista previa del README",
            navigation: "Tus secciones",
          };
    const sections = page.getByRole("button", { name: labels.sections, exact: true });
    const navigation = page.getByRole("navigation", { name: labels.navigation, exact: true });
    await expect(sections).toHaveAttribute("aria-expanded", "false");
    await expect(navigation).toBeHidden();
    const search = page.getByRole("combobox", { name: labels.search, exact: true });
    await expect(search).toBeVisible();
    await expect(page.getByRole("textbox", { name: labels.name, exact: true })).toHaveCount(0);
    await sections.click();
    await expect(navigation).toBeVisible();
    await expect(navigation.getByRole("checkbox")).toHaveCount(5);
    await expect(
      navigation.getByRole("button", { name: labels.technologies, exact: true }),
    ).toHaveAttribute("aria-current", "step");
    await navigation.getByRole("button", { name: labels.projects, exact: true }).click();
    await expect(sections).toHaveAttribute("aria-expanded", "false");
    await expect(navigation).toBeHidden();
    await expect(page.locator("#editor-section-title")).toHaveText(labels.projects);
    await expect(page.locator("#editor-section-title")).toBeFocused();
    await expect(search).toHaveCount(0);
    const name = page.getByRole("textbox", { name: labels.name, exact: true });
    await name.fill("A notebook for community ideas");
    const edit = page.getByRole("button", { name: labels.edit, exact: true });
    const preview = page.getByRole("button", { name: labels.preview, exact: true });
    await expect(edit).toHaveAttribute("aria-pressed", "true");
    await preview.click();
    await expect(preview).toHaveAttribute("aria-pressed", "true");
    await expect(edit).toHaveAttribute("aria-pressed", "false");
    await expect(name).toHaveCount(0);
    const previewDocument = page.getByRole("article", { name: labels.document, exact: true });
    await expect(previewDocument).toBeVisible();
    await expect(previewDocument).toContainText("A notebook for community ideas");
    const reactIcon = previewDocument.locator('img[src="/technology-icons/react.svg"]');
    await expect(reactIcon).toBeVisible();
    await expect(reactIcon).toHaveAttribute("alt", "");
    await expect(previewDocument).toContainText("React");
    const previewResult = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(previewResult.violations).toEqual([]);
    await edit.click();
    await expect(name).toHaveValue("A notebook for community ideas");
    await expect(previewDocument).toHaveCount(0);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
    if (locale === "es")
      await page.screenshot({ path: "work/previews/navigation-mobile.png", fullPage: true });
  });
}
