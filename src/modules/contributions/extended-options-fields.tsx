import { useId, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  defaultExtendedStats,
  extendedLanguageOptionsSchema,
  extendedStatIds,
  extendedStatsOptionsSchema,
  repositoryRoles,
  type ExtendedLanguageOptions,
  type ExtendedOptions,
  type ExtendedStatsOptions,
} from "@/core/activity/extended-options";
import {
  SettingsNumber,
  SettingsToggle,
  settingsSelectClassName,
  settingsSummaryClassName,
  splitSettingsList,
} from "./activity-settings-controls";

type ExtendedOptionsFieldsProps = {
  value: ExtendedOptions | undefined;
  onChange: (value: ExtendedOptions) => void;
};

export function ExtendedOptionsFields({ value, onChange }: ExtendedOptionsFieldsProps) {
  const t = useTranslations("EditorModules.contributions.activity.extended");
  const baseId = useId();
  const stats = value?.stats;
  const languages = value?.languages;
  const selectedStats = stats?.items ?? defaultExtendedStats;

  function updateStats(next: ExtendedStatsOptions) {
    onChange({ ...value, stats: next });
  }
  function updateLanguages(next: ExtendedLanguageOptions) {
    onChange({ ...value, languages: next });
  }

  return (
    <details className="min-w-0 rounded-md border border-border bg-surface-raised/40 p-3">
      <summary className={settingsSummaryClassName}>{t("title")}</summary>
      <div className="mt-3 min-w-0 space-y-4">
        <p className="text-xs leading-5 text-muted-foreground">{t("help")}</p>
        <details className="min-w-0 rounded-md border border-border p-3">
          <summary className={settingsSummaryClassName}>{t("statsTitle")}</summary>
          <div className="mt-3 space-y-4">
            <fieldset className="min-w-0">
              <legend className="text-sm font-medium">{t("statsItems")}</legend>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{t("statsItemsHelp")}</p>
              {extendedStatIds.map((id) => (
                <SettingsToggle
                  key={id}
                  label={t(`stats.${id}`)}
                  checked={selectedStats.includes(id)}
                  disabled={selectedStats.length === 1 && selectedStats.includes(id)}
                  onChange={(checked) =>
                    updateStats({
                      ...stats,
                      items: checked
                        ? [...selectedStats, id]
                        : selectedStats.filter((item) => item !== id),
                    })
                  }
                />
              ))}
            </fieldset>
            <Field htmlFor={`${baseId}-commits-period`} label={t("commitsPeriod.label")}>
              <select
                className={settingsSelectClassName}
                value={stats?.commitsPeriod ?? "period"}
                onChange={(event) =>
                  updateStats({
                    ...stats,
                    commitsPeriod: event.target.value as ExtendedStatsOptions["commitsPeriod"],
                  })
                }
              >
                {(["period", "year", "all"] as const).map((period) => (
                  <option key={period} value={period}>
                    {t(`commitsPeriod.${period}`)}
                  </option>
                ))}
              </select>
            </Field>
            {stats?.commitsPeriod === "year" && (
              <SettingsNumber
                label={t("year")}
                value={stats.year ?? new Date().getUTCFullYear()}
                min={2008}
                max={2100}
                errorMessage={t("numberError", { min: 2008, max: 2100 })}
                onChange={(year) => updateStats({ ...stats, year })}
              />
            )}
            <SettingsToggle
              label={t("includeOwn")}
              help={t("includeOwnHelp")}
              checked={stats?.includeOwnRepositories ?? false}
              onChange={(includeOwnRepositories) =>
                updateStats({ ...stats, includeOwnRepositories })
              }
            />
            <SettingsToggle
              label={t("showRank")}
              help={t("rankHelp")}
              checked={stats?.showRank ?? false}
              onChange={(showRank) => updateStats({ ...stats, showRank })}
            />
            {stats?.showRank && (
              <Field htmlFor={`${baseId}-rank-icon`} label={t("rankIcon.label")}>
                <select
                  className={settingsSelectClassName}
                  value={stats.rankIcon ?? "letter"}
                  onChange={(event) =>
                    updateStats({
                      ...stats,
                      rankIcon: event.target.value as ExtendedStatsOptions["rankIcon"],
                    })
                  }
                >
                  {(["letter", "percentile", "github"] as const).map((icon) => (
                    <option key={icon} value={icon}>
                      {t(`rankIcon.${icon}`)}
                    </option>
                  ))}
                </select>
              </Field>
            )}
            <RepositoryFilterFields kind="stats" value={stats} onChange={updateStats} />
          </div>
        </details>
        <details className="min-w-0 rounded-md border border-border p-3">
          <summary className={settingsSummaryClassName}>{t("languagesTitle")}</summary>
          <div className="mt-3 min-w-0 space-y-4">
            <div className="grid min-w-0 gap-4 @min-[22em]/configuration:grid-cols-2">
              <Field htmlFor={`${baseId}-language-layout`} label={t("languageLayout.label")}>
                <select
                  className={settingsSelectClassName}
                  value={languages?.layout ?? "normal"}
                  onChange={(event) =>
                    updateLanguages({
                      ...languages,
                      layout: event.target.value as ExtendedLanguageOptions["layout"],
                    })
                  }
                >
                  {(["normal", "compact", "donut", "donut-vertical", "pie"] as const).map(
                    (layout) => (
                      <option key={layout} value={layout}>
                        {t(`languageLayout.${layout}`)}
                      </option>
                    ),
                  )}
                </select>
              </Field>
              <Field htmlFor={`${baseId}-language-format`} label={t("languageFormat.label")}>
                <select
                  className={settingsSelectClassName}
                  value={languages?.format ?? "percentages"}
                  onChange={(event) =>
                    updateLanguages({
                      ...languages,
                      format: event.target.value as ExtendedLanguageOptions["format"],
                    })
                  }
                >
                  <option value="percentages">{t("languageFormat.percentages")}</option>
                  <option value="bytes">{t("languageFormat.bytes")}</option>
                </select>
              </Field>
              <SettingsNumber
                label={t("languageCount")}
                value={languages?.count ?? 5}
                min={1}
                max={20}
                errorMessage={t("numberError", { min: 1, max: 20 })}
                onChange={(count) => updateLanguages({ ...languages, count })}
              />
              <SettingsNumber
                label={t("sizeWeight")}
                help={t("weightHelp")}
                value={languages?.sizeWeight ?? 1}
                min={0}
                max={2}
                step={0.1}
                validate={(sizeWeight) => sizeWeight + (languages?.countWeight ?? 0) > 0}
                errorMessage={t("weightError")}
                onChange={(sizeWeight) => updateLanguages({ ...languages, sizeWeight })}
              />
              <SettingsNumber
                label={t("countWeight")}
                value={languages?.countWeight ?? 0}
                min={0}
                max={2}
                step={0.1}
                validate={(countWeight) => countWeight + (languages?.sizeWeight ?? 1) > 0}
                errorMessage={t("weightError")}
                onChange={(countWeight) => updateLanguages({ ...languages, countWeight })}
              />
            </div>
            <SettingsToggle
              label={t("hideProgress")}
              checked={languages?.hideProgress ?? false}
              onChange={(hideProgress) => updateLanguages({ ...languages, hideProgress })}
            />
            <SettingsToggle
              label={t("hideValues")}
              checked={languages?.hideValues ?? false}
              onChange={(hideValues) => updateLanguages({ ...languages, hideValues })}
            />
            <HiddenLanguageFields value={languages} onChange={updateLanguages} />
            <RepositoryFilterFields kind="languages" value={languages} onChange={updateLanguages} />
          </div>
        </details>
      </div>
    </details>
  );
}

function HiddenLanguageFields({
  value,
  onChange,
}: {
  value: ExtendedLanguageOptions | undefined;
  onChange: (value: ExtendedLanguageOptions) => void;
}) {
  const t = useTranslations("EditorModules.contributions.activity.extended");
  const id = useId();
  const [draft, setDraft] = useState<string>();
  const [error, setError] = useState(false);
  return (
    <div className="space-y-2">
      <Field
        htmlFor={id}
        label={t("hiddenLanguages")}
        description={t("languageListHelp")}
        error={error ? t("languageListError") : undefined}
      >
        <Textarea
          rows={2}
          value={draft ?? value?.hidden?.join("\n") ?? ""}
          onChange={(event) => {
            setDraft(event.target.value);
            setError(false);
          }}
        />
      </Field>
      <Button
        size="sm"
        variant="outline"
        disabled={draft === undefined}
        onClick={() => {
          const next = { ...value };
          const hidden = splitSettingsList(draft ?? "");
          if (hidden.length) next.hidden = hidden;
          else delete next.hidden;
          const parsed = extendedLanguageOptionsSchema.safeParse(next);
          setError(!parsed.success);
          if (parsed.success) {
            onChange(parsed.data);
            setDraft(undefined);
          }
        }}
      >
        {t("apply")}
      </Button>
    </div>
  );
}

function RepositoryFilterFields<T extends ExtendedStatsOptions | ExtendedLanguageOptions>({
  kind,
  value,
  onChange,
}: {
  kind: "stats" | "languages";
  value: T | undefined;
  onChange: (value: T) => void;
}) {
  const t = useTranslations("EditorModules.contributions.activity.extended");
  const baseId = useId();
  const [drafts, setDrafts] = useState<
    Partial<Record<"repositories" | "owners" | "excludeRepositories", string>>
  >({});
  const [error, setError] = useState(false);
  const roles = value?.roles ?? (kind === "languages" ? ["OWNER"] : []);
  return (
    <details className="min-w-0 rounded-md border border-border p-3">
      <summary className={settingsSummaryClassName}>{t("filters.title")}</summary>
      <div className="mt-3 space-y-4">
        <p className="text-xs leading-5 text-muted-foreground">{t("filters.help")}</p>
        {(["repositories", "owners", "excludeRepositories"] as const).map((key) => (
          <Field
            key={key}
            htmlFor={`${baseId}-${key}`}
            label={t(`filters.${key}`)}
            description={t(`filters.${key}Help`)}
            error={error ? t("filters.error") : undefined}
          >
            <Textarea
              rows={2}
              autoCapitalize="none"
              spellCheck={false}
              value={drafts[key] ?? value?.[key]?.join("\n") ?? ""}
              onChange={(event) => {
                setDrafts({ ...drafts, [key]: event.target.value });
                setError(false);
              }}
            />
          </Field>
        ))}
        <Button
          size="sm"
          variant="outline"
          disabled={Object.keys(drafts).length === 0}
          onClick={() => {
            const next = { ...value } as T;
            for (const key of ["repositories", "owners", "excludeRepositories"] as const) {
              if (drafts[key] === undefined) continue;
              const list = splitSettingsList(drafts[key]);
              if (list.length) next[key] = list;
              else delete next[key];
            }
            // The common repository filters have identical validation in both option contracts.
            const parsed = extendedStatsOptionsSchema
              .pick({ repositories: true, owners: true, excludeRepositories: true, roles: true })
              .safeParse({
                repositories: next.repositories,
                owners: next.owners,
                excludeRepositories: next.excludeRepositories,
                roles: next.roles,
              });
            setError(!parsed.success);
            if (parsed.success) {
              onChange(next);
              setDrafts({});
            }
          }}
        >
          {t("apply")}
        </Button>
        <fieldset className="min-w-0">
          <legend className="text-sm font-medium">{t("filters.roles")}</legend>
          {repositoryRoles.map((role) => (
            <SettingsToggle
              key={role}
              label={t(`filters.role.${role}`)}
              checked={roles.includes(role)}
              disabled={kind === "languages" && roles.length === 1 && roles.includes(role)}
              onChange={(checked) => {
                const nextRoles = checked
                  ? [...roles, role]
                  : roles.filter((item) => item !== role);
                const next = { ...value } as T;
                if (nextRoles.length) next.roles = nextRoles;
                else delete next.roles;
                onChange(next);
              }}
            />
          ))}
        </fieldset>
      </div>
    </details>
  );
}
