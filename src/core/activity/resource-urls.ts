import type { CardAppearance } from "../profile/module-content";
import type { ContentLocale } from "../profile/profile-schema";
import { resourceCardOptionsSchema, type ResourceCardOptions } from "./extended-options";
import { normalizeActivityBaseUrl } from "./index";
import { cardQuery, parseCardOptions } from "./card-options";
import { cardConfigJson } from "./card-config-json";
import { normalizeResourceTarget, resourceKinds, type ResourceKind } from "./resource-types";

export function resourceCardUrl(
  kind: ResourceKind,
  target: string,
  locale: ContentLocale,
  baseUrl?: string,
  appearance?: CardAppearance,
  options?: ResourceCardOptions,
): string | null {
  const normalized = normalizeResourceTarget(kind, target);
  const origin = baseUrl === undefined ? "" : normalizeActivityBaseUrl(baseUrl);
  if (!normalized || origin === null) return null;
  const params = new URLSearchParams(cardQuery(locale, appearance));
  params.set("target", normalized);
  if (options && Object.keys(options).length) params.set("options", cardConfigJson(options));
  const result = `${origin}/cards/extended/${kind}.svg?${params.toString()}`;
  return result.length <= 12_000 ? result : null;
}

export function parseResourceCardRequest(filename: string, url: URL) {
  const kind = resourceKinds.find((kind) => `${kind}.svg` === filename);
  if (
    !kind ||
    url.searchParams.getAll("target").length !== 1 ||
    url.searchParams.getAll("options").length > 1 ||
    url.searchParams.has("stats") ||
    url.searchParams.has("languages")
  )
    return null;
  const target = normalizeResourceTarget(kind, url.searchParams.get("target") ?? "");
  if (!target) return null;
  const params = new URLSearchParams(url.searchParams);
  params.delete("target");
  params.delete("options");
  const common = parseCardOptions(params);
  if (!common) return null;
  const source = url.searchParams.get("options");
  let options: ResourceCardOptions | undefined;
  if (source !== null) {
    if (source.length > 4000) return null;
    try {
      const result = resourceCardOptionsSchema.safeParse(JSON.parse(source));
      if (!result.success) return null;
      options = result.data;
    } catch {
      return null;
    }
  }
  return {
    kind,
    target,
    locale: common.locale,
    appearance: common.appearance,
    ...(options ? { options } : {}),
  };
}

export function parseResourceCardUrl(value: string, baseUrl?: string) {
  const origin = baseUrl === undefined ? "" : normalizeActivityBaseUrl(baseUrl);
  if (origin === null || !value.startsWith(`${origin}/cards/extended/`)) return null;
  let url: URL;
  try {
    url = new URL(value, origin || "https://preview.example.com");
  } catch {
    return null;
  }
  const filename = url.pathname.split("/").at(-1) ?? "";
  const input = parseResourceCardRequest(filename, url);
  if (
    !input ||
    resourceCardUrl(
      input.kind,
      input.target,
      input.locale,
      baseUrl,
      input.appearance,
      input.options,
    ) !== value
  )
    return null;
  return {
    ...input,
    localUrl: resourceCardUrl(
      input.kind,
      input.target,
      input.locale,
      undefined,
      input.appearance,
      input.options,
    )!,
  };
}
