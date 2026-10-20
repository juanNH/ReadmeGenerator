import { describe, expect, it } from "vitest";
import type { CustomSection } from "@/core/profile/custom-content";
import {
  changeCustomTextAlignment,
  changeCustomTextKind,
  changeCustomTitleAlignment,
  changeCustomTitleLevel,
  getCustomTextKind,
} from "./custom-text-formatting";

describe("custom text presentation changes", () => {
  it("keeps the exact text, ID and alignment when changing between text and headings", () => {
    const text = {
      id: "authored-id",
      type: "paragraph",
      text: "  <b>literal</b>\r\n# heading  ",
      alignment: "center",
    } as const;
    const heading = changeCustomTextKind(text, "1");
    expect(heading).toEqual({ ...text, type: "heading", level: 1 });
    expect(changeCustomTextKind(heading, "paragraph")).toEqual(text);
    expect(text.type).toBe("paragraph");
  });

  it("stores an explicit third-level heading and removes its level from paragraphs", () => {
    const heading = changeCustomTextKind({ id: "a", type: "paragraph", text: "hello" }, "3");
    expect(heading).toEqual({ id: "a", type: "heading", text: "hello", level: 3 });
    expect(changeCustomTextKind({ ...heading, type: "heading", level: 2 }, "paragraph")).toEqual({
      id: "a",
      type: "paragraph",
      text: "hello",
    });
  });

  it("reflects legacy heading defaults without changing the recovered block", () => {
    const block = { id: "legacy", type: "heading", text: "Hello" } as const;
    expect(getCustomTextKind(block, "Section title")).toBe("3");
    expect(getCustomTextKind(block, " \r\n\t")).toBe("2");
    expect(getCustomTextKind({ ...block, level: 3 }, "")).toBe("3");
    expect(block).not.toHaveProperty("level");
  });

  it("clears the default left alignment without changing the input object", () => {
    const heading = {
      id: "a",
      type: "heading",
      text: "hello",
      level: 1,
      alignment: "right",
    } as const;
    expect(changeCustomTextAlignment(heading, "left")).toEqual({
      id: "a",
      type: "heading",
      text: "hello",
      level: 1,
    });
    expect(changeCustomTextAlignment(heading, "center")).toEqual({
      ...heading,
      alignment: "center",
    });
    expect(heading.alignment).toBe("right");
  });
});

describe("custom section title presentation", () => {
  const original: CustomSection = {
    id: "section",
    title: "  My own title  ",
    visible: false,
    blocks: [{ id: "code", type: "code", source: "\tname = 'Alex'\r\n", language: "toml" }],
  };

  it("adds title choices without changing hidden content", () => {
    const formatted = changeCustomTitleAlignment(changeCustomTitleLevel(original, 1), "center");
    expect(formatted).toEqual({ ...original, titleLevel: 1, titleAlignment: "center" });
    expect(formatted.blocks).toBe(original.blocks);
    expect(original).not.toHaveProperty("titleLevel");
    expect(original).not.toHaveProperty("titleAlignment");
  });

  it("returns to absent defaults instead of adding fields to older documents", () => {
    const formatted = { ...original, titleLevel: 3, titleAlignment: "right" } as const;
    const restored = changeCustomTitleAlignment(changeCustomTitleLevel(formatted, 2), "left");
    expect(restored).toEqual(original);
  });
});
