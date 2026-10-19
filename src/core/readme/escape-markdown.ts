/** Input is plain text, never a Markdown fragment or raw HTML. */
function escapeText(value: string): string {
  return (
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/[\\`*_{}\[\]()#+.!|~=\-]/g, "\\$&")
      // Entity references keep bare addresses from becoming unintended autolinks.
      .replace(/:/g, "&#58;")
      .replace(/@/g, "&#64;")
  );
}

function normalizeLines(value: string): string {
  return value
    .replace(/\r\n?|\u2028|\u2029/g, "\n")
    .replace(
      /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,
      "\ufffd",
    );
}

export function escapeInlineText(value: string): string {
  return escapeText(normalizeLines(value).replace(/\s+/g, " ").trim());
}

/** Keep paragraph breaks while removing indentation that could create code blocks. */
export function escapeParagraphText(value: string): string {
  return normalizeLines(value)
    .trim()
    .split(/\n[\t ]*\n+/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => escapeInlineText(line))
        .join("\n"),
    )
    .filter(Boolean)
    .join("\n\n");
}
