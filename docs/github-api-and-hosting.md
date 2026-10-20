# API de GitHub, credenciales y alojamiento

Esta guía explica el consumo de la integración pública y qué considerar antes de alojarla en Vercel. Las condiciones externas se revisaron en sus fuentes oficiales el 20 de octubre de 2026; deben comprobarse otra vez antes de publicar o cambiar de plan.

## Cuándo se consulta

Tener una persona conectada al editor no implica consultar GitHub continuamente. Importan las acciones que realiza, los datos que faltan y las cachés disponibles.

| Acción                                                    | Consumo de datos remotos                                                                                                    |
| --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Escribir un usuario o configurar tarjetas antes de Buscar | El documento cambia localmente; no activa consultas.                                                                        |
| Ver las miniaturas de muestra                             | Son ejemplos locales, sin estadísticas personales ni consultas a GitHub o WakaTime.                                         |
| Pulsar Buscar datos debajo del usuario                    | Carga básico, los 18 contadores y lenguajes del alcance actual, mediante dos JSON; agrega recursos seleccionados faltantes. |
| Elegir o quitar contadores después de consultar           | Los 18 contadores ya consultados se renderizan localmente, sin HTTP SVG o JSON adicional.                                   |
| Cambiar el año, los filtros o un destino de recurso       | Puede requerir información distinta; agrupa cambios durante 300 ms y consulta cobertura faltante.                           |
| Ver un README publicado con tarjetas                      | Sus URLs SVG pueden volver a solicitar datos cuando no hay una respuesta o datos reutilizables en caché.                    |

En un README publicado, cada imagen puede producir una petición HTTP a esta aplicación; eso no equivale necesariamente a una petición a GitHub. En el editor las tarjetas se renderizan desde snapshots públicos validados y temporales: cinco propias comparten una fuente y Extended agrupa estadísticas/lenguajes compatibles. Una fuente compleja puede necesitar varias llamadas externas, por paginación o métricas diferentes. WakaTime consulta su propio servicio público y no consume la cuota del PAT de GitHub.

Precargar los 18 contadores aumenta potencialmente la duración y el consumo de la búsqueda inicial frente a precargar solo seis. Dos solicitudes JSON del navegador no significan dos llamadas o dos puntos de GitHub. Se conserva el presupuesto y la parcialidad de cada servicio; no se promete un histórico sin límites. Ver [ADR 0030](decisions/0030-all-profile-counters-prefetch.md).

La caché del navegador conserva cobertura y antigüedad por usuario, filtros y período en IndexedDB independiente del perfil. Al recargar o volver al editor, recupera datos disponibles sin HTTP ni permisos para consultar automáticamente. La cobertura fresca se usa directamente; datos faltantes o vencidos esperan Buscar en la sesión recuperada. Un usuario sin datos necesita una primera búsqueda. Los SVG de vista previa usan Blob URLs internas revocables; sus enlaces y el Markdown mantienen las URLs públicas. Desmontar conserva el store; reemplazar o borrar el perfil lo purga e invalida el trabajo anterior. Si el almacenamiento falla, se usa RAM y se informa. Las imágenes propias del perfil mantienen su política independiente. Ver [ADR 0031](decisions/0031-browser-persistent-activity-cache.md).

El botón evita consultas accidentales mientras se configura el perfil. Los endpoints de tarjetas siguen siendo públicos para que GitHub pueda cargar las imágenes del README; alguien también puede pedirlos directamente. Este control de interfaz reduce trabajo, pero no constituye un límite global de consumo.

## Qué significa usar tu key

`GITHUB_TOKEN` contiene el PAT del propietario del despliegue, exclusivamente en el servidor. Los visitantes indican un usuario público; no necesitan iniciar sesión ni ingresar su propio token. Todas las consultas autenticadas de esa instancia usan la cuota de la cuenta propietaria del PAT.

La implementación acepta un PAT classic dedicado con permisos verificables vacíos o únicamente `public_repo`, consulta solo información pública y rechaza permisos ampliados o credenciales que no puede verificar. Esta es una restricción de la aplicación; no significa que GitHub recomiende tokens classic para todas las integraciones. Ver [configuración local](development.md) y [decisión de actividad pública](decisions/0010-github-activity.md).

El token nunca debe aparecer en código cliente, una variable `NEXT_PUBLIC_`, el README, una URL, el JSON del proyecto ni un commit. En un despliegue futuro se configurará como secreto del entorno del servidor. Tiene capacidades de autenticación y debe protegerse como una contraseña; conviene usar expiración y revocarlo si se expone. [GitHub: administración y seguridad de los PAT](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).

El nombre de variable `GITHUB_TOKEN` de este proyecto no lo convierte en el token automático de GitHub Actions: son mecanismos distintos.

## Cuotas de GitHub

| API, con un PAT de una cuenta normal | Límite primario habitual   | Unidad                                   |
| ------------------------------------ | -------------------------- | ---------------------------------------- |
| REST                                 | 5.000 por hora por usuario | Peticiones HTTP a la API REST.           |
| GraphQL                              | 5.000 por hora por usuario | Puntos; el costo depende de la consulta. |

REST y GraphQL tienen presupuestos primarios separados. Crear más PAT de la misma cuenta no crea cuotas personales independientes. Algunas rutas REST, como búsquedas, tienen límites más restrictivos. También existen límites secundarios de concurrencia, ráfagas y recursos consumidos; pueden alcanzarse antes del límite por hora. Hay que respetar `Retry-After` y el momento de reinicio comunicado por GitHub. [GitHub: límites REST](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api).

Una llamada GraphQL no equivale siempre a un punto. Sus conexiones y cantidad de datos influyen en el costo; las consultas costosas pueden agotar límites o devolver resultados parciales. Los encabezados `x-ratelimit-*` permiten observar el presupuesto correspondiente. Las cuotas y fórmulas pueden cambiar. [GitHub: límites y costo de GraphQL](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api).

**Ejemplo hipotético:** si 1.000 usuarios distintos provocaran, cada uno, tres peticiones REST nuevas dentro de una hora, serían 3.000 peticiones REST. Es una cuenta ilustrativa, no una medición de esta aplicación ni una estimación de puntos GraphQL. El costo real depende de tarjetas, filtros, paginación, caché y otras aplicaciones que usen la misma cuenta.

## Qué reutiliza la aplicación

| Nivel               | Dónde vive                                | Qué comparte                                                                                                            |
| ------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Datos del navegador | RAM e IndexedDB temporal de ese navegador | Personalización y recarga con datos disponibles; no sirve datos a otros visitantes ni se sincroniza entre dispositivos. |
| Datos del servidor  | RAM de cada proceso                       | Consultas compatibles atendidas por ese mismo proceso; no comparte con otras instancias.                                |
| CDN                 | Red de Vercel al desplegar                | Respuestas públicas cacheables de una misma URL, especialmente SVG; Extended y recursos JSON actuales usan `no-store`.  |

En local no se utiliza una CDN de Vercel. Tener caché en el navegador no agrega cuota al token ni evita las primeras consultas de otros usuarios. La misma tarjeta pública puede aprovechar una CDN; perfiles distintos o filtros nuevos usan claves diferentes y pueden necesitar trabajo nuevo.

IndexedDB conserva datos estructurados con operaciones asíncronas por origen. Se consideran frescos durante 30 minutos desde su consulta y los anteriores pueden mostrarse hasta 24 horas; la limpieza se realiza al acceder o guardar. Una transacción completada confirma el guardado. La caché puede desaparecer si se borran datos del sitio o el navegador los elimina; ante bloqueo, cuota o error, el editor sigue en RAM. No se solicita permiso especial de almacenamiento persistente. Fuentes: [IndexedDB](https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API) y [cuotas y eliminación del navegador](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria).

- **Datos Extended:** cobertura por métrica o muestra de lenguajes, con frescura de 30 minutos. Cambiar colores, orden o diseño reutiliza los datos compatibles; un dato faltante puede necesitar red. Cada campo conserva su antigüedad.
- **Solicitudes coincidentes en vuelo:** comparten el trabajo dentro del mismo proceso. Las solicitudes compatibles comprueban otra vez qué falta antes de consultar.
- **Respuesta SVG:** las tarjetas listas envían `max-age=300` para navegador y `s-maxage=1800` para cachés compartidas. Se permite reutilización anterior ante errores mediante `stale-if-error=86400`. Las respuestas anteriores tienen plazos menores. JSON Extended y recursos responden `no-store`; la API básica conserva encabezados públicos y su formulario consulta con `cache: "no-store"`.
- **Fallos transitorios:** el servidor puede devolver cobertura anterior completa hasta 24 horas, identificada como anterior. Un dato ausente no se convierte en cero; una identidad inexistente o credencial inválida no habilita este fallback.

Extended limita a 512 sus entradas combinadas de datos y fallos. Es un límite de memoria por servicio y proceso, no una capacidad de 512 usuarios para todo el sitio. También hay cachés propias para actividad básica y recursos. Ver [ADR 0025](decisions/0025-activity-data-cache-and-preview-batching.md).

Extended y recursos comparten, por proceso, hasta cuatro consultas activas, 60 inicios por minuto y una cola de 32 con espera máxima de 45 segundos. Extended además limita cada solicitud a 60 segundos totales, incluyendo esperas, y hasta 15 segundos de red dentro del tiempo restante. Estos números limitan operaciones locales, no representan llamadas GitHub disponibles. La actividad básica conserva su propio límite de cuatro consultas y 60 inicios por minuto.

Una CDN puede servir el mismo SVG sin ejecutar otra vez el servidor. Vercel admite estas directivas, pero la retención es de mejor esfuerzo y puede variar por región o expulsión; el estado debe comprobarse en un despliegue mediante `x-vercel-cache`. [Vercel: caché CDN](https://vercel.com/docs/caching/cdn-cache), [encabezados de caché](https://vercel.com/docs/caching/cache-control-headers).

El SVG de indisponibilidad también puede responder HTTP 200 y no activa por sí mismo `stale-if-error` en la CDN. El servicio mantiene su propia política de datos anteriores y los estados de la tarjeta deben revisarse además del código HTTP.

## Empezar con Vercel Hobby

La [guía paso a paso](vercel-deployment.md) describe `vercel.json`, los entornos `main`/`Dev`, las variables y la comprobación anónima de tarjetas. La entrega usa el PAT classic actual, sin login ni GitHub App.

Hobby puede ser un punto de partida para este proyecto personal mientras su uso sea no comercial. Publicar el repositorio bajo MIT no determina, por sí solo, si el uso de un despliegue cumple esas condiciones. Hobby tiene cuotas; al excederlas, en general el recurso deja de estar disponible hasta que transcurra el período indicado por Vercel, habitualmente hasta 30 días. [Vercel: condiciones de Hobby](https://vercel.com/docs/plans/hobby).

Los cupos mensuales publicados para Hobby al revisar esta guía son:

| Recurso                           | Uso incluido |
| --------------------------------- | ------------ |
| CPU activa de funciones con Fluid | 4 horas.     |
| Memoria aprovisionada con Fluid   | 360 GB-hora. |
| Invocaciones de funciones         | 1.000.000.   |
| Solicitudes CDN                   | 1.000.000.   |
| Fast Data Transfer                | 100 GB.      |
| Fast Origin Transfer              | 10 GB.       |

Fuentes: [uso de funciones con Fluid](https://vercel.com/docs/functions/usage-and-pricing) y [cupos de Hobby](https://vercel.com/docs/plans/hobby). Esperar una API externa no consume CPU activa durante esa espera, pero la memoria sigue contando mientras la instancia atiende solicitudes. Una invocación cuenta aunque falle.

Con Fluid, el máximo de duración publicado para Hobby es 300 segundos y la memoria es de 2 GB con una vCPU. Antes del despliegue hay que comprobar la configuración efectiva de las rutas y su duración; las operaciones encadenadas pueden tardar más que una sola consulta Extended. [Vercel: límites de funciones](https://vercel.com/docs/functions/limitations).

Vercel puede reutilizar instancias y ejecutar varias solicitudes en un mismo proceso; también crea otras instancias y reduce su cantidad según el tráfico. De ese comportamiento y de los `Map` usados por este proyecto se desprende que **la caché y los límites actuales no son compartidos entre todos los procesos ni persistentes**. Una instancia nueva puede repetir una consulta que otra ya resolvió. [Vercel: ciclo de vida de funciones](https://vercel.com/docs/functions), [Fluid y estado global](https://vercel.com/docs/fluid-compute).

## Si llegan miles de personas

Miles de visitantes leyendo contenido local o un SVG ya servido por CDN representan una carga distinta de miles de personas consultando perfiles distintos al mismo tiempo. No hay una cantidad de usuarios concurrentes garantizada por esta implementación ni una prueba de carga que demuestre esa capacidad en Hobby.

La recomendación es iniciar gratis con tráfico controlado y medir aciertos de caché, consultas externas por familia, latencias, límites GitHub y uso Vercel. Antes de promover un uso masivo, evaluar caché compartida de datos, límites y deduplicación globales, protección de endpoints, observabilidad y un presupuesto operativo. Estas decisiones pueden requerir infraestructura o servicios adicionales y todavía no están configuradas.

GitHub App se evaluará en esa etapa según el modelo de autorización. Un token de instalación puede tener cuota por instalación y escalado acotado; un token de usuario sigue sujeto a su presupuesto personal. Una App no elimina los límites de GitHub ni los de Vercel. [GitHub: cuotas de instalaciones y usuarios](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api), [cuotas GraphQL de Apps](https://docs.github.com/en/graphql/overview/rate-limits-and-query-limits-for-the-graphql-api).

La selección con muestras y consulta explícita ayuda a empezar con menos consumo. La preparación para producción se decidirá con esas mediciones y sin asumir que un host gratuito ofrece capacidad ilimitada.
