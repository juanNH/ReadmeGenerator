"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import { useTheme } from "next-themes";
import { Smile } from "lucide-react";
import { Button } from "@/components/ui/button";

type EmojiTarget = HTMLInputElement | HTMLTextAreaElement;

function PickerLoading() {
  const t = useTranslations("Editor");
  return (
    <div className="p-4 text-sm text-muted-foreground" role="status" aria-live="polite">
      {t("emoji.loading")}
    </div>
  );
}

const EmojiPicker = dynamic(() => import("emoji-picker-react"), {
  ssr: false,
  loading: PickerLoading,
});

const loadSpanishEmojiData = () => import("emoji-picker-react/data/emojis-es");

function getEmojiTarget(target: EventTarget | null): EmojiTarget | null {
  if (target instanceof HTMLInputElement) {
    return target.type === "text" && target.dataset.emojiTarget === "true" ? target : null;
  }
  return target instanceof HTMLTextAreaElement && target.dataset.emojiTarget === "true"
    ? target
    : null;
}

function isTextControl(target: EventTarget | null): target is EmojiTarget | HTMLSelectElement {
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function setNativeValue(target: EmojiTarget, value: string) {
  const prototype =
    target instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(prototype, "value")?.set;
  if (setter) setter.call(target, value);
  else target.value = value;
}

export function EmojiInserter() {
  const t = useTranslations("Editor");
  const locale = useLocale();
  const { resolvedTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [feedback, setFeedback] = useState("");
  const dockRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const targetRef = useRef<EmojiTarget | null>(null);
  const selectionRef = useRef({ start: 0, end: 0 });

  useEffect(() => {
    function rememberSelection(target: EventTarget | null) {
      if (target !== targetRef.current) return;
      const control = targetRef.current;
      if (!control) return;
      const start = control.selectionStart;
      const end = control.selectionEnd;
      if (start !== null && end !== null) selectionRef.current = { start, end };
    }

    function handleFocusIn(event: FocusEvent) {
      const element = event.target;
      if (element instanceof HTMLElement && element.closest("[data-emoji-picker-root]")) return;
      if (!isTextControl(element)) return;
      targetRef.current = getEmojiTarget(element);
      rememberSelection(element);
    }

    function handleSelectionChange(event: Event) {
      rememberSelection(event.target);
    }

    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleSelectionChange, true);
    document.addEventListener("keyup", handleSelectionChange, true);
    document.addEventListener("pointerup", handleSelectionChange, true);
    document.addEventListener("select", handleSelectionChange, true);
    document.addEventListener("input", handleSelectionChange, true);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleSelectionChange, true);
      document.removeEventListener("keyup", handleSelectionChange, true);
      document.removeEventListener("pointerup", handleSelectionChange, true);
      document.removeEventListener("select", handleSelectionChange, true);
      document.removeEventListener("input", handleSelectionChange, true);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof Node && !dockRef.current?.contains(event.target)) setOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      setOpen(false);
      triggerRef.current?.focus();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!feedback) return;
    const timer = window.setTimeout(() => setFeedback(""), 2200);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function insertEmoji(emoji: string) {
    const target = targetRef.current;
    if (!target || !target.isConnected || target.disabled || target.readOnly) return false;

    const from = Math.max(0, Math.min(selectionRef.current.start, target.value.length));
    const to = Math.max(from, Math.min(selectionRef.current.end, target.value.length));
    const nextValue = `${target.value.slice(0, from)}${emoji}${target.value.slice(to)}`;
    const caret = from + emoji.length;

    setNativeValue(target, nextValue);
    target.focus({ preventScroll: true });
    target.setSelectionRange(caret, caret);
    target.dispatchEvent(new Event("input", { bubbles: true }));
    target.setSelectionRange(caret, caret);
    selectionRef.current = { start: caret, end: caret };
    return true;
  }

  async function handleEmojiClick(emoji: string) {
    if (insertEmoji(emoji)) {
      setFeedback(t("emoji.inserted"));
    } else {
      try {
        await navigator.clipboard.writeText(emoji);
        setFeedback(t("emoji.copied"));
      } catch {
        setFeedback(t("emoji.copyFailed"));
      }
      triggerRef.current?.focus();
    }
    setOpen(false);
  }

  return (
    <div ref={dockRef} className="desktop-emoji-inserter" data-emoji-picker-root>
      {feedback && (
        <p className="desktop-emoji-inserter__feedback" role="status" aria-live="polite">
          {feedback}
        </p>
      )}
      <p id="desktop-emoji-inserter-help" className="desktop-emoji-inserter__hint">
        {t("emoji.help")}
      </p>
      {open && (
        <div
          id="profile-emoji-picker-panel"
          className="desktop-emoji-inserter__panel"
          role="dialog"
          aria-label={t("emoji.title")}
        >
          <EmojiPicker
            className="profile-emoji-picker"
            colorScheme={resolvedTheme === "dark" ? "dark" : "light"}
            emojiData={locale === "es" ? loadSpanishEmojiData : undefined}
            labels={{
              searchPlaceholder: t("emoji.searchPlaceholder"),
              searchLabel: t("emoji.searchLabel"),
              searchClear: t("emoji.searchClear"),
              searchResultsNone: t("emoji.searchResultsNone"),
              searchResultsOne: t("emoji.searchResultsOne"),
              searchResultsMany: t("emoji.searchResultsMany"),
              categoryNavigation: t("emoji.categoryNavigation"),
              reactions: t("emoji.reactions"),
              expandReactions: t("emoji.expandReactions"),
              loading: t("emoji.loading"),
              loadingError: t("emoji.loadingError"),
              retryLoading: t("emoji.retryLoading"),
              skinToneNeutral: t("emoji.skinToneNeutral"),
              skinToneLight: t("emoji.skinToneLight"),
              skinToneMediumLight: t("emoji.skinToneMediumLight"),
              skinToneMedium: t("emoji.skinToneMedium"),
              skinToneMediumDark: t("emoji.skinToneMediumDark"),
              skinToneDark: t("emoji.skinToneDark"),
            }}
            width="min(22rem, calc(100vw - 2rem))"
            height="min(34rem, calc(100dvh - var(--editor-toolbar-offset) - 7rem))"
            previewConfig={{ showPreview: false }}
            onEmojiClick={(data) => void handleEmojiClick(data.emoji)}
          />
        </div>
      )}
      <Button
        ref={triggerRef}
        type="button"
        variant="primary"
        className="desktop-emoji-inserter__trigger"
        aria-label={t("emoji.open")}
        aria-describedby="desktop-emoji-inserter-help"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls="profile-emoji-picker-panel"
        title={t("emoji.open")}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => {
          setFeedback("");
          setOpen((value) => !value);
        }}
      >
        <Smile aria-hidden="true" />
        {t("emoji.open")}
      </Button>
    </div>
  );
}
