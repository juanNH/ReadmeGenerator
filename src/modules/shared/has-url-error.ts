import type { ReadmeIssue } from "@/core/readme";

export function hasUrlError(errors: readonly ReadmeIssue[], path: readonly (string | number)[]) {
  return errors.some(
    (error) =>
      error.code === "invalid_url" &&
      error.path.length === path.length &&
      error.path.every((part, index) => part === path[index]),
  );
}
