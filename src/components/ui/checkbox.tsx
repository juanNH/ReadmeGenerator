"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/cn";

export function Checkbox({
  className,
  checked,
  ...props
}: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      data-slot="checkbox"
      className={cn(
        "group relative inline-flex size-11 shrink-0 items-center justify-center rounded-md transition-colors hover:bg-surface-raised focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45 motion-reduce:transition-none",
        className,
      )}
      {...props}
    >
      <span
        aria-hidden="true"
        className="pointer-events-none absolute size-5 rounded-[5px] border border-border-strong bg-surface group-aria-invalid:border-destructive group-data-[state=checked]:border-accent group-data-[state=checked]:bg-accent group-data-[state=indeterminate]:border-accent group-data-[state=indeterminate]:bg-accent"
      />
      <CheckboxPrimitive.Indicator className="pointer-events-none relative flex size-5 items-center justify-center text-accent-foreground">
        <Minus
          className="hidden size-3.5 group-data-[state=indeterminate]:block"
          aria-hidden="true"
        />
        <Check
          className="hidden size-3.5 group-data-[state=checked]:block"
          strokeWidth={3}
          aria-hidden="true"
        />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
