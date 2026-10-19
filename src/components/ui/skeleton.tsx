import * as React from "react";
import { cn } from "@/lib/cn";

/** Decorative placeholder. Put the loading announcement on the parent region. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      data-slot="skeleton"
      className={cn("animate-skeleton rounded-sm bg-surface-raised", className)}
      {...props}
    />
  );
}
