import type { CardAppearance } from "../profile/module-content";
import type { ContentLocale } from "../profile/profile-schema";
import {
  cardBackground,
  resolveCardAppearance,
  type ResolvedCardAppearance,
} from "./card-appearance";
import type { ResourceKind, ResourceSnapshot } from "./resource-types";
import type { ExtendedMetric } from "./extended-types";
import type { repositoryContributionStatIds } from "./extended-options";

export type ResourceCardRenderOptions = {
  appearance?: CardAppearance;
  stale?: boolean;
  showOwner?: boolean;
  descriptionLines?: number;
  displayFormat?: "time" | "percent";
  languageCount?: number;
  hideProgress?: boolean;
  hideLanguages?: string[];
  layout?: "default" | "compact";
  contributions?: {
    username: string;
    fetchedAt?: string;
    stale?: boolean;
    items: { id: (typeof repositoryContributionStatIds)[number]; metric: ExtendedMetric }[];
  };
};

const labels = {
  en: {
    repository: "Public GitHub repository",
    gist: "Public GitHub Gist",
    wakatime: "Public WakaTime activity",
    stars: "Stars",
    forks: "Forks",
    files: "Files",
    comments: "Comments",
    owner: "Owner",
    updated: "Updated",
    stale: "Last available data",
    noDescription: "No description provided.",
    noLanguages: "No language activity in this period.",
    lastSevenDays: "Last 7 days reported by WakaTime",
    hiddenLanguages: "No languages to display with these filters.",
    scope: "Recorded editor time; it does not measure skill or productivity.",
    total: "Total recorded time",
    unavailable: "Public data is not available.",
    unavailableHelp: "Check the public identifier and provider settings, then try again.",
  },
  es: {
    repository: "Repositorio público de GitHub",
    gist: "Gist público de GitHub",
    wakatime: "Actividad pública de WakaTime",
    stars: "Estrellas",
    forks: "Forks",
    files: "Archivos",
    comments: "Comentarios",
    owner: "Autor",
    updated: "Actualizado",
    stale: "Últimos datos disponibles",
    noDescription: "Sin descripción.",
    noLanguages: "Sin actividad de lenguajes en este período.",
    lastSevenDays: "Últimos 7 días informados por WakaTime",
    hiddenLanguages: "No hay lenguajes para mostrar con estos filtros.",
    scope: "Tiempo registrado en el editor; no mide habilidad ni productividad.",
    total: "Tiempo total registrado",
    unavailable: "Los datos públicos no están disponibles.",
    unavailableHelp: "Revisá el identificador público y la configuración del proveedor.",
  },
} as const;

/** XML 1.0 text only, bounded independently of upstream field limits. */
function plain(value: string, maxLength = 1000): string {
  return Array.from(value)
    .slice(0, maxLength)
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
    .join("");
}

function xml(value: string, maxLength = 1000): string {
  return plain(value, maxLength)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function units(character: string): number {
  const code = character.codePointAt(0) ?? 0;
  return (code >= 0x1100 && code <= 0x115f) ||
    (code >= 0x2e80 && code <= 0xa4cf) ||
    (code >= 0xac00 && code <= 0xd7a3) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0xfe10 && code <= 0xffef) ||
    code >= 0x1f000
    ? 2
    : 1;
}

function boundedLines(value: string, maximumUnits: number, count: number): string[] {
  const characters = Array.from(plain(value).replace(/\s+/g, " ").trim());
  const lines: string[] = [];
  let line = "";
  let width = 0;
  for (const [index, character] of characters.entries()) {
    if (width + units(character) > maximumUnits) {
      if (lines.length === count - 1) {
        lines.push(`${Array.from(line.trimEnd()).slice(0, -1).join("")}…`);
        return lines;
      }
      lines.push(line.trimEnd());
      line = "";
      width = 0;
    }
    if (line || character !== " ") {
      line += character;
      width += units(character);
    }
    if (index === characters.length - 1 && line) lines.push(line);
  }
  return lines;
}

function text(x: number, y: number, value: string, attributes = ""): string {
  return `<text x="${x}" y="${y}" ${attributes}>${xml(value)}</text>`;
}

function date(value: string, locale: ContentLocale): string {
  const instant = new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
  if (!Number.isFinite(instant.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(instant);
}

function number(value: number, locale: ContentLocale, theme?: ResolvedCardAppearance): string {
  return new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    notation: theme?.numberFormat === "short" ? "compact" : "standard",
    maximumFractionDigits: theme?.numberPrecision ?? 0,
  }).format(value);
}

function time(seconds: number, locale: ContentLocale): string {
  if (seconds > 0 && seconds < 60) return "< 1 min";
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  return hours ? `${number(hours, locale)} h ${minutes % 60} min` : `${minutes} min`;
}

function frame(
  title: string,
  description: string,
  locale: ContentLocale,
  theme: ResolvedCardAppearance,
  height: number,
  body: string,
): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${theme.width}" height="${height}" viewBox="0 0 ${theme.width} ${height}" role="img" aria-labelledby="card-title card-description" lang="${locale}"><title id="card-title">${xml(title)}</title><desc id="card-description">${xml(description, 4000)}</desc>${cardBackground(theme, height)}<g font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fill="${theme.foreground}">${body}</g></svg>`;
}

function icon(
  kind: ResourceKind | "stars" | "forks" | "files" | "comments",
  x: number,
  y: number,
  theme: ResolvedCardAppearance,
): string {
  const paths = {
    repository: '<path d="M2 2h11v12H2zM5 2v12M5 11h5"/>',
    gist: '<path d="M5 1h6l3 3v11H2V1h3m6 0v4h3M6 7 4 9l2 2m4-4 2 2-2 2"/>',
    wakatime: '<circle cx="8" cy="8" r="6"/><path d="M8 4v4l3 2"/>',
    stars: '<path d="m8 1 2.1 4.3 4.8.7-3.5 3.4.8 4.8L8 12l-4.2 2.2.8-4.8L1.1 6l4.8-.7z"/>',
    forks:
      '<circle cx="4" cy="3" r="2"/><circle cx="12" cy="3" r="2"/><circle cx="8" cy="13" r="2"/><path d="M4 5v1c0 2 4 2 4 4v1m4-6v1c0 2-4 2-4 4"/>',
    files: '<path d="M5 1h6l3 3v10H5zM2 4v11h9M11 1v4h3"/>',
    comments: '<path d="M1 2h14v9H7l-4 3v-3H1z"/>',
  } as const;
  return `<g transform="translate(${x} ${y})" fill="none" stroke="${theme.icon}" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">${paths[kind]}</g>`;
}

function heading(
  kind: ResourceKind,
  title: string,
  y: number,
  theme: ResolvedCardAppearance,
): string {
  if (theme.hideTitle) return "";
  const x = theme.showIcons ? 48 : 24;
  const line = boundedLines(title, Math.floor((theme.width - x - 24) / 11), 1)[0] ?? "";
  return (
    (theme.showIcons ? icon(kind, 24, y - 15, theme) : "") +
    text(x, y, line, `font-size="19" font-weight="650" fill="${theme.title}"`)
  );
}

function footer(
  snapshot: ResourceSnapshot,
  locale: ContentLocale,
  stale: boolean,
  height: number,
  theme: ResolvedCardAppearance,
): string {
  const t = labels[locale];
  return text(
    24,
    height - 20,
    `${t.updated}: ${date(snapshot.fetchedAt, locale)} (UTC)${stale ? ` · ${t.stale}` : ""}`,
    `font-size="11" fill="${theme.muted}"`,
  );
}

function statistic(
  x: number,
  y: number,
  label: string,
  value: number,
  locale: ContentLocale,
  theme: ResolvedCardAppearance,
  width: number,
  kind: "stars" | "forks" | "files" | "comments",
): string {
  const valueText = number(value, locale, theme);
  const fontSize = Math.min(22, width / (Array.from(valueText).length * 0.63));
  return (
    (theme.showIcons ? icon(kind, x, y - 12, theme) : "") +
    text(x + (theme.showIcons ? 22 : 0), y, label, `font-size="12" fill="${theme.muted}"`) +
    text(
      x,
      y + 26,
      valueText,
      `font-size="${fontSize.toFixed(2)}" font-weight="${theme.textBold ? 650 : 400}"`,
    )
  );
}

function metadataCard(
  snapshot: Extract<ResourceSnapshot, { kind: "repository" | "gist" }>,
  locale: ContentLocale,
  options: ResourceCardRenderOptions,
): string {
  const t = labels[locale];
  const theme = resolveCardAppearance(options.appearance);
  const defaultTitle =
    snapshot.kind === "repository"
      ? options.showOwner
        ? `${snapshot.owner}/${snapshot.name}`
        : snapshot.name
      : `Gist · ${snapshot.target.slice(0, 12)}${snapshot.target.length > 12 ? "…" : ""}`;
  const title = theme.customTitle ?? defaultTitle;
  const owner = options.showOwner ? `${t.owner}: @${snapshot.owner}` : t[snapshot.kind];
  const maxUnits = Math.floor((theme.width - 56) / 7.5);
  const description = boundedLines(
    snapshot.description || t.noDescription,
    maxUnits,
    Math.max(1, Math.min(3, options.descriptionLines ?? 3)),
  );
  const descriptionStart = theme.hideTitle ? 65 : 87;
  const statsY = descriptionStart + 14 + description.length * theme.lineHeight;
  const secondRow = snapshot.kind === "gist" ? theme.lineHeight + 32 : 0;
  const contributionLabels =
    locale === "es"
      ? {
          authoredPullRequests: "PR creadas",
          commentedPullRequests: "PR comentadas (otros autores)",
          reviewedPullRequests: "PR revisadas (otros autores)",
          authoredIssues: "Issues creadas",
          commentedIssues: "Issues comentadas (otros autores)",
        }
      : {
          authoredPullRequests: "PRs authored",
          commentedPullRequests: "PRs commented (other authors)",
          reviewedPullRequests: "PRs reviewed (other authors)",
          authoredIssues: "Issues authored",
          commentedIssues: "Issues commented (other authors)",
        };
  const contributionTop = statsY + secondRow + 70;
  const contributionRows = options.contributions?.items ?? [];
  const height =
    statsY +
    96 +
    secondRow +
    (contributionRows.length ? 52 + contributionRows.length * theme.lineHeight : 0);
  const secondColumn = Math.round(theme.width / 3) + 16;
  const thirdColumn = Math.round((theme.width * 2) / 3) + 8;
  const statisticWidth = secondColumn - 48;
  const body =
    heading(snapshot.kind, title, 34, theme) +
    text(24, theme.hideTitle ? 34 : 56, owner, `font-size="11" fill="${theme.muted}"`) +
    description
      .map((line, index) =>
        text(
          24,
          descriptionStart + index * theme.lineHeight,
          line,
          `font-size="13" fill="${theme.muted}"`,
        ),
      )
      .join("") +
    (theme.design === "panels"
      ? `<rect x="16" y="${statsY - 16}" width="${theme.width - 32}" height="64" rx="8" fill="${theme.panel}"/>`
      : "") +
    statistic(24, statsY, t.stars, snapshot.stars, locale, theme, statisticWidth, "stars") +
    statistic(
      secondColumn,
      statsY,
      t.forks,
      snapshot.forks,
      locale,
      theme,
      statisticWidth,
      "forks",
    ) +
    (snapshot.language
      ? `<circle cx="${thirdColumn}" cy="${statsY + 5}" r="5" fill="${snapshot.language.color ?? theme.accent}"/>` +
        text(
          thirdColumn + 13,
          statsY + 10,
          boundedLines(
            snapshot.language.name,
            Math.floor((theme.width - thirdColumn - 40) / 7.5),
            1,
          )[0] ?? "",
          'font-size="12"',
        )
      : "") +
    (snapshot.kind === "gist"
      ? statistic(
          24,
          statsY + secondRow,
          t.files,
          snapshot.files,
          locale,
          theme,
          statisticWidth,
          "files",
        ) +
        statistic(
          secondColumn,
          statsY + secondRow,
          t.comments,
          snapshot.comments,
          locale,
          theme,
          statisticWidth,
          "comments",
        )
      : "") +
    (contributionRows.length
      ? text(
          24,
          contributionTop,
          `@${options.contributions!.username} · ${locale === "es" ? "historial público en este repositorio" : "public history in this repository"}`,
          `font-size="11" fill="${theme.muted}"`,
        ) +
        contributionRows
          .map(({ id, metric }, index) =>
            text(
              24,
              contributionTop + 44 + index * theme.lineHeight,
              `${contributionLabels[id]}: ${metric.value === null ? "—" : `${metric.partial ? "≥ " : ""}${number(metric.value, locale, theme)}`}`,
              `font-size="12" fill="${theme.foreground}"`,
            ),
          )
          .join("") +
        text(
          24,
          contributionTop + 20,
          options.contributions?.fetchedAt
            ? `${t.updated}: ${date(options.contributions.fetchedAt, locale)} (UTC)${options.contributions.stale ? ` · ${t.stale}` : ""}`
            : t.unavailable,
          `font-size="11" fill="${theme.muted}"`,
        )
      : "") +
    footer(snapshot, locale, options.stale ?? false, height, theme);
  const details =
    snapshot.kind === "repository"
      ? `${t.stars}: ${snapshot.stars}. ${t.forks}: ${snapshot.forks}. ${snapshot.language?.name ?? ""}.`
      : `${t.stars}: ${snapshot.stars}. ${t.forks}: ${snapshot.forks}. ${t.files}: ${snapshot.files}. ${t.comments}: ${snapshot.comments}. ${snapshot.language?.name ?? ""}.`;
  return frame(
    title,
    `${title}. ${snapshot.target}. ${snapshot.description}. ${details} ${t.updated}: ${date(snapshot.fetchedAt, locale)} (UTC).${options.stale ? ` ${t.stale}.` : ""} ${options.contributions ? `@${options.contributions.username}. ${contributionRows.map(({ id, metric }) => `${contributionLabels[id]}: ${metric.value === null ? "—" : `${metric.partial ? "≥ " : ""}${number(metric.value, locale, theme)}`}`).join(". ")}. ${options.contributions.fetchedAt ? `${t.updated}: ${date(options.contributions.fetchedAt, locale)} (UTC).` : t.unavailable}${options.contributions.stale ? ` ${t.stale}.` : ""}` : ""}`,
    locale,
    theme,
    height,
    body,
  );
}

function wakaTimeCard(
  snapshot: Extract<ResourceSnapshot, { kind: "wakatime" }>,
  locale: ContentLocale,
  options: ResourceCardRenderOptions,
): string {
  const t = labels[locale];
  const theme = resolveCardAppearance(options.appearance);
  const hidden = new Set((options.hideLanguages ?? []).map((name) => name.toLowerCase()));
  const languages = snapshot.languages
    .filter((language) => !hidden.has(language.name.toLowerCase()))
    .sort(
      (first, second) => second.seconds - first.seconds || first.name.localeCompare(second.name),
    )
    .slice(0, Math.max(1, Math.min(20, options.languageCount ?? 5)));
  const compact = options.layout === "compact";
  const rowHeight = theme.lineHeight + (compact ? 3 : 16);
  const titleOffset = theme.hideTitle ? 22 : 0;
  const height = Math.max(240 - titleOffset, 188 + languages.length * rowHeight - titleOffset);
  const contentWidth = theme.width - 48;
  const period = snapshot.period
    ? `${date(snapshot.period.from, locale)} – ${date(snapshot.period.to, locale)}`
    : t.lastSevenDays;
  const title = theme.customTitle ?? t.wakatime;
  let body =
    heading("wakatime", title, 34, theme) +
    text(
      24,
      56 - titleOffset,
      `@${snapshot.target} · ${period}`,
      `font-size="11" fill="${theme.muted}"`,
    ) +
    text(
      24,
      86 - titleOffset,
      `${t.total}: ${time(snapshot.totalSeconds, locale)}`,
      `font-size="14" font-weight="${theme.textBold ? 600 : 400}"`,
    );
  for (const [index, language] of languages.entries()) {
    const y = 116 + index * rowHeight - titleOffset;
    const value =
      options.displayFormat === "percent"
        ? `${new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", { maximumFractionDigits: 1 }).format(language.percent)}%`
        : time(language.seconds, locale);
    body +=
      text(
        24,
        y,
        boundedLines(language.name, Math.floor(contentWidth / 12), 1)[0] ?? "",
        'font-size="12"',
      ) +
      text(theme.width - 24, y, value, `font-size="12" text-anchor="end" fill="${theme.muted}"`);
    if (!options.hideProgress) {
      const width = (contentWidth * language.percent) / 100;
      body += `<rect x="24" y="${y + 7}" width="${contentWidth}" height="${compact ? 4 : 6}" rx="2" fill="${theme.panel}"/>`;
      if (width > 0)
        body += `<rect x="24" y="${y + 7}" width="${width.toFixed(3)}" height="${compact ? 4 : 6}" rx="2" fill="${theme.accent}"/>`;
    }
  }
  if (!languages.length) {
    body += text(
      24,
      125 - titleOffset,
      snapshot.languages.length ? t.hiddenLanguages : t.noLanguages,
      `font-size="13" fill="${theme.muted}"`,
    );
  }
  body +=
    text(24, height - 43, t.scope, `font-size="11" fill="${theme.muted}"`) +
    footer(snapshot, locale, options.stale ?? false, height, theme);
  const details = languages
    .map(
      (language) => `${language.name}: ${time(language.seconds, locale)} (${language.percent}%).`,
    )
    .join(" ");
  return frame(
    title,
    `${title}. @${snapshot.target}. ${period}. ${t.total}: ${time(snapshot.totalSeconds, locale)}. ${details} ${t.scope} ${t.updated}: ${date(snapshot.fetchedAt, locale)} (UTC).${options.stale ? ` ${t.stale}.` : ""}`,
    locale,
    theme,
    height,
    body,
  );
}

export function renderResourceCard(
  snapshot: ResourceSnapshot,
  locale: ContentLocale,
  options: ResourceCardRenderOptions = {},
): string {
  return snapshot.kind === "wakatime"
    ? wakaTimeCard(snapshot, locale, options)
    : metadataCard(snapshot, locale, options);
}

export function renderResourceUnavailable(
  kind: ResourceKind,
  locale: ContentLocale,
  options: Pick<ResourceCardRenderOptions, "appearance"> = {},
): string {
  const t = labels[locale];
  const theme = resolveCardAppearance(options.appearance);
  const title = theme.customTitle ?? t[kind];
  const titleOffset = theme.hideTitle ? 22 : 0;
  const body =
    heading(kind, title, 34, theme) +
    text(24, 81 - titleOffset, t.unavailable, 'font-size="14"') +
    text(24, 108 - titleOffset, t.unavailableHelp, `font-size="12" fill="${theme.muted}"`);
  return frame(
    title,
    `${title}. ${t.unavailable} ${t.unavailableHelp}`,
    locale,
    theme,
    144 - titleOffset,
    body,
  );
}
