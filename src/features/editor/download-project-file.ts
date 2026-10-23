import { serializeProjectFile } from "@/core/project";
import type { ProfileDocument } from "@/core/profile/profile-schema";

type DownloadProjectResult =
  { success: true } | { success: false; code: "too_large" | "invalid_document" | "download" };

/** Download the authored document independently of README export validation. */
export function downloadProjectFile(
  profile: ProfileDocument,
  filename = "github-profile.project.json",
): DownloadProjectResult {
  const result = serializeProjectFile(profile);
  if (!result.success) return result;

  let url: string | null = null;
  const link = document.createElement("a");
  try {
    url = URL.createObjectURL(
      new Blob([result.source], { type: "application/json;charset=utf-8" }),
    );
    link.href = url;
    link.download = filename;
    document.body.append(link);
    link.click();
    return { success: true };
  } catch {
    return { success: false, code: "download" };
  } finally {
    link.remove();
    if (url !== null) {
      const completedUrl = url;
      window.setTimeout(() => URL.revokeObjectURL(completedUrl), 1_000);
    }
  }
}
