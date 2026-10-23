import { useEffect, useId, useRef, useState } from "react";
import type { ActivitySnapshot } from "@/core/activity/activity-types";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { reorderContributionItem } from "@/core/profile/contribution-operations";
import type { ProfileModuleData } from "@/core/profile/module-content";
import type { ReadmeIssue } from "@/core/readme";
import { parseGitHubRepositoryUrl } from "@/core/readme/github-repository";
import { useEntryFocus } from "@/modules/shared/use-entry-focus";

type ContributionItem = ProfileModuleData["contributions"]["items"][number];
type ContributionLink = NonNullable<ContributionItem["links"]>[number];
type ContributionImage = NonNullable<ContributionItem["images"]>[number];
type SuggestedHighlight = ActivitySnapshot["highlights"][number];

type EditorLink = { readonly link: ContributionLink; readonly legacy: boolean };

type ContributionItemsEditorProps = {
  value: ProfileModuleData["contributions"];
  errors: readonly ReadmeIssue[];
  onChange: (next: ProfileModuleData["contributions"]) => void;
  suggestions?: readonly SuggestedHighlight[];
};

function editorLinks(item: ContributionItem): EditorLink[] {
  if (item.links !== undefined) return item.links.map((link) => ({ link, legacy: false }));
  return item.url.trim()
    ? [{ link: { id: "legacy-link", label: "", url: item.url }, legacy: true }]
    : [];
}

function hasIssue(
  errors: readonly ReadmeIssue[],
  code: ReadmeIssue["code"],
  path: readonly (string | number)[],
) {
  return errors.some(
    (error) =>
      error.code === code &&
      error.path.length === path.length &&
      path.every((part, index) => error.path[index] === part),
  );
}

function suggestionIsAdded(items: readonly ContributionItem[], url: string) {
  return items.some(
    (item) =>
      (item.links === undefined && item.url.trim() === url) ||
      item.links?.some((link) => link.url.trim() === url),
  );
}

export function ContributionItemsEditor({
  value,
  errors,
  onChange,
  suggestions = [],
}: ContributionItemsEditorProps) {
  const t = useTranslations("EditorModules.contributions");
  const baseId = useId();
  const [orderStatus, setOrderStatus] = useState("");
  const { entryRef, addButtonRef, focusNewEntry, focusAfterRemoval } = useEntryFocus(value.items);
  const nestedInputs = useRef({
    links: new Map<string, HTMLInputElement>(),
    images: new Map<string, HTMLInputElement>(),
    linkAddButtons: new Map<string, HTMLButtonElement>(),
    imageAddButtons: new Map<string, HTMLButtonElement>(),
    imageSummaries: new Map<string, HTMLElement>(),
  });
  const pendingNestedFocus = useRef<{ kind: "links" | "images"; key: string } | null>(null);

  useEffect(() => {
    const pending = pendingNestedFocus.current;
    if (!pending) return;
    nestedInputs.current[pending.kind].get(pending.key)?.focus();
    pendingNestedFocus.current = null;
  }, [value.items]);

  function nestedEntryKey(itemId: string, entryId: string) {
    return JSON.stringify([itemId, entryId]);
  }

  function focusAfterNestedRemoval(
    kind: "links" | "images",
    itemId: string,
    entries: readonly { id: string }[],
    index: number,
  ) {
    const neighbor = entries[index + 1] ?? entries[index - 1];
    if (neighbor) {
      nestedInputs.current[kind].get(nestedEntryKey(itemId, neighbor.id))?.focus();
      return;
    }

    if (kind === "images" && entries.length === 1) {
      nestedInputs.current.imageSummaries.get(itemId)?.focus();
      return;
    }

    nestedInputs.current[kind === "links" ? "linkAddButtons" : "imageAddButtons"]
      .get(itemId)
      ?.focus();
  }

  function updateEntry(id: string, update: (item: ContributionItem) => ContributionItem) {
    onChange({ items: value.items.map((item) => (item.id === id ? update(item) : item)) });
  }

  function addEntry() {
    const id = crypto.randomUUID();
    focusNewEntry(id);
    onChange({ items: [...value.items, { id, title: "", description: "", url: "" }] });
  }

  function addSuggestion(suggestion: SuggestedHighlight) {
    if (suggestionIsAdded(value.items, suggestion.url)) return;
    const id = crypto.randomUUID();
    focusNewEntry(id);
    onChange({
      items: [
        ...value.items,
        {
          id,
          title: suggestion.title,
          description: "",
          url: "",
          links: [{ id: crypto.randomUUID(), label: "", url: suggestion.url }],
        },
      ],
    });
  }

  function removeEntry(id: string, index: number) {
    focusAfterRemoval(index);
    onChange({ items: value.items.filter((item) => item.id !== id) });
  }

  function moveEntry(item: ContributionItem, index: number, direction: -1 | 1) {
    const next = reorderContributionItem(value.items, item.id, direction);
    if (next === value.items) return;
    const nextIndex = index + direction;
    setOrderStatus(
      t("moved", {
        title: item.title.trim() || t("entry", { number: index + 1 }),
        number: nextIndex + 1,
        total: next.length,
      }),
    );
    onChange({ items: next });
  }

  function addLink(item: ContributionItem) {
    const current = editorLinks(item).map(({ link }) => link);
    if (current.length >= 5) return;
    const id = crypto.randomUUID();
    pendingNestedFocus.current = { kind: "links", key: nestedEntryKey(item.id, id) };
    updateEntry(item.id, (currentItem) => ({
      ...currentItem,
      url: "",
      links: [...editorLinks(currentItem).map(({ link }) => link), { id, label: "", url: "" }],
    }));
  }

  function updateLink(item: ContributionItem, index: number, field: "label" | "url", text: string) {
    updateEntry(item.id, (currentItem) => {
      const links = editorLinks(currentItem).map(({ link }) => link);
      return {
        ...currentItem,
        url: "",
        links: links.map((link, linkIndex) =>
          linkIndex === index ? { ...link, [field]: text } : link,
        ),
      };
    });
  }

  function removeLink(item: ContributionItem, index: number) {
    focusAfterNestedRemoval(
      "links",
      item.id,
      editorLinks(item).map(({ link }) => link),
      index,
    );
    updateEntry(item.id, (currentItem) => ({
      ...currentItem,
      url: "",
      links: editorLinks(currentItem)
        .map(({ link }) => link)
        .filter((_, linkIndex) => linkIndex !== index),
    }));
  }

  function addImage(item: ContributionItem) {
    const images = item.images ?? [];
    if (images.length >= 3) return;
    const id = crypto.randomUUID();
    pendingNestedFocus.current = { kind: "images", key: nestedEntryKey(item.id, id) };
    updateEntry(item.id, (currentItem) => ({
      ...currentItem,
      images: [...(currentItem.images ?? []), { id, url: "", alt: "" }],
    }));
  }

  function updateImage(
    item: ContributionItem,
    imageId: string,
    field: "url" | "alt",
    text: string,
  ) {
    updateEntry(item.id, (currentItem) => ({
      ...currentItem,
      images: (currentItem.images ?? []).map((image) =>
        image.id === imageId ? { ...image, [field]: text } : image,
      ),
    }));
  }

  function removeImage(item: ContributionItem, imageId: string) {
    const images = item.images ?? [];
    focusAfterNestedRemoval(
      "images",
      item.id,
      images,
      images.findIndex((image) => image.id === imageId),
    );
    updateEntry(item.id, (currentItem) => ({
      ...currentItem,
      images: (currentItem.images ?? []).filter((image) => image.id !== imageId),
    }));
  }

  function updateRepository(item: ContributionItem, field: "url" | "description", text: string) {
    updateEntry(item.id, (currentItem) => ({
      ...currentItem,
      repository: { ...(currentItem.repository ?? { url: "", description: "" }), [field]: text },
    }));
  }

  function removeRepository(item: ContributionItem) {
    updateEntry(item.id, (currentItem) => {
      const next = { ...currentItem };
      delete next.repository;
      return next;
    });
  }

  return (
    <section aria-labelledby={`${baseId}-title`} className="space-y-5">
      <div className="space-y-1">
        <h3 id={`${baseId}-title`} className="text-sm font-semibold">
          {t("highlightsTitle")}
        </h3>
        <p className="text-xs leading-5 text-muted-foreground">{t("highlightsHelp")}</p>
      </div>
      {suggestions.length > 0 && (
        <details className="rounded-lg border border-border p-3">
          <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            {t("activity.suggestions")}
          </summary>
          <ul className="mt-3 space-y-3">
            {suggestions.map((suggestion) => {
              const added = suggestionIsAdded(value.items, suggestion.url);
              return (
                <li key={suggestion.id} className="space-y-2 border-t border-border pt-3">
                  <div className="min-w-0 space-y-1">
                    <a
                      href={suggestion.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-sm font-medium [overflow-wrap:anywhere] text-accent underline-offset-4 hover:underline"
                    >
                      {suggestion.title || suggestion.url}
                    </a>
                    <p className="text-xs leading-5 [overflow-wrap:anywhere] text-muted-foreground">
                      {suggestion.repository} · {t(`activity.kinds.${suggestion.kind}`)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={added}
                    aria-label={t(added ? "activity.alreadyAdded" : "activity.addSuggested", {
                      title: suggestion.title || suggestion.url,
                    })}
                    onClick={() => addSuggestion(suggestion)}
                  >
                    {added ? t("activity.added") : t("activity.add")}
                  </Button>
                </li>
              );
            })}
          </ul>
        </details>
      )}
      {value.items.length === 0 && (
        <p className="rounded-md border border-dashed border-border bg-surface-raised/40 px-4 py-5 text-sm leading-6 text-muted-foreground">
          {t("empty")}
        </p>
      )}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {orderStatus}
      </p>
      {value.items.map((item, index) => {
        const controlId = `${baseId}-entry-${index}`;
        const links = editorLinks(item);
        const repository = item.repository;
        const repositoryTarget = repository ? parseGitHubRepositoryUrl(repository.url) : null;
        const itemTitle = item.title.trim() || t("entry", { number: index + 1 });
        const linkSectionPath = ["data", "contributions", "items", index] as const;
        return (
          <fieldset key={item.id} className="min-w-0 space-y-4 border-t border-border pt-4">
            <legend className="px-1 text-sm font-medium">
              {t("entry", { number: index + 1 })}
            </legend>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="ghost"
                disabled={index === 0}
                aria-label={t("moveUp", { title: itemTitle })}
                onClick={() => moveEntry(item, index, -1)}
              >
                <ArrowUp aria-hidden="true" />
                {t("moveUpVisible")}
              </Button>
              <Button
                variant="ghost"
                disabled={index === value.items.length - 1}
                aria-label={t("moveDown", { title: itemTitle })}
                onClick={() => moveEntry(item, index, 1)}
              >
                <ArrowDown aria-hidden="true" />
                {t("moveDownVisible")}
              </Button>
            </div>
            <Field htmlFor={`${controlId}-title`} label={t("title")} description={t("titleHelp")}>
              <Input
                data-emoji-target="true"
                ref={entryRef(item.id)}
                value={item.title}
                placeholder={t("titlePlaceholder")}
                onChange={(event) =>
                  updateEntry(item.id, (currentItem) => ({
                    ...currentItem,
                    title: event.target.value,
                  }))
                }
              />
            </Field>
            <Field
              htmlFor={`${controlId}-description`}
              label={t("descriptionLabel")}
              description={t("descriptionHelp")}
            >
              <Textarea
                data-emoji-target="true"
                rows={2}
                value={item.description}
                placeholder={t("descriptionPlaceholder")}
                onChange={(event) =>
                  updateEntry(item.id, (currentItem) => ({
                    ...currentItem,
                    description: event.target.value,
                  }))
                }
              />
            </Field>

            <div className="space-y-3 rounded-lg border border-border bg-surface-raised/30 p-3">
              <div className="space-y-1">
                <h4 className="text-sm font-medium">{t("linksTitle")}</h4>
                <p className="text-xs leading-5 text-muted-foreground">{t("linksHelp")}</p>
              </div>
              {links.map(({ link, legacy }, linkIndex) => {
                const urlPath = legacy
                  ? [...linkSectionPath, "url"]
                  : [...linkSectionPath, "links", linkIndex, "url"];
                return (
                  <div key={link.id} className="space-y-3 border-t border-border pt-3">
                    <Field htmlFor={`${controlId}-link-${linkIndex}-label`} label={t("linkLabel")}>
                      <Input
                        ref={(control) => {
                          const key = nestedEntryKey(item.id, link.id);
                          if (control) nestedInputs.current.links.set(key, control);
                          else nestedInputs.current.links.delete(key);
                        }}
                        value={link.label}
                        placeholder={t("linkLabelPlaceholder")}
                        onChange={(event) =>
                          updateLink(item, linkIndex, "label", event.target.value)
                        }
                      />
                    </Field>
                    <Field
                      htmlFor={`${controlId}-link-${linkIndex}-url`}
                      label={t("linkUrl")}
                      description={legacy ? t("urlHelp") : undefined}
                      error={hasIssue(errors, "invalid_url", urlPath) ? t("invalidUrl") : undefined}
                    >
                      <Input
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        spellCheck={false}
                        value={link.url}
                        placeholder={t("linkUrlPlaceholder")}
                        onChange={(event) => updateLink(item, linkIndex, "url", event.target.value)}
                      />
                    </Field>
                    <Button
                      variant="ghost"
                      aria-label={t("removeLink", { number: linkIndex + 1 })}
                      onClick={() => removeLink(item, linkIndex)}
                    >
                      <Trash2 aria-hidden="true" />
                      {t("removeLinkVisible")}
                    </Button>
                  </div>
                );
              })}
              <Button
                variant="outline"
                ref={(control) => {
                  if (control) nestedInputs.current.linkAddButtons.set(item.id, control);
                  else nestedInputs.current.linkAddButtons.delete(item.id);
                }}
                disabled={links.length >= 5}
                aria-describedby={`${controlId}-link-limit`}
                onClick={() => addLink(item)}
              >
                <Plus aria-hidden="true" />
                {t("addLink")}
              </Button>
              <p id={`${controlId}-link-limit`} className="text-xs text-muted-foreground">
                {t("linkLimit")}
              </p>
            </div>

            <details
              className="rounded-lg border border-border bg-surface-raised/30 p-3"
              open={Boolean(item.images?.length)}
            >
              <summary
                ref={(control) => {
                  if (control) nestedInputs.current.imageSummaries.set(item.id, control);
                  else nestedInputs.current.imageSummaries.delete(item.id);
                }}
                className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
              >
                <ImagePlus aria-hidden="true" className="mr-2 inline size-4" />
                {t("imagesTitle")}
              </summary>
              <div className="mt-3 space-y-3">
                <p className="text-xs leading-5 text-muted-foreground">{t("imagesHelp")}</p>
                {(item.images ?? []).map((image: ContributionImage, imageIndex) => {
                  const imagePath = [...linkSectionPath, "images", imageIndex];
                  return (
                    <div key={image.id} className="space-y-3 border-t border-border pt-3">
                      <Field
                        htmlFor={`${controlId}-image-${imageIndex}-url`}
                        label={t("imageUrl")}
                        error={
                          hasIssue(errors, "invalid_url", [...imagePath, "url"])
                            ? t("invalidImageUrl")
                            : undefined
                        }
                      >
                        <Input
                          ref={(control) => {
                            const key = nestedEntryKey(item.id, image.id);
                            if (control) nestedInputs.current.images.set(key, control);
                            else nestedInputs.current.images.delete(key);
                          }}
                          type="url"
                          inputMode="url"
                          autoComplete="off"
                          spellCheck={false}
                          value={image.url}
                          placeholder={t("imageUrlPlaceholder")}
                          onChange={(event) =>
                            updateImage(item, image.id, "url", event.target.value)
                          }
                        />
                      </Field>
                      <Field
                        htmlFor={`${controlId}-image-${imageIndex}-alt`}
                        label={t("imageAlt")}
                        description={t("imageAltHelp")}
                        error={
                          hasIssue(errors, "missing_image_alt", [...imagePath, "alt"])
                            ? t("missingImageAlt")
                            : undefined
                        }
                      >
                        <Input
                          data-emoji-target="true"
                          value={image.alt}
                          placeholder={t("imageAltPlaceholder")}
                          onChange={(event) =>
                            updateImage(item, image.id, "alt", event.target.value)
                          }
                        />
                      </Field>
                      <Button
                        variant="ghost"
                        aria-label={t("removeImage", { number: imageIndex + 1 })}
                        onClick={() => removeImage(item, image.id)}
                      >
                        <Trash2 aria-hidden="true" />
                        {t("removeImageVisible")}
                      </Button>
                    </div>
                  );
                })}
                <Button
                  variant="outline"
                  ref={(control) => {
                    if (control) nestedInputs.current.imageAddButtons.set(item.id, control);
                    else nestedInputs.current.imageAddButtons.delete(item.id);
                  }}
                  disabled={(item.images?.length ?? 0) >= 3}
                  aria-describedby={`${controlId}-image-limit`}
                  onClick={() => addImage(item)}
                >
                  <Plus aria-hidden="true" />
                  {t("addImage")}
                </Button>
                <p id={`${controlId}-image-limit`} className="text-xs text-muted-foreground">
                  {t("imageLimit")}
                </p>
              </div>
            </details>

            {repository ? (
              <details className="rounded-lg border border-border bg-surface-raised/30 p-3" open>
                <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
                  {t("repositoryTitle")}
                </summary>
                <div className="mt-3 space-y-3">
                  <p className="text-xs leading-5 text-muted-foreground">{t("repositoryHelp")}</p>
                  <Field
                    htmlFor={`${controlId}-repository-url`}
                    label={t("repositoryUrl")}
                    description={
                      repositoryTarget
                        ? t("repositoryPreview", { repository: repositoryTarget.fullName })
                        : undefined
                    }
                    error={
                      hasIssue(errors, "invalid_url", [...linkSectionPath, "repository", "url"])
                        ? t("repositoryInvalid")
                        : undefined
                    }
                  >
                    <Input
                      type="url"
                      inputMode="url"
                      autoComplete="off"
                      spellCheck={false}
                      value={repository.url}
                      placeholder={t("repositoryUrlPlaceholder")}
                      onChange={(event) => updateRepository(item, "url", event.target.value)}
                    />
                  </Field>
                  <Field
                    htmlFor={`${controlId}-repository-description`}
                    label={t("repositoryDescription")}
                  >
                    <Textarea
                      data-emoji-target="true"
                      rows={2}
                      value={repository.description}
                      placeholder={t("repositoryDescriptionPlaceholder")}
                      onChange={(event) =>
                        updateRepository(item, "description", event.target.value)
                      }
                    />
                  </Field>
                  <Button
                    variant="ghost"
                    aria-label={t("removeRepository")}
                    onClick={() => removeRepository(item)}
                  >
                    <Trash2 aria-hidden="true" />
                    {t("removeRepository")}
                  </Button>
                </div>
              </details>
            ) : (
              <Button
                variant="outline"
                aria-label={t("addRepository")}
                onClick={() =>
                  updateEntry(item.id, (currentItem) => ({
                    ...currentItem,
                    repository: { url: "", description: "" },
                  }))
                }
              >
                <Plus aria-hidden="true" />
                {t("addRepository")}
              </Button>
            )}

            <div className="space-y-1">
              <Button
                variant="ghost"
                onClick={() => removeEntry(item.id, index)}
                aria-label={t("remove", { number: index + 1 })}
              >
                <Trash2 aria-hidden="true" />
                {t("removeVisible")}
              </Button>
              <p className="text-xs leading-5 text-muted-foreground">{t("removeHelp")}</p>
            </div>
          </fieldset>
        );
      })}
      <Button ref={addButtonRef} variant="outline" onClick={addEntry}>
        <Plus aria-hidden="true" />
        {t("add")}
      </Button>
    </section>
  );
}
