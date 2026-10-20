/**
 * Adapted from GitHub Stats Extended, MIT.
 * Copyright (c) 2020 Anurag Hazra, Abhijit Gupta, martin-mfg.
 * Source fixed at 0506c4c0e0acab7be096be48d0d59d50852d811f:
 * https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/calculateRank.ts
 * The complete permission notice is in public/licenses/github-stats-extended.txt.
 * This is the upstream activity formula, not a measure of skill or a sampled
 * population percentile. Repository count is intentionally not an input.
 */

export type ActivityRankValues = {
  commits: number;
  pullRequests: number;
  issues: number;
  reviews: number;
  stars: number;
  followers: number;
};

export function calculateActivityRank(
  values: ActivityRankValues,
  allCommits = false,
): { level: string; percentile: number } {
  const exponential = (value: number): number => 1 - 2 ** -value;
  const logarithmic = (value: number): number => value / (1 + value);
  const weighted =
    2 * exponential(values.commits / (allCommits ? 1000 : 250)) +
    3 * exponential(values.pullRequests / 50) +
    exponential(values.issues / 25) +
    exponential(values.reviews / 2) +
    4 * logarithmic(values.stars / 50) +
    logarithmic(values.followers / 10);
  const percentile = Math.max(0, Math.min(100, (1 - weighted / 12) * 100));
  const thresholds = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const levels = ["S", "A+", "A", "A-", "B+", "B", "B-", "C+", "C"];
  const index = thresholds.findIndex((threshold) => percentile <= threshold);
  return { level: levels[index] ?? "C", percentile };
}
