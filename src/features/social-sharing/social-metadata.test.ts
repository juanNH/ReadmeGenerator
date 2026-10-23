import { describe, expect, it } from "vitest";
import { buildSocialMetadata } from "./social-metadata";

describe("buildSocialMetadata", () => {
  it("omits absolute social URLs when no validated public origin is available", () => {
    const metadata = buildSocialMetadata({
      origin: undefined,
      locale: "en",
      title: "Build your GitHub profile README",
      description: "A visual profile README editor.",
      imageAlt: "A preview of the profile README editor.",
    });

    expect(metadata.openGraph?.url).toBeUndefined();
    expect(metadata.openGraph?.images).toBeUndefined();
    expect(metadata.twitter?.images).toBeUndefined();
  });

  it("derives localized image URLs without assigning a route URL to inherited metadata", () => {
    const metadata = buildSocialMetadata({
      origin: "https://profiles.example",
      locale: "es",
      title: "Crea tu README de GitHub",
      description: "Un editor visual de perfiles.",
      imageAlt: "Vista previa del editor de README de perfil.",
    });
    const expectedImage = {
      url: "https://profiles.example/es/social-preview",
      alt: "Vista previa del editor de README de perfil.",
      width: 1200,
      height: 630,
      type: "image/png",
    };

    expect(metadata.openGraph).not.toHaveProperty("url");
    expect(metadata.openGraph?.images).toEqual([expectedImage]);
    expect(metadata.twitter?.images).toEqual([expectedImage]);
  });
});
