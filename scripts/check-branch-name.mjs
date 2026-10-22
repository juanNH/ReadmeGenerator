import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const branchPattern = /^(feature|fix|docs|chore|ci)\/(?:(?:\d+)-)?[a-z0-9]+(?:-[a-z0-9]+)*$/;
const protectedBranches = new Set(["main", "dev"]);

function checkRefFormat(branchName) {
  execFileSync("git", ["check-ref-format", "--branch", branchName], { stdio: "ignore" });
}

export function validateBranchName(branchName, checkRef = checkRefFormat) {
  if (typeof branchName !== "string" || !branchPattern.test(branchName)) {
    return "Use <feature|fix|docs|chore|ci>/<lowercase-description> (for example, fix/123-project-import-focus).";
  }

  try {
    checkRef(branchName);
  } catch {
    return `Git does not accept ${JSON.stringify(branchName)} as a branch name.`;
  }

  return null;
}

export function validateCommitBranch(
  branchName,
  {
    mergeInProgress = false,
    remoteBranchExists = branchExistsOnRemote,
    checkRef = checkRefFormat,
  } = {},
) {
  if (!branchName) return null;
  if (protectedBranches.has(branchName)) {
    return mergeInProgress
      ? null
      : `Direct commits to ${branchName} are blocked. Create a work branch and use a pull request.`;
  }

  const branchNameError = validateBranchName(branchName, checkRef);
  if (!branchNameError) return null;

  try {
    checkRef(branchName);
  } catch {
    return branchNameError;
  }

  try {
    if (remoteBranchExists(branchName)) return null;
  } catch {
    // Fail closed if a remote cannot be checked.
  }

  return `${branchNameError} Commits to a legacy branch are allowed only while this exact branch exists on a configured remote.`;
}

export function validatePushLine(line, currentBranchName = "") {
  const fields = line.trim().split(/\s+/);
  if (fields.length !== 4) return `Could not parse Git pre-push update: ${JSON.stringify(line)}.`;

  const [localRef, localObject, remoteRef, remoteObject] = fields;
  if (localRef === "(delete)" || /^0+$/.test(localObject)) {
    const deletedBranch = remoteRef.startsWith("refs/heads/")
      ? remoteRef.slice("refs/heads/".length)
      : null;
    if (deletedBranch && protectedBranches.has(deletedBranch)) {
      return `Deleting protected branch ${deletedBranch} is blocked.`;
    }

    return null;
  }

  if (localRef.startsWith("refs/tags/") && remoteRef.startsWith("refs/tags/")) return null;

  const localBranch =
    localRef === "HEAD"
      ? currentBranchName || null
      : localRef.startsWith("refs/heads/")
        ? localRef.slice("refs/heads/".length)
        : null;
  const remoteBranch = remoteRef.startsWith("refs/heads/")
    ? remoteRef.slice("refs/heads/".length)
    : null;
  if (!localBranch || !remoteBranch) {
    return `Only work branches can be pushed by this hook; received ${localRef} -> ${remoteRef}.`;
  }

  if (protectedBranches.has(localBranch) || protectedBranches.has(remoteBranch)) {
    return `Direct pushes to ${protectedBranches.has(remoteBranch) ? remoteBranch : localBranch} are blocked. Open a pull request instead.`;
  }

  const updatesExistingSameBranch = localBranch === remoteBranch && !/^0+$/.test(remoteObject);
  if (updatesExistingSameBranch) return null;

  const localError = validateBranchName(localBranch);
  if (localError) return `Local branch ${JSON.stringify(localBranch)} is invalid: ${localError}`;

  const remoteError = validateBranchName(remoteBranch);
  if (remoteError)
    return `Remote branch ${JSON.stringify(remoteBranch)} is invalid: ${remoteError}`;

  return null;
}

export function validatePushLines(input, currentBranchName = "") {
  return input
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => validatePushLine(line, currentBranchName))
    .filter(Boolean);
}

function runGit(args, options = {}) {
  return execFileSync("git", args, { encoding: "utf8", ...options }).trim();
}

export function branchExistsOnRemote(branchName, git = runGit) {
  let remotes;
  try {
    remotes = git(["remote"]).split(/\r?\n/).filter(Boolean);
  } catch {
    return false;
  }

  const remoteRef = `refs/heads/${branchName}`;
  for (const remote of remotes) {
    let pushUrls;
    try {
      pushUrls = git(["remote", "get-url", "--push", "--all", remote])
        .split(/\r?\n/)
        .filter(Boolean);
    } catch {
      continue;
    }

    for (const url of pushUrls) {
      try {
        const output = git(["ls-remote", "--exit-code", "--heads", url, remoteRef], {
          env: { ...process.env, GIT_TERMINAL_PROMPT: "0" },
          maxBuffer: 64 * 1024,
          stdio: ["ignore", "pipe", "ignore"],
          timeout: 3_000,
        });
        if (
          output.split(/\r?\n/).some((line) => {
            const [objectId, ref] = line.trim().split(/\s+/);
            return objectId && !/^0+$/.test(objectId) && ref === remoteRef;
          })
        ) {
          return true;
        }
      } catch {
        // An unavailable remote is not proof that the legacy branch still exists.
      }
    }
  }

  return false;
}

function currentBranch() {
  try {
    return runGit(["symbolic-ref", "--quiet", "--short", "HEAD"]);
  } catch {
    return "";
  }
}

function mergeInProgress() {
  const mergeHead = runGit(["rev-parse", "--git-path", "MERGE_HEAD"]);
  return existsSync(mergeHead) && readFileSync(mergeHead, "utf8").trim().length > 0;
}

function runPreCommit() {
  const branchName = currentBranch();
  const error = validateCommitBranch(branchName, { mergeInProgress: mergeInProgress() });
  if (error) {
    console.error(`Branch check failed: ${error}`);
    process.exitCode = 1;
    return;
  }

  if (branchName) {
    console.log(`Branch check passed: ${branchName}`);
  } else {
    console.log("Detached HEAD detected; branch-name validation is skipped for this commit.");
  }
}

function runPrePush() {
  const input = readFileSync(0, "utf8");
  const branchName = currentBranch();
  const errors = validatePushLines(input, branchName);
  if (errors.length) {
    for (const error of errors) console.error(`Branch check failed: ${error}`);
    process.exitCode = 1;
    return;
  }

  console.log("Branch check passed for all pushed refs.");
}

export function main(args = process.argv.slice(2)) {
  const [hook] = args;
  if (hook === "commit") return runPreCommit();
  if (hook === "push") return runPrePush();

  console.error("Usage: node scripts/check-branch-name.mjs <commit|push>");
  process.exitCode = 2;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
