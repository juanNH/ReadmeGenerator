import { showSectionOrganizer } from "./editor-test-helpers";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import type { ActivitySnapshot } from "../../src/core/activity/activity-types";
import { renderActivityCard } from "../../src/core/activity/render-card";
import { metricCardIds } from "../../src/core/profile/module-content";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";

const draftKey = "github-profile-generator.profile.v2";
const activityLabel = "Activity & contributions";
const cards = ["Contribution calendar", "Activity summary", "Repository languages"];

function snapshot(username = "example-dev", empty = false): ActivitySnapshot {
  const days = Array.from({ length: 365 }, (_, index) => ({
    date: new Date(Date.UTC(2025, 9, 20 + index)).toISOString().slice(0, 10),
    count: !empty && index === 363 ? 3 : !empty && index === 364 ? 4 : 0,
    level: (!empty && index >= 363 ? 2 : 0) as 0 | 2,
  }));
  return {
    username,
    fetchedAt: "2026-10-19T12:00:00.000Z",
    period: { from: "2025-10-20", to: "2026-10-19" },
    calendar: {
      total: empty ? 0 : 7,
      includesPrivateCounts: false,
      weeks: Array.from({ length: Math.ceil(days.length / 7) }, (_, index) => ({
        days: days.slice(index * 7, index * 7 + 7),
      })),
    },
    summary: {
      commits: empty ? 0 : 4,
      pullRequests: empty ? 0 : 2,
      issues: empty ? 0 : 1,
      reviews: 0,
    },
    languages: {
      repositoriesAnalyzed: empty ? 0 : 2,
      repositoriesTotal: empty ? 0 : 2,
      truncated: false,
      items: empty
        ? []
        : [
            { name: "TypeScript", bytes: 700, color: "#3178c6" },
            { name: "JavaScript", bytes: 300, color: "#f1e05a" },
          ],
    },
    highlights: empty
      ? []
      : [
          {
            id: "example-pull-request",
            title: "Clarify setup instructions",
            url: "https://github.com/example-community/useful-notebook/pull/12",
            kind: "pull-request",
            repository: "example-community/useful-notebook",
          },
        ],
  };
}

async function stubActivity(
  page: Page,
  result: unknown = { success: true, data: snapshot(), stale: false },
) {
  await page.route("**/api/github/**", async (route) => {
    if (new URL(route.request().url()).pathname === "/api/github/activity")
      await route.fulfill({ json: result });
  });
  await page.route("**/cards/github/**", async (route) => {
    const url = new URL(route.request().url());
    const card = metricCardIds.find((id) => url.pathname.endsWith(`/${id}.svg`));
    if (!card) throw new Error("The preview must request a known GitHub card.");
    await route.fulfill({
      contentType: "image/svg+xml",
      body: renderActivityCard(
        snapshot(),
        card,
        url.searchParams.get("locale") === "es" ? "es" : "en",
      ),
    });
  });
}

async function showSections(page: Page) {
  await expect(
    page.getByRole("navigation", { name: /^(Your sections|Tus secciones)$/, exact: true }),
  ).toBeVisible();
}

async function showPreview(page: Page, locale: "en" | "es" = "en") {
  const button = page.getByRole("button", {
    name: locale === "en" ? "Preview" : "Vista previa",
    exact: true,
  });
  if (await button.isVisible()) await button.click();
}

async function openEditor(
  page: Page,
  profile?: ProfileDocument,
  locale: "en" | "es" = "en",
  expandActivity = true,
) {
  if (profile) {
    await page.goto(`/${locale}`);
    await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
      key: draftKey,
      value: JSON.stringify(profile),
    });
  }
  await page.goto(`/${locale}/editor`);
  const name = locale === "en" ? activityLabel : "Actividad y contribuciones";
  await expect(
    page.getByRole("checkbox", { name, exact: true, includeHidden: true }),
  ).toBeEnabled();
  await showSections(page);
  await showSectionOrganizer(page);
  await page.getByRole("checkbox", { name, exact: true, includeHidden: true }).check();
  await page.getByRole("button", { name, exact: true }).click();
  await expect(page.locator("#editor-section-title")).toHaveText(name);
  const summary = page.getByText(
    locale === "en" ? "GitHub activity (optional)" : "Actividad de GitHub (opcional)",
    { exact: true },
  );
  const details = page.locator("details").filter({ has: summary });
  if (expandActivity && !(await details.evaluate((node) => (node as HTMLDetailsElement).open)))
    await summary.click();
}

async function storedProfile(page: Page): Promise<ProfileDocument> {
  await expect(page.getByText("Saved on this browser", { exact: true })).toBeVisible();
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key) ?? "null") as ProfileDocument,
    draftKey,
  );
}

async function queryActivity(page: Page, username = "example-dev") {
  await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill(username);
  await page.getByRole("button", { name: "Check GitHub activity", exact: true }).click();
  await expect(
    page.getByText(`Checked @${username.replace(/^@/, "").toLowerCase()} on Oct 19, 2026.`, {
      exact: true,
    }),
  ).toBeVisible();
}

async function addManualContribution(page: Page, title = "Helped a study group") {
  await page.getByRole("button", { name: "Add contribution", exact: true }).click();
  const input = page.getByRole("textbox", { name: "Contribution title", exact: true }).last();
  await expect(input).toBeFocused();
  await input.fill(title);
}

test("manual contributions need no GitHub username and keep all three cards off when the service is unavailable", async ({
  page,
}) => {
  await stubActivity(page, { success: false, code: "not_configured" });
  await openEditor(page, undefined, "en", false);
  await expect(page.getByRole("textbox", { name: "GitHub username", exact: true })).toHaveCount(0);
  await addManualContribution(page);
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  await page.getByText("GitHub activity (optional)", { exact: true }).click();
  for (const name of cards) {
    await expect(
      page.getByRole("checkbox", { name, exact: true, includeHidden: true }),
    ).not.toBeChecked();
    await expect(
      page.getByRole("checkbox", { name, exact: true, includeHidden: true }),
    ).toBeDisabled();
  }
  await expect(page.getByRole("textbox", { name: "GitHub username", exact: true })).toHaveValue("");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("example-dev");
  await page.getByRole("button", { name: "Check GitHub activity", exact: true }).click();
  await expect(
    page.getByText(
      "GitHub activity is not enabled on this instance yet. You can still add your featured contributions below.",
      { exact: true },
    ),
  ).toBeVisible();
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview).toContainText("Helped a study group");
  await expect(preview.locator("img")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
});

test("GitHub is queried only on request and a successful empty profile differs from an error", async ({
  page,
}) => {
  const requests: string[] = [];
  await page.route("**/api/github/activity?*", async (route) => {
    requests.push(new URL(route.request().url()).searchParams.get("username") ?? "");
    await route.fulfill({ json: { success: true, data: snapshot("new-dev", true), stale: false } });
  });
  await openEditor(page);
  await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("@New-Dev");
  expect(requests).toEqual([]);
  await page.getByRole("button", { name: "Check GitHub activity", exact: true }).click();
  await expect(
    page.getByText(
      "No contributions were found for this period. You can still share technologies, projects, or contributions in your own words.",
      { exact: true },
    ),
  ).toBeVisible();
  expect(requests).toEqual(["new-dev"]);
  for (const name of cards) {
    await expect(
      page.getByRole("checkbox", { name, exact: true, includeHidden: true }),
    ).toBeEnabled();
    await expect(
      page.getByRole("checkbox", { name, exact: true, includeHidden: true }),
    ).not.toBeChecked();
  }
  await page.route("**/api/github/activity?*", (route) =>
    route.fulfill({ json: { success: false, code: "not_found" } }),
  );
  await page.getByRole("textbox", { name: "GitHub username", exact: true }).fill("missing-dev");
  await expect(page.getByText(/Checked @new-dev/)).toHaveCount(0);
  await page.getByRole("button", { name: "Check GitHub activity", exact: true }).click();
  await expect(
    page.getByText("We could not find that GitHub account. Check the username and try again.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "No contributions were found for this period. You can still share technologies, projects, or contributions in your own words.",
      { exact: true },
    ),
  ).toHaveCount(0);
  for (const name of cards)
    await expect(
      page.getByRole("checkbox", { name, exact: true, includeHidden: true }),
    ).toBeDisabled();
});

test("cards are independent, retained in v2 and restored without requesting GitHub on reload", async ({
  page,
}) => {
  let requests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/github/activity") requests += 1;
  });
  await stubActivity(page);
  await openEditor(page);
  await queryActivity(page);
  await page.getByRole("checkbox", { name: cards[0], exact: true, includeHidden: true }).check();
  await page.getByRole("checkbox", { name: cards[2], exact: true, includeHidden: true }).check();
  await expect(
    page.getByRole("checkbox", { name: cards[1], exact: true, includeHidden: true }),
  ).not.toBeChecked();
  const stored = await storedProfile(page);
  expect(stored.schemaVersion).toBe(2);
  expect(stored.data.metrics).toEqual({
    username: "example-dev",
    cards: ["calendar", "languages"],
  });
  expect(stored.visibility.metrics).toBe(true);
  expect(stored.sectionOrder).toHaveLength(9);
  expect(stored).not.toHaveProperty("activitySnapshot");
  expect(JSON.stringify(stored)).not.toContain("fetchedAt");
  await page.reload();
  await expect(
    page.getByRole("checkbox", { name: cards[0], exact: true, includeHidden: true }),
  ).toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: cards[2], exact: true, includeHidden: true }),
  ).toBeChecked();
  expect(requests).toBe(1);
  await page.getByRole("checkbox", { name: cards[0], exact: true, includeHidden: true }).uncheck();
  const changed = await storedProfile(page);
  expect(changed.data.metrics.cards).toEqual(["languages"]);
  await expect(
    page.getByRole("checkbox", { name: cards[2], exact: true, includeHidden: true }),
  ).toBeChecked();
});

test("featured GitHub contributions are explicitly copied once and remain editable alongside manual notes", async ({
  page,
}) => {
  await stubActivity(page);
  await openEditor(page);
  await queryActivity(page);
  await expect(page.getByRole("textbox", { name: "Contribution title", exact: true })).toHaveCount(
    0,
  );
  await page.getByText("Choose from recent GitHub contributions", { exact: true }).click();
  const add = page.getByRole("button", {
    name: "Feature contribution: Clarify setup instructions",
    exact: true,
  });
  await add.click();
  const title = page.getByRole("textbox", { name: "Contribution title", exact: true });
  await expect(title).toBeFocused();
  await expect(title).toHaveValue("Clarify setup instructions");
  await expect(page.getByRole("textbox", { name: "Contribution link", exact: true })).toHaveValue(
    "https://github.com/example-community/useful-notebook/pull/12",
  );
  await expect(
    page.getByRole("button", {
      name: "Contribution already added: Clarify setup instructions",
      exact: true,
    }),
  ).toBeDisabled();
  await title.fill("My documentation contribution");
  await addManualContribution(page, "Answered community questions");
  const stored = await storedProfile(page);
  expect(stored.data.contributions.items).toHaveLength(2);
  expect(stored.data.contributions.items[0]?.title).toBe("My documentation contribution");
  expect(stored.data.metrics.cards).toEqual([]);
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
});

test("a delayed response from another username cannot replace the current account or enable its cards", async ({
  page,
}) => {
  let releaseFirst!: () => void;
  const held = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  let firstStarted = false;
  await page.route("**/api/github/activity?*", async (route) => {
    const username = new URL(route.request().url()).searchParams.get("username");
    if (username === "first-dev") {
      firstStarted = true;
      await held;
      await route
        .fulfill({ json: { success: true, data: snapshot("first-dev"), stale: false } })
        .catch(() => undefined);
    } else
      await route.fulfill({
        json: { success: true, data: snapshot("second-dev", true), stale: false },
      });
  });
  await openEditor(page);
  const username = page.getByRole("textbox", { name: "GitHub username", exact: true });
  await username.fill("first-dev");
  await page.getByRole("button", { name: "Check GitHub activity", exact: true }).click();
  await expect.poll(() => firstStarted).toBe(true);
  await username.fill("second-dev");
  await expect(
    page.getByRole("checkbox", { name: cards[0], exact: true, includeHidden: true }),
  ).toBeDisabled();
  await page.getByRole("button", { name: "Check GitHub activity", exact: true }).click();
  await expect(
    page.getByText("Checked @second-dev on Oct 19, 2026.", { exact: true }),
  ).toBeVisible();
  releaseFirst();
  await expect(page.getByText(/Checked @first-dev/)).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: cards[0], exact: true, includeHidden: true }),
  ).toBeEnabled();
  await username.fill("first-dev");
  await expect(page.getByText(/Checked @second-dev/)).toHaveCount(0);
  await expect(
    page.getByRole("checkbox", { name: cards[0], exact: true, includeHidden: true }),
  ).toBeDisabled();
});

test("legacy metrics alone use one editable section and preserve data when the whole section is hidden", async ({
  page,
}) => {
  await stubActivity(page);
  const profile = createEmptyProfile("en");
  profile.visibility.metrics = true;
  profile.data.metrics = { username: "example-dev", cards: ["calendar"] };
  await openEditor(page, profile);
  await showSectionOrganizer(page);
  const navigation = page.getByRole("navigation", {
    name: "Your sections",
    exact: true,
    includeHidden: true,
  });
  await expect(navigation.getByRole("checkbox", { includeHidden: true })).toHaveCount(5);
  const choice = navigation.getByRole("checkbox", {
    name: activityLabel,
    exact: true,
    includeHidden: true,
  });
  await expect(choice).toBeChecked();
  await expect(page.getByRole("textbox", { name: "GitHub username", exact: true })).toHaveValue(
    "example-dev",
  );
  await choice.uncheck();
  const hidden = await storedProfile(page);
  expect(hidden.visibility.contributions).toBe(false);
  expect(hidden.visibility.metrics).toBe(false);
  expect(hidden.data.metrics).toEqual(profile.data.metrics);
  expect(hidden.sectionOrder).toEqual(profile.sectionOrder);
  await expect(page.getByText("Not included in README", { exact: true })).toBeVisible();
  await choice.check();
  const restored = await storedProfile(page);
  expect(restored.visibility.contributions).toBe(true);
  expect(restored.visibility.metrics).toBe(true);
  expect(restored.data.metrics).toEqual(profile.data.metrics);
});

test("local card previews block export until cards are explicitly excluded, preserving manual contributions", async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.APP_URL),
    "This case covers an instance without a configured public origin.",
  );
  await stubActivity(page);
  await openEditor(page);
  await addManualContribution(page, "A useful guide for new contributors");
  await queryActivity(page);
  await page.getByRole("checkbox", { name: cards[0], exact: true, includeHidden: true }).check();
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.locator("img")).toHaveCount(1);
  await expect(preview).toContainText("A useful guide for new contributors");
  await expect(page.getByRole("button", { name: "Copy README", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
  await page
    .getByRole("button", { name: "Exclude GitHub cards and keep their settings", exact: true })
    .click();
  await expect(preview.locator("img")).toHaveCount(0);
  await expect(preview.getByRole("heading", { name: "Contributions", exact: true })).toBeVisible();
  const saved = await storedProfile(page);
  expect(saved.visibility.metrics).toBe(false);
  expect(saved.data.metrics).toEqual({ username: "example-dev", cards: ["calendar"] });
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download README", exact: true }).click();
  const path = await (await event).path();
  if (!path) throw new Error("The generated README must be available locally.");
  const markdown = await readFile(path, "utf8");
  expect(markdown).toContain("A useful guide for new contributors");
  expect(markdown).not.toContain("/api/github/");
});

test("restoring one excluded card does not restore others and hidden sections keep card choices editable", async ({
  page,
}) => {
  test.skip(
    Boolean(process.env.APP_URL),
    "This case covers the explicit exclusion action on a local preview.",
  );
  await stubActivity(page);
  const profile = createEmptyProfile("en");
  profile.visibility.contributions = true;
  profile.visibility.metrics = true;
  profile.data.metrics = { username: "example-dev", cards: ["calendar", "summary"] };
  profile.data.contributions.items = [
    { id: "manual-guide", title: "A useful community guide", description: "", url: "" },
  ];
  await openEditor(page, profile);
  await queryActivity(page);
  await page
    .getByRole("button", { name: "Exclude GitHub cards and keep their settings", exact: true })
    .click();
  const excluded = await storedProfile(page);
  expect(excluded.data.metrics.cards).toEqual(["calendar", "summary"]);
  expect(excluded.visibility.metrics).toBe(false);
  for (const name of cards)
    await expect(
      page.getByRole("checkbox", { name, exact: true, includeHidden: true }),
    ).not.toBeChecked();

  await page
    .getByRole("checkbox", { name: "Contribution calendar", exact: true, includeHidden: true })
    .check();
  const selected = await storedProfile(page);
  expect(selected.data.metrics.cards).toEqual(["calendar"]);
  expect(selected.visibility.metrics).toBe(true);
  await expect(
    page.getByRole("checkbox", { name: "Activity summary", exact: true, includeHidden: true }),
  ).not.toBeChecked();

  await showSectionOrganizer(page);
  const section = page
    .getByRole("navigation", { name: "Your sections", exact: true, includeHidden: true })
    .getByRole("checkbox", { name: activityLabel, exact: true, includeHidden: true });
  await section.uncheck();
  await expect(page.getByText("Not included in README", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("checkbox", { name: "Contribution calendar", exact: true, includeHidden: true }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", { name: "Contribution calendar", exact: true, includeHidden: true })
    .uncheck();
  await page
    .getByRole("checkbox", { name: "Activity summary", exact: true, includeHidden: true })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "Activity summary", exact: true, includeHidden: true }),
  ).toBeChecked();
  await expect(section).not.toBeChecked();
  const editedWhileHidden = await storedProfile(page);
  expect(editedWhileHidden.data.metrics.cards).toEqual(["summary"]);
  expect(editedWhileHidden.visibility.contributions).toBe(false);
  expect(editedWhileHidden.visibility.metrics).toBe(false);
  expect(editedWhileHidden.data.contributions).toEqual(profile.data.contributions);

  await section.check();
  const restored = await storedProfile(page);
  expect(restored.visibility.contributions).toBe(true);
  expect(restored.visibility.metrics).toBe(true);
  expect(restored.data.metrics.cards).toEqual(["summary"]);
  await expect(
    page.getByRole("checkbox", { name: "Contribution calendar", exact: true, includeHidden: true }),
  ).not.toBeChecked();
  await expect(
    page.getByRole("checkbox", { name: "Activity summary", exact: true, includeHidden: true }),
  ).toBeChecked();
  expect(restored.sectionOrder).toEqual(profile.sectionOrder);
});

for (const locale of ["en", "es"] as const) {
  test(`accessibility: ${locale} activity and featured contributions fit 360px in both themes`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 360, height: 800 });
    await stubActivity(page);
    await openEditor(page, undefined, locale);
    if (locale === "en") {
      await queryActivity(page);
      await page
        .getByRole("checkbox", { name: cards[0], exact: true, includeHidden: true })
        .check();
      await addManualContribution(page, "A helpful community guide");
    } else {
      await page
        .getByRole("textbox", { name: "Usuario de GitHub", exact: true })
        .fill("example-dev");
      await page
        .getByRole("button", { name: "Consultar actividad de GitHub", exact: true })
        .click();
      await expect(
        page.getByRole("checkbox", {
          name: "Calendario de contribuciones",
          exact: true,
          includeHidden: true,
        }),
      ).toBeEnabled();
      await page
        .getByRole("checkbox", {
          name: "Calendario de contribuciones",
          exact: true,
          includeHidden: true,
        })
        .check();
      await page.getByRole("button", { name: "Agregar contribución", exact: true }).click();
      await page
        .getByRole("textbox", { name: "Título de la contribución", exact: true })
        .fill("Una guía útil para la comunidad");
    }
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
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
        .analyze();
      expect(result.violations).toEqual([]);
    }
    await showPreview(page, locale);
    await expect(
      page
        .getByRole("article", {
          name: locale === "en" ? "README preview" : "Vista previa del README",
          exact: true,
        })
        .locator("img"),
    ).toHaveCount(1);
    await expect
      .poll(() =>
        page
          .getByRole("article", {
            name: locale === "en" ? "README preview" : "Vista previa del README",
            exact: true,
          })
          .locator("img")
          .evaluateAll((images) =>
            images.every(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            ),
          ),
      )
      .toBe(true);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth),
    ).toBe(false);
    const previewA11y = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(previewA11y.violations).toEqual([]);
    if (locale === "es")
      await page.screenshot({ path: "work/previews/activity-mobile.png", fullPage: true });
  });
}

test("desktop activity keeps the five-section layout with fictional charts and a featured contribution", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await stubActivity(page);
  await openEditor(page);
  await queryActivity(page);
  for (const name of cards)
    await page.getByRole("checkbox", { name, exact: true, includeHidden: true }).check();
  await addManualContribution(page, "A useful guide for new contributors");
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.locator("img")).toHaveCount(3);
  await expect
    .poll(() =>
      preview
        .locator("img")
        .evaluateAll((images) =>
          images.every(
            (image) =>
              (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0,
          ),
        ),
    )
    .toBe(true);
  await expect(
    page
      .getByRole("navigation", { name: "Your sections", exact: true, includeHidden: true })
      .getByRole("checkbox", { includeHidden: true }),
  ).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)).toBe(
    false,
  );
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.locator("#editor-section-title")).toBeInViewport();
  await expect(
    page.getByRole("navigation", { name: "Your sections", exact: true, includeHidden: true }),
  ).toBeInViewport();
  await expect(preview).toBeInViewport();
  await page.screenshot({ path: "work/previews/activity-desktop.png", fullPage: true });
});
