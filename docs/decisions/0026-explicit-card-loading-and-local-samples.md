# ADR 0026: Elegir tarjetas con muestras y consultar por acción explícita

- Estado: aceptada para la implementación.
- Fecha: 2026-10-20.
- Producto: GitHub Profile Generator.
- Amplía [ADR 0025](0025-activity-data-cache-and-preview-batching.md) y sustituye la carga automática de configuraciones nuevas en el editor.

## Contexto

La caché incremental y la agrupación de clics reducen trabajo repetido, pero cada combinación nueva de opciones todavía podía solicitar una imagen mientras se editaba. Se pidió elegir con miniaturas, consultar con un botón y mejorar la ubicación del idioma del README. El alojamiento gratuito y la cuota compartida del PAT requieren evitar consultas accidentales, sin presentar este control de interfaz como infraestructura para tráfico masivo.

## Decisión

### Selección local antes de consultar

Ofrecer las diez familias mediante elecciones independientes y muestras decorativas CSS locales. Las muestras no contienen estadísticas de una persona, imágenes remotas ni solicitudes de proveedor. Son esquemas de composición; las tarjetas reales aplican las opciones configuradas. Se puede elegir antes de consultar un usuario o completar los destinos. Los campos requeridos y errores del generador siguen determinando si la selección puede aplicarse.

La acción «Buscar y mostrar tarjetas» aprueba el último lote de URLs generado para la selección visible. Las imágenes se solicitan después de esa acción y muestran estados propios de carga o error. Una decodificación de SVG no demuestra que el proveedor estuviera disponible: una tarjeta de indisponibilidad también es SVG válido. El estado general dice que la selección está aplicada, sin afirmar que todos sus datos fueron obtenidos.

Separar la búsqueda opcional de aportes sugeridos. Su botón consulta el snapshot básico mediante `useGitHubActivity`; no se ejecuta como requisito para elegir o cargar Extended, repositorios, Gists o WakaTime. Los aportes manuales siguen funcionando sin credenciales.

### URLs derivadas y aprobación efímera

`ReadmeResult.activityCards?` contiene exclusivamente las URLs de tarjetas emitidas por el generador, en su orden y con las mismas repeticiones. Se recoge al construir el mismo Markdown, sin otro generador ni parseo adicional del documento. Se omite cuando no hay tarjetas y en resultados con errores. Es metadato derivado, no parte de `ProfileDocument` ni del borrador.

El editor valida esas URLs con `parseActivityCardUrl` y `parseResourceCardUrl` y obtiene sus rutas locales exactas. `EditorWorkspace` conserva el último conjunto aprobado solo en memoria. `PreviewImage` muestra una muestra local sin enlace al endpoint cuando la URL actual no está aprobada. Usuario, destino, idioma de contenido, filtros o apariencia nuevos requieren aplicar otra vez si modifican la URL. Texto manual y cambio de formulario no cambian la aprobación de una URL.

Aplicar otro lote reemplaza el conjunto anterior; cambiar A→B→A sin aplicar B conserva la aprobación A. Una imagen ya aprobada puede volver a solicitarse al remontar, según la caché del navegador y del servidor. La aprobación no asegura que todos sus bytes permanezcan en memoria del navegador.

Recuperar un borrador al montar empieza sin aprobaciones. Nuevo borrador, borrado confirmado, importación, apertura de proyecto y restauraciones revocan el conjunto. Revisar o cancelar un archivo candidato conserva el perfil y no carga sus recursos.

Documento, autosave, copia y descarga siguen usando la configuración y el Markdown actuales. La consulta del editor no es un requisito nuevo de exportación. Se mantienen los errores, el origen público HTTPS requerido y las restricciones de imágenes y HTML. La primera imagen aprobada conserva una muestra mientras carga; la imagen real aparece al decodificarla y los fallos permiten reintento explícito.

### Idioma accesible arriba

Mover `readme-language` a la cabecera de configuración, antes del título y del formulario. Conservar nombre accesible, ayuda, foco, idiomas sin banderas y separación entre idioma de contenido e interfaz. La etiqueta móvil es compacta y se comprueban alturas de teléfono antes de cualquier desplazamiento automático. La barra horizontal de secciones no incorpora otra fila de controles.

En teléfono, compactar las acciones de sección junto al título con iconos de 44 px y nombres accesibles. El contador de posición conserva su texto para lectores de pantalla; en escritorio sigue visible. Acotar el grupo de idioma al ancho disponible y permitir su distribución con texto ampliado, sin desbordar la página ni empujar el primer campo fuera de una altura de 568 px a tamaño normal.

### Límites de operación

La aprobación afecta al editor. El README publicado y los endpoints SVG públicos pueden consultar de nuevo cuando no haya caché reutilizable. La caché por campo, CDN, deduplicación y límites por proceso se mantienen; el PAT sigue compartiendo cuota entre visitantes. No se agregan cuentas, dependencias, GitHub App ni infraestructura. La [guía de API y alojamiento](../github-api-and-hosting.md) distingue cuota GitHub, consumo Vercel y visitantes, con fuentes oficiales y ejemplos hipotéticos.

## Alternativas consideradas

- Aumentar el debounce: aún consulta configuraciones intermedias si hay pausas al editar.
- Congelar el documento o el Markdown hasta consultar: desincroniza edición, guardado y exportación.
- Llamar al snapshot básico antes de cada familia: solicita datos innecesarios para Extended o WakaTime.
- Repetir en el editor las reglas que construyen URLs: duplica selección, normalización y filtros; se usa metadato del generador.
- Cargar miniaturas reales desde proveedores: consume cuota antes de confirmar y mezcla ejemplos con datos personales.
- Aceptar una autorización por usuario o un booleano global: habilita consultas para opciones y destinos que todavía no fueron aplicados.

## Verificación

Comprobar cero consultas JSON/SVG al seleccionar, escribir, recuperar y cambiar opciones sin aplicar; carga exclusiva del lote final; recursos independientes del usuario GitHub; URLs y enlaces pendientes inertes; reintento, respuestas tardías e idiomas; revocación tras reemplazar el perfil; metadatos exactos y ausentes en errores. Revisar idioma y primer campo en alturas de teléfono y escritorio. Los resultados ejecutados se registran en [desarrollo](../development.md).
