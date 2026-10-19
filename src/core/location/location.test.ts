import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  countryCatalog,
  findCountryByIconUrl,
  formatCountryLocation,
  parseCountryLocation,
  searchCountries,
} from ".";

const flagsRoot = fileURLToPath(new URL("../../../public/country-flags/", import.meta.url));
const sourceCommit = "fe15c16e7463d0c66d6c5730e9d0e832438d98e1";

function country(code: string) {
  const result = countryCatalog.find((entry) => entry.code === code);
  if (!result) throw new Error(`Missing country: ${code}`);
  return result;
}

describe("country location catalog", () => {
  it("provides 249 distinct ISO alpha-2 countries and territories with static bilingual names", () => {
    expect(countryCatalog).toHaveLength(249);
    expect(new Set(countryCatalog.map((entry) => entry.code)).size).toBe(249);
    expect(new Set(countryCatalog.map((entry) => entry.flag)).size).toBe(249);
    expect(country("AR").name).toEqual({ en: "Argentina", es: "Argentina" });
    expect(country("ES").name).toEqual({ en: "Spain", es: "España" });
    expect(country("DE").name).toEqual({ en: "Germany", es: "Alemania" });
    for (const entry of countryCatalog) {
      expect(entry.code).toMatch(/^[A-Z]{2}$/);
      expect(entry.name.en.trim()).not.toBe("");
      expect(entry.name.es.trim()).not.toBe("");
      expect(entry.flag).toMatch(/^[\u{1F1E6}-\u{1F1FF}]{2}$/u);
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.name)).toBe(true);
    }
    expect(Object.isFrozen(countryCatalog)).toBe(true);
    expect(countryCatalog.some((entry) => entry.code === "EU")).toBe(false);
  });

  it("searches English, Spanish and exact ISO codes without accents or case sensitivity", () => {
    expect(searchCountries("españa", "en")[0]?.code).toBe("ES");
    expect(searchCountries("ESPANA", "es")[0]?.code).toBe("ES");
    expect(searchCountries("germany", "es")[0]?.code).toBe("DE");
    expect(searchCountries("Alemania", "en")[0]?.code).toBe("DE");
    expect(searchCountries("arg", "en")[0]?.code).toBe("AR");
    expect(searchCountries("arg", "es")[0]?.code).toBe("DZ");
    expect(searchCountries("  aR  ", "en")[0]?.code).toBe("AR");
    expect(searchCountries("cote", "en")[0]?.code).toBe("CI");
    expect(searchCountries("<img src=x>", "en")).toEqual([]);
  });

  it("limits suggestions and orders them by the requested static display name", () => {
    expect(searchCountries("", "en")).toHaveLength(8);
    expect(searchCountries("", "es", 3).map((entry) => entry.name.es)).toEqual([
      "Afganistán",
      "Albania",
      "Alemania",
    ]);
    expect(searchCountries("", "en", 0)).toEqual([]);
    expect(searchCountries("", "en", -1)).toEqual([]);
    expect(searchCountries("", "en", Number.NaN)).toEqual([]);
    expect(searchCountries("", "en", 2.9)).toHaveLength(2);
  });

  it("formats an explicit selection and round trips its country and text in the v1 string", () => {
    for (const entry of countryCatalog) {
      for (const locale of ["en", "es"] as const) {
        const value = formatCountryLocation(entry, locale);
        expect(value).toBe(`${entry.flag} ${entry.name[locale]}`);
        expect(parseCountryLocation(value)).toEqual({ country: entry, text: entry.name[locale] });
      }
    }
    expect(formatCountryLocation(country("AR"), "en")).toBe("🇦🇷 Argentina");
  });

  it("leaves free text, old locations and unsupported or incomplete flags unrecognized", () => {
    for (const value of [
      "",
      "Argentina",
      "Buenos Aires, Argentina",
      "AR",
      "Remote / worldwide",
      "🇦🇷 Remote",
      "🇦🇷 Buenos Aires, Argentina",
      "🇦🇷 Spain",
      "🇦🇷 argentina",
      "🇦🇷 Argentina ",
      "🇦🇷  Argentina",
      '🇦🇷 <img src="https://example.com/flag.svg">',
      " 🇦🇷 Argentina",
      "🇦🇷Argentina",
      "🇦🇷",
      "🇦🇷 ",
      "🇦🇷 \t",
      "🇿🇿 Unknown",
      "🇪🇺 Europe",
      "🇦 Argentina",
      "🇦🇷 Argentina\n",
      "🇦🇷 Argentina\nSpain",
    ]) {
      expect(parseCountryLocation(value), value).toBeNull();
    }
  });

  it("recognizes only exact fixed source URLs from the catalog", () => {
    for (const entry of countryCatalog) {
      const fileCode = entry.code.toLowerCase();
      expect(entry.iconPath).toBe(`/country-flags/${fileCode}.svg`);
      expect(entry.iconUrl).toBe(
        `https://raw.githubusercontent.com/lipis/flag-icons/${sourceCommit}/flags/4x3/${fileCode}.svg`,
      );
      expect(findCountryByIconUrl(entry.iconUrl)).toBe(entry);
      expect(findCountryByIconUrl(`${entry.iconUrl}?size=20`)).toBeUndefined();
      expect(findCountryByIconUrl(`${entry.iconUrl}#flag`)).toBeUndefined();
    }
    expect(findCountryByIconUrl("https://example.com/ar.svg")).toBeUndefined();
    expect(findCountryByIconUrl(country("AR").iconPath)).toBeUndefined();
  });

  it("ships exactly the catalog SVGs and keeps them passive without external resources", () => {
    const files = readdirSync(flagsRoot).filter((name) => name.endsWith(".svg"));
    expect(files.sort()).toEqual(
      countryCatalog.map((entry) => `${entry.code.toLowerCase()}.svg`).sort(),
    );
    for (const name of files) {
      const svg = readFileSync(
        new URL(`../../../public/country-flags/${name}`, import.meta.url),
        "utf8",
      );
      expect(svg, name).toMatch(/^<svg\s/);
      expect(svg, name).not.toMatch(
        /<(?:script|foreignObject|iframe|image|style|animate\w*|set|a)\b|<!DOCTYPE|<!ENTITY|\bon\w+\s*=/i,
      );
      for (const match of svg.matchAll(/\b(?:xlink:)?href\s*=\s*["']([^"']*)["']/gi)) {
        expect(match[1], name).toMatch(/^#[A-Za-z0-9_-]+$/);
      }
      for (const match of svg.matchAll(/url\(\s*["']?([^\s)"']+)["']?\s*\)/gi)) {
        expect(match[1], name).toMatch(/^#[A-Za-z0-9_-]+$/);
      }
    }
    const license = readFileSync(
      new URL("../../../public/country-flags/LICENSE.txt", import.meta.url),
      "utf8",
    );
    expect(license).toContain("The MIT License (MIT)");
    expect(license).toContain("Copyright (c) 2013 Panayiotis Lipiridis");
  });
});
