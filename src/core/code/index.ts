/** Literal code has its own budget, independent from interpreted HTML. */
export const CODE_MAX_SOURCE_LENGTH = 30_000;
export const CODE_MAX_DOCUMENT_LENGTH = 150_000;
export const CODE_MAX_LANGUAGE_LENGTH = 64;

/** Local display choices, not a claim that every GitHub theme highlights every language. */
export const codeLanguages = [
  { id: "toml", label: "TOML", aliases: [] },
  { id: "json", label: "JSON", aliases: [] },
  { id: "jsonc", label: "JSON with comments", aliases: [] },
  { id: "yaml", label: "YAML", aliases: ["yml"] },
  { id: "javascript", label: "JavaScript", aliases: ["js"] },
  { id: "typescript", label: "TypeScript", aliases: ["ts"] },
  { id: "jsx", label: "JSX", aliases: [] },
  { id: "tsx", label: "TSX", aliases: [] },
  { id: "html", label: "HTML", aliases: ["htm"] },
  { id: "css", label: "CSS", aliases: [] },
  { id: "scss", label: "SCSS", aliases: [] },
  { id: "sass", label: "Sass", aliases: [] },
  { id: "markdown", label: "Markdown", aliases: ["md"] },
  { id: "bash", label: "Bash / shell", aliases: ["sh", "shell", "shellscript"] },
  { id: "powershell", label: "PowerShell", aliases: ["pwsh", "ps1"] },
  { id: "python", label: "Python", aliases: ["py"] },
  { id: "java", label: "Java", aliases: [] },
  { id: "c", label: "C", aliases: [] },
  { id: "cpp", label: "C++", aliases: ["c++", "cplusplus"] },
  { id: "csharp", label: "C#", aliases: ["cs", "c#"] },
  { id: "go", label: "Go", aliases: ["golang"] },
  { id: "rust", label: "Rust", aliases: ["rs"] },
  { id: "ruby", label: "Ruby", aliases: ["rb"] },
  { id: "php", label: "PHP", aliases: [] },
  { id: "swift", label: "Swift", aliases: [] },
  { id: "kotlin", label: "Kotlin", aliases: ["kt"] },
  { id: "dart", label: "Dart", aliases: [] },
  { id: "sql", label: "SQL", aliases: [] },
  { id: "graphql", label: "GraphQL", aliases: ["gql"] },
  { id: "dockerfile", label: "Dockerfile", aliases: ["docker"] },
  { id: "xml", label: "XML", aliases: [] },
  { id: "diff", label: "Diff", aliases: ["patch"] },
] as const;

/** Only a bounded info token can enter a fence. Unknown safe languages remain usable. */
export function normalizeCodeLanguage(input: string): string | null {
  const language = input.trim().toLowerCase();
  if (!language) return "";
  if (language.length > CODE_MAX_LANGUAGE_LENGTH) return null;
  const known = codeLanguages.find(
    (entry) => entry.id === language || (entry.aliases as readonly string[]).includes(language),
  );
  return known?.id ?? (/^[a-z\d][a-z\d_+.-]*$/.test(language) ? language : null);
}

/** Closing fences must be longer than every authored backtick run, including embedded Markdown. */
export function renderCodeFence(source: string, language: string): string {
  let longest = 2;
  for (const match of source.matchAll(/`+/g)) longest = Math.max(longest, match[0].length);
  const fence = "`".repeat(longest + 1);
  return `${fence}${language}\n${source}\n${fence}`;
}
