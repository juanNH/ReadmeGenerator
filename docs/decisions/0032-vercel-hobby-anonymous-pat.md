# ADR 0032: Vercel Hobby con PAT y tarjetas anónimas

## Estado

Aceptada el 20 de octubre de 2026.

## Contexto

Se necesita preparar un despliegue gratuito, conservando las estadísticas actuales y el acceso sin registro. La caché del navegador facilita editar, pero los README exportan URLs de imágenes alojadas por esta aplicación. El usuario establece `main` para producción y `dev` para preproducción. Todavía no existe un proyecto o dominio de Vercel donde comprobar Camo.

## Decisión

- Conservar el PAT classic actual y sus restricciones públicas. No agregar GitHub App, login ni servicios de almacenamiento.
- Configurar Next.js, Corepack/pnpm con lockfile inmutable y Fluid en `vercel.json`. Mantener Node 24 en el contrato del proyecto.
- Acotar funciones a 75 segundos para JSON/perfil y 150 para recursos. El segundo presupuesto permite encadenar recurso y aportes de repositorio; no amplía los límites de los proveedores.
- Usar Production de Vercel para `main` y Preview para `dev`. La rama de producción y variables por entorno se configuran en el panel. CI verifica ambas ramas y los PR.
- Conservar `APP_URL` HTTPS explícito, SVG autónomo y rutas públicas anónimas con caché. Excluir archivos privados de subidas CLI mediante `.vercelignore`.
- Proporcionar un comprobador de URLs de tarjetas y del README descargado. HTTP 200 no alcanza: `unavailable` es fallo. Separar pruebas deterministas/locales de una comprobación pública en GitHub.

## Alternativas y consecuencias

GitHub App requiere verificar consultas e implementar otro proveedor de credenciales; no es un reemplazo directo demostrado para todas las familias actuales. OAuth contradice el acceso anónimo requerido. Exportar una captura estática eliminaría dependencia del servidor para leerla, pero no es el formato entregado.

El primer despliegue permite medir uso dentro de las condiciones y cuotas Hobby. La caché y los límites RAM siguen siendo por proceso; no garantizan consumo global ni usuarios por hora. El dominio estable, las credenciales y el acceso público deben configurarse antes de considerar verificadas las imágenes dentro de GitHub/Camo. Una compilación local no certifica instalación Linux ni infraestructura de Vercel.

La resolución de `APP_URL` se amplía en [ADR 0036](0036-production-card-origin.md): Production puede usar el dominio estable de Vercel cuando la variable explícita está vacía. La validación sintáctica no sustituye comprobar acceso anónimo a las tarjetas.

Ver [guía de despliegue](../vercel-deployment.md) y [API y alojamiento](../github-api-and-hosting.md).
