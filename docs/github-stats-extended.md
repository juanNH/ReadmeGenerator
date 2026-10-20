# GitHub Stats Extended: alcance compatible

La aplicación adapta localmente las cinco familias de tarjetas de [GitHub Stats Extended](https://github.com/stats-organization/github-stats-extended): estadísticas, lenguajes, repositorio, Gist y WakaTime. Conserva también las cinco tarjetas propias. Los SVG se generan en este servidor; no se usa el servicio alojado de Extended ni se incorpora el paquete o servicio del proyecto original anunciado sin mantenimiento. La procedencia de la adaptación se conserva desde el sucesor activo.

La adaptación está fijada a la revisión `0506c4c0e0acab7be096be48d0d59d50852d811f`. Los archivos adaptados, modificaciones y avisos MIT están registrados en [recursos de terceros](../THIRD_PARTY_NOTICES.md). La adaptación no recibe actualizaciones automáticamente. Al actualizar el origen se deben revisar su mantenimiento, código, licencias y cambios de comportamiento.

## Tarjetas y datos

| Familia      | Disponible en esta aplicación                                                                                                                        | Condiciones y límites                                                                                                                                                              |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Estadísticas | Selección y orden de 18 contadores, filtros y ranking opcional.                                                                                      | Datos públicos con alcance explícito; un dato ausente o parcial no se presenta como cero completo.                                                                                 |
| Lenguajes    | Cinco diseños, de 1 a 20 lenguajes, ocultamiento, bytes o porcentajes, ponderación por bytes y cantidad de repositorios.                             | Muestra de hasta 300 repositorios públicos sin forks, 20 lenguajes por repositorio y 100 agregados; informa truncamiento.                                                          |
| Repositorio  | Hasta 12 tarjetas repetibles por identificador `owner/name`, descripción, estrellas, forks y lenguaje.                                               | Solo metadatos públicos. Puede mostrar cinco contadores de aportes públicos de un usuario elegido para ese repositorio.                                                            |
| Gist         | Hasta 12 tarjetas por ID con descripción, archivos, comentarios, estrellas, forks y lenguaje disponible.                                             | Exige `public: true` e identidad consistente; un Gist secreto accesible por ID sigue excluido. Descarta contenido incrustado en REST; no consulta raw_url ni lo expone o persiste. |
| WakaTime     | Un usuario público independiente del de GitHub; lenguajes de los últimos siete días en tiempo o porcentaje, diseño normal/compacto y barra opcional. | Consulta el endpoint fijo de estadísticas públicas. Exige visibles la actividad y los lenguajes; no pide claves WakaTime.                                                          |

La selección de familias y recursos es explícita. Todas empiezan desactivadas. Las opciones y destinos se guardan en el proyecto; los snapshots remotos permanecen en memoria del servicio o del formulario y no se incorporan al documento. Los aportes manuales continúan disponibles sin usuario ni credenciales.

### Los 18 contadores

| ID persistido                      | Contenido                                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------------------------- |
| `stars`                            | Estrellas de los repositorios públicos propios analizados.                                      |
| `commits`                          | Commits del período, de un año UTC elegido o de la búsqueda histórica pública, según la opción. |
| `pullRequests`                     | PR públicas creadas durante el histórico disponible en la búsqueda.                             |
| `issues`                           | Issues públicas creadas durante el histórico disponible en la búsqueda.                         |
| `reviews`                          | Revisiones del período de contribuciones.                                                       |
| `repositoriesContributedTo`        | Repositorios públicos con aportes en el período.                                                |
| `allTimeContributions`             | Contribuciones públicas del histórico consultado.                                               |
| `allTimeRepositoriesContributedTo` | Repositorios públicos distintos con aportes en el histórico consultado.                         |
| `discussionsStarted`               | Discusiones públicas iniciadas.                                                                 |
| `discussionsAnswered`              | Discusiones públicas con una respuesta elegida del usuario.                                     |
| `mergedPullRequests`               | PR públicas fusionadas.                                                                         |
| `mergedPullRequestPercentage`      | Porcentaje de PR públicas fusionadas sobre las PR públicas consultadas.                         |
| `authoredPullRequests`             | PR públicas creadas.                                                                            |
| `commentedPullRequests`            | PR públicas comentadas, excluyendo aquellas de las que el usuario es autor.                     |
| `reviewedPullRequests`             | PR públicas revisadas, excluyendo aquellas de las que el usuario es autor.                      |
| `authoredIssues`                   | Issues públicas creadas.                                                                        |
| `commentedIssues`                  | Issues públicas comentadas, excluyendo aquellas de las que el usuario es autor.                 |
| `followers`                        | Seguidores actuales.                                                                            |

Cada métrica lleva alcance `period`, `lifetime` o `snapshot`, valor nullable y bandera `partial`. Se muestran sus alcances y avisos. Las colecciones históricas de `allTimeContributions` y `allTimeRepositoriesContributedTo` consultan como máximo diez años disponibles y no prometen toda la vida de una cuenta más antigua; las búsquedas públicas de PR/issues/commits históricos tienen su alcance de búsqueda propio. Las discusiones se limitan a tres páginas de 100 por conexión. Los presupuestos por consulta son 15 solicitudes y 15 segundos de red; los límites o fallos parciales quedan visibles.

Los filtros admiten hasta 20 repositorios, propietarios o nombres excluidos y los roles `OWNER`, `ORGANIZATION_MEMBER` y `COLLABORATOR`. Los filtros operan sobre datos públicos cuya identidad puede comprobarse. Las exclusiones por nombre afectan a estrellas y lenguajes; no se aplican a las búsquedas históricas de PR, issues o commits. Si un rol o una combinación no se puede resolver con garantías, se informa indisponibilidad parcial. Los contadores de repositorios con aportes excluyen los propios salvo que se elija incluirlos.

Extended y recursos comparten un planificador por proceso: hasta cuatro consultas activas, 60 lanzamientos por minuto y cola FIFO de hasta 32 esperas, con 45 segundos máximos en cola. Las solicitudes idénticas se deduplican también mientras esperan; al comenzar se revalidan credenciales y cooldown. El plazo de red de 15 segundos corresponde a la consulta ya iniciada. La actividad básica tiene su frontera heredada independiente; estos límites no son protección distribuida.

Los lenguajes usan `bytes ^ sizeWeight × repositoryCount ^ countWeight`, con pesos entre 0 y 2 y al menos uno positivo. La configuración por defecto pondera solo bytes. Un porcentaje ponderado describe esa fórmula; no equivale necesariamente a porcentaje de bytes ni mide conocimiento. Ocultar lenguajes modifica la selección de la tarjeta, sin cambiar los repositorios consultados.

### Ranking opcional

`showRank` comienza desactivado. Al elegirlo se aplica la fórmula MIT de Extended a commits, PR, issues, revisiones, estrellas y seguidores. Puede mostrar letra, índice porcentual de la fórmula o un símbolo local de ramificación para la opción `github`. Ese índice no es un percentil de una población de usuarios medida y la letra no evalúa habilidad, experiencia o calidad del trabajo. El ranking se oculta si cualquiera de sus seis entradas falta o es parcial. No se usa el número de repositorios como entrada adicional.

### WakaTime público

La cuenta WakaTime no se deduce del usuario GitHub. Se consulta `https://api.wakatime.com/api/v1/users/{username}/stats/last_7_days` sin token GitHub ni credenciales del usuario. La respuesta debe declarar `is_coding_activity_visible` e `is_language_usage_visible` como verdaderos y datos actualizados. Si el proveedor no entrega fechas explícitas, la tarjeta indica «últimos siete días» sin inventar un inicio o fin. No se consultan proyectos, equipos, máquinas ni actividad privada.

## Personalización

Las tarjetas comparten tema claro/oscuro, tres paletas, tres diseños propios y tamaño compacto/amplio. La ampliación agrega 79 temas nombrados de Extended, colores hexadecimales de seis dígitos para título/texto/iconos/borde/fondo, degradado con ángulo de 0 a 360 y de 2 a 10 colores, radio de 0 a 30, ancho de 700 a 1200, interlínea de 22 a 50, título propio de hasta 100 unidades UTF-16, título/borde ocultables, iconos, negrita y números cortos/largos con precisión de 0 a 2. Los valores se validan como datos; no admiten CSS ni URLs. Las opciones de filas, iconos y formato numérico se aplican donde la composición Extended contiene esos elementos; las cinco tarjetas propias conservan sus composiciones y formatos de datos.

Las opciones específicas de repositorio permiten mostrar propietario, de 1 a 3 líneas de descripción y los contadores públicos de PR creadas/comentadas/revisadas e issues creadas/comentadas. Elegir contadores exige un usuario de contribuciones explícito. Las opciones de WakaTime incluyen de 1 a 20 lenguajes, lenguajes ocultos, tiempo/porcentaje, barra y diseño normal/compacto.

## Diferencias y exclusiones deliberadas

| Capacidad del origen                                                   | Decisión local                                                                                                             |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Datos privados mediante OAuth o credenciales con permisos ampliados    | Excluidos. El servidor admite PAT classic verificable vacío o solo `public_repo`, con filtros públicos.                    |
| Datos históricos o muestras mayores                                    | Presupuestos locales acotados y cobertura declarada; no se garantiza coincidencia numérica con otra instancia.             |
| Todos los idiomas del origen                                           | La interfaz y los SVG admiten inglés y español.                                                                            |
| Parámetros de URL del origen                                           | Se usan contratos propios estrictos. No hay compatibilidad directa con sus URLs o todos sus parámetros.                    |
| Tema automático según el visor y colores por modo                      | Tema explícito en cada URL. No se incrusta CSS adaptativo.                                                                 |
| Colores de anillo o barras como parámetros separados                   | La adaptación usa los colores validados de la apariencia compartida; no expone cada token gráfico del origen.              |
| Anchos mínimos y distribución exacta del origen                        | Ancho local de 700 a 1200 y composición accesible propia; no promete réplica visual exacta.                                |
| Icono de GitHub para el ranking                                        | Símbolo local pasivo de ramificación; no carga una marca remota.                                                           |
| Animaciones, CSS libre, `foreignObject` o recursos externos en SVG     | Excluidos; los SVG son pasivos y escapados.                                                                                |
| Despliegue, GitHub Actions, caché y operación del servicio de Extended | Son opciones operativas del origen, no funciones incorporadas al editor. Esta aplicación tiene sus propias rutas y cachés. |

La matriz describe las funciones utilizables dentro de los contratos del producto. No afirma paridad absoluta con el servicio de Extended. Las fuentes oficiales de las familias están en [estadísticas](https://github-stats-extended.vercel.app/frontend/docs/cards/stats/), [lenguajes](https://github-stats-extended.vercel.app/frontend/docs/cards/top-languages/), [repositorio](https://github-stats-extended.vercel.app/frontend/docs/cards/repo-pin/), [Gist](https://github-stats-extended.vercel.app/frontend/docs/cards/gist-pin/) y [WakaTime](https://github-stats-extended.vercel.app/frontend/docs/cards/wakatime/).

## Exportación y open source

Las tarjetas de perfil usan `/cards/github/{username}/extended-{stats|languages}.svg`; los recursos usan `/cards/extended/{repository|gist|wakatime}.svg`. Las queries contienen identificadores públicos, idioma y opciones validadas, nunca tokens ni el borrador completo. El README y la vista previa comparten esas mismas URLs; solo la vista previa las resuelve localmente. La exportación requiere `APP_URL` como origen HTTPS público propio. Sin él se mantiene la revisión local y se bloquean copia y descarga mientras haya tarjetas elegidas.

El código propio está bajo [MIT](../LICENSE), con `Copyright (c) 2026 Juan Nicolas Herrera`. Las adaptaciones conservan los avisos de sus autores y sus licencias originales. Revisá la [guía open source](open-source.md) para atribución, contribuciones, inventario de dependencias y preparación de una distribución. La licencia del generador no cambia la titularidad del contenido personal ni de las marcas incluidas en un README.
