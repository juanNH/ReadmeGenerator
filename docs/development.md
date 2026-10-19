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
- `/en/editor` y `/es/editor`: edición de presentación y contacto, vista previa, copia y descarga del mismo Markdown, con borrador local.
- Selector de idioma funcional, rutas localizadas y mensajes separados para inglés y español.
- Componentes compartidos y configuración inicial de calidad y pruebas.
- Contrato de perfil versión 1, registro puro de los nueve módulos y operaciones de creación, validación, visibilidad y orden en `src/core/`.

Las pruebas unitarias incluyen contratos y operaciones del perfil, generación de README, adaptador de almacenamiento y mensajes. Las comprobaciones de navegador cubren la base visual, el kit y el recorrido del editor. No hay consultas reales a GitHub ni proveedores de IA.

Vitest comprueba el comportamiento del núcleo, los límites de salida y persistencia, y la paridad de claves y parámetros de mensajes en ambos idiomas. Playwright comprueba recorridos, idiomas, tema, teclado, errores, tamaños de pantalla y exportación. Los resultados ejecutados se registran por entrega más abajo; la existencia de una prueba no implica que ya se haya ejecutado en esta revisión.

Para comprobar una instancia ya iniciada se puede definir `PLAYWRIGHT_BASE_URL`; de lo contrario Playwright inicia desarrollo. En CI se compila primero y Playwright inicia `pnpm start` para revisar producción. No ejecutar `pnpm dev` y `pnpm build` simultáneamente al validar la misma entrega.

El cambio de idioma conserva la ruta, los parámetros y el ancla. El campo `contentLocale` del documento es independiente del idioma de navegación; cambiar de idioma no traduce el contenido. Los metadatos de esta vista inicial usan `noindex`; revisar ese ajuste antes de publicar el producto definitivo.

## Borrador local y diagnóstico

El editor guarda el documento completo en `localStorage`, bajo `github-profile-generator.profile.v1`. La lectura se valida antes de habilitar escritura; los cambios válidos se guardan tras 500 ms y se intenta guardar lo pendiente al ocultar o abandonar la página o desmontar el editor. Un cierre abrupto puede impedir ese último intento. Los datos no se envían a un servidor ni se sincronizan entre dispositivos.

Usar siempre el mismo origen: `http://127.0.0.1:3000`. Cambiar a `localhost`, otro host, puerto o protocolo abre un almacenamiento diferente. Los idiomas del editor comparten el borrador si se mantiene el origen.

Ante JSON inválido, versión incompatible o lectura bloqueada, el editor conserva el valor existente y bloquea su reemplazo automático. La confirmación de iniciar un borrador nuevo permite sustituirlo; si se cancela no se escribe. Ante un fallo de escritura o cuota, el aviso permanece y se puede seguir editando en memoria y exportando un README válido; no afirmar que los últimos cambios están guardados.

Los otros siete módulos se conservan en el documento aunque no tengan formularios. Si un borrador válido contiene alguno visible, el generador devuelve `unsupported_module` y bloquea la exportación sin eliminar su contenido. La lectura válida del documento no garantiza que sea exportable. Ver [editor](editor.md) para las reglas de texto y enlaces.

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
