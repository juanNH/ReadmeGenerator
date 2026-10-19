export type ReadmeIssue = {
  readonly code:
    | "empty_profile"
    | "unsupported_module"
    | "invalid_url"
    | "invalid_username"
    | "activity_not_configured";
  readonly path: readonly (string | number)[];
};

export type ReadmeResult =
  | {
      readonly success: true;
      readonly markdown: string;
      readonly exportIssues?: readonly ReadmeIssue[];
    }
  | { readonly success: false; readonly errors: readonly ReadmeIssue[] };
