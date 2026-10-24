import { expect, test, type APIResponse, type Page } from "@playwright/test";
import { parseActivityCardUrl } from "../../src/core/activity";
import { extendedStatIds } from "../../src/core/activity/extended-options";
import { parseResourceCardUrl, resourceCardUrl } from "../../src/core/activity/resource-urls";
import { metricCardIds } from "../../src/core/profile/module-content";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import { parseProfileDocument } from "../../src/core/profile/profile-validation";
import type { ContentLocale } from "../../src/core/profile/profile-schema";
import { generateReadme } from "../../src/core/readme";

// This synthetic export origin is checked, never contacted. Real HTTP requests below
// address an isolated local Next server with guarded, fabricated upstream fixtures.
// A successful local run does not establish public reachability or GitHub Camo behavior.
const publicOrigin = "https://profiles.example.com";
const title = "Local <fixture> & public";
const targets = ["fixture-dev/sample", "abcdef1234567890", "fixture-coder"] as const;

function exportedCards(locale: ContentLocale, columns: 1 | 2 = 1) {
  const document = createEmptyProfile(locale);
  document.visibility.metrics = true;
  document.data.metrics = {
    username: "@Fixture-Dev",
    cards: [...metricCardIds],
    cardColumns: columns,
    appearance: {
      theme: "dark",
      palette: "violet",
      design: "panels",
      width: 840,
      customTitle: title,
      showIcons: true,
      backgroundGradient: { angle: 90, colors: ["#102030", "#203040"] },
    },
    extended: {
      stats: { items: [...extendedStatIds], showRank: true, rankIcon: "letter" },
      languages: { layout: "donut", count: 2, format: "bytes" },
      repositories: [targets[0]],
      gists: [targets[1]],
      wakatimeUsername: targets[2],
      resourceOptions: {
        contributionUsername: "fixture-dev",
        contributionStats: ["authoredPullRequests", "commentedIssues"],
        showOwner: true,
        descriptionLines: 3,
        displayFormat: "percent",
      },
    },
  };
  expect(parseProfileDocument(document).success).toBe(true);
  const result = generateReadme(document, { activityCardBaseUrl: publicOrigin });
  expect(result.success).toBe(true);
  if (!result.success) throw new Error("The export fixture must be a valid profile.");
  expect(result.exportIssues).toBeUndefined();
  expect(result.activityCards).toHaveLength(10);
  return { ...result, urls: result.activityCards! };
}

function localPath(value: string) {
  const url = new URL(value);
  expect(url.origin).toBe(publicOrigin);
  return `${url.pathname}${url.search}`;
}

function assertPublicHeaders(response: APIResponse, state: "ready" | "unavailable" = "ready") {
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers["content-type"]).toMatch(/^image\/svg\+xml;\s*charset=utf-8$/i);
  expect(headers["cache-control"]).toBe(
    state === "ready"
      ? "public, max-age=300, s-maxage=1800, stale-if-error=86400"
      : "public, max-age=60, s-maxage=60",
  );
  expect(headers["x-activity-state"]).toBe(state);
  expect(headers["content-security-policy"]).toBe("default-src 'none'; style-src 'none'; sandbox");
  expect(headers["x-content-type-options"]).toBe("nosniff");
  expect(headers["set-cookie"]).toBeUndefined();
  expect(headers["www-authenticate"]).toBeUndefined();
  expect(headers.location).toBeUndefined();
  expect(headers.vary ?? "").not.toMatch(/authorization|cookie/i);
  expect(JSON.stringify(headers)).not.toContain("fixture-public-token");
}

async function assertPassiveSvg(page: Page, source: string, locale: ContentLocale, width = 840) {
  expect(source).not.toMatch(
    /<!DOCTYPE|<!ENTITY|<script|<foreignObject|<image|<iframe|<object|<embed|<style|<a\s/i,
  );
  expect(source).not.toMatch(
    /fixture-public-token|PRIVATE_RAW_FIXTURE_MUST_NOT_ESCAPE|gist\.githubusercontent|authorization|isViewer|userViewType/i,
  );
  const parsed = await page.evaluate((xml) => {
    const document = new DOMParser().parseFromString(xml, "image/svg+xml");
    const root = document.documentElement;
    const tags = [
      "svg",
      "title",
      "desc",
      "rect",
      "g",
      "path",
      "text",
      "tspan",
      "circle",
      "line",
      "polyline",
      "polygon",
      "defs",
      "linearGradient",
      "stop",
      "clipPath",
    ];
    const unsafe: string[] = [];
    for (const node of document.querySelectorAll("*")) {
      if (!tags.includes(node.localName) || node.namespaceURI !== "http://www.w3.org/2000/svg")
        unsafe.push(node.localName);
      for (const attribute of node.attributes) {
        if (/^on|^(?:href|src|style)$/i.test(attribute.localName)) unsafe.push(attribute.name);
        if (/url\(/i.test(attribute.value) && !/^url\(#[a-z\d-]+\)$/i.test(attribute.value))
          unsafe.push(attribute.value);
      }
    }
    return {
      errors: document.querySelectorAll("parsererror").length,
      name: root.localName,
      namespace: root.namespaceURI,
      width: Number(root.getAttribute("width")),
      height: Number(root.getAttribute("height")),
      viewBox: root.getAttribute("viewBox"),
      locale: root.getAttribute("lang"),
      role: root.getAttribute("role"),
      title: document.querySelector("title")?.textContent,
      description: document.querySelector("desc")?.textContent,
      text: document.documentElement.textContent,
      unsafe,
    };
  }, source);
  expect(parsed.errors).toBe(0);
  expect(parsed.name).toBe("svg");
  expect(parsed.namespace).toBe("http://www.w3.org/2000/svg");
  expect(parsed.width).toBe(width);
  expect(parsed.height).toBeGreaterThan(0);
  expect(Number.isFinite(parsed.height)).toBe(true);
  expect(parsed.viewBox).toBe(`0 0 ${width} ${parsed.height}`);
  expect(parsed.locale).toBe(locale);
  expect(parsed.role).toBe("img");
  expect(parsed.title).toBeTruthy();
  expect(parsed.description).toBeTruthy();
  expect(parsed.unsafe).toEqual([]);
  return parsed;
}

for (const locale of ["en", "es"] as const) {
  test(`exports the exact ten public HTTPS image and link URLs in ${locale}`, () => {
    const result = exportedCards(locale);
    const images = [
      ...result.markdown.matchAll(
        /\[!\[([^\]]+)\]\((https:\/\/[^\s)]+)\)\]\((https:\/\/[^\s)]+)\)/g,
      ),
    ];
    expect(images).toHaveLength(10);
    expect(images.map((image) => image[2])).toEqual(result.urls);
    expect(images.map((image) => image[3])).toEqual(result.urls);
    expect(images.every((image) => image[1]!.length > 0)).toBe(true);
    expect(result.markdown).not.toMatch(
      /blob:|127\.0\.0\.1|localhost|fixture-public-token|fetchedAt|indexedDB|snapshot/i,
    );
    for (const [index, value] of result.urls.entries()) {
      const url = new URL(value);
      expect(url.origin).toBe(publicOrigin);
      expect(url.searchParams.get("locale")).toBe(locale);
      expect(url.searchParams.get("customTitle")).toBe(title);
      expect(url.searchParams.get("width")).toBe("840");
      expect(url.username).toBe("");
      expect(url.password).toBe("");
      if (index < 7) {
        expect(url.pathname).toBe(`/cards/github/fixture-dev/${metricCardIds[index]}.svg`);
        const parsed = parseActivityCardUrl(value, publicOrigin);
        expect(parsed?.username).toBe("fixture-dev");
        expect(parsed?.card).toBe(metricCardIds[index]);
        if (parsed?.card === "extended-stats")
          expect(parsed.extended?.stats?.items).toEqual(extendedStatIds);
        if (parsed?.card === "extended-languages")
          expect(parsed.extended?.languages).toEqual({
            layout: "donut",
            count: 2,
            format: "bytes",
          });
      } else {
        const kind = ["repository", "gist", "wakatime"][index - 7];
        expect(url.pathname).toBe(`/cards/extended/${kind}.svg`);
        expect(url.searchParams.get("target")).toBe(targets[index - 7]);
        expect(parseResourceCardUrl(value, publicOrigin)?.options?.contributionStats).toEqual([
          "authoredPullRequests",
          "commentedIssues",
        ]);
      }
    }
    expect(images[0]![1]).toContain(locale === "es" ? "Calendario" : "contribution calendar");
  });
}

test.describe("anonymous real /cards routes with local-only provider fixtures", () => {
  test.skip(
    process.env.EXPORTED_ACTIVITY_FIXTURES !== "1",
    "Requires the isolated, guarded provider fixture server; never use real credentials.",
  );

  test("checks the exact two-column exported images through the real export endpoint", async ({
    request,
  }) => {
    const sources = exportedCards("en", 2).urls.filter((value) =>
      /\/(extended-stats|extended-languages)\.svg\?/.test(value),
    );
    expect(sources).toHaveLength(2);
    const response = await request.post("/api/cards/export-check", { data: { sources } });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ status: "ready", stale: false });
    expect(response.headers()["cache-control"]).toBe("no-store");
    const invalid = await request.post("/api/cards/export-check", {
      data: { sources: [sources[0]!.replace(publicOrigin, "https://other.example.com")] },
    });
    expect(invalid.status()).toBe(400);
    expect(await invalid.json()).toEqual({ status: "failed", reason: "invalid_request" });
  });

  for (const locale of ["en", "es"] as const) {
    test(`serves ten passive XML SVG families anonymously and decodes them as images in ${locale}`, async ({
      request,
      page,
      baseURL,
    }) => {
      expect((await request.storageState()).cookies).toEqual([]);
      const urls = exportedCards(locale).urls;
      for (const value of urls) {
        const response = await request.get(localPath(value), {
          headers: { Accept: "image/svg+xml" },
          maxRedirects: 0,
        });
        assertPublicHeaders(response);
        const parsed = await assertPassiveSvg(page, await response.text(), locale);
        expect(parsed.text).not.toContain(
          locale === "es"
            ? "Los datos públicos no están disponibles"
            : "Public data is not available",
        );
      }

      // Only the empty harness is fulfilled. All image requests use actual Next routes.
      await page.route("**/exported-card-harness", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: "<!doctype html><html lang='en'><body></body></html>",
        }),
      );
      await page.goto("/exported-card-harness");
      const sentHeaders: Record<string, string>[] = [];
      page.on("request", (request) => {
        if (new URL(request.url()).pathname.startsWith("/cards/"))
          sentHeaders.push(request.headers());
      });
      await page.evaluate(
        ({ paths, origin }) => {
          for (const [index, path] of paths.entries()) {
            const image = document.createElement("img");
            image.alt = `Exported card ${index + 1}`;
            image.src = new URL(path, origin).href;
            document.body.append(image);
          }
        },
        { paths: urls.map(localPath), origin: baseURL! },
      );
      await expect(page.getByRole("img")).toHaveCount(10);
      await expect
        .poll(() =>
          page
            .getByRole("img")
            .evaluateAll((images) =>
              images.every(
                (image) =>
                  image instanceof HTMLImageElement &&
                  image.complete &&
                  image.naturalWidth === 840 &&
                  image.naturalHeight > 0,
              ),
            ),
        )
        .toBe(true);
      expect(sentHeaders).toHaveLength(10);
      for (const headers of sentHeaders) {
        expect(headers.authorization).toBeUndefined();
        expect(headers.cookie).toBeUndefined();
      }
    });
  }

  test("preserves a public repository when its optional contribution author is unavailable", async ({
    request,
    page,
  }) => {
    const url = resourceCardUrl(
      "repository",
      "fixture-dev/sample",
      "en",
      publicOrigin,
      { width: 840 },
      {
        contributionUsername: "missing-fixture",
        contributionStats: ["authoredPullRequests", "commentedIssues"],
        showOwner: true,
        descriptionLines: 3,
      },
    );
    expect(url).not.toBeNull();
    const response = await request.get(localPath(url!), { maxRedirects: 0 });
    assertPublicHeaders(response);
    const source = await response.text();
    const parsed = await assertPassiveSvg(page, source, "en");
    expect(parsed.text).toContain("fixture-dev/sample");
    expect(parsed.text).toContain("Stars");
    expect(parsed.text).toContain("Public data is not available.");
    expect(parsed.text).toContain("—");
    expect(source).toContain("&lt;script&gt;");
    expect(source).not.toContain('<script>alert("fixture")</script>');
  });

  test("returns a cacheable unavailable SVG rather than invented zeroes for an unknown profile", async ({
    request,
    page,
  }) => {
    const response = await request.get("/cards/github/missing-fixture/summary.svg?locale=es", {
      maxRedirects: 0,
    });
    assertPublicHeaders(response, "unavailable");
    const parsed = await assertPassiveSvg(page, await response.text(), "es", 700);
    expect(parsed.text).toContain("no están disponibles");
  });

  const invalidPaths = [
    "/cards/github/not_a_user/summary.svg?locale=en",
    "/cards/github/fixture-dev/unknown.svg?locale=en",
    "/cards/github/fixture-dev/summary.svg?locale=fr",
    "/cards/github/fixture-dev/summary.svg?locale=en&locale=es",
    "/cards/github/fixture-dev/summary.svg?locale=en&host=https%3A%2F%2Fevil.example.com",
    "/cards/github/fixture-dev/summary.svg?locale=en&token=forbidden-test-value",
    "/cards/github/fixture-dev/summary.svg?locale=en&textColor=url%28javascript%3Aalert%281%29%29",
    "/cards/github/fixture-dev/extended-stats.svg?locale=en&stats=%7Bbroken",
    "/cards/github/fixture-dev/summary.svg?locale=en&stats=%7B%22items%22%3A%5B%22stars%22%5D%7D",
    "/cards/extended/repository.svg?locale=en&target=https%3A%2F%2Fevil.example.com%2Frepo",
    "/cards/extended/gist.svg?locale=en&target=abcdef1234567890&target=abcdef1234567890",
    "/cards/extended/wakatime.svg?locale=en&target=current",
    "/cards/extended/repository.svg?locale=en&target=fixture-dev%2Fsample&options=%7B%22contributionStats%22%3A%5B%22authoredIssues%22%5D%7D",
  ];
  for (const [index, path] of invalidPaths.entries()) {
    test(`rejects invalid export input ${index + 1} before rendering`, async ({ request }) => {
      const response = await request.get(path, { maxRedirects: 0 });
      expect(response.status()).toBe(400);
      expect(response.headers()["content-type"]).not.toContain("image/svg+xml");
      expect(response.headers().location).toBeUndefined();
      expect(await response.text()).not.toMatch(
        /<svg|<html|fixture-public-token|forbidden-test-value/i,
      );
    });
  }
});
