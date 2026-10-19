# Instrucciones del proyecto

## Producto y alcance

GitHub Profile Generator es un generador visual de README para perfiles de GitHub. Debe servir a personas con distintos conocimientos y niveles de actividad pública. Los nueve módulos son opcionales: presentación, capacidades, tecnologías, formación, actualidad, proyectos, contribuciones, métricas y contacto. La actividad de GitHub no determina la habilidad de una persona.

La entrega actual incluye la base Next.js, el kit visual bilingüe, `ProfileDocument` versión 1 y un editor funcional de presentación y contacto con vista previa, copia, descarga y borrador local. Los otros siete módulos existen en el contrato, sin formularios ni generadores. GitHub e IA no están integrados. No presentar funcionalidades futuras como disponibles.

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
