import {
  cardAppearanceSchema,
  type CardAppearance,
  type CardColumns,
} from "../profile/module-content";
import type { ContentLocale } from "../profile/profile-schema";
import { cardConfigJson } from "./card-config-json";
import {
  extendedStatsOptionsSchema,
  extendedLanguageOptionsSchema,
  type ExtendedStatsOptions,
  type ExtendedLanguageOptions,
} from "./extended-options";

export const cardAppearanceKeys = [
  "theme",
  "palette",
  "design",
  "size",
  "preset",
  "titleColor",
  "textColor",
  "iconColor",
  "borderColor",
  "backgroundColor",
  "backgroundGradient",
  "borderRadius",
  "width",
  "lineHeight",
  "customTitle",
  "hideTitle",
  "hideBorder",
  "showIcons",
  "textBold",
  "numberFormat",
  "numberPrecision",
] as const;
const numericKeys = new Set(["borderRadius", "width", "lineHeight", "numberPrecision"]);
const booleanKeys = new Set(["hideTitle", "hideBorder", "showIcons", "textBold"]);
export type ProfileCardOptions = {
  locale: ContentLocale;
  cardColumns: CardColumns;
  appearance?: CardAppearance;
  extended?: { stats?: ExtendedStatsOptions; languages?: ExtendedLanguageOptions };
};

/** Bounded validated options; never CSS, executable markup or external resources. */
export function parseCardOptions(params: URLSearchParams): ProfileCardOptions | null {
  const allowed = [
    "locale",
    "columns",
    ...cardAppearanceKeys,
    "stats",
    "languages",
  ] as readonly string[];
  if (
    params.toString().length > 24_000 ||
    [...params.keys()].some((key) => !allowed.includes(key) || params.getAll(key).length !== 1)
  )
    return null;
  const locale = params.get("locale") ?? "en";
  if (locale !== "en" && locale !== "es") return null;
  const columns = params.get("columns") ?? "1";
  if (columns !== "1" && columns !== "2") return null;
  const input: Record<string, unknown> = {};
  for (const key of cardAppearanceKeys) {
    if (!params.has(key)) continue;
    const value = params.get(key)!;
    if (numericKeys.has(key)) {
      if (!/^\d+(?:\.\d+)?$/.test(value)) return null;
      input[key] = Number(value);
    } else if (booleanKeys.has(key)) {
      if (value !== "true" && value !== "false") return null;
      input[key] = value === "true";
    } else if (key === "backgroundGradient") {
      try {
        input[key] = JSON.parse(value) as unknown;
      } catch {
        return null;
      }
    } else input[key] = value;
  }
  const parsed = cardAppearanceSchema.safeParse(input);
  if (!parsed.success) return null;
  const extended: NonNullable<ProfileCardOptions["extended"]> = {};
  for (const key of ["stats", "languages"] as const) {
    if (!params.has(key)) continue;
    const value = params.get(key)!;
    if (value.length > 8000) return null;
    try {
      const unknown = JSON.parse(value) as unknown;
      if (key === "stats") {
        const option = extendedStatsOptionsSchema.safeParse(unknown);
        if (!option.success) return null;
        extended.stats = option.data;
      } else {
        const option = extendedLanguageOptionsSchema.safeParse(unknown);
        if (!option.success) return null;
        extended.languages = option.data;
      }
    } catch {
      return null;
    }
  }
  return {
    locale,
    cardColumns: Number(columns) as CardColumns,
    ...(Object.keys(input).length ? { appearance: parsed.data } : {}),
    ...(Object.keys(extended).length ? { extended } : {}),
  };
}

export function cardQuery(
  locale: "en" | "es",
  appearance?: CardAppearance,
  extended?: ProfileCardOptions["extended"],
  cardColumns: CardColumns = 1,
): string {
  const params = new URLSearchParams({ locale });
  if (cardColumns === 2) params.set("columns", "2");
  for (const key of cardAppearanceKeys) {
    const value = appearance?.[key as keyof CardAppearance];
    if (value !== undefined)
      params.set(key, typeof value === "object" ? cardConfigJson(value) : String(value));
  }
  for (const key of ["stats", "languages"] as const) {
    const value = extended?.[key];
    if (value !== undefined) params.set(key, cardConfigJson(value));
  }
  return params.toString();
}
