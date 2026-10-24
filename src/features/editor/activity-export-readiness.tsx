import { ArrowUpRight, Check, CircleAlert, LoaderCircle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import type { ActivityExportCheckState } from "./use-activity-export-check";

export function ActivityExportReadiness({
  state,
  firstSource,
  disabled,
  onCheck,
  onExclude,
}: {
  state: ActivityExportCheckState;
  firstSource: string;
  disabled: boolean;
  onCheck: () => void;
  onExclude: () => void;
}) {
  const t = useTranslations("Editor.export.cards");
  const checking = state.status === "checking";
  const message =
    state.status === "failed"
      ? t(`errors.${state.reason}`)
      : state.status === "ready"
        ? t(state.stale ? "stale" : "ready")
        : checking
          ? t("checking")
          : t("idle");
  return (
    <div
      className={cn(
        "min-w-0 space-y-3 rounded-md border border-border bg-surface-raised/50 p-4",
        state.status === "failed" && "border-warning/30 bg-warning-soft",
      )}
    >
      <p className="text-sm font-semibold">{t("title")}</p>
      <p className="text-xs leading-5 text-muted-foreground">{t("help")}</p>
      <p
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="flex items-start gap-2 text-sm leading-6"
      >
        {state.status === "failed" && (
          <CircleAlert aria-hidden="true" className="mt-1 size-4 shrink-0 text-warning" />
        )}
        {state.status === "ready" && (
          <Check aria-hidden="true" className="mt-1 size-4 shrink-0 text-accent" />
        )}
        <span>{message}</span>
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || checking}
          onClick={onCheck}
          className="max-w-full whitespace-normal"
        >
          {checking && (
            <LoaderCircle aria-hidden="true" className="animate-spin motion-reduce:animate-none" />
          )}
          {t(checking ? "checking" : state.status === "ready" ? "checkAgain" : "check")}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={onExclude}
          className="max-w-full text-left whitespace-normal"
        >
          {t("exclude")}
        </Button>
      </div>
      {state.status === "failed" && (
        <a
          href={firstSource}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 max-w-full items-center gap-1 text-xs text-accent underline underline-offset-4"
        >
          {t("openImage")}
          <ArrowUpRight aria-hidden="true" className="size-3.5 shrink-0" />
        </a>
      )}
    </div>
  );
}
