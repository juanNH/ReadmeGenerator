# Desarrollo

Esta guía describe cómo ejecutar y revisar la aplicación y su núcleo de perfil. La definición del producto y su alcance disponible están en [producto](product.md); el contrato y sus operaciones se describen en [modelo del perfil](profile-model.md).

## Requisitos

- Node.js `24.21.0`, indicado en `.nvmrc`.
- pnpm `11.25.0`, indicado en `packageManager` de `package.json`.

El proyecto usa Next.js `16.4.2`, React `19.3.1`, TypeScript, Tailwind CSS 4 y `next-intl` para los idiomas. El núcleo usa Zod `4.6.7` para la validación de documentos. No se necesita una cuenta de GitHub, una clave de IA ni variables de entorno para revisar la base entregada.

Las dependencias directas y el lockfile fijan las versiones de la base. En una copia limpia, `pnpm install --frozen-lockfile` reproduce esa resolución. Hay una advertencia de peers de tres plugins transitivos con ESLint 10; la decisión y sus límites están registrados en [ADR 0002](decisions/0002-toolchain.md).

El importador declara directamente unified `11.0.5`, remark-parse `11.0.0`, remark-gfm `4.0.1` y mdast-util-to-hast `13.2.1`, con `@types/mdast` `4.0.4` para desarrollo. Reutiliza el analizador y serializador HTML existentes. El parser se carga al abrir el importador; no incorpora servicios, cuentas ni claves adicionales. El soporte GFM permite analizar tablas y otras estructuras, pero su conversión sigue limitada por los bloques y la política HTML del editor.

## Instalación y ejecución

Desde la raíz del repositorio:

```sh
pnpm install
pnpm dev
```

Abrí [http://127.0.0.1:3000/en](http://127.0.0.1:3000/en) para inglés o [http://127.0.0.1:3000/es](http://127.0.0.1:3000/es) para español. El kit interno está en [inglés](http://127.0.0.1:3000/en/design-system) y [español](http://127.0.0.1:3000/es/design-system) solo con este servidor de desarrollo; producción devuelve 404. La ruta [http://127.0.0.1:3000](http://127.0.0.1:3000) redirige a inglés.

Para ejecutar la compilación de producción:

```sh
pnpm build
pnpm start
```

`pnpm start` requiere que `pnpm build` haya finalizado correctamente. El puerto esperado es `3000`.

## Comandos

| Comando             | Propósito                                                                               |
| ------------------- | --------------------------------------------------------------------------------------- |
| `pnpm dev`          | Iniciar el servidor de desarrollo.                                                      |
| `pnpm build`        | Crear la compilación de producción.                                                     |
| `pnpm start`        | Servir la compilación de producción existente.                                          |
| `pnpm lint`         | Revisar el código con las reglas del repositorio.                                       |
| `pnpm typecheck`    | Comprobar los tipos sin emitir archivos.                                                |
| `pnpm format`       | Aplicar el formato definido por el proyecto.                                            |
| `pnpm format:check` | Comprobar el formato sin modificar archivos.                                            |
| `pnpm test`         | Comprobar perfil, generación, adaptador de borrador y traducciones EN/ES con Vitest.    |
| `pnpm test:watch`   | Ejecutar esas pruebas durante el desarrollo.                                            |
| `pnpm test:e2e`     | Revisar rutas públicas y recorrido de edición, recuperación y exportación en navegador. |
| `pnpm test:e2e:ui`  | Abrir la interfaz interna de Playwright para explorar y ejecutar los recorridos.        |
| `pnpm test:a11y`    | Ejecutar las comprobaciones automáticas de accesibilidad de rutas públicas y editor.    |
| `pnpm docs:check`   | Verificar enlaces locales de los archivos Markdown del repositorio.                     |
| `pnpm check`        | Ejecutar lint, tipos, formato, enlaces de documentación y pruebas unitarias.            |

`pnpm check` agrupa `lint`, `typecheck`, `format:check`, `docs:check` y `test`. La compilación y las comprobaciones en navegador se ejecutan por separado. `typecheck` genera primero los tipos de rutas de Next.js, incluidos los getters de `next/root-params`.

Si las pruebas en navegador solicitan instalar su navegador de ejecución, preparalo con:

```sh
pnpm exec playwright install chromium
```

## Alcance de la base

La planificación interna se conserva localmente en `.private/planning/`, excluida de Git y de los controles de documentación pública. Una copia nueva del repositorio funciona sin esos archivos. La carpeta no se sincroniza ni recibe respaldo remoto por medio de este repositorio; no usar `git add -f` para publicarla.

- `/`: redirección al idioma predeterminado, inglés.
- `/en` y `/es`: entrada de la aplicación y presentación del estado inicial del proyecto.
- `/en/design-system` y `/es/design-system`: catálogo interno del kit visual, disponible solo con `pnpm dev`; producción responde 404 y no lo enlaza desde la aplicación.
- `/en/editor` y `/es/editor`: cinco secciones fijas opcionales y secciones personalizadas repetibles, con navegación superior, organización plegable, configuración estable, orden por arrastre o botones, vista previa, exportación y borrador local. Conocimientos, formación y actualidad están retirados también para borradores anteriores. El editor se renderiza por solicitud para leer la configuración de tarjetas en ejecución; portada sigue pregenerada.
- Selector de idioma funcional, rutas localizadas y mensajes separados para inglés y español.
- Componentes compartidos y configuración inicial de calidad y pruebas.
- Contrato de perfil v2, referencias fijas/personalizadas en `sectionOrder`, bloques en `customSections`, migración validada de v1 y operaciones puras de creación, duplicación, visibilidad, eliminación y orden en `src/core/`.

Las pruebas unitarias incluyen contratos y operaciones del perfil, generación de README, adaptador de almacenamiento, mensajes, SVG y cliente de GitHub con respuestas controladas. Las comprobaciones de navegador de producción cubren la base visual, el recorrido del editor y la ausencia del kit público. La integración de actividad de GitHub está implementada y requiere configuración del servidor; no hay proveedores de IA.

Vitest comprueba el comportamiento del núcleo, los límites de salida y persistencia, y la paridad de claves y parámetros de mensajes en ambos idiomas. Playwright comprueba recorridos, idiomas, tema, teclado, errores, tamaños de pantalla y exportación. Los resultados ejecutados se registran por entrega más abajo; la existencia de una prueba no implica que ya se haya ejecutado en esta revisión.

Para comprobar una instancia ya iniciada se puede definir `PLAYWRIGHT_BASE_URL`; de lo contrario Playwright inicia desarrollo. En CI se compila primero y Playwright inicia `pnpm start` para revisar producción. No ejecutar `pnpm dev` y `pnpm build` simultáneamente al validar la misma entrega.

El cambio de idioma conserva la ruta, los parámetros y el ancla. El campo `contentLocale` del documento es independiente del idioma de navegación; cambiar de idioma no traduce el contenido. Los metadatos de esta vista inicial usan `noindex`; revisar ese ajuste antes de publicar el producto definitivo.

## Borrador local y diagnóstico

El editor guarda el documento completo en `localStorage`, bajo `github-profile-generator.profile.v2`. Si esa clave no existe, lee `github-profile-generator.profile.v1`, valida exactamente el formato heredado y lo migra en memoria. Recuperar o migrar no escribe; la primera edición guarda v2. La clave v1 permanece intacta como original local, incluso al iniciar otro borrador confirmado. Un v2 inválido o inaccesible no se sustituye con v1 automáticamente.

Los cambios válidos se guardan tras 500 ms y se intenta guardar lo pendiente al ocultar o abandonar la página o desmontar el editor. Un cierre abrupto puede impedir ese último intento. Los datos del documento no se envían a un servidor ni se sincronizan entre dispositivos. Para diagnóstico, distinguir siempre las dos claves y conservar los valores originales antes de intervenir.

Usar siempre el mismo origen: `http://127.0.0.1:3000`. Cambiar a `localhost`, otro host, puerto o protocolo abre un almacenamiento diferente. Los idiomas del editor comparten el borrador si se mantiene el origen.

Ante JSON inválido, versión incompatible o lectura bloqueada, el editor conserva el valor existente y bloquea su reemplazo automático. La confirmación de iniciar un borrador nuevo permite sustituirlo; si se cancela no se escribe. Ante un fallo de escritura o cuota, el aviso permanece y se puede seguir editando en memoria y exportando un README válido; no afirmar que los últimos cambios están guardados.

Los cinco módulos fijos mantienen sus estructuras heredadas de v1. El formato actual agrega instancias propias y su orden mixto. La sección seleccionada y la vista móvil son efímeras; contenido, visibilidad y orden sí se guardan. Ocultar una sección activa conserva su formulario editable y avisa que no participa en el README. Arrastrar mueve una sección fija o propia entre las incluidas; Subir/Bajar mueve una posición. Ambas acciones conservan las referencias ocultas, retiradas y de métricas en sus posiciones durante el reordenamiento.

Todos los documentos ofrecen las mismas cinco secciones fijas y la opción de agregar secciones personalizadas. Conocimientos, formación y actualidad no tienen formulario ni salida, aunque sus flags antiguos sean verdaderos; sus enlaces tampoco bloquean la exportación. V2 conserva esos campos y sus referencias para recuperar borradores sin destruir datos. No hay una condición que los vuelva a ofrecer ni una fusión automática con la intro. Ver [ADR 0008](decisions/0008-focused-profile.md).

Las instancias propias admiten título opcional, párrafos, listas con viñetas/numeradas y enlaces web. Duplicar copia todo el árbol con IDs nuevos; ocultar conserva datos y eliminar quita solo esa instancia. Las ayudas de `- `, Enter, pegado y conversión de listas se limitan a `modules/custom`; los campos fijos siguen siendo texto plano. El generador produce un único Markdown escapado y valida sus enlaces visibles con rutas de `customSections`, sin habilitar HTML libre. Ver [ADR 0013](decisions/0013-custom-sections.md).

Tecnologías usa un catálogo local de 358 herramientas con SVG y licencias de Devicon, Simple Icons y Lobe Icons, fijados a commits. Admite texto propio, categorías sugeridas editables y notas opcionales; la búsqueda no consulta servicios externos. Los iconos decorativos de 20 × 20 aparecen junto a nombres visibles en filas adaptables. La organización es explícita y no modifica borradores al recuperarlos o cambiar idioma. Contacto ofrece 13 servicios, web/portfolio y correo; una URL válida determina el icono, mientras la etiqueta es opcional y personalizable. Sus iconos exportados son decorativos de 20 × 20. `remarkProfileIcons` conserva el contexto inline del Markdown sin párrafos anidados y reconoce también los tokens tecnológicos anteriores de 32 × 32. El namespace `ContactProviders` se entrega explícitamente al proveedor cliente del editor. El marcado se genera únicamente desde los catálogos permitidos. Ver [ADR 0009](decisions/0009-profile-icons.md) y [ADR 0012](decisions/0012-technology-categories.md).

## Configurar actividad de GitHub

El formulario **Actividad y contribuciones** conserva un recorrido manual sin cuenta y ofrece una parte plegable para consultar un usuario y elegir calendario, resumen o lenguajes. Los destacados sugeridos se copian solo por una selección explícita. El documento actual conserva las estructuras heredadas `data.metrics` y `data.contributions`; no guarda snapshots remotos. La navegación usa la inclusión efectiva de ambos flags y genera un único bloque en la referencia de contribuciones, sin mover la referencia interna de métricas.

Las variables están descritas en [.env.example](../.env.example). Por defecto quedan vacías y el recorrido manual funciona sin ellas:

- `GITHUB_TOKEN`: PAT classic dedicado con únicamente `public_repo`, según la documentación actual de GraphQL. Ese permiso también admite escritura pública; el cliente implementado utiliza exclusivamente consultas constantes. El servidor verifica `X-OAuth-Scopes` en cada respuesta y acepta vacío o exactamente `public_repo`; rechaza otros permisos, mezclas o credenciales no verificables. No acepta tokens con acceso adicional a cuentas, repos privados o contribuciones privadas. No pegar secretos en chats, archivos públicos ni variables `NEXT_PUBLIC_`.
- `APP_URL`: origen HTTPS público de este despliegue, que alojará los SVG. Se lee por solicitud y basta reiniciar el servicio después de cambiarlo. No se deriva de Host ni admite direcciones locales, credenciales, puertos, rutas, parámetros o fragmentos. Sin origen público, las tarjetas pueden revisarse localmente, pero el generador comunica `exportIssues` y la interfaz impide copiar o descargar esa salida. Excluir las tarjetas permite exportar lo manual.

### Desarrollo y producción

Next.js selecciona el entorno automáticamente: `pnpm dev` usa desarrollo; `pnpm build` y `pnpm start` usan producción, incluso al ejecutarlos en la computadora local. Los archivos de entorno van en la raíz del proyecto.

| Entorno    | Configuración                                                                               | `GITHUB_TOKEN`                                             | `APP_URL`                                                                             |
| ---------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Desarrollo | Copiar `.env.example` como `.env.development.local`.                                        | Guardar el PAT classic dedicado con solo `public_repo`.    | Dejar vacío para consultar y previsualizar localmente.                                |
| Producción | Variables del hosting; en un servidor propio también se puede usar `.env.production.local`. | Guardar una credencial admitida como secreto del servidor. | Origen HTTPS público real del despliegue, por ejemplo `https://profiles.example.com`. |

Para crear la credencial, seguir la [guía de GitHub para tokens classic](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#creating-a-personal-access-token-classic) y seleccionar únicamente `public_repo`. Guardarla directamente en el archivo local o en los secretos del hosting; no enviarla por chat ni incluirla en el README. Quienes usen el generador solo ingresan su nombre de usuario: no necesitan crear tokens propios ni iniciar sesión.

Las variables del proceso tienen prioridad sobre los archivos. Después se consulta `.env.development.local` o `.env.production.local`, luego `.env.local`, el archivo `.env.development` o `.env.production` y finalmente `.env`. Para mantener los dos entornos separados, definir ambas claves en el archivo específico y evitar `.env.local` para esta configuración. Los archivos `.env*.local` están excluidos de Git; `.env.example` conserva únicamente claves vacías y explicaciones.

Reiniciar el servicio después de guardar los valores. En desarrollo, abrir **Actividad y contribuciones**, ingresar un usuario y elegir **Consultar actividad de GitHub**. La primera consulta correcta habilita la selección de calendario, resumen y lenguajes. Un token ausente, rechazado o incompatible mantiene el estado no configurado; una plantilla vacía no habilita la integración.

El propietario del token puede consultar su propio usuario con la misma credencial admitida. El cliente valida el usuario solicitado e `isViewer`; acepta la vista `PUBLIC` y también `PRIVATE` cuando corresponde al propietario autenticado. Conserva la verificación de scopes, los repositorios públicos propios no forks y los destacados públicos no restringidos. GitHub exige `read:user` para incluir contribuciones privadas/internas, y este cliente lo rechaza; solo admite recuentos anónimos restringidos que la persona eligió compartir públicamente. `userViewType` no permite detectar un ajuste de perfil privado y sus valores no se exponen en el snapshot. Ver [ADR 0022](decisions/0022-token-owner-public-activity.md).

Producción debe ejecutar la aplicación Next.js con sus rutas API y SVG y permitir que GitHub acceda públicamente a las tarjetas. El origen debe estar disponible también al iniciar el servidor; no alcanza con definirlo solo durante la compilación. Una vez publicado, desarrollo puede usar ese mismo `APP_URL` para exportar un README con tarjetas alojadas en producción. La vista previa conserva sus solicitudes locales; las URLs del Markdown exportado apuntan al origen público configurado. Sin un despliegue público operativo, dejar `APP_URL` vacío y revisar las tarjetas localmente.

### Rutas y estados de actividad

`GET /api/github/activity?username=...` devuelve snapshot validado o un código de error. `GET /cards/github/{username}/{calendar|summary|languages}.svg?locale=en|es` sirve imágenes propias que se actualizan con caché. El formulario consulta por botón; las tarjetas ya elegidas se cargan al mostrarse. Las imágenes tienen un enlace para abrirlas a tamaño completo. No se integra un servicio público de gráficos de terceros.

Sin token, la consulta JSON devuelve `503 not_configured`; la imagen muestra un estado no disponible sin números, con HTTP 200 para evitar una imagen rota. Los datos cero reales pertenecen a una consulta correcta y no se usan para sustituir errores. Para fechas, cobertura, privacidad, límites y caché, consultar [arquitectura](architecture.md) y [ADR 0010](decisions/0010-github-activity.md). Las pruebas habituales usan respuestas controladas y no requieren credenciales.

Métricas se conserva en el documento aunque no tenga formulario o generador. Si está visible, `unsupported_module` bloquea la exportación y la UI ofrece ocultarla mediante una acción explícita que conserva su configuración. La lectura válida del documento no garantiza que sea exportable: los enlaces proporcionados en secciones visibles se validan antes de generar. Ver [editor](editor.md) para las reglas de texto y enlaces.

Las fuentes Geist se obtienen de los paquetes instalados y se sirven con `next/font/local`, sin descargar fuentes durante el build. En Windows, un sandbox puede impedir cargar o materializar bindings nativos de SWC; ante ese error, ejecutar los controles desde una terminal autorizada del repositorio. No desactivar validaciones ni modificar permisos del sistema como solución.

## Revisión visual y accesibilidad

Para cambios en interfaz, revisá la entrada, el editor y el kit en ambos idiomas, en escritorio y en una pantalla angosta. Comprobá el selector de idioma, la redirección de `/`, la navegación por teclado, el foco visible, las etiquetas de controles y los estados deshabilitados o de error que formen parte del cambio.

Las comprobaciones automáticas de accesibilidad cubren una parte del comportamiento. Registrá por separado la revisión manual realizada y los casos que quedaron pendientes.

## Registro de validación de la entrega inicial

Validación local realizada el **2026-10-19**, con Node.js 24.21.0 y pnpm 11.25.0 en Windows. Las pruebas de navegador se ejecutaron contra la compilación de producción en `http://127.0.0.1:3000`.

| Comprobación                               | Resultado observado                                                                                                                             |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --offline --frozen-lockfile` | Correcta; usó paquetes ya descargados y conservó la resolución del lockfile.                                                                    |
| `pnpm check`                               | Correcto: lint, tipos, formato, enlaces locales y 2 pruebas de traducciones.                                                                    |
| `pnpm build`                               | Correcto; portada y kit pregenerados en inglés y español.                                                                                       |
| `pnpm test:e2e`                            | 11 pruebas correctas en Chromium: navegación, idioma, persistencia del tema, teclado, errores de campos, móvil y 404.                           |
| Accesibilidad automática                   | Los 5 casos axe incluidos en `test:e2e` no detectaron infracciones de las reglas WCAG AA seleccionadas. No se ejecutó `test:a11y` por separado. |
| Revisión visual manual                     | Portada y kit en escritorio, kit español a 360 px y estado accesible del tema tras recargar, mediante el navegador integrado.                   |

La navegación por teclado y la ausencia de desbordamiento a 360 px se comprobaron también de forma automática. Se corrigió la discrepancia del estado accesible del botón de tema después de recargar y se repitió la suite completa con resultado correcto. No se realizó una revisión con lector de pantalla ni una matriz de navegadores distinta de Chromium; las comprobaciones no certifican accesibilidad completa.

Los resultados de esta sección corresponden a ejecuciones locales y no indican el estado actual de los controles remotos de GitHub Actions. La advertencia de compatibilidad de los plugins de ESLint queda documentada en [ADR 0002](decisions/0002-toolchain.md).

## Validación del núcleo del perfil

Validación local realizada el **2026-10-19**, con Node.js 24.21.0 y pnpm 11.25.0 en Windows:

| Comprobación                                     | Resultado observado                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| `pnpm install --offline --frozen-lockfile`       | Correcta; la dependencia directa Zod 4.6.7 queda fijada en el manifiesto y el lockfile.                       |
| `pnpm check`                                     | Correcto: lint, tipos, formato, enlaces públicos de 17 archivos Markdown y 104 pruebas unitarias en 3 suites. |
| `pnpm build`                                     | Correcto; portada y kit pregenerados en inglés y español.                                                     |
| Revisión independiente de código y documentación | Sin problemas materiales en contratos, operaciones, ejemplos, límites ni privacidad de la planificación.      |

Las pruebas incluyen 102 casos del perfil y del registro, y 2 casos de traducciones. Comprueban borradores incompletos, serialización JSON, claves e identificadores inválidos, orden y visibilidad sin mutar el documento original e independencia de los ejemplos. Los ejemplos usan personas y enlaces ficticios; no consultan GitHub.

En aquella revisión no se repitieron las pruebas de navegador ni las comprobaciones visuales: no se modificaron pantallas o interacciones. El editor, la persistencia y la generación del README aún no existían; esos resultados corresponden exclusivamente al núcleo del perfil.

## Validación del editor local

Validación local realizada el **2026-10-19**, con Node.js 24.21.0 y pnpm 11.25.0 en Windows. Las pruebas de navegador utilizaron la compilación de producción en `http://127.0.0.1:3000`.

| Comprobación                               | Resultado observado                                                                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm install --offline --frozen-lockfile` | Correcta; el manifiesto y el lockfile conservan ReactMarkdown 10.1.0 y Zod 4.6.7.                                                                                  |
| `pnpm check`                               | Correcto: lint, tipos, formato, enlaces locales de 19 archivos Markdown y 195 pruebas unitarias en 5 suites.                                                       |
| `pnpm build`                               | Correcto; portada, kit y editor pregenerados en inglés y español.                                                                                                  |
| `pnpm test:e2e`                            | 27 pruebas correctas en Chromium: 16 del editor y 11 de la base.                                                                                                   |
| Accesibilidad automática                   | Los 8 casos axe incluidos en `test:e2e` no detectaron infracciones de las reglas WCAG AA seleccionadas. No se ejecutó `test:a11y` por separado.                    |
| Revisión manual                            | Editor en escritorio y a 360 px; formularios, vista previa, cambio EN/ES, idioma independiente del README, ocultamiento con teclado y recuperación al recargar.    |
| Revisión independiente                     | Corregidos la pérdida de cambios en memoria al cambiar de idioma y el anuncio accesible del fallo de guardado. Revisión final sin problemas materiales pendientes. |

Las pruebas unitarias cubren el contrato del perfil, el generador, el adaptador de almacenamiento y la paridad de traducciones. Las de navegador comprueban secciones opcionales, foco al agregar y quitar enlaces, protección del borrador original, fallos de lectura y cuota, navegación entre idiomas antes del guardado, salida compartida por vista previa/copia/descarga y tratamiento del texto como texto plano.

Si el almacenamiento falla, el estado temporal conserva la edición al navegar entre idiomas dentro de la pestaña. Una recarga completa o el cierre eliminan ese respaldo: el aviso indica descargar antes de hacerlo. No se realizó una revisión con lector de pantalla ni una matriz distinta de Chromium. Los resultados automáticos y la revisión manual no certifican accesibilidad completa. Estos registros locales no representan el estado de GitHub Actions.

## Validación de los módulos manuales y su composición

Validación local realizada el **2026-10-19**, con Node.js 24.21.0 y pnpm 11.25.0 en Windows. Las pruebas de navegador se ejecutaron sobre producción en `http://127.0.0.1:3000`.

| Comprobación             | Resultado observado                                                                                                                                                                                                                          |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`             | Correcto: lint, tipos, formato, enlaces locales de 20 archivos Markdown y 277 pruebas unitarias en 7 suites.                                                                                                                                 |
| `pnpm build`             | Correcto; portada, kit y editor pregenerados en inglés y español.                                                                                                                                                                            |
| `pnpm test:e2e`          | 37 pruebas correctas en Chromium: 10 de módulos manuales/composición, 16 regresiones del editor y 11 de la base.                                                                                                                             |
| Accesibilidad automática | Los 10 casos de accesibilidad incluidos en la suite realizaron 12 análisis axe sin infracciones detectadas en las reglas WCAG AA seleccionadas; los dos casos nuevos revisaron ambos temas a 360 px. No se ejecutó `test:a11y` por separado. |
| Revisión manual          | Editor EN/ES, incorporación de conocimientos y estudios, plegado, cambio de orden por teclado, recuperación e idioma del README independiente; capturas de escritorio y móvil.                                                               |
| Revisión independiente   | Formularios, renderers, foco, rutas de error y compatibilidad; corregido el foco tras ocultar métricas, sin hallazgos materiales pendientes.                                                                                                 |

Las pruebas unitarias incluyen 143 casos de generación, 102 de contratos del perfil, 16 del adaptador de borrador, 9 de traducciones y 7 de composición. Comprueban salida parcial, fechas libres, enums localizados, omisión de vacíos, protocolos por contexto, rutas anidadas, orden completo y ausencia de mutación. Los recorridos de navegador usan datos ficticios y mantienen las regresiones de almacenamiento corrupto, bloqueado o lleno y navegación entre idiomas antes del guardado.

No se agregaron dependencias, consultas externas ni migración del borrador v1. La revisión visual de las capturas a 360 px complementa las comprobaciones automáticas de desbordamiento. No hubo revisión con lector de pantalla ni otros motores de navegador; estos controles no certifican accesibilidad completa ni representan el estado de CI remoto.

## Validación de navegación y arrastre del editor

Validación local realizada el **2026-10-19**, con Node.js 24.21.0 y pnpm 11.25.0 en Windows. Las pruebas de navegador utilizaron producción en `http://127.0.0.1:3000`.

| Comprobación                               | Resultado observado                                                                                                                                                    |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm install --offline --frozen-lockfile` | Correcta; conserva la resolución de `@dnd-kit/react` y `@dnd-kit/dom` 0.5.1.                                                                                           |
| `pnpm check`                               | Correcto: lint, tipos, formato, enlaces públicos de 21 archivos Markdown y 289 pruebas unitarias en 7 suites.                                                          |
| `pnpm build`                               | Correcto; rutas de portada, kit y editor pregeneradas en inglés y español.                                                                                             |
| `pnpm test:e2e`                            | 46 pruebas correctas en Chromium, incluidas nueve de navegación, configuración y arrastre.                                                                             |
| Repetición del arrastre                    | Cinco casos repetidos tres veces: 15 ejecuciones correctas de mouse, tacto emulado, teclado, Escape y caída fuera de destino.                                          |
| Accesibilidad automática                   | Los 12 casos incluidos en la suite realizaron 16 análisis axe sin infracciones detectadas en las reglas WCAG AA seleccionadas. No se ejecutó `test:a11y` por separado. |
| Revisión visual                            | Capturas con datos ficticios: escritorio de 1440 px y móvil de 360 px; configuración activa, vista previa, campos extensos y errores en ambos temas.                   |
| Revisión independiente                     | Composición, selección, foco, cancelación y documentación revisados; sin hallazgos materiales pendientes tras integrar las correcciones.                               |

Los recorridos comprueban el panel único de configuración, la sección activa, la inclusión independiente, el contenido oculto editable, el mismo Markdown exportable, el orden recuperado tras recargar y la preservación de datos y posiciones de módulos ocultos. Las cancelaciones comprueban tanto el documento guardado como el orden visual de la lista. Los anuncios verifican la cantidad de secciones después de recuperar el borrador. Se conservaron las regresiones de errores de almacenamiento y navegación entre idiomas.

Durante la integración se corrigieron la conservación de un orden provisional de DOM al soltar fuera y los anuncios que podían capturar la cantidad cero anterior a la recuperación. También se adaptaron los recorridos móviles para abrir la navegación antes de revisar enlaces y se sincronizó el driver de mouse con controles visibles y el estado real del gesto.

El tacto se comprobó mediante eventos de entrada de Chromium en un contexto móvil; no sustituye una revisión en dispositivos físicos, Safari ni tecnologías de asistencia táctil. No hubo revisión con lector de pantalla u otros motores de navegador. Las capturas y los análisis automáticos no certifican accesibilidad completa ni reflejan CI remoto. Se mantiene el documento v1 sin migración; las dos dependencias nuevas pertenecen a la interacción cliente, sin servicios externos de GitHub o IA. Ver [ADR 0006](decisions/0006-editor-navigation.md).

## Validación del perfil simplificado

Validación local realizada el **2026-10-19**, con Node.js 24.21.0 y pnpm 11.25.0 en Windows. Los recorridos de Chromium utilizaron la compilación de producción en `http://127.0.0.1:3000`.

| Comprobación             | Resultado observado                                                                                                                                                                      |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`             | Correcto: lint, tipos, formato, enlaces públicos de 23 archivos Markdown y 298 pruebas unitarias en 9 suites.                                                                            |
| `pnpm build`             | Correcto; portada, kit y editor pregenerados en ambos idiomas.                                                                                                                           |
| `pnpm test:e2e`          | 51 pruebas correctas en la ejecución final, con cinco recorridos nuevos del perfil simple.                                                                                               |
| Accesibilidad automática | Los 13 casos incluidos en la suite realizaron 19 análisis axe sin infracciones detectadas en las reglas WCAG AA seleccionadas. No se ejecutó `test:a11y` por separado.                   |
| Iconos                   | Inventario de 48 SVG locales, 132163 bytes en total, con licencia MIT y atribución; metadatos y originales fijados al mismo commit de Devicon. Sin dependencias de paquetes adicionales. |
| Revisión visual          | Capturas ficticias de tecnologías a 1440 px y formación/vista previa en español a 360 px; revisados chips, jerarquía, campos reducidos, tipo de estudio e iconos.                        |
| Revisión independiente   | Revisión del catálogo, marcado permitido, preview y compatibilidad; corregida la pérdida de foco al vaciar una institución anterior.                                                     |

Los casos nuevos comprueban seis secciones iniciales, introducción libre, detalles secundarios, búsqueda de tecnologías con teclado, alias y duplicados, nombres propios, iconos exportados, formación mínima e institución opcional. También comprueban que una etiqueta `img` pegada como texto no se convierta en imagen, incluso si coincide con un icono permitido. Los tests de las secciones anteriores usan documentos guardados v1 para comprobar su continuidad sin volver a ofrecerlas en el recorrido nuevo.

Se mantuvieron las regresiones de almacenamiento, cambio de idioma, exportación, orden por arrastre y cancelación visual. Al quitar un chip, el foco vuelve al buscador y las sugerencias permanecen cerradas; al vaciar una institución guardada, el campo conserva su foco y permite reescribir. El tipo de estudio no elimina datos anteriores.

La revisión del README se limita a la salida generada y su vista previa local; no se publicó un perfil de prueba en GitHub. La disponibilidad de los iconos del README depende de las URLs públicas fijadas. La búsqueda y la vista previa usan datos locales. Se mantienen los límites de tacto emulado, ausencia de lector de pantalla y de otros motores; estos controles no certifican accesibilidad completa ni reflejan CI remoto. Ver [ADR 0007](decisions/0007-simple-profile.md).

## Validación del recorrido de cinco secciones

Validación local realizada el **2026-10-19**, con Node.js 24.21.0 y pnpm 11.25.0 en Windows. Este registro sustituye el alcance de secciones de la entrega anterior. Los recorridos de navegador utilizaron la compilación de producción en `http://127.0.0.1:3000`.

| Comprobación             | Resultado observado                                                                                                                                                       |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`             | Correcto: lint, tipos, formato, enlaces públicos de 24 documentos Markdown y 273 pruebas unitarias en 9 suites.                                                           |
| `pnpm build`             | Correcto; portada, kit y editor pregenerados en inglés y español.                                                                                                         |
| `pnpm test:e2e`          | 51 pruebas correctas en Chromium, con regresiones adaptadas a las cinco secciones vigentes.                                                                               |
| Accesibilidad automática | Los 13 casos incluidos realizan 19 análisis axe sin infracciones detectadas en las reglas WCAG AA seleccionadas. No se ejecutó `test:a11y` por separado.                  |
| Revisión visual          | Capturas ficticias de escritorio a 1440 px y móvil a 360 px; navegación de cinco secciones, configuración activa y vista previa en español sin desbordamiento horizontal. |
| Revisión independiente   | UI, mensajes y generación revisados; sin hallazgos materiales pendientes.                                                                                                 |

Se comprueba que conocimientos, formación y actualidad no reaparezcan en navegación, formularios, vista previa ni README, incluso con datos y visibilidad guardados. Los enlaces inválidos en esas estructuras no bloquean la salida. Guardar y recargar conserva sus valores, flags y posiciones internas sin fusionar textos con presentación. La lista de cinco secciones se prueba tanto para perfiles nuevos como para borradores anteriores.

Se conservan los recorridos de arrastre con mouse, tacto emulado y teclado, cancelación, foco, almacenamiento, cambio de idioma, autocompletado con iconos y coincidencia entre vista previa, copia y descarga. No hubo nuevas dependencias ni migración del documento v1 para este ajuste. No se realizó revisión con lector de pantalla, dispositivos táctiles físicos, otros motores ni publicación de un perfil en GitHub; estos resultados locales no certifican accesibilidad completa ni reflejan CI remoto. Ver [ADR 0008](decisions/0008-focused-profile.md).

## Validación de catálogos e iconos de contacto

Validación local realizada el **2026-10-19**, con Node.js 24.21.0 y pnpm 11.25.0 en Windows. Los recorridos de Chromium utilizaron producción en `http://127.0.0.1:3000`.

| Comprobación                    | Resultado observado                                                                                                                                                      |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`                    | Correcto: lint, tipos, formato, enlaces de 25 documentos Markdown y 318 pruebas unitarias en 11 suites.                                                                  |
| `pnpm build`                    | Correcto; rutas de portada, kit y editor pregeneradas en EN/ES.                                                                                                          |
| `pnpm test:e2e`                 | 64 pruebas correctas en la ejecución final.                                                                                                                              |
| Accesibilidad automática        | 19 casos contienen 31 análisis axe sin infracciones detectadas de las reglas seleccionadas. No se ejecutó `test:a11y` por separado.                                      |
| Inventario de tecnologías       | 259 SVG, 1.003.008 bytes: 223 Devicon, 15 Simple Icons y 21 Lobe Icons. URLs fijadas y copias de licencias locales; sin paquetes adicionales.                            |
| Inventario de contacto          | 13 SVG, 8.769 bytes, de Simple Icons 11.15.0, con licencia CC0 local.                                                                                                    |
| Revisión visual e independiente | Capturas ficticias de tecnologías y contactos a 1440 px y 360 px; ambos temas revisados, sin desbordamiento. Revisión de catálogo y seguridad sin hallazgos bloqueantes. |

La regresión de tecnologías verifica el renderizado a través de ReactMarkdown real, la ausencia de párrafos anidados, iconos vecinos en la misma fila y salto de línea a 360 px. La descarga conserva las dimensiones explícitas. Las pruebas de catálogo cubren identidad, alias, fuentes inmutables y SVG locales sin contenido activo o remoto.

Contacto se comprueba en ambos idiomas: selección de servicios, web/portfolio, correo, etiqueta personalizada, foco, recuperación de IDs opacos, dominios impostores, enlaces escapados y dimensiones de 20 × 20. Los iconos decorativos no duplican el nombre accesible del enlace. La prueba real detectó y permitió corregir que el namespace `ContactProviders` no llegaba al proveedor cliente del editor.

Se mantienen las regresiones de almacenamiento, módulos retirados, arrastre y cancelación, idiomas y salida compartida. No se modificó el formato v1 ni se integró GitHub o un proveedor de IA. La revisión es local: no se publicó un README en GitHub. El contraste de SVG originales monocromos puede diferir en el tema oscuro de GitHub, mientras el editor usa fondos claros detrás de los iconos; las URLs exportadas dependen de sus hosts originales. No hubo lector de pantalla, dispositivo táctil físico ni otros motores. Estos resultados no certifican accesibilidad completa ni reflejan CI remoto. Ver [ADR 0009](decisions/0009-profile-icons.md).

## Validación de actividad y contribuciones

Validación local realizada el **2026-10-19**, con Node.js 24.21.0 y pnpm 11.25.0 en Windows. Las pruebas de navegador utilizaron la compilación de producción en `http://127.0.0.1:3000`. La integración se entrega sin credenciales ni dominio configurados; los datos exitosos de GitHub en las pruebas son respuestas controladas y ficticias.

| Comprobación             | Resultado observado                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm check`             | Correcto: lint, tipos, formato, enlaces de 26 documentos Markdown y 427 pruebas unitarias en 17 suites.                                                                  |
| `pnpm build`             | Correcto; editor, JSON y SVG dinámicos, portada y kit pregenerados en EN/ES.                                                                                             |
| `pnpm test:e2e`          | 75 recorridos correctos en Chromium en la ejecución final; incluye 11 de actividad y destacados.                                                                         |
| Accesibilidad automática | 21 casos contienen 37 análisis axe sin infracciones detectadas de las reglas seleccionadas. No se ejecutó `test:a11y` por separado.                                      |
| HTTP sin credenciales    | JSON válido: 503 `not_configured`; usuario inválido: 400; SVG: 200, estado `unavailable`, sin números simulados.                                                         |
| Revisión visual          | Datos ficticios en escritorio de 1440 px y móvil de 360 px, ambos idiomas y temas; configuración, tarjetas y destacados sin desbordamiento horizontal.                   |
| Revisión independiente   | Corregidos alcance permitido del token según documentación oficial, configuración pública en ejecución y reactivación de tarjetas. Sin hallazgos bloqueantes pendientes. |

Las pruebas puras cubren URLs locales/públicas, ausencia de mutaciones, validación del usuario, composición de ambos slots, omisión de tarjetas vacías y SVG escapado con estados cero/no disponible/antiguo. El cliente y la caché se prueban con respuestas controladas: scopes, datos privados/internos, paginación, límites, errores HTTP y GraphQL, último resultado válido, deduplicación y rotación de credenciales.

Los recorridos comprueban GitHub plegado y tarjetas desactivadas, contribución manual sin usuario, consulta explícita, selección de aportes sin duplicados, descarte de respuestas tardías, guardado v1 sin snapshots, recuperación, inclusión/exclusión independiente y sección oculta editable. En local, la vista previa usa el mismo Markdown y se impide publicar URLs locales; excluir tarjetas conserva las elecciones y permite exportar lo manual. Las imágenes enlazan a su versión completa.

Se conservaron las regresiones de tecnologías, contactos, idiomas, almacenamiento, orden por mouse/tacto emulado/teclado y cancelación. Se corrigió una espera de las pruebas de contacto que leía el borrador antes del primer guardado de 500 ms. No hubo dependencias nuevas, migración de formato, commit, push ni despliegue por esta entrega.

No se realizó consulta autenticada real a GitHub, publicación de README, validación de un dominio público, lector de pantalla, dispositivo táctil físico, otros motores ni CI remoto. La habilitación real requiere `GITHUB_TOKEN` y `APP_URL`; los límites y la retención de caché son por proceso. Estos resultados locales y automáticos no certifican accesibilidad completa. Ver [ADR 0010](decisions/0010-github-activity.md).

## Validación de múltiples enlaces de contacto

Verificación adicional del **2026-10-19**: `pnpm check` correcto con 427 pruebas unitarias en 17 suites, `pnpm build` correcto y **77 recorridos de Chromium correctos**. Los dos casos nuevos agregan tres webs propias y dos perfiles del mismo servicio en EN/ES; comprueban nombres, URLs e IDs independientes, edición, eliminación, recuperación y exportación. El acceso «Agregar otra web» crea una entrada propia aunque el selector conserve un servicio conocido.

Se revisó la captura móvil en español y tema oscuro, sin desbordamiento. Los 21 casos de accesibilidad siguen incluyendo 37 análisis axe sin infracciones detectadas de las reglas seleccionadas; no constituyen una certificación completa. Los planes, el roadmap y los archivos temporales permanecen excluidos de Git; el ejemplo de configuración conserva las credenciales vacías.

## Validación de países y contactos por entrada

Validación del **2026-10-19**: `pnpm check` correcto con 443 pruebas unitarias en 19 suites y enlaces de 27 documentos; `pnpm build` correcto; **87 recorridos de Chromium correctos en la ejecución final**. Los 25 casos de accesibilidad incluyen 45 análisis axe sin infracciones detectadas de las reglas seleccionadas. No se ejecutó `test:a11y` por separado ni se certifica accesibilidad completa.

Se comprueban países en ambos idiomas, búsqueda por nombre/código, teclado, Escape, selección por puntero, imagen de bandera de 20 × 15, guardado y recuperación v1, cambio de idioma sin traducir datos y exportación desde el mismo Markdown. Texto libre y ubicaciones anteriores se conservan, incluso con emoji o HTML escrito como texto. Una regresión real permitió corregir que un prefijo en otro idioma podía anteceder al nombre del idioma activo: en inglés, «arg» ahora prioriza Argentina.

Contacto usa un botón de agregar y selectores dentro de cada entrada; se mantiene la etiqueta opcional y las webs/redes repetidas. Las pruebas verifican foco con flechas y Tab, preservación de URL/nombre/ID al cambiar sugerencia, proveedor derivado de la URL y recuperación. Se revisaron capturas móviles en español y tema oscuro, incluido el desplegable de países; no hubo desbordamientos horizontales. No se añadieron dependencias ni se migró el documento. La revisión no incluye lector de pantalla, dispositivo táctil físico, otros motores ni README publicado en GitHub.

## Validación de categorías y catálogo tecnológico

Validación del **2026-10-19**, en Windows con Node.js 24.21.0 y pnpm 11.25.0. Los recorridos de Chromium usan la compilación de producción local.

| Comprobación              | Resultado observado                                                                                                                         |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`              | Correcto: lint, tipos, formato, enlaces de 28 documentos Markdown y 506 pruebas unitarias en 22 suites.                                     |
| `pnpm build`              | Correcto; editor dinámico y portada/kit pregenerados en EN/ES.                                                                              |
| `pnpm test:e2e`           | 95 recorridos correctos en la ejecución final; incluye 8 casos de categorías.                                                               |
| Regresión visual dirigida | 3 casos de presentación/exportación correctos antes de repetir la suite completa.                                                           |
| Accesibilidad automática  | 27 casos incluyen 49 análisis axe sin infracciones detectadas de las reglas seleccionadas. No se ejecutó `test:a11y` por separado.          |
| Catálogo                  | 358 SVG, 1.172.189 bytes: 248 Devicon, 82 Simple Icons y 28 Lobe Icons, con fuentes fijadas y atribución local.                             |
| Revisión visual           | Capturas ficticias a 1440 px y 360 px, ambos idiomas y temas; nombres visibles, categorías, detalles y filas sin desbordamiento horizontal. |

Las pruebas cubren las nueve clasificaciones sugeridas y alias del catálogo ampliado, creación y renombrado, alta sin categoría, movimientos explícitos, reordenamiento, retiro de títulos sin pérdida de herramientas, confirmación de organización, IDs opacos y colisiones entre colecciones. Recuperar o cambiar idioma conserva categorías, notas y datos ajenos sin migrar v1. Una categoría vacía puede renombrarse sin desmontar el campo al borrar temporalmente su título; el título se aplica al salir o pulsar Enter. El foco se conserva al mover y al llegar a extremos del orden.

La salida incluye iconos decorativos de 20 × 20 con nombres visibles y texto propio escapado. Se mantienen los tokens anteriores de 32 × 32 y las restricciones de HTML e imágenes. Las marcas compartidas se prueban con React Native, SvelteKit y bibliotecas TanStack. Una comprobación geométrica móvil detectó que el espacio no separable por sí solo podía dejar un icono huérfano; la vista previa ahora agrupa icono y nombre en un elemento inline, manteniendo el Markdown exportado y los separadores. Se verifican dimensiones, alineación, salto entre herramientas y nombres accesibles sin duplicación.

Las revisiones independientes de core, renderer/seguridad y formulario no dejaron hallazgos bloqueantes. Se conservan regresiones de contacto, ubicación, actividad, idiomas, exportación, almacenamiento y arrastre. No hay dependencias nuevas ni publicación de README en GitHub; su tipografía y distribución pueden diferir de la vista previa. No se revisaron lectores de pantalla, dispositivos físicos, otros motores ni CI remoto. Los resultados automáticos no certifican accesibilidad completa. Ver [ADR 0012](decisions/0012-technology-categories.md).

## Validación de la explicación de categorías

Iteración del **2026-10-19**: `pnpm check` correcto con 506 pruebas en 22 suites; `pnpm build` correcto; 10 recorridos dirigidos de categorías y **97 recorridos de Chromium correctos en la ejecución completa final**. Los 27 casos de accesibilidad incluyen 49 análisis axe sin infracciones detectadas de las reglas elegidas, ahora con la guía desplegada a 360 px en ambos idiomas y temas. No se ejecutó `test:a11y` por separado.

Se verifican el nombre «Categorías automáticas», ayuda contextual para los tres destinos, las nueve categorías con ejemplos, apertura por teclado sin modificar el borrador, destino visible y descripción accesible por opción. Se comprueba que una elección explícita prevalece sobre la clasificación del catálogo, que los nombres propios se agregan al lugar anunciado y que el foco vuelve a la búsqueda. Alta, descripción y anuncio usan un único resolver; no se cambian v1, asignaciones guardadas ni recuperación. Las capturas focalizadas de la guía y de una sugerencia en español fueron revisadas, además del móvil oscuro con la guía abierta.

La revisión independiente no encontró hallazgos accionables. No hubo dependencias nuevas ni cambios en el generador; el resultado sigue limitado a verificación local de Chromium y análisis automáticos, sin lectores de pantalla ni certificación completa de accesibilidad.

## Validación de secciones personalizadas y documento v2

Verificación local del **2026-10-19**, en Windows con Node.js 24.21.0 y pnpm 11.25.0. Las comprobaciones de navegador usan la compilación de producción en `http://127.0.0.1:3000`.

La ejecución completa final registró **114 recorridos de Chromium correctos**, incluidos 17 casos nuevos de secciones propias. Los 31 casos de accesibilidad contienen 57 análisis axe sin infracciones detectadas de las reglas seleccionadas; no se ejecutó `test:a11y` por separado.

| Comprobación | Resultado observado                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------------------- |
| `pnpm check` | Correcto: lint, tipos, formato, enlaces de 29 documentos Markdown y 589 pruebas unitarias en 24 suites. |
| `pnpm build` | Correcto; editor dinámico y portada/kit pregenerados en EN/ES.                                          |

El núcleo comprueba esquemas v1/v2 estrictos, migración sin inferencias, referencias mixtas completas, IDs opacos, operaciones inmutables, duplicación profunda con identidades nuevas y fallos atómicos. El adaptador conserva el string v1 original, migra solo cuando falta v2 y no escribe al recuperar o cambiar idioma; un v2 inválido no activa un fallback silencioso.

Los recorridos propios incluyen creación, texto, listas por botón y atajo `- `, Enter y pegado con selección, conversión a texto, orden de bloques, copias independientes, ocultación, confirmación de borrado, enlaces inválidos y revisión del campo exacto. También cubren recuperación y exportación, cuota agotada con continuidad en memoria entre idiomas, títulos repetidos o coincidentes con etiquetas provisionales y texto largo en móvil. El arrastre por teclado conserva selección y posiciones ocultas; Escape cancela sin persistir la proyección. Los eventos de composición del navegador comprueban que el formulario no convierta texto ni consuma Enter antes de terminar la composición.

La prueba DOM de listas verifica que bloques consecutivos mantengan listas independientes y numeración desde 1, incluso con bloques vacíos, secciones sin título y listas de módulos fijos. El generador alterna marcadores Markdown equivalentes sin agregar HTML o contenido invisible. Vista previa y descarga comparten la misma salida segura.

La revisión visual incluye configuración y vista previa de escritorio a 1600 px y móvil a 360 px, ambos idiomas y temas. Los ítems de lista se ajustan al contenido en el navegador revisado y los títulos largos no provocan desbordamiento horizontal. Se corrigieron jerarquía de encabezados, coincidencia del texto visible con nombres accesibles, regiones duplicadas y colisiones de etiquetas de navegación.

Sin dependencias nuevas ni publicación de un README en GitHub. La revisión se limita a Chromium local; los datos de actividad siguen usando respuestas controladas. No se verificaron otros motores, lectores de pantalla, dispositivos físicos, el selector de candidatos de un IME del sistema ni CI remoto. Las comprobaciones automáticas no certifican accesibilidad completa. Ver [ADR 0013](decisions/0013-custom-sections.md).

### Aclaración de listas con puntos

Iteración local del **2026-10-19**: la interfaz en español usa «Lista con puntos» en lugar de «viñetas». Las opciones muestran los símbolos `•` y `1.`; las ayudas EN/ES explican con ejemplos que los marcadores se agregan automáticamente y se asocian a los campos mediante descripciones accesibles. El formato persistido y la salida permanecen iguales.

Pasaron lint del formulario y su archivo de recorridos, `pnpm typecheck`, `pnpm build`, enlaces de 29 documentos, las 9 pruebas de traducciones y los **18 recorridos dirigidos** de secciones personalizadas y teclado. Incluyen el caso nuevo en español y los 8 análisis axe de edición/vista previa a 360 px en ambos idiomas y temas. Se revisó la captura móvil. La suite completa de 114 casos registrada arriba corresponde al cierre anterior; no se repitió en esta corrección local.

## Validación de bloques visuales personalizados

Validación local del **2026-10-19**, en Windows con Node.js 24.21.0 y pnpm 11.25.0. Los recorridos de Chromium usan la compilación de producción local y una imagen ficticia interceptada por la prueba, sin solicitar un alojamiento externo real.

| Comprobación                    | Resultado observado                                                                                                                                                                    |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                    | Correcto: lint, tipos, formato, enlaces de 30 documentos Markdown y 723 pruebas unitarias en 25 suites.                                                                                |
| `pnpm build`                    | Correcto; editor dinámico y portada/kit pregenerados en EN/ES.                                                                                                                         |
| Recorridos nuevos dirigidos     | 12 correctos: selección, edición, errores, recuperación, salida, copias, foco, teclado y móvil.                                                                                        |
| `pnpm test:e2e`                 | 127 recorridos correctos en la ejecución completa final.                                                                                                                               |
| Accesibilidad automática        | 35 casos incluyen 65 análisis axe sin infracciones detectadas de las reglas ejecutadas. No se ejecutó `test:a11y` por separado.                                                        |
| Revisión visual e independiente | Escritorio de 1600 px y móvil de 360 px, edición y vista previa, ambos idiomas y temas, sin desbordamiento horizontal. Sin hallazgos materiales pendientes en la integración revisada. |

El núcleo comprueba las cuatro variantes nuevas, borradores anteriores, duplicación independiente y validación sintáctica HTTPS sin red. La generación conserva texto escapado, listas independientes, niveles de subtítulo según el título de sección, separadores, citas de varios párrafos y errores por el campo original. Los metadatos `customImages` coinciden con el Markdown, conservan orden y repeticiones, se omiten sin imágenes y nunca se persisten en el perfil.

Los recorridos comprueban las ocho muestras locales sin solicitudes de imagen ni contenido precargado, foco al agregar o mover, eliminación de una sección que contiene solo un separador y prefijos `- ` literales en subtítulos y frases destacadas. Una imagen necesita URL válida y descripción para exportarse; ocultarla conserva sus datos y evita su carga y validación. Vista previa, copia y descarga comparten el resultado del generador. El portapapeles se compara normalizando los saltos CRLF propios de Windows.

Se verifican ausencia de referrer y de solicitudes al optimizador, destinos inválidos sin carga, texto hostil sin imágenes ni HTML inyectados y respuesta 404 con descripción y enlace. Editar otro bloque o la descripción conserva el estado de fallo sin repetir la solicitud; cambiar la URL permite cargar la nueva imagen. La revisión corrigió la identidad de los componentes de párrafo e imagen y los números decorativos del selector, que ahora usan trazos SVG para conservar la coincidencia del nombre accesible con el texto visible.

Se mantienen las regresiones de almacenamiento, migración v1/v2, recuperación, cuota, idiomas, arrastre, tecnologías, ubicación, contactos y actividad. Sin dependencias nuevas. Las imágenes siguen alojadas en la URL indicada; la validación no comprueba DNS, disponibilidad ni tipo de archivo. No hubo publicación de README en GitHub, lectores de pantalla, dispositivos físicos, otros motores ni CI remoto. Las comprobaciones automáticas no certifican accesibilidad completa. Ver [ADR 0014](decisions/0014-custom-visual-blocks.md).

## Validación de HTML explícito

Validación local del **2026-10-19**, con Node.js 24.21.0 y pnpm 11.25.0 en Windows. Los recorridos utilizan Chromium y la compilación de producción en `http://127.0.0.1:3000`. Las imágenes se interceptan con SVG ficticios; no se solicitó un alojamiento externo real para comprobarlas.

| Comprobación                    | Resultado observado                                                                                                                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`                    | Correcto: lint, tipos, formato, enlaces de 31 documentos Markdown y 840 pruebas unitarias en 27 suites.                                                                                                 |
| `pnpm build`                    | Correcto; editor dinámico y portada/kit pregenerados en EN/ES.                                                                                                                                          |
| Recorridos HTML dirigidos       | 14 correctos: edición, ejemplos, recuperación, presupuesto, salida compartida, contenido hostil, fallos de imagen, teclado y móvil.                                                                     |
| `pnpm test:e2e`                 | 141 recorridos correctos en la ejecución completa final.                                                                                                                                                |
| Accesibilidad automática        | 40 casos incluyen 75 análisis axe sin infracciones detectadas de las reglas ejecutadas. No se ejecutó `test:a11y` por separado.                                                                         |
| Revisión visual e independiente | Escritorio de 1600 px y móvil de 360 px, edición y vista previa, EN/ES y ambos temas, sin desbordamiento horizontal. Revisiones de UI, política HTML e integración sin hallazgos materiales pendientes. |

Las pruebas puras cubren la variante estricta v2, lectura de documentos anteriores, conservación de fuente y copias independientes, HTML mal formado y namespaces, etiquetas y atributos retirados, entidades en URLs, imágenes y nombres accesibles, tablas/desplegables, controles anidados y límites por bloque/documento. Los rangos UTF-16 identifican fragmentos completos, incluso con Unicode, repeticiones y orden mixto; un fallo no devuelve HTML parcial ni metadatos. La serialización conserva la semántica de saltos dentro de `pre` y `code`, compensando el LF inicial de `pre` sin mutar la fuente o el árbol saneado.

La prueba de pipeline verifica `skipHtml` y rangos exactos, rechazando metadatos incompletos, alterados o solapados. El Markdown exportado, procesado sin el plugin propio, no reactiva imágenes, enlaces o encabezados desde texto que parezca Markdown dentro de HTML. La vista previa construye elementos React desde el árbol permitido y no usa inyección de cadenas HTML ni un parser global de HTML libre.

En navegador se verifican nueve tarjetas con muestras locales, código inicialmente vacío, ejemplos insertados solo por elección con confirmación de reemplazo, ayuda EN/ES y HTML exportado inspeccionable. Fuente original y salida filtrada siguen separadas al duplicar, ocultar y recuperar; los seis bloques de la prueba de presupuesto explican el límite agregado y permiten enfocar y corregir el campo afectado. La copia y la descarga coinciden con el generador, con normalización CRLF del portapapeles de Windows.

Se comprueban títulos centrados, imágenes enlazadas, tablas, desplegables y código; los recursos admitidos se cargan directamente en navegador con lazy/async/no-referrer, sin optimizador del servidor. Scripts, CSS, eventos, formularios, iframes y SVG inline no ejecutan código ni solicitan sus recursos. Las URLs inválidas y alternativas ausentes bloquean la salida visible; ocultar conserva datos y habilita el resto. Un 404 conserva el enlace y el README; cambiar otra frase no repite la solicitud fallida y cambiar la URL permite recuperar la imagen.

La revisión corrigió fallbacks con controles anidados, nombres accesibles de enlaces después de un fallo, focos añadidos dentro de enlaces y jerarquía externa afectada por encabezados de un `details` cerrado. La navegación conserva su nombre de acción y asocia el estado como descripción; el orden y el estado visibles quedan fuera del contenido del botón para mantener la coincidencia de su nombre accesible. La regresión completa incluye arrastre por puntero/tacto emulado/teclado, Escape, almacenamiento, idiomas, tecnologías, contactos, ubicación y actividad.

Se incorporaron tres utilidades AST con versiones directas fijadas y los tipos HAST: `hast-util-from-html` 2.0.3, `hast-util-sanitize` 5.0.2, `hast-util-to-html` 9.0.5 y `@types/hast` 3.0.5. La advertencia de peers conocida de la cadena de herramientas continúa; no se añadieron servicios ni cuentas. Esta entrega no incorpora el importador de README. La revisión no incluye publicación real en GitHub, lectores de pantalla, dispositivos físicos, otros motores ni CI remoto; las comprobaciones automáticas no certifican accesibilidad completa. Ver [ADR 0015](decisions/0015-explicit-profile-html.md).

## Validación de reflujo y navegación del editor

Revisión local del **2026-10-19**, con Node.js 24.21.0, pnpm 11.25.0 y Chromium sobre la compilación de producción. Se corrigieron títulos partidos y estados superpuestos en la navegación: el título dispone de más ancho, el estado y el número siguen el flujo del documento y los controles de orden quedan debajo. El tirador permanece montado aunque su fila esté oculta; desmontarlo hacía que la librería de arrastre aplicara un rol de botón deshabilitado a toda la entrada.

| Comprobación    | Resultado observado                                                                                                                                                                                         |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check`    | Correcto: lint, tipos, formato, enlaces de 31 documentos Markdown y 840 pruebas unitarias en 27 suites.                                                                                                     |
| `pnpm build`    | Correcto; editor dinámico y portada/kit pregenerados en EN/ES.                                                                                                                                              |
| `pnpm test:e2e` | 193 recorridos correctos en la ejecución completa final, incluidos 52 casos nuevos.                                                                                                                         |
| Reflujo         | 320, 360, 768, 1024, 1280, 1440, 1657 y 1920 px, ambos idiomas y temas, sin desbordamiento horizontal del documento en los casos comprobados.                                                               |
| Texto ampliado  | Tamaño raíz de 32 px en 320 y 1280 px, EN/ES: navegación, cinco formularios fijos, secciones personalizadas y vista previa. Se amplían texto y medidas en rem; no se comprobó el zoom nativo del navegador. |
| Accesibilidad   | Análisis axe sin infracciones detectadas de las reglas ejecutadas; teclado, foco, nombres y descripciones accesibles, errores e inclusión revisados.                                                        |

La matriz comprueba siete secciones incluidas, títulos largos con y sin espacios, separación geométrica entre título y estado y superficies de navegación de al menos 44 px. Se verifican URL inválida antes de corregir, exclusión de la sección activa sin deshabilitar su casilla, conservación del texto entre edición/vista previa y Tab hasta agregar otra sección dentro de la navegación desplazable. Los bloques personalizados se adaptan al ancho de su panel; las columnas del editor también responden al tamaño de letra. Botones, encabezado, leyendas y URLs largas admiten ajuste sin ensanchar el documento.

Se inspeccionaron capturas equivalentes a la composición original de escritorio a 1657 px, configuración móvil a 360 px y capturas de la matriz y de texto ampliado. La revisión independiente de integración no encontró defectos bloqueantes. La regresión completa mantiene arrastre con puntero, tacto emulado y teclado, Escape, idiomas, guardado, exportación, HTML, tecnologías, ubicación y contacto. No cambian el documento, la generación ni las dependencias.

Los resultados corresponden a Chromium local y datos controlados. No se verificaron lectores de pantalla reales, dispositivos físicos, otros motores, zoom nativo ni cambios de tamaño durante una edición con foco activo. Las comprobaciones automáticas y la revisión visual no certifican accesibilidad completa.

## Validación de navegación superior y herramientas internas

Iteración local del **2026-10-19**. La revisión anterior comprobaba reflujo horizontal, pero no la llegada a los campos con la altura útil de un teléfono. Esta iteración reemplaza la disposición lateral por una barra superior y un organizador plegable, reduce la cabecera móvil y despliega las muestras mediante «Agregar bloque».

| Comprobación                    | Resultado observado                                                                                       |
| ------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `pnpm check`                    | Correcto: lint, tipos, formato, enlaces de 32 documentos y 840 pruebas unitarias en 27 suites.            |
| `pnpm build`                    | Correcto con el código final. Kit interno ausente de producción; EN/ES devuelven 404.                     |
| `pnpm test:e2e`                 | 206 recorridos de Chromium correctos en la ejecución completa final, sin exclusiones.                     |
| Regresiones nuevas              | 16 casos de navegación superior, alcance de campos, organización, bloques, foco y emulación móvil táctil. |
| Revisión final de documentación | `git diff --check`, `pnpm format:check` y `pnpm docs:check` correctos.                                    |

Se verifica el primer campo sin desplazar la página en 320 × 568, 360 × 640 y 390 × 844, en ambos idiomas. La matriz mantiene anchos de 320 a 1920 px, ambos temas y tamaño raíz de 32 px. Dos contextos con `isMobile` y `hasTouch` comprueban edición, navegación, conservación del borrador y análisis axe. Se revisaron capturas iniciales y de los paneles abiertos. Las reglas automáticas ejecutadas no detectaron infracciones.

Los recorridos incluyen veinte secciones, edición desde el final de doce bloques, organizador con alto acotado, retorno de foco al cerrar, selección consecutiva con flechas y cancelación de arrastre. El selector nativo conserva el foco; cambiar entre edición y vista previa muestra su inicio. Se mantienen las regresiones de exportación, almacenamiento, HTML, tecnologías, contactos y actividad.

El cambio de idioma conserva query repetida, hash normal, codificado o vacío, historial y foco durante doce transiciones. Se corrigió una duplicación de hash de rutas cacheadas de Next.js 16.4 mediante la API pública de History, sin recargar la página ni usar estado privado del router.

El kit responde 200 en EN/ES bajo un servidor de desarrollo separado y 404 en producción; no aparece en la portada ni navegación pública. `pnpm test:e2e:ui --help` terminó correctamente; la interfaz gráfica de Playwright no se abrió durante esta validación. No se incorporó Storybook ni nuevas dependencias. Ver [ADR 0016](decisions/0016-top-navigation-and-internal-tools.md).

La verificación se limita a Chromium local y emulación: no incluye dispositivos físicos, teclado del sistema móvil, Safari, lectores de pantalla reales ni zoom nativo del navegador. No certifica accesibilidad completa. Los cambios permanecen locales, sin commit, push ni despliegue.

## Validación de fila horizontal de secciones

Iteración local cerrada el **2026-10-20**, con Node.js 24.21.0, pnpm 11.25.0 y Chromium sobre producción local. Las secciones permanecen en una fila superior sin desplegar un organizador. Cada elemento ofrece casilla, nombre y tirador; una pareja de flechas ordena la sección activa. Las que no entran se recorren horizontalmente dentro de la fila, sin ensanchar la página.

| Comprobación                 | Resultado observado                                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm check`                 | Correcto: lint, tipos, formato, enlaces de 33 documentos y 840 pruebas unitarias en 27 suites. |
| `pnpm build`                 | Correcto con el código final de navegación y restauración de foco.                             |
| Recorridos dirigidos finales | 33 correctos: navegación, primer campo móvil, texto ampliado, orden, foco y cancelación.       |
| `pnpm test:e2e`              | 208 recorridos correctos en la ejecución completa final, sin exclusiones (4,5 minutos).        |

La regresión superior contiene 18 casos y comprueba 320 × 568, 360 × 640 y 390 × 844, EN/ES, veinte secciones en una fila, nombres largos, selección conservando foco, inclusión y ocultación sin perder el control enfocado, tacto emulado y raíz de 32 px. Las acciones admiten salto de línea al ampliar texto y no se superponen. Se inspeccionaron capturas móviles y la composición de escritorio de 1657 px.

Los casos de teclado comprueban un desplazamiento por flecha, recorrido fuera del área inicialmente visible, inversión de dirección, flechas opuestas dentro de la misma tarea, tomar y soltar sin mover y Escape sin persistir la proyección. Una edición larga mantiene `scrollY` al tomar, mover y cancelar; el foco vuelve al tirador sin desplazar la página. La preparación de esa prueba usa `focus({preventScroll:true})` para aislar el gesto de la navegación de foco nativa.

La revisión corrigió textos ocultos que escapaban del contenedor, desplazamiento entre pointerdown y pointerup, revelado de controles con letra ampliada y restauración de foco de la biblioteca. No se oculta el desbordamiento global ni se modifica la dependencia. Los análisis axe no detectaron infracciones de las reglas ejecutadas. Revisiones independientes cerradas sin hallazgos accionables. Ver [ADR 0017](decisions/0017-horizontal-section-navigation.md).

No cambia el documento, la persistencia ni la generación del README, y no se incorporan dependencias. Las comprobaciones automáticas de accesibilidad no equivalen a una revisión completa: quedan dispositivos físicos, Safari, teclado móvil del sistema, lectores de pantalla y zoom nativo. Los cambios siguen locales, sin commit, push ni despliegue.

## Validación de importación de README con respaldo

Entrega local del **2026-10-20** con Node.js 24.21.0, pnpm 11.25.0 y Chromium contra producción local. Permite pegar o abrir `.md` UTF-8, revisar secciones y confirmar con un último respaldo local del perfil anterior y el original. El panel se carga bajo demanda. Ver [uso del importador](editor.md#importar-un-readme-existente) y [ADR 0018](decisions/0018-readme-import-with-backup.md).

| Comprobación                           | Resultado observado                                                                            |
| -------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `pnpm check`                           | Correcto: lint, tipos, formato, enlaces de 34 documentos y 909 pruebas unitarias en 29 suites. |
| `pnpm build`                           | Correcto con el código final.                                                                  |
| `pnpm test:e2e`                        | 229 recorridos correctos en la ejecución completa, sin fallos ni reintentos.                   |
| Importador sobre la última compilación | 21 recorridos correctos en EN/ES.                                                              |

La suite completa se ejecutó antes de extraer la limpieza de la sesión a una función de módulo para cumplir lint, sin cambiar su comportamiento. Después de esa extracción se recompiló y se repitieron los 21 casos del importador sobre el artefacto final. Una ejecución previa interrumpida deliberadamente no se cuenta como validación completa.

Se verificaron fuente UTF-8 con BOM/CRLF, cancelación y exclusiones sin escritura, edición que invalida la propuesta, HTML inerte, descarga y restauración, datos protegidos y v1, fallos de cuota y lectura, decisión explícita de memoria, cambio de idioma, debounce y `pagehide`. Al cerrar y reabrir se conservan fuente y selección sin reanudar la confirmación; al terminar una importación o restauración se limpia esa sesión. La regresión completa incluye navegación horizontal, arrastre, tecnologías y exportación existentes.

Los cuatro casos del importador de accesibilidad móvil revisan fuente, revisión y confirmación a 320 × 568 en EN/ES y temas claro/oscuro, con doce análisis axe sin infracciones detectadas. Hay 22 capturas locales, de las que se inspeccionaron muestras de escritorio y móvil, incluido el respaldo. La revisión independiente de integración no encontró defectos bloqueantes. La cobertura es Chromium y emulación: quedan dispositivos físicos, Safari, lectores de pantalla y zoom nativo; no demuestra accesibilidad completa ni compatibilidad con cualquier README.

La entrada se convierte en secciones personalizadas y usa la política HTML existente. Rutas relativas, anclas y formatos incompatibles requieren corrección o exclusión consciente. No hay carga general de JSON, clasificación automática en módulos, IA ni historial remoto. Los cambios permanecen locales, sin commit, push ni despliegue.

### Corrección de detección de secciones HTML

Se ajustó la detección tras recibir un README que combinaba encabezados HTML, una lista Markdown, enlaces con iconos e imágenes de estadísticas. El analizador ahora reconoce encabezados HTML raíz con cierre explícito y conserva la cabecera inicial junta. Un H2 usado como frase inicial no desactiva la separación posterior por H3. Las estructuras inciertas siguen como HTML unido; no se infieren módulos fijos.

La inspección local del caso proporcionado pasó de una sección genérica a tres secciones con sus encabezados: cabecera, enlaces y herramientas. La salida conservó 19 imágenes, 18 enlaces y cuatro énfasis fuertes, con cobertura exacta del original por los rangos. También se inspeccionaron las variantes de frase inicial H2 y archivo con BOM/CRLF. Se corrigió el desplazamiento de offsets causado por el BOM y se evitó introducir otro párrafo alrededor de enlaces HTML separados por líneas vacías.

Esta corrección tiene inspección directa del analizador y revisión independiente, con lint, tipos, formato, enlaces de documentación y compilación correctos. No se añadieron ni ejecutaron suites de pruebas en esta iteración. Los resultados de 909 pruebas unitarias y 229 recorridos anteriores corresponden a la entrega previa, no a una regresión de este ajuste.

## Validación de código, editor de fuentes y formato personalizado

El 20 de octubre de 2026 se integraron los bloques de código literal, CodeMirror para HTML/código y los controles de nivel/alineación en secciones personalizadas. El contrato y sus límites se registran en [ADR 0019](decisions/0019-code-and-formatting.md); el uso, en [editor](editor.md).

Resultados ejecutados sobre la integración:

- `pnpm check`: lint, tipos, formato, enlaces de 35 archivos Markdown y 993 pruebas unitarias en 35 suites correctos.
- `pnpm build`: compilación de producción correcta con los cambios finales de producto.
- `pnpm install --frozen-lockfile`: instalación reproducible correcta, sin excepciones a la antigüedad mínima de paquetes.
- Recorridos focales de Chromium: 41/41, con 15 casos nuevos y 26 regresiones de HTML/bloques visuales.
- Grupo responsive completo: 52/52, de 320 a 1920 px, EN/ES, temas claro/oscuro y texto al 200 %.
- Regresión completa de Chromium: 244/244 en 4,8 minutos, sobre la misma compilación de producción. Desde esa compilación solo se actualizó la expectativa responsive de nueve a diez opciones; no cambió el producto.

Se verificaron código literal sin ejecución ni solicitudes de sus imágenes, resaltado local, foco y Tab, sangría y cierre HTML, fuente con BOM/CRLF, copia/descarga del mismo Markdown, importación con lenguaje, recuperación, duplicación independiente y ocultación. El historial cubre ambos modos de edición, el pegado y cambios exclusivos de saltos de línea. El formato conserva defaults anteriores y el nivel elegido explícitamente cuando se quita el título opcional.

La revisión corrigió pérdidas de undo al alternar modos o pegar, la normalización de la copia de fragmentos, un nivel de encabezado sin título y problemas de nombres accesibles y áreas desplazables. Se mantuvieron las comprobaciones de teclado y axe; los grupos locales de código no crean landmarks repetidos. La regresión responsive necesitó actualizar de nueve a diez opciones del selector al incorporar Código, conservando las demás aserciones.

Se revisaron visualmente escritorio y móvil, ambos temas y ambos idiomas: primer campo accesible en 320 × 640, navegación horizontal y desplazamiento del código dentro de su contenedor. Los escenarios axe ejecutados no detectaron infracciones. El contraste calculado de los tonos de sintaxis sobre ambas superficies supera 5,72:1 en claro y 7,32:1 en oscuro. La revisión automática y las capturas no sustituyen una evaluación completa con lector de pantalla ni pruebas en teléfonos físicos.

Los manifests y loaders del build separan CodeMirror y las gramáticas del JavaScript inicial del editor; el resaltado se solicita bajo demanda. Esta lectura de bundles no es una medición de rendimiento de red ni una comparación con una versión anterior. No se verificó paridad visual completa con GitHub ni la configuración autenticada de actividad, que mantiene sus requisitos operativos existentes.

## Validación de resaltado, Presentación y borrado

El 20 de octubre de 2026 se corrigió la cobertura de resaltado, se cambió el ejemplo explícito a JSON, se extendió el formato visual a Presentación y se agregó «Borrar README» con confirmación. El esquema v1 permanece cerrado; v2 conserva opciones ausentes al recuperar. Ver [ADR 0020](decisions/0020-presentation-formatting.md) y [uso del editor](editor.md).

- `pnpm check`: 1.121 pruebas en 40 suites, lint, tipos, formato y enlaces de 36 Markdown correctos.
- `pnpm build`: compilación de producción correcta.
- `pnpm install --frozen-lockfile`: correcta, sin excepciones a la antigüedad mínima de paquetes.
- Recorridos dirigidos de Chromium: 53/53 correctos sobre la compilación final.
- Regresión completa de Chromium: 264/264 correctos en 5,4 minutos sobre esa misma compilación, sin exclusiones ni reintentos.

Las pruebas puras cubren todos los lenguajes del catálogo, alias, C#, JSONC, PHP con/sin etiqueta y el resaltado léxico de GraphQL. El color no valida ni ejecuta código. Markdown y PHP utilizan gramáticas oficiales de CodeMirror con carga diferida; los demás lenguajes reutilizan los paquetes fijados y modos locales.

La revisión independiente comprobó almacenamiento protegido, revisiones pendientes, compatibilidad, escape y presupuesto HTML compartido. Se corrigió además la jerarquía semántica de un primer encabezado pequeño en la vista previa, sin modificar el nivel ni el Markdown exportado. El aviso de vaciado solo en memoria se muestra como nota y se anuncia mediante una única región estable.

La primera regresión encontró que el botón global agregaba 24 px y dejaba parte del primer campo personalizado fuera de 320 × 568. Se compactó el espaciado móvil del encabezado, manteniendo los botones de 44 px y el diseño de escritorio. Los casos EN/ES y sus capturas se repitieron sobre la compilación corregida sin relajar la comprobación del primer campo.

Se inspeccionaron capturas de C# en escritorio, Presentación centrada en móvil y botón de borrado en 320 × 568. Las pruebas usan contextos aislados y no vacían el borrador real del usuario. La revisión de accesibilidad automática no sustituye una evaluación completa con lectores de pantalla o dispositivos físicos.

## Validación de archivos de proyecto y recuperación

El 20 de octubre de 2026 se incorporaron descarga y apertura de proyectos JSON completos, revisión inerte, confirmación y respaldo independiente del perfil activo. Ver [ADR 0021](decisions/0021-project-files-and-recovery.md) y [recorrido de Proyecto](editor.md#guardar-y-abrir-proyectos).

- `pnpm check`: 1.202 pruebas en 42 suites, lint, tipos, formato y enlaces de 37 documentos correctos.
- `pnpm build`: compilación correcta con la protección del respaldo y la revisión móvil finales.
- Recorridos dirigidos de Chromium: 63/63 correctos sobre la compilación final.
- Regresión completa final de Chromium: 297/297 correctos en 4,8 minutos, sin exclusiones ni reintentos automáticos.

Se revisaron los contratos de 4 MiB UTF-8, profundidad y complejidad, migración v1, conservación de campos/fuentes y recuperación. La revisión independiente detectó dos problemas corregidos: un archivo compacto admitido podía superar el límite al volver a guardarlo con sangría, y el aviso de memoria podía prometer un respaldo que no existía. La salida usa formato compacto cuando hace falta y el aviso condiciona la disponibilidad de recuperación. También se aplica el límite de complejidad antes de validar un respaldo local corrupto.

La revisión visual encontró una superposición de la barra fija durante la revisión de proyectos largos. Mientras Proyecto está abierto, la fila conserva su posición normal; al cerrarlo recupera el comportamiento del editor. La prueba móvil verifica alcance de encabezados de revisión/confirmación antes de interactuar.

La validación usa perfiles ficticios en contextos aislados y producción local en el puerto 3100. Las credenciales y el origen de tarjetas se vacían únicamente en ese proceso para evitar consultas autenticadas reales; no se modifican archivos de entorno ni el servicio que ocupa 3000. Los primeros intentos fallidos por caché de navegador o permisos de red del sandbox ocurrieron antes de navegar y se descartan como evidencia de producto. No se incorporaron dependencias ni servicios.

La primera corrida general terminó con 296/297 casos correctos: Chromium informó `ERR_NO_BUFFER_SPACE` al cargar un chunk y ese contexto no hidrató. El caso pasó aislado sin cambios; luego se repitió toda la suite, con 297/297 correctos sobre el mismo producto. Las aserciones mantienen el orden de escrituras y el contenido completo, comparando objetos JSON en vez de su orden de propiedades.

Los 33 casos nuevos cubren descarga del documento actual, apertura revisable, confirmación, respaldo y restauración, v1, UTF-8 y archivos incompatibles, revisión inerte, cuotas, almacenamiento protegido, guardados pendientes y lecturas tardías. Se revisaron capturas de escritorio y móvil EN/ES, temas claro/oscuro, primer campo en 320 × 568 y foco de revisión/confirmación sin solapes; los análisis axe ejecutados no detectaron infracciones. Esta evidencia corresponde a Chromium y emulación: quedan dispositivos físicos, Safari y evaluación completa con lectores de pantalla. El borrador local no sincroniza pestañas y el perfil anterior debe caber en el contrato para poder respaldarse. Cambios locales, sin commit, push ni despliegue en esta entrega.

## Validación de actividad del propietario del token

El 20 de octubre de 2026 se corrigió el rechazo de la vista del propietario mediante `isViewer`, conservando los scopes admitidos y los filtros públicos. Ver [ADR 0022](decisions/0022-token-owner-public-activity.md).

- `pnpm test src/server/github src/core/activity`: 112 pruebas correctas en cinco suites. Incluyen propietario confirmado, identidad incorrecta, flag ausente, credenciales amplias o no verificables y exclusión de candidatos y repositorios privados/internos en ambas vistas.
- `pnpm lint`, `pnpm typecheck` y `pnpm build`: correctos. También pasaron formato focal, enlaces de documentación y revisión de whitespace del diff.
- Consulta autenticada real: respuesta HTTP 200 para el propietario con su propio token y para una cuenta pública de control. El snapshot omite `isViewer` y `userViewType`.
- Las tres tarjetas del propietario devolvieron HTTP 200, SVG pasivo y estado `ready`.
- Chromium en español, con almacenamiento aislado: consulta correcta, opciones inicialmente desmarcadas, tres imágenes cargadas y ningún error de página. Las solicitudes del navegador a la actividad y las tarjetas no llevan el encabezado de autenticación del proveedor.

El servidor local se reinició con la configuración de desarrollo. `APP_URL` permanece vacío: la consulta y la vista previa funcionan, mientras copia y descarga con tarjetas siguen bloqueadas hasta configurar un origen público HTTPS. Esta comprobación no publica la aplicación ni modifica el borrador real; las pruebas habituales mantienen respuestas controladas y no requieren la credencial real.

## Validación de la familia de tarjetas personalizables

El 20 de octubre de 2026 se incorporaron Panorama, actividad mensual y dos diseños adaptados de GitHub Stats Extended, con tema, paleta, diseño y ancho opcionales. Ver [ADR 0023](decisions/0023-customizable-activity-cards.md). No se agregaron dependencias, servicios, scopes ni credenciales.

- `pnpm lint`, `pnpm typecheck` y `pnpm build`: correctos. La generación de tipos y el build requieren ejecutar fuera del sandbox de Windows para cargar el binding SWC existente.
- Prettier focal, enlaces de 39 documentos y `git diff --check`: correctos.
- Inspección local con datos públicos reales: 42 combinaciones de siete tarjetas, tres diseños y dos temas devolvieron HTTP 200, estado `ready` y SVG pasivos. Ningún texto salió del viewBox. Se inspeccionaron capturas de Panorama, mensual y ambos diseños Extended.
- Las rutas rechazaron con HTTP 400 idioma, tema, paleta o tamaño inválidos, parámetros duplicados y una URL arbitraria.
- Chromium aislado: siete opciones inicialmente apagadas; selección de las cuatro nuevas, personalización, imágenes cargadas, guardado y recuperación correctos. Restablecer eliminó únicamente `appearance` y conservó usuario y selecciones. Sin errores de página ni encabezados de autenticación del proveedor en las solicitudes del navegador.
- Revisión EN/ES en escritorio y teléfono emulado de 390 × 844: sin desbordamiento horizontal; controles alcanzables mediante desplazamiento, y Tab de tema a paleta. El campo de usuario empezó debajo del viewport al abrir el bloque largo, por lo que no se afirma que todo el formulario sea visible sin desplazarse. No es una prueba en dispositivo físico ni una auditoría completa de accesibilidad.

Se conservó la licencia MIT íntegra de la revisión fijada de Extended y se revisaron los cambios de contrato y SVG de forma independiente. En esta ampliación no se agregaron casos a las suites de pruebas ni se ejecutaron las suites unitarias o E2E completas; las inspecciones dirigidas mediante scripts locales y los controles estáticos no las sustituyen. `APP_URL` sigue pendiente para exportar tarjetas desde un origen público; la integración local usa el token de desarrollo existente.

## Validación de la suite pública Extended y MIT

El 20 de octubre de 2026 se ampliaron las adaptaciones a las cinco familias Extended: estadísticas, lenguajes, repositorio, Gist y WakaTime. Se incorporaron 18 contadores, ranking opcional inicialmente apagado, cinco diseños de lenguajes, filtros, pesos, 79 temas y apariencia avanzada. El alcance y las diferencias se registran en [la matriz compatible](github-stats-extended.md) y [ADR 0024](decisions/0024-extended-public-suite-and-mit.md). El titular autorizó MIT con `Copyright (c) 2026 Juan Nicolas Herrera`; se agregaron licencia, metadatos y avisos sin incorporar dependencias nuevas.

- `pnpm lint`, `pnpm typecheck`, `pnpm format:check`, `pnpm docs:check` y `pnpm build`: correctos. Se comprobaron enlaces de 42 documentos Markdown. Tipos y compilación requieren ejecutar fuera del sandbox de Windows para cargar SWC. Una comprobación de formato inicial detectó la matriz todavía en edición; se formateó y la ejecución final pasó.
- `pnpm licenses:check` y la generación incluida en el build: correctos para 597 versiones instaladas y 224 raíces de dependencias de ejecución. Se conservaron 2.326.553 bytes de avisos. Hay 20 advertencias por paquetes sin archivo raíz de licencia/aviso, con contexto disponible en el inventario; no equivalen a una revisión jurídica cerrada ni a un artefacto binario listo para redistribuir. Ver [distribución open source](open-source.md).
- Consultas reales con el token de desarrollo: estadísticas básicas y selección de los 18 contadores para `juannh`, incluidos datos históricos y ranking, devolvieron HTTP 200. Repositorio público, Gist público y estadísticas públicas WakaTime devolvieron snapshots válidos. Los resultados ausentes o parciales conservan su estado; esta consulta no verifica todos los filtros o cuentas posibles.
- Inspección dirigida de 13 variantes SVG y los 79 temas: HTTP 200 y estado `ready`, sin recursos activos, texto fuera del viewBox ni superposiciones de texto detectadas en las variantes. Se revisaron capturas de estadísticas, anillo de lenguajes y repositorio con los cinco contadores de aportes.
- Seis repositorios públicos distintos solicitados simultáneamente devolvieron seis tarjetas `ready` tras incorporar la cola compartida. Ocho entradas inválidas —parámetros desconocidos o duplicados, pesos nulos, destino arbitrario, aportes sin usuario y alias WakaTime `current`— devolvieron HTTP 400. Un identificador antiguo de React fue rechazado por redirección; se repitió con su identificador actual, sin relajar la validación de identidad ni permitir redirecciones.
- Chromium aislado: 20 comprobaciones correctas en EN/ES. Incluyen ranking apagado, ausencia de consultas al abrir/escribir, edición de opciones en distinto orden sin perder imágenes, listas/degradados inválidos que conservan la configuración válida, guardado/recuperación y tres recursos sin usuario GitHub del perfil. No hubo errores de página ni encabezados Authorization del proveedor en el navegador.

La revisión independiente corrigió la serialización canónica de opciones, los defaults visibles, la eliminación del filtro opcional por relación, las fechas y estados de los aportes por repositorio y su alternativa textual. Se sustituyó el rechazo inmediato de la quinta consulta por una cola compartida acotada y se limitó cada tarjeta a sus propios datos para evitar consultas de otra tarjeta desactivada. La revisión final de esos cambios no encontró hallazgos accionables nuevos.

La revisión móvil fue emulación de 390 × 844, sin desbordamiento horizontal y con controles profundos alcanzables por teclado. El campo inicial empezó en `y=931`, debajo del viewport, medido antes de enfocarlo o desplazarlo; requiere bajar. Se inspeccionaron capturas de recursos en escritorio y foco móvil. No se afirma accesibilidad completa ni cobertura de dispositivos físicos, Safari o lectores de pantalla.

No se agregaron ni ejecutaron suites unitarias o E2E en esta ampliación. Los scripts efímeros y capturas están en `work/`, ignorado; las comprobaciones dirigidas no sustituyen una regresión completa. `APP_URL` permanece vacío en desarrollo: vista previa y consultas locales disponibles, copia/descarga con tarjetas bloqueadas hasta configurar un origen público HTTPS. No se modificó el borrador real ni se hizo commit, push o despliegue.

## Validación de avisos resueltos y actualización de tarjetas

El 20 de octubre de 2026 se publicó primero el estado anterior en `6df0e2817f7d953731ea56897c58011c561ee020`, según el orden solicitado. Después se revisaron las veinte dependencias con aviso raíz ausente y la tarjeta que parecía desaparecer al agregar o quitar contadores.

La revisión conserva 27 copias oficiales y un catálogo de 62 nombres/versiones exactos, incluidas variantes de plataforma. Las veinte ausencias del árbol instalado tienen resolución documentada y el verificador termina con cero advertencias y cero problemas para 597 versiones y 224 raíces de ejecución. El inventario ocupa 2.403.835 bytes. Tres orígenes no proporcionan copyright original: se conservan su declaración y contexto, con términos de referencia diferenciados, sin inventar titulares. `keyv@4.5.4` se identifica como residuo local ajeno al lockfile actual. Ver [la resolución por paquete](open-source.md#resolución-de-los-veinte-avisos-de-archivo-ausente).

El verificador no necesita red y falla ante una ausencia nueva sin revisión exacta, hashes de fuentes o contexto alterados, integridad npm distinta o licencia incompatible con la revisión. Cinco sondas negativas locales confirmaron esos rechazos. Git conserva los bytes y espacios originales de los avisos mediante atributos específicos; no se corrigió el estilo de textos ajenos ni se modificaron dependencias o el lockfile.

La reproducción real con `juannh`, ranking encendido y cuatro cambios de selección devolvió HTTP 200 y URLs válidas. La imagen quedaba vacía mientras cargaba la respuesta nueva. La corrección conserva la última imagen de la misma identidad, avisa que se está actualizando y cambia al nuevo nodo ya cargado, sin una segunda descarga. Descarta respuestas tardías y la imagen previa al cambiar usuario, tipo o destino. Los fallos tienen reintento accesible. El Markdown conserva siempre la URL de la configuración actual.

- `pnpm check`: licencias, lint, generación de tipos, TypeScript, formato, enlaces de 42 Markdown y 1.280 pruebas en 46 suites correctos.
- `pnpm build`: compilación de producción correcta, incluida la generación del inventario final.
- Cinco recorridos E2E focales correctos con respuestas controladas: agregar/quitar hasta un único contador, orden de selección, ranking, recuperación, respuestas fuera de orden, vuelta a una configuración previa, una sola descarga incluso con `no-store`, errores, reintento y separación entre identidades de perfil y recurso.
- La regresión inicial de producción sobre el checkpoint pasó sus 297 recorridos. La regresión completa de la compilación corregida terminó con 302/302 correctos en 6,5 minutos, sin exclusiones ni reintentos automáticos.
- Cuatro recorridos visuales dirigidos en producción: EN/ES, escritorio de 1440 × 1000 y móvil emulado de 390 × 844. Se inspeccionaron ocho capturas de actualización/error: imagen anterior visible, mensajes legibles y sin desbordamiento, reintento alcanzable con Tab/Enter y foco visible, sin errores de página.

La revisión independiente encontró que los mensajes de interfaz heredaban el idioma del README cuando ambos diferían. Se aplicó el idioma del editor al estado y botón, conservando el idioma del contenido; los dos cruces EN/ES quedaron cubiertos. No hubo otros hallazgos accionables en el cierre de código o licencias.

Las verificaciones usan contextos aislados y producción local en 3100 con credenciales y origen público vacíos solo en ese proceso. No alteran el borrador real ni la configuración de desarrollo. Las capturas y sondas están en `work/`, ignorado. No se ejecutó Linux ni se certificó un contenedor o cierre de componentes nativos; el catálogo sí verifica sus variantes actuales contra fuentes oficiales. La emulación y los controles automáticos no sustituyen dispositivos físicos ni una evaluación completa con lectores de pantalla.
