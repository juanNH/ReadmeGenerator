import { fillCodeSource, showSectionOrganizer } from "./editor-test-helpers";
import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";
import { generateReadme } from "../../src/core/readme";

const draftKey = "github-profile-generator.profile.v2";
const imageOrigin = "https://images.example.com";
const source = `<h1 align="center">A little playground</h1>
<p align="center">Things I enjoy building and exploring.</p>
<p align="center">
  <a href="https://example.com/notes"><img src="${imageOrigin}/badge.svg" alt="Read my notes" width="120" height="28"></a>
  <br>
  <img src="${imageOrigin}/garden.svg" alt="A green garden of ideas" width="100%">
</p>
<table>
  <caption>Current experiments</caption>
  <thead><tr><th scope="col">Building</th><th scope="col">Exploring</th></tr></thead>
  <tbody><tr><td>Small tools</td><td>Accessible interfaces</td></tr></tbody>
</table>
<details>
  <summary>A little more about me</summary>

  <p>**These stars stay literal.**</p>
  <p>I learn by making and sharing.</p>
</details>
<pre><code>&lt;div&gt;Hello&lt;/div&gt;
Keep this second line.</code></pre>`;
const banner =
  '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="160"><rect width="800" height="160" rx="12" fill="#173e34"/><circle cx="710" cy="80" r="45" fill="#8ce5be"/><text x="35" y="90" fill="#eafff5" font-family="sans-serif" font-size="30">A little playground</text></svg>';

async function mockImages(page: Page) {
  await page.route(`${imageOrigin}/**`, async (route) => {
    if (route.request().url().includes("missing"))
      await route.fulfill({ status: 404, body: "Unavailable" });
    else await route.fulfill({ status: 200, contentType: "image/svg+xml", body: banner });
  });
}

function htmlProfile(html = source, locale: "en" | "es" = "en"): ProfileDocument {
  const profile = createEmptyProfile(locale);
  profile.customSections = [
    {
      id: "my-corner",
      title: "My corner",
      visible: true,
      blocks: [{ id: "html-source", type: "html", source: html }],
    },
  ];
  profile.sectionOrder.unshift({ kind: "custom", sectionId: "my-corner" });
  return profile;
}

async function openEditor(page: Page, profile: ProfileDocument, locale: "en" | "es" = "en") {
  await page.goto(`/${locale}`);
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(profile),
  });
  await page.goto(`/${locale}/editor`);
  await expect(
    page.getByRole("textbox", { name: locale === "en" ? "HTML code" : "Código HTML", exact: true }),
  ).toBeEnabled();
}

async function storedProfile(page: Page): Promise<ProfileDocument> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), draftKey);
}

async function downloadReadme(page: Page) {
  const event = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download README", exact: true }).click();
  const path = await (await event).path();
  if (!path) throw new Error("Missing README download");
  return readFile(path, "utf8");
}

test("HTML layouts, linked images, tables and details share one safe preview, clipboard and download", async ({
  page,
  context,
}) => {
  await page.setViewportSize({ width: 1600, height: 1100 });
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await mockImages(page);
  const requests: { url: string; referer?: string }[] = [];
  page.on("request", (request) => {
    if (request.url().startsWith(imageOrigin))
      requests.push({ url: request.url(), referer: request.headers().referer });
    expect(request.url()).not.toContain("/_next/image?");
  });
  const profile = htmlProfile();
  profile.visibility.presentation = true;
  profile.data.presentation.displayName = "After the HTML block";
  await openEditor(page, profile);
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  const heading = preview.getByRole("heading", {
    name: "A little playground",
    exact: true,
    level: 4,
  });
  await expect(heading).toHaveCSS("text-align", "center");
  await expect(
    preview.getByRole("heading", { name: "After the HTML block", level: 3, exact: true }),
  ).toBeVisible();
  const image = preview.getByRole("img", { name: "A green garden of ideas", exact: true });
  await image.scrollIntoViewIfNeeded();
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
  await expect(image).toHaveAttribute("width", "100%");
  await expect(image).toHaveAttribute("loading", "lazy");
  await expect(image).toHaveAttribute("referrerpolicy", "no-referrer");
  const badge = preview.getByRole("img", { name: "Read my notes", exact: true });
  await expect(badge).toHaveAttribute("height", "28");
  await expect(preview.getByRole("link", { name: "Read my notes", exact: true })).toHaveAttribute(
    "href",
    "https://example.com/notes",
  );
  await expect(
    preview.getByRole("table", { name: "Current experiments", exact: true }),
  ).toBeVisible();
  await expect(
    preview.getByRole("cell", { name: "Accessible interfaces", exact: true }),
  ).toBeVisible();
  const summary = preview.getByText("A little more about me", { exact: true });
  await summary.focus();
  await summary.press("Enter");
  await expect(preview.getByText("**These stars stay literal.**", { exact: true })).toBeVisible();
  await expect(preview.locator("pre")).toHaveText("<div>Hello</div>\nKeep this second line.");
  const result = generateReadme(await storedProfile(page));
  if (!result.success) throw new Error("Expected valid HTML README");
  const readme = await downloadReadme(page);
  expect(readme).toBe(result.markdown);
  expect(readme).toContain('<h1 align="center">A little playground</h1>');
  expect(readme).toContain("<table>");
  expect(readme).toContain("&#10;");
  const htmlFragment = result.customHtml?.find(({ html }) => html.includes("A little playground"));
  expect(htmlFragment).toBeDefined();
  expect(readme.slice(htmlFragment!.start, htmlFragment!.end)).toBe(htmlFragment!.html);
  await page.getByRole("button", { name: "Copy README", exact: true }).click();
  expect((await page.evaluate(() => navigator.clipboard.readText())).replace(/\r\n/g, "\n")).toBe(
    readme,
  );
  expect((await storedProfile(page)).customSections[0]!.blocks[0]).toEqual({
    id: "html-source",
    type: "html",
    source,
  });
  expect(await storedProfile(page)).not.toHaveProperty("customHtml");
  expect(requests.length).toBeGreaterThan(0);
  expect(requests.every((request) => request.referer === undefined)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  await page.screenshot({ path: "work/previews/custom-html-en-desktop.png", fullPage: true });
});

test("unsupported HTML never executes, loads resources or alters the original source", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const attack = `<p id="owned" class="owned" style="background:url(https://attack.example.com/css)" onmouseover="window.htmlExecuted=true">Keep this thought</p><style>body{display:none}</style><script src="https://attack.example.com/script.js">window.htmlExecuted=true</script><iframe src="https://attack.example.com/frame"></iframe><form action="https://attack.example.com/form"><input autofocus></form><svg><image href="https://attack.example.com/svg"></image></svg><!-- a private comment --><p>After unsupported content</p>`;
  const requests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("attack.example.com")) requests.push(request.url());
  });
  await openEditor(page, htmlProfile(attack));
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(preview.getByText("Keep this thought", { exact: true })).toBeVisible();
  await preview.getByText("Keep this thought", { exact: true }).hover();
  await expect(preview.getByText("After unsupported content", { exact: true })).toBeVisible();
  await expect(
    preview.locator("script,style,iframe,svg,form,input,[id=owned],[class=owned],[onmouseover]"),
  ).toHaveCount(0);
  expect(await page.evaluate(() => "htmlExecuted" in window)).toBe(false);
  await expect(
    page.getByRole("list", { name: "Changes in supported HTML", exact: true }),
  ).toContainText("removed");
  const exported = await downloadReadme(page);
  expect(exported).not.toContain("attack.example.com");
  expect(exported).not.toContain("htmlExecuted");
  expect(exported).not.toContain("private comment");
  expect((await storedProfile(page)).customSections[0]!.blocks[0]).toMatchObject({
    source: attack,
  });
  expect(requests).toEqual([]);
});

test("HTML errors focus the code field and hidden blocks preserve invalid URLs without requests", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  const profile = htmlProfile("<p>Start here</p>");
  profile.visibility.presentation = true;
  profile.data.presentation.displayName = "A short profile";
  const requests: string[] = [];
  page.on("request", (request) => {
    if (
      /127\.0\.0\.1.*private|attack\.example\.com|\/assets\/private|never-request\.svg/.test(
        request.url(),
      )
    )
      requests.push(request.url());
  });
  await openEditor(page, profile);
  const code = page.getByRole("textbox", { name: "HTML code", exact: true });
  for (const invalid of [
    '<p><a href="jav&#x61;script:alert(1)">Bad link</a></p>',
    '<img src="https://127.0.0.1/private.svg" alt="Private image">',
    '<img src="/assets/private.svg" alt="Relative image">',
    `<img src="${imageOrigin}/never-request.svg">`,
    "<details><p>A summary is missing</p></details>",
  ]) {
    await fillCodeSource(code, invalid);
    await expect(code).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeDisabled();
    await expect(page.getByRole("list", { name: "HTML problems", exact: true })).not.toBeEmpty();
  }
  await showSectionOrganizer(page);
  await page.getByRole("checkbox", { name: "About you", exact: true, includeHidden: true }).check();
  await showSectionOrganizer(page);
  await page.getByRole("button", { name: "About you", exact: true }).click();
  await showSectionOrganizer(page);
  await page.getByRole("button", { name: "Review fields in My corner", exact: true }).click();
  await expect(code).toBeFocused();
  await showSectionOrganizer(page);
  await page
    .getByRole("checkbox", { name: "My corner", exact: true, includeHidden: true })
    .uncheck();
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  expect(await downloadReadme(page)).not.toContain("details");
  await showSectionOrganizer(page);
  await page.getByRole("checkbox", { name: "My corner", exact: true, includeHidden: true }).check();
  await fillCodeSource(code, "<p>Now valid.</p>");
  await expect(page.getByRole("button", { name: "Download README", exact: true })).toBeEnabled();
  expect(requests).toEqual([]);
});

test("failed linked HTML images avoid nested links and recover after changing their address", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await mockImages(page);
  let missingRequests = 0;
  page.on("request", (request) => {
    if (request.url().includes("missing.svg")) missingRequests += 1;
  });
  const broken = `<p><a href="https://example.com/notes"><img src="${imageOrigin}/missing.svg" alt="My notes" height="28"></a></p><p>Keep going.</p>`;
  await openEditor(page, htmlProfile(broken));
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  const code = page.getByRole("textbox", { name: "HTML code", exact: true });
  await expect(preview.getByText("This image could not be loaded", { exact: true })).toBeVisible();
  await expect(preview.locator("a a")).toHaveCount(0);
  await expect(preview.getByRole("link", { name: /My notes/ })).toHaveCount(1);
  expect(await downloadReadme(page)).toContain("missing.svg");
  const requestsBeforeEdit = missingRequests;
  await fillCodeSource(code, broken.replace("Keep going.", "Keep writing."));
  await expect(preview.getByText("Keep writing.", { exact: true })).toBeVisible();
  expect(missingRequests).toBe(requestsBeforeEdit);
  await fillCodeSource(code, broken.replace("missing.svg", "recovered.svg"));
  const image = preview.getByRole("img", { name: "My notes", exact: true });
  await expect
    .poll(() =>
      image.evaluate((element: HTMLImageElement) => element.complete && element.naturalWidth > 0),
    )
    .toBe(true);
  await expect(preview.getByText("This image could not be loaded", { exact: true })).toHaveCount(0);
});

test("accessibility: closed HTML branches preserve visible heading order and links contain no added focus stops", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await openEditor(
    page,
    htmlProfile(
      '<details><summary>More ideas</summary><h1>Hidden root</h1><h2>Hidden child</h2></details><h3>Visible heading</h3><a href="https://example.com/code"><pre>Open the project code</pre></a><a href="https://example.com/tools"><table><tbody><tr><td>Project tools</td></tr></tbody></table></a>',
    ),
  );
  const preview = page.getByRole("article", { name: "README preview", exact: true });
  await expect(
    preview.getByRole("heading", { name: "Visible heading", level: 4, exact: true }),
  ).toBeVisible();
  await expect(preview.locator("a [tabindex]")).toHaveCount(0);
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await preview.getByText("More ideas", { exact: true }).click();
  await expect(preview.getByRole("heading", { name: "Hidden child", exact: true })).toBeVisible();
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
});

for (const locale of ["en", "es"] as const) {
  for (const theme of ["light", "dark"] as const) {
    test(`accessibility: custom HTML controls, tables, images and details fit 360px in ${locale} ${theme}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 360, height: 900 });
      await page.emulateMedia({ colorScheme: theme });
      await mockImages(page);
      await openEditor(page, htmlProfile(source, locale), locale);
      await page
        .getByText(locale === "en" ? "Supported HTML" : "HTML compatible", { exact: true })
        .click();
      await page
        .getByText(locale === "en" ? "HTML examples" : "Ejemplos de HTML", { exact: true })
        .click();
      await page
        .getByText(locale === "en" ? "HTML exported" : "HTML exportado", { exact: true })
        .click();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `work/previews/custom-html-${locale}-${theme}-edit-mobile.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: locale === "en" ? "Preview" : "Vista previa", exact: true })
        .click();
      const image = page.getByRole("img", { name: "A green garden of ideas", exact: true });
      await image.scrollIntoViewIfNeeded();
      await expect
        .poll(() =>
          image.evaluate(
            (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
      const imageBox = await image.boundingBox();
      expect(imageBox!.x + imageBox!.width).toBeLessThanOrEqual(360);
      const summary = page.getByText("A little more about me", { exact: true });
      await summary.focus();
      await summary.press("Enter");
      await expect(page.getByText("I learn by making and sharing.", { exact: true })).toBeVisible();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
        true,
      );
      await page.screenshot({
        path: `work/previews/custom-html-${locale}-${theme}-preview-mobile.png`,
        fullPage: true,
      });
    });
  }
}
