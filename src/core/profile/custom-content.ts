import { z } from "zod";

/** IDs are opaque authored-document identities, not DOM IDs or required UUIDs. */
export const customEntryIdSchema = z.string().refine((id) => id.trim().length > 0, {
  params: { profileCode: "invalid_id" },
});

function uniqueEntries<T extends z.ZodType<{ id: string }>>(schema: T) {
  return z.array(schema).superRefine((entries, context) => {
    const seen = new Set<string>();
    for (const [index, entry] of entries.entries()) {
      if (seen.has(entry.id)) {
        context.addIssue({
          code: "custom",
          path: [index, "id"],
          params: { profileCode: "duplicate_id" },
          message: "Entry IDs must be unique within their collection.",
        });
      }
      seen.add(entry.id);
    }
  });
}

export const customListItemSchema = z.strictObject({
  id: customEntryIdSchema,
  text: z.string(),
});

export const customBlockSchema = z.discriminatedUnion("type", [
  z.strictObject({
    id: customEntryIdSchema,
    type: z.literal("paragraph"),
    text: z.string(),
  }),
  z.strictObject({
    id: customEntryIdSchema,
    type: z.literal("list"),
    style: z.enum(["unordered", "ordered"]),
    items: uniqueEntries(customListItemSchema),
  }),
  z.strictObject({
    id: customEntryIdSchema,
    type: z.literal("link"),
    label: z.string(),
    url: z.string(),
  }),
  z.strictObject({
    id: customEntryIdSchema,
    type: z.literal("heading"),
    text: z.string(),
  }),
  z.strictObject({
    id: customEntryIdSchema,
    type: z.literal("divider"),
  }),
  z.strictObject({
    id: customEntryIdSchema,
    type: z.literal("quote"),
    text: z.string(),
  }),
  z.strictObject({
    id: customEntryIdSchema,
    type: z.literal("image"),
    url: z.string(),
    alt: z.string(),
  }),
  z.strictObject({
    id: customEntryIdSchema,
    type: z.literal("html"),
    source: z.string(),
  }),
]);

export const customSectionSchema = z.strictObject({
  id: customEntryIdSchema,
  title: z.string(),
  visible: z.boolean(),
  blocks: uniqueEntries(customBlockSchema),
});

export const customSectionsSchema = uniqueEntries(customSectionSchema);

export type CustomListItem = z.infer<typeof customListItemSchema>;
export type CustomBlock = z.infer<typeof customBlockSchema>;
export type CustomSection = z.infer<typeof customSectionSchema>;
