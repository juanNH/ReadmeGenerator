# ADR 0031: Guardar los datos públicos de actividad en el navegador

- Estado: aceptada para la implementación.
- Fecha: 2026-10-20.
- Producto: GitHub Profile Generator.
- Amplía [ADR 0030](0030-all-profile-counters-prefetch.md) y sustituye la caché exclusivamente en memoria del editor de [ADR 0027](0027-browser-activity-data-cache.md).

## Contexto

La búsqueda ya prepara los 18 contadores, pero sus datos se perdían al recargar porque vivían solo en RAM. Se pidió conservar la primera carga completa en el navegador de cada persona y reutilizarla al agregar componentes, sin exigir almacenamiento persistente del backend.

## Decisión

Guardar la caché de datos públicos en IndexedDB nativo del navegador, con un formato versionado independiente de `ProfileDocument`, localStorage del borrador, archivos de proyecto y Markdown. Conservar identidad, filtros, período y fecha original; guardar únicamente entradas validadas y acotadas. No guardar token, credenciales, autorizaciones para consultar, errores, solicitudes pendientes, SVG ni Blob URLs.

La frescura sigue siendo de 30 minutos desde la consulta original; datos anteriores pueden mostrarse como tales hasta 24 horas. La recuperación no rejuvenece fechas. La limpieza de entradas vencidas se realiza al acceder o guardar; no se promete que el navegador ejecute tareas mientras la aplicación está cerrada. Los límites de entradas y tamaño se mantienen acotados y la caché es descartable.

La reutilización exige coincidencia de alcance y día UTC. Cruzar esa fecha o el año implícito puede dejar la consulta pendiente hasta Buscar; retener filas anteriores no autoriza mezclar períodos ni consultar automáticamente.

Al montar, restaurar asíncronamente sin HTTP. Los datos cubiertos pueden mostrarse y personalizarse directamente. Recuperar datos no autoriza nuevas consultas: faltantes o vencidos esperan Buscar en una sesión que todavía no buscó. Buscar espera la lectura inicial para no duplicar una carga que ya existe. Escribir usuario, abrir formularios o recuperar borrador no consulta GitHub.

Agrupar escrituras asíncronas y confirmar «guardado» solo al completar la transacción. Mientras tanto, indicar que se está guardando. Al desmontar o recargar, cancelar trabajo en vuelo y conservar la caché. Borrar, comenzar, importar, reemplazar o restaurar el perfil purga la caché y su activación, invalidando lecturas, escrituras y respuestas anteriores. El ciclo adicional de efectos de Strict Mode no debe provocar una purga ni dejar la sesión inutilizable.

Si IndexedDB falla, queda bloqueado o alcanza su cuota, continuar con RAM e informar que esos datos estarán disponibles mientras el editor siga abierto. El borrador y sus mecanismos de protección no dependen de que esta caché pueda guardarse.

## Alternativas consideradas

- Solo RAM: reutiliza datos durante la edición, pero no satisface la recarga solicitada.
- localStorage: adecuado para datos pequeños; su API síncrona y almacenamiento de cadenas resultan menos apropiados para snapshots potencialmente grandes.
- sessionStorage: síncrono y limitado a la pestaña; no aporta las operaciones asíncronas de IndexedDB.
- Servicio de caché remoto: introduce infraestructura fuera del alcance solicitado.

IndexedDB permite almacenar datos estructurados con operaciones asíncronas por origen. La retención depende también del navegador, las cuotas y la eliminación de datos del sitio. No solicitar permisos de almacenamiento persistente ni mostrar avisos adicionales. Fuentes: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API), [transacción completada](https://developer.mozilla.org/en-US/docs/Web/API/IDBTransaction/complete_event) y [cuotas y eliminación](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

## Consecuencias

Cada navegador/dispositivo conserva su propia copia; no se sincroniza entre personas u orígenes. Las visitas posteriores pueden reutilizar datos sin solicitudes a la aplicación mientras estén disponibles. La primera carga o un nuevo alcance siguen pasando por el servidor para proteger el token; esto no elimina cuotas ni garantiza capacidad para miles de búsquedas nuevas.

## Verificación

Comprobar recarga con datos frescos y cero HTTP, vencimiento sin consulta automática, identidad/alcance, caché inválida, límites, bloqueo/cuota, Strict Mode y reset durante lecturas/escrituras. Mantener snapshots fuera del perfil y sus respaldos. Resultados en [desarrollo](../development.md).
