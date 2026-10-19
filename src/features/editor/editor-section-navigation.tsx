"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Accessibility } from "@dnd-kit/dom";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { DragDropProvider } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { ArrowDown, ArrowUp, CircleAlert, GripVertical } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { moduleRegistry } from "@/core/modules/module-registry";
import type { ProfileDocument } from "@/core/profile/profile-schema";
import type { ReadmeIssue } from "@/core/readme";
import { cn } from "@/lib/cn";
import {
  editableModuleIds,
  isModuleIncluded,
  visibleEditableModules,
  type EditableModuleId,
} from "./module-composition";

type EditorSectionNavigationProps = {
  profile: ProfileDocument;
  activeId: EditableModuleId | null;
  errors: readonly ReadmeIssue[];
  disabled: boolean;
  onSelect: (id: EditableModuleId) => void;
  onVisibility: (id: EditableModuleId, visible: boolean) => void;
  onMove: (id: EditableModuleId, direction: "up" | "down") => void;
  onReorder: (id: EditableModuleId, destinationIndex: number) => void;
  buttonRef: (id: EditableModuleId, node: HTMLButtonElement | null) => void;
  moveButtonRef: (
    id: EditableModuleId,
    direction: "up" | "down",
    node: HTMLButtonElement | null,
  ) => void;
  onReview: (id: EditableModuleId) => void;
};

export function EditorSectionNavigation(props: EditorSectionNavigationProps) {
  const { profile, activeId, disabled, onReorder } = props;
  const t = useTranslations("EditorNavigation");
  const moduleLabels = useTranslations("Modules");
  const titleId = useId();
  const helpId = useId();
  const visibleIds = visibleEditableModules(profile);
  const total = visibleIds.length;
  const [projectedIds, setProjectedIds] = useState<EditableModuleId[] | null>(null);
  const projectedIdsRef = useRef<EditableModuleId[] | null>(null);
  const orderedIds = [
    ...(projectedIds ?? visibleIds),
    ...editableModuleIds.filter((id) => !isModuleIncluded(profile, id)),
  ];
  const announcementContext = useRef({ t, moduleLabels, total });

  useEffect(() => {
    announcementContext.current = { t, moduleLabels, total };
  }, [t, moduleLabels, total]);

  // Plugins keep their first options. Stable callbacks read the latest committed
  // labels and section count instead of capturing the empty hydration document.
  const accessibility = useMemo(() => {
    function moduleLabel(id: string | number | undefined) {
      const moduleId = editableModuleIds.find((candidate) => candidate === id);
      return moduleId
        ? announcementContext.current.moduleLabels(moduleRegistry[moduleId].labelKey)
        : null;
    }

    const options = {
      screenReaderInstructions: {
        draggable: t("dragInstructions"),
      },
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
    <Card>
      <CardHeader className="gap-2 p-4">
        <CardTitle id={titleId}>{t("title")}</CardTitle>
        <CardDescription className="text-xs leading-5">{t("description")}</CardDescription>
        <p className="text-xs font-medium text-muted-foreground">{t("count", { total })}</p>
      </CardHeader>
      <CardContent className="px-3 pb-4 sm:px-3 sm:pb-4">
        <nav aria-labelledby={titleId} aria-describedby={helpId}>
          <DragDropProvider
            plugins={(defaults) => [
              ...defaults.filter((plugin) => plugin !== Accessibility),
              accessibility,
            ]}
            onDragStart={() => {
              const projection = [...visibleIds];
              projectedIdsRef.current = projection;
              setProjectedIds(projection);
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
            onDragEnd={(event) => {
              const { source, target } = event.operation;
              const projection = projectedIdsRef.current;
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
            <ul className="space-y-2">
              {orderedIds.map((id, index) => (
                <SectionNavigationItem
                  key={id}
                  {...props}
                  id={id}
                  index={index}
                  total={total}
                  included={isModuleIncluded(profile, id)}
                  active={activeId === id}
                />
              ))}
            </ul>
          </DragDropProvider>
          <p id={helpId} className="mt-4 px-1 text-xs leading-5 text-muted-foreground">
            {t("help")}
          </p>
        </nav>
      </CardContent>
    </Card>
  );
}

type SectionNavigationItemProps = EditorSectionNavigationProps & {
  id: EditableModuleId;
  index: number;
  total: number;
  included: boolean;
  active: boolean;
};

function SectionNavigationItem({
  id,
  index,
  total,
  included,
  active,
  errors,
  disabled,
  onSelect,
  onVisibility,
  onMove,
  buttonRef,
  moveButtonRef,
  onReview,
}: SectionNavigationItemProps) {
  const t = useTranslations("EditorNavigation");
  const composition = useTranslations("Editor.composition");
  const moduleLabels = useTranslations("Modules");
  const label = moduleLabels(moduleRegistry[id].labelKey);
  const { ref, handleRef, isDragSource } = useSortable({
    id,
    index,
    group: "readme-sections",
    disabled: disabled || !included,
    // React owns the temporary projection so canceling also restores visual order.
    plugins: [SortableKeyboardPlugin],
    transition: null,
  });
  const hasErrors = errors.some(
    (error) =>
      error.path[0] === "data" &&
      (error.path[1] === id || (id === "contributions" && error.path[1] === "metrics")),
  );

  return (
    <li
      ref={ref}
      data-module-id={id}
      className={cn(
        "min-w-0 rounded-md border bg-surface p-1 transition-colors motion-reduce:transition-none",
        active ? "border-accent/60 bg-accent-soft/40" : "border-border",
        isDragSource && "relative z-10 shadow-soft ring-2 ring-accent",
      )}
    >
      <div className="grid min-w-0 grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center">
        <Checkbox
          checked={included}
          disabled={disabled}
          aria-label={label}
          onCheckedChange={(checked) => onVisibility(id, checked === true)}
        />
        <button
          ref={(node) => buttonRef(id, node)}
          type="button"
          aria-label={included ? label : t("addAndEdit", { module: label })}
          aria-current={active ? "step" : undefined}
          disabled={disabled}
          onClick={() => onSelect(id)}
          className={cn(
            "flex min-h-11 min-w-0 flex-col justify-center rounded-sm px-1 py-2 text-left focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:opacity-45",
            !included && "col-span-2",
          )}
        >
          <span className="flex min-w-0 items-start gap-2 text-sm leading-5 font-medium">
            {included && (
              <span aria-hidden="true" className="shrink-0 text-xs leading-5 text-muted-foreground">
                {index + 1}.
              </span>
            )}
            <span className="min-w-0 break-words">{label}</span>
          </span>
          <span
            aria-hidden="true"
            className={cn(
              "mt-1 text-[11px] leading-4",
              active ? "font-medium text-accent" : "text-muted-foreground",
            )}
          >
            {active ? t("editing") : included ? t("included") : t("available")}
          </span>
        </button>
        <Button
          ref={handleRef}
          variant="ghost"
          size="icon"
          hidden={!included}
          disabled={disabled || !included}
          aria-label={t("dragHandle", { module: label })}
          aria-roledescription={t("draggableRole")}
          className={cn("cursor-grab touch-none active:cursor-grabbing", !included && "hidden")}
        >
          <GripVertical aria-hidden="true" />
        </Button>
      </div>
      {included && (
        <div className="flex min-w-0 flex-wrap items-center gap-x-1 pl-11">
          <Button
            ref={(node) => moveButtonRef(id, "up", node)}
            variant="ghost"
            size="icon"
            disabled={disabled || index === 0}
            aria-label={composition("moveUp", { module: label })}
            onClick={() => onMove(id, "up")}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            ref={(node) => moveButtonRef(id, "down", node)}
            variant="ghost"
            size="icon"
            disabled={disabled || index === total - 1}
            aria-label={composition("moveDown", { module: label })}
            onClick={() => onMove(id, "down")}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          {hasErrors && (
            <Button
              variant="ghost"
              size="sm"
              className="max-w-full gap-1.5 px-2 text-destructive"
              disabled={disabled}
              aria-label={composition("reviewNamed", { module: label })}
              onClick={() => onReview(id)}
            >
              <CircleAlert aria-hidden="true" />
              <span className="min-w-0 break-words">{composition("review")}</span>
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
