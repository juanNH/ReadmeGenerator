import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import {
  checkCard,
  collectCardUrls,
  normalizeOrigin,
  parseArguments,
  run,
  validateSvg,
} from "./check-public-cards.mjs";

const origin = "https://cards.example.com";
const url = `${origin}/cards/github/alex/summary.svg?locale=es`;
const svg =
  '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="300" viewBox="0 0 700 300"><title>Perfil &amp; actividad</title><rect width="700" height="300"/><text x="20" y="30">42</text></svg>';

function response(method = "GET", overrides = {}) {
  return new Response(method === "HEAD" ? null : (overrides.body ?? svg), {
    status: overrides.status ?? 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=1800, stale-if-error=86400",
      "X-Activity-State": "ready",
      "X-Content-Type-Options": "nosniff",
      ...overrides.headers,
    },
  });
}

test("argumentos: normaliza orígenes y usuario sin pedir credenciales", () => {
  assert.deepEqual(parseArguments(["--origin", origin + "/", "--username", "@Alex"]), {
    origin,
    username: "alex",
  });
  assert.deepEqual(parseArguments(["--help"]), { help: true });
  assert.equal(
    parseArguments([
      "--origin",
      origin,
      "--readme",
      "README.md",
      "--local-origin",
      "http://127.0.0.1:3100",
    ]).localOrigin,
    "http://127.0.0.1:3100",
  );
});

test("argumentos: rechaza desconocidos, repetidos, incompletos y usuarios inválidos", () => {
  for (const args of [
    [],
    ["--origin", origin],
    ["--token", "secret"],
    ["--origin", origin, "--username", "alex", "--username", "other"],
    ["--origin", origin, "--username", "bad--name"],
    ["--origin", origin, "--username", "--readme"],
    ["--help", "--token", "secret"],
  ]) {
    assert.throws(() => parseArguments(args));
  }
});

test("origen público: rechaza hosts locales, IP, credenciales, rutas, query y puertos", () => {
  for (const value of [
    "http://cards.example.com",
    "https://127.0.0.1",
    "https://[::1]",
    "https://localhost",
    "https://host.local",
    "https://host.internal",
    "https://host.test",
    "https://host.invalid",
    "https://a:b@cards.example.com",
    `${origin}/path`,
    `${origin}?token=secret`,
    `${origin}#fragment`,
    `${origin}:444`,
  ]) {
    assert.throws(() => normalizeOrigin(value));
  }
});

test("origen local: únicamente loopback explícito", () => {
  for (const value of ["http://localhost:3100", "http://127.0.0.1:3100", "http://[::1]:3100"])
    assert.equal(normalizeOrigin(value, true), value);
  for (const value of [
    "http://192.168.0.1:3100",
    "http://127.0.0.2",
    "http://localhost.evil.com",
    origin,
    "file:///tmp/test",
    "http://localhost:3100/path",
  ])
    assert.throws(() => normalizeOrigin(value, true));
});

test("genera siete rutas válidas con usuario canónico", () => {
  const urls = collectCardUrls({ origin, username: "@Alex" });
  assert.equal(urls.length, 7);
  assert.equal(new Set(urls).size, 7);
  assert.ok(
    urls.every(
      (value) => value.startsWith(`${origin}/cards/github/alex/`) && value.endsWith("?locale=en"),
    ),
  );
  assert.ok(urls.some((value) => value.includes("extended-stats.svg")));
  assert.ok(urls.some((value) => value.includes("extended-languages.svg")));
});

test("README: reúne Markdown, referencias y HTML decodificando parámetros", () => {
  const source = `![Resumen](${url})
![Lenguajes][languages]
<p><img src="${origin}/cards/extended/repository.svg?locale=es&amp;target=alex%2Frepo&amp;customTitle=Proyecto+%26+ideas" alt="Proyecto"></p>

[languages]: ${origin}/cards/github/alex/extended-languages.svg?locale=en&languages=%7B%22layout%22%3A%22compact%22%7D
![Duplicado](${url})`;
  const urls = collectCardUrls({ origin, source });
  assert.equal(urls.length, 3);
  const repository = new URL(urls.find((value) => value.includes("/repository.svg")));
  assert.equal(repository.searchParams.get("target"), "alex/repo");
  assert.equal(repository.searchParams.get("customTitle"), "Proyecto & ideas");
  assert.equal(repository.searchParams.has("amp;target"), false);
});

test("README: incluye Gist y WakaTime sin usuario GitHub", () => {
  const urls = collectCardUrls({
    origin,
    source: `![Gist](${origin}/cards/extended/gist.svg?target=abcde&locale=en)
![WakaTime](${origin}/cards/extended/wakatime.svg?target=public_user&locale=en)`,
  });
  assert.equal(urls.length, 2);
});

test("README: ignora hosts ajenos, prefijos engañosos, enlaces y código literal", () => {
  const source = `![Real](${url})
![Externo](https://outside.example.com/cards/github/alex/summary.svg?locale=es)
![Engaño](${origin}.evil.com/cards/github/alex/summary.svg?locale=es)
[Solo enlace](${origin}/cards/github/other/calendar.svg?locale=es)
\`![Código](${origin}/cards/github/other/monthly.svg?locale=es)\`
\`\`\`md
![Fence](${origin}/cards/github/other/panorama.svg?locale=es)
\`\`\``;
  assert.deepEqual(collectCardUrls({ origin, source }), [url]);
});

test("README: las rutas propias inválidas y parámetros repetidos fallan antes de pedir red", () => {
  for (const value of [
    `${origin}/cards/github/alex/unknown.svg?locale=en`,
    `${url}&locale=en`,
    `${url}&token=secret`,
    `${url}#fragment`,
    `${origin}/cards/extended/repository.svg?target=https%3A%2F%2Fevil.com`,
    `${origin}/cards/github/alex/summary.svg?locale=fr`,
  ]) {
    assert.throws(() => collectCardUrls({ origin, source: `![Tarjeta](${value})` }));
  }
});

test("README: falla si no contiene tarjetas, excede 4 MiB o 256 URLs distintas", () => {
  assert.throws(() => collectCardUrls({ origin, source: "Sin imágenes" }));
  assert.throws(() => collectCardUrls({ origin, source: "x".repeat(4 * 1024 * 1024 + 1) }));
  assert.throws(() =>
    collectCardUrls({
      origin,
      source: Array.from(
        { length: 257 },
        (_, index) => `![${index}](${url}&width=${400 + index})`,
      ).join("\n"),
    }),
  );
});

test("SVG: acepta gráficos pasivos con gradientes internos", () => {
  validateSvg(svg);
  validateSvg(
    '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="300"><defs><linearGradient id="background"><stop offset="0" stop-color="#ffffff"/></linearGradient></defs><rect fill="url(#background)" width="700" height="300"/></svg>',
  );
});

test("SVG: rechaza HTML, XML incompleto y dimensiones ausentes o fuera de límite", () => {
  for (const value of [
    "<html><body>Login</body></html>",
    svg.replace("</svg>", ""),
    svg.replace("</text>", "</g>"),
    svg.replace('width="700"', 'width="10001"'),
    svg.replace('height="300"', 'height="0"'),
    svg.replace('xmlns="http://www.w3.org/2000/svg"', ""),
    svg + svg,
  ])
    assert.throws(() => validateSvg(value));
});

test("SVG: rechaza recursos externos, eventos, scripts y declaraciones XML", () => {
  for (const content of [
    "<script>alert(1)</script>",
    '<image href="https://external.example.com/image.png"/>',
    "<foreignObject><p>Texto</p></foreignObject>",
    '<rect onclick="alert(1)"/>',
    '<rect fill="url(https://external.example.com/image.png)"/>',
    '<rect style="fill:red"/>',
    '<a href="#x"><text>X</text></a>',
    '<animate attributeName="x"/>',
  ]) {
    assert.throws(() => validateSvg(svg.replace("</svg>", content + "</svg>")));
  }
  assert.throws(() => validateSvg('<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///secret">]>' + svg));
});

test("HTTP: GET y HEAD anónimos, sin cookies ni redirecciones", async () => {
  const calls = [];
  const result = await checkCard(url, {
    fetchImpl: async (target, options) => {
      calls.push({ target, options });
      return response(options.method);
    },
  });
  assert.deepEqual(result, { state: "ready", cache: "public-ttl", ttlSeconds: 1800 });
  assert.deepEqual(
    calls.map((call) => call.options.method),
    ["GET", "HEAD"],
  );
  for (const call of calls) {
    assert.equal(call.target, url);
    assert.equal(call.options.redirect, "error");
    assert.equal(call.options.credentials, "omit");
    assert.deepEqual(call.options.headers, { Accept: "image/svg+xml" });
    assert.ok(call.options.signal instanceof AbortSignal);
  }
});

test("HTTP: remapea exclusivamente origen conservando path y opciones escapadas", async () => {
  const source = `${url}&customTitle=Proyecto+%26+ideas`;
  const calls = [];
  await checkCard(source, {
    localOrigin: "http://127.0.0.1:3100",
    fetchImpl: async (target, options) => {
      calls.push(target);
      return response(options.method);
    },
  });
  assert.deepEqual(calls, [
    source.replace(origin, "http://127.0.0.1:3100"),
    source.replace(origin, "http://127.0.0.1:3100"),
  ]);
  await assert.rejects(checkCard(url, { localOrigin: "https://other.example.com" }));
});

test("HTTP: un SVG HTTP 200 unavailable es fallo", async () => {
  await assert.rejects(
    checkCard(url, {
      fetchImpl: async () => response("GET", { headers: { "X-Activity-State": "unavailable" } }),
    }),
    /no contiene datos/,
  );
});

test("HTTP: stale es aceptado e identificado", async () => {
  assert.deepEqual(
    await checkCard(url, {
      fetchImpl: async (_target, options) =>
        response(options.method, { headers: { "X-Activity-State": "stale" } }),
    }),
    { state: "stale", cache: "public-ttl", ttlSeconds: 1800 },
  );
});

test("HTTP: acepta s-maxage consumido por Vercel con HIT, STALE o MISS identificados", async () => {
  for (const cache of ["HIT", "STALE", "MISS"]) {
    assert.deepEqual(
      await checkCard(url, {
        fetchImpl: async (_target, options) =>
          response(options.method, {
            headers: {
              "Cache-Control": "public, max-age=0, must-revalidate",
              "X-Vercel-Cache": cache,
            },
          }),
      }),
      { state: "ready", cache },
    );
  }
});

test("HTTP: sin TTL visible ni señal Vercel no acredita caché; BYPASS tampoco", async () => {
  for (const cache of [undefined, "UNKNOWN", "BYPASS"]) {
    await assert.rejects(
      checkCard(url, {
        fetchImpl: async (_target, options) =>
          response(options.method, {
            headers: {
              "Cache-Control": "public, max-age=0, must-revalidate",
              ...(cache ? { "X-Vercel-Cache": cache } : {}),
            },
          }),
      }),
    );
  }
  await assert.rejects(
    checkCard(url, {
      fetchImpl: async (_target, options) =>
        response(options.method, {
          headers: { "X-Vercel-Cache": "BYPASS" },
        }),
    }),
    /BYPASS/,
  );
});

test("CLI: un primer MISS informa TTL no observable y no afirma un acierto", async () => {
  const logs = [];
  assert.equal(
    await run(["--origin", origin, "--readme", "README.md"], {
      readFileImpl: async () => `![Tarjeta](${url})`,
      fetchImpl: async (_target, options) =>
        response(options.method, {
          headers: {
            "Cache-Control": "public, max-age=0, must-revalidate",
            "X-Vercel-Cache": "MISS",
          },
        }),
      log: (value) => logs.push(value),
    }),
    0,
  );
  assert.ok(
    logs.some((line) => line.includes("TTL CDN no observable; MISS no demuestra un acierto")),
  );
});

test("HTTP: redirecciones, login HTML y respuestas sin cabeceras requeridas fallan", async () => {
  const overrides = [
    { status: 302, headers: { Location: "https://login.example.com" } },
    { headers: { "Content-Type": "text/html" }, body: "<html>Login</html>" },
    { headers: { "Cache-Control": "private, max-age=300" } },
    { headers: { "Cache-Control": "public, s-maxage=0" } },
    { headers: { "Cache-Control": "public, s-maxage=1800, no-store" } },
    { headers: { "X-Content-Type-Options": "" } },
    { headers: { "Set-Cookie": "session=secret" } },
    { headers: { "X-Activity-State": "" } },
  ];
  for (const override of overrides)
    await assert.rejects(
      checkCard(url, { fetchImpl: async (_target, options) => response(options.method, override) }),
    );
});

test("HTTP: HEAD debe corroborar cabeceras y estado", async () => {
  await assert.rejects(
    checkCard(url, {
      fetchImpl: async (_target, options) =>
        response(
          options.method,
          options.method === "HEAD" ? { headers: { "Content-Type": "text/html" } } : {},
        ),
    }),
    /tipo image\/svg/,
  );
});

test("HTTP: limita cuerpo con y sin Content-Length", async () => {
  await assert.rejects(
    checkCard(url, { svgLimit: 20, fetchImpl: async () => response() }),
    /límite de tamaño/,
  );
  await assert.rejects(
    checkCard(url, {
      fetchImpl: async () => response("GET", { headers: { "Content-Length": "9000000" } }),
    }),
    /límite de tamaño/,
  );
});

test("HTTP: aborta la petición al vencer el plazo", async () => {
  await assert.rejects(
    checkCard(url, {
      timeoutMs: 5,
      fetchImpl: async (_target, options) =>
        new Promise((_resolve, reject) =>
          options.signal.addEventListener("abort", () =>
            reject(new Error("secret network details")),
          ),
        ),
    }),
    /tiempo disponible/,
  );
});

test("CLI: ayuda sin red y salida exitosa con siete tarjetas", async () => {
  let calls = 0;
  const logs = [];
  const fetchImpl = async (_target, options) => {
    calls++;
    return response(options.method);
  };
  assert.equal(await run(["--help"], { fetchImpl, log: (value) => logs.push(value) }), 0);
  assert.equal(calls, 0);
  assert.ok(logs[0].includes("no comprueba Camo"));
  assert.ok(logs[0].includes("160 s por método"));
  assert.equal(
    await run(["--origin", origin, "--username", "alex"], {
      fetchImpl,
      log: (value) => logs.push(value),
    }),
    0,
  );
  assert.equal(calls, 14);
  assert.ok(logs.at(-1).startsWith("7/7"));
});

test("CLI: ignora hosts externos y no imprime queries, cuerpos ni errores secretos", async () => {
  const secret = "SECRETO_NO_IMPRIMIR";
  const logs = [];
  const source = `![Propia](${url}&customTitle=${secret})\n![Externa](https://${secret}.example.com/cards/github/alex/summary.svg?locale=en)`;
  const targets = [];
  assert.equal(
    await run(["--origin", origin, "--readme", "README.md"], {
      readFileImpl: async () => source,
      fetchImpl: async (target) => {
        targets.push(target);
        throw new Error(secret);
      },
      log: (value) => logs.push(value),
      error: (value) => logs.push(value),
    }),
    1,
  );
  assert.equal(targets.length, 1);
  assert.equal(new URL(targets[0]).origin, origin);
  assert.equal(logs.join("\n").includes(secret), false);
});

test("CLI: no filtra errores de lectura de streams ni argumentos inválidos", async () => {
  const secret = "SECRETO_NO_IMPRIMIR";
  const logs = [];
  const logger = (value) => logs.push(value);
  assert.equal(
    await run(["--origin", `https://user:${secret}@cards.example.com`, "--username", "alex"], {
      log: logger,
      error: logger,
    }),
    1,
  );
  assert.equal(
    await run(["--origin", origin, "--readme", "README.md"], {
      readFileImpl: async () => `![Tarjeta](${url})`,
      fetchImpl: async () =>
        new Response(
          new ReadableStream({
            start(controller) {
              controller.error(new Error(secret));
            },
          }),
          { headers: Object.fromEntries(response().headers) },
        ),
      log: logger,
      error: logger,
    }),
    1,
  );
  assert.equal(logs.join("\n").includes(secret), false);
});

test("CLI: lee archivos locales con límite y reporta modo local", async () => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "public-cards-check-"));
  try {
    const filename = path.join(directory, "README.md");
    await writeFile(filename, `![Resumen](${url})`, "utf8");
    const logs = [];
    const args = [
      "--origin",
      origin,
      "--readme",
      filename,
      "--local-origin",
      "http://localhost:3100",
    ];
    assert.equal(
      await run(args, {
        fetchImpl: async (_target, options) => response(options.method),
        log: (value) => logs.push(value),
      }),
      0,
    );
    assert.ok(logs[0].startsWith("Modo local"));
    await writeFile(filename, "x".repeat(4 * 1024 * 1024 + 1), "utf8");
    assert.equal(
      await run(args, {
        fetchImpl: async () => {
          assert.fail("No debe consultar red");
        },
        error: () => {},
      }),
      1,
    );
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
