import { z } from "zod";

const entryIdSchema = z.string().refine((id) => id.trim().length > 0, {
  params: { profileCode: "invalid_id" },
});

function entriesWithUniqueIds<T extends z.ZodType<{ id: string }>>(schema: T) {
  return z.array(schema).superRefine((items, context) => {
    const seen = new Set<string>();
    for (const [index, item] of items.entries()) {
      if (seen.has(item.id)) {
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          params: { profileCode: "duplicate_id" },
          message: "Entry IDs must be unique within their collection.",
        });
      }
      seen.add(item.id);
    }
  });
}

export const metricCardIds = Object.freeze(["calendar", "summary", "languages"] as const);
export type MetricCardId = (typeof metricCardIds)[number];

const selectedCardsSchema = z.array(z.enum(metricCardIds)).superRefine((cards, context) => {
  const seen = new Set<MetricCardId>();
  for (const [index, card] of cards.entries()) {
    if (seen.has(card)) {
      context.addIssue({
        code: "custom",
        path: [index],
        params: { profileCode: "duplicate_card" },
        message: "A metric card can only be selected once.",
      });
    }
    seen.add(card);
  }
});

const linkSchema = z.strictObject({
  id: entryIdSchema,
  label: z.string(),
  url: z.string(),
});

const technologySchema = z.strictObject({
  id: entryIdSchema,
  name: z.string(),
  context: z.string(),
});

const presentationV1Schema = z.strictObject({
  displayName: z.string(),
  headline: z.string(),
  bio: z.string(),
  location: z.string(),
});
const presentationAlignmentSchema = z.enum(["left", "center", "right"]);
const presentationLevelSchema = z.union([z.literal(1), z.literal(2), z.literal(3)]);

export const presentationFormatSchema = z.strictObject({
  displayNameLevel: presentationLevelSchema.optional(),
  displayNameAlignment: presentationAlignmentSchema.optional(),
  headlineLevel: presentationLevelSchema.optional(),
  headlineAlignment: presentationAlignmentSchema.optional(),
  bioAlignment: presentationAlignmentSchema.optional(),
  locationAlignment: presentationAlignmentSchema.optional(),
});
export type PresentationFormat = z.infer<typeof presentationFormatSchema>;

// Empty text is valid draft content. The exact v1 shape remains closed and independent.
export const moduleContentV1Schemas = Object.freeze({
  presentation: presentationV1Schema,
  knowledge: z.strictObject({
    items: entriesWithUniqueIds(
      z.strictObject({ id: entryIdSchema, title: z.string(), description: z.string() }),
    ),
  }),
  technologies: z.strictObject({
    groups: entriesWithUniqueIds(
      z.strictObject({
        id: entryIdSchema,
        name: z.string(),
        items: entriesWithUniqueIds(technologySchema),
      }),
    ),
  }),
  education: z.strictObject({
    items: entriesWithUniqueIds(
      z.strictObject({
        id: entryIdSchema,
        kind: z.enum(["degree", "course", "certification", "other"]).nullable(),
        title: z.string(),
        institution: z.string(),
        status: z.enum(["in-progress", "completed", "paused"]).nullable(),
        startDate: z.string(),
        endDate: z.string(),
        description: z.string(),
        url: z.string(),
      }),
    ),
  }),
  current: z.strictObject({
    items: entriesWithUniqueIds(
      z.strictObject({
        id: entryIdSchema,
        kind: z.enum(["work", "learning", "interests", "collaboration"]).nullable(),
        description: z.string(),
        url: z.string(),
      }),
    ),
  }),
  projects: z.strictObject({
    items: entriesWithUniqueIds(
      z.strictObject({
        id: entryIdSchema,
        name: z.string(),
        description: z.string(),
        role: z.string(),
        technologies: z.array(z.string()),
        links: entriesWithUniqueIds(linkSchema),
      }),
    ),
  }),
  contributions: z.strictObject({
    items: entriesWithUniqueIds(
      z.strictObject({
        id: entryIdSchema,
        title: z.string(),
        description: z.string(),
        url: z.string(),
      }),
    ),
  }),
  metrics: z.strictObject({ username: z.string(), cards: selectedCardsSchema }),
  contact: z.strictObject({ links: entriesWithUniqueIds(linkSchema) }),
});

export const moduleContentSchemas = Object.freeze({
  ...moduleContentV1Schemas,
  presentation: presentationV1Schema.extend({ format: presentationFormatSchema.optional() }),
});

export type ProfileModuleData = {
  [K in keyof typeof moduleContentSchemas]: z.infer<(typeof moduleContentSchemas)[K]>;
};
