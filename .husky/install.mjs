import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

function configuredHooksPath() {
  try {
    return execFileSync("git", ["config", "--get", "core.hooksPath"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch (error) {
    if (error.status === 1) return "";
    throw error;
  }
}

export function canInstallHusky(existingHooksPath, projectRoot = process.cwd()) {
  if (!existingHooksPath) return true;
  return resolve(projectRoot, existingHooksPath) === resolve(projectRoot, ".husky", "_");
}

export async function installHusky({
  env = process.env,
  getHooksPath = configuredHooksPath,
  loadHusky = () => import("husky"),
} = {}) {
  if (env.CI === "true" || env.NODE_ENV === "production") return false;

  const existingHooksPath = getHooksPath();
  if (!canInstallHusky(existingHooksPath)) {
    console.warn(
      `Skipping Husky setup because core.hooksPath is already set to ${JSON.stringify(existingHooksPath)}. Set it to .husky/_ explicitly if you want to use this repository's hooks.`,
    );
    return false;
  }

  let huskyModule;
  try {
    huskyModule = await loadHusky();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (
      error?.code !== "ERR_MODULE_NOT_FOUND" ||
      !/Cannot find package ['"]husky['"]/.test(message)
    ) {
      throw error;
    }

    console.warn("Skipping Husky setup because the Husky dependency is not installed.");
    return false;
  }

  const { default: husky } = huskyModule;
  husky();
  return true;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await installHusky();
}
