import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { CustomHtmlFragment } from "@/core/readme";
import { findTechnology } from "@/core/technologies";
import { createEmptyProfile } from "@/core/profile/profile-operations";
import { generateReadme } from "@/core/readme";

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));

import { ProfileHtmlPreview } from "./profile-html-preview";

describe("profile HTML technology chips", () => {
  it("keeps catalog icons and visible names inside the same exported badge", () => {
    const document = createEmptyProfile("en");
    document.visibility.technologies = true;
    document.data.technologies.groups = [
      { id: "web", name: "Frontend", items: [{ id: "react", name: "React", context: "" }] },
    ];
    const result = generateReadme(document);
    if (!result.success || !result.customHtml?.[0]) throw new Error("Expected compact HTML");
    const html = renderToStaticMarkup(
      createElement(ProfileHtmlPreview, { fragment: result.customHtml[0] }),
    );
    expect(html).toMatch(/<kbd[^>]*><img[^>]*class="[^"]*align-middle[^"]*"[^>]*\/?> React<\/kbd>/);
    expect(html).not.toContain("<sub");
  });

  it("centers the catalog icon and label in a content-sized chip", () => {
    const technology = findTechnology("React")!;
    const fragment: CustomHtmlFragment = {
      html: "",
      start: 0,
      end: 0,
      headingLevel: 4,
      tree: {
        type: "root",
        children: [
          {
            type: "element",
            tagName: "p",
            properties: {},
            children: [
              {
                type: "element",
                tagName: "kbd",
                properties: {},
                children: [
                  {
                    type: "element",
                    tagName: "img",
                    properties: {
                      width: 20,
                      height: 20,
                      src: technology.iconUrl,
                      alt: "",
                    },
                    children: [],
                  },
                  { type: "text", value: " React" },
                ],
              },
            ],
          },
        ],
      },
    };

    const html = renderToStaticMarkup(createElement(ProfileHtmlPreview, { fragment }));

    expect(html).toContain(
      'class="inline-flex max-w-full items-center rounded border border-border bg-surface-raised px-2 py-0.5 align-middle font-sans text-xs leading-5 [overflow-wrap:anywhere]"',
    );
    expect(html).toMatch(/<kbd[^>]*><img[^>]*\/?> React<\/kbd>/);
  });
});
