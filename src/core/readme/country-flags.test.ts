import { describe, expect, it } from "vitest";
import { countryCatalog, formatCountryLocation } from "../location";
import { createEmptyProfile } from "../profile/profile-operations";
import { countryFlagMarkup, parseCountryFlagRow } from "./country-flags";
import { generateReadme } from ".";

const argentina = countryCatalog.find((country) => country.code === "AR")!;

describe("controlled country flags in README", () => {
  it("recognizes only exact decorative catalog tokens at the fixed dimensions", () => {
    for (const country of countryCatalog) {
      const markup = countryFlagMarkup(country);
      expect(markup).toBe(`<img width="20" height="15" src="${country.iconUrl}" alt="" />`);
      expect(parseCountryFlagRow(markup)).toEqual([country]);
      expect(parseCountryFlagRow(markup.replace('height="15"', 'height="200"'))).toBeNull();
      expect(parseCountryFlagRow(markup.replace('alt=""', 'alt="Flag"'))).toBeNull();
      expect(parseCountryFlagRow(markup.replace('.svg"', '.svg?track=true"'))).toBeNull();
      expect(parseCountryFlagRow(`${markup}<script>alert(1)</script>`)).toBeNull();
    }
    expect(parseCountryFlagRow("")).toBeNull();
    expect(parseCountryFlagRow('<img src="https://example.com/ar.svg" />')).toBeNull();
  });

  it.each(["en", "es"] as const)(
    "exports a chosen country with a flag and %s labels without mutating v1",
    (locale) => {
      const profile = createEmptyProfile(locale);
      profile.visibility.presentation = true;
      profile.data.presentation.location = formatCountryLocation(argentina, locale);
      const before = structuredClone(profile);
      expect(generateReadme(profile)).toEqual({
        success: true,
        markdown: `${locale === "en" ? "Location" : "Ubicación"}: ${countryFlagMarkup(argentina)} Argentina\n`,
      });
      expect(profile).toEqual(before);
    },
  );

  it.each(["Argentina", "Buenos Aires, Argentina", "Remote / worldwide", "🇿🇿 Unknown"])(
    "preserves plain or unrecognized location %s",
    (location) => {
      const profile = createEmptyProfile("en");
      profile.visibility.presentation = true;
      profile.data.presentation.location = location;
      expect(generateReadme(profile)).toEqual({
        success: true,
        markdown: `Location: ${location}\n`,
      });
    },
  );

  it("preserves custom flagged text and never interprets a user-supplied image", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.presentation = true;
    profile.data.presentation.location =
      '🇦🇷 <img src="https://example.com/track.svg"> [here](https://example.com)';
    const result = generateReadme(profile);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected an escaped location");
    expect(result.markdown).toContain("🇦🇷 &lt;img");
    expect(result.markdown).not.toContain("<img ");
    expect(result.markdown).toContain("&lt;img");
    expect(result.markdown).toContain("\\[here\\]");
  });
});
