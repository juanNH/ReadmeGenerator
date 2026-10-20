import { expect, test, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";

const draftKey = "github-profile-generator.profile.v2";

async function openEditor(page: Page, locale: "en" | "es" = "en") {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("checkbox", {
      name: locale === "en" ? "About you" : "Presentación",
      exact: true,
      includeHidden: true,
    }),
  ).toBeEnabled();
}

async function storedProfile(page: Page): Promise<ProfileDocument | null> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), draftKey);
}

for (const locale of ["en", "es"] as const) {
  test(`HTML choice creates an empty code field with keyboard focus and localized help: ${locale}`, async ({
    page,
  }) => {
    const copy =
      locale === "en"
        ? {
            addSection: "Add custom section",
            addContent: "Add section content",
            addHtml: "Add HTML",
            code: "HTML code",
            label: "HTML block 1",
            supported: "Supported HTML",
            exported: "HTML exported",
            help: /Your original is saved/,
          }
        : {
            addSection: "Agregar sección personalizada",
            addContent: "Agregar contenido a la sección",
            addHtml: "Agregar HTML",
            code: "Código HTML",
            label: "Bloque HTML 1",
            supported: "HTML compatible",
            exported: "HTML exportado",
            help: /Tu código original se guarda/,
          };
    await openEditor(page, locale);
    await page.getByRole("button", { name: copy.addSection, exact: true }).click();
    const picker = page.getByRole("group", { name: copy.addContent, exact: true });
    const option = picker.getByRole("button", { name: copy.addHtml, exact: true });
    await expect(option).toHaveAccessibleDescription(/HTML/);
    await expect(option.locator("svg path")).toHaveCount(1);
    await option.focus();
    await option.press("Enter");
    const field = page.getByRole("textbox", { name: copy.code, exact: true });
    await expect(field).toBeFocused();
    await expect(field).toHaveValue("");
    await expect(field).toHaveAttribute("rows", "8");
    await expect(field).toHaveAttribute("spellcheck", "false");
    await expect(field).toHaveAttribute("autocorrect", "off");
    await expect(field).toHaveAccessibleDescription(copy.help);
    await expect(page.getByRole("group", { name: copy.label, exact: true })).toBeVisible();
    await expect(page.getByText(copy.exported, { exact: true })).toHaveCount(0);
    const supported = page.getByText(copy.supported, { exact: true });
    await supported.focus();
    await supported.press("Enter");
    await expect(supported.locator("..")).toContainText("HTTPS");
    await expect(supported.locator("..")).toContainText(/30[,.]000/);
    await expect(field).toHaveValue("");
    await expect
      .poll(async () => (await storedProfile(page))?.customSections[0]?.blocks[0])
      .toMatchObject({ type: "html", source: "" });
  });
}

test("HTML examples stay local and replace code only after an explicit choice and confirmation", async ({
  page,
}) => {
  const imageRequests: string[] = [];
  page.on("request", (request) => {
    if (request.resourceType() === "image") imageRequests.push(request.url());
  });
  await openEditor(page);
  await page.getByRole("button", { name: "Add custom section", exact: true }).click();
  await page.getByRole("button", { name: "Add HTML", exact: true }).click();
  const field = page.getByRole("textbox", { name: "HTML code", exact: true });
  await page.getByText("Supported HTML", { exact: true }).click();
  await page.getByText("HTML examples", { exact: true }).click();
  const centered = page.getByRole("group", { name: "Centered introduction", exact: true });
  const table = page.getByRole("group", { name: "A small table", exact: true });
  const details = page.getByRole("group", { name: "Expandable details", exact: true });
  for (const example of [centered, table, details]) {
    await expect(example.getByRole("region")).toBeVisible();
    await expect(example.locator("img, iframe")).toHaveCount(0);
  }
  await expect(field).toHaveValue("");
  const centeredSource = await centered.getByRole("region").textContent();
  const tableSource = await table.getByRole("region").textContent();
  const detailsSource = await details.getByRole("region").textContent();
  if (!centeredSource || !tableSource || !detailsSource) throw new Error("HTML example is empty");
  const useCentered = centered.getByRole("button", {
    name: "Use this example: Centered introduction",
    exact: true,
  });
  await useCentered.focus();
  await useCentered.press("Enter");
  await expect(field).toHaveValue(centeredSource);
  await expect(field).toBeFocused();
  const useTable = table.getByRole("button", {
    name: "Use this example: A small table",
    exact: true,
  });
  page.once("dialog", (dialog) => dialog.dismiss());
  await useTable.click();
  await expect(field).toHaveValue(centeredSource);
  await expect(useTable).toBeFocused();
  page.once("dialog", (dialog) => dialog.accept());
  await useTable.click();
  await expect(field).toHaveValue(tableSource);
  await expect(field).toBeFocused();
  page.once("dialog", (dialog) => dialog.accept());
  await details
    .getByRole("button", { name: "Use this example: Expandable details", exact: true })
    .click();
  await expect(field).toHaveValue(detailsSource);
  await expect(field).toBeFocused();
  expect(imageRequests).toEqual([]);
});

test("HTML original and filtered output stay distinct across duplication, hiding and recovery", async ({
  page,
}) => {
  await openEditor(page);
  await page.getByRole("button", { name: "Add custom section", exact: true }).click();
  await page.getByRole("textbox", { name: "Section title", exact: true }).fill("HTML notes");
  await page.getByRole("button", { name: "Add HTML", exact: true }).click();
  const source = '<p class="note">My original text</p>\n<!-- keep my original -->';
  const field = page.getByRole("textbox", { name: "HTML code", exact: true });
  await field.fill(source);
  await expect(
    page.getByRole("list", { name: "Changes in supported HTML", exact: true }),
  ).toContainText("Unsupported attributes were removed");
  await page
    .locator("summary")
    .filter({ hasText: /^HTML exported$/ })
    .click();
  const exported = page.getByRole("region", { name: "HTML exported", exact: true });
  await expect(exported).toContainText("<p>My original text</p>");
  await expect(exported).not.toContainText('class="note"');
  await expect(exported).not.toContainText("<!--");
  await expect(field).toHaveValue(source);
  await expect
    .poll(async () => (await storedProfile(page))?.customSections[0]?.blocks[0])
    .toMatchObject({ type: "html", source });
  const original = (await storedProfile(page))!.customSections[0]!;
  await page.getByRole("button", { name: "Duplicate section", exact: true }).click();
  await expect(field).toHaveValue(source);
  await page.getByRole("textbox", { name: "Section title", exact: true }).fill("HTML copy");
  const copiedSource = "<p>Independent HTML copy</p>";
  await field.fill(copiedSource);
  await page.getByRole("checkbox", { name: "HTML notes", exact: true }).uncheck();
  await expect
    .poll(async () => (await storedProfile(page))?.customSections[1]?.blocks[0])
    .toMatchObject({ type: "html", source: copiedSource });
  await expect
    .poll(async () => (await storedProfile(page))?.customSections[0]?.visible)
    .toBe(false);
  const saved = (await storedProfile(page))!;
  expect(saved.customSections[0]).toEqual({ ...original, visible: false });
  expect(saved.customSections[1]?.id).not.toBe(original.id);
  expect(saved.customSections[1]?.blocks[0]?.id).not.toBe(original.blocks[0]?.id);
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "HTML notes", exact: true })).not.toBeChecked();
  await page.getByRole("button", { name: "HTML copy", exact: true }).click();
  await expect(field).toHaveValue(copiedSource);
  await page.getByRole("button", { name: "Add and edit HTML notes", exact: true }).click();
  await expect(field).toHaveValue(source);
});

test("valid HTML blocks explain the combined limit and focus the affected code", async ({
  page,
}) => {
  const profile = createEmptyProfile("en");
  profile.customSections = [
    {
      id: "html-limit",
      title: "HTML limit",
      visible: true,
      blocks: Array.from({ length: 6 }, (_, index) => ({
        id: `html-${index}`,
        type: "html" as const,
        source: "x".repeat(25_001),
      })),
    },
  ];
  profile.sectionOrder.push({ kind: "custom", sectionId: "html-limit" });
  await page.setViewportSize({ width: 1600, height: 1100 });
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(profile),
  });
  await page.goto("/en/editor");
  const affected = page.getByRole("group", { name: "HTML block 6", exact: true });
  const field = affected.getByRole("textbox", { name: "HTML code", exact: true });
  await expect(field).toHaveAttribute("aria-invalid", "true");
  await expect(field).toHaveAccessibleDescription(/150,000 characters in total/);
  await expect(affected.getByRole("list", { name: "HTML problems", exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Review fields in HTML limit", exact: true }).click();
  await expect(field).toBeFocused();
  await field.fill("<p>A smaller block</p>");
  await expect(field).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
});
