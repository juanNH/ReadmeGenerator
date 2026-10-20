import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

export const buttonVariants = cva(
  "inline-flex min-h-11 min-w-0 max-w-full shrink-0 items-center justify-center gap-2 rounded-md border text-sm leading-5 font-medium wrap-anywhere transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 aria-disabled:pointer-events-none aria-disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "border-transparent bg-accent text-accent-foreground hover:bg-accent-hover",
        secondary: "border-transparent bg-surface-raised text-foreground hover:border-border",
        outline:
          "border-border bg-surface text-foreground hover:border-border-strong hover:bg-surface-raised",
        ghost:
          "border-transparent text-muted-foreground hover:bg-surface-raised hover:text-foreground",
        destructive:
          "border-transparent bg-destructive-soft text-destructive hover:border-destructive/40",
      },
      size: {
        sm: "px-3 py-2 text-xs",
        default: "px-4 py-2.5",
        lg: "min-h-12 px-5 py-3",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  type = "button",
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      {...(!asChild ? { type } : {})}
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
