import { describe, expect, it, vi } from "vitest";
import { escapeInlineText, normalizeInlineText } from "./escape-markdown";
import { normalizePublicImageUrl } from "./public-image";

describe("public custom image destinations", () => {
  it.each([
    ["https://images.unsplash.com/photo-123", "https://images.unsplash.com/photo-123"],
    ["HTTPS://CDN.EXAMPLE.COM:443/banner.png", "https://cdn.example.com/banner.png"],
    [
      "https://cdn.example.com/render?width=640&format=webp",
      "https://cdn.example.com/render?width=640&format=webp",
    ],
    [
      "https://cdn.example.com/media(a).svg?token=a%23b",
      "https://cdn.example.com/media(a).svg?token=a%23b",
    ],
    ["https://cdn.example.com/my%20image.png", "https://cdn.example.com/my%20image.png"],
    ["https://münich.example.com/banner", "https://xn--mnich-kva.example.com/banner"],
    ["https://localhost.example.com/image", "https://localhost.example.com/image"],
    ["https://cdn.example.com./image", "https://cdn.example.com./image"],
    [
      "https://raw.githubusercontent.com/example/repo/main/banner.svg",
      "https://raw.githubusercontent.com/example/repo/main/banner.svg",
    ],
  ])(
    "normalizes a direct public HTTPS destination without requiring a file extension: %s",
    (input, expected) => {
      expect(normalizePublicImageUrl(input)).toBe(expected);
    },
  );

  it.each([
    "",
    " ",
    "http://cdn.example.com/image.png",
    "https:cdn.example.com/image.png",
    "https:////cdn.example.com/image.png",
    "//cdn.example.com/image.png",
    "/image.png",
    "cdn.example.com/image.png",
    "data:image/png;base64,aaaa",
    "blob:https://cdn.example.com/id",
    "file:///image.png",
    "javascript:alert(1)",
    "ftp://cdn.example.com/image.png",
    "https://user:password@cdn.example.com/image.png",
    "https://@cdn.example.com/image.png",
    "https://%75ser@cdn.example.com/image.png",
    "https://cdn.example.com:80/image.png",
    "https://cdn.example.com:3000/image.png",
    "https://cdn.example.com:99999/image.png",
    "https://cdn.example.com/image.svg#icon",
    "https://cdn.example.com/image.svg#",
    " https://cdn.example.com/image.png",
    "https://cdn.example.com/image.png ",
    "https://cdn.example.com/my image.png",
    "https://cdn.example.com/\nimage.png",
    "https://cdn.example.com/\u0000image.png",
    "https://cdn.example.com/\u0085image.png",
    "https://cdn.example.com/\\image.png",
    "https://localhost/image.png",
    "https://localhost./image.png",
    "https://image.localhost/image.png",
    "https://image.localhost./image.png",
    "https://app.local/image.png",
    "https://app.internal/image.png",
    "https://app.localdomain/image.png",
    "https://app.intranet/image.png",
    "https://router.home/image.png",
    "https://router.home.arpa/image.png",
    "https://home.arpa/image.png",
    "https://app.lan/image.png",
    "https://app.private/image.png",
    "https://app.corp/image.png",
    "https://app.test/image.png",
    "https://app.invalid/image.png",
    "https://app.example/image.png",
    "https://service.onion/image.png",
    "https://intranet/image.png",
    "https://127.0.0.1/image.png",
    "https://127.1/image.png",
    "https://2130706433/image.png",
    "https://0x7f000001/image.png",
    "https://0177.0.0.1/image.png",
    "https://10.0.0.1/image.png",
    "https://172.16.0.1/image.png",
    "https://192.168.0.1/image.png",
    "https://169.254.169.254/image.png",
    "https://8.8.8.8/image.png",
    "https://[::1]/image.png",
    "https://[fc00::1]/image.png",
    "https://[::ffff:127.0.0.1]/image.png",
    "https://[2001:4860:4860::8888]/image.png",
    "https://cdn..example.com/image.png",
    "https://.example.com/image.png",
    "https://-cdn.example.com/image.png",
    "https://cdn-.example.com/image.png",
    "https://cdn_image.example.com/image.png",
    `https://${"a".repeat(64)}.example.com/image.png`,
    `https://${Array.from({ length: 5 }, () => "a".repeat(63)).join(".")}/image.png`,
  ])("rejects a local, IP, malformed or non-public image destination: %j", (input) => {
    expect(normalizePublicImageUrl(input)).toBeNull();
  });

  it("does not fetch, inspect DNS, guarantee an image or infer whether a link will stay available", () => {
    const fetch = vi.spyOn(globalThis, "fetch").mockImplementation(() => {
      throw new Error("Public image validation must remain local and deterministic");
    });
    try {
      expect(normalizePublicImageUrl("https://cdn.example.com/not-an-image?download=1")).toBe(
        "https://cdn.example.com/not-an-image?download=1",
      );
      expect(fetch).not.toHaveBeenCalled();
    } finally {
      fetch.mockRestore();
    }
  });
});

describe("shared plain inline normalization", () => {
  it("normalizes lines, whitespace and unsafe controls without interpreting markup", () => {
    expect(normalizeInlineText(" \tHello\r\nworld\u2028again\u2029there ")).toBe(
      "Hello world again there",
    );
    expect(normalizeInlineText("\u0000ab\u202ecd\u2066")).toBe("\ufffdab\ufffdcd\ufffd");
    expect(normalizeInlineText(" <img src=x> & **text** @name: [link]! ")).toBe(
      "<img src=x> & **text** @name: [link]!",
    );
  });

  it("preserves the existing escaped inline output after sharing the normalization step", () => {
    expect(escapeInlineText(" <img src=x> & **text** @name: [link]! \r\n next ")).toBe(
      "&lt;img src\\=x&gt; &amp; \\*\\*text\\*\\* &#64;name&#58; \\[link\\]\\! next",
    );
    expect(escapeInlineText("\u0000ab\u202ecd\u2066")).toBe("\ufffdab\ufffdcd\ufffd");
  });
});
