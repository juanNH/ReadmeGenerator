export const moduleIds = Object.freeze([
  "presentation",
  "knowledge",
  "technologies",
  "education",
  "current",
  "projects",
  "contributions",
  "metrics",
  "contact",
] as const);

export type ModuleId = (typeof moduleIds)[number];

export const defaultModuleOrder = moduleIds;

export function isModuleId(value: unknown): value is ModuleId {
  return typeof value === "string" && moduleIds.some((id) => id === value);
}
