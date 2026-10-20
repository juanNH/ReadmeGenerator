import { useId } from "react";
import { Link2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export type AddBlockKind =
  | "paragraph"
  | "unordered"
  | "ordered"
  | "link"
  | "heading"
  | "divider"
  | "quote"
  | "image"
  | "code"
  | "html";

const options = [
  { kind: "paragraph", label: "addText", description: "pickerTextHelp" },
  { kind: "unordered", label: "addBulletList", description: "pickerBulletHelp" },
  { kind: "ordered", label: "addNumberedList", description: "pickerNumberedHelp" },
  { kind: "link", label: "addLink", description: "pickerLinkHelp" },
  { kind: "heading", label: "addSubtitle", description: "pickerHeadingHelp" },
  { kind: "divider", label: "addDivider", description: "pickerDividerHelp" },
  { kind: "quote", label: "addQuote", description: "pickerQuoteHelp" },
  { kind: "image", label: "addImage", description: "pickerImageHelp" },
  { kind: "code", label: "addCode", description: "pickerCodeHelp" },
  { kind: "html", label: "addHtml", description: "pickerHtmlHelp" },
] as const;

type CustomBlockPickerProps = {
  onAdd: (kind: AddBlockKind) => void;
};

export function CustomBlockPicker({ onAdd }: CustomBlockPickerProps) {
  const t = useTranslations("EditorModules.custom");
  const baseId = useId();
  return (
    <div
      className="grid min-w-0 grid-cols-1 gap-2 @min-[22em]/configuration:grid-cols-2"
      role="group"
      aria-label={t("addContent")}
    >
      {options.map((option, index) => (
        <Button
          key={option.kind}
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
      {kind === "html" && (
        <svg
          viewBox="0 0 64 32"
          style={{ width: "100%", height: "2rem" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          <path d="m21 8-9 8 9 8m22-16 9 8-9 8M36 5l-8 22" />
        </svg>
      )}
      {kind === "code" && (
        <svg
          viewBox="0 0 140 32"
          style={{ width: "100%", height: "2rem" }}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          focusable="false"
        >
          <path d="M7 3H3v8h4m32-8h4v8h-4" className="text-accent" />
          <path
            d="M12 7h21M3 18h19m5-2h5m-5 4h5m8-4h38M3 28h25m6-2h5m-5 4h5m8-4h52"
            opacity="0.65"
          />
        </svg>
      )}
    </span>
  );
}
