# ADR 0010: Actividad opcional y tarjetas propias de GitHub

- Estado: aceptada para la implementación; habilitación real sujeta a configuración del despliegue.
- Fecha: 2026-10-19.
- Producto: GitHub Profile Generator.

## Contexto

El editor mantiene cinco secciones y sirve a personas con poca actividad pública. Se solicitó sumar calendario, resumen, lenguajes y aportes destacados sin convertirlos en requisitos del perfil. `ProfileDocument` v1 ya representa usuario y tarjetas en `metrics`, y aportes manuales en `contributions`; sus nueve IDs deben conservarse sin migración.

Los datos de GitHub dependen del período, los permisos de la credencial y sus límites. Un token amplio puede hacer accesible información privada que este producto no debe publicar. Una imagen referenciada desde un README necesita un servidor público: localhost permite revisar, pero no alojar imágenes accesibles para GitHub.

## Decisión

### Una sección, elecciones independientes

Usar **Actividad y contribuciones** en el slot `contributions`, con inclusión efectiva `visibility.contributions || visibility.metrics`. El slot `metrics` nunca genera una sección independiente y conserva su posición interna. Recuperar un borrador no normaliza flags. Ocultar desde la navegación apaga ambos; volver a mostrar incluye contribuciones y activa métricas si quedan tarjetas seleccionadas. Cada fuente respeta su flag al generar.

Los aportes manuales funcionan sin usuario. El bloque de GitHub es plegable, con tarjetas desactivadas inicialmente y consulta por botón. El formulario no consulta al escribir, abrir o recuperar; las imágenes ya seleccionadas pueden cargar actividad al mostrarse. Las sugerencias se agregan solo tras elegirlas y quedan editables como aportes manuales. Sin ranking, rachas predeterminadas ni inferencias de conocimiento.

### Modelo puro y snapshot temporal

Conservar v1 y la clave del borrador. Persistir únicamente `metrics.username/cards` y entradas elegidas de contribuciones. El snapshot validado de usuario, fecha, período, calendario, recuentos, lenguajes y sugerencias es un contrato remoto separado y temporal. El cliente valida, cancela solicitudes y descarta respuestas de otro usuario; diferencia ceros reales de errores y puede mostrar el último resultado válido con aviso.

`core/activity` contiene normalización, contratos y renderizado SVG puro. `server/github` consulta GraphQL mediante endpoint fijo, valida datos y limita recursos. Las rutas JSON y SVG solo coordinan estas responsabilidades. No hay SDK nuevo ni dependencia de un servicio externo de gráficos.

### Datos públicos verificables

Configurar exclusivamente en servidor un PAT classic dedicado mediante `GITHUB_TOKEN`, fuera de Git y de `NEXT_PUBLIC_`. Exigir `x-oauth-scopes` presente, vacío o exactamente `public_repo` en cada respuesta. Preferir únicamente `public_repo` para las consultas GraphQL de repositorios públicos según la documentación de GitHub; rechazar scopes adicionales, incluidos `repo` y `read:user`, o permisos no verificables como fine-grained. El cliente solo ejecuta lecturas, aunque ese scope permita otras operaciones públicas. La allowlist es una política deliberada del cliente actual, no soporte de todos los mecanismos de autenticación.

Rechazar perfiles privados y filtrar repositorios públicos propios no forks y destacados no restringidos. Admitir únicamente recuentos privados anónimos que la persona haya compartido públicamente, sin detalles. Los lenguajes son bytes de repositorios analizados, no conocimientos ni actividad del período del calendario. Limitar a 300 repositorios, 20 lenguajes por repositorio y 100 agregados, con indicador de muestra parcial.

### Caché y alojamiento

Limitar las consultas a 15 s y las respuestas a 2 MiB. La caché del proceso admite 512 snapshots y 512 fallos, frescura de 30 minutos y último resultado válido hasta 24 horas ante fallos transitorios; deduplica consultas y limita a cuatro distintas simultáneas y 60 por minuto. Respetar cuotas y Retry-After; no servir stale ante inexistencia o configuración inválida. Los límites son por proceso, sin prometer protección distribuida.

Las tarjetas son SVG pasivos propios, con texto escapado, colores validados, título/descripción accesibles y fechas explícitas UTC. No incluyen scripts, recursos externos, enlaces ni `foreignObject`. Sus respuestas llevan CSP restrictiva, `nosniff`, estado de actividad y caché. Una imagen no disponible explica el fallo sin inventar ceros.

`APP_URL` identifica el origen HTTPS público de la aplicación, nunca inferido del Host. La ruta del editor usa `await connection()` para leerlo en ejecución: cambiarlo requiere reiniciar el servicio, no recompilar; las otras páginas mantienen su generación estática. `generateReadme(document, { activityCardBaseUrl? })` genera el único Markdown del producto. Sin origen público válido usa rutas locales para revisar y devuelve éxito con `exportIssues: activity_not_configured`; los consumidores deben bloquear copia/descarga. Desmarcar tarjetas permite exportar el contenido manual. No hay un flujo de configuración de tokens dentro del producto.

## Alternativas consideradas

| Alternativa                                   | Motivo de descarte en esta entrega                                            |
| --------------------------------------------- | ----------------------------------------------------------------------------- |
| Sexta sección de métricas                     | Divide el mismo tema y complica composición y navegación.                     |
| Nuevo contrato v2                             | Los campos v1 ya representan las elecciones; migrar no aporta valor.          |
| Servicio público externo de tarjetas          | Agrega dependencia operativa y política de datos de otro proveedor.           |
| REST Events para reconstruir calendario anual | Su ventana y límite no representan un calendario anual completo.              |
| Pedir token a cada persona                    | Aumenta fricción y expone decisiones de operación en el recorrido del perfil. |
| Permitir un token con permisos amplios        | Cambia visibilidad de datos y puede publicar información privada.             |
| Guardar snapshots en el borrador              | Duplica información derivada y conserva datos que deberían actualizarse.      |

## Consecuencias y límites

El perfil manual permanece disponible sin servicios. Activar las consultas reales requiere una credencial aceptada; exportar gráficos requiere además alojamiento público. Esta decisión no confirma llamadas autenticadas, despliegue público, disponibilidad futura ni resultados de CI: la evidencia ejecutada se registra en [desarrollo](../development.md).

Las tarjetas del README se actualizan según caché y dependen de esta aplicación. Varias instancias requieren controles operativos compartidos si el uso lo justifica. Los datos nunca miden habilidad. La IA permanece fuera de esta integración y los tres módulos retirados no reaparecen.

## Fuentes

- [GitHub GraphQL: Users](https://docs.github.com/en/graphql/reference/users#contributionscollection): calendario, período, recuentos y visibilidad de aportes.
- [GitHub GraphQL: Repositories](https://docs.github.com/en/graphql/reference/repos#languageedge): lenguajes medidos por bytes de código.
- [Scopes de GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps): alcance público sin scopes y encabezados de permisos.
- [Autenticación GraphQL](https://docs.github.com/en/graphql/guides/forming-calls-with-graphql): scope `public_repo` documentado para repositorios públicos con PAT classic.
- [Límites de GraphQL](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api): cuotas, errores y reintentos.
- [Referencia de contribuciones](https://docs.github.com/en/account-and-profile/reference/profile-contributions-reference): criterios y límites del calendario.
- Guías locales de Next.js instalado: `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md` y `08-caching.md`. GET dinámico y caché explícita, sin habilitar Cache Components.

Esta decisión amplía la actividad dentro del alcance de cinco secciones de [ADR 0008](0008-focused-profile.md) y conserva la política cerrada de imágenes de [ADR 0009](0009-profile-icons.md).
