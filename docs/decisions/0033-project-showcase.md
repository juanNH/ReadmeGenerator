# ADR 0033: Títulos enlazados y portada opcional de proyectos

- Estado: aceptada.
- Fecha: 2026-10-20.
- Evolución: ADR 0037 actualiza la composición del formulario y el orden de salida; el título enlazado y el contrato de portada siguen vigentes.

## Contexto

La lista de proyectos repetía el nombre y su enlace, y separaba participación y tecnologías en párrafos extensos. Una imagen opcional permite mostrar una app sin pedir un repositorio ni convertir la sección en un CV. La salida debe funcionar como README de GitHub y conservar la política vigente de imágenes y HTML.

## Decisión

Cada proyecto con nombre genera un encabezado de nivel tres. El primer enlace útil y válido se utiliza como destino del título y se omite de los enlaces adicionales de salida. La etiqueta original se conserva en el documento. Sin nombre, todos los enlaces se muestran con sus etiquetas. El formulario identifica el enlace principal y permite elegir otro reordenando la colección; no agrega una selección persistida paralela. Se validan todos los enlaces y se conservan los errores con sus índices originales.

Se agrega `cover?: { url: string; alt: string }` a las entradas de proyectos v2. Es opcional y no se inserta al recuperar documentos anteriores. El esquema de proyectos v1 sigue cerrado e independiente. Una portada vacía se omite; una URL elegida requiere descripción alternativa no vacía. Se reutiliza la normalización de imágenes HTTPS públicas, sin subir archivos, resolver DNS, obtener metadatos, verificar disponibilidad ni incorporar dependencias.

La portada deriva una unidad HTML con un `img` de ancho 480, construida mediante HAST y validada con la política y presupuesto compartido de `renderProfileHtml`. Solo esa unidad se autoriza con rangos UTF-16 exactos en `customHtml`. `customImages` sigue reservado a los bloques personalizados `image`. La vista previa recorre el árbol permitido existente y usa `PublicProfileImage` con carga diferida, decodificación asíncrona y sin referrer. No hay HTML arbitrario, proxy ni una salida alternativa de README. La fuente original de URL y alternativa se conserva en JSON; normalizar afecta únicamente la salida. Los proyectos ocultos no consumen presupuesto ni generan errores de exportación.

Descripción, participación, tecnologías y enlaces adicionales siguen siendo opcionales; participación y tecnologías comparten un párrafo compacto. El editor ofrece una composición con título, mini portada y texto, pero la apariencia final depende de GitHub. No se promete una tarjeta con CSS, bordes o diseño idéntico al editor.

## Alternativas consideradas

- Agregar un destino principal persistido: introduce otra referencia que puede quedar obsoleta al eliminar enlaces. Reordenarlos conserva el contrato previo y hace visible la elección.
- Reutilizar `customImages` para la portada: ampliaría su significado y autorizaría imágenes sin los límites y rangos de la unidad derivada. Se reutiliza el recorrido HTML ya validado.
- Obtener capturas u OpenGraph de forma automática: requiere red, extracción de sitios y otra frontera de privacidad; se usa una imagen pública explícita.
- Crear una grilla con tablas y estilos: complica móvil y depende de estilos que GitHub filtra. Se mantiene un orden de lectura lineal con imagen acotada.

## Consecuencias

El archivo JSON conserva la portada completa, incluso incompleta o inválida para publicar. Los lectores v2 antiguos estrictos pueden rechazar este campo y deben conservar el archivo original. El Markdown exportado omite etiquetas del enlace principal aunque permanecen editables en el proyecto. Un fallo de carga de imagen es efímero y no invalida una URL admitida.

Ver [modelo del perfil](../profile-model.md), [editor](../editor.md), [ADR 0014](0014-custom-visual-blocks.md), [ADR 0015](0015-explicit-profile-html.md) y [ADR 0021](0021-project-files-and-recovery.md).
