import { LanguageSupport, StreamLanguage } from "@codemirror/language";
import { normalizeCodeLanguage } from "@/core/code";

/** No remote services or all-language bundle: each parser loads only when requested. */
export async function loadCodeLanguage(language: string): Promise<LanguageSupport | null> {
  switch (normalizeCodeLanguage(language)) {
    case "html":
      return (await import("@codemirror/lang-html")).html({ autoCloseTags: true });
    case "xml":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/xml")).xml),
      );
    case "javascript":
      return (await import("@codemirror/lang-javascript")).javascript();
    case "jsx":
      return (await import("@codemirror/lang-javascript")).javascript({ jsx: true });
    case "typescript":
      return (await import("@codemirror/lang-javascript")).javascript({ typescript: true });
    case "tsx":
      return (await import("@codemirror/lang-javascript")).javascript({
        typescript: true,
        jsx: true,
      });
    case "json":
      return (await import("@codemirror/lang-json")).json();
    case "jsonc":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/javascript")).json),
      );
    case "python":
      return (await import("@codemirror/lang-python")).python();
    case "toml":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/toml")).toml),
      );
    case "yaml":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/yaml")).yaml),
      );
    case "bash":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/shell")).shell),
      );
    case "powershell":
      return new LanguageSupport(
        StreamLanguage.define(
          (await import("@codemirror/legacy-modes/mode/powershell")).powerShell,
        ),
      );
    case "sql":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/sql")).standardSQL),
      );
    case "css":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/css")).css),
      );
    case "scss":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/css")).sCSS),
      );
    case "sass":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/sass")).sass),
      );
    case "markdown":
      return (await import("@codemirror/lang-markdown")).markdown();
    case "java":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/clike")).java),
      );
    case "c":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/clike")).c),
      );
    case "cpp":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/clike")).cpp),
      );
    case "csharp":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/clike")).csharp),
      );
    case "kotlin":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/clike")).kotlin),
      );
    case "dart":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/clike")).dart),
      );
    case "ruby":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/ruby")).ruby),
      );
    case "php":
      return (await import("@codemirror/lang-php")).php({ plain: true });
    case "swift":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/swift")).swift),
      );
    case "go":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/go")).go),
      );
    case "rust":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/rust")).rust),
      );
    case "graphql":
      return new LanguageSupport(
        StreamLanguage.define((await import("./code-editor-graphql")).graphql),
      );
    case "dockerfile":
      return new LanguageSupport(
        StreamLanguage.define(
          (await import("@codemirror/legacy-modes/mode/dockerfile")).dockerFile,
        ),
      );
    case "diff":
      return new LanguageSupport(
        StreamLanguage.define((await import("@codemirror/legacy-modes/mode/diff")).diff),
      );
    default:
      return null;
  }
}
