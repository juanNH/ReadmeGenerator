import { describe, expect, it } from "vitest";
import english from "@/messages/en.json";
import spanish from "@/messages/es.json";
import englishDesign from "@/messages/en/design-system.json";
import spanishDesign from "@/messages/es/design-system.json";
import englishEditor from "@/messages/en/editor.json";
import spanishEditor from "@/messages/es/editor.json";
import englishNavigation from "@/messages/en/editor-navigation.json";
import spanishNavigation from "@/messages/es/editor-navigation.json";
import englishContactProviders from "@/messages/en/contact-providers.json";
import spanishContactProviders from "@/messages/es/contact-providers.json";
import englishContributions from "@/messages/en/modules/contributions.json";
import spanishContributions from "@/messages/es/modules/contributions.json";
import englishTechnologies from "@/messages/en/modules/technologies.json";
import spanishTechnologies from "@/messages/es/modules/technologies.json";
import englishProjects from "@/messages/en/modules/projects.json";
import spanishProjects from "@/messages/es/modules/projects.json";
import englishCustom from "@/messages/en/modules/custom.json";
import spanishCustom from "@/messages/es/modules/custom.json";
import englishImport from "@/messages/en/readme-import.json";
import spanishImport from "@/messages/es/readme-import.json";
import englishCodeEditor from "@/messages/en/code-editor.json";
import spanishCodeEditor from "@/messages/es/code-editor.json";

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
    ["editor navigation", englishNavigation, spanishNavigation],
    ["contact providers", englishContactProviders, spanishContactProviders],
    ["contributions", englishContributions, spanishContributions],
    ["technologies", englishTechnologies, spanishTechnologies],
    ["projects", englishProjects, spanishProjects],
    ["custom sections", englishCustom, spanishCustom],
    ["README import", englishImport, spanishImport],
    ["code editor", englishCodeEditor, spanishCodeEditor],
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
