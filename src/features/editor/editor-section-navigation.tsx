"use client";

import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Accessibility, AutoScroller, Feedback, KeyboardSensor } from "@dnd-kit/dom";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { ArrowLeft, ArrowRight, CircleAlert, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import type { ProfileDocument } from "@/core/profile/profile-schema";
import type { ReadmeIssue } from "@/core/readme";
import { cn } from "@/lib/cn";
import {
  editableSectionIds,
  isSectionIncluded,
  sectionHasErrors,
  visibleEditableSections,
  type EditableSectionId,
} from "./module-composition";

type EditorSectionNavigationProps = {
  profile: ProfileDocument;
  activeId: EditableSectionId | null;
  errors: readonly ReadmeIssue[];
  disabled: boolean;
  labels: ReadonlyMap<string, string>;
  onSelect: (id: EditableSectionId) => void;
  onVisibility: (id: EditableSectionId, visible: boolean) => void;
  onMove: (id: EditableSectionId, direction: "up" | "down") => void;
  onReorder: (id: EditableSectionId, destinationIndex: number) => void;
  buttonRef: (id: EditableSectionId, node: HTMLButtonElement | null) => void;
  moveButtonRef: (
    id: EditableSectionId,
    direction: "up" | "down",
    node: HTMLButtonElement | null,
  ) => void;
  onReview: (id: EditableSectionId) => void;
  actions?: ReactNode;
};

function revealSection(
  row: HTMLUListElement | null,
  id: string | null,
  focusedControl?: HTMLElement,
) {
  if (!row || !id) return;
  const item = Array.from(row.children).find(
    (child): child is HTMLLIElement =>
      child instanceof HTMLLIElement &&
      child.dataset.moduleId === id &&
      !child.hasAttribute("data-dnd-dragging"),
  );
  if (!item) return;
  const rowBounds = row.getBoundingClientRect();
  const itemBounds = item.getBoundingClientRect();
  const activeControl = row.ownerDocument.activeElement;
  const preferredControl =
    focusedControl && item.contains(focusedControl)
      ? focusedControl
      : activeControl instanceof HTMLElement && item.contains(activeControl)
        ? activeControl
        : item.querySelector<HTMLButtonElement>("[data-section-title]");
  // At enlarged text sizes a chip can be wider than its scrollport. Keep the
  // actual focused control visible instead of aligning the opposite chip edge.
  const bounds =
    itemBounds.width > row.clientWidth - 8 && preferredControl
      ? preferredControl.getBoundingClientRect()
      : itemBounds;
  const leftEdge = rowBounds.left + row.clientLeft + 4;
  const rightEdge = leftEdge + row.clientWidth - 8;
  const delta =
    bounds.left < leftEdge || bounds.width > rightEdge - leftEdge
      ? bounds.left - leftEdge
      : Math.max(0, bounds.right - rightEdge);
  if (delta !== 0) {
    row.scrollTo({ left: row.scrollLeft + delta, top: row.scrollTop, behavior: "instant" });
  }
}

export function EditorSectionNavigation(props: EditorSectionNavigationProps) {
  const { profile, activeId, disabled, onReorder, actions } = props;
  const t = useTranslations("EditorNavigation");
  const helpId = useId();
  const rowRef = useRef<HTMLUListElement>(null);
  const draggedIdRef = useRef<EditableSectionId | null>(null);
  const reorderedIdRef = useRef<EditableSectionId | null>(null);
  const keyboardMoveSequenceRef = useRef(0);
  const pointerFocusRef = useRef(false);
  const pointerCleanupRef = useRef<(() => void) | null>(null);
  const visibleIds = visibleEditableSections(profile);
  const total = visibleIds.length;
  const [projectedIds, setProjectedIds] = useState<EditableSectionId[] | null>(null);
  const projectedIdsRef = useRef<EditableSectionId[] | null>(null);
  const orderedIds = [
    ...(projectedIds ?? visibleIds),
    ...editableSectionIds(profile).filter((id) => !isSectionIncluded(profile, id)),
  ];
  const orderSignature = JSON.stringify(orderedIds);
  const isDragging = projectedIds !== null;
  const announcementContext = useRef({ t, labels: props.labels, total });
  const activeIndex = activeId ? visibleIds.indexOf(activeId) : -1;
  const activeLabel = activeId ? (props.labels.get(activeId) ?? "") : "";

  useEffect(() => () => pointerCleanupRef.current?.(), []);

  useEffect(() => {
    if (draggedIdRef.current) return;
    const row = rowRef.current;
    const focusedControl = row?.ownerDocument.activeElement;
    const focusedItem =
      focusedControl instanceof HTMLElement
        ? focusedControl.closest<HTMLLIElement>("li[data-module-id]")
        : null;
    if (row && focusedItem && row.contains(focusedItem)) {
      revealSection(row, focusedItem.dataset.moduleId ?? null, focusedControl as HTMLElement);
    } else {
      revealSection(row, reorderedIdRef.current ?? activeId);
    }
    reorderedIdRef.current = null;
  }, [activeId, orderSignature, isDragging]);

  useEffect(() => {
    announcementContext.current = { t, labels: props.labels, total };
  }, [t, props.labels, total]);

  // Plugins keep their first options. Stable callbacks read the latest committed
  // labels and section count instead of capturing the empty hydration document.
  const accessibility = useMemo(() => {
    function moduleLabel(id: string | number | undefined) {
      return typeof id === "string" ? (announcementContext.current.labels.get(id) ?? null) : null;
    }
    const options = {
      screenReaderInstructions: { draggable: t("dragInstructions") },
      announcements: {
        dragstart({ operation: { source } }) {
          const label = moduleLabel(source?.id);
          if (!label || !isSortable(source)) return;
          const context = announcementContext.current;
          return context.t("announcements.pickedUp", {
            module: label,
            position: source.initialIndex + 1,
            total: context.total,
          });
        },
        dragover({ operation: { source, target } }) {
          if (!target || source?.id === target.id) return;
          const label = moduleLabel(source?.id);
          if (!label || !isSortable(source)) return;
          const context = announcementContext.current;
          const index = isSortable(target) ? target.index : source.index;
          return context.t("announcements.moved", {
            module: label,
            position: index + 1,
            total: context.total,
          });
        },
        dragend({ operation: { source, target }, canceled }) {
          const label = moduleLabel(source?.id);
          if (!label || !isSortable(source)) return;
          const context = announcementContext.current;
          return canceled || !target
            ? context.t("announcements.canceled", { module: label })
            : context.t("announcements.dropped", {
                module: label,
                position: source.index + 1,
                total: context.total,
              });
        },
      },
    } satisfies NonNullable<ConstructorParameters<typeof Accessibility>[1]>;
    return { plugin: Accessibility, options };
  }, [t]);

  return (
    <nav
      aria-label={t("title")}
      aria-describedby={helpId}
      className="@container/sections min-w-0 space-y-1"
    >
      <DragDropProvider
        plugins={(defaults) => [
          ...defaults.filter(
            (plugin) => plugin !== Accessibility && plugin !== AutoScroller && plugin !== Feedback,
          ),
          accessibility,
          AutoScroller.configure({ threshold: { x: 0.2, y: 0 } }),
          Feedback.configure({ dropAnimation: null }),
        ]}
        sensors={(defaults) => [
          ...defaults.filter((sensor) => sensor !== KeyboardSensor),
          KeyboardSensor.configure({
            keyboardCodes: { ...KeyboardSensor.defaults.keyboardCodes, up: [], down: [] },
          }),
        ]}
        onDragStart={({ operation: { source }, nativeEvent }, manager) => {
          keyboardMoveSequenceRef.current += 1;
          draggedIdRef.current = visibleIds.find((id) => id === source?.id) ?? null;
          const projection = [...visibleIds];
          projectedIdsRef.current = projection;
          setProjectedIds(projection);
          if (nativeEvent instanceof KeyboardEvent && draggedIdRef.current)
            void manager.actions.setDropTarget(draggedIdRef.current);
        }}
        onCollision={(event, manager) => {
          if (manager.dragOperation.activatorEvent instanceof KeyboardEvent) event.preventDefault();
        }}
        onDragMove={(event, manager) => {
          const { nativeEvent, by } = event;
          if (!(nativeEvent instanceof KeyboardEvent) || !by?.x) return;
          // Geometry changes while the row scrolls. Choose exactly one neighbor
          // by document order instead of letting the keyboard plugin guess it.
          event.preventDefault();
          const projection = projectedIdsRef.current;
          const sourceId = draggedIdRef.current;
          if (!projection || !sourceId) return;
          const nextIndex = projection.indexOf(sourceId) + (by.x > 0 ? 1 : -1);
          const targetId = projection[nextIndex];
          if (!targetId) return;
          const sequence = ++keyboardMoveSequenceRef.current;
          // Reset synchronously: opposite keys can arrive before React commits.
          void manager.actions.setDropTarget(sourceId);
          void manager.actions.setDropTarget(targetId).then(() => {
            if (sequence !== keyboardMoveSequenceRef.current) return;
            const { source, shape, status } = manager.dragOperation;
            if (!status.dragging || !isSortable(source) || source.id !== sourceId || !shape) return;
            revealSection(rowRef.current, sourceId);
            const targetElement = source.sortable.element;
            if (!targetElement) return;
            const bounds = targetElement.getBoundingClientRect();
            manager.actions.move({
              by: {
                x: bounds.left - shape.current.boundingRectangle.left,
                y: bounds.top - shape.current.boundingRectangle.top,
              },
              propagate: false,
            });
            // The next arrow, including a reversal, must target a fresh neighbor.
            void manager.actions.setDropTarget(sourceId);
          });
        }}
        onDragOver={({ operation: { source, target } }) => {
          if (disabled || !source || !target || source.id === target.id) return;
          const projection = projectedIdsRef.current;
          if (!projection) return;
          const sourceIndex = projection.findIndex((id) => id === source.id);
          const targetIndex = projection.findIndex((id) => id === target.id);
          if (sourceIndex < 0 || targetIndex < 0) return;
          const next = [...projection];
          const [moved] = next.splice(sourceIndex, 1);
          if (!moved) return;
          next.splice(targetIndex, 0, moved);
          projectedIdsRef.current = next;
          setProjectedIds(next);
        }}
        onDragEnd={(event, manager) => {
          const sequence = ++keyboardMoveSequenceRef.current;
          const { source, target } = event.operation;
          const restoreHandle = source?.handle;
          const restoreId = draggedIdRef.current;
          if (
            manager.dragOperation.activatorEvent instanceof KeyboardEvent &&
            restoreHandle instanceof HTMLElement
          ) {
            // The default drop animation restores focus without preventScroll.
            // Restore it after cleanup, preserving the editor's vertical position.
            void manager.renderer.rendering.then(() => {
              requestAnimationFrame(() => {
                if (sequence !== keyboardMoveSequenceRef.current || !restoreHandle.isConnected)
                  return;
                const document = restoreHandle.ownerDocument;
                const focused = document.activeElement;
                if (
                  focused &&
                  focused !== document.body &&
                  focused !== document.documentElement &&
                  focused !== restoreHandle
                )
                  return;
                restoreHandle.focus({ preventScroll: true });
                revealSection(rowRef.current, restoreId, restoreHandle);
              });
            });
          }
          const projection = projectedIdsRef.current;
          reorderedIdRef.current = draggedIdRef.current;
          draggedIdRef.current = null;
          projectedIdsRef.current = null;
          setProjectedIds(null);
          if (disabled || event.canceled || !target || !isSortable(source)) return;
          const id = visibleIds.find((candidate) => candidate === source.id);
          const destinationIndex = id ? (projection?.indexOf(id) ?? -1) : -1;
          if (
            id &&
            visibleIds.indexOf(id) !== destinationIndex &&
            destinationIndex >= 0 &&
            destinationIndex < total
          ) {
            onReorder(id, destinationIndex);
          }
        }}
      >
        <ul
          ref={rowRef}
          data-section-row
          className="flex min-w-0 flex-nowrap items-stretch gap-2 overflow-x-auto overscroll-x-contain p-1"
          onPointerDownCapture={() => {
            pointerCleanupRef.current?.();
            pointerFocusRef.current = true;
            const reset = () => {
              pointerFocusRef.current = false;
              window.removeEventListener("pointerup", reset, true);
              window.removeEventListener("pointercancel", reset, true);
              window.removeEventListener("blur", reset);
              pointerCleanupRef.current = null;
            };
            pointerCleanupRef.current = reset;
            window.addEventListener("pointerup", reset, true);
            window.addEventListener("pointercancel", reset, true);
            window.addEventListener("blur", reset);
          }}
          onFocusCapture={(event) => {
            if (pointerFocusRef.current) return;
            const id = (event.target as HTMLElement).closest<HTMLLIElement>("li[data-module-id]")
              ?.dataset.moduleId;
            if (id) revealSection(rowRef.current, id, event.target as HTMLElement);
          }}
        >
          {orderedIds.map((id, index) => (
            <SectionNavigationItem
              key={id}
              {...props}
              id={id}
              index={index}
              included={isSectionIncluded(profile, id)}
              active={activeId === id}
            />
          ))}
        </ul>
      </DragDropProvider>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-x-2 gap-y-1">
        <div key={activeId ?? "none"} className="flex shrink-0 items-center gap-1">
          <Button
            ref={(node) => {
              if (activeId) props.moveButtonRef(activeId, "up", node);
            }}
            variant="ghost"
            size="icon"
            disabled={disabled || activeIndex <= 0 || projectedIds !== null}
            aria-label={activeId ? t("moveLeft", { module: activeLabel }) : t("moveSelectedLeft")}
            title={activeId ? t("moveLeft", { module: activeLabel }) : t("moveSelectedLeft")}
            onClick={() => {
              if (activeId) props.onMove(activeId, "up");
            }}
          >
            <ArrowLeft aria-hidden="true" />
          </Button>
          <Button
            ref={(node) => {
              if (activeId) props.moveButtonRef(activeId, "down", node);
            }}
            variant="ghost"
            size="icon"
            disabled={
              disabled || activeIndex < 0 || activeIndex === total - 1 || projectedIds !== null
            }
            aria-label={activeId ? t("moveRight", { module: activeLabel }) : t("moveSelectedRight")}
            title={activeId ? t("moveRight", { module: activeLabel }) : t("moveSelectedRight")}
            onClick={() => {
              if (activeId) props.onMove(activeId, "down");
            }}
          >
            <ArrowRight aria-hidden="true" />
          </Button>
        </div>
        {actions}
      </div>
      <p id={helpId} className="sr-only">
        {t("help")} {t("count", { total })}
      </p>
    </nav>
  );
}

type SectionNavigationItemProps = EditorSectionNavigationProps & {
  id: EditableSectionId;
  index: number;
  included: boolean;
  active: boolean;
};

function SectionNavigationItem({
  id,
  index,
  included,
  active,
  errors,
  disabled,
  onSelect,
  onVisibility,
  buttonRef,
  onReview,
  profile,
  labels,
}: SectionNavigationItemProps) {
  const t = useTranslations("EditorNavigation");
  const composition = useTranslations("Editor.composition");
  const label = labels.get(id) ?? "";
  const { ref, handleRef, isDragSource } = useSortable({
    id,
    index,
    group: "readme-sections",
    disabled: disabled || !included,
    // React owns the temporary projection so canceling also restores visual order.
    plugins: [SortableKeyboardPlugin],
    transition: null,
  });
  const hasErrors = sectionHasErrors(profile, id, errors);
  const stateDescriptionId = useId();
  return (
    <li
      ref={ref}
      data-module-id={id}
      className={cn(
        "relative flex shrink-0 items-center rounded-md border bg-surface p-1 transition-colors motion-reduce:transition-none",
        active ? "border-accent/60 bg-accent-soft/40" : "border-border",
        isDragSource && "z-10 shadow-soft ring-2 ring-accent",
      )}
    >
      <Checkbox
        checked={included}
        disabled={disabled}
        aria-label={label}
        onCheckedChange={(checked) => onVisibility(id, checked === true)}
      />
      <button
        ref={(node) => buttonRef(id, node)}
        data-section-title
        type="button"
        aria-label={included ? label : t("addAndEdit", { module: label })}
        aria-current={active ? "step" : undefined}
        aria-describedby={stateDescriptionId}
        title={label}
        disabled={disabled}
        onClick={() => onSelect(id)}
        className={cn(
          "block min-h-11 max-w-[min(7rem,60cqi)] min-w-11 rounded-sm px-2 py-2 text-left text-sm leading-5 focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:opacity-45 sm:max-w-[min(11rem,60cqi)]",
          active ? "font-semibold underline underline-offset-4" : "font-medium",
          !included && "text-muted-foreground",
        )}
      >
        <span className="block truncate">{label}</span>
      </button>
      <span id={stateDescriptionId} className="sr-only">
        {active ? t("editing") : included ? t("included") : t("available")}
      </span>
      {/* Keep the handle mounted: otherwise the drag library makes the whole item a button. */}
      <Button
        ref={handleRef}
        variant="ghost"
        size="icon"
        disabled={disabled || !included}
        aria-label={t("dragHandle", { module: label })}
        aria-roledescription={t("draggableRole")}
        className="shrink-0 cursor-grab touch-none active:cursor-grabbing"
      >
        <GripVertical aria-hidden="true" />
      </Button>
      {hasErrors && (
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0 text-destructive"
          disabled={disabled}
          aria-label={composition("reviewNamed", { module: label })}
          title={composition("reviewNamed", { module: label })}
          onClick={() => onReview(id)}
        >
          <CircleAlert aria-hidden="true" />
        </Button>
      )}
    </li>
  );
}
