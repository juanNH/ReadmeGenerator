import { test } from "@playwright/test";

/** Usa un contexto móvil para pruebas que verifican el comportamiento en teléfonos. */
export const mobileTest = test.extend({
  context: async ({ browser }, runTest) => {
    const context = await browser.newContext({
      baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3000",
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      colorScheme: "light",
      reducedMotion: "reduce",
    });
    await runTest(context);
    await context.close();
  },
});
