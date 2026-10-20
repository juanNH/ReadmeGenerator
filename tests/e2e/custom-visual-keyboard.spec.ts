import { expect, test, type Page } from "@playwright/test";
import { createEmptyProfile } from "../../src/core/profile/profile-operations";
import type { CustomBlock } from "../../src/core/profile/custom-content";
import type { ProfileDocument } from "../../src/core/profile/profile-schema";

const draftKey = "github-profile-generator.profile.v2";
const sectionId = 'visual-section:\ud800/"]#\nprivate';
const headingId = "heading:\udfff/<private>";
const dividerId = 'divider:\ud800/"]#private';
const quoteId = "quote:__proto__/\udfff\nprivate";
const pickerNames = [
  "Add text",
  "Add bullet list",
  "Add numbered list",
  "Add link",
  "Add subtitle",
  "Add divider",
  "Add highlighted quote",
  "Add image / banner",
];

function visualProfile(blocks: CustomBlock[] = [], title = "Keyboard canvas"): ProfileDocument {
  const profile = createEmptyProfile("en");
  profile.customSections = [{ id: sectionId, title, visible: true, blocks }];
  profile.sectionOrder.splice(2, 0, { kind: "custom", sectionId });
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
    profile.customSections[0]!.title,
  );
}

async function storedProfile(page: Page): Promise<ProfileDocument> {
  return page.evaluate((key) => JSON.parse(localStorage.getItem(key) ?? "null"), draftKey);
}

test("all eight block cards keep their names and keyboard order, and a divider keeps focus when moved or removed", async ({
  page,
}) => {
  const profile = visualProfile();
  await openEditor(page, profile);
  const picker = page.getByRole("group", { name: "Add section content", exact: true });
  await expect(picker.getByRole("button")).toHaveCount(8);
  await expect(picker.getByRole("button").first()).toHaveAccessibleName("Add text");
  await picker.getByRole("button", { name: pickerNames[0], exact: true }).focus();
  for (const [index, name] of pickerNames.entries()) {
    const button = picker.getByRole("button", { name, exact: true });
    await expect(button).toBeFocused();
    await expect(button).toHaveAccessibleDescription(/.+/);
    if (index < pickerNames.length - 1) await page.keyboard.press("Tab");
  }
  expect((await storedProfile(page)).customSections[0]?.blocks).toEqual([]);

  const addDivider = picker.getByRole("button", { name: "Add divider", exact: true });
  await addDivider.focus();
  await addDivider.press("Enter");
  await expect(page.getByRole("heading", { name: "Divider 1", exact: true })).toBeFocused();
  const addText = picker.getByRole("button", { name: "Add text", exact: true });
  await addText.focus();
  await addText.press("Space");
  const paragraph = page.getByRole("textbox", { name: "Text", exact: true });
  await expect(paragraph).toBeFocused();
  await paragraph.fill("Keep this paragraph");
  const moveDivider = page.getByRole("button", { name: "Move Divider 1 down", exact: true });
  await moveDivider.focus();
  await moveDivider.press("Enter");
  await expect(page.getByRole("heading", { name: "Divider 2", exact: true })).toBeFocused();
  await expect
    .poll(async () =>
      (await storedProfile(page)).customSections[0]?.blocks.map((block) => block.type),
    )
    .toEqual(["paragraph", "divider"]);
  const removeDivider = page.getByRole("button", { name: "Remove Divider 2", exact: true });
  await removeDivider.focus();
  await removeDivider.press("Enter");
  await expect(paragraph).toBeFocused();
  await expect(paragraph).toHaveValue("Keep this paragraph");
  await expect(page.getByRole("heading", { name: /^Divider / })).toHaveCount(0);
  const removeText = page.getByRole("button", { name: "Remove Text block 1", exact: true });
  await removeText.focus();
  await removeText.press("Enter");
  await expect(addText).toBeFocused();
  await expect.poll(() => storedProfile(page)).toEqual(profile);
});

test("a section containing only an untitled divider confirms deletion and preserves the draft when canceled", async ({
  page,
}) => {
  const profile = visualProfile([{ id: dividerId, type: "divider" }], "");
  await openEditor(page, profile);
  const removeSection = page.getByRole("button", { name: "Delete section", exact: true });
  await removeSection.focus();
  const firstDialog = page.waitForEvent("dialog");
  const canceledAction = removeSection.press("Enter");
  const cancel = await firstDialog;
  expect(cancel.type()).toBe("confirm");
  expect(cancel.message()).toContain("Delete Custom section 1 and all its content?");
  await cancel.dismiss();
  await canceledAction;
  await expect(removeSection).toBeFocused();
  await expect(page.getByRole("heading", { name: "Divider 1", exact: true })).toBeVisible();
  expect(await storedProfile(page)).toEqual(profile);

  const secondDialog = page.waitForEvent("dialog");
  const confirmedAction = removeSection.press("Enter");
  const confirm = await secondDialog;
  expect(confirm.type()).toBe("confirm");
  await confirm.accept();
  await confirmedAction;
  await expect(page.getByRole("button", { name: "Delete section", exact: true })).toHaveCount(0);
  await expect(page.locator("#editor-section-title")).toBeFocused();
  await expect.poll(async () => (await storedProfile(page)).customSections).toEqual([]);
  const stored = await storedProfile(page);
  expect(stored.sectionOrder).toEqual(
    profile.sectionOrder.filter((reference) => reference.kind !== "custom"),
  );
  expect(stored.data).toEqual(profile.data);
  expect(stored.visibility).toEqual(profile.visibility);
});

test("subtitles and quotes keep dash prefixes as text, quote Enter preserves newlines and opaque block order survives reload", async ({
  page,
}) => {
  const profile = visualProfile([
    { id: headingId, type: "heading", text: "" },
    { id: dividerId, type: "divider" },
    { id: quoteId, type: "quote", text: "" },
  ]);
  await openEditor(page, profile);
  const subtitle = page.getByRole("textbox", { name: "Subtitle", exact: true });
  await subtitle.fill("- Personal subtitle");
  const quote = page.getByRole("textbox", { name: "Highlighted quote", exact: true });
  await quote.fill("- First line");
  await quote.press("End");
  await quote.press("Enter");
  await page.keyboard.insertText("Second line");
  await expect(quote).toHaveValue("- First line\nSecond line");
  await expect(page.getByRole("textbox", { name: /^List item / })).toHaveCount(0);
  const moveDivider = page.getByRole("button", { name: "Move Divider 2 up", exact: true });
  await moveDivider.focus();
  await moveDivider.press("Enter");
  await expect(page.getByRole("heading", { name: "Divider 1", exact: true })).toBeFocused();
  const expected = structuredClone(profile);
  expected.customSections[0]!.blocks = [
    { id: dividerId, type: "divider" },
    { id: headingId, type: "heading", text: "- Personal subtitle" },
    { id: quoteId, type: "quote", text: "- First line\nSecond line" },
  ];
  await expect.poll(() => storedProfile(page)).toEqual(expected);
  await page.reload();
  await expect(subtitle).toHaveValue("- Personal subtitle");
  await expect(quote).toHaveValue("- First line\nSecond line");
  await expect(page.getByRole("heading", { name: "Divider 1", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Subtitle 2", exact: true })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Highlighted quote 3", exact: true }),
  ).toBeVisible();
  const stored = await storedProfile(page);
  expect(stored).toEqual(expected);
  expect(Object.keys(stored).sort()).toEqual(Object.keys(profile).sort());
  expect(stored.customSections[0]?.blocks.map((block) => Object.keys(block).sort())).toEqual([
    ["id", "type"],
    ["id", "text", "type"],
    ["id", "text", "type"],
  ]);
  const domIds = await page
    .locator("[id]")
    .evaluateAll((elements) => elements.map((element) => element.id));
  for (const id of [sectionId, headingId, dividerId, quoteId]) {
    expect(domIds.some((domId) => domId.includes(id))).toBe(false);
  }
});
