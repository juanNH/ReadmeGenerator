# ADR 0025: Reutilización de datos de actividad y agrupación de cambios

- Estado: aceptada para la implementación.
- Fecha: 2026-10-20.
- Producto: GitHub Profile Generator.
- Amplía [ADR 0024](0024-extended-public-suite-and-mit.md).

## Contexto

Cambiar la selección de contadores generaba otra URL de tarjeta y otra entrada de caché Extended para la combinación completa. Se repetían consultas aunque los datos ya estuvieran disponibles. Los clics rápidos podían iniciar solicitudes para configuraciones intermedias que no llegarían a utilizarse.

Se autorizó optimizar consultas, caché y vista previa, con pruebas. GitHub App y la infraestructura de producción se evaluarán después; se considera Vercel gratuito como posible alojamiento.

## Decisión

### Cobertura por dato y dependencias

Conservar la caché explícita en `src/server/github`, sin activar Cache Components ni introducir servicios o dependencias. Separar los campos necesarios para una tarjeta de sus opciones visuales. La selección y el orden de contadores, el icono de ranking y la presentación o ponderación de lenguajes no identifican datos nuevos.

Guardar cobertura explícita por métrica o muestra de lenguajes, aislada por usuario, generación de credenciales, día UTC y filtros efectivos. Las claves incluyen únicamente las dependencias de ese campo: período de commits, inclusión de repositorios propios o filtros de repositorios cuando corresponda. Los filtros equivalentes se normalizan como conjuntos. Ausencia de roles en estadísticas significa sin filtro de afiliación; en lenguajes y estrellas corresponde al conjunto de repositorios propio por defecto.

Consultar solo la cobertura faltante o vencida. Reutilizar campos adicionales que ya llegaron en la misma respuesta sin solicitar históricos o las 18 métricas anticipadamente. El ranking necesita seis entradas y el porcentaje de PR fusionados necesita PR totales y fusionadas. Un valor nulo o parcial consultado cuenta como cobertura; no se confunde con un campo nunca consultado ni se reemplaza por cero.

Coordinar solicitudes compatibles en vuelo y volver a comprobar faltantes antes de consultar. Cada solicitud Extended conserva un plazo total de 60 segundos al esperar otras consultas, entrar en cola y acceder a la red; esta última sigue limitada a 15 segundos y usa el remanente disponible. La cola admite un plazo menor al máximo habitual de 45 segundos. Mantener la revalidación al comenzar, hasta 32 solicitudes seguidoras por usuario y aislamiento de generaciones anteriores. Los fallos de identidad o configuración invalidan la cobertura correspondiente y no habilitan resultados antiguos; una credencial inválida invalida también otras consultas en vuelo de esa generación.

Cada dato conserva su fecha: incorporar un contador nuevo no vuelve recientes los anteriores. El snapshot combinado informa la fecha más antigua utilizada y no mezcla métricas temporales de intervalos UTC diferentes. Recalcular el plan y los faltantes al comenzar la consulta, porque pueden vencer datos o cambiar el año durante la cola. El año implícito de commits se muestra según su intervalo temporal, sin derivarlo de la fecha agregada de un contador más antiguo. Mantener frescura de 30 minutos, resultado anterior hasta 24 horas solo ante fallos transitorios y un máximo de 512 entradas combinadas de datos y fallos por servicio.

### Vista previa tras una pausa breve

La URL del Markdown y el documento cambian inmediatamente. Para una tarjeta ya montada, la vista previa espera 400 ms desde el último cambio antes de solicitar la imagen nueva. La primera carga y el reintento explícito son inmediatos. Volver a la imagen ya cargada no necesita otra descarga.

Conservar la imagen válida de la misma identidad y el aviso de actualización. Descartar respuestas tardías y cancelar el temporizador al desmontar u ocultar la tarjeta. Cambiar usuario, familia o destino mantiene la separación de identidades existente. El debounce no persiste imágenes, snapshots ni estados en el documento.

### Alojamiento futuro

La caché de memoria y el planificador siguen siendo por proceso. Una instancia nueva o paralela puede necesitar consultar otra vez; esta mejora no crea caché compartida ni una cuota global. La cuota del PAT continúa compartida por quienes utilicen ese servidor. Los SVG conservan sus encabezados públicos de caché para navegador y CDN.

Vercel Hobby admite uso personal no comercial y tiene cuotas. Antes de desplegar se deben revisar esas condiciones, la configuración de Fluid y el plazo total de cada ruta. La cola puede esperar hasta 45 segundos antes del presupuesto de red de 15 segundos; las tarjetas de repositorio con aportes pueden encadenar dos operaciones. No alcanza con asumir el tiempo predeterminado de una función antigua. Esta decisión no configura ni publica un despliegue.

## Alternativas consideradas

- Precargar las 18 métricas y todo el histórico: aumenta el coste inicial y solicita datos que podrían no usarse.
- Mantener una caché por combinación de opciones: multiplica entradas y repite datos al agregar o quitar contadores.
- Retrasar el documento o el Markdown: hace que copia, guardado y vista previa expresen configuraciones diferentes.
- Agregar una base de datos, caché remota o GitHub App: requiere decisiones de operación fuera de este ajuste.
- Migrar a cachés de framework: no garantiza almacenamiento compartido con la configuración actual y amplía el cambio sin resolver por sí mismo la cobertura incremental.

## Consecuencias

Editar apariencia o reutilizar contadores cargados evita consultas adicionales a GitHub mientras su cobertura siga fresca. Un contador nuevo puede requerir red y sigue sujeto a latencia, cuotas y límites públicos. Los clics agrupados evitan imágenes intermedias; las solicitudes ya iniciadas conservan los presupuestos del servidor.

El contrato persistido v2, las URLs admitidas, los filtros públicos, la licencia y las condiciones de exportación se mantienen. Las pruebas deben medir solicitudes y verificar cobertura, antigüedad, fallos, credenciales, cambios rápidos y respuestas tardías. Los resultados ejecutados se registran en [desarrollo](../development.md).

## Fuentes oficiales

- [Vercel Hobby](https://vercel.com/docs/plans/hobby): condiciones y cuotas, consultadas el 20 de octubre de 2026.
- [Límites de funciones](https://vercel.com/docs/functions/limitations): con Fluid, Hobby permite hasta 300 segundos; sin Fluid, el predeterminado es 10 y el máximo configurable 60.
- [Caché CDN](https://vercel.com/docs/caching/cdn-cache) y [encabezados de caché](https://vercel.com/docs/caching/cache-control-headers).
- Guías de la versión instalada de Next.js en `node_modules/next/dist/docs/01-app/03-api-reference/01-directives/use-cache.md` y `04-functions/unstable_cache.md`.
