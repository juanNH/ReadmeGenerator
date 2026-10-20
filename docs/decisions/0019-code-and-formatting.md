# ADR 0019: Código literal y formato visual acotado en secciones propias

- Estado: aceptada.
- Fecha: 2026-10-20.
- Complementa [ADR 0013](0013-custom-sections.md), [ADR 0015](0015-explicit-profile-html.md) y [ADR 0018](0018-readme-import-with-backup.md).

## Contexto

Una sección personal puede describirse mediante un fragmento TOML o de otro lenguaje. Ese fragmento debe aparecer como código, conservar su escritura y resultar editable sin recurrir a HTML. También se necesitan niveles de título y alineación para texto personal, conservando los documentos existentes y la política de salida de GitHub. Un editor con coloreado facilita escribir HTML, pero no amplía las etiquetas, atributos ni recursos permitidos.

## Decisión

Ampliar aditivamente `ProfileDocument` v2, sin modificar la versión, las claves de almacenamiento ni las estructuras heredadas. El parser permanece estricto y no agrega valores por defecto:

- `code` contiene exactamente `{ id, type: "code", source, language }`, con ambos textos obligatorios. `language: ""` representa texto sin lenguaje declarado. `source` se conserva sin recortar, normalizar saltos ni interpretar HTML, Markdown o instrucciones.
- `paragraph` admite `alignment?: "left" | "center" | "right"`.
- `heading` admite `level?: 1 | 2 | 3` y `alignment` con esos mismos valores.
- Una sección propia admite `titleLevel?: 1 | 2 | 3` y `titleAlignment` con esos mismos valores.

Las opciones ausentes conservan la salida previa: título de sección con `##`; subtítulo con `###` cuando hay título y `##` cuando no lo hay; párrafos de texto escapado. La izquierda explícita también usa Markdown. No se alinean automáticamente listas, imágenes ni código. Duplicar copia la fuente y todas las opciones, cambiando solo los identificadores correspondientes. Un lector antiguo estricto puede rechazar las ampliaciones y debe conservar el valor original protegido.

### Código y lenguajes

El catálogo puro de `src/core/code/` ofrece elecciones locales y alias, sin red. Se normalizan mayúsculas, espacios exteriores y alias conocidos. Un identificador desconocido de hasta 64 unidades UTF-16 se admite si es un token alfanumérico con `_`, `+`, `.` o `-`; no se interpreta como atributo ni como contenido ejecutable. Los alias cerrados pueden convertirse a un token canónico seguro. Un lenguaje inválido bloquea la exportación con `invalid_code` en `language`.

Cada bloque admite hasta 30.000 unidades UTF-16 de fuente y el documento hasta 150.000 unidades de código visible. Los límites son de exportación: una fuente más larga sigue conservándose en el borrador y produce `invalid_code` en `source`. Una sección oculta no participa. Una fuente exactamente vacía se omite; espacios y saltos deliberados sí son código. La longitud del delimitador de backticks supera toda racha existente en la fuente, de modo que el texto pegado no cierre el bloque ni active HTML. Se añade un salto delimitador después de la fuente sin modificarla. El renderizador Markdown puede normalizar saltos según CommonMark; el borrador y la fuente exportada conservan los caracteres escritos.

La importación reconoce nodos de código delimitado e indentado como bloques `code`, conserva el contenido del AST y normaliza su lenguaje. Los saltos de línea pueden quedar normalizados por el parser; el respaldo guarda el Markdown original exacto. Los metadatos no representables se notifican. Un token de lenguaje inválido se convierte a texto sin lenguaje con aviso. Los fragmentos de código independientes de un HTML cerrado permanecen editables; si pertenecen a un contexto HTML abierto o a una estructura anidada que exige conservar HTML unido, prevalece la integridad de esa estructura y se avisa si pierde metadatos de lenguaje. No convertir automáticamente `pre/code` de un bloque HTML existente.

### Formato derivado

Los niveles sin alineación especial generan Markdown. Centro y derecha construyen elementos HAST con textos normalizados como valores literales, se serializan con escape contextual y pasan por `analyzeProfileHtml`. Nunca se interpreta el texto personal como HTML. Los párrafos separados conservan unidades `p` alineadas. No se generan CSS, clases, scripts ni atributos libres.

El HTML derivado consume los límites vigentes de HTML: 30.000 unidades de fuente por fragmento, 1.500 nodos, profundidad 32 y 150.000 unidades agregadas visibles, compartidas con los bloques HTML explícitos. Los errores señalan `title` o `text` y bloquean la salida. El presupuesto de HTML explícito se revisa antes de analizarlo y cada fragmento derivado se suma antes de su análisis. El código tiene un presupuesto separado porque no se interpreta como HTML.

La salida utiliza el contrato existente `customHtml`: unidades completas y cerradas, árbol permitido y rangos UTF-16 exactos sobre el Markdown final. Incluye el título alineado como una unidad propia y conserva la adaptación semántica de encabezados solo en la vista previa. No agregar `dangerouslySetInnerHTML`, `rehypeRaw`, un parser global ni una segunda versión del README. Los metadatos son derivados y no se guardan.

### Edición de fuente

La fuente HTML y de código puede presentarse con resaltado, números de línea y ayuda de sangría dentro de una frontera cliente acotada. Debe conservar una alternativa de texto, etiquetas, foco y salida por teclado, selección y escritura exacta. Colorear no implica validar la exportación. La carga del editor es local, no incorpora ejecución de código, cuentas ni servicios remotos. Las decisiones concretas de dependencias y carga se documentan junto a la implementación.

## Alternativas

- Reutilizar HTML `pre/code`: preserva contenido visual, pero pierde lenguaje al filtrar clases y exige escribir etiquetas para un fragmento común.
- Guardar Markdown libre o reinterpretar todos los párrafos: vuelve ambiguos los campos existentes y amplía la superficie de interpretación.
- Editor enriquecido universal: requiere otro contrato y más reglas de compatibilidad para necesidades que ya resuelven bloques pequeños.
- Guardar siempre formato por defecto o migrar a v3: reescribe documentos sin una necesidad contractual y dificulta distinguir una elección explícita.

## Consecuencias

Código, HTML y texto ordinario mantienen contratos separados. Los documentos previos conservan su salida; las elecciones nuevas siguen siendo editables y se duplican de forma independiente. La apariencia de sintaxis y la alineación final dependen del renderizador de GitHub; no se promete un tema de colores ni paridad exacta con la vista previa. No se incorpora ejecución de código ni formato inline enriquecido.

## Fuentes

- [GitHub: bloques de código y resaltado](https://docs.github.com/en/get-started/writing-on-github/working-with-advanced-formatting/creating-and-highlighting-code-blocks).
- [GFM: delimitadores, encabezados y HTML](https://github.github.io/gfm/).
- [GitHub Markup: procesamiento y sanitización](https://github.com/github/markup).
