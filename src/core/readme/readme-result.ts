export type ReadmeIssue = {
  readonly code: "empty_profile" | "unsupported_module" | "invalid_url";
  readonly path: readonly (string | number)[];
};

export type ReadmeResult =
  | { readonly success: true; readonly markdown: string }
  | { readonly success: false; readonly errors: readonly ReadmeIssue[] };
