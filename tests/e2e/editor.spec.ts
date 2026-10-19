import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Download, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import { generateReadme } from "../../src/core/readme";

const draftKey = "github-profile-generator.profile.v1";

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

async function openSection(page: Page, name: string) {
  await showSections(page);
  const choice = page.getByRole("button", { name, exact: true, includeHidden: true });
  await choice.click();
  await expect(choice).toHaveAttribute("aria-current", "step");
  await expect(page.locator("#editor-section-title")).toHaveText(name);
  if (name === "About you" || name === "Presentación") {
    const details = page.locator("details").filter({
      has: page.getByText(name === "About you" ? "Extra details" : "Detalles opcionales", {
        exact: true,
      }),
    });
    if (!(await details.evaluate((node) => (node as HTMLDetailsElement).open)))
      await details.locator("summary").click();
  }
  if (name === "Contact" || name === "Contacto") {
    for (const summary of await page.locator("details:not([open]) > summary").all())
      await summary.click();
  }
}

async function showSections(page: Page) {
  const sections = page.getByRole("button", { name: /^(Sections|Secciones)$/, exact: true });
  if ((await sections.isVisible()) && (await sections.getAttribute("aria-expanded")) !== "true")
    await sections.click();
}

async function showPreview(page: Page, locale: "en" | "es" = "en") {
  const preview = page.getByRole("button", {
    name: locale === "en" ? "Preview" : "Vista previa",
    exact: true,
  });
  if (await preview.isVisible()) await preview.click();
}

async function introduceYourself(page: Page, name = "Sam Example") {
  await showSections(page);
  await page.getByRole("checkbox", { name: "About you", exact: true }).check();
  await openSection(page, "About you");
  await page.getByRole("textbox", { name: "Display name", exact: true }).fill(name);
}

async function addContact(page: Page, label = "Portfolio", url = "https://example.com/profile") {
  await showSections(page);
  await page.getByRole("checkbox", { name: "Contact", exact: true }).check();
  await openSection(page, "Contact");
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  await page.getByText("Customize label (optional)", { exact: true }).last().click();
  await page.getByRole("textbox", { name: "Link label", exact: true }).last().fill(label);
  await page.getByRole("textbox", { name: "URL", exact: true }).last().fill(url);
}

async function downloadText(download: Download): Promise<string> {
  expect(download.suggestedFilename()).toBe("README.md");
  const path = await download.path();
  if (path === null) throw new Error("The README download must be available locally.");
  return readFile(path, "utf8");
}

async function downloadReadme(page: Page): Promise<string> {
  await showPreview(page);
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download README", exact: true }).click();
  return downloadText(await event);
}

const memoryHeadline = "Kept across interface languages";
const memoryContactUrl = "https://example.com/memory-profile";

async function assertMemoryLocaleRoundTrip(
  page: Page,
  name: string,
  failure: "invalid" | "unavailable" | "quota",
) {
  const notices = {
    invalid: {
      en: "We could not open the saved draft",
      es: "No pudimos abrir el borrador guardado",
    },
    unavailable: {
      en: "This browser could not save your draft",
      es: "Este navegador no pudo guardar tu borrador",
    },
    quota: {
      en: "Recent changes could not be saved",
      es: "No se pudieron guardar los últimos cambios",
    },
  };

  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page).toHaveURL(/\/es\/editor$/);
  await openSection(page, "Presentación");
  await expect(page.getByRole("textbox", { name: "Nombre para mostrar", exact: true })).toHaveValue(
    name,
  );
  await expect(page.getByRole("textbox", { name: "Titular", exact: true })).toHaveValue(
    memoryHeadline,
  );
  await openSection(page, "Contacto");
  await expect(page.getByRole("textbox", { name: "URL", exact: true })).toHaveValue(
    memoryContactUrl,
  );
  await expect(page.getByRole("combobox", { name: "Idioma del README", exact: true })).toHaveValue(
    "en",
  );
  await expect(page.getByText(notices[failure].es, { exact: true })).toBeVisible();
  if (failure === "quota") {
    await expect(page.getByRole("status").filter({ hasText: notices.quota.es })).toBeVisible();
  }
  const preview = page.getByRole("article", { name: "Vista previa del README", exact: true });
  await expect(preview).toHaveAttribute("lang", "en");
  await expect(preview.getByRole("heading", { name: "Contact", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Descargar README", exact: true })).toBeEnabled();

  await page.getByRole("combobox", { name: "Idioma", exact: true }).selectOption("en");
  await expect(page).toHaveURL(/\/en\/editor$/);
  await openSection(page, "About you");
  await expect(page.getByRole("textbox", { name: "Display name", exact: true })).toHaveValue(name);
  await expect(page.getByRole("textbox", { name: "Headline", exact: true })).toHaveValue(
    memoryHeadline,
  );
  await openSection(page, "Contact");
  await expect(page.getByRole("textbox", { name: "URL", exact: true })).toHaveValue(
    memoryContactUrl,
  );
  await expect(page.getByRole("combobox", { name: "README language", exact: true })).toHaveValue(
    "en",
  );
  await expect(page.getByText(notices[failure].en, { exact: true })).toBeVisible();
  if (failure === "quota") {
    await expect(page.getByRole("status").filter({ hasText: notices.quota.en })).toBeVisible();
  }
  await expect(page.getByRole("button", { name: "Copy README", exact: true })).toBeEnabled();
  const markdown = await downloadReadme(page);
  expect(markdown).toContain(`## ${memoryHeadline}\n`);
  expect(markdown).toContain(`## Contact\n\n- [Portfolio](<${memoryContactUrl}>)`);
  return markdown;
}

test("home opens an empty optional editor without saving during hydration", async ({ page }) => {
  await page.goto("/en");
  await page
    .getByRole("main")
    .getByRole("link", { name: "Create your profile", exact: true })
    .click();
  await expect(page).toHaveURL(/\/en\/editor$/);
  await expect(page.getByRole("checkbox", { name: "About you", exact: true })).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: "About you", exact: true })).not.toBeChecked();
  await expect(page.getByRole("checkbox", { name: "Contact", exact: true })).not.toBeChecked();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Copy README", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  await page.clock.install();
  await page.clock.fastForward(750);
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
});

test("presentation alone can be completed with keyboard and no required identity fields", async ({
  page,
}) => {
  await openEditor(page);
  const about = page.getByRole("checkbox", { name: "About you", exact: true });
  await about.focus();
  await page.keyboard.press("Space");
  await page
    .getByRole("textbox", { name: "About you", exact: true })
    .fill("Learning accessible interfaces");
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview).toContainText("Learning accessible interfaces");
  await expect(page.getByRole("textbox", { name: "Display name", exact: true })).toHaveValue("");
  await expect(page.getByRole("checkbox", { name: "Contact", exact: true })).not.toBeChecked();
  expect(await downloadReadme(page)).toBe("Learning accessible interfaces\n");
});

test("contact alone supports adding, editing and removing stable links with usable focus", async ({
  page,
}) => {
  await openEditor(page);
  await addContact(page);
  await page.getByRole("button", { name: "Add link", exact: true }).click();
  const urls = page.getByRole("textbox", { name: "URL", exact: true });
  await expect(urls.last()).toBeFocused();
  await page.getByText("Customize label (optional)", { exact: true }).last().click();
  const labels = page.getByRole("textbox", { name: "Link label", exact: true });
  await labels.last().fill("Email");
  await page
    .getByRole("textbox", { name: "URL", exact: true })
    .last()
    .fill("mailto:sam@example.com");
  await page.getByRole("button", { name: "Remove link 1", exact: true }).click();
  await expect(labels).toHaveCount(1);
  await expect(labels).toHaveValue("Email");
  await expect(urls).toBeFocused();
  await expect(page.getByRole("checkbox", { name: "About you", exact: true })).not.toBeChecked();
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.getByRole("link", { name: "Email", exact: true })).toHaveAttribute(
    "href",
    "mailto:sam@example.com",
  );
  await expect(preview.getByRole("link", { name: "Portfolio", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Remove link 1", exact: true }).click();
  await expect(page.getByRole("button", { name: "Add link", exact: true })).toBeFocused();
  await expect(page.getByRole("button", { name: "Copy README", exact: true })).toBeDisabled();
});

test("hiding and restoring a section preserves its draft, order and opaque IDs after reload", async ({
  page,
}) => {
  const profile = createEmptyProfile("es");
  profile.data.presentation.displayName = "Sam Example";
  profile.data.knowledge.items = [{ id: "preserved-knowledge", title: "Testing", description: "" }];
  profile.data.contact.links = [
    { id: "\ud800", label: "Portfolio", url: "https://example.com/profile" },
  ];
  profile.visibility.presentation = true;
  profile.visibility.contact = true;
  profile.moduleOrder.reverse();
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(profile),
  });
  await openEditor(page);
  await openSection(page, "About you");
  await expect(page.getByRole("textbox", { name: "Display name", exact: true })).toHaveValue(
    "Sam Example",
  );
  await openSection(page, "Contact");
  await page.getByRole("textbox", { name: "Link label", exact: true }).fill("Updated portfolio");
  await page.getByRole("checkbox", { name: "About you", exact: true }).uncheck();
  await expect(
    page.getByRole("article", { name: "README preview", exact: true }),
  ).not.toContainText("Sam Example");
  await expect(page.getByText("Saved on this browser", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("checkbox", { name: "About you", exact: true })).toBeEnabled();
  await expect(page.getByRole("checkbox", { name: "About you", exact: true })).not.toBeChecked();
  await openSection(page, "Contact");
  await expect(page.getByRole("textbox", { name: "Link label", exact: true })).toHaveValue(
    "Updated portfolio",
  );
  await expect(page.getByRole("combobox", { name: "README language", exact: true })).toHaveValue(
    "es",
  );
  await page.getByRole("checkbox", { name: "About you", exact: true }).check();
  await openSection(page, "About you");
  await expect(page.getByRole("textbox", { name: "Display name", exact: true })).toHaveValue(
    "Sam Example",
  );
  const stored = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null"),
    draftKey,
  );
  expect(stored.moduleOrder).toEqual(profile.moduleOrder);
  expect(stored.data.knowledge).toEqual(profile.data.knowledge);
  expect(stored.data.contact.links[0].id).toBe("\ud800");
  expect(await downloadReadme(page)).toContain("Updated portfolio");
});

test("invalid contact URLs explain the error and block export only while that section is visible", async ({
  page,
}) => {
  await openEditor(page);
  await introduceYourself(page);
  await addContact(page, "Unsafe link", "javascript:alert(1)");
  const url = page.getByRole("textbox", { name: "URL", exact: true });
  await expect(url).toHaveAttribute("aria-invalid", "true");
  await expect(url).toHaveAccessibleDescription(/Enter a full http:\/\/ or https:\/\/ address/);
  await expect(page.getByRole("button", { name: "Copy README", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  await page.getByRole("checkbox", { name: "Contact", exact: true }).uncheck();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  await page.getByRole("checkbox", { name: "Contact", exact: true }).check();
  await openSection(page, "Contact");
  await expect(url).toHaveValue("javascript:alert(1)");
  await url.fill("https://example.com/profile");
  await expect(url).not.toHaveAttribute("aria-invalid", "true");
  await expect(page.getByRole("button", { name: "Copy README", exact: true })).toBeEnabled();
});

test("UI locale changes preserve the latest unsaved text and keep README language independent", async ({
  page,
}) => {
  await openEditor(page);
  await introduceYourself(page);
  await page.getByRole("textbox", { name: "Location", exact: true }).fill("Example City");
  await addContact(page);
  await openSection(page, "About you");
  await page
    .getByRole("textbox", { name: "About you", exact: true })
    .fill("My latest words before navigation");
  // Navigate immediately after editing, before the 500 ms save debounce.
  await page.getByRole("combobox", { name: "Language", exact: true }).selectOption("es");
  await expect(page).toHaveURL(/\/es\/editor$/);
  await expect(page.locator("html")).toHaveAttribute("lang", "es");
  await openSection(page, "Presentación");
  await expect(page.getByRole("textbox", { name: "Sobre vos", exact: true })).toHaveValue(
    "My latest words before navigation",
  );
  const contentLanguage = page.getByRole("combobox", { name: "Idioma del README", exact: true });
  await expect(contentLanguage).toHaveValue("en");
  const preview = page.getByRole("article", { name: "Vista previa del README", exact: true });
  await expect(preview).toHaveAttribute("lang", "en");
  await expect(preview.getByRole("heading", { name: "Contact", exact: true })).toBeVisible();
  await expect(preview).toContainText("Location: Example City");
  await contentLanguage.selectOption("es");
  await expect(preview).toHaveAttribute("lang", "es");
  await expect(preview.getByRole("heading", { name: "Contacto", exact: true })).toBeVisible();
  await expect(preview).toContainText("Ubicación: Example City");
  await page.getByRole("combobox", { name: "Idioma", exact: true }).selectOption("en");
  await expect(page).toHaveURL(/\/en\/editor$/);
  await openSection(page, "About you");
  await expect(page.getByRole("combobox", { name: "README language", exact: true })).toHaveValue(
    "es",
  );
  await expect(page.getByRole("textbox", { name: "About you", exact: true })).toHaveValue(
    "My latest words before navigation",
  );
});

test("preview, clipboard and README download use the generator, and clipboard failure keeps download usable", async ({
  page,
}) => {
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
  await openEditor(page);
  await introduceYourself(page, "Sam & Example");
  await page.getByRole("textbox", { name: "Headline", exact: true }).fill("Building useful things");
  await page
    .getByRole("textbox", { name: "About you", exact: true })
    .fill("Learning **every day**.");
  await addContact(page);
  const profile = createEmptyProfile("en");
  profile.visibility.presentation = true;
  profile.visibility.contact = true;
  profile.data.presentation.displayName = "Sam & Example";
  profile.data.presentation.headline = "Building useful things";
  profile.data.presentation.bio = "Learning **every day**.";
  profile.data.contact.links = [
    { id: "example-link", label: "Portfolio", url: "https://example.com/profile" },
  ];
  const expected = generateReadme(profile);
  if (!expected.success) throw new Error("The reference profile must be exportable.");
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview).toContainText("Sam & Example");
  await expect(preview).toContainText("Learning **every day**.");
  await expect(preview.getByRole("link", { name: "Portfolio", exact: true })).toHaveAttribute(
    "href",
    "https://example.com/profile",
  );
  await page.getByRole("button", { name: "Copy README", exact: true }).click();
  await expect(page.getByText("README copied to your clipboard.", { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => (window as Window & { copiedReadme?: string }).copiedReadme),
  ).toBe(expected.markdown);
  expect(await downloadReadme(page)).toBe(expected.markdown);
  await expect(page.getByText("Saved on this browser", { exact: true })).toBeVisible();
  await page.keyboard.press("Control+Home");
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: "work/previews/editor-desktop.png", fullPage: true });
  await page.evaluate(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async () => {
          throw new DOMException("Clipboard blocked", "NotAllowedError");
        },
      },
    });
  });
  await page.getByRole("button", { name: "Copy README", exact: true }).click();
  await expect(
    page.getByText("We could not copy to your clipboard. Try downloading the README instead.", {
      exact: true,
    }),
  ).toBeVisible();
  expect(await downloadReadme(page)).toBe(expected.markdown);
});

for (const [name, saved] of [
  ["corrupt JSON", "{unfinished"],
  ["future version", JSON.stringify({ ...createEmptyProfile("en"), schemaVersion: 2 })],
] as const) {
  test(`a ${name} draft remains untouched until a new saved draft is confirmed`, async ({
    page,
  }) => {
    await page.addInitScript(({ key, value }) => localStorage.setItem(key, value), {
      key: draftKey,
      value: saved,
    });
    await openEditor(page);
    await expect(
      page.getByText("We could not open the saved draft", { exact: true }),
    ).toBeVisible();
    await page.clock.install();
    await introduceYourself(page, "In-memory profile");
    await page.getByRole("textbox", { name: "Headline", exact: true }).fill(memoryHeadline);
    await addContact(page, "Portfolio", memoryContactUrl);
    await page.clock.fastForward(750);
    expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBe(saved);
    expect(await assertMemoryLocaleRoundTrip(page, "In-memory profile", "invalid")).toContain(
      "# In\\-memory profile\n",
    );
    expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBe(saved);
    page.once("dialog", (dialog) => dialog.dismiss());
    await page.getByRole("button", { name: "Start a new saved draft", exact: true }).click();
    expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBe(saved);
    await openSection(page, "About you");
    await expect(page.getByRole("textbox", { name: "Display name", exact: true })).toHaveValue(
      "In-memory profile",
    );
    page.once("dialog", (dialog) => dialog.accept());
    await page.getByRole("button", { name: "Start a new saved draft", exact: true }).click();
    await expect(page.getByRole("checkbox", { name: "About you", exact: true })).not.toBeChecked();
    await page.clock.fastForward(750);
    expect(
      await page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), draftKey),
    ).toEqual(createEmptyProfile("en"));
  });
}

for (const failure of ["blocked getter", "quota exceeded"] as const) {
  test(`storage ${failure} leaves editing and exporting available in memory`, async ({ page }) => {
    await page.addInitScript(
      ({ key, failure }) => {
        if (failure === "blocked getter") {
          Object.defineProperty(window, "localStorage", {
            configurable: true,
            get() {
              throw new DOMException("Storage blocked", "SecurityError");
            },
          });
        } else {
          const original = Storage.prototype.setItem;
          Storage.prototype.setItem = function (name: string, value: string) {
            if (name === key) throw new DOMException("Storage full", "QuotaExceededError");
            return original.call(this, name, value);
          };
        }
      },
      { key: draftKey, failure },
    );
    await openEditor(page);
    await introduceYourself(page, "Profile kept in memory");
    await expect(page.getByText("Editing without local saving", { exact: true })).toBeVisible();
    await page.getByRole("textbox", { name: "Headline", exact: true }).fill(memoryHeadline);
    await addContact(page, "Portfolio", memoryContactUrl);
    await expect(page.getByRole("button", { name: "Copy README", exact: true })).toBeEnabled();
    expect(
      await assertMemoryLocaleRoundTrip(
        page,
        "Profile kept in memory",
        failure === "blocked getter" ? "unavailable" : "quota",
      ),
    ).toContain("# Profile kept in memory\n");
    if (failure === "quota exceeded") {
      expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBeNull();
    }
  });
}

test("a failed flush before the save debounce preserves pending edits across both UI locales", async ({
  page,
}) => {
  const previousProfile = createEmptyProfile("en");
  previousProfile.visibility.presentation = true;
  previousProfile.data.presentation.displayName = "Previously saved profile";
  const original = JSON.stringify(previousProfile);
  await page.addInitScript(
    ({ key, original }) => {
      localStorage.setItem(key, original);
      const testWindow = window as Window & { draftWriteAttempts?: number };
      testWindow.draftWriteAttempts = 0;
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (name: string, value: string) {
        if (name === key) {
          testWindow.draftWriteAttempts = (testWindow.draftWriteAttempts ?? 0) + 1;
          throw new DOMException("Storage full", "QuotaExceededError");
        }
        return originalSetItem.call(this, name, value);
      };
      // Hold the draft debounce while real navigation and hydration timers keep running.
      const originalSetTimeout = window.setTimeout.bind(window);
      window.setTimeout = ((handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
        originalSetTimeout(
          handler,
          timeout === 500 ? 60_000 : timeout,
          ...args,
        )) as typeof window.setTimeout;
    },
    { key: draftKey, original },
  );
  await openEditor(page);
  await openSection(page, "About you");
  await page
    .getByRole("textbox", { name: "Display name", exact: true })
    .fill("Latest pending profile");
  await page.getByRole("textbox", { name: "Headline", exact: true }).fill(memoryHeadline);
  await addContact(page, "Portfolio", memoryContactUrl);
  expect(
    await page.evaluate(
      () => (window as Window & { draftWriteAttempts?: number }).draftWriteAttempts,
    ),
  ).toBe(0);
  expect(await assertMemoryLocaleRoundTrip(page, "Latest pending profile", "quota")).toContain(
    "# Latest pending profile\n",
  );
  expect(
    await page.evaluate(
      () => (window as Window & { draftWriteAttempts?: number }).draftWriteAttempts,
    ),
  ).toBeGreaterThan(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), draftKey)).toBe(original);
});

test("untrusted HTML and Markdown remain text instead of injecting preview links or media", async ({
  page,
}) => {
  const unwantedRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith("https://example.com/attack"))
      unwantedRequests.push(request.url());
  });
  await openEditor(page);
  await introduceYourself(page, "![image](https://example.com/attack.png)");
  await page
    .getByRole("textbox", { name: "About you", exact: true })
    .fill(
      '<img src="https://example.com/attack.png" onerror="window.profileInjection=true">\n[Injected](javascript:alert(1))\n<script>window.profileInjection=true</script>',
    );
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview).toContainText("![image](https://example.com/attack.png)");
  await expect(preview).toContainText("[Injected](javascript:alert(1))");
  await expect(preview.locator("img, script, iframe, a")).toHaveCount(0);
  expect(
    await page.evaluate(() => (window as Window & { profileInjection?: boolean }).profileInjection),
  ).toBeUndefined();
  expect(unwantedRequests).toEqual([]);
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
});

for (const locale of ["en", "es"] as const) {
  test(`accessibility: populated ${locale} editor has no detected WCAG AA violations`, async ({
    page,
  }) => {
    await openEditor(page, locale);
    if (locale === "en") {
      await introduceYourself(page);
      await addContact(page, "Invalid draft link", "incomplete");
    } else {
      await page.getByRole("checkbox", { name: "Presentación", exact: true }).check();
      await page
        .getByRole("textbox", { name: "Nombre para mostrar", exact: true })
        .fill("Sol Ejemplo");
      await page.getByRole("checkbox", { name: "Contacto", exact: true }).check();
      await openSection(page, "Contacto");
      await page.getByRole("button", { name: "Agregar enlace", exact: true }).click();
      await page
        .getByRole("textbox", { name: "URL", exact: true })
        .fill("https://example.com/profile");
    }
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(result.violations).toEqual([]);
  });
}

test("accessibility: dark editor fits 360px and supports the skip link with a populated preview", async ({
  page,
}) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await openEditor(page);
  await introduceYourself(page, "A long display name that wraps on small screens");
  await addContact(
    page,
    "A long portfolio label that should wrap",
    "https://example.com/a-long-reference-path-for-a-small-mobile-screen",
  );
  await showPreview(page);
  await page.getByRole("button", { name: "Toggle dark mode", exact: true }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  const skip = page.getByRole("link", { name: "Skip to content", exact: true });
  await skip.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  const result = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(result.violations).toEqual([]);
  await page.screenshot({ path: "work/previews/editor-mobile.png", fullPage: true });
});
