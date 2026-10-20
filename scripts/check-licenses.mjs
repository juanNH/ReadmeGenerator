import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, realpath, stat, writeFile } from "node:fs/promises";
import path from "node:path";

// This inventories installed files. It does not infer licenses from package names
// or replace the license review required for a particular distribution artifact.
const root = process.cwd();
const modules = path.join(root, "node_modules");
const write = process.argv.includes("--write");
const publicFile = path.join(root, "public/licenses/dependencies.txt");
const reportFile = path.join(root, "work/oss/dependency-licenses.json");
const sourceCatalogFile = path.join(root, "scripts/license-sources.json");
const problems = [];
const warnings = [];
const packageRoots = new Set();
const noticeName =
  /^(?:licen[cs]es?|copying|notices?|third[-_]party[-_](?:notices?|licen[cs]es?))(?:$|[._-])/i;
const compare = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const relative = (target) => path.relative(root, target).split(path.sep).join("/");
const hash = (source) => createHash("sha256").update(source).digest("hex");

async function reviewedSources(lockfile) {
  const catalog = JSON.parse(await readFile(sourceCatalogFile, "utf8"));
  if (
    catalog.schemaVersion !== 1 ||
    !Array.isArray(catalog.sources) ||
    !Array.isArray(catalog.packages)
  )
    throw new Error("Invalid reviewed license source catalog.");
  const sources = new Map();
  for (const source of catalog.sources) {
    if (
      typeof source.id !== "string" ||
      sources.has(source.id) ||
      !/^public\/licenses\/supplemental\/[a-z\d][a-z\d.-]*\.txt$/.test(source.file) ||
      !/^[a-f\d]{64}$/.test(source.sha256) ||
      !["upstream-notice", "upstream-context", "reference-license"].includes(source.kind) ||
      !source.url?.startsWith("https://")
    )
      throw new Error(`Invalid reviewed license source: ${source.id}`);
    const text = await optionalRead(path.join(root, source.file));
    if (text === undefined || hash(text) !== source.sha256)
      problems.push(`Reviewed source missing or changed: ${source.file}`);
    sources.set(source.id, { ...source, text: text ?? "" });
  }
  const packages = new Map();
  for (const entry of catalog.packages) {
    const key = `${entry.name}@${entry.version}`;
    if (
      !entry.name ||
      !entry.version ||
      !entry.license ||
      packages.has(key) ||
      !Array.isArray(entry.notices) ||
      !entry.notices.length ||
      entry.notices.some((id) => !sources.has(id)) ||
      typeof entry.registry?.integrity !== "string"
    )
      throw new Error(`Invalid reviewed license package: ${key}`);
    // The committed lockfile ties each resolution to the exact official npm
    // artifact reviewed. A future version or platform name needs its own record.
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const integrity = lockfile.match(
      new RegExp(
        `^  ['\"]?${escapedKey}['\"]?:\\r?\\n    resolution: \\{integrity: ([^}\\s,]+)`,
        "m",
      ),
    )?.[1];
    if (integrity !== undefined && integrity !== entry.registry.integrity)
      problems.push(`Reviewed package integrity differs from lockfile: ${key}`);
    packages.set(key, {
      ...entry,
      reviewedAt: catalog.reviewedAt,
      lockfileIntegrity: integrity,
      sources: entry.notices.map((id) => sources.get(id)),
    });
  }
  return packages;
}

async function attachReviewedNotices(entry, directory, reviews) {
  const key = `${entry.name}@${entry.version}`;
  const review = reviews.get(key);
  if (!review) {
    const message = `${key}: no bundled root notice or exact-version reviewed source; resolve its upstream notices before distribution.`;
    warnings.push(message);
    problems.push(message);
    return;
  }
  if (review.license !== entry.license)
    problems.push(`Reviewed source license differs from installed package: ${key}`);
  if (review.lockfileIntegrity === undefined && review.scope !== "installed-tree-only")
    problems.push(`Reviewed installed package is absent from lockfile: ${key}`);
  if (
    review.scope === "installed-tree-only" &&
    (!review.verifyFiles?.length || !/^[a-f\d]{64}$/.test(review.archiveSha256))
  )
    problems.push(`Installed extra requires exact archive and extracted-file evidence: ${key}`);
  for (const expected of review.verifyFiles ?? []) {
    if (!/^[a-z\d][a-z\d./-]*$/i.test(expected.file) || expected.file.split("/").includes(".."))
      throw new Error(`Unsafe reviewed package file: ${key}/${expected.file}`);
    const text = await optionalRead(path.join(directory, expected.file));
    if (text === undefined || hash(text) !== expected.sha256)
      problems.push(
        `Reviewed upstream context differs from installed package: ${key}/${expected.file}`,
      );
  }
  const { sources, ...metadata } = review;
  delete metadata.verifyFiles;
  delete metadata.lockfileIntegrity;
  entry.noticeReview = metadata;
  for (const source of sources) {
    entry.notices.push({
      file: source.file,
      sha256: source.sha256,
      text: source.text,
      origin: source.kind,
      sourceUrl: source.url,
      ...(source.upstreamFile ? { upstreamFile: source.upstreamFile } : {}),
      ...(source.extraction ? { extraction: source.extraction } : {}),
    });
  }
}

async function optionalRead(file) {
  try {
    return await readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") return undefined;
    throw error;
  }
}

async function directories(directory) {
  try {
    return (await readdir(directory, { withFileTypes: true })).sort((a, b) =>
      compare(a.name, b.name),
    );
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
}

async function collectPackage(packageDirectory) {
  let resolved;
  try {
    resolved = await realpath(packageDirectory);
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  const withinModules = path.relative(modules, resolved);
  if (
    withinModules === ".." ||
    withinModules.startsWith(`..${path.sep}`) ||
    path.isAbsolute(withinModules)
  ) {
    problems.push(`Linked package outside node_modules: ${relative(packageDirectory)}`);
    return;
  }
  if (await optionalRead(path.join(resolved, "package.json"))) packageRoots.add(resolved);
}

async function collectModuleDirectory(directory) {
  for (const entry of await directories(directory)) {
    if (entry.name.startsWith(".")) continue;
    const target = path.join(directory, entry.name);
    if (entry.name.startsWith("@")) {
      for (const child of await directories(target)) {
        await collectPackage(path.join(target, child.name));
      }
    } else {
      await collectPackage(target);
    }
  }
}

async function collectNotices(
  packageDirectory,
  directory = packageDirectory,
  licenseDirectory = false,
) {
  const files = [];
  for (const entry of await directories(directory)) {
    // Never follow internal links or nested installations: pnpm roots are
    // collected separately and this prevents loops and duplicate notices.
    if (entry.isSymbolicLink() || entry.name === "node_modules" || entry.name === ".git") continue;
    const target = path.join(directory, entry.name);
    const isNotice = noticeName.test(entry.name);
    if (entry.isDirectory()) {
      files.push(...(await collectNotices(packageDirectory, target, licenseDirectory || isNotice)));
    } else if (isNotice || (licenseDirectory && /\.(?:txt|md|text|html?)$/i.test(entry.name))) {
      const source = await readFile(target, "utf8");
      if (!source.trim()) continue;
      if (source.includes("\u0000") || source.includes("\ufffd")) {
        problems.push(`Non-text notice requires review: ${relative(target)}`);
        continue;
      }
      files.push({
        file: path.relative(packageDirectory, target).split(path.sep).join("/"),
        sha256: hash(source),
        text: source,
      });
    }
  }
  return files.sort((a, b) => compare(a.file, b.file));
}

function licenseOf(manifest) {
  if (typeof manifest.license === "string") return manifest.license;
  if (typeof manifest.license?.type === "string") return manifest.license.type;
  if (Array.isArray(manifest.licenses)) {
    return manifest.licenses.map((license) => license.type ?? license).join(" OR ");
  }
  return undefined;
}

function sourceOf(manifest) {
  return {
    repository:
      typeof manifest.repository === "string" ? manifest.repository : manifest.repository?.url,
    homepage: manifest.homepage,
    author: manifest.author,
    contributors: manifest.contributors,
  };
}

async function resolveDependency(from, name) {
  let directory = from;
  while (true) {
    const candidate = path.join(directory, "node_modules", name);
    if (await optionalRead(path.join(candidate, "package.json"))) return realpath(candidate);
    const parent = path.dirname(directory);
    if (parent === directory || directory === root) return undefined;
    directory = parent;
  }
}

async function runtimeDependencies(manifest, packages) {
  const runtime = new Set();
  const queue = Object.keys(manifest.dependencies ?? {}).map((name) => ({
    from: root,
    name,
    optional: false,
  }));
  queue.push(
    ...Object.keys(manifest.optionalDependencies ?? {}).map((name) => ({
      from: root,
      name,
      optional: true,
    })),
  );
  for (let index = 0; index < queue.length; index++) {
    const edge = queue[index];
    const resolved = await resolveDependency(edge.from, edge.name);
    if (!resolved) {
      if (!edge.optional)
        problems.push(
          `Installed dependency missing: ${edge.name} (from ${relative(edge.from) || "."})`,
        );
      continue;
    }
    if (runtime.has(resolved)) continue;
    runtime.add(resolved);
    const entry = packages.get(resolved);
    if (!entry) {
      problems.push(`Dependency absent from inventory: ${edge.name}`);
      continue;
    }
    const optionalNames = new Set(Object.keys(entry.manifest.optionalDependencies ?? {}));
    for (const name of Object.keys(entry.manifest.dependencies ?? {})) {
      queue.push({ from: resolved, name, optional: optionalNames.has(name) });
    }
    for (const name of optionalNames) queue.push({ from: resolved, name, optional: true });
    for (const name of Object.keys(entry.manifest.peerDependencies ?? {})) {
      queue.push({ from: resolved, name, optional: true });
    }
  }
  return runtime;
}

async function checkOwnedNotices(manifest) {
  const ownLicense = await optionalRead(path.join(root, "LICENSE"));
  if (
    manifest.license !== "MIT" ||
    !ownLicense?.includes("MIT License") ||
    !ownLicense.includes("Copyright (c)")
  ) {
    problems.push("Root package metadata and LICENSE must identify the project's MIT license.");
  }
  const required = [
    "public/licenses/github-stats-extended.txt",
    "public/technology-icons/LICENSE.txt",
    "public/technology-icons/LICENSE-SIMPLE-ICONS.txt",
    "public/technology-icons/LICENSE-LOBE-ICONS.txt",
    "public/contact-icons/LICENSE.txt",
    "public/country-flags/LICENSE.txt",
  ];
  for (const file of required) {
    if (!(await optionalRead(path.join(root, file)))?.trim())
      problems.push(`Missing copied-asset notice: ${file}`);
  }
  const copies = [
    ["@fontsource-variable/geist", "LICENSE", "public/licenses/geist.txt"],
    ["@fontsource-variable/geist-mono", "LICENSE", "public/licenses/geist-mono.txt"],
    ["lucide-react", "LICENSE", "public/licenses/lucide.txt"],
  ];
  for (const [name, source, destination] of copies) {
    const original = await optionalRead(path.join(modules, name, source));
    const copied = await optionalRead(path.join(root, destination));
    if (!original || original !== copied)
      problems.push(`Notice must match installed ${name}: ${destination}`);
  }
}

async function main() {
  if (process.argv.slice(2).some((argument) => argument !== "--write"))
    throw new Error("Usage: node scripts/check-licenses.mjs [--write]");
  const manifest = JSON.parse(await readFile(path.join(root, "package.json"), "utf8"));
  const lockfile = await readFile(path.join(root, "pnpm-lock.yaml"), "utf8");
  const reviews = await reviewedSources(lockfile);
  await stat(modules);
  await checkOwnedNotices(manifest);
  await collectModuleDirectory(modules);
  for (const entry of await directories(path.join(modules, ".pnpm"))) {
    if (entry.isDirectory() && entry.name !== "node_modules") {
      await collectModuleDirectory(path.join(modules, ".pnpm", entry.name, "node_modules"));
    }
  }
  const packages = new Map();
  for (const directory of [...packageRoots].sort(compare)) {
    const packageManifest = JSON.parse(
      await readFile(path.join(directory, "package.json"), "utf8"),
    );
    packages.set(directory, {
      manifest: packageManifest,
      notices: await collectNotices(directory),
    });
  }
  const runtime = await runtimeDependencies(manifest, packages);
  const grouped = new Map();
  for (const [directory, { manifest: packageManifest, notices }] of packages) {
    const { name, version } = packageManifest;
    const license = licenseOf(packageManifest);
    if (!name || !version || !license || /(?:UNLICENSED|SEE LICEN[CS]E)/i.test(license)) {
      problems.push(`Unresolved package license: ${name ?? "unnamed"}@${version ?? "unknown"}`);
    }
    const key = `${name}@${version}`;
    let record = grouped.get(key);
    if (!record) {
      record = {
        name,
        version,
        license,
        ...sourceOf(packageManifest),
        runtime: false,
        manifests: [],
        notices: [],
      };
      grouped.set(key, record);
    } else if (record.license !== license) {
      problems.push(`Conflicting license metadata: ${key}`);
    }
    record.runtime ||= runtime.has(directory);
    record.manifests.push(`${relative(directory)}/package.json`);
    for (const notice of notices) {
      if (
        !record.notices.some(
          (existing) => existing.file === notice.file && existing.sha256 === notice.sha256,
        )
      )
        record.notices.push(notice);
    }
    // Preserve upstream context rather than invent a copyright notice for
    // packages which publish only a license identifier or a README statement.
    if (notices.length === 0) {
      const readme = (await directories(directory)).find(
        (entry) => /^readme(?:\.|$)/i.test(entry.name) && entry.isFile(),
      );
      if (readme && !record.readme)
        record.readme = await readFile(path.join(directory, readme.name), "utf8");
    }
  }
  const entries = [...grouped.values()].sort((a, b) =>
    compare(`${a.name}@${a.version}`, `${b.name}@${b.version}`),
  );
  for (const entry of entries) {
    if (!entry.notices.some((notice) => !notice.file.includes("/"))) {
      const directory = path.dirname(path.join(root, entry.manifests[0]));
      await attachReviewedNotices(entry, directory, reviews);
    }
    entry.notices.sort((a, b) => compare(a.file, b.file));
  }
  const report = {
    scope:
      "Installed pnpm tree, including development and platform-specific packages; not an artifact or compatibility audit.",
    platform: `${process.platform}-${process.arch}`,
    lockfileSha256: hash(lockfile),
    packages: entries,
    warnings,
    problems,
  };
  const sections = entries.map((entry) => {
    const metadata = [
      `${entry.name}@${entry.version}`,
      `Declared license: ${entry.license ?? "UNKNOWN"}`,
      `Source metadata: ${entry.name}@${entry.version}/package.json`,
      `Installed reachability: ${entry.runtime ? "runtime dependencies (including optional/peer dependencies)" : "development or other installed package"}`,
      `Repository: ${entry.repository ?? entry.homepage ?? "not declared"}`,
      entry.author
        ? `Author metadata: ${typeof entry.author === "string" ? entry.author : JSON.stringify(entry.author)}`
        : "",
      entry.contributors ? `Contributors metadata: ${JSON.stringify(entry.contributors)}` : "",
      entry.noticeReview
        ? `Reviewed notice sources: scripts/license-sources.json (${entry.noticeReview.reviewedAt})`
        : "",
      entry.noticeReview ? `Official npm release: ${entry.noticeReview.registry.url}` : "",
      entry.noticeReview ? `Official npm integrity: ${entry.noticeReview.registry.integrity}` : "",
      entry.noticeReview?.archiveSha256
        ? `Reviewed official npm archive SHA-256: ${entry.noticeReview.archiveSha256}`
        : "",
      entry.noticeReview?.scope ? `Review inclusion: ${entry.noticeReview.scope}` : "",
      entry.noticeReview?.revision
        ? `Reviewed source revision: ${entry.noticeReview.revision}`
        : "",
      entry.noticeReview?.copyrightStatus
        ? `Copyright notice: ${entry.noticeReview.copyrightStatus} (this does not mean no copyright exists)`
        : "",
      entry.noticeReview?.note ? `Review scope: ${entry.noticeReview.note}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const notices = entry.notices
      .map((notice) =>
        [
          `--- ${notice.origin === "reference-license" ? "Reference license terms (not a package-specific copyright notice)" : notice.origin === "upstream-context" ? "Original upstream context" : "Upstream notice"}: ${notice.file} ---`,
          notice.sourceUrl ? `Official source: ${notice.sourceUrl}` : "",
          notice.upstreamFile ? `Original archive file: ${notice.upstreamFile}` : "",
          notice.extraction ? `Extraction: ${notice.extraction}` : "",
          `SHA-256: ${notice.sha256}`,
          notice.text,
        ]
          .filter((line) => line !== "")
          .join("\n"),
      )
      .join("\n\n");
    const fallback =
      notices ||
      `No license/notice file was included in this installed package. Its declared license and upstream context require review when redistributing the package.\n${entry.readme ? `\n--- Upstream README (complete) ---\n${entry.readme}` : ""}`;
    return `${metadata}\n\n${fallback}`;
  });
  const output = [
    "THIRD-PARTY DEPENDENCY LICENSES AND NOTICES",
    "Generated by scripts/check-licenses.mjs --write from the installed package tree.",
    "The project code's MIT license does not replace these third-party licenses.",
    `Platform used for this inventory: ${report.platform}`,
    "This conservative inventory includes development tooling and optional packages.",
    "It preserves discovered upstream license/notice files, including embedded notices.",
    "A package license identifier alone does not prove complete redistribution compliance.",
    "Packages without bundled notices are explicitly identified, not silently relicensed.",
    "Reviewed companion notices retain exact official source URLs and SHA-256 hashes.",
    "Reference license templates never supply a missing package copyright attribution.",
    "See docs/open-source.md and THIRD_PARTY_NOTICES.md for scope and release review.",
    "",
    sections.join("\n\n======================================================================\n\n"),
    "",
  ].join("\n");
  if (write && problems.length === 0) {
    await mkdir(path.dirname(publicFile), { recursive: true });
    await writeFile(publicFile, output);
  } else if (!write && (await optionalRead(publicFile)) !== output) {
    problems.push(
      "Dependency notices differ from the installed tree. Run pnpm licenses:generate and review the diff.",
    );
  }
  await mkdir(path.dirname(reportFile), { recursive: true });
  await writeFile(reportFile, `${JSON.stringify(report, null, 2)}\n`);
  if (warnings.length) {
    console.warn(
      `NOTICE REVIEW: ${warnings.length} package versions have no root license/notice file. Upstream context and details: ${relative(reportFile)}.`,
    );
  }
  console.log(
    `Inventoried ${entries.length} package versions (${runtime.size} installed runtime roots); report: ${relative(reportFile)}.`,
  );
  if (problems.length) {
    console.error(`License checks failed:\n${problems.join("\n")}`);
    process.exitCode = 1;
  } else {
    console.log(
      `${write ? "Wrote" : "Verified"} ${relative(publicFile)} (${Buffer.byteLength(output)} bytes).`,
    );
  }
}

await main();
