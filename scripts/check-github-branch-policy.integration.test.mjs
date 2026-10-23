import assert from "node:assert/strict";
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const sourceDirectory = path.dirname(fileURLToPath(import.meta.url));
const workflowPath = fileURLToPath(new URL("../.github/workflows/ci.yml", import.meta.url));

function readWorkflowBootstrap() {
  const workflow = readFileSync(workflowPath, "utf8");
  const stepMarker = "- name: Bootstrap validation while policy is absent from the base";
  const stepStart = workflow.indexOf(stepMarker);
  assert.notEqual(stepStart, -1, "the trusted-base bootstrap step must exist");

  const stepLines = workflow.slice(stepStart).split(/\r?\n/);
  const runIndex = stepLines.findIndex((line) => line.trimStart().startsWith("run:"));
  assert.notEqual(runIndex, -1, "the bootstrap step must have a run block");

  const indentedCommand = [];
  for (const line of stepLines.slice(runIndex + 1)) {
    if (line.trim().length === 0) {
      indentedCommand.push("");
      continue;
    }
    if (!line.startsWith("          ")) break;
    indentedCommand.push(line.slice(10));
  }
  while (indentedCommand.at(-1) === "") indentedCommand.pop();

  const command = indentedCommand.join("\n");
  const match = command.match(/^node --input-type=module --eval '\n([\s\S]*?)\n'$/);
  assert.ok(match, "the bootstrap run block must be a Node eval command");
  return match[1];
}

function runPolicy(policyDirectory, { headRef, baseRef = "dev", eventPath = "" }) {
  return spawnSync(
    process.execPath,
    [path.join(policyDirectory, "check-github-branch-policy.mjs")],
    {
      cwd: policyDirectory,
      encoding: "utf8",
      env: {
        ...process.env,
        GITHUB_ACTOR: "maintainer",
        GITHUB_BASE_REF: baseRef,
        GITHUB_EVENT_NAME: "pull_request",
        GITHUB_EVENT_PATH: eventPath,
        GITHUB_HEAD_REF: headRef,
        GITHUB_REF: "refs/pull/999/merge",
      },
    },
  );
}

test("the CLI invokes the shared validator for pull request source branches", () => {
  const policyDirectory = mkdtempSync(path.join(tmpdir(), "github-branch-policy-"));
  try {
    cpSync(
      path.join(sourceDirectory, "check-github-branch-policy.mjs"),
      path.join(policyDirectory, "check-github-branch-policy.mjs"),
    );
    cpSync(
      path.join(sourceDirectory, "check-branch-name.mjs"),
      path.join(policyDirectory, "check-branch-name.mjs"),
    );

    const accepted = runPolicy(policyDirectory, { headRef: "feature/branch-policy-integration" });
    assert.equal(accepted.status, 0, accepted.stderr);
    assert.match(accepted.stdout, /Valid pull request source branch/);

    const rejected = runPolicy(policyDirectory, { headRef: "Feature/invalid-branch" });
    assert.equal(rejected.status, 1);
    assert.match(rejected.stderr, /Invalid pull request source branch/);
  } finally {
    rmSync(policyDirectory, { force: true, recursive: true });
  }
});

test("the workflow bootstrap allows only the trusted first dev-to-main promotion without a base script", () => {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "github-branch-bootstrap-"));
  try {
    const bootstrapSource = readWorkflowBootstrap();
    const env = {
      ...process.env,
      BRANCH_POLICY_BASE_REPOSITORY: "juanNH/ReadmeGenerator",
      BRANCH_POLICY_EVENT_NAME: "pull_request",
      BRANCH_POLICY_HEAD_REPOSITORY: "juanNH/ReadmeGenerator",
      BRANCH_POLICY_PULL_REQUEST_AUTHOR: "maintainer",
      BRANCH_POLICY_SOURCE_BRANCH: "dev",
      BRANCH_POLICY_TARGET_BRANCH: "main",
    };

    const trustedPromotion = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", bootstrapSource],
      { cwd: temporaryDirectory, encoding: "utf8", env },
    );
    assert.equal(trustedPromotion.status, 0, trustedPromotion.stderr);
    assert.match(trustedPromotion.stdout, /same-repository dev-to-main promotion/);

    const forkPromotion = spawnSync(
      process.execPath,
      ["--input-type=module", "--eval", bootstrapSource],
      {
        cwd: temporaryDirectory,
        encoding: "utf8",
        env: { ...env, BRANCH_POLICY_HEAD_REPOSITORY: "contributor/ReadmeGenerator" },
      },
    );
    assert.equal(forkPromotion.status, 1);
    assert.match(
      forkPromotion.stderr,
      /trusted base does not contain the shared branch-name validator/,
    );
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});

test("a PR cannot bypass policy by modifying the validator in its head branch", () => {
  const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "github-branch-policy-trust-"));
  const trustedDirectory = path.join(temporaryDirectory, "trusted-base");
  const headDirectory = path.join(temporaryDirectory, "pr-head");
  const trustedPolicyDirectory = path.join(trustedDirectory, "scripts");
  const headPolicyDirectory = path.join(headDirectory, "scripts");

  try {
    mkdirSync(trustedPolicyDirectory, { recursive: true });
    mkdirSync(headPolicyDirectory, { recursive: true });
    cpSync(
      path.join(sourceDirectory, "check-github-branch-policy.mjs"),
      path.join(trustedPolicyDirectory, "check-github-branch-policy.mjs"),
    );
    cpSync(
      path.join(sourceDirectory, "check-branch-name.mjs"),
      path.join(trustedPolicyDirectory, "check-branch-name.mjs"),
    );

    const headPolicyPath = path.join(headPolicyDirectory, "check-github-branch-policy.mjs");
    writeFileSync(headPolicyPath, 'console.log("PR-modified validator passed.");\n');

    const eventPath = path.join(temporaryDirectory, "pull-request-event.json");
    writeFileSync(
      eventPath,
      JSON.stringify({
        number: 22,
        repository: { full_name: "juanNH/ReadmeGenerator" },
        pull_request: { head: { repo: { full_name: "juanNH/ReadmeGenerator" } } },
      }),
    );

    const env = {
      ...process.env,
      GITHUB_ACTOR: "contributor",
      GITHUB_BASE_REF: "main",
      GITHUB_EVENT_NAME: "pull_request",
      GITHUB_EVENT_PATH: eventPath,
      GITHUB_HEAD_REF: "Feature/invalid-branch",
      GITHUB_REF: "refs/pull/22/merge",
    };
    const modifiedHeadPolicy = spawnSync(process.execPath, [headPolicyPath], {
      encoding: "utf8",
      env,
    });
    assert.equal(modifiedHeadPolicy.status, 0, modifiedHeadPolicy.stderr);

    const trustedBasePolicy = spawnSync(
      process.execPath,
      [path.join(trustedPolicyDirectory, "check-github-branch-policy.mjs")],
      { cwd: trustedDirectory, encoding: "utf8", env },
    );
    assert.equal(trustedBasePolicy.status, 1);
    assert.match(trustedBasePolicy.stderr, /Invalid pull request source branch/);

    const workflow = readFileSync(workflowPath, "utf8");
    assert.match(
      workflow,
      /ref:\s*\$\{\{\s*github\.event\.pull_request\.base\.sha\s*\|\|\s*github\.sha\s*\}\}/,
    );
    assert.doesNotMatch(workflow, /github\.event\.pull_request\.head\.sha/);
  } finally {
    rmSync(temporaryDirectory, { force: true, recursive: true });
  }
});
