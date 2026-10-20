/**
 * Local adaptation of stats rows, ranking, and language layouts from GitHub
 * Stats Extended, MIT, Copyright (c) 2020 Anurag Hazra, Abhijit Gupta, martin-mfg.
 * Source fixed at 0506c4c0e0acab7be096be48d0d59d50852d811f:
 * https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/cards/stats.ts
 * https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/cards/top-languages.ts
 * The complete permission notice is in public/licenses/github-stats-extended.txt.
 * Layout is rendered locally from validated public data, without upstream CSS,
 * scripts, animations, links, external assets, or minimum chart segment widths.
 */
import type { CardAppearance } from "../profile/module-content";
import type { ContentLocale } from "../profile/profile-schema";
import { calculateActivityRank, type ActivityRankValues } from "./activity-rank";
import {
  cardBackground,
  resolveCardAppearance,
  type ResolvedCardAppearance,
} from "./card-appearance";
import {
  defaultExtendedStats,
  type ExtendedLanguageOptions,
  type ExtendedStatId,
  type ExtendedStatsOptions,
} from "./extended-options";
import type { ExtendedMetric, ExtendedProfileSnapshot } from "./extended-types";

const labels = {
  en: {
    stats: "GitHub Stats Extended",
    languages: "GitHub Stats Extended · Languages",
    stars: "Stars received",
    commits: "Commits",
    pullRequests: "Pull requests",
    issues: "Issues",
    reviews: "Pull request reviews",
    repositoriesContributedTo: "Repositories contributed to",
    allTimeContributions: "All-time contributions",
    allTimeRepositoriesContributedTo: "All-time repositories contributed to",
    discussionsStarted: "Discussions started",
    discussionsAnswered: "Discussions answered",
    mergedPullRequests: "Merged pull requests",
    mergedPullRequestPercentage: "Pull requests merged",
    authoredPullRequests: "Pull requests authored",
    commentedPullRequests: "Others' pull requests commented on",
    reviewedPullRequests: "Others' pull requests reviewed",
    authoredIssues: "Issues authored",
    commentedIssues: "Others' issues commented on",
    followers: "Followers",
    period: "period",
    lifetime: "historical",
    snapshot: "current",
    publicOnly: "Public GitHub data · Local MIT adaptation",
    updated: "Updated",
    stale: "Last available data",
    partial: "≥ Partial public subtotal · ≈ Partial percentage · — Unavailable",
    allPublic: "Public data only. Historical totals can be bounded by the available sample.",
    rank: "Activity formula",
    rankNote: "Optional activity formula; this does not measure skill.",
    rankMissing: "Ranking unavailable: one or more required counters are missing or partial.",
    rankPercentile: "Formula percentage index",
    other: "Other",
    noLanguages: "No language data in the public repositories analyzed.",
    languageScope: "Share of analyzed public code bytes; this does not measure skill.",
    weightedScope: "Weighted share of analyzed public code; this does not measure skill.",
    languagePeriod: "Current repository snapshot; not limited to the contribution period.",
    analyzed: "public repositories analyzed",
    of: "of",
    noForks: "Forks excluded.",
    truncated:
      "Partial sample: repository or language limits were reached, or data was unavailable.",
    weights: "Weights: bytes",
    countWeight: "repository count",
    bytes: "of analyzed code",
  },
  es: {
    stats: "GitHub Stats Extended",
    languages: "GitHub Stats Extended · Lenguajes",
    stars: "Estrellas recibidas",
    commits: "Commits",
    pullRequests: "Pull requests",
    issues: "Issues",
    reviews: "Revisiones de pull requests",
    repositoriesContributedTo: "Repositorios con aportes",
    allTimeContributions: "Contribuciones históricas",
    allTimeRepositoriesContributedTo: "Repositorios con aportes históricos",
    discussionsStarted: "Debates iniciados",
    discussionsAnswered: "Debates respondidos",
    mergedPullRequests: "Pull requests fusionadas",
    mergedPullRequestPercentage: "Pull requests fusionadas (%)",
    authoredPullRequests: "Pull requests creadas",
    commentedPullRequests: "Pull requests ajenas comentadas",
    reviewedPullRequests: "Pull requests ajenas revisadas",
    authoredIssues: "Issues creadas",
    commentedIssues: "Issues ajenas comentadas",
    followers: "Seguidores",
    period: "período",
    lifetime: "histórico",
    snapshot: "actual",
    publicOnly: "Datos públicos de GitHub · Adaptación local MIT",
    updated: "Actualizado",
    stale: "Últimos datos disponibles",
    partial: "≥ Subtotal público parcial · ≈ Porcentaje parcial · — No disponible",
    allPublic:
      "Solo datos públicos. Los totales históricos pueden estar limitados por la muestra disponible.",
    rank: "Fórmula de actividad",
    rankNote: "Fórmula de actividad opcional; no mide habilidad.",
    rankMissing: "Ranking no disponible: faltan contadores necesarios o son parciales.",
    rankPercentile: "Índice porcentual de la fórmula",
    other: "Otros",
    noLanguages: "Sin datos de lenguajes en los repositorios públicos analizados.",
    languageScope: "Proporción de bytes de código público analizados; no mide conocimientos.",
    weightedScope: "Proporción ponderada de código público analizado; no mide conocimientos.",
    languagePeriod: "Repositorios actuales; sin limitarse al período de contribuciones.",
    analyzed: "repositorios públicos analizados",
    of: "de",
    noForks: "Sin forks.",
    truncated:
      "Muestra parcial: se alcanzaron límites de repositorios o lenguajes, o faltan datos.",
    weights: "Pesos: bytes",
    countWeight: "cantidad de repositorios",
    bytes: "de código analizado",
  },
} as const;
type Labels = (typeof labels)[ContentLocale];
type RenderOptions = {
  appearance?: CardAppearance;
  extended?: { stats?: ExtendedStatsOptions; languages?: ExtendedLanguageOptions };
  stale?: boolean;
};
type LanguageSegment = { name: string; bytes: number; score: number; share: number; color: string };

/** XML 1.0 only. Every data-derived text node is escaped here. */
function xml(value: string, max = 3000): string {
  return Array.from(value)
    .slice(0, max)
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

function bounded(value: string, length: number): string {
  const plain = value.replace(/[\r\n\t]+/g, " ").trim();
  return Array.from(plain).length > length
    ? Array.from(plain)
        .slice(0, Math.max(1, length - 1))
        .join("") + "…"
    : plain;
}

function text(x: number, y: number, value: string, attributes = ""): string {
  return `<text x="${x}" y="${y}" ${attributes}>${xml(value)}</text>`;
}

function wrap(value: string, maxCharacters: number): string[] {
  const words = value.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    if (line && line.length + word.length + 1 > maxCharacters) {
      lines.push(line);
      line = "";
    }
    line += (line ? " " : "") + word;
  }
  if (line) lines.push(line);
  return lines;
}

function formatNumber(
  value: number,
  locale: ContentLocale,
  style: ResolvedCardAppearance,
  decimals = 0,
): string {
  return new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    notation: style.numberFormat === "short" ? "compact" : "standard",
    maximumFractionDigits: style.numberFormat === "short" ? style.numberPrecision : decimals,
  }).format(value);
}

function formatDate(value: string, locale: ContentLocale): string {
  const date = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function bytes(value: number, locale: ContentLocale, precision: number): string {
  const units = ["B", "kB", "MB", "GB", "TB", "PB"];
  const exponent = value > 0 ? Math.min(units.length - 1, Math.floor(Math.log10(value) / 3)) : 0;
  const formatted = new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    maximumFractionDigits: precision,
  }).format(value / 1000 ** exponent);
  return `${formatted} ${units[exponent] ?? "B"}`;
}

function header(
  snapshot: ExtendedProfileSnapshot,
  title: string,
  style: ResolvedCardAppearance,
): { body: string; next: number } {
  const maxTitle = Math.floor((style.width - 48) / 10);
  const body =
    (style.hideTitle
      ? ""
      : text(
          24,
          34,
          bounded(title, maxTitle),
          `font-size="19" font-weight="650" fill="${style.title}"`,
        )) +
    text(
      24,
      style.hideTitle ? 32 : 58,
      bounded(
        `${snapshot.displayName} · @${snapshot.username}`,
        Math.floor((style.width - 48) / 7.6),
      ),
      `font-size="13" fill="${style.muted}"`,
    );
  return { body, next: style.hideTitle ? 58 : 84 };
}

function footer(
  lines: string[],
  startY: number,
  style: ResolvedCardAppearance,
): { body: string; height: number } {
  const wrapped = lines.flatMap((line) =>
    wrap(line, Math.max(30, Math.floor((style.width - 48) / 6.5))),
  );
  return {
    body: wrapped
      .map((line, index) =>
        text(24, startY + index * 18, line, `font-size="11" fill="${style.muted}"`),
      )
      .join(""),
    height: startY + Math.max(0, wrapped.length - 1) * 18 + 22,
  };
}

function frame(
  title: string,
  description: string,
  body: string,
  height: number,
  style: ResolvedCardAppearance,
  locale: ContentLocale,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${style.width}" height="${height}" viewBox="0 0 ${style.width} ${height}" role="img" aria-labelledby="card-title card-description" lang="${locale}"><title id="card-title">${xml(title, 300)}</title><desc id="card-description">${xml(description, 12000)}</desc>${cardBackground(style, height)}<g font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fill="${style.foreground}">${body}</g></svg>`;
}

function scopeText(
  id: ExtendedStatId,
  metric: ExtendedMetric,
  strings: Labels,
  options: ExtendedStatsOptions,
  periodTo: string,
): string {
  if (id === "commits" && options.commitsPeriod === "year")
    return `${strings.period} · ${options.year ?? periodTo.slice(0, 4)}`;
  return strings[metric.scope];
}

function rowValue(
  id: ExtendedStatId,
  metric: ExtendedMetric,
  locale: ContentLocale,
  style: ResolvedCardAppearance,
): string {
  if (metric.value === null) return "—";
  const percentage = id === "mergedPullRequestPercentage";
  const prefix = metric.partial ? (percentage ? "≈ " : "≥ ") : "";
  return (
    prefix +
    formatNumber(metric.value, locale, style, percentage ? style.numberPrecision : 0) +
    (percentage ? "%" : "")
  );
}

function rankValues(snapshot: ExtendedProfileSnapshot): ActivityRankValues | null {
  const ids = ["commits", "pullRequests", "issues", "reviews", "stars", "followers"] as const;
  if (ids.some((id) => snapshot.stats[id].value === null || snapshot.stats[id].partial))
    return null;
  return Object.fromEntries(ids.map((id) => [id, snapshot.stats[id].value])) as ActivityRankValues;
}

function renderStats(
  snapshot: ExtendedProfileSnapshot,
  locale: ContentLocale,
  options: RenderOptions,
  style: ResolvedCardAppearance,
): string {
  const strings = labels[locale];
  const statsOptions = options.extended?.stats ?? {};
  const items = statsOptions.items ?? defaultExtendedStats;
  const title = style.customTitle?.trim() || strings.stats;
  const heading = header(snapshot, title, style);
  const rankInput = statsOptions.showRank ? rankValues(snapshot) : null;
  const rank = rankInput
    ? calculateActivityRank(rankInput, statsOptions.commitsPeriod === "all")
    : null;
  const reserveRank = !!rank && style.width >= 700;
  const rowRight = style.width - (reserveRank ? 195 : 24);
  const valueX = rowRight;
  const scopeX = Math.max(270, rowRight - 120);
  const labelX = style.showIcons ? 48 : 24;
  const maxLabel = Math.max(12, Math.floor((scopeX - labelX - 102) / 7.5));
  const rowHeight = Math.max(24, style.lineHeight);
  let body = heading.body;
  const rows = items
    .map((id, index) => {
      const y = heading.next + index * rowHeight;
      const metric = snapshot.stats[id];
      const formattedValue = rowValue(id, metric, locale, style);
      const valueSize = Math.min(
        14,
        (rowRight - scopeX - 12) / Math.max(1, formattedValue.length * 0.65),
      );
      const background =
        style.design === "panels"
          ? `<rect x="16" y="${y - 17}" width="${rowRight - 4}" height="${rowHeight - 3}" rx="5" fill="${style.panel}"/>`
          : "";
      const separator =
        style.design === "minimal" && index > 0
          ? `<path d="M24 ${y - 20}H${rowRight}" stroke="${style.border}"/>`
          : "";
      const icon = style.showIcons
        ? `<circle cx="31" cy="${y - 5}" r="5" fill="none" stroke="${style.icon}" stroke-width="1.5"/><path d="M28 ${y - 5}h6M31 ${y - 8}v6" stroke="${style.icon}"/>`
        : "";
      return (
        background +
        separator +
        icon +
        text(
          labelX,
          y,
          bounded(strings[id], maxLabel),
          `font-size="13" font-weight="${style.textBold ? 600 : 400}"`,
        ) +
        text(
          scopeX,
          y,
          scopeText(id, metric, strings, statsOptions, snapshot.period.to),
          `font-size="10" fill="${style.muted}" text-anchor="end"`,
        ) +
        text(
          valueX,
          y,
          formattedValue,
          `font-size="${valueSize.toFixed(2)}" font-weight="${style.textBold ? 650 : 400}" text-anchor="end"`,
        )
      );
    })
    .join("");
  body += rows;
  let bodyBottom = heading.next + Math.max(0, items.length - 1) * rowHeight;
  if (rank) {
    const centerX = style.width - 100;
    const centerY = heading.next + 62;
    const radius = 48;
    const circumference = 2 * Math.PI * radius;
    const progress = (100 - rank.percentile) / 100;
    body += `<circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${style.border}" stroke-width="8"/><circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="none" stroke="${style.icon}" stroke-width="8" stroke-dasharray="${(circumference * progress).toFixed(5)} ${circumference.toFixed(5)}" transform="rotate(-90 ${centerX} ${centerY})"/>`;
    if (statsOptions.rankIcon === "github") {
      // Generic branching symbol rather than an unlicensed remote brand asset.
      body += `<path d="M${centerX - 10} ${centerY - 15}v30M${centerX - 10} ${centerY + 4}q20 0 20 -19" fill="none" stroke="${style.title}" stroke-width="3"/><circle cx="${centerX - 10}" cy="${centerY - 15}" r="4" fill="${style.title}"/><circle cx="${centerX - 10}" cy="${centerY + 15}" r="4" fill="${style.title}"/><circle cx="${centerX + 10}" cy="${centerY - 15}" r="4" fill="${style.title}"/>`;
    } else {
      const value =
        statsOptions.rankIcon === "percentile"
          ? `${formatNumber(rank.percentile, locale, { ...style, numberFormat: "long" }, 1)}%`
          : rank.level;
      body += text(
        centerX,
        centerY + 8,
        value,
        `font-size="${statsOptions.rankIcon === "percentile" ? 21 : 30}" font-weight="700" text-anchor="middle" fill="${style.title}"`,
      );
    }
    body += text(
      centerX,
      centerY + 76,
      strings.rank,
      `font-size="10" text-anchor="middle" fill="${style.muted}"`,
    );
    bodyBottom = Math.max(bodyBottom, centerY + 76);
  }
  const hasPartial = items.some(
    (id) => snapshot.stats[id].partial || snapshot.stats[id].value === null,
  );
  const notes = [
    `${strings.period}: ${formatDate(snapshot.period.from, locale)} – ${formatDate(snapshot.period.to, locale)} (UTC).`,
    ...(statsOptions.commitsPeriod === "year" && items.includes("commits")
      ? [
          `${strings.commits}: ${strings.period} · ${statsOptions.year ?? snapshot.period.to.slice(0, 4)} (UTC).`,
        ]
      : []),
    ...(hasPartial ? [strings.partial] : []),
    ...(statsOptions.showRank
      ? [rank ? strings.rankNote : strings.rankMissing]
      : [strings.allPublic]),
    `${options.stale ? strings.stale : strings.updated}: ${formatDate(snapshot.fetchedAt, locale)} · ${strings.publicOnly}`,
  ];
  const ending = footer(notes, bodyBottom + 36, style);
  const description = [
    title,
    `${snapshot.displayName} (@${snapshot.username})`,
    ...items.map(
      (id) =>
        `${strings[id]}: ${rowValue(id, snapshot.stats[id], locale, style)} (${scopeText(id, snapshot.stats[id], strings, statsOptions, snapshot.period.to)})`,
    ),
    ...(rank
      ? [
          `${strings.rank}: ${rank.level}; ${strings.rankPercentile}: ${rank.percentile.toFixed(2)}%. ${strings.rankNote}`,
        ]
      : []),
    ...notes,
  ].join(". ");
  return frame(title, description, body + ending.body, ending.height, style, locale);
}

function languageSegments(
  snapshot: ExtendedProfileSnapshot,
  options: ExtendedLanguageOptions,
  style: ResolvedCardAppearance,
  otherLabel: string,
): { segments: LanguageSegment[]; totalBytes: number; weighted: boolean } {
  const hidden = new Set(options.hidden?.map((value) => value.toLowerCase()) ?? []);
  const sizeWeight = options.sizeWeight ?? 1;
  const countWeight = options.countWeight ?? 0;
  const entries = snapshot.languages.items
    .filter((item) => item.bytes > 0 && !hidden.has(item.name.toLowerCase()))
    .map((item) => ({
      ...item,
      score: item.bytes ** sizeWeight * item.repositoryCount ** countWeight,
    }))
    .filter((item) => Number.isFinite(item.score) && item.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const totalScore = entries.reduce((sum, item) => sum + item.score, 0);
  const totalBytes = entries.reduce((sum, item) => sum + item.bytes, 0);
  const count = options.count ?? (options.layout === "compact" ? 6 : 5);
  const fallbackColors = [style.strong, style.icon, ...style.heatmap.slice(1)];
  const shown = entries.slice(0, count).map((item, index) => ({
    name: item.name,
    bytes: item.bytes,
    score: item.score,
    share: totalScore > 0 ? item.score / totalScore : 0,
    color: /^#[a-f\d]{6}$/i.test(item.color ?? "")
      ? (item.color ?? style.icon)
      : (fallbackColors[index % fallbackColors.length] ?? style.icon),
  }));
  const remainder = entries.slice(count);
  if (remainder.length)
    shown.push({
      name: otherLabel,
      bytes: remainder.reduce((sum, item) => sum + item.bytes, 0),
      score: remainder.reduce((sum, item) => sum + item.score, 0),
      share: totalScore > 0 ? remainder.reduce((sum, item) => sum + item.score, 0) / totalScore : 0,
      color: style.muted,
    });
  return { segments: shown, totalBytes, weighted: sizeWeight !== 1 || countWeight !== 0 };
}

function circlePoint(
  x: number,
  y: number,
  radius: number,
  angle: number,
): { x: number; y: number } {
  return { x: x + radius * Math.cos(angle), y: y + radius * Math.sin(angle) };
}

function chart(
  segments: LanguageSegment[],
  x: number,
  y: number,
  radius: number,
  donut: boolean,
): string {
  let angle = -Math.PI / 2;
  return segments
    .map((segment) => {
      if (segment.share <= 0) return "";
      if (segment.share >= 1 - Number.EPSILON)
        return `<circle cx="${x}" cy="${y}" r="${radius}" ${donut ? `fill="none" stroke="${segment.color}" stroke-width="${radius * 0.38}"` : `fill="${segment.color}"`}/>`;
      const endAngle = angle + segment.share * Math.PI * 2;
      const start = circlePoint(x, y, radius, angle);
      const end = circlePoint(x, y, radius, endAngle);
      const arc = `M${start.x.toFixed(6)} ${start.y.toFixed(6)}A${radius} ${radius} 0 ${segment.share > 0.5 ? 1 : 0} 1 ${end.x.toFixed(6)} ${end.y.toFixed(6)}`;
      angle = endAngle;
      return donut
        ? `<path d="${arc}" fill="none" stroke="${segment.color}" stroke-width="${radius * 0.38}"/>`
        : `<path d="M${x} ${y}L${start.x.toFixed(6)} ${start.y.toFixed(6)}${arc.slice(arc.indexOf("A"))}Z" fill="${segment.color}"/>`;
    })
    .join("");
}

function renderLanguages(
  snapshot: ExtendedProfileSnapshot,
  locale: ContentLocale,
  options: RenderOptions,
  style: ResolvedCardAppearance,
): string {
  const strings = labels[locale];
  const languageOptions = options.extended?.languages ?? {};
  const title = style.customTitle?.trim() || strings.languages;
  const heading = header(snapshot, title, style);
  const { segments, totalBytes, weighted } = languageSegments(
    snapshot,
    languageOptions,
    style,
    strings.other,
  );
  const layout = languageOptions.layout ?? "normal";
  const rowHeight = Math.max(24, style.lineHeight);
  const languageValue = (segment: LanguageSegment): string =>
    languageOptions.hideValues
      ? ""
      : languageOptions.format === "bytes"
        ? bytes(segment.bytes, locale, style.numberPrecision)
        : `${formatNumber(segment.share * 100, locale, { ...style, numberFormat: "long" }, style.numberPrecision)}%`;
  let body = heading.body;
  let bottom = heading.next;
  const list = (
    x: number,
    startY: number,
    width: number,
    entries: LanguageSegment[],
    bars: boolean,
  ): number => {
    for (const [index, segment] of entries.entries()) {
      const y =
        startY + index * (bars && !languageOptions.hideProgress ? rowHeight + 16 : rowHeight);
      const value = languageValue(segment);
      const right = x + width;
      body +=
        `<circle cx="${x + 4}" cy="${y - 4}" r="4" fill="${segment.color}"/>` +
        text(
          x + 16,
          y,
          bounded(segment.name, Math.max(10, Math.floor((width - (value ? 140 : 24)) / 8))),
          `font-size="13" font-weight="${style.textBold ? 600 : 400}"`,
        ) +
        (value
          ? text(right, y, value, `font-size="12" text-anchor="end" fill="${style.muted}"`)
          : "");
      if (bars && !languageOptions.hideProgress) {
        body += `<rect x="${x}" y="${y + 7}" width="${width}" height="7" rx="3" fill="${style.panel}"/><rect x="${x}" y="${y + 7}" width="${(width * segment.share).toFixed(6)}" height="7" fill="${segment.color}"/>`;
      }
    }
    return (
      startY +
      Math.max(0, entries.length - 1) *
        (bars && !languageOptions.hideProgress ? rowHeight + 16 : rowHeight) +
      (bars && !languageOptions.hideProgress ? 16 : 0)
    );
  };
  if (!segments.length) {
    const note = footer([strings.noLanguages], heading.next, style);
    body += note.body;
    bottom = note.height;
  } else if (layout === "normal") {
    bottom = list(24, heading.next, style.width - 48, segments, true);
  } else if (layout === "compact") {
    let startY = heading.next;
    if (!languageOptions.hideProgress) {
      let x = 24;
      for (const segment of segments) {
        const width = (style.width - 48) * segment.share;
        body += `<rect x="${x.toFixed(6)}" y="${startY - 12}" width="${width.toFixed(6)}" height="12" fill="${segment.color}"/>`;
        x += width;
      }
      startY += 30;
    }
    const first: LanguageSegment[] = [],
      second: LanguageSegment[] = [];
    segments.forEach((segment, index) => (index % 2 ? second : first).push(segment));
    const columnWidth = (style.width - 80) / 2;
    bottom = Math.max(
      list(24, startY, columnWidth, first, false),
      list(style.width / 2 + 16, startY, columnWidth, second, false),
    );
  } else if (languageOptions.hideProgress) {
    bottom = list(24, heading.next, style.width - 48, segments, false);
  } else if (layout === "donut-vertical") {
    const radius = 76;
    const centerY = heading.next + 80;
    body += chart(segments, style.width / 2, centerY, radius, true);
    bottom = list(24, centerY + 122, style.width - 48, segments, false);
  } else {
    const radius = 76;
    const centerY = heading.next + 82;
    body += chart(segments, 126, centerY, radius, layout === "donut");
    const listBottom = list(260, heading.next + 10, style.width - 284, segments, false);
    bottom = Math.max(centerY + radius + (layout === "donut" ? radius * 0.2 : 0), listBottom);
  }
  const languageSampleUnavailable =
    snapshot.languages.truncated &&
    snapshot.languages.repositoriesAnalyzed === 0 &&
    snapshot.languages.repositoriesTotal === 0 &&
    snapshot.languages.items.length === 0;
  const notes = [
    weighted ? strings.weightedScope : strings.languageScope,
    ...(weighted
      ? [
          `${strings.weights} ${languageOptions.sizeWeight ?? 1}; ${strings.countWeight} ${languageOptions.countWeight ?? 0}.`,
        ]
      : []),
    ...(languageSampleUnavailable
      ? []
      : [
          `${formatNumber(snapshot.languages.repositoriesAnalyzed, locale, style)} ${strings.of} ${formatNumber(snapshot.languages.repositoriesTotal, locale, style)} ${strings.analyzed}. ${strings.noForks}`,
          `${bytes(totalBytes, locale, style.numberPrecision)} ${strings.bytes}. ${strings.languagePeriod}`,
        ]),
    ...(snapshot.languages.truncated ? [strings.truncated] : []),
    `${options.stale ? strings.stale : strings.updated}: ${formatDate(snapshot.fetchedAt, locale)} · ${strings.publicOnly}`,
  ];
  const ending = footer(notes, bottom + 34, style);
  const description = [
    title,
    `${snapshot.displayName} (@${snapshot.username})`,
    ...segments.map((segment) =>
      languageOptions.hideValues ? segment.name : `${segment.name}: ${languageValue(segment)}`,
    ),
    ...notes,
  ].join(". ");
  return frame(title, description, body + ending.body, ending.height, style, locale);
}

export function renderExtendedProfileCard(
  snapshot: ExtendedProfileSnapshot,
  card: "extended-stats" | "extended-languages",
  locale: ContentLocale,
  options: RenderOptions = {},
): string {
  const style = resolveCardAppearance(options.appearance);
  return card === "extended-stats"
    ? renderStats(snapshot, locale, options, style)
    : renderLanguages(snapshot, locale, options, style);
}
