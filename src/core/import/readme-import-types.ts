import type { CustomBlock } from "../profile/custom-content";
import type { ContentLocale, ProfileDocument } from "../profile/profile-schema";
import type { ReadmeResult } from "../readme/readme-result";

export const README_IMPORT_MAX_LENGTH = 100_000;
export const README_IMPORT_MAX_NODES = 6_000;
export const README_IMPORT_MAX_DEPTH = 32;

export type ReadmeImportProblemCode =
  | "empty_source"
  | "source_too_large"
  | "too_complex"
  | "parse_failed"
  | "invalid_url"
  | "relative_url"
  | "anchor_link"
  | "missing_image_alt"
  | "invalid_html"
  | "unsupported_format"
  | "empty_section"
  | "no_sections_selected"
  | "invalid_selection"
  | "invalid_document"
  | "generation_failed";

export type ReadmeImportNoticeCode =
  | "markdown_normalized"
  | "converted_to_html"
  | "retained_html"
  | "grouped_html_context"
  | "references_resolved"
  | "code_metadata_removed"
  | "html_unsupported_elements"
  | "html_unsupported_attributes"
  | "html_comments_removed"
  | "html_repaired_html";

/** Positions address the exact original source in UTF-16 units, never generated HTML. */
export type ReadmeImportDiagnostic = {
  readonly code: ReadmeImportProblemCode | ReadmeImportNoticeCode;
  readonly sectionId?: string;
  readonly start?: number;
  readonly end?: number;
  readonly detail?: string;
};

export type ReadmeImportProblem = ReadmeImportDiagnostic & {
  readonly code: ReadmeImportProblemCode;
};
export type ReadmeImportNotice = ReadmeImportDiagnostic & {
  readonly code: ReadmeImportNoticeCode;
};

export type ReadmeImportSection = {
  readonly id: string;
  /** A review/navigation label; it does not imply a fixed module identity. */
  readonly label: string;
  readonly title: string;
  readonly source: string;
  readonly start: number;
  readonly end: number;
  readonly blocks: readonly CustomBlock[];
  readonly representation: "visual" | "html" | "mixed" | "blocked";
  readonly notices: readonly ReadmeImportNotice[];
  readonly errors: readonly ReadmeImportProblem[];
};

export type ReadmeImportAnalysis = {
  readonly source: string;
  readonly contentLocale: ContentLocale;
  readonly sections: readonly ReadmeImportSection[];
  readonly notices: readonly ReadmeImportNotice[];
  readonly errors: readonly ReadmeImportProblem[];
};

export type ImportedProfileResult =
  | {
      readonly success: true;
      readonly document: ProfileDocument;
      readonly readme: Extract<ReadmeResult, { success: true }>;
      readonly excludedSectionIds: readonly string[];
    }
  | { readonly success: false; readonly errors: readonly ReadmeImportProblem[] };
