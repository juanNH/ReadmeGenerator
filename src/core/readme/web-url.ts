const forbiddenUrlCharacters = /[\s\u0000-\u001f\u007f-\u009f\\]/u;

export function hasForbiddenUrlCharacters(value: string): boolean {
  return forbiddenUrlCharacters.test(value);
}

/** Uses only URL parsing; it never makes a request or reads browser state. */
export function normalizeWebUrl(value: string): string | null {
  if (hasForbiddenUrlCharacters(value) || !/^https?:\/\//i.test(value)) return null;

  try {
    const url = new URL(value);
    const authority = value.slice(value.indexOf("//") + 2).split(/[/?#]/, 1)[0];
    if (
      !authority ||
      !url.hostname ||
      url.username ||
      url.password ||
      authority.includes("@") ||
      (url.protocol !== "http:" && url.protocol !== "https:")
    ) {
      return null;
    }
    return url.href;
  } catch {
    return null;
  }
}

/** Angle-delimited destinations avoid parentheses changing the Markdown structure. */
export function escapeLinkDestination(value: string): string {
  return `<${value.replace(/&/g, "&amp;").replace(/</g, "%3C").replace(/>/g, "%3E")}>`;
}
