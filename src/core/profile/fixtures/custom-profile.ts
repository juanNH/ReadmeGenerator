import { createEmptyProfile } from "../profile-operations";
import type { ProfileDocument } from "../profile-schema";

/** Fictional optional text, lists and links; repeated titles have independent identities. */
export function createCustomExampleProfile(): ProfileDocument {
  const document = createEmptyProfile("en");
  document.customSections = [
    {
      id: "custom-working-together",
      title: "Things I enjoy",
      visible: true,
      blocks: [
        { id: "paragraph", type: "paragraph", text: "Simple, accessible interfaces." },
        {
          id: "list",
          type: "list",
          style: "unordered",
          items: [
            { id: "one", text: "Sharing clear documentation" },
            { id: "two", text: "Building small useful tools" },
          ],
        },
        {
          id: "link",
          type: "link",
          label: "Fictional notes",
          url: "https://example.com/fictional-notes",
        },
      ],
    },
    {
      id: "custom-learning-next",
      title: "Things I enjoy",
      visible: false,
      blocks: [
        {
          id: "list",
          type: "list",
          style: "ordered",
          items: [{ id: "one", text: "Trying a small new idea" }],
        },
      ],
    },
  ];
  document.sectionOrder.splice(2, 0, {
    kind: "custom",
    sectionId: "custom-working-together",
  });
  document.sectionOrder.push({ kind: "custom", sectionId: "custom-learning-next" });
  return document;
}
