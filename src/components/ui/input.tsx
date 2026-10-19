import * as React from "react";
import { cn } from "@/lib/cn";

export function Input({ className, type = "text", ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "min-h-11 w-full min-w-0 rounded-md border border-border-strong bg-surface px-3 py-2.5 text-base text-foreground shadow-soft transition-colors placeholder:text-muted-foreground hover:border-foreground/50 focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/20 focus-visible:outline-none disabled:cursor-not-allowed disabled:bg-surface-raised disabled:opacity-60 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/20 motion-reduce:transition-none sm:text-sm",
        className,
      )}
      {...props}
    />
  );
}
