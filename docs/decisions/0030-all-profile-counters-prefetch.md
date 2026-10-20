# ADR 0030: Preparar todos los contadores del alcance actual

- Estado: aceptada; [ADR 0031](0031-browser-persistent-activity-cache.md) agrega conservación temporal en IndexedDB del navegador.
- Fecha: 2026-10-20.
- Producto: GitHub Profile Generator.
- Amplía [ADR 0029](0029-account-first-activity-search.md) y sustituye su precarga de solo seis contadores predeterminados.

## Contexto

Buscar antes de elegir preparaba datos comunes, pero marcar pull requests fusionadas, seguidores u otros contadores seguía solicitando cobertura. El usuario aclaró que la búsqueda inicial debe preparar todos los contadores y que elegirlos después debe ser local. También pidió distinguir las cachés y considerar el consumo ante miles de usuarios.

## Decisión

Buscar prepara el snapshot básico y los 18 contadores Extended, junto con lenguajes. Las opciones actuales de estadísticas y lenguajes llegan a la sesión aunque todavía no haya tarjetas elegidas: se conservan período, año, inclusión de repositorios propios y filtros. La semilla impone todos los IDs para pedir cobertura; no modifica el documento, la selección, el ranking ni los valores por defecto persistidos.

Marcar, quitar, ordenar contadores y personalizar su apariencia usa los datos preparados, sin JSON o SVG HTTP adicional. Los ceros, nulos y valores parciales consultados conservan su significado y no provocan reintentos por tocar una casilla. Los errores permiten reintento explícito. Cambiar usuario, período o filtros define otro alcance; tras activar la cuenta, los faltantes de ese alcance pueden consultarse agrupando cambios durante 300 ms.

Preparar todos los contadores no significa consultar todos los años, filtros posibles o recursos desconocidos. Se mantienen los límites de tiempo, solicitudes, histórico, paginación y memoria. Repositorios, Gists y WakaTime siguen necesitando destinos aplicados y tarjetas elegidas. No se consultan datos privados.

## Costo y caché

Dos JSON del editor no equivalen a dos llamadas a GitHub: el servidor agrupa consultas, pagina y obtiene distintas familias. Precargar todas las métricas puede consumir más tiempo y cuota en la búsqueda inicial que pedir solo las seis predeterminadas. Esta elección prioriza la personalización posterior sin viajes de red, conforme al pedido explícito.

La pestaña conserva datos efímeros por editor; el servidor comparte su RAM solo dentro de cada proceso. Los JSON Extended y de recursos continúan con `no-store`; los SVG públicos conservan encabezados para caché compartida. No se incorpora una caché distribuida ni se demuestra capacidad de tráfico masivo. El token permanece exclusivamente en el servidor y su cuota es compartida. La [guía de API y alojamiento](../github-api-and-hosting.md) detalla estas diferencias.

## Alternativas consideradas

- Mantener seis contadores y cargar los demás al elegir: reduce costo inicial, pero no satisface la interacción solicitada.
- Precargar cada combinación de años y filtros: espacio y consumo no acotados, sin una necesidad de datos concreta.
- Agregar ahora un servicio de caché compartida: decisión de infraestructura pendiente, con posibles cuentas y costos fuera de este alcance.

## Verificación

Comprobar 18 métricas solicitadas aun sin tarjetas, filtros actuales conservados, selección posterior sin red, nuevos alcances con cobertura faltante, errores sin bucles y privacidad. Registrar resultados en [desarrollo](../development.md).
