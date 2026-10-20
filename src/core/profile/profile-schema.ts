import { z } from "zod";
import { moduleIds } from "../modules/module-ids";
import { moduleContentSchemas } from "./module-content";
import { customEntryIdSchema, customSectionsSchema } from "./custom-content";

export const contentLocaleSchema = z.enum(["en", "es"]);
export type ContentLocale = z.infer<typeof contentLocaleSchema>;

export const moduleOrderSchema = z.array(z.enum(moduleIds)).superRefine((order, context) => {
  if (order.length !== moduleIds.length) {
    context.addIssue({
      code: "custom",
      params: { profileCode: "invalid_order" },
      message: "Module order must include every module exactly once.",
    });
  }
  const seen = new Set<string>();
  for (const [index, id] of order.entries()) {
    if (seen.has(id)) {
      context.addIssue({
        code: "custom",
        path: [index],
        params: { profileCode: "invalid_order" },
        message: "Module order cannot repeat a module.",
      });
    }
    seen.add(id);
  }
});

const visibilitySchema = z.strictObject({
  presentation: z.boolean(),
  knowledge: z.boolean(),
  technologies: z.boolean(),
  education: z.boolean(),
  current: z.boolean(),
  projects: z.boolean(),
  contributions: z.boolean(),
  metrics: z.boolean(),
  contact: z.boolean(),
});

/** The exact legacy format remains closed; migration never accepts extra v2 fields here. */
export const profileDocumentV1Schema = z.strictObject({
  schemaVersion: z.literal(1),
  contentLocale: contentLocaleSchema,
  data: z.strictObject(moduleContentSchemas),
  moduleOrder: moduleOrderSchema,
  visibility: visibilitySchema,
});

export type ProfileDocumentV1 = z.infer<typeof profileDocumentV1Schema>;

export const sectionReferenceSchema = z.discriminatedUnion("kind", [
  z.strictObject({ kind: z.literal("module"), moduleId: z.enum(moduleIds) }),
  z.strictObject({ kind: z.literal("custom"), sectionId: customEntryIdSchema }),
]);

export type SectionReference = z.infer<typeof sectionReferenceSchema>;

/** One mixed order includes every fixed slot, also hidden and retired ones. */
export const sectionOrderSchema = z.array(sectionReferenceSchema).superRefine((order, context) => {
  const modules = new Set<string>();
  const custom = new Set<string>();
  for (const [index, reference] of order.entries()) {
    const seen = reference.kind === "module" ? modules : custom;
    const id = reference.kind === "module" ? reference.moduleId : reference.sectionId;
    if (seen.has(id)) {
      context.addIssue({
        code: "custom",
        path: [index],
        params: { profileCode: "invalid_order" },
        message: "A section reference can only occur once.",
      });
    }
    seen.add(id);
  }
  if (modules.size !== moduleIds.length) {
    context.addIssue({
      code: "custom",
      params: { profileCode: "invalid_order" },
      message: "Section order must include every fixed module exactly once.",
    });
  }
});

export const profileDocumentSchema = z
  .strictObject({
    schemaVersion: z.literal(2),
    contentLocale: contentLocaleSchema,
    data: z.strictObject(moduleContentSchemas),
    visibility: visibilitySchema,
    sectionOrder: sectionOrderSchema,
    customSections: customSectionsSchema,
  })
  .superRefine((document, context) => {
    const sections = new Set(document.customSections.map((section) => section.id));
    const references = new Set<string>();
    for (const [index, reference] of document.sectionOrder.entries()) {
      if (reference.kind !== "custom") continue;
      references.add(reference.sectionId);
      if (!sections.has(reference.sectionId)) {
        context.addIssue({
          code: "custom",
          path: ["sectionOrder", index, "sectionId"],
          params: { profileCode: "invalid_reference" },
          message: "Custom section references must identify an existing section.",
        });
      }
    }
    for (const [index, section] of document.customSections.entries()) {
      if (!references.has(section.id)) {
        context.addIssue({
          code: "custom",
          path: ["customSections", index, "id"],
          params: { profileCode: "invalid_reference" },
          message: "Every custom section must have exactly one order reference.",
        });
      }
    }
  });

export type ProfileDocument = z.infer<typeof profileDocumentSchema>;
