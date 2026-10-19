import * as React from "react";
import { cn } from "@/lib/cn";

export function Textarea({ className, rows = 4, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      rows={rows}
      data-slot="textarea"
      className={cn(
        "min-h-28 w-full min-w-0 resize-y rounded-md border border-border-strong bg-surface px-3 py-2.5 text-base leading-6 text-foreground shadow-soft transition-colors placeholder:text-muted-foreground hover:border-foreground/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-raised disabled:opacity-60 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20 motion-reduce:transition-none sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
