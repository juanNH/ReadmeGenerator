import { z } from "zod";
import { moduleIds } from "../modules/module-ids";
import { moduleContentSchemas } from "./module-content";

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

export const profileDocumentSchema = z.strictObject({
  schemaVersion: z.literal(1),
  contentLocale: contentLocaleSchema,
  data: z.strictObject(moduleContentSchemas),
  moduleOrder: moduleOrderSchema,
  visibility: visibilitySchema,
});

export type ProfileDocument = z.infer<typeof profileDocumentSchema>;
