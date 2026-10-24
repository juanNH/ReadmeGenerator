import { open } from "node:fs/promises";
import { isIP } from "node:net";
import { pathToFileURL } from "node:url";
import { fromHtml } from "hast-util-from-html";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import { unified } from "unified";

const profileCards = [
  "calendar",
  "summary",
  "languages",
  "panorama",
  "monthly",
  "extended-stats",
  "extended-languages",
];
const resourceCards = new Set(["repository", "gist", "wakatime"]);
const appearanceKeys = [
  "theme",
  "palette",
  "design",
  "size",
  "preset",
  "titleColor",
  "textColor",
  "iconColor",
  "borderColor",
  "backgroundColor",
  "backgroundGradient",
  "borderRadius",
  "width",
  "lineHeight",
  "customTitle",
  "hideTitle",
  "hideBorder",
  "showIcons",
  "textBold",
  "numberFormat",
  "numberPrecision",
];
const maxReadmeBytes = 4 * 1024 * 1024;
const maxSvgBytes = 512 * 1024;
const maxCardCount = 256;
const requestTimeoutMs = 160_000;
const safeSvgTags = new Set([
  "svg",
  "title",
  "desc",
  "rect",
  "g",
  "text",
  "tspan",
  "line",
  "circle",
  "path",
  "polyline",
  "polygon",
  "defs",
  "linearGradient",
  "stop",
  "clipPath",
]);

export const helpText = `Comprueba tarjetas públicas sin iniciar sesión ni enviar credenciales.

Uso:
  pnpm cards:check --origin https://tu-proyecto.vercel.app --username usuario
  pnpm cards:check --origin https://tu-proyecto.vercel.app --readme README.md
  pnpm cards:check --origin https://tu-proyecto.vercel.app --readme README.md --local-origin http://127.0.0.1:3100

--origin         Origen público HTTPS configurado como APP_URL (sin rutas).
--username       Comprueba las siete tarjetas de perfil con opciones predeterminadas.
--readme         Comprueba todas las imágenes de tarjetas propias del origen indicado,
                 incluidas referencias Markdown y etiquetas img de HTML.
--local-origin   Prueba los mismos paths en un servidor loopback explícito.
                 Este modo NO comprueba el despliegue público.
--help           Muestra esta ayuda sin realizar peticiones.

Se pueden combinar --username y --readme. Los recursos externos se ignoran.
Se verifican GET y HEAD anónimos, estado de datos, SVG pasivo y caché pública.
Vercel puede retirar s-maxage: se informa HIT/STALE/MISS y TTL no observable.
MISS no demuestra un acierto de caché; BYPASS se considera un fallo de caché.
No publica ni modifica GitHub, no comprueba Camo y no reemplaza la prueba del
README en GitHub después de desplegar. Cada URL puede tardar hasta 160 s por método.`;

class CardCheckError extends Error {}

function invalid(message) {
  throw new CardCheckError(message);
}

function normalizeUsername(value) {
  const result = value.trim().replace(/^@/, "").toLowerCase();
  return result.length <= 39 && /^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*$/.test(result) ? result : null;
}

export function normalizeOrigin(value, local = false) {
  let url;
  try {
    url = new URL(value);
  } catch {
    invalid("El origen indicado no es válido.");
  }
  const host = url.hostname.toLowerCase();
  if (url.username || url.password || url.pathname !== "/" || url.search || url.hash)
    invalid("El origen debe contener únicamente protocolo, dominio y, en modo local, puerto.");
  if (local) {
    if (
      !["http:", "https:"].includes(url.protocol) ||
      !["127.0.0.1", "localhost", "[::1]"].includes(host)
    )
      invalid("--local-origin admite únicamente un servidor loopback HTTP o HTTPS.");
  } else if (
    url.protocol !== "https:" ||
    url.port ||
    !host.includes(".") ||
    isIP(host.replace(/^\[|\]$/g, "")) ||
    /^[\d.]+$/.test(host) ||
    /(?:^|\.)(?:localhost|local|internal|test|invalid)$/.test(host)
  ) {
    invalid("--origin requiere un dominio público HTTPS sin puerto.");
  }
  return url.origin;
}

export function parseArguments(args) {
  if (args.length === 1 && args[0] === "--help") return { help: true };
  const options = {};
  for (let index = 0; index < args.length; index += 2) {
    const key = args[index];
    if (!["--origin", "--username", "--readme", "--local-origin"].includes(key))
      invalid("Opción desconocida. Consultá --help.");
    const value = args[index + 1];
    if (!value || value.startsWith("--") || options[key] !== undefined)
      invalid("Cada opción requiere un único valor no vacío.");
    options[key] = value;
  }
  if (!options["--origin"] || (!options["--username"] && !options["--readme"]))
    invalid("Indicá --origin y al menos --username o --readme. Consultá --help.");
  const username = options["--username"] && normalizeUsername(options["--username"]);
  if (options["--username"] && !username) invalid("El usuario de GitHub no es válido.");
  return {
    origin: normalizeOrigin(options["--origin"]),
    ...(username ? { username } : {}),
    ...(options["--readme"] ? { readme: options["--readme"] } : {}),
    ...(options["--local-origin"]
      ? { localOrigin: normalizeOrigin(options["--local-origin"], true) }
      : {}),
  };
}

function walk(tree, visit) {
  const pending = [{ node: tree, depth: 0 }];
  let count = 0;
  while (pending.length) {
    const { node, depth } = pending.pop();
    if (++count > 50_000 || depth > 64) invalid("El documento excede los límites de análisis.");
    visit(node);
    for (const child of [...(node.children ?? [])].reverse())
      pending.push({ node: child, depth: depth + 1 });
  }
}

function markdownImageUrls(source) {
  const tree = unified().use(remarkParse).use(remarkGfm).parse(source);
  const definitions = new Map();
  const images = [];
  const references = [];
  walk(tree, (node) => {
    if (node.type === "definition" && !definitions.has(node.identifier))
      definitions.set(node.identifier, node.url);
    if (node.type === "image") images.push(node.url);
    if (node.type === "imageReference") references.push(node.identifier);
    if (node.type === "html") {
      walk(fromHtml(node.value, { fragment: true }), (element) => {
        if (
          element.type === "element" &&
          element.tagName === "img" &&
          typeof element.properties.src === "string"
        )
          images.push(element.properties.src);
      });
    }
  });
  for (const reference of references) {
    const value = definitions.get(reference);
    if (value) images.push(value);
  }
  return images;
}

function validateCardUrl(url) {
  if (url.href.length > 12_000 || url.username || url.password || url.hash)
    invalid("Una URL de tarjeta contiene partes no admitidas o excede el límite.");
  const profile = /^\/cards\/github\/([a-z\d-]+)\/([a-z-]+)\.svg$/.exec(url.pathname);
  const resource = /^\/cards\/extended\/([a-z]+)\.svg$/.exec(url.pathname);
  if (
    (!profile && !resource) ||
    (profile &&
      (normalizeUsername(profile[1]) !== profile[1] || !profileCards.includes(profile[2]))) ||
    (resource && !resourceCards.has(resource[1]))
  )
    invalid("El README contiene una ruta de tarjeta propia no admitida.");
  const allowed = new Set([
    "locale",
    "columns",
    ...appearanceKeys,
    ...(resource ? ["target", "options"] : ["stats", "languages"]),
  ]);
  for (const key of url.searchParams.keys()) {
    if (!allowed.has(key) || url.searchParams.getAll(key).length !== 1)
      invalid("Una tarjeta contiene parámetros desconocidos o repetidos.");
    const value = url.searchParams.get(key);
    if (value.length > (key === "options" ? 4000 : 8000))
      invalid("Un parámetro de tarjeta excede el límite.");
  }
  const locale = url.searchParams.get("locale");
  if (locale !== null && locale !== "en" && locale !== "es")
    invalid("Una tarjeta contiene un idioma no admitido.");
  const columns = url.searchParams.get("columns");
  if (columns !== null && columns !== "1" && columns !== "2")
    invalid("Una tarjeta contiene una cantidad de columnas no admitida.");
  if (resource) {
    const target = url.searchParams.get("target") ?? "";
    if (
      (resource[1] === "repository" &&
        !/^[a-z\d](?:[a-z\d]|-(?=[a-z\d]))*\/[a-z\d_.-]{1,100}$/.test(target)) ||
      (resource[1] === "gist" && !/^[a-f\d]{5,64}$/.test(target)) ||
      (resource[1] === "wakatime" && (!/^[a-z\d_-]{1,64}$/.test(target) || target === "current"))
    )
      invalid("Una tarjeta de recurso contiene un destino no admitido.");
  }
}

export function collectCardUrls({ origin, username, source }) {
  const canonicalOrigin = normalizeOrigin(origin);
  const urls = new Set();
  if (username) {
    const normalized = normalizeUsername(username);
    if (!normalized) invalid("El usuario de GitHub no es válido.");
    for (const card of profileCards)
      urls.add(`${canonicalOrigin}/cards/github/${normalized}/${card}.svg?locale=en`);
  }
  if (source !== undefined) {
    if (Buffer.byteLength(source, "utf8") > maxReadmeBytes)
      invalid("El README supera el límite de 4 MiB.");
    for (const value of markdownImageUrls(source)) {
      let url;
      try {
        url = new URL(value);
      } catch {
        continue;
      }
      // Compare parsed origins, never a string prefix supplied by the Markdown.
      if (url.origin !== canonicalOrigin || !url.pathname.startsWith("/cards/")) continue;
      validateCardUrl(url);
      urls.add(url.href);
      if (urls.size > maxCardCount) invalid("El README contiene más de 256 tarjetas distintas.");
    }
  }
  if (urls.size === 0)
    invalid("No se encontraron imágenes de tarjetas propias del origen indicado.");
  return [...urls];
}

export function validateSvg(source) {
  // This checks the passive output contract, not arbitrary user SVG or full XML conformance.
  if (/<!|<\?|[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(source))
    invalid("El SVG contiene declaraciones o controles no admitidos.");
  const stack = [];
  const tags = /<([^<>]+)>/g;
  let end = 0;
  let rootCount = 0;
  let match;
  while ((match = tags.exec(source))) {
    const text = source.slice(end, match.index);
    if (text.includes("<") || text.includes(">") || (stack.length === 0 && text.trim()))
      invalid("El cuerpo no es un SVG completo.");
    const token = match[1];
    const closing = /^\/([A-Za-z][A-Za-z\d]*)\s*$/.exec(token);
    if (closing) {
      if (stack.pop() !== closing[1])
        invalid("El SVG contiene etiquetas sin cerrar correctamente.");
    } else {
      const opening = /^([A-Za-z][A-Za-z\d]*)(\s[^]*?)?\/?$/.exec(token);
      if (!opening || !safeSvgTags.has(opening[1]))
        invalid("El SVG contiene elementos no pasivos.");
      if (stack.length === 0 && (opening[1] !== "svg" || ++rootCount !== 1))
        invalid("El cuerpo debe contener una única raíz SVG.");
      const attributes = (opening[2] ?? "").replace(/\/$/, "");
      const remainder = attributes.replace(
        /\s+[A-Za-z_:][\w:.-]*\s*=\s*(?:"[^"<>]*"|'[^'<>]*')/g,
        "",
      );
      if (remainder.trim()) invalid("El SVG contiene atributos no válidos.");
      if (!token.endsWith("/")) stack.push(opening[1]);
    }
    end = tags.lastIndex;
  }
  if (stack.length || rootCount !== 1 || source.slice(end).trim())
    invalid("El cuerpo no es un SVG completo.");
  if (/&(?!amp;|lt;|gt;|quot;|apos;|#\d+;|#x[a-f\d]+;)/i.test(source))
    invalid("El SVG contiene entidades no admitidas.");
  const tree = fromHtml(source, { fragment: true });
  const root = tree.children.find((node) => node.type === "element");
  if (
    !root ||
    root.tagName !== "svg" ||
    root.properties.xmlns !== "http://www.w3.org/2000/svg" ||
    !/^[\d.]+$/.test(String(root.properties.width)) ||
    !/^[\d.]+$/.test(String(root.properties.height)) ||
    !(Number(root.properties.width) > 0 && Number(root.properties.width) <= 10_000) ||
    !(Number(root.properties.height) > 0 && Number(root.properties.height) <= 10_000)
  )
    invalid("El SVG no declara espacio de nombres o dimensiones válidas.");
  walk(tree, (node) => {
    if (node.type !== "element") return;
    if (!safeSvgTags.has(node.tagName)) invalid("El SVG contiene elementos no pasivos.");
    for (const [key, value] of Object.entries(node.properties)) {
      if (/^on|href|src|^style$|^className$/i.test(key))
        invalid("El SVG contiene atributos activos o recursos externos.");
      const text = String(value);
      if (/url\(/i.test(text) && !/^url\(#[a-z][\w.-]*\)$/i.test(text))
        invalid("El SVG contiene recursos externos.");
    }
  });
}

function validateResponse(response) {
  if (response.status !== 200 || response.redirected)
    invalid("La URL no responde directamente con HTTP 200.");
  if (!/^image\/svg\+xml(?:\s*;|$)/i.test(response.headers.get("content-type") ?? ""))
    invalid("La respuesta no tiene el tipo image/svg+xml.");
  const state = response.headers.get("x-activity-state");
  if (state !== "ready" && state !== "stale")
    invalid("La tarjeta no contiene datos disponibles (ready/stale).");
  const cache = response.headers.get("cache-control") ?? "";
  const vercelCache = response.headers.get("x-vercel-cache")?.toUpperCase();
  if (!/(?:^|,)\s*public\s*(?:,|$)/i.test(cache) || /(?:private|no-store)/i.test(cache))
    invalid("La tarjeta no permite una caché pública.");
  if (vercelCache === "BYPASS")
    invalid("Vercel informa BYPASS: la respuesta no acredita caché CDN.");
  const visibleTtl = /(?:^|,)\s*s-maxage=([1-9]\d*)\s*(?:,|$)/i.exec(cache);
  if (!visibleTtl && !["HIT", "STALE", "MISS"].includes(vercelCache))
    invalid("No se observa s-maxage positivo ni una señal de caché Vercel reconocida.");
  if (response.headers.get("x-content-type-options")?.toLowerCase() !== "nosniff")
    invalid("Falta la protección nosniff de la tarjeta.");
  if (response.headers.has("set-cookie"))
    invalid("La respuesta anónima intenta establecer una cookie.");
  return {
    state,
    cache: ["HIT", "STALE", "MISS"].includes(vercelCache) ? vercelCache : "public-ttl",
    ...(visibleTtl ? { ttlSeconds: Number(visibleTtl[1]) } : {}),
  };
}

async function readSvg(response, limit) {
  const length = Number(response.headers.get("content-length"));
  if (length > limit) {
    await response.body?.cancel();
    invalid("La respuesta SVG excede el límite de tamaño.");
  }
  if (!response.body) invalid("La tarjeta no devuelve un cuerpo SVG.");
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      invalid("La respuesta SVG excede el límite de tamaño.");
    }
    chunks.push(value);
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(Buffer.concat(chunks));
  } catch {
    invalid("La respuesta SVG no es texto UTF-8 válido.");
  }
}

export async function checkCard(
  value,
  { fetchImpl = fetch, localOrigin, timeoutMs = requestTimeoutMs, svgLimit = maxSvgBytes } = {},
) {
  const url = new URL(value);
  normalizeOrigin(url.origin);
  validateCardUrl(url);
  const target = localOrigin
    ? new URL(`${url.pathname}${url.search}`, normalizeOrigin(localOrigin, true)).href
    : url.href;
  const states = [];
  for (const method of ["GET", "HEAD"]) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response;
    try {
      try {
        response = await fetchImpl(target, {
          method,
          redirect: "error",
          credentials: "omit",
          headers: { Accept: "image/svg+xml" },
          signal: controller.signal,
        });
      } catch {
        invalid("No se pudo obtener la tarjeta sin redirección dentro del tiempo disponible.");
      }
      states.push(validateResponse(response));
      if (method === "GET") validateSvg(await readSvg(response, svgLimit));
      else await response.body?.cancel();
    } finally {
      clearTimeout(timer);
      if (response?.body && !response.body.locked) {
        try {
          await response.body.cancel();
        } catch {
          // A body may already be consumed or cancelled by the bounded reader.
        }
      }
    }
  }
  return {
    ...states[0],
    state: states.some((result) => result.state === "stale") ? "stale" : "ready",
  };
}

async function readReadme(filename) {
  let file;
  try {
    file = await open(filename, "r");
    const stats = await file.stat();
    if (!stats.isFile() || stats.size > maxReadmeBytes)
      invalid("El README debe ser un archivo de hasta 4 MiB.");
    const buffer = Buffer.alloc(maxReadmeBytes + 1);
    let length = 0;
    while (length < buffer.length) {
      const read = await file.read(buffer, length, buffer.length - length, null);
      if (!read.bytesRead) break;
      length += read.bytesRead;
    }
    if (length > maxReadmeBytes) invalid("El README supera el límite de 4 MiB.");
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer.subarray(0, length));
  } finally {
    await file?.close();
  }
}

export async function run(
  args,
  { fetchImpl = fetch, log = console.log, error = console.error, readFileImpl = readReadme } = {},
) {
  let options;
  let urls;
  try {
    options = parseArguments(args);
    if (options.help) {
      log(helpText);
      return 0;
    }
    let source;
    if (options.readme) {
      try {
        source = await readFileImpl(options.readme);
      } catch {
        invalid("No se pudo leer el README como texto UTF-8 de hasta 4 MiB.");
      }
    }
    urls = collectCardUrls({ ...options, source });
  } catch {
    error(
      "No se pudo preparar la comprobación. Revisá los argumentos, las rutas, los parámetros y los límites del README. Consultá --help.",
    );
    return 1;
  }
  if (options.localOrigin)
    log(
      "Modo local: se prueban los paths exportados; el dominio público y Camo quedan pendientes.",
    );
  else
    log(
      "Comprobación anónima del origen público. Esta prueba no publica ni modifica GitHub y no comprueba Camo.",
    );
  let failures = 0;
  for (const [index, url] of urls.entries()) {
    // Report only trusted route paths, never caller query values or upstream bodies/errors.
    const label = `${index + 1}/${urls.length} ${new URL(url).pathname}`;
    try {
      const result = await checkCard(url, { fetchImpl, localOrigin: options.localOrigin });
      const cacheDetail = result.ttlSeconds
        ? `caché ${result.cache}, TTL CDN ${result.ttlSeconds} s`
        : `caché Vercel ${result.cache}, TTL CDN no observable${result.cache === "MISS" ? "; MISS no demuestra un acierto" : ""}`;
      log(`OK ${label}: GET y HEAD, SVG pasivo, datos ${result.state}, ${cacheDetail}.`);
    } catch (failure) {
      failures++;
      error(
        `ERROR ${label}: ${failure instanceof CardCheckError ? failure.message : "La comprobación no pudo completarse."}`,
      );
    }
  }
  log(
    `${urls.length - failures}/${urls.length} tarjetas verificadas. Falta comprobar el README publicado en GitHub y su proxy de imágenes.`,
  );
  return failures ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  process.exitCode = await run(process.argv.slice(2));
}
