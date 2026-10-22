# ADR 0038: Indexación de producción y URL canónicas localizadas

- Estado: Aceptada.
- Fecha: 2026-10-22.

## Contexto

El layout localizado deshabilitaba la indexación en todos los entornos. La aplicación ahora tiene páginas públicas de inicio, About y privacidad en inglés y español; también tiene un editor, herramientas internas, rutas API y tarjetas SVG que no deben aparecer en resultados ni en el sitemap. El dominio debe provenir de configuración pública validada, no del encabezado Host ni de una URL temporal de Preview.

`next-intl` genera enlaces de idioma en el encabezado `Link` de las respuestas por defecto. El proyecto también necesita enlaces canónicos en el HTML inicial y entradas localizadas coherentes en el sitemap.

## Decisión

- En Vercel, habilitar indexación solo cuando `VERCEL_ENV` sea exactamente `production` y exista un origen HTTPS público válido. En servidores autoalojados, requerir `PUBLIC_SITE_INDEXING_ENABLED=true` junto con `NODE_ENV=production`. Preview y desarrollo permanecen en `noindex`, incluso si `APP_URL` tiene un origen válido.
- Resolver el origen público desde `APP_URL` o desde `VERCEL_PROJECT_PRODUCTION_URL` exclusivamente en Vercel Production, con la política de validación de [ADR 0036](0036-production-card-origin.md). Nunca construir URLs canónicas desde la petición.
- Desactivar los alternates automáticos de `next-intl` y generar `canonical` y `hreflang` explícitos para las rutas localizadas de inicio, About y privacidad. Cada idioma es canónico en su propio idioma.
- Incluir esas tres rutas en ambos idiomas en el sitemap. Excluir editor, design-system, rutas desconocidas, API y tarjetas.
- Mantener `Allow: /` en `robots.txt` para que los buscadores puedan leer directivas `noindex`. Excluir del índice el editor y los errores 404 mediante metadata; añadir `X-Robots-Tag: noindex, nofollow` a API y tarjetas.
- La ruta raíz conserva la redirección de idioma; `/en` y `/es` son sus destinos canónicos.

## Alternativas consideradas

- Conservar los alternates automáticos de `next-intl` y omitir canónicos por ruta: rechazada porque no define el canonical de cada página y puede dejar una mezcla de encabezados y etiquetas HTML.
- Canonicalizar todo al inglés: rechazada porque desautoriza las páginas españolas.
- Incluir cualquier ruta para que se descubra automáticamente: rechazada porque expondría rutas internas, API o tarjetas como contenido indexable.
- Bloquear Preview en `robots.txt`: rechazada porque impediría a los buscadores leer el `noindex` de esas páginas; `robots.txt` no controla el acceso.
- Inferir el origen desde `Host`, `VERCEL_URL` o alias de rama: rechazada porque puede generar canonicales controlados por la petición o temporales.

## Consecuencias

El HTML de producción debe contener canonical y alternates absolutos por página pública; el sitemap debe enumerar exactamente las seis URLs públicas localizadas. Preview y desarrollo no generan canonicales ni sitemap y sus páginas permanecen en `noindex`. El acceso a Search Console y la comprobación de redes sociales quedan como verificaciones externas separadas.

Ver también [despliegue en Vercel](../vercel-deployment.md) y [origen estable de tarjetas](0036-production-card-origin.md).
