import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const integrationBranches = new Set(["main", "dev"]);
// La revisión inicial no encontró PR humanas heredadas que necesiten una excepción.
// Repetir el inventario antes de activar el check requerido y agregar solo números revisados.
const grandfatheredPullRequestNumbers = new Set([]);

export function evaluateBranchPolicy(
  context,
  validateBranchName,
  legacyPullRequestNumbers = new Set(),
) {
  if (context.eventName === "pull_request") {
    if (context.pullRequestAuthor === "dependabot[bot]") {
      if (!integrationBranches.has(context.baseRef)) {
        return {
          status: "fail",
          message: "Dependabot pull requests must target the dev or main integration branch.",
        };
      }

      return {
        status: "pass",
        message: `Dependabot pull request targeting ${context.baseRef} is allowed.`,
      };
    }

    if (legacyPullRequestNumbers.has(context.pullRequestNumber)) {
      return {
        status: "pass",
        message: `Reviewed legacy pull request ${context.pullRequestNumber} is grandfathered.`,
      };
    }

    if (
      context.headRef === "dev" &&
      context.baseRef === "main" &&
      context.headRepository === context.baseRepository
    ) {
      return { status: "pass", message: "The dev-to-main promotion is allowed." };
    }

    if (typeof context.headRef !== "string" || context.headRef.length === 0) {
      return { status: "fail", message: "GitHub did not provide a pull request source branch." };
    }

    if (typeof validateBranchName !== "function") {
      return { status: "fail", message: "The shared branch-name validator is unavailable." };
    }

    const error = validateBranchName(context.headRef);
    return error
      ? { status: "fail", message: `Invalid pull request source branch: ${error}` }
      : { status: "pass", message: `Valid pull request source branch: ${context.headRef}.` };
  }

  if (context.eventName === "push") {
    const refPrefix = "refs/heads/";
    const branch =
      typeof context.ref === "string" && context.ref.startsWith(refPrefix)
        ? context.ref.slice(refPrefix.length)
        : "";

    if (integrationBranches.has(branch)) {
      return { status: "pass", message: `Integration branch update accepted: ${branch}.` };
    }

    return {
      status: "skip",
      message: "Branch names are checked on pull requests, not retroactively on branch pushes.",
    };
  }

  return {
    status: "skip",
    message: `No branch policy applies to ${context.eventName ?? "this event"}.`,
  };
}

async function main() {
  const { validateBranchName } = await import("./check-branch-name.mjs");
  const event = process.env.GITHUB_EVENT_PATH
    ? JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
    : {};
  const result = evaluateBranchPolicy(
    {
      actor: process.env.GITHUB_ACTOR,
      baseRef: process.env.GITHUB_BASE_REF,
      eventName: process.env.GITHUB_EVENT_NAME,
      baseRepository: event.repository?.full_name,
      headRef: process.env.GITHUB_HEAD_REF,
      headRepository: event.pull_request?.head?.repo?.full_name,
      pullRequestAuthor: event.pull_request?.user?.login,
      pullRequestNumber: event.number,
      ref: process.env.GITHUB_REF,
    },
    validateBranchName,
    grandfatheredPullRequestNumbers,
  );

  if (result.status === "fail") {
    console.error(`Branch policy failed: ${result.message}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Branch policy ${result.status}: ${result.message}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(
      `Branch policy failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exitCode = 1;
  });
}
