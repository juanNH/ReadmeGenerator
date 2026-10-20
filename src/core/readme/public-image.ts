import { normalizeWebUrl } from "./web-url";

const privateDomainSuffixes = new Set([
  "localhost",
  "local",
  "localdomain",
  "internal",
  "intranet",
  "lan",
  "home",
  "corp",
  "private",
  "test",
  "invalid",
  "example",
  "onion",
]);

/** Syntactic public HTTPS policy only: no request, DNS lookup or accessibility guarantee. */
export function normalizePublicImageUrl(value: string): string | null {
  const normalized = normalizeWebUrl(value);
  if (normalized === null) return null;
  const url = new URL(normalized);
  const hostname = url.hostname.toLowerCase().replace(/\.$/, "");
  const labels = hostname.split(".");
  if (
    url.protocol !== "https:" ||
    url.port ||
    normalized.includes("#") ||
    hostname.length > 253 ||
    labels.length < 2 ||
    /^[\d.]+$/.test(hostname) ||
    hostname.includes(":") ||
    hostname === "home.arpa" ||
    hostname.endsWith(".home.arpa") ||
    privateDomainSuffixes.has(labels.at(-1) ?? "") ||
    labels.some((label) => label.length > 63 || !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label))
  )
    return null;
  return url.href;
}
