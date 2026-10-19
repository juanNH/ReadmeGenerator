/** GitHub logins use single interior hyphens and at most 39 ASCII characters. */
export function normalizeGitHubUsername(value: string): string | null {
  const username = value.trim().replace(/^@/, "").toLowerCase();
  return username.length <= 39 && /^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/i.test(username)
    ? username
    : null;
}
