import localFont from "next/font/local";

export const geistSans = localFont({
  src: "../../node_modules/@fontsource-variable/geist/files/geist-latin-wght-normal.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
  fallback: ["Arial", "Helvetica", "sans-serif"],
});

export const geistMono = localFont({
  src: "../../node_modules/@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
  preload: false,
  fallback: ["Courier New", "monospace"],
});
