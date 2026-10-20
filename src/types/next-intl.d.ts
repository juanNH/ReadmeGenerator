import type common from "@/messages/en.json";
import type designSystem from "@/messages/en/design-system.json";
import type editor from "@/messages/en/editor.json";
import type editorNavigation from "@/messages/en/editor-navigation.json";
import type contactProviders from "@/messages/en/contact-providers.json";
import type contributions from "@/messages/en/modules/contributions.json";
import type technologies from "@/messages/en/modules/technologies.json";
import type projects from "@/messages/en/modules/projects.json";
import type custom from "@/messages/en/modules/custom.json";
import type readmeImport from "@/messages/en/readme-import.json";
import type codeEditor from "@/messages/en/code-editor.json";
import type { AppLocale } from "@/i18n/routing";

declare module "next-intl" {
  interface AppConfig {
    Locale: AppLocale;
    Messages: typeof common & {
      DesignSystem: typeof designSystem;
      Editor: typeof editor;
      EditorNavigation: typeof editorNavigation;
      ContactProviders: typeof contactProviders;
      ReadmeImport: typeof readmeImport;
      CodeEditor: typeof codeEditor;
      EditorModules: {
        contributions: typeof contributions;
        technologies: typeof technologies;
        projects: typeof projects;
        custom: typeof custom;
      };
    };
  }
}
