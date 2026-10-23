import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { getPublicPageAlternates, getPublicSiteSitemap } from "./public-site-metadata";
import { getPublicSiteOrigin, isPublicIndexingEnabled } from "./public-site-origin";

const environmentKeys = [
  "APP_URL",
  "VERCEL_ENV",
  "VERCEL_PROJECT_PRODUCTION_URL",
  "NODE_ENV",
  "PUBLIC_SITE_INDEXING_ENABLED",
] as const;

describe("public site origin and indexing", () => {
  beforeEach(() => {
    for (const key of environmentKeys) vi.stubEnv(key, undefined);
  });

  afterEach(() => vi.unstubAllEnvs());

  it("normalizes an explicit public origin and does not fall back from an invalid one", () => {
    vi.stubEnv("APP_URL", " https://profiles.example.com/ ");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "stable.example.com");
    expect(getPublicSiteOrigin()).toBe("https://profiles.example.com");

    vi.stubEnv("APP_URL", "http://localhost:3000");
    expect(getPublicSiteOrigin()).toBeUndefined();
  });

  it("uses only the stable Vercel project domain in Production", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("VERCEL_PROJECT_PRODUCTION_URL", "profiles.example.com");
    expect(getPublicSiteOrigin()).toBe("https://profiles.example.com");

    vi.stubEnv("VERCEL_ENV", "preview");
    expect(getPublicSiteOrigin()).toBeUndefined();
  });

  it("indexes Vercel Production and explicitly opted-in self-hosted production only", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(isPublicIndexingEnabled()).toBe(true);

    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("PUBLIC_SITE_INDEXING_ENABLED", "true");
    expect(isPublicIndexingEnabled()).toBe(false);

    vi.stubEnv("VERCEL_ENV", undefined);
    vi.stubEnv("NODE_ENV", "development");
    expect(isPublicIndexingEnabled()).toBe(false);

    vi.stubEnv("NODE_ENV", "production");
    expect(isPublicIndexingEnabled()).toBe(true);
  });

  it("builds canonical and language alternates for each public page in both locales", () => {
    vi.stubEnv("APP_URL", "https://profiles.example.com");
    vi.stubEnv("VERCEL_ENV", "production");

    expect(getPublicPageAlternates("es", "privacy")).toEqual({
      canonical: "https://profiles.example.com/es/privacy",
      languages: {
        en: "https://profiles.example.com/en/privacy",
        es: "https://profiles.example.com/es/privacy",
      },
    });
  });

  it("lists only localized home, About, and Privacy pages in the public sitemap", () => {
    vi.stubEnv("APP_URL", "https://profiles.example.com");
    vi.stubEnv("VERCEL_ENV", "production");

    const sitemap = getPublicSiteSitemap();
    expect(sitemap.map(({ url }) => url)).toEqual([
      "https://profiles.example.com/en",
      "https://profiles.example.com/es",
      "https://profiles.example.com/en/about",
      "https://profiles.example.com/es/about",
      "https://profiles.example.com/en/privacy",
      "https://profiles.example.com/es/privacy",
    ]);
    expect(sitemap[2]?.alternates?.languages).toEqual({
      en: "https://profiles.example.com/en/about",
      es: "https://profiles.example.com/es/about",
    });
  });

  it("omits canonicals and sitemap entries outside an enabled production environment", () => {
    vi.stubEnv("APP_URL", "https://preview.example.com");
    vi.stubEnv("VERCEL_ENV", "preview");

    expect(getPublicPageAlternates("en", "home")).toBeUndefined();
    expect(getPublicSiteSitemap()).toEqual([]);
  });
});
