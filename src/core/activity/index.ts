import { metricCardIds, type MetricCardId } from "../profile/module-content";
import type { ContentLocale } from "../profile/profile-schema";
import { normalizeGitHubUsername } from "./github-username";

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
): string | null {
  const normalized = normalizeGitHubUsername(username);
  if (!normalized) return null;
  const origin = baseUrl === undefined ? "" : normalizeActivityBaseUrl(baseUrl);
  if (origin === null) return null;
  return `${origin}/cards/github/${normalized}/${card}.svg?locale=${locale}`;
}

/** Only our exact card paths and configured origin may become preview images. */
export function parseActivityCardUrl(value: string, baseUrl?: string) {
  for (const card of metricCardIds) {
    for (const locale of ["en", "es"] as const) {
      const origin = baseUrl === undefined ? "" : normalizeActivityBaseUrl(baseUrl);
      if (origin === null || !value.startsWith(`${origin}/cards/github/`)) continue;
      const username = value.slice(`${origin}/cards/github/`.length).split("/")[0];
      if (username && activityCardUrl(username, card, locale, baseUrl) === value) {
        return { username, card, locale, localUrl: activityCardUrl(username, card, locale)! };
      }
    }
  }
  return null;
}
