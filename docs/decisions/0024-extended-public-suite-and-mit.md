# ADR 0024: Suite pública de Extended y distribución MIT

- Estado: aceptada para la implementación.
- Fecha: 2026-10-20.
- Producto: GitHub Profile Generator.
- Amplía [ADR 0023](0023-customizable-activity-cards.md).

## Contexto

Las dos adaptaciones iniciales de GitHub Stats Extended usaban únicamente el snapshot básico. Se pidió incorporar las funciones de Extended que puedan utilizarse respetando datos públicos y las condiciones open source. Se autorizó expresamente un ranking opcional y la licencia MIT del código propio con `Copyright (c) 2026 Juan Nicolas Herrera`.

El producto continúa sirviendo a personas con distintos niveles de actividad pública. Una fórmula de actividad no demuestra habilidad y debe ser una elección informada. La licencia del código propio no sustituye las licencias de los materiales de terceros ni obliga a publicar un derivado.

## Decisión

### Cinco familias Extended y diez selecciones de tarjeta

Conservar las siete selecciones anteriores y agregar `extended-repository`, `extended-gist` y `extended-wakatime`. La selección de repositorio y Gist puede generar hasta doce tarjetas de cada tipo a partir de identificadores públicos; WakaTime usa un usuario público independiente del de GitHub. Todas empiezan desactivadas. El manual sigue disponible sin cuenta ni configuración.

Las estadísticas Extended ofrecen 18 contadores, filtros por repositorios/propietarios/roles/exclusiones, inclusión de repositorios propios en sus contadores correspondientes y commits del período, año UTC elegido o búsqueda histórica pública. El histórico está acotado a diez años disponibles; se declaran resultados parciales. Los lenguajes ofrecen cinco diseños, de 1 a 20 entradas, ocultamiento, bytes/porcentaje y ponderación por bytes y cantidad de repositorios.

Se separan los snapshots Extended de `ActivitySnapshot`: una composición visual no convierte el snapshot básico en una fuente de métricas que no contiene. Cada métrica Extended declara valor nullable, alcance y parcialidad. No se sustituye indisponibilidad por cero ni una muestra truncada por un total completo.

### Configuración aditiva en v2

`metrics` conserva `username/cards`, amplía `appearance?` y admite `extended?` con `stats`, `languages`, `repositories`, `gists`, `wakatimeUsername` y `resourceOptions`, todos opcionales y estrictos. Las respuestas remotas no se persisten. No se insertan defaults al recuperar; v1 conserva su esquema cerrado y lectores antiguos de v2 pueden rechazar campos nuevos conservando el original.

La apariencia admite los presets previos, 79 temas nombrados, colores hexadecimales validados, degradados acotados, radio, ancho, interlínea, título y visibilidad, iconos, negrita y formato numérico. Son datos delimitados, sin CSS, JavaScript, hosts ni recursos gráficos arbitrarios. Restablecer apariencia conserva las otras opciones y el contenido.

### Ranking explícito

`showRank` es opt-in. La fórmula MIT adaptada recibe exclusivamente commits, PR, issues, revisiones, estrellas y seguidores. La UI y los SVG explican que no mide habilidad ni un percentil de población observado. Se oculta si una entrada requerida es nula o parcial. La letra, el índice porcentual de la fórmula y el icono son opciones de presentación de la misma operación, sin puntuaciones añadidas al perfil.

### Consultas públicas y recursos independientes

`src/server/github` mantiene `server-only`, endpoints fijos, validación de identidad, scopes y respuestas, timeout de red de 15 segundos, límites de tamaño y cachés acotadas. Extended tiene un presupuesto de 15 solicitudes, hasta 300 repositorios, 20 lenguajes por repositorio, 100 agregados, diez años históricos y 300 resultados por conexión de discusiones. Las exclusiones por nombre afectan a estrellas/lenguajes, sin aplicarse a búsquedas históricas de PR/issues/commits. Los estados parciales y ausentes permanecen explícitos. En el total histórico público se restan los recuentos privados anónimos del calendario; las tarjetas originales conservan su política previa de explicar los recuentos anónimos compartidos públicamente.

Extended y recursos comparten un planificador por proceso de cuatro consultas activas, 60 lanzamientos/minuto y cola FIFO de 32 esperas con hasta 45 segundos en cola. Deduplica también solicitudes en espera y revalida credenciales/cooldown antes de iniciar la red. La actividad básica conserva su frontera independiente; se sigue requiriendo protección operativa agregada o distribuida según el despliegue.

La política GitHub sigue admitiendo exclusivamente PAT classic verificable con `x-oauth-scopes` vacío o `public_repo`, sin `repo`, `read:user`, fine-grained ni OAuth privado. Repositorios y Gists deben demostrar visibilidad pública e identidad consistente; un Gist secreto no es público por ser accesible mediante su ID. La respuesta REST de Gist puede incluir contenido de archivos: se descarta al construir el snapshot y no se consulta raw_url, expone o persiste esa fuente. Las tarjetas de repositorio pueden consultar cinco contadores públicos de un usuario explícito para ese recurso.

WakaTime consulta únicamente su endpoint público de últimos siete días, sin enviar el token GitHub. Exige que el proveedor declare visibles actividad y lenguajes, y datos actualizados; no solicita proyectos, máquinas ni claves. El rango puede carecer de fechas explícitas y se presenta como últimos siete días sin fabricarlas.

Las rutas de perfil y recursos comparten construcción y validación exactas con la vista previa, sin parámetros duplicados/desconocidos. Los SVG son locales, pasivos, escapados y sin `foreignObject`, animaciones ni recursos externos. `APP_URL` sigue siendo un origen HTTPS público propio, nunca derivado de Host. Sin él se permite revisar localmente el mismo Markdown y se bloquea exportar tarjetas.

### MIT, procedencia y mantenimiento

Aplicar MIT al código propio con el titular autorizado. Conservar el texto de la licencia en `LICENSE` y declarar MIT en el paquete. Las adaptaciones de Extended conservan copyright, permiso y revisión `0506c4c0e0acab7be096be48d0d59d50852d811f`; las fuentes, iconos y dependencias conservan sus condiciones originales. Los aportes propios se reciben bajo MIT sin cesión adicional de titularidad.

Mantener avisos completos, procedencia de los archivos copiados y un inventario reproducible de dependencias instaladas. `licenses:generate` y `licenses:check` hacen visibles avisos ausentes o desactualizados; no certifican compatibilidad jurídica ni artefactos o plataformas no inspeccionados. La distribución concreta requiere revisar sus componentes y condiciones, incluidas las adicionales de bibliotecas o binarios. Ver [guía open source](../open-source.md).

Solo incorporar proyectos con mantenimiento activo comprobado en fuentes oficiales. El proyecto original anunciado sin mantenimiento queda excluido; se evalúa Extended por su propio repositorio. Las adaptaciones locales requieren revisar cambios del origen y no se actualizan automáticamente.

## Alternativas consideradas

- Usar directamente el servicio alojado de Extended: hace depender la política de datos, disponibilidad y parámetros de una instancia externa. Se mantienen consultas y SVG propios.
- Adoptar todo su backend o OAuth privado: amplía permisos, credenciales y operación fuera del alcance público autorizado.
- Habilitar ranking por defecto: transforma una elección expresiva en una evaluación implícita. Se conserva opt-in y explicación.
- Mantener solo dos diseños iniciales: no cubre recursos y opciones utilizables solicitados. La ampliación conserva borradores y tarjetas existentes.
- Aplicar MIT a todos los archivos sin distinción: no puede sustituir derechos o condiciones de terceros. Se conserva su procedencia y licencia.

## Consecuencias y límites

La suite aumenta el número de consultas posibles y exige presupuestos, claves de caché y validación de opciones completos. Los datos pueden diferir de otra instancia por filtros públicos, ventanas temporales y límites declarados. La [matriz compatible](../github-stats-extended.md) registra las capacidades y exclusiones: inglés/español, anchos locales, tema explícito, SVG pasivo y ausencia de compatibilidad universal con las URLs del origen.

MIT permite crecimiento y reutilización comercial conservando avisos; no exige que los derivados se publiquen ni impide todo cambio de licencia del código propio de un derivado. Los README generados conservan los derechos de su contenido. No se promete exclusividad visual ni respaldo de los autores de terceros.

La evidencia de las verificaciones realmente ejecutadas pertenece a [desarrollo](../development.md), sin deducirla de esta decisión.

## Fuentes

- [Revisión fijada de GitHub Stats Extended](https://github.com/stats-organization/github-stats-extended/tree/0506c4c0e0acab7be096be48d0d59d50852d811f).
- [Licencia de Extended](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/LICENSE).
- [Licencia MIT](https://opensource.org/license/mit).
- [Matriz de funciones y documentación oficial por familia](../github-stats-extended.md).
