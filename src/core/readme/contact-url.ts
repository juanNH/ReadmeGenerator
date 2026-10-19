const forbiddenUrlCharacters = /[\s\u0000-\u001f\u007f-\u009f\\]/u;
const mailboxLocalPart = /^[A-Za-z0-9!$&'*+/=^_`{|}~-]+(?:\.[A-Za-z0-9!$&'*+/=^_`{|}~-]+)*$/;
const mailboxDomainLabel = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;

/** A single ASCII mailbox, with no query headers, fragments, lists or encoded payloads. */
function isSimpleMailbox(value: string): boolean {
  const parts = value.split("@");
  const local = parts[0];
  const domain = parts[1];
  if (
    parts.length !== 2 ||
    !local ||
    !domain ||
    value.length > 254 ||
    local.length > 64 ||
    domain.length > 253 ||
    !mailboxLocalPart.test(local)
  ) {
    return false;
  }
  const labels = domain.split(".");
  return labels.length >= 2 && labels.every((label) => mailboxDomainLabel.test(label));
}

/** Uses only URL parsing; it never makes a request or reads browser state. */
export function normalizeContactUrl(value: string): string | null {
  if (forbiddenUrlCharacters.test(value)) return null;

  if (/^mailto:/i.test(value)) {
    return isSimpleMailbox(value.slice(7)) ? `mailto:${value.slice(7)}` : null;
  }
  if (!/^https?:\/\//i.test(value)) return null;

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
