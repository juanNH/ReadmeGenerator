import { contactProviders, type ContactProvider } from "../contact";

/** Every attribute comes from the local catalog, never profile text. */
export function contactIconMarkup(provider: ContactProvider): string {
  return `<img width="20" height="20" src="${provider.iconUrl}" alt="" />`;
}

const iconMarkup = contactProviders.map((entry) => ({
  entry,
  markup: contactIconMarkup(entry),
}));

/** Match only exact generated tokens; arbitrary HTML remains unsupported. */
export function parseContactIconRow(value: string): readonly ContactProvider[] | null {
  let remaining = value.trim();
  const entries: ContactProvider[] = [];
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
