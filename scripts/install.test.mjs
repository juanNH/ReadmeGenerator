import assert from "node:assert/strict";
import test from "node:test";
import { canInstallHusky, installHusky } from "../.husky/install.mjs";

test("Husky setup preserves an existing custom hooks path", () => {
  assert.equal(canInstallHusky(".githooks", "C:/project"), false);
});

test("Husky setup accepts an unset or repository-owned hooks path", () => {
  assert.equal(canInstallHusky("", "C:/project"), true);
  assert.equal(canInstallHusky(".husky/_", "C:/project"), true);
});

test("Husky setup skips when CI or production mode is enabled", async () => {
  let loaded = false;
  const loadHusky = async () => {
    loaded = true;
    return { default: () => {} };
  };

  assert.equal(await installHusky({ env: { CI: "true" }, loadHusky }), false);
  assert.equal(await installHusky({ env: { NODE_ENV: "production" }, loadHusky }), false);
  assert.equal(loaded, false);
});

test("Husky setup preserves an external hooks path without loading Husky", async () => {
  let loaded = false;

  assert.equal(
    await installHusky({
      env: {},
      getHooksPath: () => ".githooks",
      loadHusky: async () => {
        loaded = true;
        return { default: () => {} };
      },
    }),
    false,
  );
  assert.equal(loaded, false);
});

test("Husky setup skips safely when the development dependency is missing", async () => {
  const missingPackage = Object.assign(
    new Error("Cannot find package 'husky' imported from C:/project/.husky/install.mjs"),
    { code: "ERR_MODULE_NOT_FOUND" },
  );

  assert.equal(
    await installHusky({
      env: {},
      getHooksPath: () => "",
      loadHusky: async () => {
        throw missingPackage;
      },
    }),
    false,
  );
});

test("Husky setup still reports errors other than a missing Husky package", async () => {
  const loadError = Object.assign(new Error("Husky failed to initialize"), {
    code: "ERR_MODULE_NOT_FOUND",
  });

  await assert.rejects(
    installHusky({
      env: {},
      getHooksPath: () => "",
      loadHusky: async () => {
        throw loadError;
      },
    }),
    loadError,
  );
});
