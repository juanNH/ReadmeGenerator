import { expect, type Locator, type Page } from "@playwright/test";

/** Read the authored lines from either accessible editing mode, without trimming. */
export async function readCodeSource(control: Locator): Promise<string> {
  return control.evaluate((element) => {
    if (element instanceof HTMLTextAreaElement) return element.value;
    const lines = element.querySelectorAll(".cm-line");
    return lines.length
      ? Array.from(lines, (line) => line.textContent ?? "").join("\n")
      : (element.textContent ?? "");
  });
}

export async function expectCodeSource(control: Locator, source: string) {
  await expect.poll(() => readCodeSource(control)).toBe(source.replace(/\r\n|\r/g, "\n"));
}

export async function fillCodeSource(control: Locator, source: string) {
  await control.fill(source);
  await expectCodeSource(control, source);
}

export async function showSectionOrganizer(page: Page) {
  await expect(
    page.getByRole("navigation", { name: /^(Your sections|Tus secciones)$/, exact: true }),
  ).toBeVisible();
}

export async function showCustomBlockPicker(page: Page) {
  const toggle = page.getByRole("button", { name: /^(Add block|Agregar bloque)$/, exact: true });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
}
