import { describe, expect, it } from "vitest";
import { createEmptyProfile, createEmptyProfileV1 } from "./profile-operations";
import { profileDocumentSchema, profileDocumentV1Schema } from "./profile-schema";

function contribution() {
  return { id: "entry", title: "Contribution", description: "", url: "" };
}

describe("contribution document schema", () => {
  it("accepts the additive v2 links, images, and repository preview fields", () => {
    const document = createEmptyProfile("en");
    document.data.contributions.items = [
      {
        ...contribution(),
        links: [{ id: "docs", label: "Documentation", url: "https://example.com/docs" }],
        images: [{ id: "preview", url: "https://images.example.com/project.png", alt: "Project" }],
        repository: {
          url: "https://github.com/example/project",
          description: "A public project",
        },
      },
    ];
    expect(profileDocumentSchema.safeParse(document).success).toBe(true);
  });

  it("keeps the strict v1 contribution shape closed", () => {
    const document = createEmptyProfileV1("en");
    document.data.contributions.items = [contribution()];
    expect(profileDocumentV1Schema.safeParse(document).success).toBe(true);

    const extended = structuredClone(document) as unknown as {
      data: { contributions: { items: Array<Record<string, unknown>> } };
    };
    extended.data.contributions.items[0]!.links = [];
    expect(profileDocumentV1Schema.safeParse(extended).success).toBe(false);
  });

  it.each([
    {
      links: Array.from({ length: 6 }, (_, index) => ({ id: `link-${index}`, label: "", url: "" })),
    },
    {
      images: Array.from({ length: 4 }, (_, index) => ({
        id: `image-${index}`,
        url: "",
        alt: "",
      })),
    },
    {
      links: [
        { id: "duplicate", label: "One", url: "" },
        { id: "duplicate", label: "Two", url: "" },
      ],
    },
    {
      images: [
        { id: "duplicate", url: "", alt: "" },
        { id: "duplicate", url: "", alt: "" },
      ],
    },
  ])("rejects invalid new collection constraints: %j", (extension) => {
    const document = createEmptyProfile("en");
    document.data.contributions.items = [{ ...contribution(), ...extension }] as never;
    expect(profileDocumentSchema.safeParse(document).success).toBe(false);
  });
});
