import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { notFound } from "next/navigation";
import * as rootParams from "next/root-params";
import { routing } from "./routing";

const loadMessages = {
  en: async () => {
    const [common, designSystem, editor] = await Promise.all([
      import("@/messages/en.json"),
      import("@/messages/en/design-system.json"),
      import("@/messages/en/editor.json"),
    ]);
    return { ...common.default, DesignSystem: designSystem.default, Editor: editor.default };
  },
  es: async () => {
    const [common, designSystem, editor] = await Promise.all([
      import("@/messages/es.json"),
      import("@/messages/es/design-system.json"),
      import("@/messages/es/editor.json"),
    ]);
    return { ...common.default, DesignSystem: designSystem.default, Editor: editor.default };
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
