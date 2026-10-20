import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";

type Locale = "en" | "es";

const draftKey = "github-profile-generator.profile.v2";
const copy = {
  en: {
    contact: "Contact",
    provider: "Social network or website",
    add: "Add social network",
    remove: "Remove link",
    entry: "Link",
    label: "Link label",
    customize: "Customize label (optional)",
    preview: "Preview",
    document: "README preview",
    download: "Download README",
    theme: "Toggle dark mode",
  },
  es: {
    contact: "Contacto",
    provider: "Red social o sitio web",
    add: "Agregar red social",
    remove: "Quitar enlace",
    entry: "Enlace",
    label: "Nombre del enlace",
    customize: "Personalizar etiqueta (opcional)",
    preview: "Vista previa",
    document: "Vista previa del README",
    download: "Descargar README",
    theme: "Activar o desactivar el modo oscuro",
  },
} as const;

const brandedContacts = [
  { id: "linkedin", name: "LinkedIn", url: "https://www.linkedin.com/in/alex-example" },
  { id: "leetcode", name: "LeetCode", url: "https://leetcode.com/u/alex-example" },
  { id: "hackerrank", name: "HackerRank", url: "https://www.hackerrank.com/profile/alex-example" },
  { id: "youtube", name: "YouTube", url: "https://www.youtube.com/@alex-example" },
  { id: "facebook", name: "Facebook", url: "https://www.facebook.com/alex-example" },
  { id: "instagram", name: "Instagram", url: "https://www.instagram.com/alex-example" },
] as const;

async function openContact(page: Page, locale: Locale = "en") {
  await page.goto(`/${locale}/editor`);
  const checkbox = page.getByRole("checkbox", {
    name: copy[locale].contact,
    exact: true,
    includeHidden: true,
  });
  await expect(checkbox).toBeEnabled();
  const sections = page.getByRole("button", { name: /^(Sections|Secciones)$/, exact: true });
  if ((await sections.isVisible()) && (await sections.getAttribute("aria-expanded")) !== "true")
    await sections.click();
  await checkbox.check();
  await page.getByRole("button", { name: copy[locale].contact, exact: true }).click();
  await expect(page.locator("#editor-section-title")).toHaveText(copy[locale].contact);
}

function entryAt(page: Page, index: number, locale: Locale = "en") {
  return page.getByRole("group", {
    name: new RegExp(`^${copy[locale].entry} ${index + 1}\\b`),
  });
}

async function addContact(
  page: Page,
  provider: string,
  url: string,
  index: number,
  locale: Locale = "en",
) {
  await page.getByRole("button", { name: copy[locale].add, exact: true }).click();
  const entry = entryAt(page, index, locale);
  const selector = entry.getByRole("combobox", { name: copy[locale].provider, exact: true });
  await expect(selector).toBeFocused();
  await expect(selector).toHaveValue("");
  await selector.selectOption(provider);
  await expect(selector).toBeFocused();
  await selector.press("Tab");
  const input = entry.getByRole("textbox", { name: "URL", exact: true });
  await expect(input).toBeFocused();
  await input.fill(url);
  return entry;
}

async function customizeLabel(entry: Locator, value: string, locale: Locale = "en") {
  const details = entry.locator("details");
  if (!(await details.evaluate((node) => (node as HTMLDetailsElement).open))) {
    await entry.getByText(copy[locale].customize, { exact: true }).click();
  }
  const label = entry.getByRole("textbox", { name: copy[locale].label, exact: true });
  await label.fill(value);
  return label;
}

async function showPreview(page: Page, locale: Locale = "en") {
  const button = page.getByRole("button", { name: copy[locale].preview, exact: true });
  if (await button.isVisible()) await button.click();
  return page.getByRole("article", { name: copy[locale].document, exact: true });
}

async function downloadReadme(page: Page, locale: Locale = "en") {
  await showPreview(page, locale);
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: copy[locale].download, exact: true }).click();
  const download = await pending;
  expect(download.suggestedFilename()).toBe("README.md");
  const path = await download.path();
  if (!path) throw new Error("The generated README must be available locally.");
  return readFile(path, "utf8");
}

async function seedProfile(page: Page, profile: ProfileDocument, locale: Locale = "en") {
  await page.goto(`/${locale}`);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(profile),
  });
}

async function storedProfile(page: Page): Promise<ProfileDocument> {
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(key) !== null, draftKey))
    .toBe(true);
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null") as ProfileDocument,
    draftKey,
  );
}

for (const locale of ["en", "es"] as const) {
  test(`${locale} contact keeps multiple personal websites and repeated services independent`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: locale === "es" ? 360 : 1440, height: 1000 });
    await openContact(page, locale);
    await expect(
      page.getByRole("combobox", { name: copy[locale].provider, exact: true }),
    ).toHaveCount(0);
    const websites = [
      { label: "My portfolio", url: "https://alex.example/portfolio" },
      { label: "My blog", url: "https://blog.alex.example/" },
      { label: "My experiments", url: "https://labs.alex.example/" },
    ] as const;
    const first = await addContact(page, "custom", websites[0].url, 0, locale);
    await customizeLabel(first, websites[0].label, locale);

    for (const [offset, website] of websites.slice(1).entries()) {
      const entry = await addContact(page, "custom", website.url, offset + 1, locale);
      const url = entry.getByRole("textbox", { name: "URL", exact: true });
      await expect(url).toHaveAttribute("placeholder", "https://example.com");
      await customizeLabel(entry, website.label, locale);
    }
    const profiles = [
      { label: "Work profile", url: brandedContacts[0].url },
      { label: "Other profile", url: "https://www.linkedin.com/in/alex-other" },
    ];
    for (const [offset, profile] of profiles.entries()) {
      const entry = await addContact(page, "linkedin", profile.url, offset + 3, locale);
      await customizeLabel(entry, profile.label, locale);
    }
    await expect
      .poll(async () =>
        (await storedProfile(page)).data.contact.links.map(({ label, url }) => ({ label, url })),
      )
      .toEqual([...websites, ...profiles]);
    const original = (await storedProfile(page)).data.contact.links;
    expect(new Set(original.map((link) => link.id)).size).toBe(5);
    expect(original.map(({ label, url }) => ({ label, url }))).toEqual([...websites, ...profiles]);

    await page.getByRole("button", { name: `${copy[locale].remove} 2`, exact: true }).click();
    await expect(
      entryAt(page, 1, locale).getByRole("textbox", { name: "URL", exact: true }),
    ).toBeFocused();
    await customizeLabel(entryAt(page, 1, locale), "My updated experiments", locale);
    const expected = original
      .filter((_, index) => index !== 1)
      .map((link, index) => (index === 1 ? { ...link, label: "My updated experiments" } : link));
    await expect.poll(async () => (await storedProfile(page)).data.contact.links).toEqual(expected);
    await page.reload();
    await openContact(page, locale);
    expect((await storedProfile(page)).data.contact.links).toEqual(expected);
    for (const [index, link] of expected.entries()) {
      await expect(
        entryAt(page, index, locale).getByRole("textbox", { name: "URL", exact: true }),
      ).toHaveValue(link.url);
      await expect(
        entryAt(page, index, locale).getByRole("combobox", {
          name: copy[locale].provider,
          exact: true,
        }),
      ).toHaveValue(link.url.includes("linkedin.com") ? "linkedin" : "custom");
    }
    const markdown = await downloadReadme(page, locale);
    for (const link of expected) {
      expect(markdown).toContain(link.label);
      expect(markdown).toContain(`(<${link.url}>)`);
    }
    expect(markdown).not.toContain(websites[1].url);
    expect(markdown.match(/<img width="20" height="20"/g)).toHaveLength(2);
    const preview = page.getByRole("article", { name: copy[locale].document, exact: true });
    await expect(preview.getByRole("link")).toHaveCount(4);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
  });

  test(`${locale} contact offers recognizable providers alongside a custom portfolio and email`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openContact(page, locale);
    for (const [index, provider] of brandedContacts.entries()) {
      const entry = await addContact(page, provider.id, provider.url, index, locale);
      const selector = entry.getByRole("combobox", { name: copy[locale].provider, exact: true });
      await expect(
        selector.getByRole("option", { name: provider.name, exact: true }),
      ).toBeAttached();
    }
    const portfolio = await addContact(page, "custom", "https://alex.example/portfolio", 6, locale);
    await customizeLabel(portfolio, "My small corner of the web", locale);
    await addContact(page, "email", "mailto:hello@alex.example", 7, locale);
    const preview = await showPreview(page, locale);
    for (const provider of brandedContacts) {
      const icon = preview.locator(`img[src="/contact-icons/${provider.id}.svg"]`);
      await expect(icon).toBeVisible();
      await expect(icon).toHaveAttribute("src", `/contact-icons/${provider.id}.svg`);
      await expect(icon).toHaveAttribute("width", "20");
      await expect(icon).toHaveAttribute("height", "20");
    }
    await expect(preview.locator("img")).toHaveCount(6);
    await expect(
      preview.getByRole("link", { name: "My small corner of the web", exact: true }),
    ).toHaveAttribute("href", "https://alex.example/portfolio");
    await expect(preview.locator('a[href="mailto:hello@alex.example"]')).toBeVisible();
    await expect.poll(async () => (await storedProfile(page)).data.contact.links.length).toBe(8);
    const stored = await storedProfile(page);
    expect(stored.schemaVersion).toBe(2);
    expect(stored.data.contact.links.map((link) => Object.keys(link).sort())).toEqual(
      Array.from({ length: 8 }, () => ["id", "label", "url"]),
    );
    expect(stored.data.contact.links[6]?.label).toBe("My small corner of the web");
    expect(stored.data.contact.links.map((link) => link.url)).toEqual([
      ...brandedContacts.map((provider) => provider.url),
      "https://alex.example/portfolio",
      "mailto:hello@alex.example",
    ]);
  });

  test(`${locale} changing a contact service preserves its URL and label while icons follow the URL`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await openContact(page, locale);
    const entry = await addContact(page, "custom", "https://alex.example/", 0, locale);
    await customizeLabel(entry, "My corner of the web", locale);
    await expect
      .poll(async () => (await storedProfile(page)).data.contact.links[0]?.label)
      .toBe("My corner of the web");
    const original = (await storedProfile(page)).data.contact.links[0];
    if (!original) throw new Error("The added contact must remain in the saved profile.");
    const selector = entry.getByRole("combobox", { name: copy[locale].provider, exact: true });
    await selector.focus();
    await selector.selectOption("linkedin");
    await expect(selector).toBeFocused();
    await selector.press("Tab");
    const url = entry.getByRole("textbox", { name: "URL", exact: true });
    await expect(url).toBeFocused();
    await expect(url).toHaveValue(original.url);
    await expect(url).toHaveAttribute("placeholder", "https://www.linkedin.com/in/your-name");
    await expect(entry.locator("img")).toHaveCount(0);
    expect((await storedProfile(page)).data.contact.links[0]).toEqual(original);

    await url.fill(brandedContacts[3].url);
    await expect(entry.locator('img[src="/contact-icons/youtube.svg"]')).toBeVisible();
    await expect(entry.locator('img[src="/contact-icons/linkedin.svg"]')).toHaveCount(0);
    await expect
      .poll(async () => (await storedProfile(page)).data.contact.links[0]?.url)
      .toBe(brandedContacts[3].url);
    await page.reload();
    await openContact(page, locale);
    await expect(
      entryAt(page, 0, locale).getByRole("combobox", { name: copy[locale].provider, exact: true }),
    ).toHaveValue("youtube");
    expect((await storedProfile(page)).data.contact.links[0]).toEqual({
      ...original,
      url: brandedContacts[3].url,
    });
  });
}

test("contact icons follow the real destination rather than labels or lookalike domains", async ({
  page,
}) => {
  const profile = createEmptyProfile("en");
  profile.visibility.contact = true;
  profile.data.contact.links = [
    { id: "known", label: "My professional profile", url: brandedContacts[0].url },
    { id: "false-label", label: "LinkedIn", url: "https://alex.example/portfolio" },
    {
      id: "lookalike",
      label: "A lookalike host",
      url: "https://www.linkedin.com.alex.example/in/alex",
    },
    { id: "port", label: "A different service", url: "https://linkedin.com:8443/in/alex" },
  ];
  await seedProfile(page, profile);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openContact(page);
  const preview = await showPreview(page);
  await expect(preview.locator('img[src="/contact-icons/linkedin.svg"]')).toHaveCount(1);
  await expect(
    preview.getByRole("link").filter({ hasText: "My professional profile" }).locator("img"),
  ).toHaveCount(1);
  for (const label of ["LinkedIn", "A lookalike host", "A different service"]) {
    await expect(
      preview.getByRole("link", { name: label, exact: true }).locator("img"),
    ).toHaveCount(0);
  }
  await page.screenshot({ path: "work/previews/contact-providers-desktop.png", fullPage: true });
  const markdown = await downloadReadme(page);
  expect(markdown.match(/<img width="20" height="20"/g)).toHaveLength(1);
});

test("contact export keeps catalog icons and escapes personal labels and URL destinations", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (value: string) => {
          (window as Window & { copiedReadme?: string }).copiedReadme = value;
        },
      },
    });
  });
  const profile = createEmptyProfile("en");
  profile.visibility.contact = true;
  const url = "https://www.linkedin.com/in/alex?section=(projects)&view=public";
  const label = '[My work] <img src="https://alex.example/injected.svg"> & ideas';
  profile.data.contact.links = [{ id: "export", label, url }];
  await seedProfile(page, profile);
  await openContact(page);
  const preview = await showPreview(page);
  await expect(preview).toContainText(label);
  await expect(preview.locator("img")).toHaveCount(1);
  await expect(preview.getByRole("link")).toHaveCount(1);
  await expect(preview.getByRole("link")).toHaveAttribute("href", url);
  await expect(preview.locator('img[src="https://alex.example/injected.svg"]')).toHaveCount(0);
  const markdown = await downloadReadme(page);
  expect(markdown).toMatch(
    /<img width="20" height="20" src="https:\/\/raw\.githubusercontent\.com\/simple-icons\/simple-icons\/[a-f0-9]{40}\/icons\/linkedin\.svg" alt="" \/>/,
  );
  expect(markdown).toContain("\\[My work\\]");
  expect(markdown).toContain("&lt;img src\\=");
  expect(markdown).toContain("(projects)&amp;view=public>)");
  expect(markdown.match(/<img /g)).toHaveLength(1);
  await page.getByRole("button", { name: "Copy README", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as Window & { copiedReadme?: string }).copiedReadme))
    .toBe(markdown);
});

test("restored contacts preserve custom labels, opaque IDs and unrelated data after editing", async ({
  page,
}) => {
  const profile = createEmptyProfile("es");
  profile.visibility.contact = true;
  profile.data.presentation.bio = "Stored words outside the current section";
  profile.sectionOrder.reverse();
  profile.data.contact.links = [
    { id: "\ud800", label: "Mi espacio profesional", url: brandedContacts[0].url },
    { id: "entry / ? # : []", label: "Ideas personales", url: "https://alex.example/" },
  ];
  await seedProfile(page, profile, "es");
  await openContact(page, "es");
  const first = entryAt(page, 0, "es");
  await expect(first.getByRole("combobox", { name: copy.es.provider, exact: true })).toHaveValue(
    "linkedin",
  );
  await expect(
    entryAt(page, 1, "es").getByRole("combobox", { name: copy.es.provider, exact: true }),
  ).toHaveValue("custom");
  const label = await customizeLabel(first, "Mi perfil y mis proyectos", "es");
  await expect(label).toBeFocused();
  await expect
    .poll(async () => (await storedProfile(page)).data.contact.links[0]?.label)
    .toBe("Mi perfil y mis proyectos");
  await page.reload();
  await openContact(page, "es");
  await customizeLabel(entryAt(page, 0, "es"), "Mi perfil y mis proyectos", "es");
  await expect(
    entryAt(page, 0, "es").getByRole("textbox", { name: "URL", exact: true }),
  ).toHaveValue(brandedContacts[0].url);
  const stored = await storedProfile(page);
  expect(stored).toEqual({
    ...profile,
    data: {
      ...profile.data,
      contact: {
        links: [
          { ...profile.data.contact.links[0], label: "Mi perfil y mis proyectos" },
          profile.data.contact.links[1],
        ],
      },
    },
  });
});

test("contact service arrows keep focus in the selector until Tab advances to the URL", async ({
  page,
}) => {
  await openContact(page);
  await page.getByRole("button", { name: copy.en.add, exact: true }).click();
  const entry = entryAt(page, 0);
  const selector = entry.getByRole("combobox", { name: copy.en.provider, exact: true });
  await expect(selector).toBeFocused();
  await selector.press("ArrowDown");
  await expect(selector).toHaveValue("linkedin");
  await expect(selector).toBeFocused();
  await selector.press("ArrowDown");
  await expect(selector).toHaveValue("leetcode");
  await expect(selector).toBeFocused();
  await selector.press("ArrowUp");
  await expect(selector).toHaveValue("linkedin");
  await expect(selector).toBeFocused();
  await selector.press("Tab");
  await expect(entry.getByRole("textbox", { name: "URL", exact: true })).toBeFocused();
});

test("adding and removing contacts keeps keyboard focus on the selector, URL or add button", async ({
  page,
}) => {
  await openContact(page);
  await addContact(page, "linkedin", brandedContacts[0].url, 0);
  await addContact(page, "custom", "https://alex.example/", 1);
  await addContact(page, "email", "mailto:hello@alex.example", 2);
  await page.getByRole("button", { name: "Remove link 2", exact: true }).click();
  await expect(entryAt(page, 1).getByRole("textbox", { name: "URL", exact: true })).toBeFocused();
  await expect(entryAt(page, 1).getByRole("textbox", { name: "URL", exact: true })).toHaveValue(
    "mailto:hello@alex.example",
  );
  await page.getByRole("button", { name: "Remove link 2", exact: true }).click();
  await expect(entryAt(page, 0).getByRole("textbox", { name: "URL", exact: true })).toBeFocused();
  await page.getByRole("button", { name: "Remove link 1", exact: true }).click();
  await expect(page.getByRole("button", { name: copy.en.add, exact: true })).toBeFocused();
});

for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`accessibility: ${locale} contact providers fit 360px in ${theme} mode`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 800 });
      await openContact(page, locale);
      const first = await addContact(page, "linkedin", brandedContacts[0].url, 0, locale);
      await customizeLabel(first, "A professional profile with a long personal label", locale);
      const second = await addContact(
        page,
        "custom",
        "https://alex.example/a-long-portfolio-reference-for-a-small-screen",
        1,
        locale,
      );
      await customizeLabel(second, "A small portfolio with projects and experiments", locale);
      if (theme === "dark") {
        await page.getByRole("button", { name: copy[locale].theme, exact: true }).click();
        await expect(page.locator("html")).toHaveClass(/dark/);
      }
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      ).toBe(false);
      const form = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(form.violations).toEqual([]);
      if (locale === "es" && theme === "dark") {
        await page.screenshot({
          path: "work/previews/contact-providers-mobile.png",
          fullPage: true,
        });
      }
      const preview = await showPreview(page, locale);
      await expect(preview.locator('img[src="/contact-icons/linkedin.svg"]')).toBeVisible();
      await expect(preview.getByRole("link")).toHaveCount(2);
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
      ).toBe(false);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    });
  }
}
