import { countryCatalog, type Country } from "../location";

/** Dimensions and URLs are fixed by the catalog, never by profile text. */
export function countryFlagMarkup(country: Country): string {
  return `<img width="20" height="15" src="${country.iconUrl}" alt="" />`;
}

const flagMarkup = countryCatalog.map((country) => ({
  country,
  markup: countryFlagMarkup(country),
}));

/** Only exact generated flag tokens may become images in the Markdown preview. */
export function parseCountryFlagRow(value: string): readonly Country[] | null {
  let remaining = value.trim();
  const countries: Country[] = [];
  while (remaining) {
    const match = flagMarkup.find(({ markup }) => remaining.startsWith(markup));
    if (!match) return null;
    countries.push(match.country);
    remaining = remaining.slice(match.markup.length);
    if (remaining && !/^\s/.test(remaining)) return null;
    remaining = remaining.trimStart();
  }
  return countries.length > 0 ? countries : null;
}
