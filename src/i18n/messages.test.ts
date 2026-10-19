import { describe, expect, it } from "vitest";
import english from "@/messages/en.json";
import spanish from "@/messages/es.json";
import englishDesign from "@/messages/en/design-system.json";
import spanishDesign from "@/messages/es/design-system.json";
import englishEditor from "@/messages/en/editor.json";
import spanishEditor from "@/messages/es/editor.json";

function messageEntries(value: object, prefix = ""): Array<[string, string]> {
  return Object.entries(value).flatMap(([key, message]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof message === "string" ? [[path, message]] : messageEntries(message, path);
  });
}

function parameters(message: string) {
  return [...message.matchAll(/\{([\w]+)(?:[,}])/g)].map((match) => match[1]).sort();
}

describe("translation contracts", () => {
  it.each([
    ["shared interface", english, spanish],
    ["design system", englishDesign, spanishDesign],
    ["profile editor", englishEditor, spanishEditor],
  ])("keeps complete English and Spanish messages for %s", (_name, en, es) => {
    const englishEntries = messageEntries(en);
    const spanishEntries = new Map(messageEntries(es));

    expect([...spanishEntries.keys()].sort()).toEqual(englishEntries.map(([key]) => key).sort());
    for (const [key, message] of englishEntries) {
      const translated = spanishEntries.get(key);
      expect(message.trim(), key).not.toBe("");
      expect(translated?.trim(), key).toBeTruthy();
      expect(parameters(translated ?? ""), key).toEqual(parameters(message));
    }
  });
});
