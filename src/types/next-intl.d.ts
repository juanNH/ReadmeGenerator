import type common from "@/messages/en.json";
import type designSystem from "@/messages/en/design-system.json";
import type editor from "@/messages/en/editor.json";
import type { AppLocale } from "@/i18n/routing";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof common & { DesignSystem: typeof designSystem; Editor: typeof editor };
  }
}
