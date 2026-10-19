import { useLocale, useTranslations } from "next-intl";
import {
  getTechnologyCategoryName,
  technologyCategoryIds,
  type TechnologyCategoryId,
} from "@/core/technologies/categories";

// Canonical catalog names, matching the same category suggestions used when adding tools.
const categoryExamples: Record<TechnologyCategoryId, readonly string[]> = {
  languages: ["JavaScript", "TypeScript", "Python"],
  frontend: ["React", "Vue", "Tailwind CSS"],
  backend: ["Node.js", "NestJS", "Hono"],
  mobile: ["React Native", "Flutter", "Electron"],
  data: ["PostgreSQL", "Drizzle ORM", "Apache Kafka"],
  cloud: ["Docker", "AWS", "Terraform"],
  testing: ["Jest", "Playwright", "Postman"],
  ai: ["Claude", "Codex", "LangGraph"],
  tools: ["Git", "Figma", "Visual Studio Code"],
};

export function TechnologyCategoryGuide() {
  const locale = useLocale();
  const t = useTranslations("EditorModules.technologies");

  return (
    <details className="rounded-md border border-border px-4">
      <summary className="min-h-11 cursor-pointer rounded-sm py-3 text-sm font-medium focus-visible:ring-[3px] focus-visible:ring-ring focus-visible:outline-none">
        {t("suggestedGuideTitle")}
      </summary>
      <div role="region" aria-label={t("suggestedGuideTitle")} className="space-y-4 pb-4">
        <p className="text-xs leading-5 text-muted-foreground">{t("suggestedGuideHelp")}</p>
        <dl className="grid min-w-0 gap-4 sm:grid-cols-2">
          {technologyCategoryIds.map((id) => (
            <div key={id} className="min-w-0 border-t border-border pt-3">
              <dt className="text-sm font-medium">{getTechnologyCategoryName(id, locale)}</dt>
              <dd className="mt-1 text-xs leading-6 break-words text-muted-foreground">
                {categoryExamples[id].join(" · ")}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </details>
  );
}
