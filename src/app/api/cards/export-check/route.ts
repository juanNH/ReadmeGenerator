import { checkActivityExportRequest } from "@/server/activity-export-check";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(request: Request) {
  const result = await checkActivityExportRequest(request);
  const status =
    result.status === "ready"
      ? 200
      : result.reason === "invalid_request"
        ? 400
        : result.reason === "busy"
          ? 503
          : 200;
  return Response.json(result, {
    status,
    headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" },
  });
}
