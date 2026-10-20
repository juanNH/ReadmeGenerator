# Vercel Hobby con PAT y sin login

Quienes usan el editor escriben un usuario público y pulsan **Buscar datos**. No se registran ni autorizan una App: el PAT pertenece al operador del servidor. Este primer despliegue no necesita GitHub App, OAuth, base de datos ni servicios adicionales.

Referencias externas revisadas el 20 de octubre de 2026. Hobby permite uso personal no comercial y tiene cuotas; la licencia MIT del repositorio no determina las condiciones del hosting. Ver [Hobby](https://vercel.com/docs/plans/hobby) y [API, cachés y alojamiento](github-api-and-hosting.md).

## Ramas y entornos

| Rama   | Entorno Vercel | Uso                                                                  |
| ------ | -------------- | -------------------------------------------------------------------- |
| `main` | Production     | Versión pública estable y URLs de tarjetas para los README.          |
| `dev`  | Preview        | Preproducción para probar los cambios antes de integrarlos a `main`. |

El nombre `dev` va en minúsculas. En **Project Settings → Environments → Production → Branch Tracking**, elegí `main`. Los pushes a `dev` generan Preview; no hace falta un Custom Environment de pago. La selección de Production Branch se realiza en Vercel, no en `vercel.json`. Ver [ramas de producción y preview](https://vercel.com/docs/git).

Flujo: desarrollar en una rama de trabajo, abrir PR hacia `dev`, revisar su Preview y después abrir PR de `dev` a `main`. Conservar `dev` tras la integración. La CI comprueba pushes a ambas ramas y los PR. La aprobación de publicación, creación de ramas remotas y reglas de protección se administra en GitHub; esta configuración no publica cambios por sí sola.

## 1. Validar la versión

Con Node 24 y pnpm 11.25.0:

```sh
pnpm install --frozen-lockfile
pnpm licenses:generate
pnpm check
pnpm build
pnpm test:e2e:cards
```

Revisá el diff de avisos tras `licenses:generate`: el inventario instalado puede variar entre Windows y Linux. La última suite usa fixtures de proveedores y un token ficticio en un servidor de producción local separado. Comprueba las diez familias, URLs, respuestas HTTP y renderizado; no usa el PAT ni demuestra funcionamiento de Camo remoto. Conserva el perfil del navegador habitual.

La versión revisada debe estar publicada en el repositorio conectado a Vercel. Los `.env*.local`, claves y planes privados se mantienen fuera de Git. `.vercelignore` también los excluye de una subida mediante CLI. Las credenciales se configuran en el panel del hosting.

## 2. Crear el proyecto

1. En una cuenta Hobby, elegí **Add New → Project** e importá el repositorio. Si pertenece a una organización, revisá las restricciones en [límites de Vercel](https://vercel.com/docs/limits).
2. Conservá **Framework Preset: Next.js** y la raíz del proyecto como **Root Directory**.
3. Elegí **Node.js 24.x**, también exigido por `package.json`. Ver [versiones de Node](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).
4. [vercel.json](../vercel.json) fija `corepack pnpm install --frozen-lockfile`, `pnpm build` y Fluid Compute. Conservá la salida automática de Next.js: no es una exportación estática.
5. Agregá `ENABLE_EXPERIMENTAL_COREPACK=1` a Production y Preview para respetar `packageManager`. Ver [Corepack](https://vercel.com/docs/builds/configure-a-build#corepack).
6. Verificá **Production → Branch Tracking: main**. Usá los despliegues de `dev` para preproducción.

Las funciones tienen presupuestos explícitos de 75 segundos para JSON/tarjetas de perfil y 150 para recursos Extended. Repositorio con aportes puede esperar primero un recurso y después estadísticas, hasta unos 120 segundos de presupuestos encadenados. Se conservan los límites de red y colas. Hobby con Fluid admite hasta 300 segundos según la [documentación de duración](https://vercel.com/docs/functions/configuring-functions/duration).

## 3. Variables por entorno

En **Project → Settings → Environment Variables**:

| Variable                       | Production (`main`)                                                           | Preview de `dev`                                                                               |
| ------------------------------ | ----------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`                 | PAT classic dedicado con solo `public_repo`, como el que funciona localmente. | PAT dedicado a pruebas si necesitás búsquedas reales; vacío permite edición manual y muestras. |
| `APP_URL`                      | Origen HTTPS estable de producción.                                           | Vacío para muestras; para probar exportación, origen HTTPS público de preproducción.           |
| `ENABLE_EXPERIMENTAL_COREPACK` | `1`.                                                                          | `1`.                                                                                           |

Las variables de Preview sin filtro se aplican a todas sus ramas. Limitá explícitamente `GITHUB_TOKEN` y el origen de prueba a `dev` si querés que estén disponibles únicamente en esa rama. Si reutilizás el PAT entre entornos, comparten la cuota de la misma cuenta. Ver [entornos](https://vercel.com/docs/deployments/environments) y [variables por rama](https://vercel.com/docs/environment-variables).

`GITHUB_TOKEN` es exclusivo del servidor: no usar `NEXT_PUBLIC_`, URLs ni README. `public_repo` también permite escritura en GitHub, pero este cliente ejecuta únicamente lecturas y filtra datos públicos; rechaza scopes adicionales y credenciales no verificables.

`APP_URL` debe ser un origen como `https://tu-proyecto.vercel.app`, sin ruta, query ni fragmento. No se deduce de `Host` o `VERCEL_URL`. Usá el dominio estable de producción para los README definitivos; los previews temporales no son enlaces duraderos.

Si aún no conocés el dominio, hacé el primer despliegue sin `APP_URL`; después agregá el dominio asignado y ejecutá **Redeploy**. Mientras falta, las tarjetas son una vista previa local y bloquean exportación.

En `dev` podés usar el alias de rama asignado por Vercel como origen de prueba si es público. Si apuntás su `APP_URL` a producción, estarás probando las imágenes de `main`, aunque el editor sea de preproducción. No presentar ese resultado como prueba de las rutas nuevas de `dev`.

## 4. Acceso anónimo

El dominio de `APP_URL` y `/cards/...` deben responder sin sesión, cookies, contraseña o redirecciones de autenticación. Revisá **Deployment Protection**. Podés proteger previews si no necesitás comprobar sus imágenes desde GitHub; una URL protegida no sirve para esa prueba.

Las tarjetas están fuera de `/en` y `/es`; el idioma va en `?locale=en` o `?locale=es`. No agregar rewrites hacia el editor. Las respuestas incluyen `image/svg+xml`, CSP pasiva, `nosniff`, caché pública y `X-Activity-State`.

GitHub usa Camo y necesita acceso público a la imagen. Que funcione en tu sesión o en localhost no alcanza. Ver [diagnóstico oficial de imágenes](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/about-anonymized-urls).

## 5. Comprobar las tarjetas publicadas

Sin token ni cookies del visitante:

```sh
pnpm cards:check --origin https://tu-proyecto.vercel.app --username juannh
```

Eso comprueba las siete tarjetas de perfil. Para incluir opciones y recursos que realmente exportaste, descargá el README desde el editor:

```sh
pnpm cards:check --origin https://tu-proyecto.vercel.app --readme ./README-exportado.md
```

El archivo se lee localmente. Solo se solicitan imágenes de tarjetas del origen indicado; iconos y recursos de otros servidores se ignoran. Se comprueban GET/HEAD anónimos, SVG pasivo, dimensiones, caché y estado. `unavailable` falla aunque responda HTTP 200; `stale` se informa como anterior. Un resultado correcto comprueba las URLs, no publica contenido ni prueba Camo.

Para probar los mismos paths contra una compilación local:

```sh
pnpm cards:check --origin https://tu-proyecto.vercel.app --readme ./README-exportado.md --local-origin http://127.0.0.1:3100
```

`--local-origin` permite únicamente loopback y sustituye el transporte. No comprueba DNS, HTTPS, Vercel, CDN ni GitHub.

## 6. Revisar dentro de GitHub

1. En el editor publicado, buscá el usuario, elegí tarjetas y descargá el README.
2. Pegá el Markdown en una edición de README en GitHub y usá **Preview** antes de guardar.
3. Revisá las imágenes, idioma, colores y contadores. Repositorios/Gists deben existir y ser públicos; WakaTime requiere estadísticas públicas.
4. Si falta una imagen, abrí su URL en una ventana privada y ejecutá `cards:check` con el archivo. HTML de protección o SVG `unavailable` no son tarjetas listas.
5. Tras guardar, revisá la vista pública. Camo puede mostrar una versión anterior: no promete actualización inmediata.

Las maquetas y snapshots de IndexedDB no viajan en el Markdown. Las tarjetas actuales son imágenes dinámicas del servidor/CDN; todavía no existe exportación de SVG estático. La caché del navegador acelera la edición, pero no sirve imágenes a quien lee el README.

## 7. Observar el consumo

Revisá funciones, CPU y transferencia en Vercel y cuota restante en GitHub. Repetir una misma URL permite observar `x-vercel-cache`; la retención es de mejor esfuerzo. Evitá parámetros aleatorios para forzar recargas: crean nuevas claves.

Cada perfil nuevo y cada renovación de tarjetas publicadas puede consumir cuota aunque el autor haya cerrado el editor. Las cachés y límites de servidor son por proceso; no se coordinan globalmente entre instancias. Esta preparación permite comenzar y medir, no garantiza usuarios por hora ni capacidad ilimitada. Los controles distribuidos se evaluarán con tráfico medido.

## Validación de esta preparación

Ejecutada el 20 de octubre de 2026 en Windows, con Node 24 y la compilación de producción:

- `pnpm check`: licencias sin avisos pendientes, lint, tipos, formato, enlaces de 53 documentos, 1.415 pruebas Vitest y 28 del comprobador correctos.
- `pnpm build`: correcto. SWC necesitó acceso a su caché nativa fuera del sandbox de Windows; no se modificaron permisos ni dependencias.
- `pnpm test:e2e:cards`: 19 casos correctos con proveedores controlados. Diez familias en EN/ES, 20 URLs y 20 imágenes decodificadas, XML pasivo y entradas inválidas.
- PAT real, solo lecturas públicas y navegador aislado: descarga de README con ocho tarjetas, 18 contadores y un repositorio público; ocho imágenes decodificadas y ningún error de página o Authorization enviado por el navegador.
- `cards:check` sobre ese archivo: ocho URLs con GET/HEAD, estado `ready`, SVG pasivo y cabeceras de caché correctos. Se sustituyó explícitamente el transporte por loopback; no se contactó el dominio de ejemplo.
- Comprobación del token literal en los 54 archivos de `.next/static`: no encontrado. Esto es una comprobación acotada del build revisado, no una certificación de seguridad.

Todavía no existe un proyecto/dominio público de Vercel para esta revisión. Quedan pendientes la instalación Linux efectiva, el comportamiento de CDN y las imágenes en GitHub/Camo. Los pasos 5 y 6 deben completarse después del primer despliegue.
