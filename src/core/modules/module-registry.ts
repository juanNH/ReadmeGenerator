import type { ModuleId } from "./module-ids";
import { moduleContentSchemas, type ProfileModuleData } from "../profile/module-content";

type ModuleRegistry = {
  readonly [K in ModuleId]: {
    readonly id: K;
    readonly labelKey: K;
    readonly schema: (typeof moduleContentSchemas)[K];
    readonly createEmptyData: () => ProfileModuleData[K];
  };
};

// labelKey resolves in the UI's Modules namespace; core never resolves translations.
export const moduleRegistry = Object.freeze({
  presentation: {
    id: "presentation",
    labelKey: "presentation",
    schema: moduleContentSchemas.presentation,
    createEmptyData: (): ProfileModuleData["presentation"] => ({
      displayName: "",
      headline: "",
      bio: "",
      location: "",
    }),
  },
  knowledge: {
    id: "knowledge",
    labelKey: "knowledge",
    schema: moduleContentSchemas.knowledge,
    createEmptyData: (): ProfileModuleData["knowledge"] => ({ items: [] }),
  },
  technologies: {
    id: "technologies",
    labelKey: "technologies",
    schema: moduleContentSchemas.technologies,
    createEmptyData: (): ProfileModuleData["technologies"] => ({ groups: [] }),
  },
  education: {
    id: "education",
    labelKey: "education",
    schema: moduleContentSchemas.education,
    createEmptyData: (): ProfileModuleData["education"] => ({ items: [] }),
  },
  current: {
    id: "current",
    labelKey: "current",
    schema: moduleContentSchemas.current,
    createEmptyData: (): ProfileModuleData["current"] => ({ items: [] }),
  },
  projects: {
    id: "projects",
    labelKey: "projects",
    schema: moduleContentSchemas.projects,
    createEmptyData: (): ProfileModuleData["projects"] => ({ items: [] }),
  },
  contributions: {
    id: "contributions",
    labelKey: "contributions",
    schema: moduleContentSchemas.contributions,
    createEmptyData: (): ProfileModuleData["contributions"] => ({ items: [] }),
  },
  metrics: {
    id: "metrics",
    labelKey: "metrics",
    schema: moduleContentSchemas.metrics,
    createEmptyData: (): ProfileModuleData["metrics"] => ({ username: "", cards: [] }),
  },
  contact: {
    id: "contact",
    labelKey: "contact",
    schema: moduleContentSchemas.contact,
    createEmptyData: (): ProfileModuleData["contact"] => ({ links: [] }),
  },
} as const satisfies ModuleRegistry);
