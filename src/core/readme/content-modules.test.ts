import { describe, expect, it } from "vitest";
import type { ProfileModuleData } from "../profile/module-content";
import { createEmptyProfile } from "../profile/profile-operations";
import type { ContentLocale, ProfileDocument } from "../profile/profile-schema";
import { findTechnology } from "../technologies";
import { normalizeContactUrl } from "./contact-url";
import { generateReadme, type ReadmeResult } from "./index";
import { namedTechnologyIconMarkup } from "./technology-icons";
import { normalizeWebUrl } from "./web-url";

type ContentModule = "technologies" | "projects" | "contributions";

function profileFor<T extends ContentModule>(
  moduleId: T,
  data: ProfileModuleData[T],
  locale: ContentLocale = "en",
): ProfileDocument {
  const profile = createEmptyProfile(locale);
  profile.visibility[moduleId] = true;
  profile.data = { ...profile.data, [moduleId]: data };
  return profile;
}

function markdown(result: ReadmeResult): string {
  if (!result.success) throw new Error(`Expected Markdown: ${JSON.stringify(result.errors)}`);
  return result.markdown;
}

function projectEntry(
  overrides: Partial<ProfileModuleData["projects"]["items"][number]> = {},
): ProfileModuleData["projects"]["items"][number] {
  return {
    id: "project",
    name: "",
    description: "",
    role: "",
    technologies: [],
    links: [],
    ...overrides,
  };
}

function freezeDeep<T>(value: T): T {
  if (value !== null && typeof value === "object") {
    for (const child of Object.values(value)) freezeDeep(child);
    Object.freeze(value);
  }
  return value;
}

describe("manual content export and optional sections", () => {
  it.each<ContentModule>(["technologies", "projects", "contributions"])(
    "omits an empty visible %s without inventing content",
    (moduleId) => {
      const profile = createEmptyProfile("en");
      profile.visibility[moduleId] = true;
      expect(generateReadme(profile)).toEqual({
        success: false,
        errors: [{ code: "empty_profile", path: [] }],
      });
    },
  );

  it("skips whitespace rows without authored content", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.technologies = true;
    profile.visibility.projects = true;
    profile.visibility.contributions = true;
    profile.data.technologies.groups = [
      { id: "name-only", name: "No technologies", items: [] },
      {
        id: "empty-items",
        name: "Empty group",
        items: [{ id: "empty", name: " ", context: "\n" }],
      },
    ];
    profile.data.projects.items = [
      projectEntry({
        technologies: [" ", "\n"],
        links: [{ id: "empty", label: "\t", url: " " }],
      }),
    ];
    profile.data.contributions.items = [{ id: "empty", title: " ", description: "\n", url: " " }];
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "empty_profile", path: [] }],
    });
  });

  it("uses the persisted module order and preserves collection order", () => {
    const profile = createEmptyProfile("en");
    for (const moduleId of [
      "presentation",
      "technologies",
      "projects",
      "contributions",
      "contact",
    ] as const) {
      profile.visibility[moduleId] = true;
    }
    profile.data.presentation.displayName = "Alex";
    profile.data.technologies.groups = [
      { id: "tools", name: "", items: [{ id: "tool", name: "TypeScript", context: "" }] },
    ];
    profile.data.projects.items = [
      projectEntry({ id: "second-alphabetically", name: "Testing" }),
      projectEntry({ id: "first-alphabetically", name: "Accessibility" }),
    ];
    profile.data.contributions.items = [
      { id: "help", title: "Community", description: "", url: "" },
    ];
    profile.data.contact.links = [{ id: "site", label: "Website", url: "https://example.com" }];
    profile.sectionOrder.reverse();
    const output = markdown(generateReadme(profile));
    const headings = [...output.matchAll(/^#{1,2} (.+)$/gm)].map((match) => match[1]);
    expect(headings).toEqual(["Contact", "Contributions", "Projects", "Technologies", "Alex"]);
    expect(output.indexOf("Testing")).toBeLessThan(output.indexOf("Accessibility"));
    const frozen = freezeDeep(profile);
    const original = JSON.stringify(frozen);
    expect(generateReadme(frozen)).toEqual(generateReadme(frozen));
    expect(JSON.stringify(frozen)).toBe(original);
  });
});

describe("technology text and saved groups", () => {
  it("escapes names and safely retains context paragraphs inside one list entry", () => {
    const profile = profileFor("technologies", {
      groups: [
        {
          id: "group",
          name: "",
          items: [
            {
              id: "\ud800",
              name: "[Testing]",
              context: "# not a heading\n\n<img src=x>\n- not another item",
            },
          ],
        },
      ],
    });
    expect(markdown(generateReadme(profile))).toBe(
      "## Technologies\n\n- **\\[Testing\\]**: \\# not a heading\n  \n  &lt;img src\\=x&gt;\n  \\- not another item\n",
    );
  });

  it("allows unnamed technology groups and context without a technology name", () => {
    const profile = profileFor("technologies", {
      groups: [
        { id: "empty", name: "Do not show", items: [] },
        {
          id: "unnamed",
          name: "",
          items: [
            { id: "empty", name: "", context: " " },
            { id: "context", name: "", context: "Tools for testing" },
          ],
        },
        {
          id: "named",
          name: "Daily [tools]",
          items: [
            { id: "typescript", name: "TypeScript", context: "Personal projects" },
            { id: "git", name: "Git", context: "" },
          ],
        },
      ],
    });
    expect(markdown(generateReadme(profile))).toBe(
      `## Technologies\n\n- Tools for testing\n\n### Daily \\[tools\\]\n\n- ${namedTechnologyIconMarkup(findTechnology("TypeScript")!)} **TypeScript**: Personal projects\n\n${namedTechnologyIconMarkup(findTechnology("Git")!)}&nbsp;Git\n`,
    );
  });

  it.each([
    ["en", "Technologies"],
    ["es", "Tecnologías"],
  ] as const)(
    "localizes the technology heading in %s without rewriting saved text",
    (locale, heading) => {
      const profile = profileFor(
        "technologies",
        {
          groups: [
            {
              id: "tools",
              name: "Own group",
              items: [{ id: "tool", name: "Git", context: "Texto propio" }],
            },
          ],
        },
        locale,
      );
      const output = markdown(generateReadme(profile));
      expect(output).toContain(`## ${heading}\n`);
      expect(output).toContain("### Own group");
      expect(output).toContain("**Git**: Texto propio");
      expect(output).toContain(namedTechnologyIconMarkup(findTechnology("Git")!));
    },
  );
});

describe("projects and manual contributions", () => {
  it.each([
    [projectEntry({ name: "Small project" }), "### Small project"],
    [projectEntry({ description: "An accessible form" }), "An accessible form"],
    [projectEntry({ role: "Testing and documentation" }), "Role: Testing and documentation"],
    [
      projectEntry({ technologies: ["", "TypeScript", " \n", "Git"] }),
      "Technologies: TypeScript, Git",
    ],
    [
      projectEntry({ name: "Small project", titleUrl: "https://example.com/demo" }),
      "### [Small project](<https://example.com/demo>)",
    ],
  ])("exports a useful partial project without a repository: %j", (entry, expected) => {
    expect(markdown(generateReadme(profileFor("projects", { items: [entry] })))).toBe(
      `## Projects\n\n${expected}\n`,
    );
  });

  it("localizes project details and uses one legacy URL only for the title", () => {
    const profile = profileFor(
      "projects",
      {
        items: [
          projectEntry({
            name: "My app",
            role: "Contributor",
            technologies: ["React", "TypeScript"],
            links: [
              { id: "empty", label: "", url: "" },
              { id: "first", label: "", url: "https://example.com/demo" },
              { id: "second", label: "Code", url: "https://example.com/code" },
            ],
          }),
        ],
      },
      "es",
    );
    expect(markdown(generateReadme(profile))).toBe(
      "## Proyectos\n\n### [My app](<https://example.com/demo>)\n\nRol: Contributor · Tecnologías: React, TypeScript\n",
    );
  });

  it.each([
    ["Documentation", "", "", "**Documentation**"],
    ["", "I help review translations", "", "I help review translations"],
    ["Community", "I answer questions", "", "**Community**: I answer questions"],
    [
      "",
      "",
      "https://example.com/community",
      "[More information](<https://example.com/community>)",
    ],
  ])(
    "represents a manual contribution without demanding a public PR: %j",
    (title, description, url, expected) => {
      const profile = profileFor("contributions", {
        items: [{ id: "help", title, description, url }],
      });
      expect(markdown(generateReadme(profile))).toBe(`## Contributions\n\n- ${expected}\n`);
    },
  );

  it("translates contribution headings and link labels only", () => {
    const profile = profileFor(
      "contributions",
      {
        items: [
          {
            id: "help",
            title: "Documentation",
            description: "Own words",
            url: "https://example.com",
          },
        ],
      },
      "es",
    );
    expect(markdown(generateReadme(profile))).toBe(
      "## Contribuciones\n\n- **Documentation**: Own words\n  \n  [Más información](<https://example.com/>)\n",
    );
  });
});

describe("shared web URL policy", () => {
  it.each([
    [
      "https://example.com/path(a)?first=1&second=2",
      "https://example.com/path(a)?first=1&second=2",
    ],
    ["HTTP://LOCALHOST:3000/path", "http://localhost:3000/path"],
    ["https://münich.example", "https://xn--mnich-kva.example/"],
  ])("normalizes the same allowed web URL in contact and content: %s", (input, expected) => {
    expect(normalizeWebUrl(input)).toBe(expected);
    expect(normalizeContactUrl(input)).toBe(expected);
  });

  it.each([
    "",
    "javascript:alert(1)",
    "data:text/html,hello",
    "mailto:alex@example.com",
    "//example.com",
    "/relative",
    "example.com",
    "https:example.com",
    "https:////example.com",
    "https://",
    "https://user:password@example.com",
    "https://@example.com",
    "https://user@example.com",
    "https://example.com:99999",
    " https://example.com",
    "https://example.com ",
    "https://example.com/has space",
    "https://example.com/\nline",
    "https://example.com/\u0000control",
    "https://example.com/\u0085control",
    "https://example.com/\\path",
  ])("rejects a forbidden content URL: %j", (value) => {
    expect(normalizeWebUrl(value)).toBeNull();
  });

  it("allows an omitted contribution URL, rejects a provided non-web URL and ignores it when hidden", () => {
    const profile = profileFor("contributions", {
      items: [{ id: "help", title: "", description: "Community", url: " \n" }],
    });
    expect(generateReadme(profile).success).toBe(true);
    profile.data.contributions.items[0]!.url = "mailto:alex@example.com";
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [{ code: "invalid_url", path: ["data", "contributions", "items", 0, "url"] }],
    });
    profile.visibility.contributions = false;
    profile.visibility.presentation = true;
    profile.data.presentation.bio = "Still exportable";
    expect(markdown(generateReadme(profile))).toBe("Still exportable\n");
  });

  it("reports original row and nested link indices without returning a partial README", () => {
    const profile = createEmptyProfile("en");
    profile.visibility.projects = true;
    profile.visibility.contributions = true;
    profile.visibility.metrics = true;
    profile.data.projects.items = [
      projectEntry({ id: "empty" }),
      projectEntry({
        id: "invalid",
        links: [
          { id: "empty", label: "", url: "" },
          { id: "missing", label: "Website", url: "" },
          { id: "mail", label: "Email", url: "mailto:alex@example.com" },
        ],
      }),
    ];
    profile.data.contributions.items = [
      { id: "invalid", title: "", description: "", url: "//example.com" },
    ];
    expect(generateReadme(profile)).toEqual({
      success: false,
      errors: [
        { code: "invalid_url", path: ["data", "projects", "items", 1, "links", 1, "url"] },
        { code: "invalid_url", path: ["data", "projects", "items", 1, "links", 2, "url"] },
        { code: "invalid_url", path: ["data", "contributions", "items", 0, "url"] },
      ],
    });
  });

  it("keeps Markdown and HTML text inert across active content modules and web destinations", () => {
    const profile = createEmptyProfile("en");
    const plain = "<script>[text](javascript:alert(1))</script>";
    const escaped = "&lt;script&gt;\\[text\\]\\(javascript&#58;alert\\(1\\)\\)&lt;/script&gt;";
    profile.visibility.technologies = true;
    profile.visibility.projects = true;
    profile.visibility.contributions = true;
    profile.data.technologies.groups = [
      {
        id: "\ud800",
        name: plain,
        items: [{ id: "opaque", name: plain, context: plain }],
      },
    ];
    profile.data.projects.items = [
      projectEntry({
        name: plain,
        role: plain,
        description: plain,
        technologies: [plain],
        links: [{ id: "link", label: plain, url: "https://example.com/a(b)?first=1&copy;=2" }],
      }),
    ];
    profile.data.contributions.items = [
      { id: "contribution", title: plain, description: plain, url: "" },
    ];
    const before = structuredClone(profile);
    const output = markdown(generateReadme(freezeDeep(profile)));
    expect(output).not.toContain("<script>");
    expect(output).not.toContain("[text](javascript:");
    expect(output).toContain(`### [${escaped}](<https://example.com/a(b)?first=1&amp;copy;=2>)`);
    expect(output).toContain(`- **${escaped}**: ${escaped}`);
    expect(output).toContain(`Role: ${escaped}`);
    expect(output).toContain(`Technologies: ${escaped}`);
    expect(output).not.toContain("Repository");
    expect(profile).toEqual(before);
  });
});
