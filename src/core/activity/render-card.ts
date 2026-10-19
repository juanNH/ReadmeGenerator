import type { MetricCardId } from "../profile/module-content";
import type { ContentLocale } from "../profile/profile-schema";
import type { ActivitySnapshot } from "./activity-types";

const labels = {
  en: {
    calendar: "Contribution calendar",
    summary: "Activity summary",
    languages: "Repository languages",
    commits: "Commits",
    pullRequests: "Pull requests",
    issues: "Issues",
    reviews: "Reviews",
    contributions: "contributions in this period",
    noContributions: "No contributions recorded in this period.",
    privateCounts: "Includes anonymous private counts shared on GitHub.",
    updated: "Updated",
    stale: "Last available data",
    otherTypes: "The calendar can include other types of contributions.",
    repositories: "public, owned repositories analyzed. Forks excluded.",
    of: "of",
    languageScope: "Share of analyzed code bytes; this does not measure skill.",
    languagePeriod: "Repository snapshot; not limited to the contribution period.",
    truncated: "Sample only: repository or language limits were reached.",
    noLanguages: "No language data in the public repositories analyzed.",
    unavailable: "GitHub data is temporarily unavailable.",
    unavailableHelp: "Try again later. No activity figures are displayed.",
  },
  es: {
    calendar: "Calendario de contribuciones",
    summary: "Resumen de actividad",
    languages: "Lenguajes de repositorios",
    commits: "Commits",
    pullRequests: "Pull requests",
    issues: "Issues",
    reviews: "Revisiones",
    contributions: "contribuciones en este período",
    noContributions: "No se registran contribuciones en este período.",
    privateCounts: "Incluye recuentos privados anónimos compartidos en GitHub.",
    updated: "Actualizado",
    stale: "Últimos datos disponibles",
    otherTypes: "El calendario puede incluir otros tipos de contribuciones.",
    repositories: "repositorios públicos propios analizados. Sin forks.",
    of: "de",
    languageScope: "Proporción de bytes analizados; no mide conocimientos.",
    languagePeriod: "Repositorios actuales; sin limitarse al período de contribuciones.",
    truncated: "Muestra parcial: se alcanzaron límites de repositorios o lenguajes.",
    noLanguages: "Sin datos de lenguajes en los repositorios públicos analizados.",
    unavailable: "Los datos de GitHub no están disponibles temporalmente.",
    unavailableHelp: "Intentá más tarde. No se muestran cifras de actividad.",
  },
} as const;

type CardLabels = (typeof labels)[ContentLocale];

/** XML 1.0 characters only, with bounded text and no user-controlled markup. */
function xml(value: string, maxLength = 500): string {
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
    .join("")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function dateValue(value: string): Date {
  return new Date(value.length === 10 ? `${value}T00:00:00Z` : value);
}

function formatDate(value: string, locale: ContentLocale): string {
  const date = dateValue(value);
  if (!Number.isFinite(date.getTime())) return "—";
  return new Intl.DateTimeFormat(locale === "es" ? "es-AR" : "en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatNumber(value: number, locale: ContentLocale, compact = false): string {
  return new Intl.NumberFormat(locale === "es" ? "es-AR" : "en-US", {
    notation: compact && value >= 1_000_000 ? "compact" : "standard",
    maximumFractionDigits: compact ? 1 : 0,
  }).format(value);
}

function text(x: number, y: number, value: string, attributes = ""): string {
  return `<text x="${x}" y="${y}" ${attributes}>${xml(value)}</text>`;
}

function frame(
  card: MetricCardId,
  locale: ContentLocale,
  height: number,
  description: string,
  body: string,
) {
  const title = labels[locale][card];
  return `<svg xmlns="http://www.w3.org/2000/svg" width="700" height="${height}" viewBox="0 0 700 ${height}" role="img" aria-labelledby="card-title card-description" lang="${locale}"><title id="card-title">${xml(title)}</title><desc id="card-description">${xml(description, 1800)}</desc><rect x="0.5" y="0.5" width="699" height="${height - 1}" rx="14" fill="#fbfdfb" stroke="#cad6ce"/><g font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fill="#18392b">${body}</g></svg>`;
}

function heading(card: MetricCardId, snapshot: ActivitySnapshot, locale: ContentLocale): string {
  return (
    text(24, 32, labels[locale][card], 'font-size="18" font-weight="650"') +
    text(24, 54, `@${snapshot.username}`, 'font-size="12" fill="#4d6157"')
  );
}

function description(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  stale: boolean,
  content: string,
  showPeriod = true,
): string {
  const t = labels[locale];
  const period = showPeriod
    ? `${formatDate(snapshot.period.from, locale)} – ${formatDate(snapshot.period.to, locale)}`
    : t.languagePeriod;
  return `${snapshot.username}. ${period}. ${t.updated}: ${formatDate(snapshot.fetchedAt, locale)} (UTC). ${stale ? `${t.stale}. ` : ""}${content}`;
}

function footer(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  height: number,
  stale: boolean,
  showPeriod = true,
): string {
  const t = labels[locale];
  return (
    text(
      24,
      height - 40,
      showPeriod
        ? `${formatDate(snapshot.period.from, locale)} – ${formatDate(snapshot.period.to, locale)}`
        : t.languagePeriod,
      'font-size="11" fill="#4d6157"',
    ) +
    text(
      24,
      height - 20,
      `${t.updated}: ${formatDate(snapshot.fetchedAt, locale)} (UTC)${stale ? ` · ${t.stale}` : ""}`,
      `font-size="11" fill="${stale ? "#80541c" : "#4d6157"}"`,
    )
  );
}

function renderCalendar(snapshot: ActivitySnapshot, locale: ContentLocale, stale: boolean): string {
  const t = labels[locale];
  const height = snapshot.calendar.includesPrivateCounts ? 266 : 246;
  const colors = ["#ebf0ec", "#acd4b7", "#64a77c", "#327c50", "#185c36"];
  const cells: string[] = [];
  let previousMonth = "";
  let lastLabelX = -40;
  for (const [weekIndex, week] of snapshot.calendar.weeks.slice(0, 54).entries()) {
    const x = 24 + weekIndex * 12;
    for (const day of week.days.slice(0, 7)) {
      const date = dateValue(day.date);
      if (!Number.isFinite(date.getTime())) continue;
      const month = day.date.slice(0, 7);
      if (month !== previousMonth) {
        if (x - lastLabelX >= 34) {
          cells.push(
            text(
              x,
              76,
              new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(date),
              'font-size="10" fill="#4d6157"',
            ),
          );
          lastLabelX = x;
        }
        previousMonth = month;
      }
      const y = 86 + date.getUTCDay() * 12;
      const color = colors[day.level] ?? colors[0];
      cells.push(
        `<rect x="${x}" y="${y}" width="9" height="9" rx="2" fill="${color}" stroke="#809a89" stroke-width="0.35"><title>${xml(`${formatDate(day.date, locale)}: ${formatNumber(day.count, locale)}`)}</title></rect>`,
      );
    }
  }
  const total =
    snapshot.calendar.total === 0
      ? t.noContributions
      : `${formatNumber(snapshot.calendar.total, locale)} ${t.contributions}`;
  const privateNote = snapshot.calendar.includesPrivateCounts
    ? text(24, 206, t.privateCounts, 'font-size="11" fill="#4d6157"')
    : "";
  return frame(
    "calendar",
    locale,
    height,
    description(
      snapshot,
      locale,
      stale,
      `${total} ${snapshot.calendar.includesPrivateCounts ? t.privateCounts : ""}`,
    ),
    heading("calendar", snapshot, locale) +
      cells.join("") +
      text(24, 186, total, 'font-size="12" font-weight="600"') +
      privateNote +
      footer(snapshot, locale, height, stale),
  );
}

function renderSummary(snapshot: ActivitySnapshot, locale: ContentLocale, stale: boolean): string {
  const t = labels[locale];
  const height = 238;
  const entries = [
    [t.commits, snapshot.summary.commits],
    [t.pullRequests, snapshot.summary.pullRequests],
    [t.issues, snapshot.summary.issues],
    [t.reviews, snapshot.summary.reviews],
  ] as const;
  const statistics = entries
    .map(([label, count], index) => {
      const x = 24 + index * 166;
      return (
        `<rect x="${x}" y="75" width="154" height="78" rx="8" fill="#edf4ef"/>` +
        text(x + 14, 109, formatNumber(count, locale, true), 'font-size="25" font-weight="650"') +
        text(x + 14, 134, label, 'font-size="12" fill="#4d6157"')
      );
    })
    .join("");
  return frame(
    "summary",
    locale,
    height,
    description(
      snapshot,
      locale,
      stale,
      `${entries.map(([label, count]) => `${label}: ${formatNumber(count, locale)}`).join(". ")}.`,
    ),
    heading("summary", snapshot, locale) +
      statistics +
      text(24, 177, t.otherTypes, 'font-size="11" fill="#4d6157"') +
      footer(snapshot, locale, height, stale),
  );
}

function languageScope(snapshot: ActivitySnapshot, t: CardLabels, locale: ContentLocale): string {
  return `${formatNumber(snapshot.languages.repositoriesAnalyzed, locale)} ${t.of} ${formatNumber(snapshot.languages.repositoriesTotal, locale)} ${t.repositories}`;
}

function renderLanguages(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  stale: boolean,
): string {
  const t = labels[locale];
  const allItems = snapshot.languages.items.filter((item) => item.bytes > 0);
  const items = [...allItems]
    .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name, "en"))
    .slice(0, 10);
  const totalBytes = allItems.reduce((total, item) => total + item.bytes, 0);
  const scope = languageScope(snapshot, t, locale);
  const rowsHeight = Math.max(items.length, 1) * 28;
  const notesStart = 100 + rowsHeight;
  const height = notesStart + (snapshot.languages.truncated ? 108 : 88);
  const rows =
    items.length === 0
      ? text(24, 97, t.noLanguages, 'font-size="12" fill="#4d6157"')
      : items
          .map((item, index) => {
            const y = 92 + index * 28;
            const fraction = item.bytes / totalBytes;
            const percent = fraction * 100;
            const percentText =
              percent < 0.1
                ? "<0.1%"
                : new Intl.NumberFormat(locale, {
                    style: "percent",
                    maximumFractionDigits: 1,
                  }).format(fraction);
            const color = item.color && /^#[a-f\d]{6}$/i.test(item.color) ? item.color : "#327c50";
            return (
              text(24, y, Array.from(item.name).slice(0, 28).join(""), 'font-size="12"') +
              `<rect x="224" y="${y - 10}" width="360" height="10" rx="3" fill="#e8eeea"/><rect x="224" y="${y - 10}" width="${(fraction * 360).toFixed(2)}" height="10" rx="3" fill="${color}" stroke="#4d6157" stroke-width="0.5"/>` +
              text(676, y, percentText, 'font-size="12" text-anchor="end" fill="#4d6157"')
            );
          })
          .join("");
  return frame(
    "languages",
    locale,
    height,
    description(
      snapshot,
      locale,
      stale,
      `${scope} ${t.languageScope} ${items.length === 0 ? t.noLanguages : items.map((item) => `${Array.from(item.name).slice(0, 100).join("")}: ${formatNumber(item.bytes, locale)} bytes`).join(". ")}${snapshot.languages.truncated ? `. ${t.truncated}` : ""}`,
      false,
    ),
    heading("languages", snapshot, locale) +
      rows +
      text(24, notesStart, scope, 'font-size="11" fill="#4d6157"') +
      text(24, notesStart + 18, t.languageScope, 'font-size="11" fill="#4d6157"') +
      (snapshot.languages.truncated
        ? text(24, notesStart + 36, t.truncated, 'font-size="11" fill="#80541c"')
        : "") +
      footer(snapshot, locale, height, stale, false),
  );
}

/** Receives a validated public snapshot; never fetches, persists, or reads the current time. */
export function renderActivityCard(
  snapshot: ActivitySnapshot,
  card: MetricCardId,
  locale: ContentLocale,
  options: { stale?: boolean } = {},
): string {
  switch (card) {
    case "calendar":
      return renderCalendar(snapshot, locale, options.stale === true);
    case "summary":
      return renderSummary(snapshot, locale, options.stale === true);
    case "languages":
      return renderLanguages(snapshot, locale, options.stale === true);
  }
}

/** An unavailable response has no fabricated zero counts or cached dates. */
export function renderActivityUnavailable(card: MetricCardId, locale: ContentLocale): string {
  const t = labels[locale];
  return frame(
    card,
    locale,
    154,
    `${t.unavailable} ${t.unavailableHelp}`,
    text(24, 32, t[card], 'font-size="18" font-weight="650"') +
      text(24, 77, t.unavailable, 'font-size="13" font-weight="600"') +
      text(24, 104, t.unavailableHelp, 'font-size="12" fill="#4d6157"'),
  );
}
