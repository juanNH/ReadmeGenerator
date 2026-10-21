# ADR 0036: Origen estable de tarjetas en Vercel Production

## Estado

Aceptada el 20 de octubre de 2026. Amplía la resolución de configuración de [ADR 0010](0010-github-activity.md) y [ADR 0032](0032-vercel-hobby-anonymous-pat.md).

## Contexto

Las tarjetas del editor se dibujan con datos temporales del navegador. Que esa vista previa funcione no demuestra que exista una URL pública para las imágenes del README. La configuración anterior usaba únicamente `APP_URL`: en un despliegue público de Vercel sin esa variable, la vista previa podía funcionar y la exportación permanecía bloqueada.

Vercel documenta `VERCEL_PROJECT_PRODUCTION_URL` como un dominio estable de producción, personalizado o `vercel.app`, sin esquema y disponible en compilación y ejecución. También lo entrega en Preview, por lo que la variable por sí sola no identifica el entorno actual. Fuente oficial revisada el 20 de octubre de 2026: [variables de sistema de Vercel](https://vercel.com/docs/environment-variables/system-environment-variables).

## Decisión

- Conservar `APP_URL` explícito como primera opción para todos los entornos. Un valor no vacío pero inválido bloquea el origen; no se oculta el problema con otra dirección.
- Solo cuando `APP_URL` falta o está vacío y `VERCEL_ENV` es exactamente `production`, anteponer `https://` al dominio puro de `VERCEL_PROJECT_PRODUCTION_URL` y validar mediante la política existente `normalizeActivityBaseUrl`.
- No usar `Host`, datos de la petición, `VERCEL_URL`, `VERCEL_BRANCH_URL`, `NODE_ENV` ni dominios de despliegues temporales como fallback. Preview y local conservan configuración explícita.
- Resolver en el servidor durante la solicitud del editor. Al navegador llega únicamente el origen público validado; secretos y variables de infraestructura siguen en el servidor.
- Conservar una única salida Markdown y `activity_not_configured` cuando falte origen válido. No exportar rutas locales ni Blob URLs. La UI explica que dibujar la vista previa y alojar tarjetas para GitHub requieren recursos distintos.
- Mantener aportes manuales y proyectos JSON independientes de ese requisito. Excluir tarjetas conserva sus opciones y permite exportar el texto manual.

## Alternativas y consecuencias

Exigir siempre `APP_URL` es portable y continúa disponible, pero provoca una configuración duplicada en Production cuando Vercel ya conoce el dominio estable. Usar el dominio efímero o inferir desde la petición puede producir enlaces temporales, protegidos o controlados por el visitante. Quitar el bloqueo exportaría imágenes que GitHub no puede resolver.

La resolución no consulta la red y no prueba DNS, disponibilidad, acceso anónimo, Camo ni credenciales. El operador debe habilitar las variables de sistema de Vercel, conservar públicas las rutas `/cards/...` y comprobarlas según la [guía de despliegue](../vercel-deployment.md). Un dominio personalizado o un cambio de dominio seleccionado por Vercel puede requerir fijar `APP_URL` para controlar qué origen se exporta. Los README ya descargados conservan sus URLs.
