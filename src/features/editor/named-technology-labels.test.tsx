import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { findTechnology } from "@/core/technologies";
import { wrapNamedTechnologyLabels } from "./named-technology-labels";

function icon(name: string, overrides: Record<string, unknown> = {}) {
  return createElement("img", {
    key: name,
    loading: "lazy",
    src: findTechnology(name)!.iconUrl,
    alt: "",
    ...overrides,
  });
}

function render(children: ReactNode) {
  return renderToStaticMarkup(createElement("p", null, wrapNamedTechnologyLabels(children)));
}

describe("named technology preview labels", () => {
  it.each(["React Native", "SvelteKit", "TanStack Query", "TanStack Router"])(
    "keeps %s with its decorative family icon and one visible name",
    (name) => {
      const html = render([icon(name), `\u00a0${name}`]);
      expect(html).toContain('class="inline-flex max-w-full items-center gap-1 align-middle"');
      expect(html).toContain(`<span class="min-w-0 [overflow-wrap:anywhere]">${name}</span>`);
      expect(html).toMatch(/<span class="inline-flex[^>]+><img[^>]+alt=""[^>]*\/><span /);
      expect(html.split(name)).toHaveLength(2);
      expect(html.match(/<img /g)).toHaveLength(1);
      expect(html).not.toContain("\u00a0");
    },
  );

  it("preserves tool order, separators and remaining text outside each grouping span", () => {
    const html = render([
      "Before ",
      icon("React"),
      "\u00a0React · ",
      icon("Docker"),
      "\u00a0Docker · Own tool",
      " After",
    ]);
    expect(html.match(/class="inline-flex /g)).toHaveLength(2);
    expect(html).toContain("React</span></span> · <span");
    expect(html).toContain("Docker</span></span> · Own tool After</p>");
    expect(html).toContain("<p>Before <span");
    expect(html.indexOf("React</span>")).toBeLessThan(html.indexOf("Docker</span>"));
  });

  it("recognizes a ReactMarkdown image component through its image node metadata", () => {
    const src = findTechnology("Drizzle ORM")!.iconUrl;
    const ImageComponent = ({ src, alt }: { src: string; alt: string }) =>
      createElement("img", { src, alt, loading: "lazy" });
    const image = createElement(ImageComponent, {
      src,
      alt: "",
      ...{ node: { type: "element", tagName: "img" } },
    });
    const html = render([image, "\u00a0Drizzle ORM"]);
    expect(html).toContain("Drizzle ORM</span></span>");
    expect(html.match(/<img /g)).toHaveLength(1);
  });

  it.each([
    [icon("React"), " React"],
    [icon("React"), "\u00a0Docker"],
    [icon("React"), "\u00a0React Custom"],
    [icon("React"), "\u00a0react"],
    [icon("React"), "\u00a0React: my notes"],
    [icon("React", { alt: "React" }), "\u00a0React"],
    [icon("React", { src: "https://example.com/react.svg" }), "\u00a0React"],
    [icon("React", { src: `${findTechnology("React")!.iconUrl}?other=1` }), "\u00a0React"],
  ])("leaves unmatched or legacy image and text pairs intact: %j", (image, text) => {
    const children = [image, text];
    expect(wrapNamedTechnologyLabels(children)).toBe(children);
    expect(render(children)).not.toContain('class="inline-flex ');
  });

  it("preserves plain HTML-looking text, unrelated elements and non-technology images", () => {
    const text = '<img src="https://example.com/track.svg" alt="" />\u00a0React';
    const unrelated = createElement("span", {
      src: findTechnology("React")!.iconUrl,
      alt: "",
    });
    const contact = createElement("img", {
      src: "/contact-icons/linkedin.svg",
      alt: "",
      loading: "lazy",
    });
    for (const children of [text, [unrelated, "\u00a0React"], [contact, "\u00a0LinkedIn"]]) {
      expect(wrapNamedTechnologyLabels(children)).toBe(children);
    }
    expect(render(text)).toContain("&lt;img");
    expect(render(text)).not.toContain("<img ");
  });

  it("retains whitespace after a matched label and all unaffected siblings", () => {
    const html = render([
      icon("React"),
      "\u00a0React \n ",
      createElement("strong", { key: "note" }, "Own note"),
    ]);
    expect(html).toContain("React</span></span> \n <strong>Own note</strong>");
  });
});
