import assert from "node:assert/strict";
import test from "node:test";
import { evaluateBranchPolicy } from "./check-github-branch-policy.mjs";

const validateBranchName = (name) =>
  name === "feature/forked-change" ? null : "The shared validator rejected this branch.";

test("pull requests validate the actual source branch, including fork branches", () => {
  const result = evaluateBranchPolicy(
    {
      actor: "contributor",
      baseRef: "dev",
      eventName: "pull_request",
      headRef: "feature/forked-change",
      headRepository: "contributor/readme-generator",
      ref: "refs/pull/12/merge",
    },
    validateBranchName,
  );

  assert.equal(result.status, "pass");
  assert.match(result.message, /feature\/forked-change/);
});

test("pull requests fail clearly when their source branch is invalid", () => {
  const result = evaluateBranchPolicy(
    {
      actor: "contributor",
      baseRef: "dev",
      eventName: "pull_request",
      headRef: "Feature/Forked Change",
      ref: "refs/pull/13/merge",
    },
    validateBranchName,
  );

  assert.equal(result.status, "fail");
  assert.match(result.message, /Invalid pull request source branch/);
});

test("Dependabot version updates targeting dev are allowed without branch-name validation", () => {
  const result = evaluateBranchPolicy(
    {
      actor: "maintainer",
      baseRef: "dev",
      eventName: "pull_request",
      headRef: "dependabot/npm_and_yarn/next-16.4.2",
      pullRequestAuthor: "dependabot[bot]",
    },
    () => {
      throw new Error("Dependabot branches should not be validated.");
    },
  );

  assert.equal(result.status, "pass");
  assert.match(result.message, /targeting dev/);
});

test("Dependabot security updates targeting the default main branch are allowed", () => {
  const result = evaluateBranchPolicy(
    {
      actor: "maintainer",
      baseRef: "main",
      eventName: "pull_request",
      headRef: "dependabot/npm_and_yarn/next-16.4.2",
      pullRequestAuthor: "dependabot[bot]",
    },
    () => {
      throw new Error("Dependabot branches should not be validated.");
    },
  );

  assert.equal(result.status, "pass");
  assert.match(result.message, /targeting main/);
});

test("Dependabot pull requests targeting another branch fail", () => {
  const result = evaluateBranchPolicy(
    {
      actor: "maintainer",
      baseRef: "feature/unrelated",
      eventName: "pull_request",
      headRef: "dependabot/npm_and_yarn/next-16.4.2",
      pullRequestAuthor: "dependabot[bot]",
    },
    () => {
      throw new Error("Dependabot branches should not be validated.");
    },
  );

  assert.equal(result.status, "fail");
  assert.match(result.message, /must target the dev or main/);
});

test("other automation accounts still need a compliant source branch", () => {
  const result = evaluateBranchPolicy(
    {
      actor: "renovate[bot]",
      baseRef: "dev",
      eventName: "pull_request",
      headRef: "renovate/next-16.4.2",
      pullRequestAuthor: "renovate[bot]",
    },
    validateBranchName,
  );

  assert.equal(result.status, "fail");
  assert.match(result.message, /Invalid pull request source branch/);
});

test("the explicit dev-to-main promotion is allowed", () => {
  const result = evaluateBranchPolicy(
    {
      actor: "maintainer",
      baseRef: "main",
      baseRepository: "juanNH/ReadmeGenerator",
      eventName: "pull_request",
      headRef: "dev",
      headRepository: "juanNH/ReadmeGenerator",
    },
    () => {
      throw new Error("Integration promotion should not be validated as a work branch.");
    },
  );

  assert.equal(result.status, "pass");
  assert.match(result.message, /promotion/);
});

test("a fork branch named dev is not treated as an integration promotion", () => {
  const result = evaluateBranchPolicy(
    {
      actor: "contributor",
      baseRef: "main",
      baseRepository: "juanNH/ReadmeGenerator",
      eventName: "pull_request",
      headRef: "dev",
      headRepository: "contributor/ReadmeGenerator",
    },
    validateBranchName,
  );

  assert.equal(result.status, "fail");
  assert.match(result.message, /Invalid pull request source branch/);
});

test("pushes to protected integration branches pass without validating old work refs", () => {
  for (const branch of ["main", "dev"]) {
    const result = evaluateBranchPolicy({ eventName: "push", ref: `refs/heads/${branch}` }, () => {
      throw new Error("Integration pushes are not work-branch names.");
    });
    assert.equal(result.status, "pass", branch);
  }

  const oldBranchPush = evaluateBranchPolicy(
    { eventName: "push", ref: "refs/heads/legacy-work" },
    () => {
      throw new Error("Existing branch pushes must not be checked retroactively.");
    },
  );
  assert.equal(oldBranchPush.status, "skip");
});

test("missing pull request source branches fail closed", () => {
  const result = evaluateBranchPolicy(
    { actor: "contributor", baseRef: "dev", eventName: "pull_request" },
    validateBranchName,
  );

  assert.equal(result.status, "fail");
  assert.match(result.message, /did not provide/);
});

test("only explicitly reviewed legacy pull requests bypass branch naming", () => {
  const result = evaluateBranchPolicy(
    {
      actor: "contributor",
      baseRef: "dev",
      eventName: "pull_request",
      headRef: "legacy-work",
      pullRequestNumber: 41,
    },
    () => {
      throw new Error("The reviewed legacy request should not be revalidated.");
    },
    new Set([41]),
  );

  assert.equal(result.status, "pass");
  assert.match(result.message, /legacy pull request 41/);
});
