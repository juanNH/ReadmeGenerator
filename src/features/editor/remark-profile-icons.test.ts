import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ReactMarkdown from "react-markdown";
import { findTechnology } from "@/core/technologies";
import { technologyIconMarkup } from "@/core/readme/technology-icons";
import { contactIconMarkup } from "@/core/readme/contact-icons";
import { contactProviders } from "@/core/contact";
import { countryCatalog } from "@/core/location";
import { countryFlagMarkup } from "@/core/readme/country-flags";
import { remarkProfileIcons } from "./remark-profile-icons";

describe("controlled profile icon preview", () => {
  it("keeps a decorative country flag inline beside escaped location text", () => {
    const country = countryCatalog.find((entry) => entry.code === "AR")!;
    const html = renderToStaticMarkup(
      createElement(
        ReactMarkdown,
        {
          skipHtml: true,
          remarkPlugins: [remarkProfileIcons],
        },
        `Location: ${countryFlagMarkup(country)} Argentina`,
      ),
    );
    expect(html).toContain(`<p>Location: <img src="${country.iconUrl}" alt=""/> Argentina</p>`);
    expect(html.match(/<p>/g)).toHaveLength(1);
  });
  it("converts an exact catalog row to safe image nodes", () => {
    const react = findTechnology("React")!;
    const tree = { type: "root", children: [{ type: "html", value: technologyIconMarkup(react) }] };
    remarkProfileIcons()(tree);
    expect(tree.children).toEqual([
      { type: "paragraph", children: [{ type: "image", url: react.iconUrl, alt: "React" }] },
    ]);
  });

  it("leaves other HTML and escaped user text for the normal skipHtml policy", () => {
    const tree = {
      type: "root",
      children: [
        { type: "html", value: '<img src="https://example.com/track.png" />' },
        { type: "html", value: "<script>doSomething()</script>" },
        {
          type: "paragraph",
          children: [{ type: "text", value: technologyIconMarkup(findTechnology("React")!) }],
        },
      ],
    };
    const before = structuredClone(tree);
    remarkProfileIcons()(tree);
    expect(tree).toEqual(before);
  });

  it("keeps inline icons in their paragraph without nesting block elements", () => {
    const tools = [findTechnology("React")!, findTechnology("Docker")!];
    const tree = {
      type: "root",
      children: [
        {
          type: "paragraph",
          children: tools.map((tool) => ({ type: "html", value: technologyIconMarkup(tool) })),
        },
      ],
    };
    remarkProfileIcons()(tree);
    expect(tree.children[0]?.children).toEqual(
      tools.map((tool) => ({ type: "image", url: tool.iconUrl, alt: tool.name })),
    );
  });

  it("renders a generated row through the actual Markdown pipeline as one paragraph", () => {
    const tools = [findTechnology("React")!, findTechnology("Docker")!, findTechnology("Node.js")!];
    const html = renderToStaticMarkup(
      createElement(
        ReactMarkdown,
        {
          skipHtml: true,
          remarkPlugins: [remarkProfileIcons],
        },
        tools.map(technologyIconMarkup).join(" "),
      ),
    );
    expect(html.match(/<p>/g)).toHaveLength(1);
    expect(html.match(/<img /g)).toHaveLength(3);
    expect(html).not.toContain("<p><p>");
  });

  it("keeps a decorative contact icon inside its link with one readable label", () => {
    const linkedin = contactProviders.find((entry) => entry.id === "linkedin")!;
    const html = renderToStaticMarkup(
      createElement(
        ReactMarkdown,
        {
          skipHtml: true,
          remarkPlugins: [remarkProfileIcons],
        },
        `- [${contactIconMarkup(linkedin)} LinkedIn](<https://www.linkedin.com/in/alex>)`,
      ),
    );
    expect(html).toContain(
      `<a href="https://www.linkedin.com/in/alex"><img src="${linkedin.iconUrl}" alt=""/> LinkedIn</a>`,
    );
    expect(html).not.toContain('<a href="https://www.linkedin.com/in/alex"><p>');
  });
});
