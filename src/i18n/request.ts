import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing } from "./routing";

const loadMessages = {
  en: async () => {
    const [
      common,
      designSystem,
      editor,
      contributions,
      technologies,
      projects,
      editorNavigation,
      contactProviders,
      custom,
    ] = await Promise.all([
      import("@/messages/en.json"),
      import("@/messages/en/design-system.json"),
      import("@/messages/en/editor.json"),
      import("@/messages/en/modules/contributions.json"),
      import("@/messages/en/modules/technologies.json"),
      import("@/messages/en/modules/projects.json"),
      import("@/messages/en/editor-navigation.json"),
      import("@/messages/en/contact-providers.json"),
      import("@/messages/en/modules/custom.json"),
    ]);
    return {
      ...common.default,
      DesignSystem: designSystem.default,
      Editor: editor.default,
      EditorNavigation: editorNavigation.default,
      ContactProviders: contactProviders.default,
      EditorModules: {
        contributions: contributions.default,
        technologies: technologies.default,
        projects: projects.default,
        custom: custom.default,
      },
    };
  },
  es: async () => {
    const [
      common,
      designSystem,
      editor,
      contributions,
      technologies,
      projects,
      editorNavigation,
      contactProviders,
      custom,
    ] = await Promise.all([
      import("@/messages/es.json"),
      import("@/messages/es/design-system.json"),
      import("@/messages/es/editor.json"),
      import("@/messages/es/modules/contributions.json"),
      import("@/messages/es/modules/technologies.json"),
      import("@/messages/es/modules/projects.json"),
      import("@/messages/es/editor-navigation.json"),
      import("@/messages/es/contact-providers.json"),
      import("@/messages/es/modules/custom.json"),
    ]);
    return {
      ...common.default,
      DesignSystem: designSystem.default,
      Editor: editor.default,
      EditorNavigation: editorNavigation.default,
      ContactProviders: contactProviders.default,
      EditorModules: {
        contributions: contributions.default,
        technologies: technologies.default,
        projects: projects.default,
        custom: custom.default,
      },
    };
  },
};

export default getRequestConfig(async ({ locale }) => {
  const requestedLocale = locale ?? (await rootParams.locale());
  if (!hasLocale(routing.locales, requestedLocale)) notFound();

  return {
    locale: requestedLocale,
    messages: await loadMessages[requestedLocale](),
    timeZone: "UTC",
  };
});
