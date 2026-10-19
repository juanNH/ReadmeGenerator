import { getGitHubActivity } from "@/server/github/activity-service";
import { activityJsonResponse, parseActivityRequest } from "@/server/github/responses";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const username = parseActivityRequest(new URL(request.url));
  if (!username) return activityJsonResponse({ success: false, code: "invalid_username" });
  return activityJsonResponse(await getGitHubActivity(username));
}
