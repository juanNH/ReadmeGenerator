import type { StreamParser } from "@codemirror/language";

type GraphqlState = { blockString: boolean };

const keywords = new Set([
  "query",
  "mutation",
  "subscription",
  "fragment",
  "on",
  "schema",
  "scalar",
  "type",
  "interface",
  "union",
  "enum",
  "input",
  "extend",
  "directive",
  "repeatable",
  "implements",
]);

/** Lexical colors for GraphQL documents; this does not validate a schema or query. */
export const graphql: StreamParser<GraphqlState> = {
  name: "graphql",
  startState: () => ({ blockString: false }),
  token(stream, state) {
    if (state.blockString || stream.match('"""')) {
      state.blockString = true;
      while (!stream.eol()) {
        if (stream.match('\\"""')) continue;
        if (stream.match('"""')) {
          state.blockString = false;
          break;
        }
        stream.next();
      }
      return "string";
    }
    if (stream.eatSpace()) return null;
    if (stream.match(/#.*/)) return "comment";
    if (stream.match(/"(?:[^"\\]|\\.)*"?/)) return "string";
    if (stream.match(/-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/)) return "number";
    if (stream.match(/\$[_A-Za-z][_0-9A-Za-z]*/)) return "variable-2";
    if (stream.match(/@[_A-Za-z][_0-9A-Za-z]*/)) return "meta";
    const name = stream.match(/[_A-Za-z][_0-9A-Za-z]*/);
    if (name && typeof name !== "boolean") {
      if (keywords.has(name[0])) return "keyword";
      if (name[0] === "true" || name[0] === "false" || name[0] === "null") return "atom";
      return /^[A-Z]/.test(name[0]) ? "type" : "variable";
    }
    if (stream.match(/\.\.\.|[!():=\[\]{}|&,]/)) return "punctuation";
    stream.next();
    return null;
  },
  languageData: { commentTokens: { line: "#" } },
};
