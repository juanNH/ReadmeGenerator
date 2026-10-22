import "server-only";

export type PublicRepositoryStats = Readonly<{
  stars: number;
  forks: number;
}>;

const repositoryApiUrl = "https://api.github.com/repos/juanNH/ReadmeGenerator";
const cacheSeconds = 6 * 60 * 60;
const maximumResponseBytes = 32 * 1024;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && Number(value) >= 0;
}

async function readJsonWithinLimit(response: Response): Promise<unknown | null> {
  if (!response.body) return null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const chunks: string[] = [];
  let bytesRead = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      bytesRead += value.byteLength;
      if (bytesRead > maximumResponseBytes) {
        await reader.cancel();
        return null;
      }

      chunks.push(decoder.decode(value, { stream: true }));
    }

    chunks.push(decoder.decode());
    return JSON.parse(chunks.join("")) as unknown;
  } catch {
    await reader.cancel().catch(() => undefined);
    return null;
  } finally {
    reader.releaseLock();
  }
}

export async function getPublicRepositoryStats(): Promise<PublicRepositoryStats | null> {
  try {
    const response = await fetch(repositoryApiUrl, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": "github-profile-generator",
      },
      redirect: "error",
      signal: AbortSignal.timeout(5_000),
      next: { revalidate: cacheSeconds },
    });

    if (!response.ok) return null;

    const contentLength = response.headers.get("content-length");
    if (contentLength !== null) {
      const size = Number(contentLength);
      if (!Number.isSafeInteger(size) || size < 0 || size > maximumResponseBytes) return null;
    }

    const payload = await readJsonWithinLimit(response);
    if (!isRecord(payload)) return null;
    if (!isCount(payload.stargazers_count) || !isCount(payload.forks_count)) return null;

    return { stars: payload.stargazers_count, forks: payload.forks_count };
  } catch {
    return null;
  }
}
