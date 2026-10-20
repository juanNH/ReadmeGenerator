# ADR 0021: Archivos de proyecto y recuperación independiente

- Estado: aceptada.
- Fecha: 2026-10-20.

## Contexto

El editor conserva un borrador local y permite importar el contenido visible de un README como secciones propias. El archivo Markdown no representa todos los módulos, categorías, identidades, decisiones de formato y datos ocultos del proyecto. El JSON descargable del importador corresponde al perfil anterior de su último respaldo; falta una copia general del proyecto actual.

## Decisión

Ofrecer descargar y abrir un archivo JSON local con el `ProfileDocument` completo, sin un envelope adicional. Descargar siempre v2 y abrir v2 o v1 estricto mediante `parseProfileDocument`, con migración en memoria. El idioma del contenido se conserva; la interfaz mantiene el idioma actual. Los documentos estructuralmente válidos pueden guardarse aunque su README necesite correcciones.

`src/core/project` contiene el contrato puro: 4 MiB medidos en UTF-8, profundidad máxima 32 y hasta 50.000 valores JSON. El límite se comprueba antes de validar el documento; la profundidad se precomprueba antes del parseo. Se comprueban también los límites después de migrar v1. Un BOM exterior es opcional y cuenta en el tamaño; la fuente dentro de cadenas conserva sus caracteres. La descarga prefiere JSON con sangría de dos espacios y LF final. Cerca del límite utiliza JSON compacto para conservar el mismo documento sin excederlo, y se vuelve a validar para garantizar que esta versión pueda abrirlo. Nunca truncar datos.

La interfaz carga las opciones de Proyecto bajo demanda. Leer un archivo y revisar su resumen es inerte: no interpreta HTML, carga imágenes ni consulta actividad del candidato. Solo después de revisar y confirmar se reemplaza el perfil. El archivo y su propuesta se descartan al cerrar o cambiar el idioma de interfaz; no se reanuda una confirmación.

El adaptador conserva un único perfil anterior en `github-profile-generator.project-backup.v1`, con `{ schemaVersion: 1, previousDocument }`. El documento previo debe ser v2 estricto y descargable según el contrato del proyecto. El registro usa JSON compacto y un límite de 4 MiB + 1 KiB para el envelope. El respaldo se escribe antes del nuevo borrador; dos escrituras de almacenamiento local no constituyen una transacción.

Conservar el respaldo independiente de Markdown, su fuente original y las claves v1/v2 existentes. Revalidar datos almacenados antes de escribir y proteger valores inválidos o inaccesibles. Ante fallos, conservar el perfil activo y exigir una elección explícita para continuar solo en memoria, con posibilidad de descargar recuperación. Invalidar revisiones y guardados pendientes para que un debounce o `pagehide` no restituya contenido anterior. Restaurar exige confirmación y no consume el respaldo.

## Alternativas

- Reconstruir toda la configuración desde Markdown: el archivo publicado omite datos y no permite una inversa exacta.
- Añadir configuración a comentarios del README: publicaría datos ocultos innecesariamente y no ayudaría a archivos anteriores.
- Reutilizar el respaldo Markdown con una fuente vacía o JSON: alteraría el significado y compatibilidad de ese registro.
- Cuentas y sincronización remota: requieren servicios y decisiones ajenos a la portabilidad local.

## Consecuencias

El proyecto conserva todos los datos de autoría, incluidos ocultos y heredados, con sus IDs y opciones. No contiene snapshots remotos, metadatos de renderizado, estado efímero ni configuración del servidor. Versiones futuras, campos desconocidos y archivos inválidos generan errores sin descartar propiedades para forzar compatibilidad.

Hay dos respaldos independientes según la operación realizada. La UI debe distinguir abrir un proyecto, importar un README y recuperar cada perfil anterior. Los límites protegen el procesamiento y deben mantenerse compatibles entre descarga y apertura. No se incorpora fusión, historial, múltiples proyectos persistidos ni asistencia con IA.

## Revisión futura

Revisar si aparecen necesidades reales de biblioteca de proyectos, fusión o sincronización. Una evolución del formato o los respaldos requiere migración explícita y conservación de registros incompatibles.
