# Desarrollo

Esta guía describe cómo ejecutar y revisar la aplicación y su núcleo de perfil. La definición del producto y su alcance disponible están en [producto](product.md); el contrato y sus operaciones se describen en [modelo del perfil](profile-model.md).

## Requisitos

- Node.js `24.21.0`, indicado en `.nvmrc`.
- pnpm `11.25.0`, indicado en `packageManager` de `package.json`.

El proyecto usa Next.js `16.4.2`, React `19.3.1`, TypeScript, Tailwind CSS 4 y `next-intl` para los idiomas. El núcleo usa Zod `4.6.7` para la validación de documentos. No se necesita una cuenta de GitHub, una clave de IA ni variables de entorno para revisar la base entregada.

Las dependencias directas y el lockfile fijan las versiones de la base. En una copia limpia, `pnpm install --frozen-lockfile` reproduce esa resolución. Hay una advertencia de peers de tres plugins transitivos con ESLint 10; la decisión y sus límites están registrados en [ADR 0002](decisions/0002-toolchain.md).

## Instalación y ejecución

Desde la raíz del repositorio:

```sh
pnpm install
pnpm dev
```

Abrí [http://127.0.0.1:3000/en](http://127.0.0.1:3000/en) para inglés o [http://127.0.0.1:3000/es](http://127.0.0.1:3000/es) para español. El kit visual está en [inglés](http://127.0.0.1:3000/en/design-system) y [español](http://127.0.0.1:3000/es/design-system). La ruta [http://127.0.0.1:3000](http://127.0.0.1:3000) redirige a inglés.

Para ejecutar la compilación de producción:

```sh
pnpm build
pnpm start
```

`pnpm start` requiere que `pnpm build` haya finalizado correctamente. El puerto esperado es `3000`.

## Comandos

| Comando             | Propósito                                                                            |
| ------------------- | ------------------------------------------------------------------------------------ |
| `pnpm dev`          | Iniciar el servidor de desarrollo.                                                   |
| `pnpm build`        | Crear la compilación de producción.                                                  |
| `pnpm start`        | Servir la compilación de producción existente.                                       |
| `pnpm lint`         | Revisar el código con las reglas del repositorio.                                    |
| `pnpm typecheck`    | Comprobar los tipos sin emitir archivos.                                             |
| `pnpm format`       | Aplicar el formato definido por el proyecto.                                         |
| `pnpm format:check` | Comprobar el formato sin modificar archivos.                                         |
| `pnpm test`         | Comprobar perfil, generación, adaptador de borrador y traducciones EN/ES con Vitest. |
| `pnpm test:watch`   | Ejecutar esas pruebas durante el desarrollo.                                         |
| `pnpm test:e2e`     | Revisar rutas, kit y recorrido de edición, recuperación y exportación en navegador.  |
| `pnpm test:a11y`    | Ejecutar las comprobaciones automáticas de accesibilidad de rutas, kit y editor.     |
| `pnpm docs:check`   | Verificar enlaces locales de los archivos Markdown del repositorio.                  |
| `pnpm check`        | Ejecutar lint, tipos, formato, enlaces de documentación y pruebas unitarias.         |

`pnpm check` agrupa `lint`, `typecheck`, `format:check`, `docs:check` y `test`. La compilación y las comprobaciones en navegador se ejecutan por separado. `typecheck` genera primero los tipos de rutas de Next.js, incluidos los getters de `next/root-params`.

Si las pruebas en navegador solicitan instalar su navegador de ejecución, preparalo con:

```sh
pnpm exec playwright install chromium
```

## Alcance de la base

La planificación interna se conserva localmente en `.private/planning/`, excluida de Git y de los controles de documentación pública. Una copia nueva del repositorio funciona sin esos archivos. La carpeta no se sincroniza ni recibe respaldo remoto por medio de este repositorio; no usar `git add -f` para publicarla.

- `/`: redirección al idioma predeterminado, inglés.
- `/en` y `/es`: entrada de la aplicación y presentación del estado inicial del proyecto.
- `/en/design-system` y `/es/design-system`: catálogo del kit visual y sus estados de interacción.
- `/en/editor` y `/es/editor`: cinco secciones opcionales —presentación, tecnologías, proyectos, actividad y contribuciones, contacto—, con navegación, configuración estable, orden por arrastre o botones, vista previa, exportación y borrador local. Conocimientos, formación y actualidad están retirados también para borradores anteriores. El editor se renderiza por solicitud para leer la configuración de tarjetas en ejecución; portada y kit siguen pregenerados.
- Selector de idioma funcional, rutas localizadas y mensajes separados para inglés y español.
- Componentes compartidos y configuración inicial de calidad y pruebas.
- Contrato de perfil versión 1, registro puro de los nueve módulos y operaciones de creación, validación, visibilidad y orden en `src/core/`.

Las pruebas unitarias incluyen contratos y operaciones del perfil, generación de README, adaptador de almacenamiento, mensajes, SVG y cliente de GitHub con respuestas controladas. Las comprobaciones de navegador cubren la base visual, el kit y el recorrido del editor. La integración de actividad de GitHub está implementada y requiere configuración del servidor; no hay proveedores de IA.

Vitest comprueba el comportamiento del núcleo, los límites de salida y persistencia, y la paridad de claves y parámetros de mensajes en ambos idiomas. Playwright comprueba recorridos, idiomas, tema, teclado, errores, tamaños de pantalla y exportación. Los resultados ejecutados se registran por entrega más abajo; la existencia de una prueba no implica que ya se haya ejecutado en esta revisión.

Para comprobar una instancia ya iniciada se puede definir `PLAYWRIGHT_BASE_URL`; de lo contrario Playwright inicia desarrollo. En CI se compila primero y Playwright inicia `pnpm start` para revisar producción. No ejecutar `pnpm dev` y `pnpm build` simultáneamente al validar la misma entrega.

El cambio de idioma conserva la ruta, los parámetros y el ancla. El campo `contentLocale` del documento es independiente del idioma de navegación; cambiar de idioma no traduce el contenido. Los metadatos de esta vista inicial usan `noindex`; revisar ese ajuste antes de publicar el producto definitivo.

## Borrador local y diagnóstico

El editor guarda el documento completo en `localStorage`, bajo `github-profile-generator.profile.v1`. La lectura se valida antes de habilitar escritura; los cambios válidos se guardan tras 500 ms y se intenta guardar lo pendiente al ocultar o abandonar la página o desmontar el editor. Un cierre abrupto puede impedir ese último intento. Los datos no se envían a un servidor ni se sincronizan entre dispositivos.

Usar siempre el mismo origen: `http://127.0.0.1:3000`. Cambiar a `localhost`, otro host, puerto o protocolo abre un almacenamiento diferente. Los idiomas del editor comparten el borrador si se mantiene el origen.

Ante JSON inválido, versión incompatible o lectura bloqueada, el editor conserva el valor existente y bloquea su reemplazo automático. La confirmación de iniciar un borrador nuevo permite sustituirlo; si se cancela no se escribe. Ante un fallo de escritura o cuota, el aviso permanece y se puede seguir editando en memoria y exportando un README válido; no afirmar que los últimos cambios están guardados.

Los cinco módulos editables usan campos que ya existían en v1, sin cambiar la versión ni la clave de almacenamiento. La sección seleccionada y la vista móvil son efímeras; contenido, visibilidad y orden sí se guardan. Ocultar una sección activa conserva su formulario editable y avisa que no participa en el README. Arrastrar mueve una sección entre las incluidas; Subir/Bajar mueve una posición. Ambas acciones conservan las posiciones de módulos ocultos, retirados y métricas.

Todos los documentos ofrecen las mismas cinco secciones. Conocimientos, formación y actualidad no tienen formulario ni salida, aunque sus flags de visibilidad antiguos sean verdaderos; sus enlaces tampoco bloquean la exportación. El formato v1 conserva esos campos y los nueve slots internamente para leer y guardar borradores sin destruir datos. No hay una condición que los vuelva a ofrecer ni una fusión automática con la intro. Presentación concentra el texto libre. Ver [ADR 0008](decisions/0008-focused-profile.md).

Tecnologías usa un catálogo local de 259 herramientas con SVG y licencias de Devicon, Simple Icons y Lobe Icons, fijados a commits. Admite texto propio y conserva grupos y notas anteriores; la búsqueda no consulta servicios externos. Los iconos de 32 × 32 se agrupan en filas que se adaptan al ancho. Contacto ofrece 13 servicios, web/portfolio y correo; una URL válida determina el icono, mientras la etiqueta es opcional y personalizable. Sus iconos exportados son decorativos de 20 × 20. `remarkProfileIcons` conserva el contexto inline del Markdown sin párrafos anidados; el namespace `ContactProviders` se entrega explícitamente al proveedor cliente del editor. El marcado se genera únicamente desde los catálogos permitidos. Ver [ADR 0009](decisions/0009-profile-icons.md).

## Configurar actividad de GitHub

El formulario **Actividad y contribuciones** conserva un recorrido manual sin cuenta y ofrece una parte plegable para consultar un usuario y elegir calendario, resumen o lenguajes. Los destacados sugeridos se copian solo por una selección explícita. El documento v1 conserva `data.metrics` y `data.contributions`; no guarda snapshots remotos. La navegación usa la inclusión efectiva de ambos flags y genera un único bloque en el slot de contribuciones, sin mover el slot interno de métricas.

Las variables están descritas en [.env.example](../.env.example). Por defecto quedan vacías y el recorrido manual funciona sin ellas:

- `GITHUB_TOKEN`: PAT classic dedicado con únicamente `public_repo`, según la documentación actual de GraphQL. Ese permiso también admite escritura pública; el cliente implementado utiliza exclusivamente consultas constantes. El servidor verifica `X-OAuth-Scopes` en cada respuesta y acepta vacío o exactamente `public_repo`; rechaza otros permisos, mezclas o credenciales no verificables. No acepta tokens con acceso adicional a cuentas, repos privados o contribuciones privadas. No pegar secretos en chats, archivos públicos ni variables `NEXT_PUBLIC_`.
- `APP_URL`: origen HTTPS público de este despliegue, que alojará los SVG. Se lee por solicitud y basta reiniciar el servicio después de cambiarlo. No se deriva de Host ni admite direcciones locales, credenciales, puertos, rutas, parámetros o fragmentos. Sin origen público, las tarjetas pueden revisarse localmente, pero el generador comunica `exportIssues` y la interfaz impide copiar o descargar esa salida. Excluir las tarjetas permite exportar lo manual.

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
