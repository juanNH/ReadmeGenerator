import { useId, useState } from "react";
import { BookMarked, Clock3, FileCode2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  extendedOptionsSchema,
  repositoryContributionStatIds,
  resourceCardOptionsSchema,
  type ExtendedOptions,
  type ResourceCardOptions,
} from "@/core/activity/extended-options";
import type { MetricCardId } from "@/core/profile/module-content";
import {
  SettingsNumber,
  SettingsToggle,
  settingsSelectClassName,
  settingsSummaryClassName,
  splitSettingsList,
} from "./activity-settings-controls";

const resourceCards = [
  { id: "extended-repository", field: "repositories", icon: BookMarked },
  { id: "extended-gist", field: "gists", icon: FileCode2 },
  { id: "extended-wakatime", field: "wakatimeUsername", icon: Clock3 },
] as const;

export function ResourceCardFields({
  value,
  cards,
  metricsVisible,
  sectionIncluded,
  onChange,
  onToggle,
}: {
  value: ExtendedOptions | undefined;
  cards: readonly MetricCardId[];
  metricsVisible: boolean;
  sectionIncluded: boolean;
  onChange: (value: ExtendedOptions) => void;
  onToggle: (id: MetricCardId, checked: boolean) => void;
}) {
  const t = useTranslations("EditorModules.contributions.activity.resources");
  const baseId = useId();
  const [drafts, setDrafts] = useState<
    Partial<Record<"repositories" | "gists" | "wakatimeUsername", string>>
  >({});
  const [errors, setErrors] = useState<
    Partial<Record<"repositories" | "gists" | "wakatimeUsername", boolean>>
  >({});
  const options = value?.resourceOptions;

  function updateOptions(next: ResourceCardOptions) {
    onChange({ ...value, resourceOptions: next });
  }

  return (
    <details className="min-w-0 rounded-md border border-border bg-surface-raised/40 p-3">
      <summary className={settingsSummaryClassName}>{t("title")}</summary>
      <div className="mt-3 min-w-0 space-y-5">
        <p className="text-xs leading-5 text-muted-foreground">{t("help")}</p>
        {resourceCards.map(({ id, field, icon: Icon }) => {
          const selected = cards.includes(id);
          const configured = Boolean(value?.[field]?.length);
          const current = value?.[field];
          const text =
            drafts[field] ?? (Array.isArray(current) ? current.join("\n") : (current ?? ""));
          const fieldError = errors[field]
            ? t(`${field}.error`)
            : selected && !configured
              ? t("missingTarget")
              : undefined;
          return (
            <fieldset key={id} className="min-w-0 space-y-3 border-t border-border pt-3">
              <legend className="flex items-center gap-2 px-1 text-sm font-medium">
                <Icon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                {t(`${field}.title`)}
              </legend>
              <Field
                htmlFor={`${baseId}-${field}`}
                label={t(`${field}.label`)}
                description={t(`${field}.help`)}
                error={fieldError}
              >
                {field === "wakatimeUsername" ? (
                  <Input
                    value={text}
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={(event) => {
                      setDrafts({ ...drafts, [field]: event.target.value });
                      setErrors({ ...errors, [field]: false });
                    }}
                  />
                ) : (
                  <Textarea
                    rows={3}
                    value={text}
                    autoCapitalize="none"
                    spellCheck={false}
                    onChange={(event) => {
                      setDrafts({ ...drafts, [field]: event.target.value });
                      setErrors({ ...errors, [field]: false });
                    }}
                  />
                )}
              </Field>
              <Button
                size="sm"
                variant="outline"
                disabled={drafts[field] === undefined}
                onClick={() => {
                  const next = { ...value };
                  if (field === "wakatimeUsername") {
                    const username = text.trim();
                    if (username) next.wakatimeUsername = username;
                    else delete next.wakatimeUsername;
                  } else {
                    const list = splitSettingsList(text);
                    if (list.length) next[field] = list;
                    else delete next[field];
                  }
                  const parsed = extendedOptionsSchema.safeParse(next);
                  setErrors({ ...errors, [field]: !parsed.success });
                  if (parsed.success) {
                    onChange(parsed.data);
                    const remaining = { ...drafts };
                    delete remaining[field];
                    setDrafts(remaining);
                  }
                }}
              >
                {t("apply")}
              </Button>
              <div className="flex min-w-0 items-start gap-1">
                <Checkbox
                  id={`${baseId}-${id}`}
                  checked={(metricsVisible || !sectionIncluded) && selected}
                  disabled={!selected && !configured}
                  aria-describedby={`${baseId}-${id}-help`}
                  onCheckedChange={(checked) => onToggle(id, checked === true)}
                />
                <label
                  htmlFor={`${baseId}-${id}`}
                  className="min-w-0 flex-1 cursor-pointer py-2.5 text-sm leading-5"
                >
                  {t(`${field}.include`)}
                  <span
                    id={`${baseId}-${id}-help`}
                    className="mt-1 block text-xs leading-5 text-muted-foreground"
                  >
                    {t(`${field}.cardHelp`)}
                  </span>
                </label>
              </div>
            </fieldset>
          );
        })}
        <details className="min-w-0 rounded-md border border-border p-3">
          <summary className={settingsSummaryClassName}>{t("options.title")}</summary>
          <div className="mt-3 min-w-0 space-y-4">
            <SettingsToggle
              label={t("options.showOwner")}
              checked={options?.showOwner ?? false}
              onChange={(showOwner) => updateOptions({ ...options, showOwner })}
            />
            <SettingsNumber
              label={t("options.descriptionLines")}
              value={options?.descriptionLines ?? 3}
              min={1}
              max={3}
              errorMessage={t("numberError", { min: 1, max: 3 })}
              onChange={(descriptionLines) => updateOptions({ ...options, descriptionLines })}
            />
            <RepositoryContributionFields value={options} onChange={updateOptions} />
            <Field htmlFor={`${baseId}-format`} label={t("options.displayFormat.label")}>
              <select
                className={settingsSelectClassName}
                value={options?.displayFormat ?? "time"}
                onChange={(event) =>
                  updateOptions({
                    ...options,
                    displayFormat: event.target.value as ResourceCardOptions["displayFormat"],
                  })
                }
              >
                <option value="time">{t("options.displayFormat.time")}</option>
                <option value="percent">{t("options.displayFormat.percent")}</option>
              </select>
            </Field>
            <Field htmlFor={`${baseId}-layout`} label={t("options.layout.label")}>
              <select
                className={settingsSelectClassName}
                value={options?.layout ?? "default"}
                onChange={(event) =>
                  updateOptions({
                    ...options,
                    layout: event.target.value as ResourceCardOptions["layout"],
                  })
                }
              >
                <option value="default">{t("options.layout.default")}</option>
                <option value="compact">{t("options.layout.compact")}</option>
              </select>
            </Field>
            <SettingsNumber
              label={t("options.languageCount")}
              value={options?.languageCount ?? 5}
              min={1}
              max={20}
              errorMessage={t("numberError", { min: 1, max: 20 })}
              onChange={(languageCount) => updateOptions({ ...options, languageCount })}
            />
            <SettingsToggle
              label={t("options.hideProgress")}
              checked={options?.hideProgress ?? false}
              onChange={(hideProgress) => updateOptions({ ...options, hideProgress })}
            />
            <ResourceHiddenLanguages value={options} onChange={updateOptions} />
          </div>
        </details>
      </div>
    </details>
  );
}

function RepositoryContributionFields({
  value,
  onChange,
}: {
  value: ResourceCardOptions | undefined;
  onChange: (value: ResourceCardOptions) => void;
}) {
  const t = useTranslations("EditorModules.contributions.activity.resources.contributions");
  const tStat = useTranslations("EditorModules.contributions.activity.extended.stats");
  const id = useId();
  const [usernameDraft, setUsernameDraft] = useState<string>();
  const [statsDraft, setStatsDraft] = useState<ResourceCardOptions["contributionStats"]>();
  const [error, setError] = useState<"required" | "invalid">();
  const selected = statsDraft ?? value?.contributionStats ?? [];
  return (
    <details className="min-w-0 rounded-md border border-border p-3">
      <summary className={settingsSummaryClassName}>{t("title")}</summary>
      <div className="mt-3 min-w-0 space-y-3">
        <p className="text-xs leading-5 text-muted-foreground">{t("help")}</p>
        <Field
          htmlFor={id}
          label={t("username")}
          description={t("usernameHelp")}
          error={
            error ? t(error === "required" ? "usernameRequired" : "invalidUsername") : undefined
          }
        >
          <Input
            value={usernameDraft ?? value?.contributionUsername ?? ""}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            onChange={(event) => {
              setUsernameDraft(event.target.value);
              setError(undefined);
            }}
          />
        </Field>
        <fieldset className="min-w-0">
          <legend className="text-sm font-medium">{t("stats")}</legend>
          {repositoryContributionStatIds.map((stat) => (
            <SettingsToggle
              key={stat}
              label={tStat(stat)}
              checked={selected.includes(stat)}
              onChange={(checked) => {
                setStatsDraft(
                  checked ? [...selected, stat] : selected.filter((item) => item !== stat),
                );
                setError(undefined);
              }}
            />
          ))}
        </fieldset>
        <Button
          size="sm"
          variant="outline"
          disabled={usernameDraft === undefined && statsDraft === undefined}
          onClick={() => {
            const username = (usernameDraft ?? value?.contributionUsername ?? "").trim();
            if (selected.length > 0 && !username) {
              setError("required");
              return;
            }
            const next = { ...value };
            if (username) next.contributionUsername = username;
            else delete next.contributionUsername;
            if (selected.length) next.contributionStats = selected;
            else delete next.contributionStats;
            const parsed = resourceCardOptionsSchema.safeParse(next);
            if (parsed.success) {
              onChange(parsed.data);
              setUsernameDraft(undefined);
              setStatsDraft(undefined);
              setError(undefined);
            } else {
              setError("invalid");
            }
          }}
        >
          {t("apply")}
        </Button>
      </div>
    </details>
  );
}

function ResourceHiddenLanguages({
  value,
  onChange,
}: {
  value: ResourceCardOptions | undefined;
  onChange: (value: ResourceCardOptions) => void;
}) {
  const t = useTranslations("EditorModules.contributions.activity.resources");
  const id = useId();
  const [draft, setDraft] = useState<string>();
  const [error, setError] = useState(false);
  return (
    <div className="space-y-2">
      <Field
        htmlFor={id}
        label={t("options.hideLanguages")}
        description={t("options.hideLanguagesHelp")}
        error={error ? t("options.hideLanguagesError") : undefined}
      >
        <Textarea
          rows={2}
          value={draft ?? value?.hideLanguages?.join("\n") ?? ""}
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
          if (hidden.length) next.hideLanguages = hidden;
          else delete next.hideLanguages;
          const parsed = resourceCardOptionsSchema.safeParse(next);
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
