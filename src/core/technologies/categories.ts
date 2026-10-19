import { findTechnology } from ".";

export const technologyCategoryIds = Object.freeze([
  "languages",
  "frontend",
  "backend",
  "mobile",
  "data",
  "cloud",
  "testing",
  "ai",
  "tools",
] as const);
export type TechnologyCategoryId = (typeof technologyCategoryIds)[number];

const categoryNames: Record<TechnologyCategoryId, Readonly<{ en: string; es: string }>> = {
  languages: { en: "Languages", es: "Lenguajes" },
  frontend: { en: "Frontend", es: "Frontend" },
  backend: { en: "Backend", es: "Backend" },
  mobile: { en: "Mobile & desktop", es: "Móvil y escritorio" },
  data: { en: "Data & messaging", es: "Datos y mensajería" },
  cloud: { en: "Cloud & DevOps", es: "Cloud y DevOps" },
  testing: { en: "Testing & quality", es: "Testing y calidad" },
  ai: { en: "AI & automation", es: "IA y automatización" },
  tools: { en: "Tools & design", es: "Herramientas y diseño" },
};

// A functional suggestion for each catalog entry, never a skill level or a forced placement.
const categoryTools: Record<TechnologyCategoryId, readonly string[]> = {
  languages: `typescript javascript python java csharp php go rust cplusplus kotlin swift c ruby
    dart scala elixir clojure haskell lua r julia zig bash powershell graphql html css`.split(
    /\s+/,
  ),
  frontend: `react nextjs tailwindcss sass vue angular svelte astro nuxt remix gatsby solidjs qwik
    alpinejs htmx jquery bootstrap material-ui chakra-ui ant-design bulma styled-components less redux
    zustand mobx rxjs react-router framer-motion threejs d3 chartjs wordpress sveltekit tanstack-query
    tanstack-router tanstack-table tanstack-form tanstack-start react-hook-form headless-ui radix-ui
    shadcn-ui mantine preact lit unocss inertiajs vuetify quasar docusaurus vitepress postcss axios swr blazor`.split(
    /\s+/,
  ),
  backend:
    `nodejs express nestjs django fastapi spring dotnet laravel rails phoenix fastify adonisjs
    flask django-rest symfony quarkus ktor fiber grpc socketio bun deno graphql-apollo zod hono trpc
    pydantic actix better-auth auth0 clerk keycloak ory authentik authelia`.split(/\s+/),
  mobile: `react-native flutter android jetpack-compose expo ionic capacitor electron tauri unity
    unreal-engine godot`.split(/\s+/),
  data: `mysql postgresql sql-server sqlite mariadb mongodb redis prisma sequelize mongoose sqlalchemy
    hibernate entity-framework cassandra dynamodb cosmosdb neo4j elasticsearch clickhouse duckdb influxdb
    memcached supabase firebase appwrite kafka rabbitmq nats pulsar spark airflow hadoop numpy pandas
    matplotlib plotly drizzle typeorm knex doctrine ecto nhibernate liquibase flyway neon turso
    planetscale pocketbase convex qdrant milvus surrealdb arangodb couchdb hasura minio polars
    airbyte prefect trino`.split(/\s+/),
  cloud:
    `docker kubernetes aws azure google-cloud cloudflare cloudflare-workers vercel netlify railway
    digitalocean terraform pulumi ansible helm argocd podman rancher github-actions azure-devops jenkins
    circleci nginx apache traefik prometheus grafana datadog sentry opentelemetry kibana logstash vault
    consul linux ubuntu debian fedora temporal opentofu caddy envoy istio kong dapr backstage
    coolify render flyio portainer nomad`.split(/\s+/),
  testing:
    `jest vitest postman eslint biome playwright cypress selenium puppeteer pytest junit mocha
    jasmine cucumber k6 sonarqube insomnia storybook testing-library chromatic lighthouse codecov
    gatling rspec prettier oxc`.split(/\s+/),
  ai: `scikit-learn pytorch tensorflow keras opencv claude claude-code anthropic langchain langgraph
    hugging-face ollama github-copilot cursor gemini mistral perplexity n8n mlflow jetbrains-ai openai
    chatgpt codex crewai llamaindex langsmith langfuse mcp mastra dify deepseek groq qwen lm-studio
    gemini-cli cline windsurf v0 junie antigravity roo-code ray weights-biases dvc bentoml openrouter
    replicate cohere firecrawl vllm fireworks cerebras`.split(/\s+/),
  tools: `git figma vite webpack rollup babel npm pnpm yarn jupyter anaconda google-colab streamlit
    github gitlab bitbucket swagger openapi android-studio xcode vscode visual-studio intellij webstorm
    pycharm neovim vim notion jira confluence blender nx turborepo canva trello excalidraw mermaid
    penpot diagrams-net`.split(/\s+/),
};

const toolCategories = new Map(
  technologyCategoryIds.flatMap((category) =>
    categoryTools[category].map((id) => [id, category] as const),
  ),
);

export function getTechnologyCategory(name: string): TechnologyCategoryId | null {
  const entry = findTechnology(name);
  return entry ? (toolCategories.get(entry.id) ?? null) : null;
}

export function getTechnologyCategoryName(id: TechnologyCategoryId, locale: "en" | "es"): string {
  return categoryNames[id][locale];
}
