import { technologyCatalog, type TechnologyCatalogEntry } from "../technologies";

/** Only catalog metadata creates HTML; profile text never enters these attributes. */
export function technologyIconMarkup(technology: TechnologyCatalogEntry): string {
  const alt = technology.name.replace(/&/g, "&amp;").replace(/"/g, "&quot;");
  return `<img width="32" height="32" src="${technology.iconUrl}" alt="${alt}" />`;
}

const iconMarkup = technologyCatalog.map((entry) => ({
  entry,
  markup: technologyIconMarkup(entry),
}));

/** Recognize the exact generated row, never arbitrary img tags or HTML attributes. */
export function parseTechnologyIconRow(value: string): readonly TechnologyCatalogEntry[] | null {
  let remaining = value.trim();
  const entries: TechnologyCatalogEntry[] = [];
  while (remaining) {
    const match = iconMarkup.find(({ markup }) => remaining.startsWith(markup));
    if (!match) return null;
    entries.push(match.entry);
    remaining = remaining.slice(match.markup.length);
    if (remaining && !/^\s/.test(remaining)) return null;
    remaining = remaining.trimStart();
  }
  return entries.length > 0 ? entries : null;
}
