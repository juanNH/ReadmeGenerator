import { describe, expect, it } from "vitest";
import { contactProviders, findContactProvider, findContactProviderByIconUrl } from ".";
import { contactIconMarkup, parseContactIconRow } from "../readme/contact-icons";
import { readmeLabels } from "../readme/readme-labels";
import type { ReadmeIssue } from "../readme/readme-result";
import { renderContact } from "../readme/render-contact";

describe("contact provider catalog", () => {
  it("has unique immutable providers and pinned icon metadata", () => {
    expect(contactProviders).toHaveLength(13);
    expect(new Set(contactProviders.map((entry) => entry.id)).size).toBe(13);
    expect(Object.isFrozen(contactProviders)).toBe(true);
    for (const entry of contactProviders) {
      expect(Object.isFrozen(entry)).toBe(true);
      expect(Object.isFrozen(entry.domains)).toBe(true);
      expect(entry.iconPath).toBe(`/contact-icons/${entry.id}.svg`);
      expect(entry.iconUrl).toBe(
        `https://raw.githubusercontent.com/simple-icons/simple-icons/0af835e2949a9222965522780e5e0810d3c53382/icons/${entry.id}.svg`,
      );
      expect(findContactProviderByIconUrl(entry.iconUrl)).toBe(entry);
      expect(findContactProvider(entry.placeholder)).toBe(entry);
    }
  });

  it.each([
    ["https://www.linkedin.com/in/alex", "linkedin"],
    ["HTTPS://LINKEDIN.COM/in/alex", "linkedin"],
    ["https://linkedin.com:443/in/alex", "linkedin"],
    ["https://leetcode.com/u/alex", "leetcode"],
    ["https://www.hackerrank.com/profile/alex", "hackerrank"],
    ["https://youtu.be/example", "youtube"],
    ["https://m.youtube.com/@alex", "youtube"],
    ["https://m.facebook.com/alex", "facebook"],
    ["https://twitter.com/alex", "x"],
    ["https://bsky.app/profile/alex.test", "bluesky"],
    ["https://dev.to/alex", "devdotto"],
  ])("recognizes an explicitly allowed URL %s", (url, id) => {
    expect(findContactProvider(url)?.id).toBe(id);
  });

  it.each([
    "https://linkedin.com.evil.example/in/alex",
    "https://evil-linkedin.com/in/alex",
    "https://evil.example/?next=https://linkedin.com/in/alex",
    "https://sub.linkedin.com/in/alex",
    "https://linkedin.com:8443/in/alex",
    "https://linkedin.com./in/alex",
    "https://lіnkedin.com/in/alex",
    "https://linkedin.com@evil.example/in/alex",
    "https://alex:secret@linkedin.com/in/alex",
    "https://linkedin.com\\@evil.example/in/alex",
    "mailto:alex@example.com",
    "javascript:alert(1)",
    "https://example.com/portfolio",
    "linkedin.com/in/alex",
    "https://linkedin.com/in/alex\n",
    "",
  ])("never brands a custom or unsafe URL %s", (url) => {
    expect(findContactProvider(url)).toBeUndefined();
  });

  it("requires exact immutable URLs when resolving an icon", () => {
    const entry = contactProviders[0]!;
    expect(findContactProviderByIconUrl(`${entry.iconUrl}?tracking=1`)).toBeUndefined();
    expect(findContactProviderByIconUrl(entry.iconUrl.replace("https:", "http:"))).toBeUndefined();
    expect(findContactProviderByIconUrl("/contact-icons/linkedin.svg")).toBeUndefined();
  });
});

describe("closed contact icon markup", () => {
  it("only recognizes the exact generated tokens and dimensions", () => {
    const first = contactProviders[0]!;
    const second = contactProviders[1]!;
    const markup = contactIconMarkup(first);
    expect(markup).toContain('width="20" height="20"');
    expect(parseContactIconRow(markup)).toEqual([first]);
    expect(parseContactIconRow(` ${markup}\n${contactIconMarkup(second)} `)).toEqual([
      first,
      second,
    ]);
    expect(parseContactIconRow(markup.replace('width="20"', 'width="200"'))).toBeNull();
    expect(parseContactIconRow(markup.replace('alt=""', 'alt="Custom"'))).toBeNull();
    expect(parseContactIconRow(markup.replace(" />", ' onerror="alert(1)" />'))).toBeNull();
    expect(parseContactIconRow(`${markup}<script>alert(1)</script>`)).toBeNull();
    expect(parseContactIconRow(`<a href="https://example.com">${markup}</a>`)).toBeNull();
    expect(parseContactIconRow("")).toBeNull();
  });
});

describe("contact README rendering", () => {
  it("uses a URL-derived icon and preserves a custom label as escaped text", () => {
    const errors: ReadmeIssue[] = [];
    const data = {
      links: [{ id: "\ud800", label: "Alex [profile]", url: "https://linkedin.com/in/alex" }],
    };
    const before = structuredClone(data);
    const output = renderContact(data, readmeLabels.en, errors);
    expect(output).toContain("## Contact\n\n");
    expect(output).toContain(`${contactIconMarkup(contactProviders[0]!)} Alex \\[profile\\]`);
    expect(output).toContain("](<https://linkedin.com/in/alex>)");
    expect(errors).toEqual([]);
    expect(data).toEqual(before);
  });

  it("supplies a known service name when the optional label is empty", () => {
    const output = renderContact(
      { links: [{ id: "known", label: "", url: "https://leetcode.com/u/alex" }] },
      readmeLabels.es,
      [],
    );
    expect(output).toContain("## Contacto");
    expect(output).toContain('alt="" /> LeetCode]');
  });

  it("keeps custom websites and emails as plain safe links", () => {
    const errors: ReadmeIssue[] = [];
    const output = renderContact(
      {
        links: [
          { id: "custom", label: "My portfolio", url: "https://alex.example/portfolio" },
          { id: "email", label: "Email me", url: "mailto:alex@example.com" },
          { id: "unlabeled", label: "", url: "https://example.com" },
        ],
      },
      readmeLabels.en,
      errors,
    );
    expect(output).toBe(
      "## Contact\n\n- [My portfolio](<https://alex.example/portfolio>)\n- [Email me](<mailto:alex@example.com>)\n- [https&#58;//example\\.com](<https://example.com/>)",
    );
    expect(errors).toEqual([]);
  });

  it("does not trust a brand label on an unrelated URL", () => {
    const output = renderContact(
      { links: [{ id: "custom", label: "LinkedIn", url: "https://linkedin.com.evil.example" }] },
      readmeLabels.en,
      [],
    );
    expect(output).toBe("## Contact\n\n- [LinkedIn](<https://linkedin.com.evil.example/>)");
    expect(output).not.toContain("<img");
  });

  it("omits blank rows and reports invalid URLs at their original index", () => {
    const errors: ReadmeIssue[] = [];
    const output = renderContact(
      {
        links: [
          { id: "empty", label: "", url: "" },
          { id: "invalid", label: "LinkedIn", url: "javascript:alert(1)" },
          { id: "missing", label: "My portfolio", url: "" },
        ],
      },
      readmeLabels.en,
      errors,
    );
    expect(output).toBe("");
    expect(errors).toEqual([
      { code: "invalid_url", path: ["data", "contact", "links", 1, "url"] },
      { code: "invalid_url", path: ["data", "contact", "links", 2, "url"] },
    ]);
  });
});
