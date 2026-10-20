import type {
  CardAppearance,
  ProfileActivityCardId as MetricCardId,
  OwnMetricCardId,
} from "../profile/module-content";
import type { ContentLocale } from "../profile/profile-schema";
import type { ActivitySnapshot } from "./activity-types";
import {
  cardBackground,
  resolveCardAppearance,
  type ResolvedCardAppearance,
} from "./card-appearance";
import { getMonthlyActivity } from "./render-monthly";
import { renderExtendedCard } from "./render-extended-card";

const labels = {
  en: {
    calendar: "Contribution calendar",
    summary: "Activity summary",
    languages: "Repository languages",
    panorama: "Public activity panorama",
    monthly: "Activity by month",
    "extended-stats": "GitHub Stats Extended",
    "extended-languages": "GitHub Stats Extended languages",
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
    partialMonth: "partial month",
    incompleteMonth: "incomplete calendar",
    noCalendar: "No calendar data",
    monthlyScope: "UTC calendar totals. Partial months cover only the contribution period.",
    monthlyMissing: "Missing dates are not zero activity; incomplete totals are subtotals.",
    monthlyLimit: "Only the first 24 months of this period are displayed.",
  },
  es: {
    calendar: "Calendario de contribuciones",
    summary: "Resumen de actividad",
    languages: "Lenguajes de repositorios",
    panorama: "Panorama de actividad pública",
    monthly: "Actividad por mes",
    "extended-stats": "GitHub Stats Extended",
    "extended-languages": "Lenguajes de GitHub Stats Extended",
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
    partialMonth: "mes parcial",
    incompleteMonth: "calendario incompleto",
    noCalendar: "Sin datos de calendario",
    monthlyScope: "Totales UTC. Los meses parciales cubren solo el período de contribuciones.",
    monthlyMissing: "Fechas ausentes no son ceros; los totales incompletos son subtotales.",
    monthlyLimit: "Se muestran solo los primeros 24 meses de este período.",
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

function styledFrame(
  card: MetricCardId,
  locale: ContentLocale,
  height: number,
  cardDescription: string,
  body: string,
  appearance: ResolvedCardAppearance,
): string {
  const { width, design, border, foreground, accent } = appearance;
  const borderShape = cardBackground(appearance, height);
  const decoration =
    design === "panels"
      ? `<rect x="0" y="22" width="5" height="32" rx="2" fill="${accent}"/>`
      : design === "classic"
        ? `<path d="M24 65H${width - 24}" stroke="${border}"/>`
        : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="card-title card-description" lang="${locale}"><title id="card-title">${xml(appearance.customTitle ?? labels[locale][card])}</title><desc id="card-description">${xml(cardDescription, 6000)}</desc>${borderShape}${decoration}<g font-family="system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif" fill="${foreground}">${body}</g></svg>`;
}

function styledHeading(
  card: MetricCardId,
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  appearance: ResolvedCardAppearance,
): string {
  return (
    (appearance.hideTitle
      ? ""
      : text(
          24,
          32,
          Array.from(appearance.customTitle ?? labels[locale][card])
            .slice(0, Math.floor((appearance.width - 48) / 11))
            .join(""),
          `font-size="19" font-weight="650" fill="${appearance.title}"`,
        )) + text(24, 54, `@${snapshot.username}`, `font-size="12" fill="${appearance.muted}"`)
  );
}

function styledFooter(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  height: number,
  stale: boolean,
  appearance: ResolvedCardAppearance,
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
      `font-size="11" fill="${appearance.muted}"`,
    ) +
    text(
      24,
      height - 20,
      `${t.updated}: ${formatDate(snapshot.fetchedAt, locale)} (UTC)${stale ? ` · ${t.stale}` : ""}`,
      `font-size="11" fill="${stale ? appearance.warning : appearance.muted}"`,
    )
  );
}

function panel(
  x: number,
  y: number,
  width: number,
  height: number,
  appearance: ResolvedCardAppearance,
): string {
  if (appearance.design === "minimal") return "";
  if (appearance.design === "classic") {
    return `<path d="M${x} ${y + height}H${x + width}" stroke="${appearance.border}"/>`;
  }
  return `<rect x="${x}" y="${y}" width="${width}" height="${height}" rx="12" fill="${appearance.panel}"/>`;
}

function summaryEntries(snapshot: ActivitySnapshot, locale: ContentLocale) {
  const t = labels[locale];
  return [
    [t.commits, snapshot.summary.commits],
    [t.pullRequests, snapshot.summary.pullRequests],
    [t.issues, snapshot.summary.issues],
    [t.reviews, snapshot.summary.reviews],
  ] as const;
}

function summaryBlock(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  appearance: ResolvedCardAppearance,
  y: number,
  columns: 2 | 4,
): { body: string; height: number } {
  const gap = 12;
  const cellWidth = (appearance.width - 48 - gap * (columns - 1)) / columns;
  const rowHeight = appearance.design === "minimal" ? 70 : 86;
  const body = summaryEntries(snapshot, locale)
    .map(([label, count], index) => {
      const x = 24 + (index % columns) * (cellWidth + gap);
      const top = y + Math.floor(index / columns) * (rowHeight + gap);
      const inset = appearance.design === "panels" ? 16 : 0;
      return (
        panel(x, top, cellWidth, rowHeight, appearance) +
        text(
          x + inset,
          top + 35,
          formatNumber(count, locale, true),
          `font-size="28" font-weight="650" fill="${appearance.strong}"`,
        ) +
        text(x + inset, top + 59, label, `font-size="12" fill="${appearance.muted}"`)
      );
    })
    .join("");
  return { body, height: (4 / columns) * (rowHeight + gap) - gap };
}

function calendarBlock(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  appearance: ResolvedCardAppearance,
  y: number,
): { body: string; height: number } {
  const t = labels[locale];
  const gap = (appearance.width - 48) / 54;
  const cellSize = Math.min(gap - 3, appearance.size === "wide" ? 12 : 9);
  const rowStep = cellSize + 3;
  const cells: string[] = [];
  let previousMonth = "";
  let lastLabelX = -50;
  for (const [weekIndex, week] of snapshot.calendar.weeks.slice(0, 54).entries()) {
    const x = 24 + weekIndex * gap;
    for (const day of week.days.slice(0, 7)) {
      const date = dateValue(day.date);
      if (!Number.isFinite(date.getTime())) continue;
      const month = day.date.slice(0, 7);
      if (month !== previousMonth) {
        if (x - lastLabelX >= 38) {
          cells.push(
            text(
              x,
              y + 10,
              new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" }).format(date),
              `font-size="10" fill="${appearance.muted}"`,
            ),
          );
          lastLabelX = x;
        }
        previousMonth = month;
      }
      const top = y + 22 + date.getUTCDay() * rowStep;
      cells.push(
        `<rect x="${x.toFixed(2)}" y="${top}" width="${cellSize.toFixed(2)}" height="${cellSize.toFixed(2)}" rx="${appearance.design === "minimal" ? 0 : 2}" fill="${appearance.heatmap[day.level] ?? appearance.heatmap[0]}" stroke="${appearance.border}" stroke-width="0.35"><title>${xml(`${formatDate(day.date, locale)}: ${formatNumber(day.count, locale)}`)}</title></rect>`,
      );
    }
  }
  const total =
    snapshot.calendar.total === 0
      ? t.noContributions
      : `${formatNumber(snapshot.calendar.total, locale)} ${t.contributions}`;
  const totalY = y + 22 + 7 * rowStep + 20;
  return {
    body:
      cells.join("") +
      text(24, totalY, total, `font-size="13" font-weight="600" fill="${appearance.strong}"`) +
      (snapshot.calendar.includesPrivateCounts
        ? text(24, totalY + 20, t.privateCounts, `font-size="11" fill="${appearance.muted}"`)
        : ""),
    height: totalY - y + (snapshot.calendar.includesPrivateCounts ? 34 : 14),
  };
}

function sortedLanguages(snapshot: ActivitySnapshot, limit: number) {
  const allItems = snapshot.languages.items.filter((item) => item.bytes > 0);
  return {
    items: [...allItems]
      .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name, "en"))
      .slice(0, limit),
    totalBytes: allItems.reduce((total, item) => total + item.bytes, 0),
  };
}

function languagePercent(fraction: number, locale: ContentLocale) {
  return fraction * 100 < 0.1
    ? "<0.1%"
    : new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 1 }).format(
        fraction,
      );
}

function languageBlock(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  appearance: ResolvedCardAppearance,
  y: number,
  limit = 10,
): { body: string; height: number } {
  const t = labels[locale];
  const { items, totalBytes } = sortedLanguages(snapshot, limit);
  if (!items.length)
    return {
      body: text(24, y + 18, t.noLanguages, `font-size="12" fill="${appearance.muted}"`),
      height: 42,
    };
  const { width, design } = appearance;
  if (design === "minimal") {
    let offset = 24;
    const strip = items
      .map((item) => {
        const segmentWidth = (item.bytes / totalBytes) * (width - 48);
        const color =
          item.color && /^#[a-f\d]{6}$/i.test(item.color) ? item.color : appearance.accent;
        const shape = `<rect x="${offset.toFixed(2)}" y="${y}" width="${segmentWidth.toFixed(2)}" height="10" fill="${color}" stroke="${appearance.border}" stroke-width="0.5"><title>${xml(`${item.name}: ${formatNumber(item.bytes, locale)} bytes`)}</title></rect>`;
        offset += segmentWidth;
        return shape;
      })
      .join("");
    const rows = items
      .map((item, index) =>
        text(
          24,
          y + 36 + index * 24,
          `${Array.from(item.name).slice(0, 28).join("")} · ${languagePercent(item.bytes / totalBytes, locale)}`,
          `font-size="12" fill="${appearance.foreground}"`,
        ),
      )
      .join("");
    return {
      body:
        `<rect x="24" y="${y}" width="${width - 48}" height="10" fill="${appearance.panel}"/>` +
        strip +
        rows,
      height: 24 + items.length * 24,
    };
  }
  const columns = design === "panels" && appearance.size === "wide" ? 2 : 1;
  const cellWidth = (width - 48 - (columns - 1) * 16) / columns;
  const rowHeight = design === "panels" ? 64 : 30;
  const body = items
    .map((item, index) => {
      const x = 24 + (index % columns) * (cellWidth + 16);
      const top = y + Math.floor(index / columns) * rowHeight;
      const fraction = item.bytes / totalBytes;
      const color =
        item.color && /^#[a-f\d]{6}$/i.test(item.color) ? item.color : appearance.accent;
      if (design === "panels") {
        return (
          panel(x, top, cellWidth, rowHeight - 8, appearance) +
          text(x + 12, top + 21, Array.from(item.name).slice(0, 28).join(""), 'font-size="12"') +
          text(
            x + cellWidth - 12,
            top + 21,
            languagePercent(fraction, locale),
            `font-size="12" text-anchor="end" fill="${appearance.muted}"`,
          ) +
          `<rect x="${x + 12}" y="${top + 34}" width="${cellWidth - 24}" height="7" rx="3" fill="${appearance.background}"/><rect x="${x + 12}" y="${top + 34}" width="${(fraction * (cellWidth - 24)).toFixed(2)}" height="7" rx="3" fill="${color}" stroke="${appearance.border}" stroke-width="0.5"/>`
        );
      }
      const barX = x + Math.min(200, cellWidth * 0.33);
      const barWidth = cellWidth - (barX - x) - 88;
      return (
        text(x, top + 17, Array.from(item.name).slice(0, 28).join(""), 'font-size="12"') +
        `<rect x="${barX}" y="${top + 7}" width="${barWidth}" height="10" rx="3" fill="${appearance.panel}"/><rect x="${barX}" y="${top + 7}" width="${(fraction * barWidth).toFixed(2)}" height="10" rx="3" fill="${color}" stroke="${appearance.border}" stroke-width="0.5"/>` +
        text(
          x + cellWidth,
          top + 17,
          languagePercent(fraction, locale),
          `font-size="12" text-anchor="end" fill="${appearance.muted}"`,
        )
      );
    })
    .join("");
  return { body, height: Math.ceil(items.length / columns) * rowHeight };
}

function languageNotes(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  appearance: ResolvedCardAppearance,
  y: number,
  includePeriod = false,
): { body: string; height: number } {
  const t = labels[locale];
  const notes = [languageScope(snapshot, t, locale), t.languageScope];
  if (includePeriod) notes.push(t.languagePeriod);
  let body = notes
    .map((note, index) =>
      text(24, y + index * 18, note, `font-size="11" fill="${appearance.muted}"`),
    )
    .join("");
  if (snapshot.languages.truncated)
    body += text(
      24,
      y + notes.length * 18,
      t.truncated,
      `font-size="11" fill="${appearance.warning}"`,
    );
  return { body, height: (notes.length + Number(snapshot.languages.truncated)) * 18 };
}

function languageDescription(snapshot: ActivitySnapshot, locale: ContentLocale): string {
  const t = labels[locale];
  const { items } = sortedLanguages(snapshot, 10);
  return `${languageScope(snapshot, t, locale)} ${t.languageScope} ${t.languagePeriod} ${items.length ? items.map((item) => `${Array.from(item.name).slice(0, 100).join("")}: ${formatNumber(item.bytes, locale)} bytes`).join(". ") : t.noLanguages}${snapshot.languages.truncated ? `. ${t.truncated}` : ""}`;
}

function renderStyledCard(
  snapshot: ActivitySnapshot,
  card: OwnMetricCardId,
  locale: ContentLocale,
  stale: boolean,
  appearance: ResolvedCardAppearance,
): string {
  const t = labels[locale];
  let body = styledHeading(card, snapshot, locale, appearance);
  let nextY = 82;
  let contentDescription = "";
  if (card === "calendar" || card === "panorama") {
    if (card === "panorama") {
      const summary = summaryBlock(snapshot, locale, appearance, nextY, 4);
      body += summary.body;
      nextY += summary.height + 28;
      body += text(
        24,
        nextY,
        t.calendar,
        `font-size="13" font-weight="600" fill="${appearance.muted}"`,
      );
      nextY += 18;
    }
    const calendar = calendarBlock(snapshot, locale, appearance, nextY);
    body += calendar.body;
    nextY += calendar.height + 12;
    contentDescription = `${formatNumber(snapshot.calendar.total, locale)} ${t.contributions}. ${snapshot.calendar.includesPrivateCounts ? `${t.privateCounts} ` : ""}`;
  }
  if (card === "summary") {
    const summary = summaryBlock(
      snapshot,
      locale,
      appearance,
      nextY,
      appearance.size === "wide" ? 4 : 2,
    );
    body += summary.body;
    nextY += summary.height + 26;
    body += text(24, nextY, t.otherTypes, `font-size="11" fill="${appearance.muted}"`);
    nextY += 18;
  }
  if (card === "summary" || card === "panorama") {
    contentDescription += `${summaryEntries(snapshot, locale)
      .map(([label, count]) => `${label}: ${formatNumber(count, locale)}`)
      .join(". ")}. ${t.otherTypes} `;
    if (card === "panorama") {
      body += text(24, nextY, t.otherTypes, `font-size="11" fill="${appearance.muted}"`);
      nextY += 32;
    }
  }
  if (card === "languages" || card === "panorama") {
    if (card === "panorama") {
      body += text(
        24,
        nextY,
        t.languages,
        `font-size="13" font-weight="600" fill="${appearance.muted}"`,
      );
      nextY += 20;
    }
    const languages = languageBlock(
      snapshot,
      locale,
      appearance,
      nextY,
      card === "panorama" ? 5 : 10,
    );
    body += languages.body;
    nextY += languages.height + 16;
    const notes = languageNotes(snapshot, locale, appearance, nextY, card === "panorama");
    body += notes.body;
    nextY += notes.height + 8;
    contentDescription += languageDescription(snapshot, locale);
  }
  if (card === "monthly") {
    const monthly = renderMonthlyBody(snapshot, locale, appearance, nextY);
    body += monthly.body;
    nextY += monthly.height;
    contentDescription = monthly.description;
  }
  const height = nextY + 64;
  body += styledFooter(snapshot, locale, height, stale, appearance, card !== "languages");
  return styledFrame(
    card,
    locale,
    height,
    description(snapshot, locale, stale, contentDescription, card !== "languages"),
    body,
    appearance,
  );
}

function renderMonthlyBody(
  snapshot: ActivitySnapshot,
  locale: ContentLocale,
  appearance: ResolvedCardAppearance,
  y: number,
): { body: string; height: number; description: string } {
  const t = labels[locale];
  const months = getMonthlyActivity(snapshot);
  const maxCount = Math.max(1, ...months.map((month) => month.count ?? 0));
  const label = (month: (typeof months)[number]) =>
    new Intl.DateTimeFormat(locale, { month: "short", year: "2-digit", timeZone: "UTC" }).format(
      dateValue(`${month.month}-01`),
    );
  const status = (month: (typeof months)[number]) =>
    [month.partialPeriod ? t.partialMonth : "", month.incompleteCalendar ? t.incompleteMonth : ""]
      .filter(Boolean)
      .join(" · ");
  let body = "";
  let chartHeight = 0;
  if (!months.length) {
    body = text(24, y + 18, t.noCalendar, `font-size="12" fill="${appearance.muted}"`);
    chartHeight = 42;
  } else if (appearance.design === "panels") {
    const columns = appearance.size === "wide" ? 4 : 3;
    const gap = 12;
    const width = (appearance.width - 48 - gap * (columns - 1)) / columns;
    const rowHeight = 108;
    body = months
      .map((month, index) => {
        const x = 24 + (index % columns) * (width + gap);
        const top = y + Math.floor(index / columns) * rowHeight;
        return (
          panel(x, top, width, rowHeight - 12, appearance) +
          text(x + 12, top + 22, label(month), `font-size="12" fill="${appearance.muted}"`) +
          text(
            x + 12,
            top + 51,
            month.count === null ? "—" : formatNumber(month.count, locale, true),
            `font-size="25" font-weight="650" fill="${appearance.strong}"`,
          ) +
          text(
            x + 12,
            top + 69,
            month.partialPeriod ? t.partialMonth : "",
            `font-size="9" fill="${appearance.muted}"`,
          ) +
          text(
            x + 12,
            top + 84,
            month.incompleteCalendar ? t.incompleteMonth : "",
            `font-size="9" fill="${appearance.warning}"`,
          )
        );
      })
      .join("");
    chartHeight = Math.ceil(months.length / columns) * rowHeight;
  } else if (appearance.design === "minimal") {
    const gap = (appearance.width - 48) / months.length;
    const barWidth = Math.min(30, gap * 0.6);
    body =
      `<path d="M24 ${y + 142}H${appearance.width - 24}" stroke="${appearance.border}"/>` +
      months
        .map((month, index) => {
          const x = 24 + gap * index + gap / 2;
          const height = month.count === null ? 0 : (month.count / maxCount) * 106;
          return (
            (month.count === null
              ? ""
              : `<rect x="${(x - barWidth / 2).toFixed(2)}" y="${(y + 142 - height).toFixed(2)}" width="${barWidth.toFixed(2)}" height="${height.toFixed(2)}" fill="${appearance.accent}" opacity="${month.incompleteCalendar ? 0.5 : 1}"><title>${xml(`${label(month)}: ${formatNumber(month.count, locale)}${status(month) ? `. ${status(month)}` : ""}`)}</title></rect>`) +
            text(
              x,
              y + 28,
              month.count === null ? "—" : formatNumber(month.count, locale, true),
              'font-size="11" text-anchor="middle"',
            ) +
            text(
              x,
              y + 160,
              label(month),
              `font-size="9" text-anchor="middle" fill="${appearance.muted}"`,
            ) +
            text(
              x,
              y + 175,
              `${month.partialPeriod ? "*" : ""}${month.incompleteCalendar ? "†" : ""}`,
              `font-size="10" text-anchor="middle" fill="${appearance.warning}"`,
            )
          );
        })
        .join("");
    chartHeight = 200;
    body += text(
      24,
      y + 195,
      `* ${t.partialMonth} · † ${t.incompleteMonth}`,
      `font-size="10" fill="${appearance.muted}"`,
    );
  } else {
    body = months
      .map((month, index) => {
        const top = y + index * 37;
        const barX = 112;
        const barWidth = Math.max(10, appearance.width - 400);
        return (
          text(24, top + 15, label(month), 'font-size="12"') +
          (month.count === null
            ? ""
            : `<rect x="${barX}" y="${top + 3}" width="${barWidth}" height="14" rx="3" fill="${appearance.panel}"/><rect x="${barX}" y="${top + 3}" width="${((month.count / maxCount) * barWidth).toFixed(2)}" height="14" rx="3" fill="${appearance.accent}" opacity="${month.incompleteCalendar ? 0.5 : 1}"/>`) +
          text(
            barX + barWidth + 14,
            top + 15,
            month.count === null ? "—" : formatNumber(month.count, locale, true),
            `font-size="12" fill="${appearance.strong}"`,
          ) +
          text(
            24,
            top + 30,
            status(month),
            `font-size="9" fill="${month.incompleteCalendar ? appearance.warning : appearance.muted}"`,
          )
        );
      })
      .join("");
    chartHeight = months.length * 37;
  }
  const notes: string[] = [t.monthlyScope];
  if (months.some((month) => month.incompleteCalendar)) notes.push(t.monthlyMissing);
  const lastMonth = months.at(-1);
  if (months.length === 24 && lastMonth && lastMonth.month < snapshot.period.to.slice(0, 7))
    notes.push(t.monthlyLimit);
  if (snapshot.calendar.includesPrivateCounts) notes.push(t.privateCounts);
  body += notes
    .map((note, index) =>
      text(
        24,
        y + chartHeight + 16 + index * 18,
        note,
        `font-size="11" fill="${appearance.muted}"`,
      ),
    )
    .join("");
  const monthDescription = months
    .map(
      (month) =>
        `${label(month)}: ${month.count === null ? t.noCalendar : formatNumber(month.count, locale)}${status(month) ? ` (${status(month)})` : ""}`,
    )
    .join(". ");
  return {
    body,
    height: chartHeight + notes.length * 18 + 16,
    description: `${monthDescription}. ${notes.join(" ")}`,
  };
}

/** Receives a validated public snapshot; never fetches, persists, or reads the current time. */
export function renderActivityCard(
  snapshot: ActivitySnapshot,
  card: MetricCardId,
  locale: ContentLocale,
  options: { stale?: boolean; appearance?: CardAppearance } = {},
): string {
  if (card === "extended-stats" || card === "extended-languages") {
    return renderExtendedCard(snapshot, card, locale, options);
  }
  if (options.appearance || card === "panorama" || card === "monthly") {
    return renderStyledCard(
      snapshot,
      card,
      locale,
      options.stale === true,
      resolveCardAppearance(options.appearance),
    );
  }
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
export function renderActivityUnavailable(
  card: MetricCardId,
  locale: ContentLocale,
  options: { appearance?: CardAppearance } = {},
): string {
  const t = labels[locale];
  if (
    options.appearance ||
    card === "panorama" ||
    card === "monthly" ||
    card === "extended-stats" ||
    card === "extended-languages"
  ) {
    const appearance = resolveCardAppearance(options.appearance);
    return styledFrame(
      card,
      locale,
      154,
      `${t.unavailable} ${t.unavailableHelp}`,
      text(24, 32, t[card], 'font-size="18" font-weight="650"') +
        text(24, 86, t.unavailable, 'font-size="13" font-weight="600"') +
        text(24, 113, t.unavailableHelp, `font-size="12" fill="${appearance.muted}"`),
      appearance,
    );
  }
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
