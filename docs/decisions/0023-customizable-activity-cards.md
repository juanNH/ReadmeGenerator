# ADR 0023: Tarjetas de actividad personalizables y adaptaciones de GitHub Stats Extended

- Estado: aceptada para la implementación.
- Fecha: 2026-10-20.
- Producto: GitHub Profile Generator.

## Contexto

La integración de [ADR 0010](0010-github-activity.md) ofrece calendario, resumen y lenguajes mediante SVG propios. Se necesitan más composiciones y opciones visuales, además de incorporar diseños de GitHub Stats Extended, conservando las consultas públicas, el token exclusivo del servidor y la exportación desde el origen configurado.

GitHub Stats Extended publica su código bajo MIT. Esa licencia permite usar, modificar y distribuir el código, también comercialmente, conservando los avisos de copyright y permiso. No equivale a una garantía de disponibilidad de su servicio alojado ni de que todas sus opciones cumplan la política pública de esta aplicación.

## Decisión

### Siete tarjetas con una sola fuente de datos

Conservar `calendar`, `summary` y `languages` e incorporar cuatro selecciones independientes:

| ID                   | Contenido                                                                                                                                              |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `panorama`           | Calendario, resumen del período y lenguajes de los repositorios analizados, con sus alcances diferenciados.                                            |
| `monthly`            | Sumas de las contribuciones diarias del calendario agrupadas por mes UTC, identificando los meses parciales.                                           |
| `extended-stats`     | Adaptación local del diseño de estadísticas de GitHub Stats Extended para commits, PR, issues y revisiones del período disponible.                     |
| `extended-languages` | Adaptación local de su diseño de lenguajes, con porcentajes calculados sobre todos los bytes de la muestra y agrupación de los restantes como «Otros». |

Las siete usan el mismo `ActivitySnapshot` público ya validado. No se agregan consultas, scopes, dependencias de paquetes ni credenciales. El diseño Extended no habilita su suite completa de métricas: no incluye puntuaciones, rankings, niveles de habilidad ni valores que el snapshot actual no provee. Los porcentajes de lenguajes no incorporan tamaños mínimos visuales que alteren su proporción real. Lenguajes sigue describiendo la muestra de código actual y no el período del calendario.

Los aportes con contexto conservan el recorrido existente: título, descripción y enlace manuales, o una sugerencia elegida explícitamente y luego editable. No se publica el borrador en una tarjeta dinámica ni se añaden textos personales a una URL; no se incorpora almacenamiento remoto.

### Apariencia opcional y acotada en v2

`data.metrics` conserva `username` y `cards` y admite `appearance?`, un objeto estricto de propiedades opcionales:

- `theme`: `light` o `dark`.
- `palette`: `forest`, `ocean` o `violet`.
- `design`: `classic`, `panels` o `minimal`.
- `size`: `compact` o `wide`.

Ausencia conserva la salida anterior de las tres tarjetas originales. Recuperar o migrar no agrega defaults; el esquema v1 conserva exactamente sus tres IDs y no admite `appearance`. Es una ampliación aditiva de v2, sin cambiar versión o clave: un lector antiguo estricto puede rechazar la configuración nueva y debe conservar el valor incompatible.

El formulario mantiene todas las tarjetas desactivadas inicialmente, la consulta explícita y el bloque plegable. Ofrece tres muestras locales decorativas de diseño y controles de apariencia. Restablecer apariencia elimina únicamente esa configuración opcional y conserva usuario, tarjetas y aportes. Las muestras no solicitan GitHub ni se guardan como datos reales.

### SVG locales y rutas verificadas

Los renderers puros viven en `src/core/activity`. Las adaptaciones Extended se implementan en `render-extended-card.ts` a partir de `stats.ts` y `top-languages.ts` de `packages/core/src/cards`, fijados al commit `0506c4c0e0acab7be096be48d0d59d50852d811f`. Se conserva la licencia íntegra y el copyright de Anurag Hazra, Abhijit Gupta y martin-mfg en `public/licenses/github-stats-extended.txt`, con procedencia en [recursos de terceros](../../THIRD_PARTY_NOTICES.md).

La aplicación aloja todos los SVG mediante `/cards/github/{username}/{card}.svg`. La query admite únicamente idioma y los presets de apariencia enumerados, sin duplicados, CSS, colores arbitrarios, URLs o parámetros libres. El generador y la vista previa comparten la construcción y validación exactas de esas rutas; la vista previa resuelve localmente el mismo Markdown. Los SVG siguen siendo pasivos, escapados y sin recursos externos.

`APP_URL` mantiene el requisito de origen HTTPS público para exportar tarjetas. Sin él se permite la revisión local y se devuelve `activity_not_configured`; copia y descarga siguen bloqueadas mientras haya tarjetas seleccionadas. No se invoca el servicio alojado de GitHub Stats Extended ni se envía el token o el borrador a otro proveedor.

## Alternativas consideradas

- Usar imágenes del servicio alojado de Extended: reduce la adaptación local, pero introduce disponibilidad externa y una política de consultas que esta aplicación no controla.
- Instalar o desplegar su backend completo: añade operación y capacidades que no necesita el contrato público actual.
- Admitir CSS, colores o URLs libres: amplía la superficie de validación y dificulta conservar rutas y SVG cerrados. Los presets cubren las opciones visuales acordadas.
- Publicar aportes del borrador en tarjetas dinámicas: exige definir persistencia, publicación y retirada de datos personales; el README manual ya permite dar contexto a los aportes.
- Sustituir las tres tarjetas anteriores: cambia borradores existentes sin una elección explícita. Las nuevas selecciones son aditivas.

## Consecuencias y límites

La personalización y las nuevas tarjetas se guardan con el perfil completo y viajan en los archivos de Proyecto. Los snapshots siguen siendo efímeros. Todos los diseños comparten los límites de muestra, período, caché y datos públicos del cliente existente; una composición nueva no aumenta la cobertura de GitHub.

La integración conserva las obligaciones de atribución MIT y registra el origen fijado del código adaptado. No garantiza exclusividad de los diseños propios ni paridad completa con el servicio Extended. La evidencia de las verificaciones ejecutadas se registra en [desarrollo](../development.md).

## Fuentes

- [GitHub Stats Extended, revisión fijada](https://github.com/stats-organization/github-stats-extended/tree/0506c4c0e0acab7be096be48d0d59d50852d811f).
- [Tarjeta de estadísticas de origen](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/cards/stats.ts).
- [Tarjeta de lenguajes de origen](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/packages/core/src/cards/top-languages.ts).
- [Licencia MIT de origen](https://github.com/stats-organization/github-stats-extended/blob/0506c4c0e0acab7be096be48d0d59d50852d811f/LICENSE).
