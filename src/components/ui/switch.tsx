"use client";

import * as React from "react";
import * as SwitchPrimitive from "@radix-ui/react-switch";
import { cn } from "@/lib/cn";

export function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "group relative inline-flex h-11 w-12 shrink-0 items-center rounded-md focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-0.5 h-6 w-11 rounded-full border border-border-strong bg-surface-raised transition-colors group-data-[state=checked]:border-accent group-data-[state=checked]:bg-accent motion-reduce:transition-none"
      />
      <SwitchPrimitive.Thumb className="pointer-events-none absolute left-[5px] size-[18px] translate-x-0 rounded-full bg-muted-foreground transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-accent-foreground motion-reduce:transition-none" />
    </SwitchPrimitive.Root>
  );
}
