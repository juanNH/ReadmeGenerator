# ADR 0006: Navegación de secciones y configuración estable

- Estado: aceptada.
- Fecha: 2026-10-19.
- Ámbito: navegación, configuración activa y orden de secciones del editor.
- Amplía [ADR 0005](0005-manual-profile-composition.md). Conserva los ocho módulos manuales, el contrato v1, las políticas de salida y las protecciones del borrador local; reemplaza la composición de formularios en tarjetas plegables.

## Contexto

Las tarjetas de cada sección distribuyen los formularios a lo largo de la página. Al cambiar de sección, la persona necesita encontrar dónde seguir configurando y reconocer qué parte está editando. El orden solo mediante movimientos vecinos requiere varias acciones para destacar una sección que está lejos de su posición deseada.

La composición debe permitir seleccionar, incluir u ocultar y ordenar como acciones distinguibles. Los módulos son opcionales, sus datos ocultos se conservan y el borrador contiene siempre nueve IDs. La mejora de navegación no requiere cambiar el formato persistido ni las reglas de generación.

## Decisión

Presentar navegación compacta, un panel estable de configuración y vista previa. En pantallas amplias ocupan izquierda, centro y derecha, respectivamente. La navegación muestra las ocho secciones manuales, primero incluidas en orden del documento y luego ocultas. El formulario activo y el idioma del README comparten el panel de configuración. Solo el formulario activo está montado, sin acordeones. La navegación, el encabezado del formulario y un indicador junto a la vista previa identifican la sección en edición; el indicador no cambia el Markdown exportado.

Separar los controles de cada sección: la casilla cambia solo inclusión y mantiene el foco; el nombre de una sección incluida selecciona su formulario y enfoca el encabezado de configuración. La acción de una sección oculta se identifica como agregar y editar para comunicar el cambio de visibilidad. Ocultar conserva los datos y permite continuar configurando esa sección con su estado oculto identificado. Quitar una entrada sigue siendo una acción explícita que borra sus datos.

En pantallas angostas, plegar la navegación de secciones y ofrecer botones Editar/Vista previa con `aria-pressed`. Selección activa, navegación plegada, vista móvil y operación de arrastre son estado efímero. No se agregan campos a `ProfileDocument` ni se modifica la clave del borrador. Revisar un error selecciona el formulario, muestra edición y enfoca el primer campo inválido.

Usar `@dnd-kit/react` y `@dnd-kit/dom` 0.5.1 en la navegación cliente, con la API actual de `DragDropProvider` y ordenables. La integración utiliza sensores de puntero y teclado y un tirador dedicado por sección incluida. La restricción del gesto táctil se aplica solo al tirador; los campos, nombres y casillas conservan su interacción. Se traducen instrucciones y anuncios a inglés y español y se mantienen los botones Subir/Bajar como alternativa. La elección de biblioteca no demuestra por sí sola accesibilidad completa ni mejoras de rendimiento.

Confirmar el nuevo orden únicamente al finalizar un movimiento válido. Cancelar conserva el documento anterior. El movimiento calcula una nueva secuencia de módulos manuales incluidos y la coloca en los mismos espacios de `moduleOrder`; conserva posiciones ocultas, métricas y los nueve IDs antes de usar `reorderModules`. La agrupación visual de incluidas y ocultas no se guarda como otro orden. La selección activa se conserva al reordenar.

La secuencia que cambia durante el gesto es una proyección efímera controlada por React. Se desactiva `OptimisticSortingPlugin` mediante la configuración pública de ordenables y se conserva `SortableKeyboardPlugin`. En la revisión de la versión 0.5.1 se observó que soltar fuera, con destino nulo sin cancelación explícita del sensor, puede conservar el orden provisional del DOM aunque el documento no cambie. Controlar la proyección permite descartarla tanto al cancelar como al soltar fuera, sin manipular nodos ni remontar la navegación. Los anuncios consultan el contexto actual de idioma y cantidad de secciones, también después de recuperar un borrador.

## Alternativas consideradas

| Alternativa                                                | Consecuencia                                                                 |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Conservar formularios en tarjetas distribuidas             | Obliga a recorrer la página para localizar la configuración activa.          |
| Usar el nombre de sección como casilla                     | Mezcla configurar con cambiar lo que aparece en el README.                   |
| Permitir arrastrar toda la fila o el formulario            | Interfiere con selección, escritura y desplazamiento táctil.                 |
| Quitar los botones de orden                                | Obliga a usar arrastre para una acción que puede ofrecer controles directos. |
| Guardar un segundo orden o migrar el documento             | Duplica información que ya representa el contrato v1.                        |
| Actualizar el borrador durante cada movimiento del puntero | Hace que cancelar requiera revertir cambios ya persistidos.                  |

## Consecuencias y revisión

La edición mantiene una ubicación reconocible al cambiar de sección y distingue su selección de la composición exportada. La navegación móvil evita presentar todos los formularios en una sola página extensa. Los controles requieren foco explícito, nombres accesibles, anuncios de posición y revisión del recorrido con puntero, teclado y tacto.

La dependencia de arrastre se mantiene en la UI; el núcleo continúa sin React, APIs del navegador o almacenamiento. La vista previa, copia y descarga siguen derivándose del mismo Markdown y las protecciones de recuperación local permanecen vigentes. No se incorporan estilos del README, métricas, GitHub ni IA.

Revisar esta decisión ante cambios en la navegación, el formato persistido o la biblioteca de interacción. Las decisiones anteriores describen sus entregas y conservan su valor histórico.

## Referencias

- [Inicio de la integración React de dnd kit](https://dndkit.com/react/quickstart/).
- [Gestión del estado ordenable](https://dndkit.com/react/guides/sortable-state-management/).
- [Configuración de sensores](https://dndkit.com/react/guides/sensors/).
- [Editor](../editor.md) y [arquitectura](../architecture.md).
