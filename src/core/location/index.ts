import { countryNames } from "./country-names";

export type Country = Readonly<{
  code: string;
  name: Readonly<{ en: string; es: string }>;
  flag: string;
  iconPath: string;
  iconUrl: string;
}>;

const flagIconsCommit = "fe15c16e7463d0c66d6c5730e9d0e832438d98e1";

/** Local assets and README URLs share the same immutable flag-icons source. */
export const countryCatalog: readonly Country[] = Object.freeze(
  countryNames.map(([code, en, es]) => {
    const fileCode = code.toLowerCase();
    const flag = String.fromCodePoint(
      ...Array.from(code, (letter) => 0x1f1e6 + letter.charCodeAt(0) - 65),
    );
    return Object.freeze({
      code,
      name: Object.freeze({ en, es }),
      flag,
      iconPath: `/country-flags/${fileCode}.svg`,
      iconUrl: `https://raw.githubusercontent.com/lipis/flag-icons/${flagIconsCommit}/flags/4x3/${fileCode}.svg`,
    });
  }),
);

function normalizeSearchText(value: string): string {
  return value.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().trim();
}

/** Search both supported names and the ISO code, independently of the interface language. */
export function searchCountries(query: string, locale: "en" | "es", limit = 8): readonly Country[] {
  if (!Number.isFinite(limit) || limit < 1) return [];
  const normalized = normalizeSearchText(query);
  return countryCatalog
    .flatMap((country) => {
      const code = country.code.toLowerCase();
      const activeName = normalizeSearchText(country.name[locale]);
      const otherName = normalizeSearchText(country.name[locale === "en" ? "es" : "en"]);
      const score =
        code === normalized || activeName === normalized || otherName === normalized
          ? 0
          : activeName.startsWith(normalized)
            ? 1
            : otherName.startsWith(normalized)
              ? 2
              : activeName.includes(normalized)
                ? 3
                : otherName.includes(normalized)
                  ? 4
                  : -1;
      return score < 0 ? [] : [{ country, score, sortName: activeName }];
    })
    .sort(
      (left, right) =>
        left.score - right.score ||
        (left.sortName < right.sortName ? -1 : left.sortName > right.sortName ? 1 : 0),
    )
    .slice(0, Math.floor(limit))
    .map(({ country }) => country);
}

/** A selected country stays compatible with the existing location string in v1. */
export function formatCountryLocation(country: Country, locale: "en" | "es"): string {
  return `${country.flag} ${country.name[locale]}`;
}

/** Only an exact catalog selection is recognized; all free location text stays unchanged. */
export function parseCountryLocation(value: string): { country: Country; text: string } | null {
  const match = /^([\u{1F1E6}-\u{1F1FF}]{2}) ([^\r\n]+)$/u.exec(value);
  if (!match || match[0] !== value) return null;
  const [, flag, text] = match;
  if (!text?.trim()) return null;
  const country = countryCatalog.find((entry) => entry.flag === flag);
  return country && (text === country.name.en || text === country.name.es)
    ? { country, text }
    : null;
}

/** Accept only exact pinned catalog URLs, without query strings or host overrides. */
export function findCountryByIconUrl(url: string): Country | undefined {
  return countryCatalog.find((country) => country.iconUrl === url);
}
