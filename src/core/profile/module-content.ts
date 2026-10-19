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

// Empty text is valid draft content. Rendering and export require separate checks.
export const moduleContentSchemas = Object.freeze({
  presentation: z.strictObject({
    displayName: z.string(),
    headline: z.string(),
    bio: z.string(),
    location: z.string(),
  }),
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

export type ProfileModuleData = {
  [K in keyof typeof moduleContentSchemas]: z.infer<(typeof moduleContentSchemas)[K]>;
};
