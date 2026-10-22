# ADR 0035: Tecnologías compactas con etiquetas de catálogo

- Estado: aceptada.
- Fecha: 2026-10-20.

## Contexto

Los encabezados de cada categoría y las filas separadas de herramientas ocupaban una parte extensa del README. La referencia visual solicitada usa etiquetas cortas que se ajustan al ancho. El formato de GitHub no admite CSS libre y un servicio de badges externo agregaría una dependencia de red y disponibilidad.

## Decisión

Agregar `data.technologies.layout?: "compact" | "grouped"` exclusivamente a v2. Su ausencia mantiene exactamente la salida previa con encabezados de categorías. El parser y la migración de v1 no agregan valores por defecto; v1 mantiene su esquema cerrado e independiente. La fábrica de un perfil nuevo v2 selecciona `compact` explícitamente. Abrir un JSON o recuperar un borrador conserva su opción o su ausencia.

El selector «Diseño en el README» ofrece etiquetas compactas y títulos por categoría. Cambiarlo afecta el mismo Markdown de vista previa, copia y descarga. No reagrupa, renombra ni elimina categorías, ítems, identidades o notas. Todas las ediciones del formulario y operaciones de organización conservan la opción elegida.

El modo compacto presenta el nombre de categoría en negrita en la misma fila que las herramientas, con ajuste al ancho. Cada nombre se envuelve en `kbd` y lleva el icono decorativo de 20 × 20 ya fijado en el catálogo cuando existe. Los nombres propios siguen siendo texto sin una marca inferida. Las notas conservan su orden y párrafos; no se ocultan para reducir la altura. Los grupos sin contenido útil se omiten.

El HTML se construye con nodos de texto HAST, se filtra con `renderProfileHtml` y comparte sus límites y presupuesto con el resto del documento. Los rangos UTF-16 exactos y árboles permitidos se entregan en `customHtml`, sin ampliar `customImages`, habilitar HTML global ni persistir metadatos. Los errores `invalid_html` señalan el grupo afectado; la UI ofrece corregirlo o volver a títulos por categoría. Las tecnologías ocultas no consumen presupuesto.

La vista previa reconoce exclusivamente las URLs exactas del catálogo, alternativa vacía y dimensiones 20 × 20 para usar los SVG locales. Conserva el resto de la política de imágenes y HTML. No solicita badges a terceros, crea un endpoint ni requiere `APP_URL`. Los colores provienen de los iconos existentes. El fondo y aspecto de `kbd` dependen del tema y estilos de GitHub; no se promete reproducir fondos sólidos ni píxeles de la referencia.

## Alternativas consideradas

- Cambiar todos los borradores a compacto durante la recuperación: alteraría una elección guardada implícita. Se conserva la salida previa cuando falta el campo.
- Eliminar categorías o notas de la salida: reduce espacio a costa del contenido de la persona. Se mantienen en el orden original.
- Shields u otro servicio externo: agrega otro host, formato de recursos y dependencia de disponibilidad. Se reutilizan recursos ya atribuidos.
- SVG con fondo propio: necesita publicar un archivo o endpoint público por badge. La composición con etiquetas evita introducir ese alojamiento.
- CSS y SVG inline en el README: GitHub puede filtrarlos y ampliarían la frontera de HTML. Se mantiene el esquema vigente.

## Consecuencias

Los perfiles nuevos empiezan con una presentación más corta y los existentes pueden elegirla explícitamente. El JSON conserva la opción y toda la estructura original. Un lector v2 anterior estricto puede rechazar `layout` y debe conservar el documento sin sobrescribirlo. Una categoría excepcionalmente grande puede exceder los límites HTML; la alternativa de títulos mantiene el contenido en Markdown. La vista previa local es aproximada y los lectores de GitHub reciben texto visible junto a iconos decorativos.

Ver [modelo](../profile-model.md), [editor](../editor.md), [ADR 0012](0012-technology-categories.md), [ADR 0015](0015-explicit-profile-html.md) y [ADR 0021](0021-project-files-and-recovery.md).
