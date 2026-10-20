import { useId, type Ref } from "react";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type AddBlockKind =
  "paragraph" | "unordered" | "ordered" | "link" | "heading" | "divider" | "quote" | "image";

const options = [
  { kind: "paragraph", label: "addText", description: "pickerTextHelp" },
  { kind: "unordered", label: "addBulletList", description: "pickerBulletHelp" },
  { kind: "ordered", label: "addNumberedList", description: "pickerNumberedHelp" },
  { kind: "link", label: "addLink", description: "pickerLinkHelp" },
  { kind: "heading", label: "addSubtitle", description: "pickerHeadingHelp" },
  { kind: "divider", label: "addDivider", description: "pickerDividerHelp" },
  { kind: "quote", label: "addQuote", description: "pickerQuoteHelp" },
  { kind: "image", label: "addImage", description: "pickerImageHelp" },
] as const;

type CustomBlockPickerProps = {
  addTextRef: Ref<HTMLButtonElement>;
  onAdd: (kind: AddBlockKind) => void;
};

export function CustomBlockPicker({ addTextRef, onAdd }: CustomBlockPickerProps) {
  const t = useTranslations("EditorModules.custom");
  const baseId = useId();
  return (
    <div className="grid min-w-0 grid-cols-2 gap-2" role="group" aria-label={t("addContent")}>
      {options.map((option, index) => (
        <Button
          key={option.kind}
          ref={option.kind === "paragraph" ? addTextRef : undefined}
          variant="outline"
          onClick={() => onAdd(option.kind)}
          aria-label={t(option.label)}
          aria-describedby={`${baseId}-description-${index}`}
          className="min-w-0 flex-col items-stretch justify-start gap-2 px-3 py-3 text-left"
        >
          <BlockSample kind={option.kind} />
          <span className="block min-w-0 text-xs leading-5 font-medium wrap-anywhere sm:text-sm">
            {t(option.label)}
          </span>
          <span id={`${baseId}-description-${index}`} className="sr-only">
            {t(option.description)}
          </span>
        </Button>
      ))}
    </div>
  );
}

function BlockSample({ kind }: { kind: AddBlockKind }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-10 min-w-0 items-center overflow-hidden rounded-sm bg-surface-raised/70 px-2 text-muted-foreground"
    >
      {kind === "paragraph" && (
        <span className="block w-full space-y-1.5">
          <span className="block h-1 w-4/5 rounded bg-border-strong/60" />
          <span className="block h-1 w-full rounded bg-border-strong/45" />
          <span className="block h-1 w-3/5 rounded bg-border-strong/45" />
        </span>
      )}
      {(kind === "unordered" || kind === "ordered") && (
        <span className="block w-full space-y-0.5">
          {[1, 2, 3].map((number) => (
            <span key={number} className="flex h-2.5 items-center gap-1.5">
              {kind === "ordered" ? (
                <svg
                  viewBox="0 0 10 12"
                  className="shrink-0"
                  style={{ width: "0.5rem", height: "0.625rem" }}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  focusable="false"
                >
                  <path
                    d={
                      number === 1
                        ? "M3 3 5 1v10M2 11h6"
                        : number === 2
                          ? "M2 3a3 3 0 0 1 6 0c0 2-1 3-3 5l-3 3h6"
                          : "M2 1h3a2.5 2.5 0 0 1 0 5H4m1 0a2.5 2.5 0 0 1 0 5H2"
                    }
                  />
                </svg>
              ) : (
                <span className="size-1 shrink-0 rounded-full bg-border-strong" />
              )}
              <span className="block h-1 w-4/5 rounded bg-border-strong/45" />
            </span>
          ))}
        </span>
      )}
      {kind === "link" && (
        <span className="flex w-full items-center gap-1.5 text-accent">
          <Link2 className="size-3.5 shrink-0" />
          <span className="block h-1.5 w-3/5 border-b border-accent bg-accent/30" />
        </span>
      )}
      {kind === "heading" && (
        <span className="block w-full space-y-2">
          <span className="block h-2 w-4/5 rounded bg-foreground/65" />
          <span className="block h-1 w-3/5 rounded bg-border-strong/40" />
        </span>
      )}
      {kind === "divider" && <span className="block w-full border-t-2 border-border-strong/65" />}
      {kind === "quote" && (
        <span className="block w-full space-y-1.5 border-l-2 border-accent py-1 pl-2">
          <span className="block h-1.5 w-4/5 rounded bg-border-strong/60" />
          <span className="block h-1 w-3/5 rounded bg-border-strong/45" />
        </span>
      )}
      {kind === "image" && (
        <svg
          viewBox="0 0 140 40"
          className="text-border-strong"
          style={{ width: "100%", height: "2rem" }}
          fill="none"
          focusable="false"
        >
          <rect
            x="1"
            y="1"
            width="138"
            height="38"
            rx="4"
            fill="currentColor"
            fillOpacity="0.1"
            stroke="currentColor"
            strokeOpacity="0.5"
          />
          <circle cx="112" cy="11" r="4" fill="currentColor" fillOpacity="0.6" />
          <path d="M8 33 38 12 65 31 87 19 125 33Z" fill="currentColor" fillOpacity="0.4" />
        </svg>
      )}
    </span>
  );
}
