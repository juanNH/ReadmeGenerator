"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ArrowDown, ArrowUp, Check, FolderMinus, Plus, Search, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileModuleData } from "@/core/profile/module-content";
import type { ReadmeIssue } from "@/core/readme";
import { findTechnology, technologyCatalog } from "@/core/technologies";
import type { TechnologyCatalogEntry } from "@/core/technologies";
import { getTechnologyCategory, getTechnologyCategoryName } from "@/core/technologies/categories";
import {
  moveTechnologyGroup,
  moveTechnologyItem,
  organizeTechnologyGroups,
  removeTechnologyCategory,
  reorderTechnologyItem,
} from "@/core/technologies/technology-groups";
import { TechnologyCategoryGuide } from "./technology-category-guide";

type Technologies = ProfileModuleData["technologies"];
type TechnologyGroup = Technologies["groups"][number];
type AddDestination =
  { kind: "suggested" } | { kind: "uncategorized" } | { kind: "group"; groupId: string };

const selectClassName =
  "min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2 text-base focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none sm:text-sm";

type TechnologiesFormProps = {
  value: Technologies;
  errors: readonly ReadmeIssue[];
  onChange: (value: Technologies) => void;
};

function technologyIdentity(name: string) {
  return findTechnology(name)?.id ?? name.trim().toLowerCase();
}

function isVisibleGroup(group: TechnologyGroup) {
  return Boolean(group.name.trim()) || group.items.length > 0;
}

export function TechnologiesForm({ value, errors, onChange }: TechnologiesFormProps) {
  const t = useTranslations("EditorModules.technologies");
  const locale = useLocale();
  const baseId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const groupHeadingRefs = useRef(new Map<string, HTMLHeadingElement>());
  const pendingGroupFocus = useRef<string | null>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
  const [destination, setDestination] = useState<AddDestination>(() => {
    const firstGroup = value.groups.find(isVisibleGroup);
    return firstGroup ? { kind: "group", groupId: firstGroup.id } : { kind: "suggested" };
  });
  const [newCategoryName, setNewCategoryName] = useState("");
  const text = query.trim();
  const normalized = text.toLowerCase();
  const selected = new Set(
    value.groups.flatMap((group) => group.items.map((item) => technologyIdentity(item.name))),
  );
  const recognized = findTechnology(text);
  const duplicate = Boolean(text && selected.has(technologyIdentity(text)));
  const results = technologyCatalog
    .filter(
      (entry) =>
        !selected.has(entry.id) &&
        (!normalized ||
          entry.name.toLowerCase().includes(normalized) ||
          entry.aliases.some((alias) => alias.toLowerCase().includes(normalized))),
    )
    .slice(0, 8);
  const canAddCustom = Boolean(text && !recognized && !duplicate);
  const optionCount = results.length + (canAddCustom ? 1 : 0);
  const highlightedIndex = Math.min(activeIndex, Math.max(optionCount - 1, 0));
  const listId = `${baseId}-suggestions`;
  const visibleGroups = value.groups.filter(isVisibleGroup);
  const destinationIndex = value.groups.findIndex(
    (group) =>
      destination.kind === "group" && group.id === destination.groupId && isVisibleGroup(group),
  );
  const hasTools = value.groups.some((group) => group.items.length > 0);
  const explicitGroup = destinationIndex >= 0 ? value.groups[destinationIndex] : undefined;
  const destinationHelp = explicitGroup?.name.trim()
    ? t("destinationHelpGroup", { category: explicitGroup.name.trim() })
    : explicitGroup || destination.kind === "uncategorized"
      ? t("destinationHelpUncategorized")
      : t("destinationHelpAutomatic", {
          frontend: getTechnologyCategoryName("frontend", locale),
          cloud: getTechnologyCategoryName("cloud", locale),
        });

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex, query]);

  useEffect(() => {
    if (pendingGroupFocus.current === null) return;
    groupHeadingRefs.current.get(pendingGroupFocus.current)?.focus();
    pendingGroupFocus.current = null;
  }, [value.groups]);

  function groupLabel(group: TechnologyGroup, index: number) {
    return group.name.trim() || t("uncategorizedNumber", { number: index + 1 });
  }

  function resolveAddDestination(name: string) {
    let targetGroup =
      destination.kind === "uncategorized"
        ? value.groups.find((group) => !group.name.trim())
        : explicitGroup;
    let suggestedName = "";
    if (!targetGroup && destination.kind !== "uncategorized") {
      const category = getTechnologyCategory(name);
      if (category !== null) {
        suggestedName = getTechnologyCategoryName(category, locale);
        const names = (["en", "es"] as const).map((language) =>
          getTechnologyCategoryName(category, language).trim().toLowerCase(),
        );
        targetGroup = value.groups.find((group) => names.includes(group.name.trim().toLowerCase()));
      } else {
        targetGroup = value.groups.find((group) => !group.name.trim());
      }
    }
    const groupName = targetGroup?.name ?? suggestedName;
    return { group: targetGroup, name: groupName, label: groupName.trim() || t("withoutCategory") };
  }

  function addTechnology(name: string) {
    const trimmed = name.trim();
    if (!trimmed || selected.has(technologyIdentity(trimmed))) return;
    const canonicalName = findTechnology(trimmed)?.name ?? trimmed;
    const item = { id: crypto.randomUUID(), name: canonicalName, context: "" };
    const target = resolveAddDestination(canonicalName);
    if (target.group) {
      const targetId = target.group.id;
      onChange({
        ...value,
        groups: value.groups.map((group) =>
          group.id === targetId ? { ...group, items: [...group.items, item] } : group,
        ),
      });
    } else {
      onChange({
        ...value,
        groups: [...value.groups, { id: crypto.randomUUID(), name: target.name, items: [item] }],
      });
    }
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
    setAnnouncement(t("added", { name: canonicalName, category: target.label }));
    searchRef.current?.focus();
  }

  function selectHighlighted() {
    const entry = results[highlightedIndex];
    if (entry) addTechnology(entry.name);
    else if (canAddCustom) addTechnology(text);
  }

  function createCategory() {
    const name = newCategoryName.trim();
    if (!name) return;
    const existing = value.groups.find(
      (group) => group.name.trim().toLowerCase() === name.toLowerCase(),
    );
    const groupId = existing?.id ?? crypto.randomUUID();
    if (!existing)
      onChange({ ...value, groups: [...value.groups, { id: groupId, name, items: [] }] });
    setDestination({ kind: "group", groupId });
    setNewCategoryName("");
    setAnnouncement(t("categoryCreated", { name }));
    searchRef.current?.focus();
    setOpen(false);
  }

  function organizeCategories() {
    if (
      value.groups.some((group) => group.name.trim()) &&
      !window.confirm(t("organizeConfirmation"))
    )
      return;
    onChange(organizeTechnologyGroups(value, locale, () => crypto.randomUUID()));
    setDestination({ kind: "suggested" });
    setAnnouncement(t("organized"));
    setOpen(false);
  }

  return (
    <div className="space-y-5">
      <Field
        htmlFor={`${baseId}-layout`}
        label={t("layout")}
        description={t("layoutHelp")}
        error={
          errors.some(
            (error) =>
              error.code === "invalid_html" &&
              error.path[0] === "data" &&
              error.path[1] === "technologies",
          )
            ? t("compactLimit")
            : undefined
        }
      >
        <select
          className={selectClassName}
          value={value.layout ?? "grouped"}
          onChange={(event) =>
            onChange({ ...value, layout: event.target.value === "compact" ? "compact" : "grouped" })
          }
        >
          <option value="compact">{t("layoutCompact")}</option>
          <option value="grouped">{t("layoutGrouped")}</option>
        </select>
      </Field>
      <Field
        htmlFor={`${baseId}-destination`}
        label={t("destination")}
        description={destinationHelp}
      >
        <select
          value={
            destinationIndex >= 0
              ? String(destinationIndex)
              : destination.kind === "uncategorized"
                ? "uncategorized"
                : "suggested"
          }
          className={selectClassName}
          onChange={(event) => {
            if (event.target.value === "uncategorized") setDestination({ kind: "uncategorized" });
            else {
              const group = value.groups[Number(event.target.value)];
              setDestination(group ? { kind: "group", groupId: group.id } : { kind: "suggested" });
            }
          }}
        >
          <option value="suggested">{t("suggestedCategory")}</option>
          <option value="uncategorized">{t("withoutCategory")}</option>
          {visibleGroups.map((group, index) => (
            <option key={group.id} value={value.groups.findIndex((entry) => entry.id === group.id)}>
              {groupLabel(group, index)}
            </option>
          ))}
        </select>
      </Field>
      <TechnologyCategoryGuide />
      <div
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
        }}
      >
        <Field htmlFor={`${baseId}-search`} label={t("searchLabel")} description={t("searchHelp")}>
          <Input
            ref={searchRef}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open && optionCount > 0}
            aria-controls={open && optionCount > 0 ? listId : undefined}
            aria-activedescendant={
              open && optionCount > 0 ? `${baseId}-option-${highlightedIndex}` : undefined
            }
            autoComplete="off"
            value={query}
            placeholder={t("searchPlaceholder")}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
              setActiveIndex(0);
              setAnnouncement("");
            }}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "ArrowDown" || event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                if (optionCount > 0) {
                  const direction = event.key === "ArrowDown" ? 1 : -1;
                  setActiveIndex(
                    open ? (highlightedIndex + direction + optionCount) % optionCount : 0,
                  );
                }
              } else if (event.key === "Enter" && open && optionCount > 0) {
                event.preventDefault();
                selectHighlighted();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setOpen(false);
              }
            }}
          />
        </Field>
        {open && optionCount > 0 && (
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={t("suggestions")}
            className="absolute top-full z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-lg border border-border-strong bg-surface p-1.5 shadow-soft"
          >
            {results.map((entry, index) => (
              <li key={entry.id} role="none">
                <button
                  id={`${baseId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === highlightedIndex}
                  aria-label={entry.name}
                  aria-describedby={`${baseId}-destination-option-${index}`}
                  tabIndex={-1}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface-raised aria-selected:bg-surface-raised"
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => addTechnology(entry.name)}
                >
                  <TechnologyIcon entry={entry} />
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="block break-words">{entry.name}</span>
                    <span
                      id={`${baseId}-destination-option-${index}`}
                      className="block text-xs leading-5 break-words text-muted-foreground"
                    >
                      {t("optionDestination", {
                        category: resolveAddDestination(entry.name).label,
                      })}
                    </span>
                  </span>
                  {index === highlightedIndex && <Check aria-hidden="true" className="size-4" />}
                </button>
              </li>
            ))}
            {canAddCustom && (
              <li role="none">
                <button
                  id={`${baseId}-option-${results.length}`}
                  type="button"
                  role="option"
                  aria-selected={highlightedIndex === results.length}
                  aria-label={t("addCustom", { name: text })}
                  aria-describedby={`${baseId}-destination-option-${results.length}`}
                  tabIndex={-1}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm break-words text-foreground hover:bg-surface-raised aria-selected:bg-surface-raised"
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={() => setActiveIndex(results.length)}
                  onClick={() => addTechnology(text)}
                >
                  <Plus aria-hidden="true" className="size-5 shrink-0" />
                  <span className="min-w-0 flex-1 space-y-0.5">
                    <span className="block break-words">{t("addCustom", { name: text })}</span>
                    <span
                      id={`${baseId}-destination-option-${results.length}`}
                      className="block text-xs leading-5 break-words text-muted-foreground"
                    >
                      {t("optionDestination", { category: resolveAddDestination(text).label })}
                    </span>
                  </span>
                </button>
              </li>
            )}
          </ul>
        )}
      </div>
      <p role="status" className="sr-only">
        {duplicate ? t("duplicate", { name: recognized?.name ?? text }) : announcement}
      </p>
      {duplicate && (
        <p className="flex items-center gap-2 text-xs leading-5 text-muted-foreground">
          <Check aria-hidden="true" className="size-4 shrink-0" />
          {t("duplicate", { name: recognized?.name ?? text })}
        </p>
      )}
      <details className="rounded-md border border-border px-4 py-3">
        <summary className="min-h-11 cursor-pointer rounded-sm py-3 text-sm font-medium focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
          {t("categoryTools")}
        </summary>
        <div className="space-y-4 pt-4">
          <Field
            htmlFor={`${baseId}-new-category`}
            label={t("newCategoryName")}
            description={t("newCategoryHelp")}
          >
            <Input
              value={newCategoryName}
              placeholder={t("newCategoryPlaceholder")}
              onChange={(event) => setNewCategoryName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  createCategory();
                }
              }}
            />
          </Field>
          <Button
            variant="outline"
            onClick={createCategory}
            disabled={!newCategoryName.trim()}
            aria-describedby={`${baseId}-new-category-description`}
          >
            <Plus aria-hidden="true" />
            {t("createCategory")}
          </Button>
          {hasTools && (
            <div className="space-y-3 border-t border-border pt-4">
              <p id={`${baseId}-organize-help`} className="text-xs leading-5 text-muted-foreground">
                {t("organizeHelp")}
              </p>
              <Button
                variant="ghost"
                onClick={organizeCategories}
                aria-describedby={`${baseId}-organize-help`}
              >
                {t("organize")}
              </Button>
            </div>
          )}
        </div>
      </details>
      {value.groups.every((group) => group.items.length === 0) && (
        <p className="flex items-start gap-2 py-3 text-sm leading-6 text-muted-foreground">
          <Search aria-hidden="true" className="mt-1 size-4 shrink-0" />
          {t("empty")}
        </p>
      )}
      {visibleGroups.map((group, groupIndex) => (
        <TechnologyGroupList
          key={group.id}
          group={group}
          groupNumber={groupIndex + 1}
          groups={value.groups}
          headingRef={(heading) => {
            if (heading) groupHeadingRefs.current.set(group.id, heading);
            else groupHeadingRefs.current.delete(group.id);
          }}
          onChange={(next) => {
            if (next.name !== group.name) {
              setDestination({ kind: "group", groupId: group.id });
              if (!isVisibleGroup(next)) {
                pendingGroupFocus.current = null;
                searchRef.current?.focus();
                setOpen(false);
              }
            }
            onChange({
              ...value,
              groups: value.groups.map((item) => (item.id === group.id ? next : item)),
            });
          }}
          onRemove={(itemId, name) => {
            onChange({
              ...value,
              groups: value.groups.map((entry) =>
                entry.id === group.id
                  ? { ...entry, items: entry.items.filter((item) => item.id !== itemId) }
                  : entry,
              ),
            });
            setAnnouncement(t("removed", { name }));
            searchRef.current?.focus();
            setOpen(false);
          }}
          onRemoveGroup={() => {
            onChange(removeTechnologyCategory(value, group.id));
            setDestination({ kind: "group", groupId: group.id });
            if (group.items.length === 0) {
              pendingGroupFocus.current = null;
              searchRef.current?.focus();
            } else pendingGroupFocus.current = group.id;
            setAnnouncement(t("categoryRemoved", { name: groupLabel(group, groupIndex) }));
            setOpen(false);
          }}
          onMoveGroup={(direction) => {
            onChange(moveTechnologyGroup(value, group.id, direction));
            pendingGroupFocus.current = group.id;
            setAnnouncement(
              t("categoryMoved", {
                name: groupLabel(group, groupIndex),
                position: groupIndex + direction + 1,
              }),
            );
          }}
          onReorderItem={(itemId, direction) => {
            const next = reorderTechnologyItem(value, group.id, itemId, direction);
            if (next === value) return;
            onChange(next);
            const itemIndex = group.items.findIndex((item) => item.id === itemId);
            const nextIndex = itemIndex + direction;
            if (nextIndex === 0 || nextIndex === group.items.length - 1)
              pendingGroupFocus.current = group.id;
            setAnnouncement(
              t("toolReordered", {
                name: group.items[itemIndex]?.name.trim() || t("untitled"),
                position: itemIndex + direction + 1,
              }),
            );
          }}
          onMoveItem={(itemId, targetGroupId) => {
            const next = moveTechnologyItem(value, group.id, itemId, targetGroupId, () =>
              crypto.randomUUID(),
            );
            if (next === value) return;
            onChange(next);
            const previousTarget =
              targetGroupId === null
                ? value.groups.find((entry) => !entry.name.trim())
                : value.groups.find((entry) => entry.id === targetGroupId);
            const target = previousTarget
              ? next.groups.find((entry) => entry.id === previousTarget.id)
              : next.groups.find(
                  (entry) => !value.groups.some((previous) => previous.id === entry.id),
                );
            if (target) {
              pendingGroupFocus.current = target.id;
              setAnnouncement(
                t("toolMoved", {
                  name:
                    group.items.find((item) => item.id === itemId)?.name.trim() || t("untitled"),
                  category: groupLabel(target, next.groups.filter(isVisibleGroup).indexOf(target)),
                }),
              );
            }
          }}
        />
      ))}
    </div>
  );
}

function TechnologyGroupList({
  group,
  groupNumber,
  groups,
  headingRef,
  onChange,
  onRemove,
  onRemoveGroup,
  onMoveGroup,
  onReorderItem,
  onMoveItem,
}: {
  group: TechnologyGroup;
  groupNumber: number;
  groups: Technologies["groups"];
  headingRef: (heading: HTMLHeadingElement | null) => void;
  onChange: (value: TechnologyGroup) => void;
  onRemove: (id: string, name: string) => void;
  onRemoveGroup: () => void;
  onMoveGroup: (direction: -1 | 1) => void;
  onReorderItem: (itemId: string, direction: -1 | 1) => void;
  onMoveItem: (itemId: string, targetGroupId: string | null) => void;
}) {
  const t = useTranslations("EditorModules.technologies");
  const baseId = useId();
  const categoryName = group.name.trim() || t("uncategorizedNumber", { number: groupNumber });
  const visibleGroups = groups.filter(isVisibleGroup);
  const [itemDestinations, setItemDestinations] = useState<ReadonlyMap<string, string | null>>(
    () => new Map(),
  );
  const [titleDraft, setTitleDraft] = useState(() => ({ source: group.name, value: group.name }));
  const titleValue = titleDraft.source === group.name ? titleDraft.value : group.name;

  function commitTitle() {
    if (titleValue === group.name) return;
    setTitleDraft({ source: titleValue, value: titleValue });
    onChange({ ...group, name: titleValue });
  }

  function editTechnology(id: string, key: "name" | "context", text: string) {
    onChange({
      ...group,
      items: group.items.map((item) => (item.id === id ? { ...item, [key]: text } : item)),
    });
  }

  return (
    <div
      role="group"
      aria-labelledby={`${baseId}-title`}
      className="min-w-0 space-y-3 rounded-lg border border-border p-4"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4
          id={`${baseId}-title`}
          ref={headingRef}
          tabIndex={-1}
          className="min-w-0 text-sm font-semibold wrap-anywhere focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
        >
          {categoryName}
        </h4>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("moveCategoryUp", { name: categoryName })}
            aria-describedby={`${baseId}-order-help`}
            disabled={groupNumber === 1}
            onClick={() => onMoveGroup(-1)}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label={t("moveCategoryDown", { name: categoryName })}
            aria-describedby={`${baseId}-order-help`}
            disabled={groupNumber === visibleGroups.length}
            onClick={() => onMoveGroup(1)}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
        </div>
      </div>
      <p id={`${baseId}-order-help`} className="sr-only">
        {t("orderHelp")}
      </p>
      {group.items.length > 0 && (
        <ul aria-label={t("selected")} className="flex flex-wrap gap-2">
          {group.items.map((item) => {
            const entry = findTechnology(item.name);
            const name = item.name.trim() || t("untitled");
            return (
              <li
                key={item.id}
                className="flex max-w-full items-center gap-2 rounded-full border border-border bg-surface-raised/50 py-1 pr-1 pl-3"
              >
                {entry && <TechnologyIcon entry={entry} />}
                <span className="min-w-0 text-sm break-words">{name}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 rounded-full"
                  aria-label={t("remove", { name })}
                  onClick={() => onRemove(item.id, name)}
                >
                  <X aria-hidden="true" />
                </Button>
              </li>
            );
          })}
        </ul>
      )}
      {group.items.length === 0 && (
        <p className="text-xs leading-5 text-muted-foreground">{t("emptyCategory")}</p>
      )}
      <details className="border-t border-border">
        <summary className="min-h-11 cursor-pointer rounded-sm py-3 text-xs leading-5 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
          {t("categorySettings")}
        </summary>
        <div className="space-y-4 pt-4">
          <Field
            htmlFor={`${baseId}-group-name`}
            label={t("groupName")}
            description={t("categoryNameHelp")}
          >
            <Input
              value={titleValue}
              onChange={(event) => setTitleDraft({ source: group.name, value: event.target.value })}
              onBlur={commitTitle}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                  event.preventDefault();
                  commitTitle();
                }
              }}
            />
          </Field>
          {group.items.map((item, index) => {
            const selection = itemDestinations.has(item.id)
              ? itemDestinations.get(item.id)
              : group.id;
            const destinationId =
              selection === null || visibleGroups.some((entry) => entry.id === selection)
                ? (selection ?? null)
                : group.id;
            const resolvedDestinationId =
              destinationId === null
                ? groups.find((entry) => !entry.name.trim())?.id
                : destinationId;
            return (
              <div key={item.id} className="min-w-0 space-y-3 border-t border-border pt-4">
                <Field
                  htmlFor={`${baseId}-destination-${index}`}
                  label={t("moveTool", { name: item.name.trim() || t("untitled") })}
                  description={t("moveToolHelp")}
                >
                  <select
                    className={selectClassName}
                    value={
                      destinationId === null
                        ? "uncategorized"
                        : String(groups.findIndex((entry) => entry.id === destinationId))
                    }
                    onChange={(event) => {
                      const target = groups[Number(event.target.value)];
                      setItemDestinations((previous) =>
                        new Map(previous).set(item.id, target?.id ?? null),
                      );
                    }}
                  >
                    {visibleGroups.map((destination, destinationIndex) => (
                      <option
                        key={destination.id}
                        value={groups.findIndex((entry) => entry.id === destination.id)}
                      >
                        {destination.name.trim() ||
                          t("uncategorizedNumber", { number: destinationIndex + 1 })}
                      </option>
                    ))}
                    <option value="uncategorized">{t("withoutCategory")}</option>
                  </select>
                </Field>
                <Button
                  variant="outline"
                  disabled={resolvedDestinationId === group.id}
                  aria-label={t("moveToolCommit", { name: item.name.trim() || t("untitled") })}
                  aria-describedby={`${baseId}-destination-${index}-description`}
                  onClick={() => onMoveItem(item.id, destinationId)}
                >
                  {t("moveToolVisible")}
                </Button>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="ghost"
                    aria-label={t("moveToolUp", { name: item.name.trim() || t("untitled") })}
                    aria-describedby={`${baseId}-order-help`}
                    disabled={index === 0}
                    onClick={() => onReorderItem(item.id, -1)}
                  >
                    <ArrowUp aria-hidden="true" />
                    {t("moveUp")}
                  </Button>
                  <Button
                    variant="ghost"
                    aria-label={t("moveToolDown", { name: item.name.trim() || t("untitled") })}
                    aria-describedby={`${baseId}-order-help`}
                    disabled={index === group.items.length - 1}
                    onClick={() => onReorderItem(item.id, 1)}
                  >
                    <ArrowDown aria-hidden="true" />
                    {t("moveDown")}
                  </Button>
                </div>
                <details>
                  <summary className="min-h-11 cursor-pointer rounded-sm py-3 text-xs leading-5 text-muted-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
                    {t("toolDetails", { name: item.name.trim() || t("untitled") })}
                  </summary>
                  <div className="space-y-3 pt-3">
                    <Field
                      htmlFor={`${baseId}-name-${index}`}
                      label={t("savedName", { number: index + 1 })}
                    >
                      <Input
                        value={item.name}
                        onChange={(event) => editTechnology(item.id, "name", event.target.value)}
                      />
                    </Field>
                    <Field
                      htmlFor={`${baseId}-context-${index}`}
                      label={t("savedNote", { name: item.name.trim() || t("untitled") })}
                    >
                      <Textarea
                        rows={2}
                        value={item.context}
                        onChange={(event) => editTechnology(item.id, "context", event.target.value)}
                      />
                    </Field>
                  </div>
                </details>
              </div>
            );
          })}
          <p id={`${baseId}-remove-help`} className="text-xs leading-5 text-muted-foreground">
            {t("removeGroupHelp")}
          </p>
          <Button
            variant="ghost"
            aria-label={t("removeGroup", { number: groupNumber })}
            aria-describedby={`${baseId}-remove-help`}
            disabled={!group.name.trim()}
            onClick={onRemoveGroup}
          >
            <FolderMinus aria-hidden="true" />
            {t("removeGroupVisible")}
          </Button>
        </div>
      </details>
    </div>
  );
}

function TechnologyIcon({ entry }: { entry: TechnologyCatalogEntry }) {
  return (
    // Fixed local SVGs already have a vector source; no optimization request or user URL is needed.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={entry.iconPath}
      alt=""
      width={24}
      height={24}
      className="size-6 shrink-0 rounded-sm bg-white object-contain p-0.5"
    />
  );
}
