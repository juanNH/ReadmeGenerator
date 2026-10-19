# Instrucciones del proyecto

## Producto y alcance

GitHub Profile Generator es un generador visual de README para perfiles de GitHub. Ofrece cinco secciones opcionales: presentación, tecnologías, proyectos, actividad y contribuciones, y contacto. Debe servir a personas con distintos conocimientos y niveles de actividad pública. La actividad de GitHub no determina la habilidad de una persona.

La entrega actual incluye la base Next.js, el kit visual bilingüe, `ProfileDocument` versión 1 y un editor de perfil breve con vista previa, copia, descarga y borrador local. Actividad y contribuciones reúne aportes manuales y tres tarjetas opcionales de GitHub: calendario, resumen y lenguajes. La consulta pública requiere configuración exclusiva del servidor y una acción explícita; el recorrido manual no necesita cuenta ni credenciales. Las tarjetas exportables requieren un origen público HTTPS que las aloje. Conocimientos, formación y actualidad siguen retirados de navegación, formularios y salida; sus datos y posiciones v1 se conservan sin fusionarlos. La navegación, la configuración estable y el arrastre distinguen inclusión de edición. No hay asistencia con IA. No presentar una integración sin configurar como servicio habilitado.

## Cómo trabajar

- Comunicar y documentar en español; nombrar código, archivos de código y símbolos en inglés.
- Leer las instrucciones del ámbito afectado, el código existente y la documentación necesaria antes de editar. Los enlaces de este archivo no cargan automáticamente todos los documentos en el contexto de una IA.
- Continuar de forma autónoma dentro del alcance autorizado. Consultar antes de ampliar el producto o introducir decisiones costosas, servicios pagos, nuevas cuentas o dependencias con impacto considerable. Sugerir alternativas con sus motivos.
- Registrar los planes internos en `.private/planning/`, una carpeta local ignorada por Git. Mantenerlos actualizados para cambios que atraviesen varios ámbitos, modifiquen contratos o alteren flujos; evitar planes formales para correcciones locales triviales. No publicar planes, roadmap ni enlaces a estos archivos en commits, issues o pull requests. Si la carpeta no existe en una copia nueva, acordar el alcance con la persona responsable; no asumir que los documentos privados están disponibles.
- Registrar decisiones duraderas con contexto, alternativas y consecuencias en `docs/decisions/`. Revisar la [decisión inicial](docs/decisions/0001-architecture.md) antes de cambiar la estructura.
- Conservar cambios ajenos. No crear commits, hacer push ni desplegar por iniciativa propia.

## Arquitectura y código

- Usar Next.js App Router y TypeScript estricto. Mantener rutas y layouts pequeños; alojar comportamiento en el ámbito que lo posee.
- Mantener inglés como idioma inicial y español como opción real. Usar `next-intl`, rutas `src/app/[locale]` y namespaces de mensajes; evitar textos de interfaz fijos dentro de componentes. Cambiar de idioma conserva la ruta equivalente, usa nombres de idiomas sin banderas y mantiene el atributo `lang` correcto.
- Preferir Server Components. Usar `"use client"` en la frontera más pequeña que necesite estado, eventos o APIs del navegador. Evitar convertir un layout completo en cliente por comodidad.
- Renderizar primero el contenido disponible y aislar esperas independientes. Introducir estados de carga y `Suspense` donde resuelvan una espera real.
- Mantener el modelo, sus reglas y la generación del README en `src/core/`, sin React, Next.js, red, almacenamiento ni secretos. Validar entradas desconocidas con `parseProfileDocument`; las operaciones y `generateReadme` reciben documentos ya válidos. La validación estructural de un borrador no demuestra que sea exportable: respetar los errores del generador, el texto plano y la política de enlaces.
- Derivar vista previa, copia y descarga del mismo Markdown generado. No habilitar HTML libre ni renderizadores alternativos. Mantener el borrador local fuera de `core`, recuperar y validar antes de habilitar escrituras, y conservar valores inválidos o inaccesibles hasta una decisión explícita del usuario.
- Mantener el recorrido como una presentación personal breve. La introducción permite contar intereses y actualidad sin repetirlos en formularios adicionales. Ofrecer detalles secundarios cuando sean útiles y conservar los datos de borradores anteriores, sin convertir el editor en un CV ni pedir trayectoria para terminar.
- No reintroducir conocimientos, formación o actualidad como opciones, formularios heredados o salida de README. Conservar sus estructuras internas v1 y sus posiciones al editar o reordenar las cinco secciones activas. La validación estructural sigue aplicándose al documento completo, pero el generador no revisa enlaces ni contenido de módulos retirados.
- Distinguir selección, visibilidad y eliminación: configurar una sección no la oculta; ocultar conserva los datos; quitar una entrada los borra de forma explícita. La casilla cambia solo la inclusión y conserva el foco; agregar y editar una sección oculta es una acción identificada. Mantener selección activa, navegación móvil y arrastre como estado efímero, fuera del documento. Al mover secciones incluidas, conservar los nueve IDs y las posiciones de módulos ocultos y métricas; confirmar el orden solo al terminar un movimiento válido y conservarlo al cancelar. No cambiar el contrato v1 para habilitar datos que ya representa.
- Actividad y contribuciones usa el slot `contributions` y la inclusión efectiva `visibility.contributions || visibility.metrics`; no ofrecer una sexta sección ni renderizar `metrics` por separado. Ocultar desde la navegación apaga ambos flags; volver a mostrar activa contribuciones y métricas solo si conserva tarjetas seleccionadas. Recuperar un borrador no reescribe flags. Mantener las tres tarjetas desactivadas inicialmente, el bloque de GitHub plegable, los aportes manuales sin usuario y las sugerencias como elecciones explícitas.
- Guardar solo `metrics.username/cards` y los aportes elegidos en el documento v1. Los snapshots remotos son efímeros, validados y asociados a su usuario; descartar respuestas tardías de otro usuario y distinguir ceros reales de fallos. El formulario no consulta automáticamente al montar, recuperar, abrir el bloque o escribir un usuario. Las imágenes de tarjetas seleccionadas sí solicitan actividad al mostrarse.
- El servidor admite un PAT classic dedicado y verifica `x-oauth-scopes` presente, vacío o exactamente `public_repo` antes de consumir datos. Preferir únicamente `public_repo` para las consultas GraphQL de repositorios públicos; no sumar `repo`, `read:user` ni otros scopes. Rechazar credenciales no verificables, incluidos tokens fine-grained. El cliente solo ejecuta consultas de lectura aunque el scope público permita otras operaciones. Mantener `GITHUB_TOKEN` fuera de Git y del navegador. `APP_URL` es un origen HTTPS público configurado, nunca derivado del Host. Sin él, `generateReadme` permite revisar el mismo Markdown con rutas locales y devuelve `exportIssues: activity_not_configured`; copia y descarga permanecen deshabilitadas hasta desmarcar tarjetas o configurar un host público. Ver [ADR 0010](docs/decisions/0010-github-activity.md).
- Ofrecer tecnologías mediante el catálogo local curado, autocompletado, chips con iconos y una alternativa de texto propio. Resolver nombres y alias sin guardar URLs o cambiar el contrato v1; conservar grupos y contextos anteriores como detalles secundarios. Los iconos proceden de Devicon, Simple Icons y Lobe Icons fijados a commits, con SVG locales equivalentes y atribución. La vista previa dispone las tecnologías en filas adaptables de 32 × 32, sin imponer un icono por línea. Una herramienta de IA en el catálogo identifica una herramienta; no implica una integración con IA.
- En contacto, ofrecer proveedores conocidos y web propia o correo. Resolver el proveedor por la URL validada y los dominios explícitos del catálogo, nunca por la etiqueta; conservar `links` v1 sin guardar un proveedor adicional. Los iconos de contacto son decorativos de 20 × 20 junto al texto del enlace. La etiqueta personalizada es opcional. Mantener la normalización y los errores de URL compartidos; las direcciones no reconocidas siguen siendo enlaces normales.
- No interpretar HTML ni URLs de imágenes escritos por la persona. Reconocer únicamente tokens de iconos permitidos y rutas exactas de tarjetas propias, mantener la lista del renderizador y `skipHtml`, sin `rehypeRaw`. Los SVG de actividad son pasivos, escapados y sin recursos externos; no aceptar un host o imagen arbitrarios. No agregar niveles de habilidad, rankings de herramientas ni inferir trayectoria. Los enlaces de contenido admiten HTTP/HTTPS según la política web; `mailto:` solo se admite en contacto. Registrar las fuentes y las marcas compartidas de familia en [recursos de terceros](THIRD_PARTY_NOTICES.md).
- Reservar `src/modules/` para las secciones del perfil; `src/components/ui/` para primitivas visuales reutilizables. No confundir módulos de producto con componentes genéricos.
- Mantener credenciales y clientes de servicios en `src/server/` con `server-only`. Validar entradas en cada frontera; ninguna clave secreta usa `NEXT_PUBLIC_`.
- Reutilizar tokens y primitivas del kit visual. Mantener navegación por teclado, etiquetas, foco visible, contraste y estados de error claros.
- Preferir funciones y componentes directos. No agregar repositorios, contenedores de inyección, clases base o capas sin una necesidad concreta. No agregar `useMemo` o `useCallback` por reflejo: justificar su necesidad con comportamiento o medición.

## Verificación

Usar los scripts de `package.json`: `pnpm dev`, `pnpm build`, `pnpm start`, `pnpm lint`, `pnpm typecheck`, `pnpm format`, `pnpm format:check`, `pnpm docs:check`, `pnpm test`, `pnpm test:watch`, `pnpm test:e2e`, `pnpm test:a11y` y `pnpm check`.

Elegir verificaciones según el cambio y agregar pruebas de comportamiento cuando protejan contratos o recorridos relevantes. No agregar pruebas que repitan la implementación. Antes de cerrar, revisar el diff, ejecutar los controles pertinentes y distinguir resultados ejecutados de verificaciones pendientes. No afirmar que una revisión automática demuestra accesibilidad completa.

## Delegación

Los roles están en `.codex/agents/`. Delegar únicamente trabajo independiente con objetivo, archivos propietarios y criterios claros. Evitar escrituras paralelas sobre los mismos archivos y coordinar los cambios a dependencias, configuración y contratos compartidos. El agente principal integra, revisa diffs y valida el resultado completo. Los roles de lectura no editan archivos ni ejecutan acciones que alteren el proyecto.

## Referencias por tarea

- [Índice de documentación](docs/README.md): punto de entrada y estado del producto.
- [Arquitectura](docs/architecture.md): límites, dependencias y evolución.
- [Modelo del perfil](docs/profile-model.md): contrato, validación y operaciones del núcleo.
- [Editor](docs/editor.md): uso, persistencia y límites de salida.
- [Trabajo con IA](docs/ai-development.md): planes, roles y revisión.
- [Contribuciones](CONTRIBUTING.md): flujo de trabajo y validación.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
