import assert from "node:assert/strict";
import test from "node:test";
import {
  branchExistsOnRemote,
  validateBranchName,
  validateCommitBranch,
  validatePushLine,
  validatePushLines,
} from "./check-branch-name.mjs";

const zeroSha = "0".repeat(40);
const commitSha = "a".repeat(40);

test("branch names follow the documented prefixes and kebab-case", () => {
  for (const name of [
    "feature/about-page",
    "fix/123-project-import-focus",
    "docs/branching-workflow",
    "chore/git-hooks",
    "ci/repository-guardrails",
  ]) {
    assert.equal(validateBranchName(name), null, name);
  }

  for (const name of [
    "doc/branching-workflow",
    "Feature/about-page",
    "feature/about--page",
    "feature/about/page",
    "feature/about page",
    "feature/with_underscore",
  ]) {
    assert.notEqual(validateBranchName(name), null, name);
  }
});

test("branch names must also pass Git's native ref check", () => {
  assert.match(
    validateBranchName("feature/a", () => {
      throw new Error("bad ref");
    }),
    /Git does not accept/,
  );
});

test("direct commits to integration branches are blocked except merge commits", () => {
  assert.match(validateCommitBranch("main"), /Direct commits/);
  assert.match(validateCommitBranch("dev"), /Direct commits/);
  assert.equal(validateCommitBranch("main", { mergeInProgress: true }), null);
  assert.equal(validateCommitBranch("dev", { mergeInProgress: true }), null);
  assert.equal(validateCommitBranch("feature/about-page"), null);
  assert.equal(validateCommitBranch(""), null);
});

test("pre-commit allows a legacy branch only while that exact name exists remotely", () => {
  let checkedBranch = null;

  assert.equal(
    validateCommitBranch("old_personal-branch", {
      remoteBranchExists(branchName) {
        checkedBranch = branchName;
        return true;
      },
    }),
    null,
  );
  assert.equal(checkedBranch, "old_personal-branch");

  assert.match(
    validateCommitBranch("old_personal-branch", { remoteBranchExists: () => false }),
    /exact branch exists on a configured remote/,
  );
});

test("pre-commit does not let remote existence bypass protected branches or invalid Git refs", () => {
  let remoteCheckCount = 0;
  const remoteBranchExists = () => {
    remoteCheckCount += 1;
    return true;
  };

  assert.match(validateCommitBranch("main", { remoteBranchExists }), /Direct commits/);
  assert.match(validateCommitBranch("dev", { remoteBranchExists }), /Direct commits/);
  assert.match(
    validateCommitBranch("legacy branch with spaces", { remoteBranchExists }),
    /Use <feature\|fix\|docs\|chore\|ci>/,
  );
  assert.equal(remoteCheckCount, 0);
});

test("legacy branch verification queries the exact ref on configured push URLs", () => {
  const calls = [];
  const git = (args, options) => {
    calls.push({ args, options });

    if (args[0] === "remote" && args.length === 1) return "origin";
    if (args[0] === "remote" && args[1] === "get-url") return "https://example.invalid/repo.git";
    if (args[0] === "ls-remote") {
      return `${commitSha}\trefs/heads/old_personal-branch`;
    }

    throw new Error(`Unexpected git command: ${args.join(" ")}`);
  };

  assert.equal(branchExistsOnRemote("old_personal-branch", git), true);
  assert.deepEqual(calls.at(-1).args, [
    "ls-remote",
    "--exit-code",
    "--heads",
    "https://example.invalid/repo.git",
    "refs/heads/old_personal-branch",
  ]);
  assert.equal(calls.at(-1).options.timeout, 3_000);
  assert.equal(calls.at(-1).options.env.GIT_TERMINAL_PROMPT, "0");
});

test("legacy branch verification continues past inaccessible remotes and URLs", () => {
  const checkedUrls = [];
  const git = (args) => {
    if (args[0] === "remote" && args.length === 1) return "origin\nupstream";
    if (args[0] === "remote" && args[1] === "get-url" && args[4] === "origin") {
      return "https://unavailable.example/repo.git\nhttps://different.example/repo.git";
    }
    if (args[0] === "remote" && args[1] === "get-url" && args[4] === "upstream") {
      return "https://upstream.example/repo.git";
    }
    if (args[0] === "ls-remote") {
      const [, , , url] = args;
      checkedUrls.push(url);
      if (url === "https://unavailable.example/repo.git") {
        throw new Error("remote is unavailable");
      }
      if (url === "https://different.example/repo.git") {
        return `${commitSha}\trefs/heads/a_different_branch`;
      }
      if (url === "https://upstream.example/repo.git") {
        return `${commitSha}\trefs/heads/old_personal-branch`;
      }
    }

    throw new Error(`Unexpected git command: ${args.join(" ")}`);
  };

  assert.equal(branchExistsOnRemote("old_personal-branch", git), true);
  assert.deepEqual(checkedUrls, [
    "https://unavailable.example/repo.git",
    "https://different.example/repo.git",
    "https://upstream.example/repo.git",
  ]);
});

test("a deleted or unreachable legacy remote branch fails closed despite stale tracking refs", () => {
  const calls = [];
  const git = (args) => {
    calls.push(args);

    if (args[0] === "remote" && args.length === 1) return "origin";
    if (args[0] === "remote" && args[1] === "get-url") return "https://example.invalid/repo.git";
    if (args[0] === "ls-remote") throw new Error("remote ref does not exist");
    if (args[0] === "for-each-ref") return "origin/old_personal-branch";

    throw new Error(`Unexpected git command: ${args.join(" ")}`);
  };

  assert.equal(branchExistsOnRemote("old_personal-branch", git), false);
  assert.equal(
    calls.some(([command]) => command === "for-each-ref"),
    false,
  );
  assert.match(
    validateCommitBranch("old_personal-branch", { remoteBranchExists: () => false }),
    /exact branch exists on a configured remote/,
  );
});

test("pre-push allows compliant work branches and ignores tags or branch deletions", () => {
  assert.equal(
    validatePushLine(
      `refs/heads/feature/about-page ${commitSha} refs/heads/feature/about-page ${zeroSha}`,
    ),
    null,
  );
  assert.equal(validatePushLine(`refs/tags/v1.0.0 ${commitSha} refs/tags/v1.0.0 ${zeroSha}`), null);
  assert.equal(
    validatePushLine(`(delete) ${zeroSha} refs/heads/feature/old-branch ${commitSha}`),
    null,
  );
  assert.equal(validatePushLine(`(delete) ${zeroSha} refs/tags/v1.0.0 ${commitSha}`), null);
});

test("pre-push blocks deletions of protected integration branches", () => {
  assert.match(
    validatePushLine(`(delete) ${zeroSha} refs/heads/dev ${commitSha}`),
    /Deleting protected branch dev/,
  );
  assert.match(
    validatePushLine(`(delete) ${zeroSha} refs/heads/main ${commitSha}`),
    /Deleting protected branch main/,
  );
});

test("pre-push permits updating an existing same-named legacy branch", () => {
  assert.equal(
    validatePushLine(
      `refs/heads/old_personal-branch ${commitSha} refs/heads/old_personal-branch ${commitSha}`,
    ),
    null,
  );
});

test("pre-push still rejects new or renamed nonconforming branches", () => {
  assert.match(
    validatePushLine(
      `refs/heads/old_personal-branch ${commitSha} refs/heads/old_personal-branch ${zeroSha}`,
    ),
    /Local branch/,
  );
  assert.match(
    validatePushLine(
      `refs/heads/old_personal-branch ${commitSha} refs/heads/another_old-branch ${commitSha}`,
    ),
    /Local branch/,
  );
});

test("pre-push blocks invalid work branches and direct integration updates", () => {
  assert.match(
    validatePushLine(
      `refs/heads/Feature/about-page ${commitSha} refs/heads/Feature/about-page ${zeroSha}`,
    ),
    /Local branch/,
  );
  assert.match(
    validatePushLine(`refs/heads/feature/about-page ${commitSha} refs/heads/dev ${zeroSha}`),
    /Direct pushes to dev/,
  );
  assert.match(
    validatePushLine(`refs/heads/main ${commitSha} refs/heads/main ${commitSha}`),
    /Direct pushes to main/,
  );
  assert.match(
    validatePushLine(`HEAD ${commitSha} refs/heads/feature/about-page ${zeroSha}`),
    /Only work branches/,
  );
  assert.equal(
    validatePushLine(
      `HEAD ${commitSha} refs/heads/feature/about-page ${zeroSha}`,
      "feature/about-page",
    ),
    null,
  );
});

test("pre-push validates every ref in a multi-ref update", () => {
  const updates = [
    `refs/heads/feature/about-page ${commitSha} refs/heads/feature/about-page ${zeroSha}`,
    `refs/heads/fix/valid-change ${commitSha} refs/heads/dev ${zeroSha}`,
    `refs/tags/v1.0.0 ${commitSha} refs/tags/v1.0.0 ${zeroSha}`,
  ].join("\n");

  const errors = validatePushLines(updates);

  assert.equal(errors.length, 1);
  assert.match(errors[0], /Direct pushes to dev/);
});
