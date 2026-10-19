# Desarrollo

Esta guía describe cómo ejecutar y revisar el scaffold inicial. La definición del producto y su alcance disponible están en [producto](product.md).

## Requisitos

- Node.js `24.21.0`, indicado en `.nvmrc`.
- pnpm `11.25.0`, indicado en `packageManager` de `package.json`.

El proyecto usa Next.js `16.4.2`, React `19.3.1`, TypeScript, Tailwind CSS 4 y `next-intl` para los idiomas. No se necesita una cuenta de GitHub, una clave de IA ni variables de entorno para revisar la base entregada.

Las dependencias directas y el lockfile fijan las versiones de la base. En una copia limpia, `pnpm install --frozen-lockfile` reproduce esa resolución. Hay una advertencia de peers de tres plugins transitivos con ESLint 10; la decisión y sus límites están registrados en [ADR 0002](decisions/0002-toolchain.md).

## Instalación y ejecución

Desde la raíz del repositorio:

```sh
pnpm install
pnpm dev
```

Abrí [http://localhost:3000/en](http://localhost:3000/en) para inglés o [http://localhost:3000/es](http://localhost:3000/es) para español. El kit visual está en [inglés](http://localhost:3000/en/design-system) y [español](http://localhost:3000/es/design-system). La ruta [http://localhost:3000](http://localhost:3000) redirige a inglés.

Para ejecutar la compilación de producción:

```sh
pnpm build
pnpm start
```

`pnpm start` requiere que `pnpm build` haya finalizado correctamente. El puerto esperado es `3000`.

## Comandos

| Comando             | Propósito                                                                     |
| ------------------- | ----------------------------------------------------------------------------- |
| `pnpm dev`          | Iniciar el servidor de desarrollo.                                            |
| `pnpm build`        | Crear la compilación de producción.                                           |
| `pnpm start`        | Servir la compilación de producción existente.                                |
| `pnpm lint`         | Revisar el código con las reglas del repositorio.                             |
| `pnpm typecheck`    | Comprobar los tipos sin emitir archivos.                                      |
| `pnpm format`       | Aplicar el formato definido por el proyecto.                                  |
| `pnpm format:check` | Comprobar el formato sin modificar archivos.                                  |
| `pnpm test`         | Comprobar los contratos de traducciones EN/ES con Vitest.                     |
| `pnpm test:watch`   | Ejecutar esas pruebas durante el desarrollo.                                  |
| `pnpm test:e2e`     | Revisar las rutas e interacciones iniciales en navegador.                     |
| `pnpm test:a11y`    | Ejecutar las comprobaciones automáticas de accesibilidad del alcance inicial. |
| `pnpm docs:check`   | Verificar enlaces locales de los archivos Markdown del repositorio.           |
| `pnpm check`        | Ejecutar lint, tipos, formato, enlaces de documentación y pruebas unitarias.  |

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
- Selector de idioma funcional, rutas localizadas y mensajes separados para inglés y español.
- Componentes compartidos y configuración inicial de calidad y pruebas.

Las pruebas actuales cubren la base entregada y el kit. No validan un editor, un generador ni una integración con GitHub, porque esas funciones todavía no existen. Sus criterios de prueba se definirán con cada incremento.

Vitest comprueba paridad de claves y parámetros, y mensajes no vacíos en ambos idiomas. Playwright comprueba navegación, idioma, tema persistente, controles de teclado, asociación de errores, tamaño móvil y página 404. Las comprobaciones axe de la suite abarcan las dos rutas y los dos idiomas, además del kit en oscuro.

Para comprobar una instancia ya iniciada se puede definir `PLAYWRIGHT_BASE_URL`; de lo contrario Playwright inicia desarrollo. En CI se compila primero y Playwright inicia `pnpm start` para revisar producción. No ejecutar `pnpm dev` y `pnpm build` simultáneamente al validar la misma entrega.

El cambio de idioma conserva la ruta, los parámetros y el ancla. El futuro contenido escrito por una persona se guardará separado del idioma de navegación. Los metadatos de esta vista inicial usan `noindex`; revisar ese ajuste antes de publicar el producto definitivo.

Las fuentes Geist se obtienen de los paquetes instalados y se sirven con `next/font/local`, sin descargar fuentes durante el build. En Windows, un sandbox puede impedir cargar o materializar bindings nativos de SWC; ante ese error, ejecutar los controles desde una terminal autorizada del repositorio. No desactivar validaciones ni modificar permisos del sistema como solución.

## Revisión visual y accesibilidad

Para cambios en interfaz, revisá la entrada y el kit en ambos idiomas, en escritorio y en una pantalla angosta. Comprobá el selector de idioma, la redirección de `/`, la navegación por teclado, el foco visible, las etiquetas de controles y los estados deshabilitados o de error que formen parte del cambio.

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

La configuración de GitHub Actions está preparada, pero no se ha ejecutado en GitHub desde esta entrega local. La advertencia de compatibilidad de los plugins de ESLint queda documentada en [ADR 0002](decisions/0002-toolchain.md).
