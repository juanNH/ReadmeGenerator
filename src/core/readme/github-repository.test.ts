import { describe, expect, it } from "vitest";
import { parseGitHubRepositoryUrl } from "./github-repository";

describe("GitHub repository URL", () => {
  it("returns a canonical public repository target without making a request", () => {
    expect(parseGitHubRepositoryUrl("https://github.com/juanNH/ReadmeGenerator/")).toEqual({
      url: "https://github.com/juanNH/ReadmeGenerator",
      owner: "juanNH",
      name: "ReadmeGenerator",
      fullName: "juanNH/ReadmeGenerator",
    });
  });

  it.each([
    "http://github.com/owner/repository",
    "https://github.com.evil.example/owner/repository",
    "https://user:password@github.com/owner/repository",
    "https://github.com:8443/owner/repository",
    "https://github.com/owner/repository?tab=readme",
    "https://github.com/owner/repository#readme",
    "https://github.com/owner/repository/tree/main",
    "https://github.com/owner",
    "https://github.com/-invalid/repository",
    "https://github.com/owner/..",
    "https://github.com/owner/repo%2Fother",
    "https://github.com/owner/repository with spaces",
  ])("rejects a URL outside the public owner/repository form: %s", (value) => {
    expect(parseGitHubRepositoryUrl(value)).toBeNull();
  });
});
