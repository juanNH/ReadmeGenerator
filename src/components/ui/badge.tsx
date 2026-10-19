import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const badgeVariants = cva(
  "inline-flex w-fit max-w-full items-center gap-1.5 rounded-sm border px-2 py-1 text-xs font-medium leading-4 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring [&_svg]:size-3 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        neutral: "border-transparent bg-surface-raised text-muted-foreground",
        accent: "border-transparent bg-accent-soft text-accent-soft-foreground",
        success: "border-accent/25 bg-accent-soft text-accent-soft-foreground",
        warning: "border-transparent bg-warning-soft text-warning",
        outline: "border-border bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

export type BadgeProps = React.ComponentProps<"span"> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean };

export function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Component = asChild ? Slot : "span";
  return (
    <Component data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}
