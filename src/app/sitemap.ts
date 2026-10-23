import type { MetadataRoute } from "next";
import { getPublicSiteSitemap } from "@/server/public-site-metadata";

export default function sitemap(): MetadataRoute.Sitemap {
  return getPublicSiteSitemap();
}
