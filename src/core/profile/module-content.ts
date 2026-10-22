import { z } from "zod";
import { extendedOptionsSchema } from "../activity/extended-options";
import { extendedThemeIds } from "../activity/extended-themes";

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

const legacyMetricCardIds = ["calendar", "summary", "languages"] as const;
export const ownMetricCardIds = Object.freeze([
  ...legacyMetricCardIds,
  "panorama",
  "monthly",
] as const);
export type OwnMetricCardId = (typeof ownMetricCardIds)[number];
export const profileActivityCardIds = Object.freeze([
  ...ownMetricCardIds,
  "extended-stats",
  "extended-languages",
] as const);
export type ProfileActivityCardId = (typeof profileActivityCardIds)[number];
export const metricCardIds = Object.freeze([
  ...profileActivityCardIds,
  "extended-repository",
  "extended-gist",
  "extended-wakatime",
] as const);
export type MetricCardId = (typeof metricCardIds)[number];

function uniqueCards<T extends z.ZodType<string>>(schema: T) {
  return z.array(schema).superRefine((cards, context) => {
    const seen = new Set<string>();
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
}

export const cardAppearanceSchema = z.strictObject({
  theme: z.enum(["light", "dark"]).optional(),
  palette: z.enum(["forest", "ocean", "violet"]).optional(),
  design: z.enum(["classic", "panels", "minimal"]).optional(),
  size: z.enum(["compact", "wide"]).optional(),
  preset: z.enum(extendedThemeIds).optional(),
  titleColor: z
    .string()
    .regex(/^#[a-f\d]{6}$/i)
    .optional(),
  textColor: z
    .string()
    .regex(/^#[a-f\d]{6}$/i)
    .optional(),
  iconColor: z
    .string()
    .regex(/^#[a-f\d]{6}$/i)
    .optional(),
  borderColor: z
    .string()
    .regex(/^#[a-f\d]{6}$/i)
    .optional(),
  backgroundColor: z
    .string()
    .regex(/^#[a-f\d]{6}$/i)
    .optional(),
  backgroundGradient: z
    .strictObject({
      angle: z.number().min(0).max(360),
      colors: z
        .array(z.string().regex(/^#[a-f\d]{6}$/i))
        .min(2)
        .max(10),
    })
    .optional(),
  borderRadius: z.number().min(0).max(30).optional(),
  width: z.number().int().min(700).max(1200).optional(),
  lineHeight: z.number().int().min(22).max(50).optional(),
  customTitle: z.string().max(100).optional(),
  hideTitle: z.boolean().optional(),
  hideBorder: z.boolean().optional(),
  showIcons: z.boolean().optional(),
  textBold: z.boolean().optional(),
  numberFormat: z.enum(["short", "long"]).optional(),
  numberPrecision: z.number().int().min(0).max(2).optional(),
});
export type CardAppearance = z.infer<typeof cardAppearanceSchema>;

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
  metrics: z.strictObject({
    username: z.string(),
    cards: uniqueCards(z.enum(legacyMetricCardIds)),
  }),
  contact: z.strictObject({ links: entriesWithUniqueIds(linkSchema) }),
});

export const moduleContentSchemas = Object.freeze({
  ...moduleContentV1Schemas,
  presentation: presentationV1Schema.extend({ format: presentationFormatSchema.optional() }),
  projects: z.strictObject({
    items: entriesWithUniqueIds(
      moduleContentV1Schemas.projects.shape.items.element.extend({
        titleUrl: z.string().optional(),
        cover: z.strictObject({ url: z.string(), alt: z.string() }).optional(),
      }),
    ),
  }),
  metrics: z.strictObject({
    username: z.string(),
    cards: uniqueCards(z.enum(metricCardIds)),
    appearance: cardAppearanceSchema.optional(),
    extended: extendedOptionsSchema.optional(),
  }),
});

export type ProfileModuleData = {
  [K in keyof typeof moduleContentSchemas]: z.infer<(typeof moduleContentSchemas)[K]>;
};
