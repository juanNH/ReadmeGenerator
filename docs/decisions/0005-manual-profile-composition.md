# ADR 0005: Composición de ocho módulos manuales

- Estado: aceptada.
- Fecha: 2026-10-19.
- Ámbito: edición manual, composición y generación de README.
- Amplía [ADR 0004](0004-local-readme-editor.md); conserva sus decisiones de texto plano, Markdown compartido y recuperación local.

## Contexto

El contrato v1 ya contiene nueve módulos. El editor necesita presentar conocimientos, estudios, tecnologías, actualidad, proyectos y contribuciones junto a presentación y contacto, sin exigir actividad pública o trayectoria laboral. Mostrar todos los formularios abiertos dificulta recorrer perfiles extensos; ocultar una sección tampoco debe ser la única forma de reducir el espacio de edición.

Las colecciones tienen IDs opacos y pueden contener datos parciales. Los borradores publicados deben conservar su formato, idioma, contenido oculto y orden. Métricas tiene configuración en el contrato, pero no dispone de edición ni generación.

## Decisión

Admitir ocho módulos manuales con formularios específicos en `src/modules/` y renderers puros pequeños en `src/core/readme/`. Mantener `ProfileDocument` versión 1 y la clave de almacenamiento existente, sin migración: los campos requeridos ya están representados. El registro del núcleo conserva esquemas y metadatos, sin componentes, iconos ni reglas de interacción.

Separar tres acciones: plegar conserva visibilidad y contenido; ocultar cambia visibilidad conservando contenido; quitar una entrada elimina sus datos con una acción que explica el efecto. La tarjeta abierta es estado efímero y solo se abre una a la vez. Los errores de enlaces se muestran en campo y tarjeta; una acción de revisión abre y enfoca el campo correspondiente.

Ordenar mediante botones Subir/Bajar que intercambian dos módulos manuales visibles vecinos dentro del array completo. Los IDs ocultos y métricas conservan sus posiciones; enviar siempre los nueve IDs a `reorderModules`. Usar ese orden para formularios y README, con foco y anuncio de posición. No introducir un orden paralelo de UI ni arrastre.

Mantener tecnologías como texto libre agrupable, sin catálogo, logos o puntuaciones. Las tecnologías de proyectos siguen siendo strings; las entradas con ID conservan su identidad opaca. Usar IDs DOM independientes y crear nuevos IDs de entradas fuera del núcleo. Mantener fechas como texto libre y enums anulables, sin inferencias de antigüedad, finalización o habilidad.

Omitir entradas vacías sin inventar títulos. Los grupos tecnológicos necesitan alguna entrada exportable; los enums solos de formación o actualidad no crean contenido. Los demás datos parciales se muestran sin exigir nombre, institución, empleo o repositorio. `contentLocale` traduce etiquetas generadas y enums, conservando texto propio y fechas.

Compartir la política HTTP/HTTPS de enlaces web entre módulos. Solo contacto admite `mailto:` bajo su política restrictiva. Una URL opcional vacía es válida; una fila de enlaces de contacto o proyectos con etiqueta sin URL requiere corrección. Los errores de URLs suministradas incluyen la ruta completa y bloquean la salida entera, incluso en enlaces anidados. Los datos ocultos no bloquean la generación.

Mantener `unsupported_module` para métricas visible. Ofrecer ocultarla mediante una acción explícita que preserve usuario, tarjetas y orden. No descartar configuración ni producir una exportación parcial silenciosa.

## Alternativas consideradas

| Alternativa                                          | Consecuencia                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Mostrar los ocho formularios abiertos                | Alarga el recorrido y dificulta concentrarse en una sección.                 |
| Usar visibilidad para plegar formularios             | Modifica el README cuando la persona solo quiere reducir espacio de edición. |
| Guardar un segundo orden con solo secciones visibles | Obliga a reconciliarlo con módulos ocultos y el contrato completo.           |
| Exigir títulos, institución o repositorios           | Excluye contenido parcial útil y perfiles con poca actividad pública.        |
| Migrar el documento para habilitar formularios       | Cambia un formato que ya representa todos sus datos.                         |
| Ocultar o borrar métricas automáticamente            | Altera decisiones o configuración del borrador sin una acción de la persona. |

## Consecuencias y revisión

Los perfiles breves y extensos usan la misma composición sin porcentajes de completitud. El plegado no persiste, mientras contenido, visibilidad y orden sí usan el borrador existente. Los formularios repetibles requieren foco explícito al agregar y quitar entradas; los controles de orden requieren nombres distinguibles y tratamiento de los extremos.

El README continúa limitado al Markdown generado y su vista previa compartida. No se incorporan personalización libre, catálogos remotos, consultas a GitHub, métricas o IA. Revisar esta decisión si cambia el contrato persistido, la política de enlaces o el comportamiento de composición.

Ver [editor](../editor.md), [modelo del perfil](../profile-model.md) y [arquitectura](../architecture.md).
