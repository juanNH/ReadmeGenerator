# Branching and pull requests

This guide describes the repository's working conventions. Git does not prescribe branch prefixes; they make the purpose of a short-lived branch easier to recognize.

## Choose a branch name

Use `<type>/<short-description>` in lowercase English, with words separated by single hyphens:

| Prefix     | Use it for                           | Example                          |
| ---------- | ------------------------------------ | -------------------------------- |
| `feature/` | A user-facing capability             | `feature/about-and-contributing` |
| `fix/`     | A bug or regression                  | `fix/project-import-focus`       |
| `docs/`    | Documentation and community guidance | `docs/branching-workflow`        |
| `chore/`   | Development tools and maintenance    | `chore/git-hooks`                |
| `ci/`      | Continuous-integration configuration | `ci/repository-guardrails`       |

Keep names short and descriptive. An issue number is optional, for example `fix/123-project-import-focus`. Avoid spaces, accents, uppercase letters, repeated hyphens, extra slashes and personal or secret information. These prefixes are a project convention, not a Git or GitHub requirement. The project uses `docs/` for documentation changes; Git does not distinguish it from `doc/`, and neither spelling is a standard. Commit-message types such as `docs`, `feat` and `fix` are a separate convention. Existing and bot-managed branches do not need to be renamed to match this convention.

## Start a branch

Start work from the latest `dev` branch. Before switching branches, check that your checkout is clean; do not discard or move someone else's changes. If another task already uses the checkout, use a separate worktree.

```sh
git status --short
git fetch origin
git switch dev
git pull --ff-only origin dev
git check-ref-format --branch feature/about-and-contributing
git switch -c feature/about-and-contributing
```

Replace the example with a name that describes your change. `git check-ref-format` checks Git's reference syntax; the branch-name convention above is an additional project rule.

If your clone does not have a local `dev` branch yet, `git switch dev` creates it from the matching `origin/dev` remote-tracking branch. Do not start from `main` when the change is intended for the next project release; `dev` is the integration base.

In a graphical client such as GitHub Desktop, first fetch the remote, switch to `dev`, pull its latest commits, then create a new branch from `dev`. Confirm the current branch before editing or pushing. Client labels vary, but the branch should have the same base and name as in the commands above.

When another task already uses your checkout, create a worktree so each task has its own directory and branch. First update the local `dev` branch as above, then choose a new path:

```sh
git worktree add ../ReadmeGenerator-about -b feature/about-and-contributing dev
git worktree list
```

Use a different directory and branch name for each task. Remove a worktree only after its changes are committed or safely retained elsewhere.

### Working from a fork

Keep `origin` pointing to your fork and add the project repository as `upstream`:

```sh
git remote add upstream https://github.com/juanNH/ReadmeGenerator.git
git fetch upstream
git switch -c dev --track upstream/dev
git switch -c feature/about-and-contributing
git push --set-upstream origin feature/about-and-contributing
```

If you already have a local `dev` branch, update it with `git fetch upstream` and `git pull --ff-only upstream dev` instead of creating it again. Open the pull request from your fork's work branch to `juanNH/ReadmeGenerator:dev`.

### Update a work branch safely

After `dev` has advanced, fetch and fast-forward the local integration branch, then merge it into your work branch:

```sh
git fetch origin
git switch dev
git pull --ff-only origin dev
git switch feature/about-and-contributing
git merge dev
```

For a fork, use `upstream` instead of `origin` when updating `dev`. Resolve conflicts deliberately and rerun the checks; do not force-push or overwrite a shared branch. Coordinate before rewriting the history of a branch that has already been pushed.

## Open a pull request

Push your branch and open a pull request targeting `dev`. If you work from a fork, push to your fork and select the project's `dev` branch as the base. Explain the user-visible result, link a related issue when one exists, and list the checks you ran. Follow [CONTRIBUTING.md](../CONTRIBUTING.md) for setup and validation guidance.

Keep a pull request focused so it can be reviewed independently. Do not include credentials, private profile data or unrelated local changes. Address review feedback with follow-up commits on the same branch, and wait for the repository's required checks and review before merging.

Git does not enforce this naming convention by itself. Local hooks can help catch mistakes, but they can be skipped or unavailable; repository checks and branch protection are the shared controls. Existing pull requests and bot-managed branches should be handled explicitly by maintainers rather than renamed to fit a new convention.

## Integration branches

`dev` is the integration branch for reviewed changes. After a change has been integrated and its preview reviewed, promote `dev` to `main` through a separate pull request. `main` is the production branch. Keep `dev` available for the next set of changes.

For an urgent production fix that starts from `main`, open the production pull request against `main` and also bring the fix back to `dev`. Resolve any divergence with review; do not force-push over shared branch history.

After a pull request is merged, delete its short-lived branch when it is no longer needed. Permanent integration branches and release tags are not work branches and are outside the naming convention above.
