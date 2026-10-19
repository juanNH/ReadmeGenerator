export const profileIssueCodes = Object.freeze([
  "invalid_type",
  "invalid_value",
  "unknown_property",
  "unsupported_version",
  "unknown_module",
  "invalid_order",
  "invalid_id",
  "duplicate_id",
  "duplicate_card",
] as const);

export type ProfileIssueCode = (typeof profileIssueCodes)[number];
export type ProfileIssuePath = readonly (string | number)[];

export type ProfileIssue = {
  readonly code: ProfileIssueCode;
  readonly path: ProfileIssuePath;
};

export type ProfileResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: readonly ProfileIssue[] };
