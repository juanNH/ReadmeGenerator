import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";

const draftKey = "github-profile-generator.profile.v2";
const copy = {
  en: {
    navigation: "Your sections",
    title: "Section title",
    text: "Text",
    add: "Add custom section",
    edit: "Edit",
    preview: "Preview",
    document: "README preview",
    custom: "Custom section 1",
    addBlock: "Add block",
    addText: "Add text",
  },
  es: {
    navigation: "Tus secciones",
    title: "Título de la sección",
    text: "Texto",
    add: "Agregar sección personalizada",
    edit: "Editar",
    preview: "Vista previa",
    document: "Vista previa del README",
    custom: "Sección personalizada 1",
    addBlock: "Agregar bloque",
    addText: "Agregar texto",
  },
} as const;
type Locale = keyof typeof copy;

function exampleProfile(locale: Locale, count = 1): ProfileDocument {
  const profile = createEmptyProfile(locale);
  profile.customSections = Array.from({ length: count }, (_, index) => ({
    id: `notes-${index}`,
    title: `Notes ${index + 1} with a deliberately long personal title`,
    visible: true,
    blocks: [{ id: `text-${index}`, type: "paragraph", text: `Saved note ${index + 1}.` }],
  }));
  profile.sectionOrder.push(
    ...profile.customSections.map(({ id }) => ({ kind: "custom" as const, sectionId: id })),
  );
  return profile;
}

function navigation(page: Page, locale: Locale) {
  return page.getByRole("navigation", { name: copy[locale].navigation, exact: true });
}

async function openEditor(page: Page, locale: Locale, profile?: ProfileDocument) {
  await page.goto(`/${locale}`);
  if (profile)
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: draftKey,
      value: JSON.stringify(profile),
    });
  await page.goto(`/${locale}/editor`);
  await expect(navigation(page, locale)).toBeVisible();
  await expect(navigation(page, locale).getByRole("checkbox").first()).toBeEnabled();
  await expect(
    page.getByRole("combobox", { name: /^(Editing section|Sección en edición)$/, exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: /^(Sections|Secciones|Done organizing|Listo)$/, exact: true }),
  ).toHaveCount(0);
}

async function expectWithinInitialViewport(control: Locator, page: Page) {
  // Measure before any interaction or manual scrolling.
  const bounds = await control.boundingBox();
  const viewport = page.viewportSize();
  if (!bounds || !viewport) throw new Error("The first field must be rendered.");
  expect(bounds.y).toBeGreaterThanOrEqual(0);
  expect(bounds.y + bounds.height).toBeLessThanOrEqual(viewport.height);
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(viewport.width);
}

async function expectSingleRow(page: Page, locale: Locale, overflowing: boolean) {
  const row = navigation(page, locale).locator("ul[data-section-row]");
  const measurement = await row.evaluate((element) => {
    const rectangles = [...element.querySelectorAll(":scope > li")].map((item) =>
      item.getBoundingClientRect(),
    );
    const top = Math.min(...rectangles.map((rect) => rect.top));
    const bottom = Math.max(...rectangles.map((rect) => rect.top));
    return {
      rowSpread: bottom - top,
      width: element.clientWidth,
      total: element.scrollWidth,
      overflowX: getComputedStyle(element).overflowX,
    };
  });
  expect(measurement.rowSpread).toBeLessThanOrEqual(1);
  if (overflowing) expect(measurement.total).toBeGreaterThan(measurement.width);
  expect(["auto", "scroll"]).toContain(measurement.overflowX);
  const pageBounds = await page.evaluate(() => ({
    width: innerWidth,
    total: document.documentElement.scrollWidth,
    outside: [...document.querySelectorAll("body *")]
      .flatMap((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width > 0 && rect.right > innerWidth + 1
          ? [
              {
                tag: element.tagName,
                className: String(element.className).slice(0, 160),
                right: rect.right,
              },
            ]
          : [];
      })
      .slice(0, 12),
  }));
  expect(pageBounds.total, JSON.stringify(pageBounds)).toBeLessThanOrEqual(pageBounds.width);
  return row;
}

for (const locale of ["en", "es"] as const) {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 390, height: 844 },
  ]) {
    test(`horizontal navigation: first custom field is immediately usable at ${viewport.width}x${viewport.height} ${locale}`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await openEditor(page, locale, exampleProfile(locale));
      await page.screenshot({
        path: `work/previews/horizontal-initial-${locale}-${viewport.width}.png`,
      });
      const title = page.getByRole("textbox", { name: copy[locale].title, exact: true });
      await expect(title).toHaveValue("Notes 1 with a deliberately long personal title");
      await expectWithinInitialViewport(title, page);
      await expectSingleRow(page, locale, true);
      await expect(page.locator("#editor-section-title")).toHaveText(copy[locale].custom);
      await expect(
        page.getByRole("button", { name: copy[locale].addBlock, exact: true }),
      ).toHaveAttribute("aria-expanded", "false");
      await expect(page.getByRole("button", { name: copy[locale].add, exact: true })).toHaveCount(
        1,
      );
      await title.fill("My own small corner");
      await page.getByRole("button", { name: copy[locale].preview, exact: true }).click();
      const preview = page.getByRole("article", { name: copy[locale].document, exact: true });
      await expect(preview).toContainText("My own small corner");
      await expect(preview).toContainText("Saved note 1.");
      await expect(navigation(page, locale)).toBeInViewport();
      await page.getByRole("button", { name: copy[locale].edit, exact: true }).click();
      await expect(title).toHaveValue("My own small corner");
      await page.screenshot({
        path: `work/previews/horizontal-navigation-${locale}-${viewport.width}.png`,
      });
    });
  }

  test(`accessibility: twenty sections stay in one scrollable row and the active section has one pair of reorder controls ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await page.emulateMedia({ colorScheme: locale === "en" ? "light" : "dark" });
    const profile = exampleProfile(locale, 20);
    await openEditor(page, locale, profile);
    const nav = navigation(page, locale);
    await expect(nav.getByRole("checkbox")).toHaveCount(25);
    const row = await expectSingleRow(page, locale, true);
    const label = profile.customSections[19]!.title;
    const last = nav.getByRole("button", { name: label, exact: true });
    await last.click();
    await expect(last).toBeFocused();
    await expect(last).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("textbox", { name: copy[locale].title, exact: true })).toHaveValue(
      label,
    );
    expect(await row.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
    const leftName = locale === "en" ? `Move ${label} left` : `Mover ${label} a la izquierda`;
    const rightName = locale === "en" ? `Move ${label} right` : `Mover ${label} a la derecha`;
    const left = page.getByRole("button", { name: leftName, exact: true });
    const right = page.getByRole("button", { name: rightName, exact: true });
    await expect(right).toBeDisabled();
    await left.click();
    await expect(left).toBeFocused();
    const expectedOrder = [...profile.sectionOrder];
    const lastIndex = expectedOrder.length - 1;
    [expectedOrder[lastIndex - 1], expectedOrder[lastIndex]] = [
      expectedOrder[lastIndex]!,
      expectedOrder[lastIndex - 1]!,
    ];
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.sectionOrder,
          draftKey,
        ),
      )
      .toEqual(expectedOrder);
    await expect(right).toBeEnabled();
    await right.click();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.sectionOrder,
          draftKey,
        ),
      )
      .toEqual(profile.sectionOrder);
    await expect(nav.locator('[aria-current="step"]')).toHaveCount(1);
    const handle = nav.getByRole("button", {
      name: locale === "en" ? `Drag ${label} to reorder` : `Arrastrar ${label} para ordenar`,
      exact: true,
    });
    await expect(handle).toHaveAccessibleDescription(/Space|Espacio/);
    await expect(handle).toHaveAccessibleDescription(/left.*right|izquierda.*derecha/i);
    await expect(handle).toHaveAccessibleDescription(/Escape/);
    await handle.focus();
    await handle.press("Space");
    await expect(handle).toHaveAttribute("aria-pressed", "true");
    await handle.press("Space");
    await expect(handle).toHaveAttribute("aria-pressed", "false");
    await expect(
      page.getByRole("status").filter({
        hasText:
          locale === "en"
            ? `${label} placed at position 20 of 20.`
            : `${label} quedó en la posición 20 de 20.`,
      }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.sectionOrder,
          draftKey,
        ),
      )
      .toEqual(profile.sectionOrder);
    await handle.press("Space");
    for (const step of [1, 2, 3]) {
      await page.keyboard.press("ArrowLeft");
      await expect
        .poll(() =>
          row
            .locator(":scope > li[data-module-id]:not([data-dnd-placeholder])")
            .evaluateAll((items) =>
              items.findIndex((item) => item.getAttribute("data-module-id") === "custom:notes-19"),
            ),
        )
        .toBe(19 - step);
    }
    await page.keyboard.press("Escape");
    await expect(handle).toBeFocused();
    await expect(handle).toHaveAttribute("aria-pressed", "false");
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.sectionOrder,
          draftKey,
        ),
      )
      .toEqual(profile.sectionOrder);
    const firstLabel = profile.customSections[0]!.title;
    const firstHandle = nav.getByRole("button", {
      name:
        locale === "en" ? `Drag ${firstLabel} to reorder` : `Arrastrar ${firstLabel} para ordenar`,
      exact: true,
    });
    await firstHandle.focus();
    await firstHandle.press("Space");
    // Stress consecutive keyboard events in one task, then let promises and React settle.
    await firstHandle.evaluate(async (element) => {
      for (const key of ["ArrowRight", "ArrowLeft"])
        element.dispatchEvent(
          new KeyboardEvent("keydown", { key, code: key, bubbles: true, cancelable: true }),
        );
      await Promise.resolve();
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    });
    await expect
      .poll(() =>
        row
          .locator(":scope > li[data-module-id]:not([data-dnd-placeholder])")
          .evaluateAll((items) =>
            items.findIndex((item) => item.getAttribute("data-module-id") === "custom:notes-0"),
          ),
      )
      .toBe(0);
    await page.keyboard.press("Escape");
    await expect(firstHandle).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.sectionOrder,
          draftKey,
        ),
      )
      .toEqual(profile.sectionOrder);
    await firstHandle.press("Space");
    for (const step of [1, 2, 3, 4]) {
      await page.keyboard.press("ArrowRight");
      await expect
        .poll(() =>
          row
            .locator(":scope > li[data-module-id]:not([data-dnd-placeholder])")
            .evaluateAll((items) =>
              items.findIndex((item) => item.getAttribute("data-module-id") === "custom:notes-0"),
            ),
        )
        .toBe(step);
    }
    await page.keyboard.press("ArrowLeft");
    await expect
      .poll(() =>
        row
          .locator(":scope > li[data-module-id]:not([data-dnd-placeholder])")
          .evaluateAll((items) =>
            items.findIndex((item) => item.getAttribute("data-module-id") === "custom:notes-0"),
          ),
      )
      .toBe(3);
    await page.keyboard.press("Escape");
    await expect(firstHandle).toBeFocused();
    await expect
      .poll(() =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key) ?? "null")?.sectionOrder,
          draftKey,
        ),
      )
      .toEqual(profile.sectionOrder);
    const firstCheckbox = nav.getByRole("checkbox", { name: firstLabel, exact: true });
    await firstCheckbox.uncheck();
    await expect(firstCheckbox).toBeFocused();
    await expect(firstCheckbox).toBeInViewport({ ratio: 1 });
    await expect(nav.getByRole("button", { name: label, exact: true })).toHaveAttribute(
      "aria-current",
      "step",
    );
    const about = nav.getByRole("checkbox", {
      name: locale === "en" ? "About you" : "Presentación",
      exact: true,
    });
    await about.check();
    await expect(about).toBeFocused();
    await expect(about).toBeInViewport({ ratio: 1 });
    await expect(nav.getByRole("button", { name: label, exact: true })).toHaveAttribute(
      "aria-current",
      "step",
    );
    await expectSingleRow(page, locale, true);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test(`horizontal navigation: the row stays available during long editing and selection preserves focus and writing ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const profile = exampleProfile(locale, 2);
    profile.customSections[0]!.blocks = Array.from({ length: 12 }, (_, index) => ({
      id: `long-${index}`,
      type: "paragraph",
      text: `Long saved note ${index}.`,
    }));
    await openEditor(page, locale, profile);
    const lastField = page.getByRole("textbox", { name: copy[locale].text, exact: true }).last();
    await lastField.fill("Latest words from the bottom of the editor.");
    const nav = navigation(page, locale);
    await expect(nav).toBeInViewport({ ratio: 1 });
    const yBeforeDrag = await page.evaluate(() => scrollY);
    const firstLabel = profile.customSections[0]!.title;
    const drag = nav.getByRole("button", {
      name:
        locale === "en" ? `Drag ${firstLabel} to reorder` : `Arrastrar ${firstLabel} para ordenar`,
      exact: true,
    });
    // Prepare focus without native page scrolling, then measure the real drag gesture.
    await drag.evaluate((element: HTMLElement) => element.focus({ preventScroll: true }));
    expect(await page.evaluate(() => scrollY)).toBe(yBeforeDrag);
    await drag.press("Space");
    await page.keyboard.press("ArrowRight");
    await expect
      .poll(() =>
        nav
          .locator("ul[data-section-row] > li[data-module-id]:not([data-dnd-placeholder])")
          .evaluateAll((items) =>
            items.findIndex((item) => item.getAttribute("data-module-id") === "custom:notes-0"),
          ),
      )
      .toBe(1);
    expect(await page.evaluate(() => scrollY)).toBe(yBeforeDrag);
    await page.keyboard.press("Escape");
    await expect(drag).toBeFocused();
    expect(await page.evaluate(() => scrollY)).toBe(yBeforeDrag);
    const second = nav.getByRole("button", { name: profile.customSections[1]!.title, exact: true });
    await second.click();
    await expect(second).toBeFocused();
    await expect(second).toBeInViewport({ ratio: 1 });
    await expect(page.getByRole("textbox", { name: copy[locale].title, exact: true })).toHaveValue(
      profile.customSections[1]!.title,
    );
    await expect(page.locator("#editor-section-title")).toBeInViewport();
    const first = nav.getByRole("button", { name: profile.customSections[0]!.title, exact: true });
    await first.click();
    await expect(first).toBeFocused();
    await expect(lastField).toHaveValue("Latest words from the bottom of the editor.");
    await expect
      .poll(() =>
        page.evaluate(
          (key) =>
            JSON.parse(localStorage.getItem(key) ?? "null")?.customSections[0]?.blocks[11]?.text,
          draftKey,
        ),
      )
      .toBe("Latest words from the bottom of the editor.");
  });

  test(`horizontal navigation: sequential keyboard selection keeps the active chip focused ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    const profile = exampleProfile(locale, 3);
    await openEditor(page, locale, profile);
    const nav = navigation(page, locale);
    await nav.getByRole("button", { name: profile.customSections[0]!.title, exact: true }).focus();
    for (const index of [1, 2]) {
      // The drag handle and inclusion checkbox precede the next section button.
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");
      const next = nav.getByRole("button", {
        name: profile.customSections[index]!.title,
        exact: true,
      });
      await expect(next).toBeFocused();
      await next.press("Enter");
      await expect(next).toBeFocused();
      await expect(next).toHaveAttribute("aria-current", "step");
      await expect(next).toBeInViewport({ ratio: 1 });
      await expect(
        page.getByRole("textbox", { name: copy[locale].title, exact: true }),
      ).toHaveValue(profile.customSections[index]!.title);
    }
  });

  test(`horizontal navigation: all sections are available from the start and content choices stay progressive ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 640 });
    await openEditor(page, locale);
    await expect(navigation(page, locale).getByRole("checkbox")).toHaveCount(5);
    await page.getByRole("button", { name: copy[locale].add, exact: true }).click();
    await expect(
      page.getByRole("textbox", { name: copy[locale].title, exact: true }),
    ).toBeFocused();
    const addBlock = page.getByRole("button", { name: copy[locale].addBlock, exact: true });
    await expect(addBlock).toHaveAttribute("aria-expanded", "true");
    await page.getByRole("button", { name: copy[locale].addText, exact: true }).click();
    await expect(addBlock).toHaveAttribute("aria-expanded", "false");
    const text = page.getByRole("textbox", { name: copy[locale].text, exact: true });
    await expect(text).toBeFocused();
    await text.fill("A little is enough.");
    await page
      .getByRole("button", {
        name: locale === "en" ? "Remove Text block 1" : "Quitar Bloque de texto 1",
        exact: true,
      })
      .click();
    await expect(addBlock).toBeFocused();
    await expect(addBlock).toHaveAttribute("aria-expanded", "true");
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  });

  test(`accessibility: touch-emulated mobile can select a scrolled chip and keep the profile readable ${locale}`, async ({
    browser,
    baseURL,
  }) => {
    // Chromium emulation covers mobile viewport and touch input, not physical keyboards, Safari or assistive technology.
    const context = await browser.newContext({
      baseURL,
      isMobile: true,
      hasTouch: true,
      viewport: { width: 360, height: 640 },
      deviceScaleFactor: 3,
      reducedMotion: "reduce",
      colorScheme: locale === "en" ? "light" : "dark",
    });
    try {
      const page = await context.newPage();
      const profile = exampleProfile(locale, 2);
      await openEditor(page, locale, profile);
      const title = page.getByRole("textbox", { name: copy[locale].title, exact: true });
      await expectWithinInitialViewport(title, page);
      expect(await page.evaluate(() => navigator.maxTouchPoints)).toBeGreaterThan(0);
      await title.tap();
      await title.fill("Small notes from a mobile editor");
      const second = navigation(page, locale).getByRole("button", {
        name: profile.customSections[1]!.title,
        exact: true,
      });
      await second.tap();
      await expect(second).toBeFocused();
      await expect(second).toBeInViewport({ ratio: 1 });
      await navigation(page, locale)
        .getByRole("button", { name: "Small notes from a mobile editor", exact: true })
        .tap();
      await page.getByRole("button", { name: copy[locale].preview, exact: true }).tap();
      await expect(
        page.getByRole("article", { name: copy[locale].document, exact: true }),
      ).toContainText("Small notes from a mobile editor");
      await expectSingleRow(page, locale, true);
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    } finally {
      await context.close();
    }
  });
}

for (const locale of ["en", "es"] as const) {
  test(`accessibility: oversized section chips reveal the actual focused control at 200 percent text ${locale}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const profile = exampleProfile(locale, 2);
    await openEditor(page, locale, profile);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "32px";
    });
    await expect(page.locator("html")).toHaveCSS("font-size", "32px");
    const nav = navigation(page, locale);
    const row = nav.locator("ul[data-section-row]");
    await row.scrollIntoViewIfNeeded();
    const originalY = await page.evaluate(() => scrollY);
    const label = profile.customSections[0]!.title;
    const checkbox = nav.getByRole("checkbox", { name: label, exact: true });
    const handle = nav.getByRole("button", {
      name: locale === "en" ? `Drag ${label} to reorder` : `Arrastrar ${label} para ordenar`,
      exact: true,
    });
    for (const control of [checkbox, handle, checkbox]) {
      // Isolate the strip's horizontal reveal from intentional native vertical focus scrolling.
      await control.evaluate((element: HTMLElement) => element.focus({ preventScroll: true }));
      await expect(control).toBeFocused();
      await expect
        .poll(() =>
          control.evaluate((element) => {
            const row = element.closest("ul")!.getBoundingClientRect();
            const control = element.getBoundingClientRect();
            return (
              control.left >= row.left - 1 &&
              control.right <= row.right + 1 &&
              control.left >= 0 &&
              control.right <= innerWidth
            );
          }),
        )
        .toBe(true);
      expect(await page.evaluate(() => scrollY)).toBe(originalY);
    }
    await expectSingleRow(page, locale, true);
    await page.screenshot({ path: `work/previews/horizontal-large-text-focus-${locale}.png` });
  });
}
