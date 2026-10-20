/**
 * Local adaptation of the stats rows and compact language layout from GitHub
 * Stats Extended, MIT, Copyright (c) 2020 Anurag Hazra, Abhijit Gupta, martin-mfg.
 * Source fixed at 0506c4c0e0acab7be096be48d0d59d50852d811f:
 * https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/cards/stats.ts
 * https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/cards/top-languages.ts
 * The complete permission notice is in public/licenses/github-stats-extended.txt.
 * This adaptation removes links, animations, CSS, ranking and minimum segment
 * widths, and consumes only our validated public ActivitySnapshot.
 */
import type { CardAppearance } from "../profile/module-content";
import type { ContentLocale } from "../profile/profile-schema";
import type { ActivitySnapshot } from "./activity-types";
import { resolveCardAppearance, type ResolvedCardAppearance } from "./card-appearance";

type ExtendedCardId = "extended-stats" | "extended-languages";

const labels = {
  en: {
    "extended-stats": "GitHub Stats Extended",
    "extended-languages": "GitHub Stats Extended · Languages",
    adaptation: "Local adaptation · Public GitHub data",
    commits: "Commits",
    pullRequests: "Pull requests",
    issues: "Issues",
    reviews: "Reviews",
    other: "Other",
    publicOnly: "Public activity in the contribution period; no skill score.",
    updated: "Updated",
    stale: "Last available data",
    repositories: "public, owned repositories analyzed. Forks excluded.",
    of: "of",
    languageScope: "Share of analyzed code bytes; this does not measure skill.",
    languagePeriod: "Repository snapshot; not limited to the contribution period.",
    truncated: "Partial sample: repository or language limits were reached.",
    noLanguages: "No language data in the public repositories analyzed.",
    total: "bytes analyzed",
  },
  es: {
    "extended-stats": "GitHub Stats Extended",
    "extended-languages": "GitHub Stats Extended · Lenguajes",
    adaptation: "Adaptación local · Datos públicos de GitHub",
    commits: "Commits",
    pullRequests: "Pull requests",
    issues: "Issues",
    reviews: "Revisiones",
    other: "Otros",
    publicOnly: "Actividad pública en el período; sin puntajes de habilidad.",
    updated: "Actualizado",
    stale: "Últimos datos disponibles",
    repositories: "repositorios públicos propios analizados. Sin forks.",
    of: "de",
    languageScope: "Proporción de bytes analizados; no mide conocimientos.",
    languagePeriod: "Repositorios actuales; sin limitarse al período de contribuciones.",
    truncated: "Muestra parcial: se alcanzaron límites de repositorios o lenguajes.",
    noLanguages: "Sin datos de lenguajes en los repositorios públicos analizados.",
    total: "bytes analizados",
  },
} as const;

/** Keep user-controlled strings inert, bounded and valid XML 1.0. */
function xml(value: string, limit = 500): string {
  return Array.from(value)
    .slice(0, limit)
    .filter((character) => {
      const code = character.codePointAt(0) ?? 0;
      return (
        code === 9 ||
        code === 10 ||
        code === 13 ||
        (code >= 32 && code <= 0xd7ff) ||
        (code >= 0xe000 && code <= 0xfffd) ||
        (code >= 0x10000 && code <= 0x10ffff)
      );
    })
    .join("")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function number(value: number, locale: ContentLocale, compact = false): string {
  return new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    notation: compact && value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

function date(value: string, locale: ContentLocale): string {
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(parsed.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(parsed);
}

function percentage(fraction: number, locale: ContentLocale): string {
  if (fraction > 0 && fraction < 0.001) return "<0.1%";
  return new Intl.NumberFormat(locale, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(fraction);
}

function text(x: number, y: number, value: string, attributes = ""): string {
  return `<text x="${x}" y="${y}" ${attributes}>${xml(value)}</text>`;
}

function frame(
  card: ExtendedCardId,
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  appearance: ResolvedCardAppearance,
  height: number,
  description: string,
  body: string,
): string {
  const t = labels[locale];
  const { width, background, border, foreground, muted } = appearance;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="card-title card-description" lang="${locale}"><title id="card-title">${xml(t[card])}</title><desc id="card-description">${xml(`${t.adaptation}. @${snapshot.username}. ${description}`, 3000)}</desc><rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="14" fill="${background}" stroke="${border}"/><g font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fill="${foreground}">${text(24, 32, t[card], 'font-size="19" font-weight="650"')}${text(24, 54, `@${snapshot.username}`, `font-size="12" fill="${muted}"`)}${text(24, 71, t.adaptation, `font-size="11" fill="${muted}"`)}${body}</g></svg>`;
}

function footer(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  appearance: ResolvedCardAppearance,
  height: number,
  stale: boolean,
  languageCard = false,
): string {
  const t = labels[locale];
  return (
    text(
      24,
      height - 42,
      languageCard
        ? t.languagePeriod
        : `${date(snapshot.period.from, locale)} – ${date(snapshot.period.to, locale)} (UTC)`,
      `font-size="11" fill="${appearance.muted}"`,
    ) +
    text(
      24,
      height - 20,
      `${t.updated}: ${date(snapshot.fetchedAt, locale)} (UTC)${stale ? ` · ${t.stale}` : ""}`,
      `font-size="11" fill="${stale ? appearance.warning : appearance.muted}"`,
    )
  );
}

function renderStats(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  appearance: ResolvedCardAppearance,
  stale: boolean,
): string {
  const t = labels[locale];
  const { width, design, muted, panel, accent } = appearance;
  const entries = [
    { label: t.commits, value: snapshot.summary.commits },
    { label: t.pullRequests, value: snapshot.summary.pullRequests },
    { label: t.issues, value: snapshot.summary.issues },
    { label: t.reviews, value: snapshot.summary.reviews },
  ];
  // Adapted from upstream's stat metadata -> ordered text nodes -> column layout.
  const rows = entries
    .map((stat, index) => {
      if (design === "panels") {
        const columnWidth = (width - 60) / 2;
        const x = 24 + (index % 2) * (columnWidth + 12);
        const y = 86 + Math.floor(index / 2) * 70;
        return `<rect x="${x}" y="${y}" width="${columnWidth}" height="64" rx="8" fill="${panel}"/>${text(x + 14, y + 27, stat.label, `font-size="12" fill="${muted}"`)}${text(x + columnWidth - 14, y + 47, number(stat.value, locale), 'font-size="24" font-weight="650" text-anchor="end"')}`;
      }
      if (design === "minimal") {
        const columnWidth = (width - 48) / entries.length;
        const x = 24 + index * columnWidth;
        return `${text(x, 121, number(stat.value, locale, true), 'font-size="27" font-weight="650"')}${text(x, 147, stat.label, `font-size="12" fill="${muted}"`)}<rect x="${x}" y="164" width="${columnWidth - 18}" height="3" fill="${accent}"/>`;
      }
      const y = 96 + index * 33;
      return `<circle cx="29" cy="${y - 4}" r="4" fill="${accent}"/>${text(44, y, stat.label, 'font-size="14"')}${text(width - 26, y, number(stat.value, locale), 'font-size="17" font-weight="650" text-anchor="end"')}`;
    })
    .join("");
  const height = 320;
  const noteY = height - 86;
  const description = `${entries.map((stat) => `${stat.label}: ${number(stat.value, locale)}`).join(". ")}. ${t.publicOnly} ${date(snapshot.period.from, locale)} – ${date(snapshot.period.to, locale)} (UTC). ${t.updated}: ${date(snapshot.fetchedAt, locale)} (UTC). ${stale ? t.stale : ""}`;
  return frame(
    "extended-stats",
    snapshot,
    locale,
    appearance,
    height,
    description,
    rows +
      text(24, noteY, t.publicOnly, `font-size="11" fill="${muted}"`) +
      footer(snapshot, locale, appearance, height, stale),
  );
}

type LanguageSegment = { name: string; bytes: number; color: string };

function renderLanguages(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  appearance: ResolvedCardAppearance,
  stale: boolean,
): string {
  const t = labels[locale];
  const { width, design, muted, border, panel, accent } = appearance;
  const allItems = snapshot.languages.items.filter(
    (item) => Number.isFinite(item.bytes) && item.bytes > 0,
  );
  const sorted = [...allItems].sort(
    (left, right) => right.bytes - left.bytes || left.name.localeCompare(right.name, "en"),
  );
  const totalBytes = allItems.reduce((sum, item) => sum + item.bytes, 0);
  const segments: LanguageSegment[] = sorted.slice(0, 5).map((item) => ({
    name: item.name,
    bytes: item.bytes,
    color: item.color && /^#[a-f\d]{6}$/i.test(item.color) ? item.color : accent,
  }));
  const remainingBytes = sorted.slice(5).reduce((sum, item) => sum + item.bytes, 0);
  if (remainingBytes > 0) segments.push({ name: t.other, bytes: remainingBytes, color: muted });
  const legend = (segment: LanguageSegment, x: number, y: number, endX: number) => {
    const name = Array.from(segment.name);
    const shortName = name.length > 26 ? `${name.slice(0, 25).join("")}…` : segment.name;
    return `<circle cx="${x + 5}" cy="${y - 4}" r="5" fill="${segment.color}" stroke="${border}" stroke-width="0.5"/>${text(x + 19, y, shortName, 'font-size="12"')}${text(endX, y, percentage(segment.bytes / totalBytes, locale), `font-size="12" text-anchor="end" fill="${muted}"`)}`;
  };
  let rows = "";
  if (segments.length === 0) {
    rows = text(24, 109, t.noLanguages, `font-size="12" fill="${muted}"`);
  } else if (design === "panels") {
    const circumference = 2 * Math.PI * 65;
    let offset = 0;
    const ring = segments
      .map((segment) => {
        const arc = (segment.bytes / totalBytes) * circumference;
        const node = `<circle cx="118" cy="157" r="65" fill="none" stroke="${segment.color}" stroke-width="26" stroke-dasharray="${arc.toFixed(6)} ${(circumference - arc).toFixed(6)}" stroke-dashoffset="${(-offset).toFixed(6)}" transform="rotate(-90 118 157)"/>`;
        offset += arc;
        return node;
      })
      .join("");
    rows =
      ring +
      segments.map((segment, index) => legend(segment, 232, 97 + index * 26, width - 24)).join("");
  } else if (design === "minimal") {
    rows = segments
      .map((segment, index) => {
        const y = 91 + index * 26;
        const barWidth = width - 330;
        return `${legend(segment, 24, y, width - 24)}<rect x="240" y="${y - 9}" width="${barWidth}" height="8" rx="3" fill="${panel}"/><rect x="240" y="${y - 9}" width="${((segment.bytes / totalBytes) * barWidth).toFixed(4)}" height="8" rx="3" fill="${segment.color}" stroke="${border}" stroke-width="0.5"/>`;
      })
      .join("");
  } else {
    // Adapted from renderCompactLayout: stack exact byte shares horizontally.
    // Unlike upstream, small segments are never given a misleading minimum width.
    const offsetWidth = width - 48;
    let progressOffset = 24;
    const compactProgressBar = segments
      .map((segment) => {
        const progress = (segment.bytes / totalBytes) * offsetWidth;
        const output = `<rect x="${progressOffset.toFixed(6)}" y="83" width="${progress.toFixed(6)}" height="12" fill="${segment.color}"/>`;
        progressOffset += progress;
        return output;
      })
      .join("");
    const columnWidth = (width - 72) / 2;
    const legendRows = segments
      .map((segment, index) => {
        const x = 24 + (index % 2) * (columnWidth + 24);
        return legend(segment, x, 122 + Math.floor(index / 2) * 28, x + columnWidth);
      })
      .join("");
    rows = compactProgressBar + legendRows;
  }
  const scope = `${number(snapshot.languages.repositoriesAnalyzed, locale)} ${t.of} ${number(snapshot.languages.repositoriesTotal, locale)} ${t.repositories}`;
  const height = snapshot.languages.truncated ? 394 : 374;
  const notesY = 268;
  const description = `${scope} ${t.languageScope} ${segments.length === 0 ? t.noLanguages : segments.map((segment) => `${segment.name}: ${number(segment.bytes, locale)} bytes (${percentage(segment.bytes / totalBytes, locale)})`).join(". ")}. ${t.languagePeriod} ${t.updated}: ${date(snapshot.fetchedAt, locale)} (UTC). ${stale ? t.stale : ""} ${snapshot.languages.truncated ? t.truncated : ""}`;
  return frame(
    "extended-languages",
    snapshot,
    locale,
    appearance,
    height,
    description,
    rows +
      text(24, 245, `${number(totalBytes, locale)} ${t.total}`, `font-size="11" fill="${muted}"`) +
      text(24, notesY, scope, `font-size="11" fill="${muted}"`) +
      text(24, notesY + 18, t.languageScope, `font-size="11" fill="${muted}"`) +
      (snapshot.languages.truncated
        ? text(24, notesY + 36, t.truncated, `font-size="11" fill="${appearance.warning}"`)
        : "") +
      footer(snapshot, locale, appearance, height, stale, true),
  );
}

/** Pure local rendering: no hosted service, credentials, network or current time. */
export function renderExtendedCard(
  snapshot: ActivitySnapshot,
  card: ExtendedCardId,
  locale: ContentLocale,
  options: { stale?: boolean; appearance?: CardAppearance } = {},
): string {
  const appearance = resolveCardAppearance(options.appearance);
  return card === "extended-stats"
    ? renderStats(snapshot, locale, appearance, options.stale === true)
    : renderLanguages(snapshot, locale, appearance, options.stale === true);
}
