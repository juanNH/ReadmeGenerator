import { showSectionOrganizer } from "./editor-test-helpers";
import { expect, test, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";

const draftKey = "github-profile-generator.profile.v2";
const notesId = 'private-section:\ud800/"]#\nnotes';
const exploringId = "custom:constructor/\udfff\nexploring";
const hiddenId = "__proto__";
const paragraphId = "private-block:\ud800/<paragraph>";
const listId = 'private-block:\udfff/"]#list';
const itemId = "private-item:\ud800/#one";

function keyboardProfile(): ProfileDocument {
  const profile = createEmptyProfile("en");
  profile.visibility.technologies = true;
  profile.visibility.projects = true;
  profile.visibility.knowledge = true;
  profile.visibility.education = true;
  profile.visibility.current = true;
  profile.data.knowledge.items = [{ id: "old", title: "Keep retired data", description: "Saved" }];
  profile.data.technologies.groups = [
    { id: "tools", name: "", items: [{ id: "react", name: "React", context: "" }] },
  ];
  profile.data.projects.items = [
    {
      id: "project",
      name: "A small notebook",
      description: "Keep this project",
      role: "",
      technologies: [],
      links: [],
    },
  ];
  profile.customSections = [
    {
      id: notesId,
      title: "Keyboard notes",
      visible: true,
      blocks: [
        { id: paragraphId, type: "paragraph", text: "" },
        {
          id: listId,
          type: "list",
          style: "unordered",
          items: [{ id: itemId, text: "Composing a new idea" }],
        },
      ],
    },
    {
      id: hiddenId,
      title: "Hidden notes",
      visible: false,
      blocks: [{ id: "hidden-text", type: "paragraph", text: "Keep this hidden content" }],
    },
    {
      id: exploringId,
      title: "Exploring",
      visible: true,
      blocks: [{ id: "exploring-text", type: "paragraph", text: "Keep my selected section" }],
    },
  ];
  profile.sectionOrder = [
    { kind: "module", moduleId: "presentation" },
    { kind: "module", moduleId: "knowledge" },
    { kind: "custom", sectionId: notesId },
    { kind: "module", moduleId: "technologies" },
    { kind: "module", moduleId: "education" },
    { kind: "custom", sectionId: hiddenId },
    { kind: "module", moduleId: "current" },
    { kind: "custom", sectionId: exploringId },
    { kind: "module", moduleId: "projects" },
    { kind: "module", moduleId: "contributions" },
    { kind: "module", moduleId: "metrics" },
    { kind: "module", moduleId: "contact" },
  ];
  return profile;
}

async function openEditor(page: Page, profile: ProfileDocument) {
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto("/en");
  await page.evaluate(({ key, value }) => localStorage.setItem(key, value), {
    key: draftKey,
    value: JSON.stringify(profile),
  });
  await page.goto("/en/editor");
  await expect(page.getByRole("textbox", { name: "Section title", exact: true })).toHaveValue(
    "Keyboard notes",
  );
}

async function storedProfile(page: Page): Promise<ProfileDocument> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), draftKey);
}

async function expectNavigationOrder(page: Page, ids: string[]) {
  await showSectionOrganizer(page);
  const navigation = page.getByRole("navigation", {
    name: "Your sections",
    exact: true,
    includeHidden: true,
  });
  await expect
    .poll(() =>
      navigation
        .locator("li[data-module-id]:not([data-dnd-placeholder])")
        .evaluateAll((items) =>
          items.slice(0, 4).map((item) => item.getAttribute("data-module-id")),
        ),
    )
    .toEqual(ids);
}

async function expectSafeDomIds(page: Page) {
  // Opaque document identities may be diagnostic data attributes; control IDs and
  // label/ARIA references must come from the UI, without embedding those identities.
  const identities = [notesId, exploringId, hiddenId, paragraphId, listId, itemId];
  const attributes = await page
    .locator("[id], label[for], [aria-labelledby], [aria-describedby], [aria-controls]")
    .evaluateAll((elements) =>
      elements.flatMap((element) =>
        ["id", "for", "aria-labelledby", "aria-describedby", "aria-controls"]
          .map((name) => element.getAttribute(name))
          .filter((value): value is string => value !== null),
      ),
    );
  for (const identity of identities) {
    expect(attributes.some((value) => value.includes(identity))).toBe(false);
  }
  expect(attributes.some((value) => /[\u0000-\u001f\ud800-\udfff]/u.test(value))).toBe(false);
}

test("keyboard dropping a custom section across a built-in preserves hidden slots, opaque IDs and selection", async ({
  page,
}) => {
  const profile = keyboardProfile();
  await openEditor(page, profile);
  const navigation = page.getByRole("navigation", {
    name: "Your sections",
    exact: true,
    includeHidden: true,
  });
  await showSectionOrganizer(page);
  await navigation
    .getByRole("button", { name: "Exploring", exact: true, includeHidden: true })
    .click();
  const title = page.getByRole("textbox", { name: "Section title", exact: true });
  await expect(title).toHaveValue("Exploring");
  await showSectionOrganizer(page);
  const handle = navigation.getByRole("button", {
    name: "Drag Keyboard notes to reorder",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await expectNavigationOrder(page, [
    "technologies",
    `custom:${notesId}`,
    `custom:${exploringId}`,
    "projects",
  ]);
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "false");
  await expect(handle).toBeFocused();
  const order = [...profile.sectionOrder];
  [order[2], order[3]] = [order[3]!, order[2]!];
  await expect.poll(async () => (await storedProfile(page)).sectionOrder).toEqual(order);
  const stored = await storedProfile(page);
  expect(stored.data).toEqual(profile.data);
  expect(stored.visibility).toEqual(profile.visibility);
  expect(stored.customSections).toEqual(profile.customSections);
  await expect(page.locator("#editor-section-title")).toHaveText("Custom section 3");
  await expect(title).toHaveValue("Exploring");
  await expect(
    navigation.getByRole("button", { name: "Exploring", exact: true, includeHidden: true }),
  ).toHaveAttribute("aria-current", "step");
  await expectSafeDomIds(page);
  await page.reload();
  await expectNavigationOrder(page, [
    "technologies",
    `custom:${notesId}`,
    `custom:${exploringId}`,
    "projects",
  ]);
  expect((await storedProfile(page)).sectionOrder).toEqual(order);
  await showSectionOrganizer(page);
  await navigation
    .getByRole("button", { name: "Keyboard notes", exact: true, includeHidden: true })
    .click();
  await expect(page.getByRole("textbox", { name: "Text", exact: true })).toHaveValue("");
  await expectSafeDomIds(page);
});

test("Escape cancels a mixed keyboard drag without persisting its projected order or changing the editor", async ({
  page,
}) => {
  const profile = keyboardProfile();
  await openEditor(page, profile);
  const navigation = page.getByRole("navigation", {
    name: "Your sections",
    exact: true,
    includeHidden: true,
  });
  await showSectionOrganizer(page);
  await navigation
    .getByRole("button", { name: "Exploring", exact: true, includeHidden: true })
    .click();
  await showSectionOrganizer(page);
  const handle = navigation.getByRole("button", {
    name: "Drag Keyboard notes to reorder",
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await expect(handle).toHaveAttribute("aria-pressed", "true");
  await page.keyboard.press("ArrowRight");
  await expectNavigationOrder(page, [
    "technologies",
    `custom:${notesId}`,
    `custom:${exploringId}`,
    "projects",
  ]);
  expect((await storedProfile(page)).sectionOrder).toEqual(profile.sectionOrder);
  await page.keyboard.press("Escape");
  await expect(handle).toHaveAttribute("aria-pressed", "false");
  await expect(handle).toBeFocused();
  await expectNavigationOrder(page, [
    `custom:${notesId}`,
    "technologies",
    `custom:${exploringId}`,
    "projects",
  ]);
  await expect(page.locator("#editor-section-title")).toHaveText("Custom section 3");
  await expect(page.getByRole("textbox", { name: "Section title", exact: true })).toHaveValue(
    "Exploring",
  );
  expect(await storedProfile(page)).toEqual(profile);
  // Reload flushes any pending draft write; a canceled projection must remain unsaved.
  await page.reload();
  await expectNavigationOrder(page, [
    `custom:${notesId}`,
    "technologies",
    `custom:${exploringId}`,
    "projects",
  ]);
  expect(await storedProfile(page)).toEqual(profile);
});

test("IME composition keeps a dash-prefixed paragraph as text until composition ends", async ({
  page,
}) => {
  const profile = keyboardProfile();
  await openEditor(page, profile);
  const paragraph = page
    .getByRole("group", { name: "Text block 1", exact: true })
    .getByRole("textbox", { name: "Text", exact: true });
  await paragraph.focus();
  // Native event objects exercise the browser/React composition boundary. This
  // does not claim coverage of physical OS input methods or their candidate UI.
  await paragraph.evaluate((control) =>
    control.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" })),
  );
  await paragraph.fill("- 考え中");
  await expect(paragraph).toHaveValue("- 考え中");
  await expect(page.getByRole("group", { name: "Bullet list 1", exact: true })).toHaveCount(0);
  await expect
    .poll(async () => (await storedProfile(page)).customSections[0]?.blocks[0])
    .toEqual({ id: paragraphId, type: "paragraph", text: "- 考え中" });
  await paragraph.evaluate((control) =>
    control.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "考え中" }),
    ),
  );
  const converted = page
    .getByRole("group", { name: "Bullet list 1", exact: true })
    .getByRole("textbox", { name: "List item 1", exact: true });
  await expect(converted).toHaveValue("考え中");
  await expect(converted).toBeFocused();
  await expect
    .poll(async () => (await storedProfile(page)).customSections[0]?.blocks[0]?.type)
    .toBe("list");
  expect((await storedProfile(page)).customSections[0]?.blocks[0]?.id).toBe(paragraphId);
  await expectSafeDomIds(page);
});

test("Enter remains unconsumed during list composition and adds an item after composition ends", async ({
  page,
}) => {
  await openEditor(page, keyboardProfile());
  const list = page.getByRole("group", { name: "Bullet list 2", exact: true });
  const first = list.getByRole("textbox", { name: "List item 1", exact: true });
  await first.focus();
  await first.evaluate((control) =>
    control.dispatchEvent(new CompositionEvent("compositionstart", { bubbles: true, data: "" })),
  );
  await first.fill("まだ入力中");
  // Both native isComposing and an active composition lifecycle protect Enter.
  for (const isComposing of [true, false]) {
    const prevented = await first.evaluate((control, composing) => {
      const event = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        bubbles: true,
        cancelable: true,
        isComposing: composing,
      });
      control.dispatchEvent(event);
      return event.defaultPrevented;
    }, isComposing);
    expect(prevented).toBe(false);
  }
  await expect(list.getByRole("textbox")).toHaveCount(1);
  await expect(first).toHaveValue("まだ入力中");
  await expect(first).toBeFocused();
  await first.evaluate((control) =>
    control.dispatchEvent(
      new CompositionEvent("compositionend", { bubbles: true, data: "まだ入力中" }),
    ),
  );
  await first.press("End");
  await first.press("Enter");
  await expect(list.getByRole("textbox", { name: "List item 2", exact: true })).toBeFocused();
  await expect(list.getByRole("textbox")).toHaveCount(2);
  await expect(first).toHaveValue("まだ入力中");
  await expect
    .poll(async () => {
      const block = (await storedProfile(page)).customSections[0]?.blocks.find(
        (entry) => entry.id === listId,
      );
      return block?.type === "list" ? block.items.map((item) => item.text) : null;
    })
    .toEqual(["まだ入力中", ""]);
});
