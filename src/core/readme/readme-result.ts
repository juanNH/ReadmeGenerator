import type { Root } from "hast";

export type ReadmeIssue = {
  readonly code:
    | "empty_profile"
    | "unsupported_module"
    | "invalid_url"
    | "missing_image_alt"
    | "invalid_html"
    | "invalid_username"
    | "activity_not_configured";
  readonly path: readonly (string | number)[];
};

export type CustomImageSource = {
  readonly src: string;
  readonly alt: string;
};

export type CustomHtmlFragment = {
  readonly html: string;
  readonly tree: Root;
  readonly start: number;
  readonly end: number;
  readonly headingLevel: 3 | 4;
};

export type ReadmeResult =
  | {
      readonly success: true;
      readonly markdown: string;
      readonly exportIssues?: readonly ReadmeIssue[];
      readonly customImages?: readonly CustomImageSource[];
      readonly customHtml?: readonly CustomHtmlFragment[];
    }
  | { readonly success: false; readonly errors: readonly ReadmeIssue[] };
