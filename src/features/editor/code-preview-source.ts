import { renderCodeFence } from "@/core/code";

/** Recover the exact source from the same generated Markdown, before CommonMark normalizes lines. */
export function readGeneratedCodeSource(
  markdown: string,
  start: number | undefined,
  end: number | undefined,
  language: string,
): string | null {
  if (
    start === undefined ||
    end === undefined ||
    start < 0 ||
    end > markdown.length ||
    end <= start
  )
    return null;
  const fragment = markdown.slice(start, end);
  const opening = /^(`{3,})([^\n`]*)\n/.exec(fragment);
  if (!opening || opening[2] !== language) return null;
  const closing = `\n${opening[1]}`;
  if (!fragment.endsWith(closing)) return null;
  const source = fragment.slice(opening[0].length, -closing.length);
  return renderCodeFence(source, language) === fragment ? source : null;
}
