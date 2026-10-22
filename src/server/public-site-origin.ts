import "server-only";

import { normalizeActivityBaseUrl } from "@/core/activity";

export function getPublicSiteOrigin(): string | undefined {
  const configuredOrigin = process.env.APP_URL?.trim();
  if (configuredOrigin) return normalizeActivityBaseUrl(configuredOrigin) ?? undefined;

  if (process.env.VERCEL_ENV !== "production") return undefined;

  const productionDomain = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (productionDomain) {
    if (!/^[a-z0-9.-]+$/i.test(productionDomain)) return undefined;
    return normalizeActivityBaseUrl(`https://${productionDomain}`) ?? undefined;
  }

  return undefined;
}

export function isPublicIndexingEnabled(): boolean {
  if (process.env.VERCEL_ENV !== undefined) return process.env.VERCEL_ENV === "production";
  return (
    process.env.NODE_ENV === "production" && process.env.PUBLIC_SITE_INDEXING_ENABLED === "true"
  );
}
