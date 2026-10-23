import {
  profileActivityCardIds,
  type CardAppearance,
  type CardColumns,
  type MetricCardId,
} from "../profile/module-content";
import type { ContentLocale } from "../profile/profile-schema";
import { normalizeGitHubUsername } from "./github-username";
import { cardQuery, parseCardOptions, type ProfileCardOptions } from "./card-options";

export { normalizeGitHubUsername } from "./github-username";
export { activitySnapshotSchema, activityErrorCodes } from "./activity-types";
export type { ActivitySnapshot, ActivityErrorCode, ActivityResult } from "./activity-types";

/** Exported images need a configured HTTPS origin, never a request's Host header. */
export function normalizeActivityBaseUrl(value: string | undefined): string | null {
  if (!value?.trim()) return null;
  try {
    const url = new URL(value.trim());
    const hostname = url.hostname.toLowerCase();
    if (
      url.protocol !== "https:" ||
      url.username ||
      url.password ||
      url.port ||
      url.pathname !== "/" ||
      url.search ||
      url.hash ||
      !hostname.includes(".") ||
      /^[\d.]+$/.test(hostname) ||
      hostname.includes(":") ||
      /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(hostname)
    )
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

export function activityCardUrl(
  username: string,
  card: MetricCardId,
  locale: ContentLocale,
  baseUrl?: string,
  appearance?: CardAppearance,
  extended?: ProfileCardOptions["extended"],
  cardColumns: CardColumns = 1,
): string | null {
  const normalized = normalizeGitHubUsername(username);
  if (!normalized) return null;
  if (!(profileActivityCardIds as readonly string[]).includes(card)) return null;
  const origin = baseUrl === undefined ? "" : normalizeActivityBaseUrl(baseUrl);
  if (origin === null) return null;
  const cardOptions =
    card === "extended-stats"
      ? { stats: extended?.stats }
      : card === "extended-languages"
        ? { languages: extended?.languages }
        : undefined;
  const result = `${origin}/cards/github/${normalized}/${card}.svg?${cardQuery(locale, appearance, cardOptions, cardColumns)}`;
  return result.length <= 12_000 ? result : null;
}

/** Only our exact card paths and configured origin may become preview images. */
export function parseActivityCardUrl(value: string, baseUrl?: string) {
  const origin = baseUrl === undefined ? "" : normalizeActivityBaseUrl(baseUrl);
  if (origin === null || !value.startsWith(`${origin}/cards/github/`)) return null;
  const query = value.split("?")[1];
  if (!query) return null;
  const options = parseCardOptions(new URLSearchParams(query));
  if (!options) return null;
  for (const card of profileActivityCardIds) {
    const username = value.slice(`${origin}/cards/github/`.length).split("/")[0];
    if (
      username &&
      activityCardUrl(
        username,
        card,
        options.locale,
        baseUrl,
        options.appearance,
        options.extended,
        options.cardColumns,
      ) === value
    ) {
      return {
        username,
        card,
        ...options,
        localUrl: activityCardUrl(
          username,
          card,
          options.locale,
          undefined,
          options.appearance,
          options.extended,
          options.cardColumns,
        )!,
      };
    }
  }
  return null;
}
