import { expect, type Page } from "@playwright/test";

export async function showSectionOrganizer(page: Page) {
  await expect(
    page.getByRole("navigation", { name: /^(Your sections|Tus secciones)$/, exact: true }),
  ).toBeVisible();
}

export async function showCustomBlockPicker(page: Page) {
  const toggle = page.getByRole("button", { name: /^(Add block|Agregar bloque)$/, exact: true });
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
}
