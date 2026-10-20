# ADR 0029: Buscar la cuenta antes de elegir tarjetas

- Estado: aceptada; [ADR 0030](0030-all-profile-counters-prefetch.md) amplía la precarga a los 18 contadores del alcance actual.
- Fecha: 2026-10-20.
- Producto: GitHub Profile Generator.
- Amplía [ADR 0027](0027-browser-activity-data-cache.md) y sustituye su requisito de volver a Buscar para cada cobertura nueva.

## Contexto

La búsqueda al final del formulario exigía tarjetas elegidas y hacía volver a ese botón para cargar contadores nuevos. Se pidió ingresar el usuario, buscar y luego elegir componentes usando la información ya cargada.

## Decisión

Ubicar «Buscar datos» inmediatamente debajo del usuario. La acción funciona sin tarjetas: carga en paralelo el snapshot básico y las estadísticas y lenguajes Extended por defecto, mediante dos solicitudes JSON agrupadas. No precarga históricos, filtros específicos ni destinos desconocidos. También admite recursos seleccionados con destinos válidos aunque no haya usuario de GitHub.

Buscar activa explícitamente esa cuenta durante la sesión del editor. Elegir tarjetas o cambiar sus opciones después reutiliza los datos disponibles y consulta únicamente cobertura faltante o vencida, agrupando cambios durante 300 ms. Los recursos válidos aplicados y seleccionados pueden cargarse después de esa primera búsqueda. Los errores permanecen visibles y no provocan reintentos automáticos continuos.

Montar, recuperar, abrir y escribir un usuario no buscado no consulta. Cambiar a otra identidad requiere Buscar; una respuesta anterior no puede mostrarse como datos de la nueva cuenta. Reemplazar, importar, restaurar o borrar el perfil vacía la caché y la activación. Se conservan la validación, los límites de concurrencia y memoria y el tratamiento de parcialidad de ADR 0027. Los snapshots siguen fuera del documento y del almacenamiento persistente.

La búsqueda muestra progreso y errores aun sin tarjetas elegidas. La vista previa continúa renderizando localmente los SVG permitidos. La búsqueda opcional de aportes destacados conserva su acción independiente.

El aviso de origen público se muestra junto a las acciones de exportación, con texto que distingue búsqueda local y publicación. La falta de origen público sigue bloqueando exportar tarjetas; excluirlas conserva su configuración y permite exportar el resto.

## Alternativas consideradas

- Mantener selección primero: obliga a configurar antes de obtener información y fue rechazado durante la revisión del recorrido.
- Precargar todos los históricos y recursos: aumenta costo y espera para opciones que quizá no se elijan.
- Consultar al escribir el nombre: no conserva la acción explícita solicitada y puede consultar identidades incompletas.

## Verificación

Comprobar Buscar sin tarjetas, orden del botón, cero red antes de la acción, reutilización al seleccionar, faltantes agrupados, errores sin bucle, cambio de usuario, recursos aplicados y reset. Mantener el bloqueo de exportación y los recorridos de teclado/móvil. Resultados ejecutados en [desarrollo](../development.md).
