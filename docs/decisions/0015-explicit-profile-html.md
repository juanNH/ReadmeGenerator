# ADR 0015: HTML explícito y filtrado para perfiles

- Estado: aceptada.
- Fecha: 2026-10-19.
- Amplía [ADR 0013](0013-custom-sections.md) y [ADR 0014](0014-custom-visual-blocks.md). Sustituye la prohibición general de HTML únicamente para un bloque personalizado `html`; mantiene texto escapado en los demás campos, las excepciones cerradas de iconos y tarjetas, el documento v2 y su recuperación conservadora.

## Contexto

Un README de perfil puede combinar Markdown con encabezados centrados, imágenes enlazadas, tablas y desplegables. Los bloques estructurados cubren la composición habitual; una entrada explícita de HTML permite agregar esas disposiciones sin exigir más información de trayectoria ni modificar los formularios fijos.

GitHub convierte el marcado y después aplica sanitización y otros filtros. Su repositorio `markup` no implementa toda esa secuencia. La especificación GFM tampoco es una lista de HTML seguro. El código público de HTML Pipeline ofrece una referencia de etiquetas y atributos, pero no permite prometer una réplica de la configuración de producción de GitHub. Ver [GitHub Markup](https://github.com/github/markup), [especificación GFM](https://github.github.com/gfm/) y [sanitización de HTML Pipeline](https://github.com/gjtorikian/html-pipeline/blob/main/lib/html_pipeline/sanitization_filter.rb).

Los datos locales deben conservar el código escrito, incluso cuando no pueda exportarse. El HTML filtrado y la vista previa son resultados derivados de ese contenido. No se necesita un servicio externo, ejecutar código de la persona ni descargar recursos desde el servidor para producirlos.

## Decisión

### Contrato y conservación de datos

Agregar a la unión estricta de bloques de `customSections`:

```ts
type CustomHtmlBlock = {
  id: string;
  type: "html";
  source: string;
};
```

`source` conserva exactamente la fuente original; el análisis no la recorta, normaliza o reemplaza. No se guardan árboles, avisos, errores, HTML filtrado o metadatos de vista previa. Se mantienen `schemaVersion: 2`, las claves de almacenamiento, la migración v1 y la forma de todos los bloques anteriores, sin introducir campos por defecto.

Las operaciones existentes conservan el orden y las identidades opacas. Duplicar copia la fuente con un ID nuevo y sin compartir objetos modificables; ocultar conserva todo el bloque y excluirlo evita revisar su salida. Eliminar quita únicamente el contenido elegido. Un lector anterior estricto puede rechazar esta variante de v2: debe conservar el valor incompatible, sin sobrescribirlo o recurrir a v1 automáticamente.

### Análisis puro y política de HTML

`analyzeProfileHtml` parsea un fragmento HAST con `hast-util-from-html` 2.0.3, aplica reglas propias y un esquema explícito de `hast-util-sanitize` 5.0.2, y serializa mediante `hast-util-to-html` 9.0.5. Estas bibliotecas trabajan sobre árboles en Node.js y navegador, sin requerir un DOM para el contrato del núcleo. El parser y el serializer no sustituyen la sanitización. Ver [parseo](https://github.com/syntax-tree/hast-util-from-html), [sanitización](https://github.com/syntax-tree/hast-util-sanitize) y [serialización](https://github.com/syntax-tree/hast-util-to-html).

La política admite un subconjunto para perfiles:

- `h1`–`h6`, `p`, `div`, `span`, `br` y `hr`.
- `strong`, `b`, `em`, `i`, `del`, `s`, `kbd`, `sub`, `sup`, `blockquote`, `pre` y `code`.
- `a`, `img`, `ul`, `ol` y `li`.
- `table`, `thead`, `tbody`, `tfoot`, `tr`, `th`, `td` y `caption`.
- `details` y `summary`.

Los atributos se permiten por elemento. `align` acepta izquierda, centro o derecha donde corresponda. Las imágenes admiten dimensiones entre 1 y 2.000 píxeles y `width` de 1 a 100 %. Los spans de celdas, el inicio de listas, los títulos y el estado `open` tienen reglas acotadas. Un enlace necesita nombre accesible; se admite `aria-label` para identificarlo. Un desplegable requiere un único `summary`, primero y con nombre. Se comprueban relaciones estructurales concretas de listas y tablas, sin certificar accesibilidad completa.

Se retiran atributos no permitidos, eventos, CSS, clases, `id`, `name`, comentarios y declaraciones. Elementos activos o ajenos al formato, como `script`, `style`, formularios, `iframe`, embeds, SVG y MathML inline, se eliminan con su contenido. No se admiten páginas HTML completas, `picture`, `srcset`, JavaScript, React o MDX. Los cambios por filtrado o reparación producen avisos y no se aplican a la fuente guardada.

### Enlaces e imágenes

Los enlaces HTML usan HTTP/HTTPS absoluto bajo la política web compartida. `mailto:` permanece reservado al formulario de contacto. Las imágenes usan `normalizePublicImageUrl`: HTTPS con dominio de sintaxis pública, sin IP, hosts locales o privados conocidos, credenciales, fragmentos ni puertos no estándar. Esta comprobación no consulta DNS, comprueba formato real o garantiza disponibilidad. Se admiten queries y direcciones sin extensión. Los recursos se alojan por separado.

Cada `img` requiere el atributo `alt`. Un valor explícito `alt=""` indica una imagen decorativa; un atributo ausente produce un error. Esta excepción no cambia la obligación de descripción no vacía del bloque estructurado `image`. Un SVG externo dentro de `img` se trata como una imagen y no habilita SVG inline.

La comprobación propia se realiza sobre las URLs ya decodificadas del AST. La configuración de protocolos del sanitizer admite relativos y no basta para aplicar la política de la aplicación. Rutas relativas, direcciones locales y `#anclas` requieren adaptación explícita; no se resuelven contra el origen del editor. GitHub sí puede resolver rutas según repositorio, archivo y rama, contexto que este bloque no recibe. Ver [enlaces e imágenes de GitHub](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax).

### Límites y errores de exportación

El análisis limita cada fuente a 30.000 unidades UTF-16, 1.500 nodos y profundidad 32. El generador comprueba además un máximo agregado de 150.000 unidades de fuente HTML de secciones visibles antes de analizarlas todas. Los datos ocultos no consumen ese presupuesto. Estos límites protegen el trabajo de análisis; no truncarán un borrador recuperado.

Una fuente vacía se omite. Una fuente no vacía con problemas de tamaño, complejidad, URL, atributo alternativo, estructura o que quede sin contenido útil produce `invalid_html` en `customSections/{índice}/blocks/{índice}/source`. Ese error bloquea toda la generación, sin archivo parcial. Los avisos por filtrado o reparación no impiden exportar por sí mismos. La UI explica problemas y avisos a partir del mismo analizador.

### Un Markdown y metadatos derivados

El generador emite cada bloque como una unidad de HTML canónico cerrada dentro de un `div`, en el mismo Markdown usado para vista previa, copia y descarga. Conserva sus h1–h6 y no interpreta Markdown dentro de `source`. Los saltos LF/CR se serializan como entidades `&#10;`/`&#13;`: mantienen el contenido y evitan que líneas vacías terminen el bloque HTML y reactiven Markdown. La fuente original no cambia y el árbol conserva los caracteres reales, también dentro de código. No hay una representación alternativa del README.

La serialización compensa sobre una copia del árbol la regla HTML que omite el primer salto de línea de `pre`. Si el árbol saneado comienza ese elemento con LF, se agrega un LF de compensación antes de serializar. Volver a interpretar la salida conserva así el contenido de la vista previa, sin modificar la fuente ni el árbol derivado. La compensación no se aplica cuando el primer hijo de `pre` es un elemento como `code`.

Un resultado correcto puede contener `customHtml: readonly CustomHtmlFragment[]`, con elementos `{ html, tree, start, end, headingLevel: 3 | 4 }`. `tree` es el árbol HAST permitido equivalente en estructura y contenido al HTML; `toHtml(tree)` puede diferir byte a byte por las entidades de saltos. Se reutiliza en la vista previa sin volver a parsear la cadena serializada, cuyo tamaño puede crecer respecto del límite de fuente. Los rangos `[start, end)` son desplazamientos UTF-16 en el Markdown final y deben coincidir exactamente con `html`. Conservan orden y repeticiones; solo se incluyen cuando existen fragmentos exportables. El nivel de vista previa vale `4` con título de sección o `3` sin él. No se persisten ni se devuelven en errores.

`remarkCustomHtml` verifica el contenido y los límites de cada rango para reconocer únicamente unidades completas. El renderer crea elementos React desde el árbol permitido, sin `dangerouslySetInnerHTML`, `rehypeRaw` o interpretación global de HTML. `skipHtml` sigue descartando HTML fuera de esas unidades y las excepciones previas de iconos conservan sus reglas exactas.

La vista previa adapta el nivel semántico de los encabezados a su contexto, permite desplazar tablas horizontalmente y conserva el control nativo de los desplegables. Esta adaptación no reescribe el HTML exportado. Las imágenes del bloque se autorizan dentro de `customHtml`; no amplían `customImages`, reservado a los bloques `image`.

Las imágenes se cargan directamente en el navegador con `loading="lazy"`, `decoding="async"` y `referrerPolicy="no-referrer"`, sin proxy ni optimizador del servidor. Un fallo de carga es estado efímero de presentación y no modifica la fuente ni invalida una URL admitida. El navegador sí contacta al host del recurso al mostrarlo.

### Edición y alcance

El selector de contenido ofrece nueve opciones con muestras locales decorativas. El bloque HTML comienza vacío, enfoca su campo de código y no recibe las conversiones automáticas de listas. La guía, el contador, los problemas, los avisos y el HTML exportado inspeccionable tienen textos en inglés y español.

Tres ejemplos de encabezado centrado, tabla y desplegable se insertan únicamente por una acción explícita. Si sustituyen código no vacío, se pide confirmación. Las ayudas no publican recursos, ejecutan HTML o convierten el editor completo en un documento libre. GitHub documenta `details` y `summary`, pero la mezcla de HTML con Markdown requiere reglas de parseo distintas: este bloque interpreta solo HTML. Ver [secciones plegables de GitHub](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/organizing-information-with-collapsed-sections).

La entrega no incorpora un importador de README, asistencia con IA, cuentas, carga de archivos o nuevos servicios. La vista previa es aproximada y no promete paridad con los filtros, el tema o los estilos de GitHub.

## Alternativas consideradas

| Alternativa                                                         | Ventaja                                           | Motivo de la decisión                                                                                                                    |
| ------------------------------------------------------------------- | ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Interpretar HTML en todos los campos                                | Permite escribir etiquetas en cualquier lugar.    | Cambia el contrato de texto de formularios existentes y oculta dónde se permite formato. El bloque explícito limita esa entrada.         |
| Conservar únicamente el HTML filtrado                               | Reduce los datos almacenados.                     | Pierde el código original y dificulta corregir filtrados o errores; se conserva la fuente y se deriva la salida.                         |
| Usar una lista de protocolos del sanitizer sin validación adicional | Simplifica la configuración.                      | Admite relativos y no expresa la política de dominio público de imágenes. Se aplican los normalizadores compartidos.                     |
| Insertar el HTML como una cadena en el DOM                          | Requiere menos renderizado propio.                | Abre una frontera distinta a la lista de elementos y metadatos verificables; se recorre el AST con React.                                |
| Habilitar HTML global en ReactMarkdown                              | Resuelve mezclas arbitrarias de HTML y Markdown.  | Amplía el alcance de todos los campos y pierde la distinción entre unidades explícitas y texto. Se verifican rangos del mismo Markdown.  |
| Cambiar a v3                                                        | Distingue el nuevo formato por número de versión. | La ampliación acordada agrega una variante sin modificar documentos anteriores; se documenta el rechazo por lectores antiguos estrictos. |

## Consecuencias

- El perfil admite composiciones HTML concretas y conserva un recorrido breve con bloques estructurados.
- La fuente escrita sobrevive al filtrado, los errores, las copias, la ocultación, el cambio de idioma y la recuperación.
- El parser estructural no demuestra que una fuente sea exportable; el generador conserva esa responsabilidad.
- La política y sus límites se comparten entre formulario, exportación y vista previa, sin solicitudes de red del núcleo.
- Los rangos exactos requieren conservar los desplazamientos al componer el Markdown, incluido Unicode y contenido repetido.
- El formato visual final depende de GitHub y los recursos externos; el editor no ofrece alojamiento ni una réplica de su renderer.
- Los lectores antiguos estrictos deben preservar el documento incompatible, aunque reconozcan el número de versión.

Ver [editor](../editor.md), [modelo del perfil](../profile-model.md) y [arquitectura](../architecture.md).
