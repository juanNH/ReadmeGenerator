# ADR 0012: Categorías editables e iconos con nombre

- Estado: aceptada.
- Fecha: 2026-10-19.

## Contexto

Una fila de iconos sin nombres dificulta reconocer herramientas y el orden de selección mezcla ámbitos. El perfil debe seguir siendo breve: no requiere explicar cada tecnología ni completar una estructura de CV. Los borradores v1 ya conservan grupos, nombres y contextos propios.

## Decisión

Ampliar el catálogo local de 259 a 358 herramientas con fuentes de iconos ya fijadas y sin nuevas dependencias. Incluir frameworks, ORMs, autenticación, datos, infraestructura, calidad e IA. Esta selección es editorial, no un ranking de uso. La procedencia y las marcas compartidas están en [recursos de terceros](../../THIRD_PARTY_NOTICES.md).

Usar nueve categorías sugeridas: lenguajes, frontend, backend, móvil y escritorio, datos y mensajería, cloud y DevOps, testing y calidad, IA y automatización, herramientas y diseño. La clasificación resuelve nombres y alias desde core; no se guarda como otro contrato. Al agregar se puede elegir categoría sugerida, existente o ninguna. Crear, renombrar, ordenar, mover herramientas y editar notas son acciones secundarias. Quitar categoría borra solo su título. La edición de título usa un borrador efímero y se aplica al salir o pulsar Enter, para permitir renombrar una categoría vacía sin desmontar el campo enfocado.

Conservar `ProfileDocument` v1. No reorganizar al recuperar, cambiar idioma o generar el README. Los títulos son contenido personal; las sugerencias usan el idioma de interfaz al crearse. «Organizar por categoría» es explícito, explica el reemplazo de títulos y confirma si ya hay títulos. Conserva herramientas, contextos y duplicados recuperados. Las operaciones son puras e inmutables, reciben una función para nuevos IDs y resuelven colisiones de IDs locales al combinar colecciones. Los grupos internos vacíos sin nombre se ocultan sin borrar datos y no interfieren con el orden visible.

Exportar cada herramienta reconocida con icono decorativo de 20 × 20 y nombre visible escapado. Las herramientas propias siguen como texto y las notas mantienen su contenido. La vista previa reconoce únicamente tokens exactos del catálogo y conserva compatibilidad con los tokens anteriores de 32 × 32. No se habilita HTML libre ni imágenes arbitrarias.

## Alternativas y consecuencias

- Solo iconos: compacto, pero exige reconocer cada marca; se añade el nombre para legibilidad y accesibilidad.
- Reagrupar siempre: orden uniforme, pero sobrescribe decisiones personales; se usan sugerencias y organización explícita.
- Añadir un nuevo esquema de categorías: permitiría registrar su origen, pero duplicaría el contrato existente; se reutilizan los grupos v1 sin migración.
- No todos los productos tienen un icono disponible en las fuentes fijadas. Se admite texto propio y se documentan las marcas de familia compartidas.
- Los iconos del editor son locales; los exportados dependen de la disponibilidad de las URLs fijadas. La aplicación no integra las herramientas elegidas.

## Fuentes de selección

La ampliación se contrastó con documentación oficial: [Drizzle](https://orm.drizzle.team/docs/overview), [TypeORM](https://typeorm.io/docs/getting-started/), [Knex](https://knexjs.org/), [TanStack](https://tanstack.com/), [Hono](https://hono.dev/), [Pydantic](https://docs.pydantic.dev/latest/), [Qdrant](https://qdrant.tech/documentation/), [Temporal](https://docs.temporal.io/), [OpenRouter](https://openrouter.ai/docs/quickstart), [Firecrawl](https://docs.firecrawl.dev/) y [vLLM](https://docs.vllm.ai/en/latest/). Las referencias establecen la función de cada herramienta; no acreditan su popularidad.
