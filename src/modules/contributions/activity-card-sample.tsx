import type { MetricCardId } from "@/core/profile/module-content";

const calendarCells = Array.from({ length: 60 }, (_, index) => index);
const barWidths = ["w-4/5", "w-3/5", "w-2/5", "w-1/3"] as const;

/** A decorative layout sketch. It contains no profile data or remote resources. */
export function ActivityCardSample({ card }: { card: MetricCardId }) {
  return (
    <span
      aria-hidden="true"
      className="flex h-24 min-w-0 flex-col gap-2 overflow-hidden rounded-md border border-border bg-surface p-3"
    >
      <span className="block h-1.5 w-2/3 shrink-0 rounded-sm bg-accent/55" />
      {card === "calendar" && <CalendarSample />}
      {card === "summary" && (
        <span className="grid flex-1 grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((index) => (
            <span
              key={index}
              className="flex flex-col justify-center gap-2 rounded-sm bg-surface-raised p-2"
            >
              <span className="h-2 w-2/3 rounded-sm bg-accent/45" />
              <span className="h-1 w-full rounded-sm bg-border-strong" />
            </span>
          ))}
        </span>
      )}
      {card === "languages" && <LanguageBars />}
      {card === "panorama" && (
        <span className="grid flex-1 grid-cols-2 gap-3">
          <CalendarSample />
          <LanguageBars />
        </span>
      )}
      {card === "monthly" && (
        <span className="flex flex-1 items-end gap-1.5 border-b border-border pb-1">
          {[
            "h-1/3",
            "h-2/3",
            "h-1/2",
            "h-full",
            "h-2/3",
            "h-1/3",
            "h-1/2",
            "h-4/5",
            "h-2/3",
            "h-1/2",
            "h-full",
            "h-2/3",
          ].map((height, index) => (
            <span key={index} className={`flex-1 rounded-t-sm bg-accent/55 ${height}`} />
          ))}
        </span>
      )}
      {card === "extended-stats" && (
        <span className="flex flex-1 flex-col justify-between gap-1.5">
          {[0, 1, 2, 3, 4].map((index) => (
            <span key={index} className="flex items-center gap-2">
              <span className="size-1.5 shrink-0 rounded-sm bg-accent/55" />
              <span className="h-1 w-2/3 rounded-sm bg-border-strong" />
              <span className="ml-auto h-1 w-1/6 rounded-sm bg-accent/35" />
            </span>
          ))}
        </span>
      )}
      {card === "extended-languages" && (
        <span className="flex flex-1 items-center gap-4">
          <span className="size-12 shrink-0 rounded-full border-8 border-accent/50 border-t-border-strong border-r-accent/25" />
          <span className="flex flex-1 flex-col gap-2">
            {barWidths.map((width) => (
              <span key={width} className={`h-1 rounded-sm bg-border-strong ${width}`} />
            ))}
          </span>
        </span>
      )}
      {card === "extended-repository" && (
        <span className="flex flex-1 flex-col gap-2">
          <span className="h-1 w-full rounded-sm bg-border-strong" />
          <span className="h-1 w-3/4 rounded-sm bg-border-strong" />
          <span className="mt-auto flex gap-4">
            {[0, 1, 2].map((index) => (
              <span key={index} className="h-1.5 w-1/5 rounded-sm bg-accent/35" />
            ))}
          </span>
        </span>
      )}
      {card === "extended-gist" && (
        <span className="flex flex-1 flex-col justify-between gap-1.5 border-l-2 border-accent/35 pl-3">
          {["w-3/4", "w-1/2", "w-2/3", "w-1/3"].map((width) => (
            <span key={width} className={`h-1 rounded-sm bg-border-strong ${width}`} />
          ))}
        </span>
      )}
      {card === "extended-wakatime" && (
        <span className="flex flex-1 flex-col gap-2">
          <span className="flex h-3 overflow-hidden rounded-sm">
            <span className="w-1/2 bg-accent/65" />
            <span className="w-1/3 bg-accent/40" />
            <span className="flex-1 bg-border-strong" />
          </span>
          <LanguageBars />
        </span>
      )}
    </span>
  );
}

function CalendarSample() {
  return (
    <span className="grid flex-1 grid-cols-12 gap-1">
      {calendarCells.map((index) => (
        <span
          key={index}
          className={`rounded-[2px] ${index % 5 === 0 ? "bg-accent/65" : index % 3 === 0 ? "bg-accent/30" : "bg-surface-raised"}`}
        />
      ))}
    </span>
  );
}

function LanguageBars() {
  return (
    <span className="flex flex-1 flex-col justify-between gap-1.5">
      {barWidths.map((width, index) => (
        <span key={width} className="flex items-center gap-2">
          <span
            className={`h-1.5 rounded-sm ${index % 2 === 0 ? "bg-accent/55" : "bg-accent/30"} ${width}`}
          />
          <span className="ml-auto h-1 w-1/6 rounded-sm bg-border-strong" />
        </span>
      ))}
    </span>
  );
}
