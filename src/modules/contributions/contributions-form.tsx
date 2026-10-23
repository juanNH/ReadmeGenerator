import { useId, useState } from "react";
import {
  CalendarDays,
  ChartColumn,
  ChartNoAxesCombined,
  Code2,
  GitPullRequest,
  LayoutDashboard,
  LoaderCircle,
  Search,
} from "lucide-react";
import { useFormatter, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { normalizeGitHubUsername } from "@/core/activity";
import type { ActivityErrorCode } from "@/core/activity/activity-types";
import type { MetricCardId, ProfileModuleData } from "@/core/profile/module-content";
import type { ReadmeIssue } from "@/core/readme";
import { ContributionItemsEditor } from "@/modules/contributions/contribution-items-editor";
import { ActivityCardSample } from "./activity-card-sample";
import { CardAppearanceFields } from "./card-appearance-fields";
import { ExtendedOptionsFields } from "./extended-options-fields";
import { ResourceCardFields } from "./resource-card-fields";
import { useGitHubActivity } from "./use-github-activity";

const activityCardGroups = [
  {
    id: "own",
    cards: [
      { id: "calendar", icon: CalendarDays },
      { id: "summary", icon: ChartColumn },
      { id: "languages", icon: Code2 },
      { id: "panorama", icon: LayoutDashboard },
      { id: "monthly", icon: ChartNoAxesCombined },
    ],
  },
  {
    id: "extended",
    cards: [
      { id: "extended-stats", icon: ChartColumn },
      { id: "extended-languages", icon: Code2 },
    ],
  },
] as const;

type ContributionsFormProps = {
  value: ProfileModuleData["contributions"];
  metrics: ProfileModuleData["metrics"];
  metricsVisible: boolean;
  sectionIncluded: boolean;
  errors: readonly ReadmeIssue[];
  onChange: (next: ProfileModuleData["contributions"]) => void;
  onActivityChange: (next: ProfileModuleData["metrics"], visible: boolean) => void;
  onRequestCards: () => void;
  cardsNeedRefresh: boolean;
  canRequestCards: boolean;
  cardsLoading: boolean;
  cardsCompleted: number;
  cardsTotal: number;
  cardsSearchError?: ActivityErrorCode;
  cardsSearchPartial: boolean;
  cardsStorageState: "loading" | "saving" | "saved" | "memory";
  cardsHaveStoredData: boolean;
};

export function ContributionsForm({
  value,
  metrics,
  metricsVisible,
  sectionIncluded,
  errors,
  onChange,
  onActivityChange,
  onRequestCards,
  cardsNeedRefresh,
  canRequestCards,
  cardsLoading,
  cardsCompleted,
  cardsTotal,
  cardsSearchError,
  cardsSearchPartial,
  cardsStorageState,
  cardsHaveStoredData,
}: ContributionsFormProps) {
  const t = useTranslations("EditorModules.contributions");
  const format = useFormatter();
  const baseId = useId();
  const [activityOpen, setActivityOpen] = useState(
    () => metrics.username.trim().length > 0 || metrics.cards.length > 0,
  );
  const { state: activity, query } = useGitHubActivity(metrics.username);
  const snapshot =
    activity.status === "success"
      ? activity.data
      : "previous" in activity
        ? activity.previous
        : undefined;
  const usernameError =
    (metrics.username.trim().length > 0 && !normalizeGitHubUsername(metrics.username)) ||
    (activity.status === "error" && activity.code === "invalid_username") ||
    errors.some(
      (error) =>
        error.path[0] === "data" && error.path[1] === "metrics" && error.path[2] === "username",
    );

  function toggleCard(id: MetricCardId, included: boolean) {
    const cards =
      included && !metricsVisible && sectionIncluded
        ? [id]
        : included
          ? metrics.cards.includes(id)
            ? metrics.cards
            : [...metrics.cards, id]
          : metrics.cards.filter((card) => card !== id);
    onActivityChange({ ...metrics, cards }, cards.length > 0);
  }

  function displayDate(value: string) {
    return format.dateTime(new Date(value), {
      year: "numeric",
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
  }

  return (
    <div className="space-y-7">
      <p className="text-sm leading-6 text-muted-foreground">{t("help")}</p>
      <details
        open={activityOpen}
        onToggle={(event) => setActivityOpen(event.currentTarget.open)}
        className="space-y-4 rounded-lg border border-border bg-surface-raised/30 p-4"
      >
        <summary className="cursor-pointer rounded-sm text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
          <span className="inline-flex items-center gap-2 align-middle">
            <GitPullRequest aria-hidden="true" className="size-4 shrink-0" />
            {t("activity.title")}
          </span>
        </summary>
        <p className="text-xs leading-5 text-muted-foreground">{t("activity.help")}</p>
        <Field
          htmlFor={`${baseId}-username`}
          label={t("activity.username")}
          description={t("activity.usernameHelp")}
          error={usernameError ? t("activity.errors.invalid_username") : undefined}
        >
          <Input
            value={metrics.username}
            placeholder={t("activity.usernamePlaceholder")}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                !event.nativeEvent.isComposing &&
                canRequestCards &&
                !cardsLoading &&
                cardsStorageState !== "loading"
              ) {
                event.preventDefault();
                onRequestCards();
              }
            }}
            onChange={(event) =>
              onActivityChange({ ...metrics, username: event.target.value }, metricsVisible)
            }
          />
        </Field>
        <div className="space-y-2">
          <Button
            disabled={
              !canRequestCards ||
              !cardsNeedRefresh ||
              cardsLoading ||
              cardsStorageState === "loading"
            }
            aria-busy={cardsLoading || cardsStorageState === "loading"}
            aria-describedby={`${baseId}-request-help ${baseId}-request-status`}
            onClick={onRequestCards}
          >
            {cardsLoading || cardsStorageState === "loading" ? (
              <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
            ) : (
              <Search aria-hidden="true" />
            )}
            {t("activity.requestCards")}
          </Button>
          <p id={`${baseId}-request-help`} className="text-xs leading-5 text-muted-foreground">
            {t("activity.requestHelp")}
          </p>
          <p
            id={`${baseId}-request-status`}
            role="status"
            className={`text-xs leading-5 ${cardsSearchError ? "text-destructive" : "text-muted-foreground"}`}
          >
            {cardsStorageState === "loading" ? (
              t("activity.cacheLoading")
            ) : cardsLoading ? (
              t("activity.requestLoading", { completed: cardsCompleted, total: cardsTotal })
            ) : cardsSearchError ? (
              <>
                {cardsSearchPartial && (
                  <span className="block">{t("activity.requestPartial")}</span>
                )}
                <span className="block">{t(`activity.errors.${cardsSearchError}`)}</span>
              </>
            ) : (
              t(
                !canRequestCards
                  ? "activity.requestUnavailable"
                  : cardsSearchPartial
                    ? "activity.requestPartial"
                    : cardsNeedRefresh
                      ? "activity.requestPending"
                      : "activity.requestApplied",
              )
            )}
          </p>
          {cardsStorageState !== "loading" &&
            (cardsStorageState !== "saved" || cardsHaveStoredData) && (
              <p role="status" className="text-xs leading-5 text-muted-foreground">
                {t(
                  cardsStorageState === "saving"
                    ? "activity.cacheSaving"
                    : cardsStorageState === "memory"
                      ? "activity.cacheMemory"
                      : "activity.cacheSaved",
                )}
              </p>
            )}
        </div>
        <fieldset className="min-w-0 space-y-4">
          <legend className="pb-2 text-sm font-medium">{t("activity.choose")}</legend>
          <p className="text-xs leading-5 text-muted-foreground">{t("activity.samplesHelp")}</p>
          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("activity.cardColumns.label")}</p>
              <p className="text-xs leading-5 text-muted-foreground">
                {t("activity.cardColumns.help")}
              </p>
            </div>
            <div role="group" aria-label={t("activity.cardColumns.label")} className="flex gap-2">
              {([1, 2] as const).map((columns) => (
                <Button
                  key={columns}
                  type="button"
                  variant={(metrics.cardColumns ?? 1) === columns ? "primary" : "outline"}
                  aria-pressed={(metrics.cardColumns ?? 1) === columns}
                  onClick={() =>
                    onActivityChange({ ...metrics, cardColumns: columns }, metricsVisible)
                  }
                >
                  {t(columns === 1 ? "activity.cardColumns.one" : "activity.cardColumns.two")}
                </Button>
              ))}
            </div>
          </div>
          <div className="space-y-2 rounded-md border border-border p-3">
            <div className="space-y-1">
              <p className="text-sm font-medium">{t("activity.contentOrder.label")}</p>
              <p className="text-xs leading-5 text-muted-foreground">
                {t("activity.contentOrder.help")}
              </p>
            </div>
            <div role="group" aria-label={t("activity.contentOrder.label")} className="flex gap-2">
              {(["activity-first", "contributions-first"] as const).map((contentOrder) => (
                <Button
                  key={contentOrder}
                  type="button"
                  variant={
                    (metrics.contentOrder ?? "activity-first") === contentOrder
                      ? "primary"
                      : "outline"
                  }
                  aria-pressed={(metrics.contentOrder ?? "activity-first") === contentOrder}
                  onClick={() => onActivityChange({ ...metrics, contentOrder }, metricsVisible)}
                >
                  {t(
                    `activity.contentOrder.${contentOrder === "activity-first" ? "activityFirst" : "contributionsFirst"}`,
                  )}
                </Button>
              ))}
            </div>
          </div>
          {activityCardGroups.map((group) => (
            <fieldset key={group.id} className="min-w-0 space-y-1">
              <legend className="pb-1 text-xs font-semibold text-muted-foreground">
                {t(`activity.groups.${group.id}`)}
              </legend>
              {group.id === "extended" && (
                <p className="pb-2 text-xs leading-5 text-muted-foreground">
                  {t.rich("activity.extendedAttribution", {
                    project: (chunks) => (
                      <a
                        href="https://github.com/stats-organization/github-stats-extended"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-sm text-accent underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                      >
                        {chunks}
                      </a>
                    ),
                  })}
                </p>
              )}
              <div className="grid min-w-0 gap-2 @min-[30em]/configuration:grid-cols-2">
                {group.cards.map(({ id, icon: Icon }) => {
                  const selected = metrics.cards.includes(id);
                  const checked = (metricsVisible || !sectionIncluded) && selected;
                  return (
                    <div
                      key={id}
                      className={`flex min-w-0 items-start gap-1 rounded-md border p-2 ${checked ? "border-accent/45 bg-accent-soft/40" : "border-border hover:bg-surface-raised/60"}`}
                    >
                      <Checkbox
                        id={`${baseId}-${id}`}
                        checked={checked}
                        aria-label={t(`activity.cards.${id}.label`)}
                        aria-describedby={`${baseId}-${id}-help`}
                        onCheckedChange={(next) => toggleCard(id, next === true)}
                      />
                      <label
                        htmlFor={`${baseId}-${id}`}
                        className="min-w-0 flex-1 cursor-pointer py-2 text-sm"
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Icon
                            aria-hidden="true"
                            className="size-4 shrink-0 text-muted-foreground"
                          />
                          {t(`activity.cards.${id}.label`)}
                        </span>
                        <span
                          id={`${baseId}-${id}-help`}
                          className="mt-1 block text-xs leading-5 text-muted-foreground"
                        >
                          {t(`activity.cards.${id}.help`)}
                        </span>
                        <span className="mt-2 block">
                          <ActivityCardSample card={id} />
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </fieldset>
          ))}
        </fieldset>
        <ExtendedOptionsFields
          value={metrics.extended}
          onChange={(extended) => onActivityChange({ ...metrics, extended }, metricsVisible)}
        />
        <ResourceCardFields
          value={metrics.extended}
          cards={metrics.cards}
          metricsVisible={metricsVisible}
          sectionIncluded={sectionIncluded}
          onChange={(extended) => onActivityChange({ ...metrics, extended }, metricsVisible)}
          onToggle={toggleCard}
        />
        <CardAppearanceFields
          value={metrics.appearance}
          onChange={(appearance) => {
            const next = { ...metrics };
            if (appearance) next.appearance = appearance;
            else delete next.appearance;
            onActivityChange(next, metricsVisible);
          }}
        />
        <p className="text-xs leading-5 text-muted-foreground">{t("activity.scope")}</p>
        <details className="rounded-md border border-border p-3">
          <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            {t("activity.findHighlights")}
          </summary>
          <div className="mt-3 space-y-3">
            <p className="text-xs leading-5 text-muted-foreground">
              {t("activity.findHighlightsHelp")}
            </p>
            <Button
              variant="outline"
              disabled={activity.status === "loading"}
              onClick={() => void query()}
            >
              {activity.status === "loading" ? (
                <LoaderCircle aria-hidden="true" className="motion-safe:animate-spin" />
              ) : (
                <GitPullRequest aria-hidden="true" />
              )}
              {activity.status === "loading"
                ? t("activity.loadingButton")
                : activity.status === "error"
                  ? t("activity.retry")
                  : snapshot
                    ? t("activity.refresh")
                    : t("activity.query")}
            </Button>
            <div
              role="status"
              aria-live="polite"
              aria-atomic="true"
              className="space-y-2 text-xs leading-5 text-muted-foreground"
            >
              {activity.status === "idle" && <p>{t("activity.queryFirst")}</p>}
              {activity.status === "loading" && <p>{t("activity.loading")}</p>}
              {activity.status === "error" && <p>{t(`activity.errors.${activity.code}`)}</p>}
              {activity.status === "error" && activity.retryAt && (
                <p>{t("activity.retryAfter", { date: displayDate(activity.retryAt) })}</p>
              )}
              {snapshot && (
                <p>
                  {t("activity.loaded", {
                    username: snapshot.username,
                    date: displayDate(snapshot.fetchedAt),
                  })}
                </p>
              )}
              {snapshot &&
                (activity.status === "error" ||
                  (activity.status === "success" && activity.stale)) && (
                  <p>{t("activity.stale")}</p>
                )}
              {snapshot && snapshot.calendar.total === 0 && <p>{t("activity.empty")}</p>}
            </div>
            {snapshot && (
              <div className="space-y-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
                <p>
                  {t("activity.period", {
                    from: displayDate(snapshot.period.from),
                    to: displayDate(snapshot.period.to),
                  })}
                </p>
                <p>
                  {t("activity.counts", {
                    commits: format.number(snapshot.summary.commits),
                    pullRequests: format.number(snapshot.summary.pullRequests),
                    issues: format.number(snapshot.summary.issues),
                    reviews: format.number(snapshot.summary.reviews),
                  })}
                </p>
                {snapshot.calendar.includesPrivateCounts && <p>{t("activity.privateCounts")}</p>}
                {snapshot.languages.truncated && (
                  <p>
                    {t("activity.languageLimit", {
                      analyzed: format.number(snapshot.languages.repositoriesAnalyzed),
                      total: format.number(snapshot.languages.repositoriesTotal),
                    })}
                  </p>
                )}
              </div>
            )}
          </div>
        </details>
      </details>
      <ContributionItemsEditor
        value={value}
        errors={errors}
        onChange={onChange}
        suggestions={snapshot?.highlights ?? []}
      />
    </div>
  );
}
