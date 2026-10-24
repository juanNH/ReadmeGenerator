import type { Definition, Nodes, RootContent } from "mdast";
import { findTechnology } from "../technologies";
import type { ProfileModuleData } from "../profile/module-content";
import { normalizeContactUrl } from "../readme/contact-url";
import { normalizeWebUrl } from "../readme/web-url";
import { nodeLabel, plainText, referenceKey } from "./readme-import-ast";
import type { ReadmeImportModuleProposal } from "./readme-import-types";

export type ReadmeImportModuleId = ReadmeImportModuleProposal["moduleId"];

type SectionIdentity = {
  readonly id: string;
  readonly label: string;
  readonly title: string;
};

type ProposalResult = {
  readonly proposal?: ReadmeImportModuleProposal;
  readonly attemptedModule?: ReadmeImportModuleId;
};

const moduleAliases: Readonly<Record<ReadmeImportModuleId, readonly string[]>> = {
  presentation: ["about me", "about myself", "introduction", "introduccion", "presentacion"],
  technologies: [
    "technologies",
    "technology",
    "tech stack",
    "technology stack",
    "tools and technologies",
    "tecnologias",
    "herramientas y tecnologias",
    "stack tecnologico",
  ],
  projects: ["projects", "my projects", "selected projects", "proyectos", "mis proyectos"],
  contributions: [
    "contributions",
    "open source",
    "open source contributions",
    "contribuciones",
    "aportes",
    "aportes destacados",
  ],
  contact: [
    "contact",
    "contact me",
    "get in touch",
    "connect with me",
    "find me",
    "links",
    "contacto",
    "ponte en contacto",
    "conectemos",
    "encuentrame",
  ],
};

function normalizeHeading(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en")
    .replace(/[^\p{Letter}\p{Number}]+/gu, " ")
    .trim();
}

function moduleFromHeading(value: string): ReadmeImportModuleId | undefined {
  const normalized = normalizeHeading(value);
  return (Object.keys(moduleAliases) as ReadmeImportModuleId[]).find((moduleId) =>
    moduleAliases[moduleId].includes(normalized),
  );
}

function bodyAfterSectionHeading(
  nodes: readonly RootContent[],
  identity: SectionIdentity,
  expectedModule: ReadmeImportModuleId,
): RootContent[] {
  const first = nodes[0];
  if (!first || first.type !== "heading" || first.depth > 2) return [...nodes];
  const actual = moduleFromHeading(nodeLabel(first));
  const declared = moduleFromHeading(identity.title || identity.label);
  return actual === expectedModule || declared === expectedModule ? nodes.slice(1) : [...nodes];
}

function linkData(
  node: Nodes,
  definitions: ReadonlyMap<string, Definition>,
): {
  label: string;
  url: string;
} | null {
  if (node.type === "link") {
    const label = plainText(node);
    return label && !node.title ? { label, url: node.url } : null;
  }
  if (node.type === "linkReference") {
    const definition = definitions.get(referenceKey(node.identifier));
    const label = plainText(node);
    return definition && label && !definition.title ? { label, url: definition.url } : null;
  }
  return null;
}

function linkOnlyParagraph(
  node: RootContent,
  definitions: ReadonlyMap<string, Definition>,
): { label: string; url: string } | null {
  if (node.type !== "paragraph" || node.children.length !== 1) return null;
  return linkData(node.children[0]!, definitions);
}

function linkRows(
  nodes: readonly RootContent[],
  definitions: ReadonlyMap<string, Definition>,
): Array<{ label: string; url: string }> | null {
  const rows: Array<{ label: string; url: string }> = [];
  for (const node of nodes) {
    if (node.type === "definition") continue;
    if (node.type === "paragraph") {
      const link = linkOnlyParagraph(node, definitions);
      if (!link) return null;
      rows.push(link);
      continue;
    }
    if (node.type === "list" && !node.spread && (!node.ordered || node.start === 1)) {
      for (const item of node.children) {
        if (
          typeof item.checked === "boolean" ||
          item.children.length !== 1 ||
          item.children[0]?.type !== "paragraph"
        )
          return null;
        const link = linkOnlyParagraph(item.children[0], definitions);
        if (!link) return null;
        rows.push(link);
      }
      continue;
    }
    return null;
  }
  return rows.length > 0 ? rows : null;
}

function standaloneList(nodes: readonly RootContent[]): readonly RootContent[] | null {
  const content = nodes.filter((node) => node.type !== "definition");
  return content.length > 0 && content.every((node) => node.type === "list") ? content : null;
}

function simpleTechnologyNames(nodes: readonly RootContent[]): string[] | null {
  const lists = standaloneList(nodes);
  if (!lists) return null;
  const names: string[] = [];
  for (const list of lists) {
    if (list.type !== "list" || list.spread || (list.ordered && list.start !== 1)) return null;
    for (const item of list.children) {
      if (
        typeof item.checked === "boolean" ||
        item.children.length !== 1 ||
        item.children[0]?.type !== "paragraph"
      )
        return null;
      const name = plainText(item.children[0]);
      if (!name || !findTechnology(name)) return null;
      names.push(name.trim());
    }
  }
  return names.length > 0 ? names : null;
}

function projectList(
  nodes: readonly RootContent[],
  definitions: ReadonlyMap<string, Definition>,
): Array<{ name: string; description: string; url: string }> | null {
  const lists = standaloneList(nodes);
  if (!lists || lists.length !== 1 || lists[0]?.type !== "list") return null;
  const list = lists[0];
  if (list.spread || (list.ordered && list.start !== 1)) return null;
  const projects: Array<{ name: string; description: string; url: string }> = [];
  for (const item of list.children) {
    const paragraph = item.children[0];
    if (
      typeof item.checked === "boolean" ||
      item.children.length !== 1 ||
      paragraph?.type !== "paragraph" ||
      paragraph.children.length === 0
    )
      return null;
    const firstLink = linkData(paragraph.children[0]!, definitions);
    if (!firstLink) return null;
    const trailing = paragraph.children.slice(1);
    if (!trailing.every((child) => child.type === "text")) return null;
    const description = trailing
      .map((child) => (child.type === "text" ? child.value : ""))
      .join("")
      .replace(/^\s*(?:[-–—:|·]\s*)?/, "")
      .trim();
    const url = normalizeWebUrl(firstLink.url);
    if (!url) return null;
    projects.push({ name: firstLink.label.trim(), description, url });
  }
  return projects.length > 0 ? projects : null;
}

function paragraphText(nodes: readonly RootContent[]): string | null {
  const values: string[] = [];
  for (const node of nodes) {
    if (node.type === "definition") continue;
    if (node.type !== "paragraph") return null;
    const value = plainText(node);
    if (value === null) return null;
    if (value.trim()) values.push(value);
  }
  return values.length > 0 ? values.join("\n\n") : null;
}

function profileHeader(nodes: readonly RootContent[]): ProfileModuleData["presentation"] | null {
  const meaningful = nodes.filter((node) => node.type !== "definition");
  const first = meaningful[0];
  if (!first || first.type !== "heading" || first.depth !== 1) return null;
  const authoredTitle = plainText(first);
  if (!authoredTitle) return null;
  const greetingPatterns = [
    /^(?:hi|hello|hey)[,\s]+(?:i['’]m|i am)\s+(.+?)\s*[.!]?$/i,
    /^(?:hola)[,\s]+(?:soy|me llamo)\s+(.+?)\s*[.!]?$/i,
  ];
  const capturedName = greetingPatterns
    .map((pattern) => authoredTitle.match(pattern)?.[1]?.trim())
    .find((value) => value);
  if (!capturedName) return null;
  const nameTokens = capturedName.split(/\s+/u);
  if (nameTokens.length > 4 || nameTokens.some((token) => !/^\p{Lu}[\p{L}'’.-]*$/u.test(token)))
    return null;

  let cursor = 1;
  let headline = "";
  const next = meaningful[cursor];
  if (next?.type === "heading" && next.depth === 2) {
    const value = plainText(next);
    if (!value) return null;
    headline = value;
    cursor++;
  }
  const bio = paragraphText(meaningful.slice(cursor));
  if (!headline && !bio) return null;
  return { displayName: capturedName, headline, bio: bio ?? "", location: "" };
}

function asProposal(
  section: SectionIdentity,
  nodes: readonly RootContent[],
  definitions: ReadonlyMap<string, Definition>,
  hintedModule?: ReadmeImportModuleId,
): ProposalResult {
  const moduleId = hintedModule ?? moduleFromHeading(section.title || section.label);
  // A profile greeting is a recognizable structural shape on its own. Requiring
  // a module heading here would make the common `# Hi, I'm Name` form impossible
  // to restore even though its content carries stronger evidence than a title.
  if (!moduleId) {
    const data = profileHeader(nodes);
    return data
      ? {
          proposal: {
            moduleId: "presentation",
            confidence: "strong",
            reason: "profile_header",
            data,
          },
        }
      : {};
  }
  if (moduleId === "presentation") {
    const data = profileHeader(nodes);
    return data
      ? { proposal: { moduleId, confidence: "strong", reason: "profile_header", data } }
      : { attemptedModule: moduleId };
  }

  if (!moduleId) return {};
  const body = bodyAfterSectionHeading(nodes, section, moduleId);

  if (moduleId === "contact") {
    const links = linkRows(body, definitions);
    if (!links) return { attemptedModule: moduleId };
    const normalized = links.map((link, index) => {
      const url = normalizeContactUrl(link.url);
      return url ? { id: `${section.id}-contact-${index + 1}`, label: link.label, url } : null;
    });
    if (normalized.some((link) => link === null)) return { attemptedModule: moduleId };
    return {
      proposal: {
        moduleId,
        confidence: "strong",
        reason: "contact_links",
        data: {
          links: normalized.filter((link): link is NonNullable<typeof link> => link !== null),
        },
      },
    };
  }

  if (moduleId === "technologies") {
    const names = simpleTechnologyNames(body);
    if (!names) return { attemptedModule: moduleId };
    return {
      proposal: {
        moduleId,
        confidence: "strong",
        reason: "technology_catalog_list",
        data: {
          groups: [
            {
              id: `${section.id}-technology-group`,
              name: "",
              items: names.map((name, index) => ({
                id: `${section.id}-technology-${index + 1}`,
                name,
                context: "",
              })),
            },
          ],
        },
      },
    };
  }

  if (moduleId === "projects" || moduleId === "contributions") {
    const rows = projectList(body, definitions);
    if (!rows) return { attemptedModule: moduleId };
    if (moduleId === "projects") {
      return {
        proposal: {
          moduleId,
          confidence: "strong",
          reason: "project_link_list",
          data: {
            items: rows.map((row, index) => ({
              id: `${section.id}-project-${index + 1}`,
              name: row.name,
              description: row.description,
              role: "",
              technologies: [],
              links: [],
              titleUrl: row.url,
            })),
          },
        },
      };
    }
    return {
      proposal: {
        moduleId,
        confidence: "strong",
        reason: "contribution_link_list",
        data: {
          items: rows.map((row, index) => ({
            id: `${section.id}-contribution-${index + 1}`,
            title: row.name,
            description: row.description,
            url: row.url,
          })),
        },
      },
    };
  }

  return { attemptedModule: moduleId };
}

/**
 * Proposes a fixed module only when a known heading is backed by a narrow, parseable shape.
 * Callers keep the original blocks as a custom fallback if the proposal is not selected.
 */
export function proposeReadmeModule(
  section: SectionIdentity,
  nodes: readonly RootContent[],
  definitions: ReadonlyMap<string, Definition>,
  hintedModule?: ReadmeImportModuleId,
): ProposalResult {
  return asProposal(section, nodes, definitions, hintedModule);
}

/** Useful to distinguish an unsupported heading from a generic custom title. */
export function suggestedReadmeModule(value: string): ReadmeImportModuleId | undefined {
  return moduleFromHeading(value);
}
