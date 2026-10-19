import { normalizeContactUrl } from "../readme/contact-url";

export type ContactProvider = Readonly<{
  id: string;
  name: string;
  domains: readonly string[];
  iconPath: string;
  iconUrl: string;
  placeholder: string;
}>;

// Official Simple Icons 11.15.0 commit. See public/contact-icons/LICENSE.txt.
const simpleIconsCommit = "0af835e2949a9222965522780e5e0810d3c53382";

function provider(
  id: string,
  name: string,
  domain: string,
  placeholder: string,
  extraDomains: readonly string[] = [],
): ContactProvider {
  return Object.freeze({
    id,
    name,
    domains: Object.freeze([domain, `www.${domain}`, ...extraDomains]),
    iconPath: `/contact-icons/${id}.svg`,
    iconUrl: `https://raw.githubusercontent.com/simple-icons/simple-icons/${simpleIconsCommit}/icons/${id}.svg`,
    placeholder,
  });
}

export const contactProviders: readonly ContactProvider[] = Object.freeze([
  provider("linkedin", "LinkedIn", "linkedin.com", "https://www.linkedin.com/in/your-name"),
  provider("leetcode", "LeetCode", "leetcode.com", "https://leetcode.com/u/your-name"),
  provider(
    "hackerrank",
    "HackerRank",
    "hackerrank.com",
    "https://www.hackerrank.com/profile/your-name",
  ),
  provider("youtube", "YouTube", "youtube.com", "https://www.youtube.com/@your-name", [
    "m.youtube.com",
    "youtu.be",
  ]),
  provider("facebook", "Facebook", "facebook.com", "https://www.facebook.com/your-name", [
    "m.facebook.com",
  ]),
  provider("instagram", "Instagram", "instagram.com", "https://www.instagram.com/your-name"),
  provider("github", "GitHub", "github.com", "https://github.com/your-name"),
  provider("x", "X", "x.com", "https://x.com/your-name", ["twitter.com", "www.twitter.com"]),
  provider("bluesky", "Bluesky", "bsky.app", "https://bsky.app/profile/your-name.bsky.social"),
  provider("devdotto", "DEV Community", "dev.to", "https://dev.to/your-name"),
  provider("medium", "Medium", "medium.com", "https://medium.com/@your-name"),
  provider("twitch", "Twitch", "twitch.tv", "https://www.twitch.tv/your-name"),
  provider(
    "stackoverflow",
    "Stack Overflow",
    "stackoverflow.com",
    "https://stackoverflow.com/users/your-id",
  ),
]);

/** The validated URL determines the brand; labels and lookalike domains never do. */
export function findContactProvider(value: string): ContactProvider | undefined {
  const normalized = normalizeContactUrl(value);
  if (!normalized || normalized.startsWith("mailto:")) return undefined;
  const url = new URL(normalized);
  if (url.port) return undefined;
  return contactProviders.find((entry) => entry.domains.includes(url.hostname));
}

/** Only these immutable catalog URLs are accepted as contact images in the preview. */
export function findContactProviderByIconUrl(url: string): ContactProvider | undefined {
  return contactProviders.find((entry) => entry.iconUrl === url);
}
