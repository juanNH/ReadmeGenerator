import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const excluded = new Set([
  "node_modules",
  ".git",
  ".private",
  ".next",
  "work",
  "coverage",
  "playwright-report",
  "test-results",
  "blob-report",
]);

async function markdownFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      if (excluded.has(entry.name)) return [];
      const target = path.join(directory, entry.name);
      if (entry.isDirectory()) return markdownFiles(target);
      return entry.name.endsWith(".md") ? [target] : [];
    }),
  );
  return files.flat();
}

const files = await markdownFiles(root);
const missing = [];
for (const file of files) {
  const content = await readFile(file, "utf8");
  for (const match of content.matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
    const target = match[1]?.split(/[?#]/)[0];
    if (!target || /^[a-z][a-z\d+.-]*:/i.test(target) || target.startsWith("//")) continue;
    const resolved = path.resolve(
      path.dirname(file),
      decodeURIComponent(target.replace(/^<|>$/g, "")),
    );
    try {
      await stat(resolved);
    } catch {
      missing.push(`${path.relative(root, file)} → ${target}`);
    }
  }
}
if (missing.length > 0) {
  console.error(`Broken local documentation links:\n${missing.join("\n")}`);
  process.exitCode = 1;
} else {
  console.log(`Checked local links in ${files.length} Markdown files.`);
}
