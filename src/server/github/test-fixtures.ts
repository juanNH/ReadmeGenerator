export const fixtureNow = new Date("2026-10-19T12:00:00.000Z");

export function activityFixture() {
  return {
    data: {
      user: {
        login: "octocat",
        userViewType: "PUBLIC",
        contributionsCollection: {
          restrictedContributionsCount: 0,
          totalCommitContributions: 7,
          totalPullRequestContributions: 2,
          totalIssueContributions: 1,
          totalPullRequestReviewContributions: 3,
          contributionCalendar: {
            totalContributions: 5,
            weeks: [
              {
                contributionDays: [
                  { date: "2026-10-18", contributionCount: 2, contributionLevel: "FIRST_QUARTILE" },
                  {
                    date: "2026-10-19",
                    contributionCount: 3,
                    contributionLevel: "SECOND_QUARTILE",
                  },
                ],
              },
            ],
          },
          pullRequestContributions: {
            nodes: [
              {
                isRestricted: false,
                occurredAt: "2026-10-18T10:00:00Z",
                pullRequest: {
                  id: "pr-1",
                  title: "Improve keyboard navigation",
                  url: "https://github.com/octocat/project/pull/1",
                  repository: {
                    nameWithOwner: "octocat/project",
                    isPrivate: false,
                    visibility: "PUBLIC",
                  },
                },
              },
            ],
          },
          issueContributions: {
            nodes: [
              {
                isRestricted: false,
                occurredAt: "2026-10-19T10:00:00Z",
                issue: {
                  id: "issue-1",
                  title: "Document a setup issue",
                  url: "https://github.com/community/project/issues/2",
                  repository: {
                    nameWithOwner: "community/project",
                    isPrivate: false,
                    visibility: "PUBLIC",
                  },
                },
              },
            ],
          },
        },
      },
    },
  };
}

export function languagesFixture() {
  return {
    data: {
      user: {
        repositories: {
          totalCount: 1,
          pageInfo: { hasNextPage: false, endCursor: null as string | null },
          nodes: [
            {
              isPrivate: false,
              visibility: "PUBLIC",
              isFork: false,
              owner: { login: "octocat" },
              languages: {
                pageInfo: { hasNextPage: false },
                edges: [
                  { size: 150, node: { name: "TypeScript", color: "#3178c6" as string | null } },
                  { size: 50, node: { name: "CSS", color: "#663399" as string | null } },
                ],
              },
            },
          ],
        },
      },
    },
  };
}

export function githubResponse(data: unknown, headers: Record<string, string> = {}): Response {
  return Response.json(data, {
    headers: { "x-oauth-scopes": "", "x-ratelimit-remaining": "4999", ...headers },
  });
}
