import * as React from "react";
import { CircleAlert } from "lucide-react";
import { cn } from "@/lib/cn";

type AccessibleControlProps = {
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  required?: boolean;
};

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("text-sm leading-5 font-medium text-foreground", className)} {...props} />
  );
}

type FieldProps = Omit<React.ComponentProps<"div">, "children"> & {
  htmlFor: string;
  label: string;
  description?: string;
  error?: string;
  required?: boolean;
  children: React.ReactElement<AccessibleControlProps>;
};

/** Wrap one input or textarea; ids, descriptions and errors are associated automatically. */
export function Field({
  htmlFor,
  label,
  description,
  error,
  required,
  children,
  className,
  ...props
}: FieldProps) {
  const describedBy = [
    children.props["aria-describedby"],
    description ? `${htmlFor}-description` : undefined,
    error ? `${htmlFor}-error` : undefined,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("min-w-0 space-y-2", className)} {...props}>
      <Label htmlFor={htmlFor} className="block">
        {label}
        {required && (
          <span aria-hidden="true" className="ml-1 text-muted-foreground">
            *
          </span>
        )}
      </Label>
      {React.cloneElement(children, {
        id: htmlFor,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : children.props["aria-invalid"],
        ...(required ? { required: true } : {}),
      })}
      {description && (
        <p id={`${htmlFor}-description`} className="text-xs leading-5 text-muted-foreground">
          {description}
        </p>
      )}
      {error && (
        <p
          id={`${htmlFor}-error`}
          className="flex items-start gap-1.5 text-xs leading-5 font-medium text-destructive"
        >
          <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
