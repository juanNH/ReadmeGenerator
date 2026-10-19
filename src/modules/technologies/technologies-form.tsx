"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Plus, Search, Trash2, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { ProfileModuleData } from "@/core/profile/module-content";
import type { ReadmeIssue } from "@/core/readme";
import { findTechnology, technologyCatalog } from "@/core/technologies";
import type { TechnologyCatalogEntry } from "@/core/technologies";

type Technologies = ProfileModuleData["technologies"];
type TechnologyGroup = Technologies["groups"][number];

type TechnologiesFormProps = {
  value: Technologies;
  errors: readonly ReadmeIssue[];
  onChange: (value: Technologies) => void;
};

function technologyIdentity(name: string) {
  return findTechnology(name)?.id ?? name.trim().toLowerCase();
}

export function TechnologiesForm({ value, onChange }: TechnologiesFormProps) {
  const t = useTranslations("EditorModules.technologies");
  const baseId = useId();
  const searchRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcement, setAnnouncement] = useState("");
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

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [open, highlightedIndex, query]);

  function addTechnology(name: string) {
    const trimmed = name.trim();
    if (!trimmed || selected.has(technologyIdentity(trimmed))) return;
    const canonicalName = findTechnology(trimmed)?.name ?? trimmed;
    const item = { id: crypto.randomUUID(), name: canonicalName, context: "" };
    if (value.groups.length === 0) {
      onChange({ groups: [{ id: crypto.randomUUID(), name: "", items: [item] }] });
    } else {
      onChange({
        groups: value.groups.map((group, index) =>
          index === 0 ? { ...group, items: [...group.items, item] } : group,
        ),
      });
    }
    setQuery("");
    setOpen(false);
    setActiveIndex(0);
    setAnnouncement(t("added", { name: canonicalName }));
    searchRef.current?.focus();
  }

  function selectHighlighted() {
    const entry = results[highlightedIndex];
    if (entry) addTechnology(entry.name);
    else if (canAddCustom) addTechnology(text);
  }

  return (
    <div className="space-y-5">
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
            className="absolute top-[4.5rem] z-20 max-h-80 w-full overflow-y-auto rounded-lg border border-border-strong bg-surface p-1.5 shadow-soft"
          >
            {results.map((entry, index) => (
              <li key={entry.id} role="none">
                <button
                  id={`${baseId}-option-${index}`}
                  type="button"
                  role="option"
                  aria-selected={index === highlightedIndex}
                  tabIndex={-1}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm text-foreground hover:bg-surface-raised aria-selected:bg-surface-raised"
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={() => setActiveIndex(index)}
                  onClick={() => addTechnology(entry.name)}
                >
                  <TechnologyIcon entry={entry} />
                  <span className="flex-1">{entry.name}</span>
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
                  tabIndex={-1}
                  className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm break-words text-foreground hover:bg-surface-raised aria-selected:bg-surface-raised"
                  onMouseDown={(event) => event.preventDefault()}
                  onPointerMove={() => setActiveIndex(results.length)}
                  onClick={() => addTechnology(text)}
                >
                  <Plus aria-hidden="true" className="size-5 shrink-0" />
                  {t("addCustom", { name: text })}
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
      {value.groups.every((group) => group.items.length === 0) && (
        <p className="flex items-start gap-2 py-3 text-sm leading-6 text-muted-foreground">
          <Search aria-hidden="true" className="mt-1 size-4 shrink-0" />
          {t("empty")}
        </p>
      )}
      {value.groups.map((group, groupIndex) => (
        <TechnologyGroupList
          key={group.id}
          group={group}
          groupNumber={groupIndex + 1}
          onChange={(next) =>
            onChange({ groups: value.groups.map((item) => (item.id === group.id ? next : item)) })
          }
          onRemove={(itemId, name) => {
            onChange({
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
            onChange({ groups: value.groups.filter((entry) => entry.id !== group.id) });
            searchRef.current?.focus();
            setOpen(false);
          }}
        />
      ))}
    </div>
  );
}

function TechnologyGroupList({
  group,
  groupNumber,
  onChange,
  onRemove,
  onRemoveGroup,
}: {
  group: TechnologyGroup;
  groupNumber: number;
  onChange: (value: TechnologyGroup) => void;
  onRemove: (id: string, name: string) => void;
  onRemoveGroup: () => void;
}) {
  const t = useTranslations("EditorModules.technologies");
  const baseId = useId();
  // Keep recovered details mounted while someone clears their last saved value.
  const [hasSavedDetails] = useState(
    () =>
      Boolean(group.name.trim()) ||
      group.items.some((item) => item.context.trim() || !item.name.trim()),
  );

  function editTechnology(id: string, key: "name" | "context", text: string) {
    onChange({
      ...group,
      items: group.items.map((item) => (item.id === id ? { ...item, [key]: text } : item)),
    });
  }

  return (
    <div className="space-y-3">
      {group.name.trim() && <p className="text-sm font-medium">{group.name}</p>}
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
                  className="size-9 min-h-9 shrink-0 rounded-full"
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
      {hasSavedDetails && (
        <details className="group border-t border-border pt-3">
          <summary className="w-fit cursor-pointer rounded-sm text-xs leading-6 text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
            {t("savedDetails")}
          </summary>
          <div className="space-y-4 pt-4">
            <p className="text-xs leading-5 text-muted-foreground">{t("savedDetailsHelp")}</p>
            <Field htmlFor={`${baseId}-group-name`} label={t("groupName")}>
              <Input
                value={group.name}
                onChange={(event) => onChange({ ...group, name: event.target.value })}
              />
            </Field>
            {group.items.map((item, index) => (
              <div key={item.id} className="space-y-3">
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
            ))}
            <p id={`${baseId}-remove-help`} className="text-xs leading-5 text-muted-foreground">
              {t("removeGroupHelp")}
            </p>
            <Button
              variant="ghost"
              aria-label={t("removeGroup", { number: groupNumber })}
              aria-describedby={`${baseId}-remove-help`}
              onClick={onRemoveGroup}
            >
              <Trash2 aria-hidden="true" />
              {t("removeGroupVisible")}
            </Button>
          </div>
        </details>
      )}
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
