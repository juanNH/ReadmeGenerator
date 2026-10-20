import { describe, expect, it } from "vitest";
import { createContributorExampleProfile } from "../profile/fixtures";
import { createEmptyProfile, createEmptyProfileV1 } from "../profile/profile-operations";
import type { ProfileDocument } from "../profile/profile-schema";
import { generateReadme } from "../readme";
import {
  PROJECT_FILE_MAX_BYTES,
  PROJECT_FILE_MAX_DEPTH,
  PROJECT_FILE_MAX_VALUES,
  parseProjectFile,
  serializeProjectFile,
} from "./index";

function completeDocument(): ProfileDocument {
  const document = createContributorExampleProfile();
  document.contentLocale = "es";
  document.data.presentation.format = {
    displayNameLevel: 3,
    displayNameAlignment: "center",
    headlineLevel: 2,
    headlineAlignment: "right",
    bioAlignment: "left",
    locationAlignment: "center",
  };
  document.data.presentation.location = "🇦🇷 Argentina";
  document.data.technologies.groups[0]!.name = "Mi categoría propia";
  document.visibility.projects = false;
  document.visibility.knowledge = true;
  document.visibility.education = true;
  document.visibility.current = true;
  document.customSections = [
    {
      id: "custom-\ud800",
      title: "Mi sección 👋",
      titleLevel: 1,
      titleAlignment: "center",
      visible: true,
      blocks: [
        { id: "paragraph", type: "paragraph", text: "  Texto\r\ncon saltos", alignment: "right" },
        {
          id: "unordered",
          type: "list",
          style: "unordered",
          items: [{ id: "item", text: "Sin normalizar \ufeff" }],
        },
        {
          id: "ordered",
          type: "list",
          style: "ordered",
          items: [{ id: "item", text: "Segundo listado" }],
        },
        { id: "link", type: "link", label: "Mi web", url: "https://example.com" },
        { id: "heading", type: "heading", text: "Título", level: 3, alignment: "left" },
        { id: "divider", type: "divider" },
        { id: "quote", type: "quote", text: "Una frase\n\nCon otra línea" },
        { id: "image", type: "image", url: "https://example.com/banner.png", alt: "Mi banner" },
        { id: "html", type: "html", source: '\ufeff<p align="center">Hola\r\n</p>' },
        {
          id: "code",
          type: "code",
          source: '\ufeff{\r\n  "name": "👋"\r\n}\r\n',
          language: "JSON",
        },
      ],
    },
    {
      id: "__proto__",
      title: "Oculta",
      visible: false,
      blocks: [{ id: "private", type: "paragraph", text: "Contenido conservado" }],
    },
  ];
  document.sectionOrder.splice(1, 0, { kind: "custom", sectionId: "custom-\ud800" });
  document.sectionOrder.push({ kind: "custom", sectionId: "__proto__" });
  document.sectionOrder.reverse();
  return document;
}

function serialize(document: ProfileDocument): string {
  const result = serializeProjectFile(document);
  if (!result.success) throw new Error(`Expected serialization, received ${result.code}`);
  return result.source;
}

function withExactFileBytes(
  targetBytes: number,
  unit = "x",
  pretty = false,
): { source: string; document: ProfileDocument } {
  const document = createEmptyProfile("en");
  const makeSource = () =>
    pretty ? `${JSON.stringify(document, null, 2)}\n` : JSON.stringify(document);
  const room = targetBytes - Buffer.byteLength(makeSource(), "utf8");
  const unitBytes = Buffer.byteLength(unit, "utf8");
  document.data.presentation.bio = unit.repeat(Math.floor(room / unitBytes));
  document.data.presentation.bio += "x".repeat(room % unitBytes);
  const source = makeSource();
  expect(Buffer.byteLength(source, "utf8")).toBe(targetBytes);
  return { source, document };
}

describe("project files", () => {
  it("round-trips authored v2 state, exact strings, hidden data and mixed identities", () => {
    const document = completeDocument();
    const before = structuredClone(document);
    const source = serialize(document);
    expect(source).toBe(`${JSON.stringify(document, null, 2)}\n`);
    expect(JSON.parse(source)).toEqual(document);
    const result = parseProjectFile(source);
    expect(result).toEqual({ success: true, document, sourceVersion: 2 });
    if (!result.success) throw new Error("Expected project");
    expect(result.document).not.toBe(document);
    expect(result.document.customSections[0]).not.toBe(document.customSections[0]);
    expect(result.document.data.presentation.format).toEqual(document.data.presentation.format);
    expect(document).toEqual(before);
  });

  it("preserves the generated README when a complete project is reopened", () => {
    const document = completeDocument();
    const result = parseProjectFile(serialize(document));
    if (!result.success) throw new Error("Expected project");
    const originalReadme = generateReadme(document, { activityCardBaseUrl: "https://example.com" });
    expect(originalReadme.success).toBe(true);
    expect(generateReadme(result.document, { activityCardBaseUrl: "https://example.com" })).toEqual(
      originalReadme,
    );
  });

  it("keeps old optional formatting absent rather than inserting defaults", () => {
    const document = createEmptyProfile("en");
    const result = parseProjectFile(serialize(document));
    expect(result).toEqual({ success: true, document, sourceVersion: 2 });
    if (!result.success) throw new Error("Expected project");
    expect(Object.hasOwn(result.document.data.presentation, "format")).toBe(false);
  });

  it("opens strict v1 in memory and always downloads its migrated v2 form", () => {
    const legacy = createEmptyProfileV1("es");
    legacy.data.presentation.bio = "Anterior \ufeff\r\n";
    legacy.visibility.knowledge = true;
    legacy.moduleOrder.reverse();
    const source = JSON.stringify(legacy);
    const result = parseProjectFile(source);
    expect(result.success).toBe(true);
    if (!result.success) throw new Error("Expected migrated project");
    expect(result.sourceVersion).toBe(1);
    expect(result.document.schemaVersion).toBe(2);
    expect(result.document.data).toEqual(legacy.data);
    expect(result.document.visibility).toEqual(legacy.visibility);
    expect(result.document.sectionOrder).toEqual(
      legacy.moduleOrder.map((moduleId) => ({ kind: "module", moduleId })),
    );
    expect(result.document.customSections).toEqual([]);
    expect(result.document).not.toHaveProperty("moduleOrder");
    expect(JSON.parse(serialize(result.document))).toEqual(result.document);
    expect(JSON.stringify(legacy)).toBe(source);
  });

  it("accepts exactly one optional exterior BOM while preserving authored BOMs", () => {
    const document = completeDocument();
    const source = serialize(document);
    expect(parseProjectFile(`\ufeff${source}`)).toEqual({
      success: true,
      document,
      sourceVersion: 2,
    });
    expect(parseProjectFile(`\ufeff\ufeff${source}`)).toEqual({
      success: false,
      code: "invalid_json",
    });
  });

  it.each(["", "   ", "{", "undefined", "<h1>Hola</h1>", '{"schemaVersion":2,}'])(
    "reports malformed JSON without interpreting or repairing it: %j",
    (source) => {
      expect(parseProjectFile(source)).toEqual({ success: false, code: "invalid_json" });
    },
  );

  it.each([null, true, 1, [], {}, { schemaVersion: 2 }])(
    "rejects JSON that is not a whole profile document: %j",
    (input) => {
      expect(parseProjectFile(JSON.stringify(input))).toMatchObject({
        success: false,
        code: "invalid_document",
      });
    },
  );

  it.each([0, 3, 999, "2", null])("reports unsupported document versions: %j", (version) => {
    expect(parseProjectFile(JSON.stringify({ schemaVersion: version }))).toEqual({
      success: false,
      code: "unsupported_version",
      issues: [{ code: "unsupported_version", path: ["schemaVersion"] }],
    });
  });

  it("rejects unknown fields instead of silently discarding them", () => {
    const document = completeDocument();
    const input = { ...document, snapshots: { secret: "must not disappear" } };
    expect(parseProjectFile(JSON.stringify(input))).toEqual({
      success: false,
      code: "invalid_document",
      issues: [{ code: "unknown_property", path: ["snapshots"] }],
    });
    expect(serializeProjectFile(input)).toEqual({ success: false, code: "invalid_document" });
  });

  it("keeps unfamiliar blocks and visual properties incompatible rather than losing them", () => {
    const document = completeDocument();
    const input = JSON.parse(JSON.stringify(document));
    input.customSections[0].blocks.push({ id: "future", type: "future-block", payload: "saved" });
    expect(parseProjectFile(JSON.stringify(input))).toMatchObject({
      success: false,
      code: "invalid_document",
    });
    input.customSections[0].blocks.pop();
    input.data.presentation.format.textColor = "red";
    expect(parseProjectFile(JSON.stringify(input))).toMatchObject({
      success: false,
      code: "invalid_document",
      issues: [{ code: "unknown_property", path: ["data", "presentation", "format", "textColor"] }],
    });
  });

  it("does not relax the legacy schema to accept presentation formatting", () => {
    const legacy = createEmptyProfileV1("en");
    const input = {
      ...legacy,
      data: { ...legacy.data, presentation: { ...legacy.data.presentation, format: {} } },
    };
    expect(parseProjectFile(JSON.stringify(input))).toMatchObject({
      success: false,
      code: "invalid_document",
      issues: [{ code: "unknown_property", path: ["data", "presentation", "format"] }],
    });
  });

  it("rejects inconsistent references and duplicate IDs", () => {
    const document = completeDocument();
    document.sectionOrder.push({ kind: "custom", sectionId: "missing" });
    expect(parseProjectFile(JSON.stringify(document))).toMatchObject({
      success: false,
      code: "invalid_document",
      issues: expect.arrayContaining([
        {
          code: "invalid_reference",
          path: ["sectionOrder", document.sectionOrder.length - 1, "sectionId"],
        },
      ]),
    });
    document.sectionOrder.pop();
    document.customSections[0]!.blocks.push(document.customSections[0]!.blocks[0]!);
    expect(parseProjectFile(JSON.stringify(document))).toMatchObject({
      success: false,
      code: "invalid_document",
      issues: expect.arrayContaining([
        { code: "duplicate_id", path: ["customSections", 0, "blocks", 10, "id"] },
      ]),
    });
  });

  it("saves incomplete and non-exportable README content without filtering source", () => {
    const document = createEmptyProfile("en");
    document.customSections = [
      {
        id: "draft",
        title: "",
        visible: true,
        blocks: [
          { id: "html", type: "html", source: `<p>${"x".repeat(30_001)}</p>` },
          { id: "code", type: "code", source: "unfinished code", language: "not a token" },
          { id: "image", type: "image", url: "javascript:unfinished", alt: "" },
          { id: "link", type: "link", label: "", url: "unfinished" },
        ],
      },
    ];
    document.sectionOrder.push({ kind: "custom", sectionId: "draft" });
    expect(generateReadme(document).success).toBe(false);
    expect(parseProjectFile(serialize(document))).toEqual({
      success: true,
      document,
      sourceVersion: 2,
    });
  });

  it.each(["x", "é", "€", "😀"])("counts the exact UTF-8 file boundary using %j", (unit) => {
    const { source, document } = withExactFileBytes(PROJECT_FILE_MAX_BYTES, unit);
    expect(parseProjectFile(source)).toEqual({ success: true, document, sourceVersion: 2 });
    expect(parseProjectFile(`${source} `)).toEqual({ success: false, code: "too_large" });
  });

  it("includes an exterior BOM in the UTF-8 byte limit", () => {
    const { source } = withExactFileBytes(PROJECT_FILE_MAX_BYTES - 3);
    expect(parseProjectFile(`\ufeff${source}`).success).toBe(true);
    expect(parseProjectFile(`\ufeff${source} `)).toEqual({ success: false, code: "too_large" });
  });

  it("reopens a download at exactly the byte limit and refuses to truncate a larger one", () => {
    const { source, document } = withExactFileBytes(PROJECT_FILE_MAX_BYTES, "😀");
    expect(serializeProjectFile(document)).toEqual({ success: true, source });
    document.data.presentation.bio += "x";
    const before = document.data.presentation.bio;
    expect(serializeProjectFile(document)).toEqual({ success: false, code: "too_large" });
    expect(document.data.presentation.bio).toBe(before);
  });

  it("uses compact JSON near the limit so an accepted project can still be downloaded", () => {
    const { source, document } = withExactFileBytes(PROJECT_FILE_MAX_BYTES);
    expect(parseProjectFile(source).success).toBe(true);
    expect(serializeProjectFile(document)).toEqual({ success: true, source });
  });

  it("checks the migrated v2 file budget before accepting a near-limit legacy project", () => {
    const legacy = createEmptyProfileV1("en");
    const room = PROJECT_FILE_MAX_BYTES - Buffer.byteLength(JSON.stringify(legacy), "utf8");
    legacy.data.presentation.bio = "x".repeat(room);
    const source = JSON.stringify(legacy);
    expect(Buffer.byteLength(source, "utf8")).toBe(PROJECT_FILE_MAX_BYTES);
    expect(parseProjectFile(source)).toEqual({ success: false, code: "too_large" });
  });

  it("treats braces, escaped quotes and backslashes inside source as content", () => {
    const document = createEmptyProfile("en");
    document.data.presentation.bio = `${"[{".repeat(100)} \\"escaped\\" ${"\\\\".repeat(40)}`;
    expect(parseProjectFile(serialize(document))).toEqual({
      success: true,
      document,
      sourceVersion: 2,
    });
  });

  it("bounds hostile nesting before validation without overflowing the call stack", () => {
    const source = `${"[".repeat(20_000)}null${"]".repeat(20_000)}`;
    expect(parseProjectFile(source)).toEqual({ success: false, code: "invalid_document" });
    expect(PROJECT_FILE_MAX_DEPTH).toBe(32);
  });

  it("bounds the number of values in a structurally plausible profile", () => {
    const document = createEmptyProfile("en");
    document.data.contact.links = Array.from(
      { length: PROJECT_FILE_MAX_VALUES / 4 },
      (_, index) => ({
        id: `link-${index}`,
        label: "",
        url: "",
      }),
    );
    expect(parseProjectFile(JSON.stringify(document))).toEqual({
      success: false,
      code: "invalid_document",
    });
    expect(serializeProjectFile(document)).toEqual({ success: false, code: "invalid_document" });
  });

  it("returns a diagnostic for cyclic or incompatible runtime data rather than throwing", () => {
    const document = createEmptyProfile("en");
    const cyclic = document as ProfileDocument & { self?: unknown };
    cyclic.self = cyclic;
    expect(serializeProjectFile(cyclic)).toEqual({ success: false, code: "invalid_document" });
    expect(serializeProjectFile(createEmptyProfileV1("en") as unknown as ProfileDocument)).toEqual({
      success: false,
      code: "invalid_document",
    });
  });
});
