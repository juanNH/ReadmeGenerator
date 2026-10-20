# Licencia, procedencia y distribución

## Código propio y contribuciones

El código propio de GitHub Profile Generator está disponible bajo [MIT](../LICENSE), con `Copyright (c) 2026 Juan Nicolas Herrera`, tal como fue autorizado por su titular. Permite usar, modificar y distribuir el código, incluso comercialmente, conservando el aviso de copyright y el permiso en las copias o porciones sustanciales. Los derivados pueden tener otra licencia para su código propio y mantenerse privados. MIT no exige publicar modificaciones ni concede exclusividad sobre los aportes originales; sus condiciones completas son las del [texto de la licencia](https://opensource.org/license/mit).

Las contribuciones propias se ofrecen bajo MIT sin transferir su titularidad. El procedimiento está en [CONTRIBUTING.md](../CONTRIBUTING.md). No hay un CLA ni una cesión de derechos adicional.

MIT se aplica al código del proyecto que puede licenciar su titular. Los recursos y dependencias de terceros conservan sus licencias, avisos y condiciones. Un README generado no cambia la titularidad ni la licencia del texto, código, imágenes o marcas que incluya la persona usuaria. La presencia de un logotipo o nombre no implica afiliación ni autorización para presentarse como su titular.

## Materiales de terceros

[THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) registra las fuentes de los recursos copiados, sus revisiones fijadas y las modificaciones relevantes. Los avisos completos se conservan junto a los recursos o en `public/licenses/`, y pueden acompañar tanto al repositorio como a la aplicación publicada:

| Material                                                                            | Condiciones conservadas                                             | Aviso local                                                                            |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| GitHub Stats Extended: composiciones, temas y fórmula opcional de ranking adaptados | MIT                                                                 | [Aviso completo](../public/licenses/github-stats-extended.txt)                         |
| Geist y Geist Mono, paquetes Fontsource Variable `5.3.0`                            | OFL-1.1                                                             | [Geist](../public/licenses/geist.txt), [Geist Mono](../public/licenses/geist-mono.txt) |
| Lucide React `1.59.0`, incluidas las atribuciones de Feather                        | ISC y MIT para los iconos derivados indicados por el proyecto       | [Aviso completo](../public/licenses/lucide.txt)                                        |
| Banderas e iconos de tecnologías y contacto                                         | MIT y CC0 según la colección                                        | [Fuentes y avisos](../THIRD_PARTY_NOTICES.md)                                          |
| Dependencias instaladas, incluidas herramientas de desarrollo                       | Las declaradas por cada paquete, conservando sus textos disponibles | [Inventario de avisos](../public/licenses/dependencies.txt)                            |

Las fuentes Geist se redistribuyen sin modificar bajo OFL-1.1. Esa licencia permite incorporarlas a la aplicación y exige conservar sus avisos; las fuentes y sus derivados conservan OFL, sin imponerla al documento creado con ellas. Para modificaciones o redistribución separada, revisar el [texto oficial de OFL](https://openfontlicense.org/open-font-license-official-text/) y los avisos de cada fuente.

## Inventario reproducible de dependencias

Después de instalar el árbol fijado:

```sh
pnpm install --frozen-lockfile
pnpm licenses:generate
pnpm licenses:check
```

Los comandos usan [scripts/check-licenses.mjs](../scripts/check-licenses.mjs), sin agregar una herramienta de terceros. El inventario recorre las raíces de paquetes presentes en `node_modules` y el almacén virtual de pnpm, resuelve enlaces locales sin seguir bucles y agrupa por nombre y versión. Incluye dependencias transitivas, herramientas de desarrollo y paquetes opcionales presentes para la plataforma instalada. Lee la licencia declarada y procedencia desde cada `package.json`, conserva completos los archivos de licencia y avisos encontrados dentro de cada paquete y registra los casos que necesitan revisión. Si un paquete no incorpora un archivo de licencia, conserva su README disponible y señala expresamente esa ausencia; no inventa un aviso ni interpreta que todo sea MIT.

- `licenses:generate` escribe `public/licenses/dependencies.txt`, apto para acompañar la distribución, sin fechas variables ni rutas absolutas de la máquina.
- `licenses:check` verifica los avisos requeridos y que el inventario público coincida con el árbol instalado; no modifica el archivo público.
- Ambos dejan un informe local en `work/oss/dependency-licenses.json`, ignorado por Git, con nombre, versión, licencia, procedencia, archivos originales relativos, hashes, avisos, advertencias y problemas. También incluye el hash del lockfile y la plataforma. No lee archivos de entorno ni credenciales.
- La comprobación falla ante metadatos de licencia ausentes o no resueltos, dependencias necesarias no instaladas, avisos obligatorios ausentes, copias de las licencias de fuentes o Lucide distintas de las instaladas, conflictos de licencia entre variantes de un paquete o inventario desactualizado.

Las advertencias sobre paquetes que publican solo un identificador de licencia deben revisarse en la fuente de esa versión antes de redistribuirlos. Un identificador SPDX no reemplaza el texto o copyright exigidos. Algunos paquetes de un mismo monorepo comparten avisos ya incluidos por otro paquete; confirmar esa procedencia antes de considerar cubierta una ausencia.

El informe refleja los archivos efectivamente instalados, por lo que una instalación con paquetes sobrantes puede incluir más de lo necesario. Para preparar una entrega, partir de una instalación limpia con el lockfile y regenerar en el entorno de destino. Cambiar sistema operativo o arquitectura puede cambiar los paquetes opcionales y requiere regenerar el inventario y revisar el diff. Este procedimiento no verifica por sí solo la licencia ni el contenido del registro remoto, la compatibilidad jurídica entre todas las condiciones, la vigencia del mantenimiento o la composición exacta de un bundle.

## Preparar una distribución

La publicación del repositorio fuente y la distribución de un bundle, un contenedor o binarios son entregas distintas. Para una entrega concreta:

1. Conservar `LICENSE`, `THIRD_PARTY_NOTICES.md` y los avisos completos de cada recurso copiado. Mantener los encabezados o comentarios de atribución de las adaptaciones.
2. Instalar desde el lockfile, regenerar el inventario en la plataforma de destino y resolver los casos de licencia o procedencia desconocidos. Revisar qué paquetes llegan al navegador, servidor y herramientas del artefacto. El inventario completo es conservador: no demuestra que todos los paquetes listados estén incluidos en la salida.
3. Incluir los avisos necesarios en el artefacto distribuido. En Next.js, conservar `public/licenses/` y los archivos de licencia que acompañan a los iconos y banderas; al preparar una salida `standalone` o un contenedor, comprobar explícitamente que esos archivos se copian y son accesibles. Incluir también la licencia del proyecto y las fuentes o avisos adicionales que exija cada componente redistribuido.
4. Revisar componentes con condiciones adicionales. Por ejemplo, el árbol de Windows incluye `@img/sharp-win32-x64` con `Apache-2.0 AND LGPL-3.0-or-later`, además de licencias de bibliotecas internas; también hay paquetes MPL-2.0 y datos CC-BY-4.0. Conservar sus textos no sustituye las condiciones de acceso a fuentes, modificaciones, atribución o redistribución de binarios que puedan corresponder. Revisar el [proyecto de sharp](https://github.com/lovell/sharp), las [licencias de los binarios de sharp/libvips](https://github.com/lovell/sharp-libvips) y las [preguntas oficiales de MPL](https://www.mozilla.org/en-US/MPL/2.0/FAQ/) para el artefacto concreto.
5. Mantener credenciales, datos personales y archivos locales de entorno fuera de la entrega. Revisar las marcas y el contenido aportado de manera independiente de las licencias de código.

Todavía no se publica aquí un contenedor ni un paquete binario verificable. El inventario prepara los avisos y hace visibles las decisiones pendientes de cada distribución; no certifica cumplimiento de artefactos no producidos o de plataformas no instaladas.

## Actualizar recursos y mantenimiento

Antes de incorporar una biblioteca o integración, verificar en sus repositorios o documentación oficiales que siga mantenida y que no esté archivada o anunciada sin mantenimiento. Evaluar su licencia y la de recursos y dependencias relevantes. No asumir que un fork conserva el mismo mantenimiento o condiciones del proyecto original.

Para una adaptación local, registrar el repositorio, commit o versión y archivos de origen; conservar los textos originales y describir qué se modificó. Al actualizar, revisar las diferencias del origen y sus avisos, actualizar los enlaces fijados y regenerar el inventario. GitHub Stats Extended conserva su revisión fijada aunque la adaptación se ejecute con nuestro servidor. Las adaptaciones no reciben automáticamente cambios del origen ni implican respaldo de sus autores.
