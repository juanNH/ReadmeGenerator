# ADR 0017: Secciones en una fila horizontal permanente

- Estado: aceptada para la revisión del editor.
- Fecha: 2026-10-19.
- Sustituye el selector de sección y organizador plegable de ADR 0016. Conserva su separación de herramientas internas.

## Contexto

La persona responsable pide reconocer todas las secciones sin abrir un panel y ordenarlas de izquierda a derecha en el mismo lugar. Una lista vertical ocupa demasiado espacio antes del formulario, especialmente con varias secciones propias.

## Decisión

- Mostrar las secciones siempre en una fila sin saltos, con desplazamiento horizontal dentro de su contenedor. La página no se ensancha. Las incluidas siguen su orden del README y las disponibles aparecen después.
- Cada elemento ofrece casilla de inclusión, botón de selección y tirador. El nombre accesible es completo; el texto visible se acota para mantener la fila compacta. La configuración conserva el nombre completo. La sección activa se diferencia visualmente y con `aria-current`.
- Arrastrar horizontalmente las incluidas mediante puntero, tacto o teclado. Cada flecha del teclado avanza exactamente una posición, incluso al cambiar de dirección mientras la fila se desplaza. Una única pareja de botones izquierda/derecha ordena la sección activa como alternativa. Los movimientos se confirman al soltar; Escape cancela y restaura el orden original.
- Conservar el foco en el botón al seleccionar y en la casilla al incluir u ocultar. Mostrar horizontalmente el elemento activo o enfocado sin desplazar la página en vertical. Al cambiar de formulario, mostrar su comienzo bajo la barra.
- Compartir la zona de acciones con Editar/Vista previa y Agregar sección. Mantener la barra fija solo si deja suficiente espacio útil. Conservar el selector de bloques plegable.

## Alternativas

Un selector compacto oculta las otras secciones y exige abrirlo para encontrarlas. Un panel de organización separado introduce una segunda navegación y demasiada altura al desplegarlo. Permitir varias filas hace que el formulario siga bajando al agregar secciones.

## Consecuencias

En pantallas pequeñas no entran todas las secciones simultáneamente; se recorren lateralmente. Los controles deben conservar áreas de al menos 44 px, foco visible y ayuda de arrastre actualizada. Las pruebas comprueban fila única, desplazamiento local, títulos largos, muchos elementos, orden, cancelación, inclusión y persistencia en ambos idiomas. No cambia el documento ni el generador.

El cierre del arrastre es inmediato. La opción pública `Feedback.dropAnimation: null` evita la restauración de foco sin `preventScroll` de la biblioteca, que desplazaba una edición larga al cancelar. El editor restaura el tirador de teclado después de renderizar, sin cambiar el desplazamiento vertical ni interferir con otro control que la persona haya enfocado. El movimiento por índice y una secuencia efímera evitan saltos por geometría y callbacks tardíos; no se modifica la dependencia.
