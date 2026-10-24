import { showCustomBlockPicker } from "./editor-test-helpers";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import { mobileTest } from "./mobile-test";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";

type Locale = "en" | "es";
const draftKey = "github-profile-generator.profile.v2";
const unbrokenTitle = "PersonalExperimentsAndThingsIEnjoyBuilding".repeat(3);
const widths = [320, 360, 768, 1024, 1280, 1440, 1657, 1920];
const copy = {
  en: {
    navigation: "Your sections",
    sections: "Sections",
    add: "Add custom section",
    edit: "Edit",
    preview: "Preview",
    document: "README preview",
    title: "Section name",
    text: "Text",
    editing: "Editing now",
    included: "Included in README",
    custom: "A little more about my experiments and the things I enjoy sharing",
    modules: [
      "About you",
      "Technologies & tools",
      "Projects",
      "Activity & contributions",
      "Contact",
    ],
  },
  es: {
    navigation: "Tus secciones",
    sections: "Secciones",
    add: "Agregar sección personalizada",
    edit: "Editar",
    preview: "Vista previa",
    document: "Vista previa del README",
    title: "Nombre de la sección",
    text: "Texto",
    editing: "Configurando ahora",
    included: "Incluida en el README",
    custom: "Un poco más sobre mis experimentos y las cosas que disfruto compartir",
    modules: [
      "Presentación",
      "Tecnologías y herramientas",
      "Proyectos",
      "Actividad y contribuciones",
      "Contacto",
    ],
  },
} as const;

function responsiveProfile(locale: Locale, invalidLink = false): ProfileDocument {
  const profile = createEmptyProfile(locale);
  for (const id of [
    "presentation",
    "technologies",
    "projects",
    "contributions",
    "contact",
  ] as const)
    profile.visibility[id] = true;
  profile.data.presentation = {
    displayName: "Alex Rivera",
    headline: "Small experiments and useful tools",
    bio: "Learning by making and sharing.",
    location: "Argentina",
  };
  profile.data.technologies.groups = [
    { id: "tools", name: "Tools I enjoy", items: [{ id: "react", name: "React", context: "" }] },
  ];
  profile.data.projects.items = [
    {
      id: "project",
      name: "A useful notebook",
      description: "Practice ideas",
      role: "",
      technologies: [],
      links: [],
    },
  ];
  profile.data.contributions.items = [
    {
      id: "contribution",
      title: "Clear documentation",
      description: "Shared setup instructions",
      url: "",
    },
  ];
  profile.data.contact.links = [{ id: "website", label: "My garden", url: "https://example.com" }];
  profile.customSections = [
    {
      id: "experiments",
      title: copy[locale].custom,
      visible: true,
      blocks: [
        { id: "note", type: "paragraph", text: "A preserved personal note." },
        ...(invalidLink
          ? [{ id: "link", type: "link" as const, label: "My notes", url: "javascript:alert(1)" }]
          : []),
      ],
    },
    {
      id: "unbroken",
      title: unbrokenTitle,
      visible: true,
      blocks: [{ id: "second-note", type: "paragraph", text: "Another independent section." }],
    },
  ];
  profile.sectionOrder.push(
    { kind: "custom", sectionId: "experiments" },
    { kind: "custom", sectionId: "unbroken" },
  );
  if (invalidLink) {
    profile.sectionOrder = [
      { kind: "custom", sectionId: "experiments" },
      ...profile.sectionOrder.filter(
        (ref) => ref.kind !== "custom" || ref.sectionId !== "experiments",
      ),
    ];
  }
  return profile;
}

async function openEditor(page: Page, locale: Locale, profile = responsiveProfile(locale)) {
  await page.goto(`/${locale}`);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(profile),
  });
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("checkbox", { name: copy[locale].modules[0], exact: true, includeHidden: true }),
  ).toBeEnabled();
}

async function openNavigation(page: Page, locale: Locale) {
  const navigation = page.getByRole("navigation", {
    name: copy[locale].navigation,
    exact: true,
    includeHidden: true,
  });
  await expect(navigation).toBeVisible();
  return navigation;
}

async function expectNoHorizontalOverflow(page: Page) {
  const measurement = await page.evaluate(() => ({
    overflow:
      Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - innerWidth,
    elements: [...document.querySelectorAll("body *")]
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width &&
          (rect.right + scrollX > innerWidth + 1 || element.scrollWidth > element.clientWidth + 1)
          ? [
              {
                tag: element.tagName,
                text: element.textContent?.slice(0, 60),
                right: rect.right + scrollX,
                width: element.clientWidth,
                scrollWidth: element.scrollWidth,
              },
            ]
          : [];
      })
      .slice(0, 12),
  }));
  expect(measurement.overflow, JSON.stringify(measurement.elements)).toBeLessThanOrEqual(1);
}

async function expectNavigationLayout(page: Page, locale: Locale) {
  const navigation = await openNavigation(page, locale);
  await expect(navigation.getByRole("checkbox")).toHaveCount(7);
  for (const label of [...copy[locale].modules, copy[locale].custom, unbrokenTitle]) {
    const select = navigation.getByRole("button", { name: label, exact: true });
    await expect(select).toHaveAccessibleName(label);
    await expect(select).toHaveAccessibleDescription(
      new RegExp(`${copy[locale].editing}|${copy[locale].included}`),
    );
  }
  const row = navigation.locator("ul[data-section-row]");
  const geometry = await row.locator(":scope > li").evaluateAll((items) => {
    const tops = items.map((item) => item.getBoundingClientRect().top);
    return {
      rowCount: new Set(tops.map((top) => Math.round(top))).size,
      overflow: items.some((item) => item.scrollWidth > item.clientWidth + 1),
    };
  });
  expect(geometry).toEqual({ rowCount: 1, overflow: false });
  const smallTargets = await navigation
    .getByRole("button")
    .or(navigation.getByRole("checkbox"))
    .evaluateAll((elements) =>
      elements.flatMap((element) => {
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return [];
        return rect.width >= 43.5 && rect.height >= 43.5
          ? []
          : [
              {
                name: element.getAttribute("aria-label") ?? element.textContent,
                width: rect.width,
                height: rect.height,
              },
            ];
      }),
    );
  expect(smallTargets).toEqual([]);
  await expectNoHorizontalOverflow(page);
}

async function showPreview(page: Page, locale: Locale) {
  const toggle = page.getByRole("button", { name: copy[locale].preview, exact: true });
  if (await toggle.isVisible()) await toggle.click();
  const preview = page.getByRole("article", { name: copy[locale].document, exact: true });
  await expect(preview).toBeVisible();
  await expectNoHorizontalOverflow(page);
  return preview;
}

async function openCustomConfiguration(page: Page, locale: Locale) {
  const navigation = await openNavigation(page, locale);
  await navigation.getByRole("button", { name: copy[locale].custom, exact: true }).click();
  await expect(page.getByRole("textbox", { name: copy[locale].title, exact: true })).toHaveValue(
    copy[locale].custom,
  );
  await showCustomBlockPicker(page);
  const addText = page.getByRole("button", {
    name: locale === "en" ? "Add text" : "Agregar texto",
    exact: true,
  });
  await expect(addText).toBeVisible();
  const picker = addText.locator("..");
  await expect(picker.getByRole("button")).toHaveCount(10);
  expect(
    await picker
      .getByRole("button")
      .evaluateAll((elements) =>
        elements.every((element) => element.scrollWidth <= element.clientWidth + 1),
      ),
  ).toBe(true);
  await expectNoHorizontalOverflow(page);
}

async function storedProfile(page: Page): Promise<ProfileDocument> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), draftKey);
}

for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    for (const width of widths) {
      const viewportTest = width <= 390 ? mobileTest : test;
      viewportTest(
        `responsive editor: seven sections at ${width}px ${locale} ${theme}`,
        async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: theme });
          await openEditor(page, locale);
          await expectNavigationLayout(page, locale);
          await openCustomConfiguration(page, locale);
          if (width === 320 || width === 1657) {
            await page.locator("#editor-section-title").scrollIntoViewIfNeeded();
            await page.screenshot({
              path: `work/previews/editor-responsive-${locale}-${theme}-${width}-configuration.png`,
            });
          }
          await expect(await showPreview(page, locale)).toContainText(unbrokenTitle);
          if (width === 320 || width === 1657) {
            await page.evaluate(() => scrollTo(0, 0));
            await page.screenshot({
              path: `work/previews/editor-responsive-${locale}-${theme}-${width}.png`,
              fullPage: true,
            });
          }
        },
      );
    }

    for (const width of [320, 1657]) {
      const viewportTest = width === 320 ? mobileTest : test;
      viewportTest(
        `accessibility: responsive editor with a real URL error at ${width}px ${locale} ${theme}`,
        async ({ page }) => {
          await page.setViewportSize({ width, height: 900 });
          await page.emulateMedia({ colorScheme: theme });
          await openEditor(page, locale, responsiveProfile(locale, true));
          const navigation = await openNavigation(page, locale);
          await expectNavigationLayout(page, locale);
          const url = page.getByRole("textbox", { name: "URL", exact: true });
          await expect(url).toHaveAttribute("aria-invalid", "true");
          await expect(
            navigation.getByRole("button", {
              name: `${locale === "en" ? "Review fields in" : "Revisar campos en"} ${copy[locale].custom}`,
              exact: true,
            }),
          ).toHaveCount(1);
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
          await url.fill("https://example.com/notes");
          await expect(url).not.toHaveAttribute("aria-invalid", "true");
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
          await expect(await showPreview(page, locale)).toContainText("A preserved personal note.");
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        },
      );
    }
  }

  for (const width of [320, 1280]) {
    const responsiveTest = width === 320 ? mobileTest : test;
    responsiveTest(
      `responsive editor: 200 percent text at ${width}px ${locale}`,
      async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.emulateMedia({ colorScheme: width === 320 ? "light" : "dark" });
        await openEditor(page, locale);
        // Ampliación de texto y medidas rem; no se presenta como zoom nativo del navegador.
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "32px";
        });
        await expect(page.locator("html")).toHaveCSS("font-size", "32px");
        await expectNavigationLayout(page, locale);
        await openCustomConfiguration(page, locale);
        await page.locator("#editor-section-title").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `work/previews/editor-text-200-${locale}-${width}-configuration.png`,
        });
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        await expect(await showPreview(page, locale)).toContainText(unbrokenTitle);
        await page
          .getByRole("article", { name: copy[locale].document, exact: true })
          .scrollIntoViewIfNeeded();
        await page.screenshot({
          path: `work/previews/editor-text-200-${locale}-${width}-preview.png`,
        });
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      },
    );

    const viewportTest = width === 320 ? mobileTest : test;
    viewportTest(
      `responsive editor: every fixed form with enlarged text at ${width}px ${locale}`,
      async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await openEditor(page, locale);
        await page.evaluate(() => {
          document.documentElement.style.fontSize = "32px";
        });
        for (const label of copy[locale].modules) {
          const navigation = await openNavigation(page, locale);
          await navigation.getByRole("button", { name: label, exact: true }).click();
          await expect(page.locator("#editor-section-title")).toHaveText(label);
          await expectNoHorizontalOverflow(page);
          const form = page.getByRole("region", { name: label, exact: true });
          expect(
            await form.getByRole("button").evaluateAll((elements) =>
              elements.flatMap((element) => {
                const rect = element.getBoundingClientRect();
                return rect.width && element.scrollWidth > element.clientWidth + 1
                  ? [element.getAttribute("aria-label") ?? element.textContent]
                  : [];
              }),
            ),
            label,
          ).toEqual([]);
        }
      },
    );
  }

  mobileTest(
    `responsive editor: selection, inclusion and mobile preview preserve writing ${locale}`,
    async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 850 });
      await page.emulateMedia({ colorScheme: "dark" });
      const profile = responsiveProfile(locale);
      await openEditor(page, locale, profile);
      let navigation = await openNavigation(page, locale);
      await navigation.getByRole("button", { name: copy[locale].custom, exact: true }).click();
      await expect(
        navigation.getByRole("button", { name: copy[locale].custom, exact: true }),
      ).toBeFocused();
      await expect(
        page.getByRole("textbox", { name: copy[locale].title, exact: true }),
      ).toHaveValue(copy[locale].custom);
      const text = page.getByRole("textbox", { name: copy[locale].text, exact: true });
      await text.fill("This edited note must survive hiding and view changes.");
      navigation = await openNavigation(page, locale);
      const inclusion = navigation.getByRole("checkbox", {
        name: copy[locale].custom,
        exact: true,
      });
      await inclusion.uncheck();
      await expect(inclusion).toBeFocused();
      await expect(inclusion).toBeEnabled();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      await expect(
        navigation.getByRole("button", {
          name: `${locale === "en" ? "Add and edit" : "Agregar y editar"} ${copy[locale].custom}`,
          exact: true,
        }),
      ).toHaveAccessibleDescription(copy[locale].editing);
      await expect(await showPreview(page, locale)).not.toContainText(
        "This edited note must survive hiding and view changes.",
      );
      await page.getByRole("button", { name: copy[locale].edit, exact: true }).click();
      await expect(text).toHaveValue("This edited note must survive hiding and view changes.");
      navigation = await openNavigation(page, locale);
      await navigation.getByRole("checkbox", { name: copy[locale].custom, exact: true }).check();
      await expect(await showPreview(page, locale)).toContainText(
        "This edited note must survive hiding and view changes.",
      );
      profile.customSections[0]!.blocks[0] = {
        id: "note",
        type: "paragraph",
        text: "This edited note must survive hiding and view changes.",
      };
      await expect.poll(() => storedProfile(page)).toEqual(profile);
      await expectNoHorizontalOverflow(page);
    },
  );

  mobileTest(
    `accessibility: keyboard reaches the persistent add action after horizontal navigation ${locale}`,
    async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 720 });
      await openEditor(page, locale);
      const navigation = await openNavigation(page, locale);
      await navigation.getByRole("checkbox").first().focus();
      const add = page.getByRole("button", { name: copy[locale].add, exact: true });
      let reached = false;
      for (let count = 0; count < 55; count++) {
        await page.keyboard.press("Tab");
        reached = await add.evaluate((element) => element === document.activeElement);
        if (reached) break;
      }
      expect(reached).toBe(true);
      await expectFocusedInsideViewport(add);
      await expectNoHorizontalOverflow(page);
      await add.press("Enter");
      await expect(
        page.getByRole("textbox", { name: copy[locale].title, exact: true }),
      ).toBeFocused();
      await expect.poll(async () => (await storedProfile(page)).customSections.length).toBe(3);
    },
  );
}

async function expectFocusedInsideViewport(control: Locator) {
  await expect(control).toBeFocused();
  await expect(control).toBeInViewport({ ratio: 1 });
}
