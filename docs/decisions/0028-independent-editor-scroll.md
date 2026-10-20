# ADR 0028: Desplazamiento independiente en las dos columnas del editor

- Estado: aceptada para la implementación.
- Fecha: 2026-10-20.
- Producto: GitHub Profile Generator.

## Contexto

Las secciones repetibles y sus opciones pueden hacer muy larga la configuración o el README. Se pidió recorrer ambos lados del editor por separado y adaptar las barras al estilo visual del sitio, manteniendo teclado y uso en teléfono.

## Decisión

Cuando la consulta de contenedor habilita las dos columnas y hay suficiente altura visible, la configuración y la vista previa usan scrollports nativos independientes dentro del área disponible bajo la barra del editor. `useEditorScroll` mide esa área, observa cambios de tamaño y agrupa mediciones en animation frames. El foco profundo y `scrollIntoView` continúan desplazando sus ancestros nativos; no se interceptan rueda, gestos ni teclas.

En teléfono, contenedor estrecho, texto ampliado o altura insuficiente se mantiene el flujo vertical natural de la página. La navegación de secciones conserva su propia fila horizontal, selección, orden y desplazamiento interno.

En escritorio, cambiar de sección o volver a pulsar la activa revela la cabecera completa de su panel, incluido el idioma, sin quitar el foco de navegación. Las acciones que enfocan la configuración también conservan esa cabecera; revisar un error sigue revelando el campo afectado. Ctrl+Inicio actúa sobre la columna enfocada según el comportamiento nativo.

Las barras del editor y su navegación usan colores semánticos, thumb redondeado y pista integrada. Se conserva el control nativo y se restablece su representación en colores forzados. Los paneles tienen nombre accesible y pueden recibir foco para desplazamiento por teclado. El cambio no introduce una biblioteca ni reproduce una scrollbar mediante JavaScript.

## Alternativas consideradas

- Dos columnas siempre limitadas en altura: dificulta la edición en pantallas bajas o con texto ampliado.
- Una única página larga en escritorio: pierde el contexto de la otra columna durante la edición.
- Scrollbars dibujadas con un componente externo: agrega dependencia y obliga a reproducir interacción nativa.

## Verificación

Comprobar rueda y teclado independientes, foco de campos profundos, llegada al primer campo antes de interacción, vuelta al flujo natural en 320 × 568 y con texto al 200 %, ambos idiomas y temas y colores forzados. La emulación no sustituye un dispositivo físico. Ver [desarrollo](../development.md).
