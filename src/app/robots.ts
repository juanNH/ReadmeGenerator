import type { MetadataRoute } from "next";
import { getPublicSiteOrigin, isPublicIndexingEnabled } from "@/server/public-site-origin";

export default function robots(): MetadataRoute.Robots {
  const origin = getPublicSiteOrigin();
  const indexable = isPublicIndexingEnabled() && origin !== undefined;

  return {
    rules: { userAgent: "*", allow: "/" },
    ...(indexable ? { sitemap: `${origin}/sitemap.xml` } : {}),
  };
}
