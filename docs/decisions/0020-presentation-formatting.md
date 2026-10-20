# ADR 0020: Formato visual opcional para la presentación

- Estado: aceptada.
- Fecha: 2026-10-20.
- Complementa [ADR 0019](0019-code-and-formatting.md), [ADR 0015](0015-explicit-profile-html.md) y [ADR 0011](0011-country-and-contact-inputs.md).

## Contexto

El nombre, la frase y la introducción forman la primera impresión de un perfil. Limitar los controles visuales a las secciones personalizadas obliga a duplicar la presentación para centrarla o elegir su jerarquía. El recorrido debe seguir siendo breve, sin sumar campos de trayectoria ni convertir texto ordinario en HTML escrito.

## Decisión

Agregar únicamente en `ProfileDocument` v2 un objeto opcional `data.presentation.format`, estricto y con estas propiedades opcionales:

- `displayNameLevel?: 1 | 2 | 3` y `displayNameAlignment?: "left" | "center" | "right"`.
- `headlineLevel?: 1 | 2 | 3` y `headlineAlignment?: "left" | "center" | "right"`.
- `bioAlignment?: "left" | "center" | "right"`.
- `locationAlignment?: "left" | "center" | "right"`.

No cambiar `schemaVersion`, claves de almacenamiento ni los cuatro strings de contenido existentes. No agregar `format` ni valores por defecto al crear, recuperar o migrar. Separar el conjunto de esquemas de contenido v1 del actual para que el formato v1 permanezca cerrado: incluso un `format: {}` en v1 se rechaza. Un lector v2 anterior estricto puede rechazar estas propiedades y debe conservar el borrador original protegido.

La ausencia de formato conserva exactamente la salida previa: nombre con `#`, frase con `##`, bio de párrafos escapados y ubicación con su etiqueta y bandera de catálogo cuando corresponda. Elegir izquierda mantiene Markdown; elegir nivel cambia únicamente el encabezado correspondiente. Campos vacíos siguen sin generar contenido.

Centro y derecha generan HAST con texto literal normalizado y propiedades controladas, se serializan y validan con `analyzeProfileHtml`. La ubicación incluye únicamente el icono fijo del país elegido, nunca una URL del texto personal. La vista previa conserva su copia local y dimensiones decorativas. No se interpreta Markdown ni HTML dentro del nombre, frase, bio o ubicación.

Extraer la construcción de texto alineado y el análisis de fragmentos a un helper puro compartido con las secciones personalizadas. Toda unidad usa la política vigente, el mismo presupuesto de 150.000 unidades UTF-16 de HTML visible por documento y los límites de 30.000 por fuente, 1.500 nodos y profundidad 32. Un exceso produce `invalid_html` en `data/presentation/displayName`, `headline`, `bio` o `location`, sin truncar texto. Una presentación oculta no se analiza ni consume presupuesto.

Los fragmentos derivados se publican en `customHtml`, con sus árboles permitidos y rangos UTF-16 exactos en el mismo Markdown usado por vista previa, copia y descarga. El nombre histórico del metadato no limita su uso a instancias personalizadas. No se persisten árboles ni se introduce una segunda salida, `rehypeRaw` o `dangerouslySetInnerHTML`.

La UI agrupa tamaño y alineación en un bloque opcional de formato, con etiquetas por campo y vista previa inmediata. Restablecer formato quita solo `format` y conserva los cuatro textos. Los errores de exportación se asocian al campo de contenido y abren los detalles que los contienen.

## Alternativas

- Crear una copia personalizada de la presentación: duplica contenido y rompe la claridad del recorrido.
- Permitir HTML o Markdown libre en los campos actuales: modifica su interpretación y la seguridad de borradores anteriores.
- Agregar un editor enriquecido general: requiere otro contrato para una necesidad cubierta por seis elecciones opcionales.
- Extender el esquema compartido v1 sin separarlo: haría que el formato heredado aceptara silenciosamente propiedades posteriores.

## Consecuencias

La presentación puede personalizarse sin escribir etiquetas ni agregar otra sección. La configuración no reescribe borradores recuperados ni modifica el país elegido. La alineación y jerarquía exportadas siguen sujetas al renderizador de GitHub; no se promete paridad de estilos con la vista previa. No se agregan fuentes, colores, CSS, banners ni servicios externos.
