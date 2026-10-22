import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checker = fileURLToPath(new URL("./check-branch-name.mjs", import.meta.url));
const hook = fileURLToPath(new URL("../.husky/pre-push", import.meta.url));
const zeroSha = "0".repeat(40);

function git(args, cwd) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

test("the pre-push command rejects a branch update when HEAD is detached", (context) => {
  const cwd = mkdtempSync(join(tmpdir(), "readme-generator-detached-head-"));
  context.after(() => rmSync(cwd, { recursive: true, force: true }));

  git(["init", "--quiet"], cwd);
  mkdirSync(join(cwd, ".empty-hooks"));
  git(["config", "core.hooksPath", ".empty-hooks"], cwd);
  git(["config", "user.name", "Branch hook test"], cwd);
  git(["config", "user.email", "branch-hook-test@example.invalid"], cwd);
  git(["config", "commit.gpgsign", "false"], cwd);
  const hookCommand = readFileSync(hook, "utf8").trim();
  const [runtime, relativeChecker, ...args] = hookCommand.split(/\s+/);
  assert.equal(runtime, "node");
  assert.equal(relativeChecker, "scripts/check-branch-name.mjs");
  assert.deepEqual(args, ["push"]);
  mkdirSync(join(cwd, "scripts"));
  copyFileSync(checker, join(cwd, relativeChecker));
  writeFileSync(join(cwd, "README.md"), "Detached HEAD fixture\n");
  git(["add", "README.md"], cwd);
  git(["commit", "--quiet", "-m", "Create detached HEAD fixture"], cwd);
  git(["switch", "--quiet", "-c", "feature/detached-head-test"], cwd);
  git(["checkout", "--quiet", "--detach", "HEAD"], cwd);

  const symbolicHead = spawnSync("git", ["symbolic-ref", "--quiet", "--short", "HEAD"], {
    cwd,
    encoding: "utf8",
  });
  assert.notEqual(symbolicHead.status, 0, "the fixture must have a detached HEAD");

  const commit = git(["rev-parse", "HEAD"], cwd);
  const update = `HEAD ${commit} refs/heads/feature/detached-head-test ${zeroSha}\n`;
  const result = spawnSync(process.execPath, [join(cwd, relativeChecker), ...args], {
    cwd,
    encoding: "utf8",
    input: update,
  });

  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /Only work branches can be pushed by this hook; received HEAD/);
});
