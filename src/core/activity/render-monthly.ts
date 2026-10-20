import type { ActivitySnapshot } from "./activity-types";

const DAY_MILLISECONDS = 86_400_000;

export interface MonthlyActivity {
  readonly month: string;
  readonly count: number | null;
  readonly daysObserved: number;
  readonly daysExpected: number;
  /** The contribution period starts or ends inside this calendar month. */
  readonly partialPeriod: boolean;
  /** Missing calendar dates must not be silently represented as zero activity. */
  readonly incompleteCalendar: boolean;
}

/** Aggregate the validated calendar in UTC; never infer counts from absent days. */
export function getMonthlyActivity(snapshot: ActivitySnapshot): MonthlyActivity[] {
  const start = Date.parse(`${snapshot.period.from}T00:00:00Z`);
  const end = Date.parse(`${snapshot.period.to}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end) return [];

  const counts = new Map<string, Map<string, number>>();
  for (const week of snapshot.calendar.weeks) {
    for (const day of week.days) {
      const timestamp = Date.parse(`${day.date}T00:00:00Z`);
      if (!Number.isFinite(timestamp) || timestamp < start || timestamp > end) continue;
      const month = day.date.slice(0, 7);
      const days = counts.get(month) ?? new Map<string, number>();
      // A duplicated date does not become a second contribution day.
      if (!days.has(day.date)) days.set(day.date, day.count);
      counts.set(month, days);
    }
  }

  const months: MonthlyActivity[] = [];
  const cursor = new Date(start);
  cursor.setUTCDate(1);
  // Calendar snapshots contain at most 54 weeks; bound malformed long periods too.
  for (let index = 0; index < 24 && cursor.getTime() <= end; index += 1) {
    const firstDay = cursor.getTime();
    const next = new Date(firstDay);
    next.setUTCMonth(next.getUTCMonth() + 1);
    const lastDay = next.getTime() - DAY_MILLISECONDS;
    const includedStart = Math.max(firstDay, start);
    const includedEnd = Math.min(lastDay, end);
    const daysExpected = Math.round((includedEnd - includedStart) / DAY_MILLISECONDS) + 1;
    const month = cursor.toISOString().slice(0, 7);
    const days = counts.get(month);
    const daysObserved = days?.size ?? 0;
    months.push({
      month,
      count: days ? [...days.values()].reduce((sum, count) => sum + count, 0) : null,
      daysObserved,
      daysExpected,
      partialPeriod: includedStart !== firstDay || includedEnd !== lastDay,
      incompleteCalendar: daysObserved !== daysExpected,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return months;
}
