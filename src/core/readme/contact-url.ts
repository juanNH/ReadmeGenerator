import { hasForbiddenUrlCharacters, normalizeWebUrl } from "./web-url";

export { escapeLinkDestination } from "./web-url";

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
  if (hasForbiddenUrlCharacters(value)) return null;

  if (/^mailto:/i.test(value)) {
    return isSimpleMailbox(value.slice(7)) ? `mailto:${value.slice(7)}` : null;
  }
  return normalizeWebUrl(value);
}
