import type { CustomBlock } from "../profile/custom-content";
import type { ProfileModuleData } from "../profile/module-content";
import type { ContentLocale, ProfileDocument, SectionReference } from "../profile/profile-schema";
import { README_MANIFEST_MAX_SOURCE_LENGTH } from "../readme/readme-manifest";
import type { ReadmeIssue, ReadmeResult } from "../readme/readme-result";

export const README_IMPORT_MAX_LENGTH = 100_000;
export const README_IMPORT_MAX_SOURCE_LENGTH = README_MANIFEST_MAX_SOURCE_LENGTH;
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
  | "snapshot_unavailable"
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
  | "html_repaired_html"
  | "module_mapping_not_confirmed"
  | "module_mapping_conflict"
  | "manifest_invalid"
  | "manifest_unsupported"
  | "manifest_stale";

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

export type ReadmeImportModuleProposal =
  | {
      readonly moduleId: "presentation";
      readonly confidence: "strong";
      readonly reason: "profile_header";
      readonly data: ProfileModuleData["presentation"];
    }
  | {
      readonly moduleId: "technologies";
      readonly confidence: "strong";
      readonly reason: "technology_catalog_list";
      readonly data: ProfileModuleData["technologies"];
    }
  | {
      readonly moduleId: "projects";
      readonly confidence: "strong";
      readonly reason: "project_link_list";
      readonly data: ProfileModuleData["projects"];
    }
  | {
      readonly moduleId: "contributions";
      readonly confidence: "strong";
      readonly reason: "contribution_link_list";
      readonly data: ProfileModuleData["contributions"];
    }
  | {
      readonly moduleId: "contact";
      readonly confidence: "strong";
      readonly reason: "contact_links";
      readonly data: ProfileModuleData["contact"];
    };

export type ReadmeImportRecovery =
  | { readonly kind: "none" }
  | { readonly kind: "structural"; readonly matchesSource: boolean }
  | {
      readonly kind: "snapshot";
      readonly snapshot: ProfileDocument;
      readonly matchesSource: boolean;
    }
  | { readonly kind: "invalid" }
  | { readonly kind: "unsupported"; readonly version: number };

export type ReadmeImportModuleHint = {
  readonly moduleId: ReadmeImportModuleProposal["moduleId"];
  readonly confidence: "review";
  readonly reason: "manifest_reference" | "heading_alias";
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
  readonly moduleProposal?: ReadmeImportModuleProposal;
  readonly moduleHint?: ReadmeImportModuleHint;
  readonly manifestReference?: SectionReference;
};

export type ReadmeImportAnalysis = {
  readonly source: string;
  readonly contentLocale: ContentLocale;
  readonly sections: readonly ReadmeImportSection[];
  readonly notices: readonly ReadmeImportNotice[];
  readonly errors: readonly ReadmeImportProblem[];
  readonly recovery: ReadmeImportRecovery;
};

export type ReadmeImportMode = "markdown" | "snapshot";

export type ReadmeImportBuildOptions = {
  readonly mode?: ReadmeImportMode;
  readonly destinationOverrides?: Readonly<
    Record<string, ReadmeImportModuleProposal["moduleId"] | "custom">
  >;
};

export type ImportedProfileResult =
  | {
      readonly success: true;
      readonly mode: ReadmeImportMode;
      readonly document: ProfileDocument;
      readonly readme: Extract<ReadmeResult, { success: true }>;
      readonly readmeErrors?: readonly ReadmeIssue[];
      readonly excludedSectionIds: readonly string[];
    }
  | { readonly success: false; readonly errors: readonly ReadmeImportProblem[] };
