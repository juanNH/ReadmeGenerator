# ADR 0027: Consultar datos públicos por cobertura y renderizar tarjetas en el navegador

- Estado: aceptada; el recorrido de búsqueda se amplía en [ADR 0029](0029-account-first-activity-search.md), que permite buscar antes de seleccionar y completar faltantes automáticamente después.
- Fecha: 2026-10-20.
- Producto: GitHub Profile Generator.
- Amplía [ADR 0025](0025-activity-data-cache-and-preview-batching.md) y sustituye la aprobación de URLs del editor de [ADR 0026](0026-explicit-card-loading-and-local-samples.md).

## Contexto

La selección con muestras evita consultar mientras se configura, pero cada nueva apariencia todavía necesita un SVG HTTP. Precargar JSON y luego solicitar ese SVG tampoco asegura reutilización en un despliegue con varias instancias. Se pidió una búsqueda centralizada, caché temporal en navegador, animación de carga y consultas únicamente por información faltante.

## Decisión

`useActivityData` coordina una caché en memoria de la instancia montada del editor. «Buscar y mostrar tarjetas» consulta los JSON existentes para la unión de datos necesarios, con hasta tres fuentes simultáneas. Las cinco tarjetas propias comparten el snapshot básico; Extended agrupa estadísticas y lenguajes compatibles; cada recurso y sus aportes conservan identidades y dependencias independientes. El acceso a GitHub y WakaTime permanece en el servidor con sus límites vigentes.

La caché valida envelopes, snapshots e identidad. Extended registra cobertura a partir del plan pedido: un null/partial consultado es un resultado, mientras un campo no solicitado sigue faltando. Las claves de datos comparten reglas puras con el servidor y distinguen usuario, filtros y períodos efectivos; excluyen apariencia, orden, idioma y transformaciones locales de lenguajes. Agregar un contador consulta solo su cobertura faltante. La primera búsqueda, los datos nuevos y los vencidos requieren una acción explícita; cambiar una opción cubierta actualiza la vista previa inmediatamente.

La frescura es de 30 minutos desde la fecha original de los datos, con invalidación temporal UTC donde corresponde. Los resultados anteriores conservan su antigüedad y estado, sin rejuvenecer al agregar campos. La caché limita entradas y memoria; no se persiste en `ProfileDocument`, almacenamiento del navegador, archivo de proyecto o Markdown. Reemplazar, importar, restaurar, borrar y comenzar un borrador cancelan la generación en vuelo y vacían datos. Una respuesta tardía no puede restaurarlos.

Cada tarjeta muestra una muestra animada mientras falta su información y un error con reintento cuando corresponde. Los éxitos independientes pueden mostrarse sin esperar al resto. La animación respeta la preferencia de movimiento reducido; los estados y nombres usan el idioma de interfaz. Los ceros, ausencia y parcialidad conservan significados diferentes.

### Vista previa local y salida pública

La vista previa reconoce las mismas URLs exactas de `ReadmeResult.activityCards?` y usa los renderizadores SVG puros de `core`, compartidos con las rutas públicas. Una Blob URL temporal encapsula exclusivamente el SVG generado internamente en un elemento de imagen; no se inserta markup en el DOM. Cada URL se revoca al cambiar o desmontar. No se admite SVG escrito por el usuario, imágenes Blob en el documento ni HTML más amplio.

Las URLs, el Markdown, los enlaces de las tarjetas y los errores de exportación siguen siendo los del generador. Los SVG públicos continúan siendo dinámicos y consultando según su caché. La caché del navegador mejora la edición de esa pestaña; no es una caché distribuida, no multiplica la cuota del PAT y no vuelve innecesaria la infraestructura para tráfico masivo.

## Alternativas consideradas

- Precargar todas las métricas: históricos, búsquedas y destinos externos agregan costo y espera aunque no se usen.
- Precargar JSON y seguir solicitando SVG: mantiene viajes de red y puede repetir datos en otra instancia del servidor.
- Guardar snapshots en el perfil o localStorage: mezcla datos efímeros con contenido propio y agrega recuperación de información vencida.
- Cachear únicamente por usuario: mezcla filtros, períodos y recursos con alcances distintos.
- Interpretar cualquier null como cobertura: oculta campos que nunca se pidieron.
- Renderizar otro README para la vista previa: separa la salida de copia/descarga; se conserva el mismo Markdown y solo cambia la resolución de las tarjetas permitidas.

## Verificación

Comprobar cero consultas antes de Buscar, agrupación básica y Extended, solicitudes faltantes, personalización sin HTTP SVG/JSON, frescura original, claves de filtros y años, nulos consultados, límites de memoria, cancelación/reset, errores parciales y reintentos. Comparar la salida de los mismos renderizadores y verificar que no se expongan credenciales ni se guarden snapshots. Los resultados ejecutados se registran en [desarrollo](../development.md).
