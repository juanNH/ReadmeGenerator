"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AlignLeft, ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { CodeEditor, type CodeEditorHandle } from "@/components/ui/code-editor";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { CustomBlock, CustomSection } from "@/core/profile/custom-content";
import type { ReadmeIssue } from "@/core/readme";
import {
  analyzeProfileHtml,
  PROFILE_HTML_MAX_DEPTH,
  PROFILE_HTML_MAX_DOCUMENT_LENGTH,
  PROFILE_HTML_MAX_LENGTH,
  PROFILE_HTML_MAX_NODES,
} from "@/core/readme/profile-html";
import { CustomBlockPicker, type AddBlockKind } from "./custom-block-picker";
import { CodeBlockFields } from "./code-block-fields";
import { CustomFormatFields } from "./custom-format-fields";
import {
  changeCustomTextAlignment,
  changeCustomTextKind,
  changeCustomTitleAlignment,
  changeCustomTitleLevel,
  getCustomTextKind,
} from "./custom-text-formatting";

type ListBlock = Extract<CustomBlock, { type: "list" }>;
type ParagraphBlock = Extract<CustomBlock, { type: "paragraph" }>;
type TextControl = HTMLInputElement | HTMLTextAreaElement;
type Selection = { start: number; end: number };
type FocusRequest =
  | { kind: "block"; blockId: string; selection?: Selection }
  | { kind: "item"; blockId: string; itemId: string; selection?: Selection }
  | { kind: "heading"; blockId: string }
  | { kind: "add" };

type CustomSectionFormProps = {
  value: CustomSection;
  errors: readonly ReadmeIssue[];
  onChange: (next: CustomSection) => void;
};

function withoutBulletPrefix(line: string) {
  return line.startsWith("- ") ? line.slice(2) : line;
}

function caretInList(text: string, start: number, end: number) {
  const beforeStart = text.slice(0, start).split("\n");
  const beforeEnd = text.slice(0, end).split("\n");
  const lineIndex = beforeEnd.length - 1;
  const lines = text.split("\n");
  const prefixLength = lines[lineIndex]?.startsWith("- ") ? 2 : 0;
  const endPosition = Math.max(0, (beforeEnd[lineIndex]?.length ?? 0) - prefixLength);
  const startPosition =
    beforeStart.length === beforeEnd.length
      ? Math.max(0, (beforeStart[lineIndex]?.length ?? 0) - prefixLength)
      : endPosition;
  return { lineIndex, selection: { start: startPosition, end: endPosition } };
}

export function CustomSectionForm({ value, errors, onChange }: CustomSectionFormProps) {
  const t = useTranslations("EditorModules.custom");
  const baseId = useId();
  const controls = useRef(new Map<string, TextControl>());
  const codeControls = useRef(new Map<string, CodeEditorHandle>());
  const headings = useRef(new Map<string, HTMLHeadingElement>());
  const itemControls = useRef(new Map<string, Map<string, TextControl>>());
  const composingParagraphs = useRef(new Map<string, boolean>());
  const composingItems = useRef(new Map<string, Set<string>>());
  const addBlockRef = useRef<HTMLButtonElement>(null);
  const pendingFocus = useRef<FocusRequest | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [pickerOpen, setPickerOpen] = useState(() => value.blocks.length === 0);

  useEffect(() => {
    const request = pendingFocus.current;
    if (request === null) return;
    const control =
      request.kind === "add"
        ? addBlockRef.current
        : request.kind === "heading"
          ? headings.current.get(request.blockId)
          : request.kind === "item"
            ? itemControls.current.get(request.blockId)?.get(request.itemId)
            : (controls.current.get(request.blockId) ??
              codeControls.current.get(request.blockId) ??
              headings.current.get(request.blockId));
    control?.focus();
    if (
      (request.kind === "item" || request.kind === "block") &&
      request.selection &&
      control &&
      "setSelectionRange" in control
    ) {
      control.setSelectionRange(request.selection.start, request.selection.end);
    }
    pendingFocus.current = null;
  }, [value.blocks]);

  function controlRef(blockId: string) {
    return (control: TextControl | null) => {
      if (control) controls.current.set(blockId, control);
      else controls.current.delete(blockId);
    };
  }

  function codeControlRef(blockId: string) {
    return (control: CodeEditorHandle | null) => {
      if (control) codeControls.current.set(blockId, control);
      else codeControls.current.delete(blockId);
    };
  }

  function itemRef(blockId: string, itemId: string, first: boolean) {
    return (control: TextControl | null) => {
      let items = itemControls.current.get(blockId);
      if (!items) {
        items = new Map();
        itemControls.current.set(blockId, items);
      }
      if (control) {
        items.set(itemId, control);
        if (first) controls.current.set(blockId, control);
      } else {
        items.delete(itemId);
        if (first) controls.current.delete(blockId);
        if (items.size === 0) itemControls.current.delete(blockId);
      }
    };
  }

  function replaceBlock(block: CustomBlock) {
    onChange({
      ...value,
      blocks: value.blocks.map((entry) => (entry.id === block.id ? block : entry)),
    });
  }

  function blockLabel(block: CustomBlock, index: number) {
    const key =
      block.type === "paragraph"
        ? "paragraphLabel"
        : block.type === "link"
          ? "linkLabel"
          : block.type === "heading"
            ? "headingLabel"
            : block.type === "divider"
              ? "dividerLabel"
              : block.type === "quote"
                ? "quoteLabel"
                : block.type === "image"
                  ? "imageLabel"
                  : block.type === "html"
                    ? "htmlLabel"
                    : block.type === "code"
                      ? "codeLabel"
                      : block.style === "ordered"
                        ? "orderedLabel"
                        : "unorderedLabel";
    return t(key, { number: index + 1 });
  }

  function addBlock(kind: AddBlockKind) {
    const id = crypto.randomUUID();
    const block: CustomBlock =
      kind === "paragraph" || kind === "heading" || kind === "quote"
        ? { id, type: kind, text: "" }
        : kind === "divider"
          ? { id, type: "divider" }
          : kind === "image"
            ? { id, type: "image", url: "", alt: "" }
            : kind === "html"
              ? { id, type: "html", source: "" }
              : kind === "code"
                ? { id, type: "code", source: "", language: "" }
                : kind === "link"
                  ? { id, type: "link", label: "", url: "" }
                  : {
                      id,
                      type: "list",
                      style: kind,
                      items: [{ id: crypto.randomUUID(), text: "" }],
                    };
    pendingFocus.current = { kind: "block", blockId: id };
    setPickerOpen(false);
    onChange({ ...value, blocks: [...value.blocks, block] });
    setAnnouncement(t("blockAdded", { name: blockLabel(block, value.blocks.length) }));
  }

  function removeBlock(index: number) {
    const next = value.blocks[index + 1] ?? value.blocks[index - 1];
    pendingFocus.current = next ? { kind: "block", blockId: next.id } : { kind: "add" };
    if (!next) setPickerOpen(true);
    onChange({ ...value, blocks: value.blocks.filter((_, position) => position !== index) });
    setAnnouncement(t("blockRemoved"));
  }

  function moveBlock(index: number, direction: -1 | 1) {
    const block = value.blocks[index];
    const nextIndex = index + direction;
    if (!block || nextIndex < 0 || nextIndex >= value.blocks.length) return;
    const blocks = [...value.blocks];
    blocks.splice(index, 1);
    blocks.splice(nextIndex, 0, block);
    pendingFocus.current = { kind: "heading", blockId: block.id };
    onChange({ ...value, blocks });
    setAnnouncement(
      t("blockMoved", { name: blockLabel(block, nextIndex), position: nextIndex + 1 }),
    );
  }

  function convertToList(block: ParagraphBlock, text: string, start: number, end: number) {
    const items = text
      .split("\n")
      .map((line) => ({ id: crypto.randomUUID(), text: withoutBulletPrefix(line) }));
    const caret = caretInList(text, start, end);
    const item = items[caret.lineIndex];
    if (item)
      pendingFocus.current = {
        kind: "item",
        blockId: block.id,
        itemId: item.id,
        selection: caret.selection,
      };
    replaceBlock({ id: block.id, type: "list", style: "unordered", items });
    setAnnouncement(t("convertedToList"));
  }

  function updateParagraph(
    block: ParagraphBlock,
    control: HTMLTextAreaElement,
    composing: boolean,
  ) {
    const text = control.value;
    if (!composing && !block.text.startsWith("- ") && text.startsWith("- ")) {
      convertToList(block, text, control.selectionStart, control.selectionEnd);
    } else replaceBlock({ ...block, text });
  }

  function addListItem(block: ListBlock) {
    const item = { id: crypto.randomUUID(), text: "" };
    pendingFocus.current = { kind: "item", blockId: block.id, itemId: item.id };
    replaceBlock({ ...block, items: [...block.items, item] });
  }

  function removeListItem(block: ListBlock, index: number) {
    const next = block.items[index + 1] ?? block.items[index - 1];
    pendingFocus.current = next
      ? { kind: "item", blockId: block.id, itemId: next.id }
      : { kind: "heading", blockId: block.id };
    replaceBlock({ ...block, items: block.items.filter((_, position) => position !== index) });
    setAnnouncement(t("itemRemoved"));
  }

  function enterInList(block: ListBlock, index: number, control: TextControl) {
    const item = block.items[index];
    if (!item) return;
    const text = control.value;
    if (!text.trim() && index === block.items.length - 1) {
      const paragraph: ParagraphBlock = { id: crypto.randomUUID(), type: "paragraph", text: "" };
      const remaining = block.items.slice(0, -1);
      const replacement: CustomBlock[] =
        remaining.length > 0 ? [{ ...block, items: remaining }, paragraph] : [paragraph];
      pendingFocus.current = {
        kind: "block",
        blockId: paragraph.id,
        selection: { start: 0, end: 0 },
      };
      onChange({
        ...value,
        blocks: value.blocks.flatMap((entry) => (entry.id === block.id ? replacement : [entry])),
      });
      setAnnouncement(t("continuedAsText"));
      return;
    }
    const start = control.selectionStart ?? text.length;
    const end = control.selectionEnd ?? start;
    const nextItem = { id: crypto.randomUUID(), text: text.slice(end) };
    const items = [...block.items];
    items.splice(index, 1, { ...item, text: text.slice(0, start) }, nextItem);
    pendingFocus.current = {
      kind: "item",
      blockId: block.id,
      itemId: nextItem.id,
      selection: { start: 0, end: 0 },
    };
    replaceBlock({ ...block, items });
  }

  function pasteListItems(block: ListBlock, index: number, control: TextControl, text: string) {
    const item = block.items[index];
    if (!item) return;
    const currentText = control.value;
    const start = control.selectionStart ?? currentText.length;
    const end = control.selectionEnd ?? start;
    const lines = text.split(/\r\n|\r|\n/).map(withoutBulletPrefix);
    const first = lines[0] ?? "";
    const replacements = [
      { ...item, text: currentText.slice(0, start) + first },
      ...lines.slice(1).map((line) => ({ id: crypto.randomUUID(), text: line })),
    ];
    const last = replacements[replacements.length - 1];
    if (!last) return;
    const caret = last.text.length;
    last.text += currentText.slice(end);
    const items = [...block.items];
    items.splice(index, 1, ...replacements);
    pendingFocus.current = {
      kind: "item",
      blockId: block.id,
      itemId: last.id,
      selection: { start: caret, end: caret },
    };
    replaceBlock({ ...block, items });
    setAnnouncement(t("itemsPasted", { count: replacements.length }));
  }

  function convertToText(block: ListBlock) {
    const text = block.items
      .map((item, index) => `${block.style === "ordered" ? `${index + 1}. ` : "- "}${item.text}`)
      .join("\n");
    pendingFocus.current = {
      kind: "block",
      blockId: block.id,
      selection: { start: text.length, end: text.length },
    };
    replaceBlock({ id: block.id, type: "paragraph", text });
    setAnnouncement(t("convertedToText"));
  }

  return (
    <div className="min-w-0 space-y-5">
      <Field
        htmlFor={`${baseId}-title`}
        label={t("title")}
        description={t("titleHelp")}
        error={
          errors.some(
            (error) =>
              error.code === "invalid_html" &&
              error.path[0] === "customSections" &&
              error.path[2] === "title",
          )
            ? t("format.tooLong")
            : undefined
        }
      >
        <Input
          data-emoji-target="true"
          value={value.title}
          placeholder={t("titlePlaceholder")}
          onChange={(event) => onChange({ ...value, title: event.target.value })}
        />
      </Field>
      <CustomFormatFields
        id={`${baseId}-title-format`}
        target="title"
        level={value.titleLevel ?? 2}
        alignment={value.titleAlignment ?? "left"}
        onLevelChange={(level) => onChange(changeCustomTitleLevel(value, level))}
        onAlignmentChange={(alignment) => onChange(changeCustomTitleAlignment(value, alignment))}
      />
      <div className="min-w-0 space-y-3">
        <Button
          ref={addBlockRef}
          variant="outline"
          aria-expanded={pickerOpen}
          aria-controls={`${baseId}-block-picker`}
          onClick={() => setPickerOpen(!pickerOpen)}
          className="w-full justify-between text-left"
        >
          <span className="flex min-w-0 items-center gap-2">
            <Plus aria-hidden="true" />
            <span className="min-w-0 wrap-anywhere">{t("addBlock")}</span>
          </span>
          <ChevronDown aria-hidden="true" className={pickerOpen ? "rotate-180" : undefined} />
        </Button>
        <div id={`${baseId}-block-picker`} hidden={!pickerOpen} className="min-w-0 space-y-3">
          <p className="text-sm leading-6 text-muted-foreground">{t("intro")}</p>
          <CustomBlockPicker onAdd={addBlock} />
        </div>
      </div>
      {value.blocks.length === 0 && (
        <p className="rounded-md border border-dashed border-border px-4 py-5 text-sm leading-6 text-muted-foreground">
          {t("empty")}
        </p>
      )}
      <p id={`${baseId}-order-help`} className="sr-only">
        {t("orderHelp")}
      </p>
      <p id={`${baseId}-remove-help`} className="sr-only">
        {t("removeHelp")}
      </p>
      {value.blocks.map((block, blockIndex) => {
        const controlId = `${baseId}-block-${blockIndex}`;
        const name = blockLabel(block, blockIndex);
        const urlError = errors.some(
          (error) =>
            error.code === "invalid_url" &&
            error.path[0] === "customSections" &&
            error.path[2] === "blocks" &&
            error.path[3] === blockIndex &&
            error.path[4] === "url",
        );
        const altError = errors.some(
          (error) =>
            error.code === "missing_image_alt" &&
            error.path[0] === "customSections" &&
            error.path[2] === "blocks" &&
            error.path[3] === blockIndex &&
            error.path[4] === "alt",
        );
        const textFormatError = errors.some(
          (error) =>
            error.code === "invalid_html" &&
            error.path[0] === "customSections" &&
            error.path[2] === "blocks" &&
            error.path[3] === blockIndex &&
            error.path[4] === "text",
        );
        return (
          <div
            key={block.id}
            role="group"
            aria-labelledby={`${controlId}-heading`}
            className="min-w-0 space-y-4 rounded-lg border border-border p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3
                id={`${controlId}-heading`}
                tabIndex={-1}
                ref={(heading) => {
                  if (heading) headings.current.set(block.id, heading);
                  else headings.current.delete(block.id);
                }}
                className="min-w-0 text-sm font-semibold wrap-anywhere focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
              >
                {name}
              </h3>
              <div className="flex max-w-full min-w-0 flex-wrap items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("moveUp", { name })}
                  aria-describedby={`${baseId}-order-help`}
                  disabled={blockIndex === 0}
                  onClick={() => moveBlock(blockIndex, -1)}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("moveDown", { name })}
                  aria-describedby={`${baseId}-order-help`}
                  disabled={blockIndex === value.blocks.length - 1}
                  onClick={() => moveBlock(blockIndex, 1)}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={t("removeBlock", { name })}
                  aria-describedby={`${baseId}-remove-help`}
                  onClick={() => removeBlock(blockIndex)}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
            {block.type === "paragraph" && (
              <Field
                htmlFor={`${controlId}-text`}
                label={t("text")}
                description={t("textHelp")}
                error={textFormatError ? t("format.tooLong") : undefined}
              >
                <Textarea
                  data-emoji-target="true"
                  ref={controlRef(block.id)}
                  value={block.text}
                  placeholder={t("textPlaceholder")}
                  onCompositionStart={() =>
                    composingParagraphs.current.set(block.id, block.text.startsWith("- "))
                  }
                  onCompositionEnd={(event) => {
                    const hadPrefix =
                      composingParagraphs.current.get(block.id) ?? block.text.startsWith("- ");
                    composingParagraphs.current.delete(block.id);
                    const control = event.currentTarget;
                    if (!hadPrefix && control.value.startsWith("- "))
                      convertToList(
                        block,
                        control.value,
                        control.selectionStart,
                        control.selectionEnd,
                      );
                    else replaceBlock({ ...block, text: control.value });
                  }}
                  onChange={(event) => {
                    const nativeComposing =
                      "isComposing" in event.nativeEvent && Boolean(event.nativeEvent.isComposing);
                    if (nativeComposing && !composingParagraphs.current.has(block.id))
                      composingParagraphs.current.set(block.id, block.text.startsWith("- "));
                    updateParagraph(
                      block,
                      event.currentTarget,
                      composingParagraphs.current.has(block.id) || nativeComposing,
                    );
                  }}
                />
              </Field>
            )}
            {(block.type === "heading" || block.type === "quote") && (
              <Field
                htmlFor={`${controlId}-text`}
                label={t(block.type === "heading" ? "subtitle" : "highlightedQuote")}
                description={t(block.type === "heading" ? "subtitleHelp" : "quoteHelp")}
                error={textFormatError ? t("format.tooLong") : undefined}
              >
                <Textarea
                  data-emoji-target="true"
                  ref={controlRef(block.id)}
                  value={block.text}
                  rows={block.type === "heading" ? 2 : 3}
                  className={block.type === "heading" ? "min-h-20" : undefined}
                  onChange={(event) => replaceBlock({ ...block, text: event.target.value })}
                />
              </Field>
            )}
            {(block.type === "paragraph" || block.type === "heading") && (
              <CustomFormatFields
                id={`${controlId}-format`}
                target="text"
                kind={getCustomTextKind(block, value.title)}
                alignment={block.alignment ?? "left"}
                onKindChange={(kind) => replaceBlock(changeCustomTextKind(block, kind))}
                onAlignmentChange={(alignment) =>
                  replaceBlock(changeCustomTextAlignment(block, alignment))
                }
              />
            )}
            {block.type === "divider" && (
              <div className="space-y-3">
                <hr className="border-border-strong" />
                <p className="text-xs leading-5 text-muted-foreground">{t("dividerHelp")}</p>
              </div>
            )}
            {block.type === "image" && (
              <div className="space-y-4">
                <Field
                  htmlFor={`${controlId}-url`}
                  label={t("imageUrl")}
                  description={t("imageUrlHelp")}
                  error={urlError ? t("invalidImageUrl") : undefined}
                >
                  <Input
                    ref={controlRef(block.id)}
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    value={block.url}
                    placeholder={t("imageUrlPlaceholder")}
                    onChange={(event) => replaceBlock({ ...block, url: event.target.value })}
                  />
                </Field>
                <Field
                  htmlFor={`${controlId}-alt`}
                  label={t("imageAlt")}
                  description={t("imageAltHelp")}
                  error={altError ? t("missingImageAlt") : undefined}
                >
                  <Textarea
                    data-emoji-target="true"
                    value={block.alt}
                    rows={2}
                    className="min-h-20"
                    onChange={(event) => replaceBlock({ ...block, alt: event.target.value })}
                  />
                </Field>
              </div>
            )}
            {block.type === "html" && (
              <HtmlBlockFields
                controlId={controlId}
                source={block.source}
                inputRef={codeControlRef(block.id)}
                hasExportError={errors.some(
                  (error) =>
                    error.code === "invalid_html" &&
                    error.path[0] === "customSections" &&
                    error.path[2] === "blocks" &&
                    error.path[3] === blockIndex &&
                    error.path[4] === "source",
                )}
                onChange={(source) => replaceBlock({ ...block, source })}
                onUseExample={(source) => {
                  if (block.source.trim() && !window.confirm(t("html.replaceConfirmation"))) return;
                  pendingFocus.current = {
                    kind: "block",
                    blockId: block.id,
                    selection: { start: source.length, end: source.length },
                  };
                  replaceBlock({ ...block, source });
                  setAnnouncement(t("html.exampleApplied"));
                }}
              />
            )}
            {block.type === "code" && (
              <CodeBlockFields
                controlId={controlId}
                value={block}
                inputRef={codeControlRef(block.id)}
                hasSourceError={errors.some(
                  (error) =>
                    error.code === "invalid_code" &&
                    error.path[0] === "customSections" &&
                    error.path[2] === "blocks" &&
                    error.path[3] === blockIndex &&
                    error.path[4] === "source",
                )}
                onChange={replaceBlock}
                onUseExample={(source) => {
                  if (block.source && !window.confirm(t("code.replaceConfirmation"))) return;
                  pendingFocus.current = {
                    kind: "block",
                    blockId: block.id,
                    selection: { start: source.length, end: source.length },
                  };
                  replaceBlock({ ...block, source, language: "json" });
                  setAnnouncement(t("code.exampleApplied"));
                }}
              />
            )}
            {block.type === "list" && (
              <div className="space-y-4">
                <p
                  id={`${controlId}-format-help`}
                  className="text-xs leading-5 text-muted-foreground"
                >
                  {t(block.style === "ordered" ? "orderedHelp" : "unorderedHelp")}
                </p>
                <p
                  id={`${controlId}-keyboard-help`}
                  className="text-xs leading-5 text-muted-foreground"
                >
                  {t("listHelp")}
                </p>
                {block.items.length === 0 && (
                  <p className="text-xs text-muted-foreground">{t("emptyList")}</p>
                )}
                {block.items.map((item, itemIndex) => (
                  <div key={item.id} className="flex min-w-0 items-end gap-2">
                    <Field
                      className="min-w-0 flex-1"
                      htmlFor={`${controlId}-item-${itemIndex}`}
                      label={t("item", { number: itemIndex + 1 })}
                    >
                      <Textarea
                        data-emoji-target="true"
                        ref={itemRef(block.id, item.id, itemIndex === 0)}
                        aria-describedby={`${controlId}-format-help ${controlId}-keyboard-help`}
                        value={item.text}
                        rows={1}
                        className="field-sizing-content min-h-11"
                        enterKeyHint="next"
                        onChange={(event) =>
                          replaceBlock({
                            ...block,
                            items: block.items.map((entry) =>
                              entry.id === item.id ? { ...entry, text: event.target.value } : entry,
                            ),
                          })
                        }
                        onCompositionStart={() => {
                          const items = composingItems.current.get(block.id) ?? new Set<string>();
                          items.add(item.id);
                          composingItems.current.set(block.id, items);
                        }}
                        onCompositionEnd={() =>
                          composingItems.current.get(block.id)?.delete(item.id)
                        }
                        onKeyDown={(event) => {
                          if (
                            event.key === "Enter" &&
                            !event.nativeEvent.isComposing &&
                            !composingItems.current.get(block.id)?.has(item.id)
                          ) {
                            event.preventDefault();
                            enterInList(block, itemIndex, event.currentTarget);
                          }
                        }}
                        onPaste={(event) => {
                          const text = event.clipboardData.getData("text/plain");
                          if (
                            /\r|\n/.test(text) &&
                            !composingItems.current.get(block.id)?.has(item.id)
                          ) {
                            event.preventDefault();
                            pasteListItems(block, itemIndex, event.currentTarget, text);
                          }
                        }}
                      />
                    </Field>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={t("removeItem", {
                        number: itemIndex + 1,
                        listNumber: blockIndex + 1,
                      })}
                      onClick={() => removeListItem(block, itemIndex)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  </div>
                ))}
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => addListItem(block)}
                    aria-label={t("addItemToList", { number: blockIndex + 1 })}
                  >
                    <Plus aria-hidden="true" />
                    {t("addItem")}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => convertToText(block)}
                    aria-label={t("convertList", { number: blockIndex + 1 })}
                  >
                    <AlignLeft aria-hidden="true" />
                    {t("convertToText")}
                  </Button>
                </div>
              </div>
            )}
            {block.type === "link" && (
              <div className="space-y-4">
                <Field
                  htmlFor={`${controlId}-label`}
                  label={t("linkText")}
                  description={t("linkTextHelp")}
                >
                  <Input
                    data-emoji-target="true"
                    ref={controlRef(block.id)}
                    value={block.label}
                    placeholder={t("linkTextPlaceholder")}
                    onChange={(event) => replaceBlock({ ...block, label: event.target.value })}
                  />
                </Field>
                <Field
                  htmlFor={`${controlId}-url`}
                  label={t("url")}
                  description={t("urlHelp")}
                  error={urlError ? t("invalidUrl") : undefined}
                >
                  <Input
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    spellCheck={false}
                    value={block.url}
                    placeholder={t("urlPlaceholder")}
                    onChange={(event) => replaceBlock({ ...block, url: event.target.value })}
                  />
                </Field>
              </div>
            )}
          </div>
        );
      })}
      <p role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

type HtmlBlockFieldsProps = {
  controlId: string;
  source: string;
  inputRef: (control: CodeEditorHandle | null) => void;
  hasExportError: boolean;
  onChange: (source: string) => void;
  onUseExample: (source: string) => void;
};

function HtmlBlockFields({
  controlId,
  source,
  inputRef,
  hasExportError,
  onChange,
  onUseExample,
}: HtmlBlockFieldsProps) {
  const t = useTranslations("EditorModules.custom");
  const analysis = analyzeProfileHtml(source);
  const hasProblems = analysis.errors.length > 0;
  const examples = ["centered", "table", "details"] as const;
  const describedBy = [
    `${controlId}-html-count`,
    hasProblems ? `${controlId}-html-problems` : undefined,
    analysis.notices.length > 0 ? `${controlId}-html-notices` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-w-0 space-y-4">
      <Field
        htmlFor={`${controlId}-source`}
        label={t("html.code")}
        description={t("html.help")}
        error={
          hasProblems
            ? t("html.invalid")
            : hasExportError
              ? t("html.documentLimit", { limit: PROFILE_HTML_MAX_DOCUMENT_LENGTH })
              : undefined
        }
      >
        <CodeEditor
          ref={inputRef}
          aria-label={t("html.code")}
          value={source}
          language="html"
          aria-describedby={describedBy}
          onChange={onChange}
        />
      </Field>
      <p id={`${controlId}-html-count`} className="text-xs leading-5 text-muted-foreground">
        {t("html.characterCount", { count: source.length, limit: PROFILE_HTML_MAX_LENGTH })}
      </p>
      {hasProblems && (
        <ul
          id={`${controlId}-html-problems`}
          aria-label={t("html.problems")}
          className="list-disc space-y-1 pl-5 text-xs leading-5 text-destructive"
        >
          {analysis.errors.map((problem, index) => (
            <li key={`${problem.code}-${index}`}>{t(`html.errors.${problem.code}`)}</li>
          ))}
        </ul>
      )}
      {analysis.notices.length > 0 && (
        <div className="space-y-2 rounded-md border border-border bg-surface-raised p-3">
          <p className="text-xs font-medium">{t("html.noticesTitle")}</p>
          <ul
            id={`${controlId}-html-notices`}
            aria-label={t("html.noticesTitle")}
            className="list-disc space-y-1 pl-5 text-xs leading-5 text-muted-foreground"
          >
            {analysis.notices.map((notice, index) => (
              <li key={`${notice.code}-${index}`}>{t(`html.notices.${notice.code}`)}</li>
            ))}
          </ul>
        </div>
      )}
      <details className="min-w-0 rounded-md border border-border p-3">
        <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
          {t("html.supported")}
        </summary>
        <div className="mt-3 min-w-0 space-y-3 text-xs leading-5 text-muted-foreground">
          <p>{t("html.formats")}</p>
          <p>{t("html.linksAndImages")}</p>
          <p>
            {t("html.limits", {
              length: PROFILE_HTML_MAX_LENGTH,
              nodes: PROFILE_HTML_MAX_NODES,
              depth: PROFILE_HTML_MAX_DEPTH,
              documentLength: PROFILE_HTML_MAX_DOCUMENT_LENGTH,
            })}
          </p>
          <details className="min-w-0 rounded-md border border-border bg-surface-raised p-3">
            <summary className="cursor-pointer rounded-sm font-medium text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
              {t("html.examplesTitle")}
            </summary>
            <div className="mt-3 min-w-0 space-y-5">
              <p>{t("html.examplesHelp")}</p>
              {examples.map((example, index) => {
                const title = t(`html.examples.${example}.title`);
                const exampleSource: string = t.raw(`html.examples.${example}.source`);
                const titleId = `${controlId}-html-example-${index}`;
                return (
                  <div
                    key={example}
                    role="group"
                    aria-labelledby={titleId}
                    className="min-w-0 space-y-2"
                  >
                    <h4 id={titleId} className="font-medium text-foreground">
                      {title}
                    </h4>
                    <pre
                      tabIndex={0}
                      role="group"
                      aria-label={t("html.exampleCode", { name: title })}
                      className="max-h-52 min-w-0 overflow-auto rounded-md border border-border bg-surface p-3 font-mono text-[11px] leading-5 wrap-anywhere whitespace-pre-wrap text-foreground focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
                    >
                      <code>{exampleSource}</code>
                    </pre>
                    <Button
                      variant="outline"
                      size="sm"
                      aria-label={t("html.useNamedExample", { name: title })}
                      className="max-w-full whitespace-normal"
                      onClick={() => onUseExample(exampleSource)}
                    >
                      {t("html.useExample")}
                    </Button>
                  </div>
                );
              })}
            </div>
          </details>
        </div>
      </details>
      {source.trim() && analysis.html && (
        <details className="min-w-0 rounded-md border border-border p-3">
          <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
            {t("html.exported")}
          </summary>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">{t("html.exportedHelp")}</p>
          <pre
            tabIndex={0}
            role="group"
            aria-label={t("html.exported")}
            className="mt-3 max-h-72 min-w-0 overflow-auto rounded-md bg-surface-raised p-3 font-mono text-xs leading-5 wrap-anywhere whitespace-pre-wrap focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none"
          >
            <code>{analysis.html}</code>
          </pre>
        </details>
      )}
    </div>
  );
}
