import { normalizeWebUrl } from "./web-url";

export type GitHubRepository = {
  readonly url: string;
  readonly owner: string;
  readonly name: string;
  readonly fullName: string;
};

const ownerPattern = /^[A-Za-z0-9](?:[A-Za-z0-9]|-(?=[A-Za-z0-9])){0,38}$/;
const repositoryNamePattern = /^[A-Za-z0-9._-]{1,100}$/;

/** Parse a public GitHub repository URL without checking whether it exists. */
export function parseGitHubRepositoryUrl(value: string): GitHubRepository | null {
  const normalized = normalizeWebUrl(value);
  if (!normalized) return null;

  try {
    const url = new URL(normalized);
    if (
      url.protocol !== "https:" ||
      url.hostname !== "github.com" ||
      url.port ||
      url.search ||
      url.hash
    ) {
      return null;
    }

    const match = url.pathname.match(/^\/([^/]+)\/([^/]+)\/?$/);
    const owner = match?.[1];
    const name = match?.[2];
    if (
      !owner ||
      !name ||
      !ownerPattern.test(owner) ||
      !repositoryNamePattern.test(name) ||
      name === "." ||
      name === ".."
    ) {
      return null;
    }

    const fullName = `${owner}/${name}`;
    return { url: `https://github.com/${fullName}`, owner, name, fullName };
  } catch {
    return null;
  }
}
