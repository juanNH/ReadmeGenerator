# ADR 0022: Actividad pública del propietario del token

- Estado: aceptada para la implementación.
- Fecha: 2026-10-20.
- Producto: GitHub Profile Generator.

## Contexto

La integración de [ADR 0010](0010-github-activity.md) exige un PAT classic dedicado, verificable y con permisos acotados. El cliente rechazaba cualquier respuesta cuyo `userViewType` fuera `PRIVATE`. Al consultar la propia cuenta con su token, GitHub puede devolver esa vista y bloquear una consulta válida de actividad pública.

`UserViewType` describe la vista disponible para quien consulta; no es un indicador de que el perfil tenga activado un ajuste de privacidad. `isViewer` identifica si la cuenta consultada coincide con la autenticada. GitHub documenta que las contribuciones privadas e internas requieren `read:user`, scope que el cliente excluye, y que `restrictedContributionsCount` solo puede ser distinto de cero si la persona eligió compartir ese recuento.

## Decisión

Validar `isViewer` como booleano y exigir que `user.login` coincida con el usuario solicitado sin distinguir mayúsculas. Aceptar `userViewType: PUBLIC`; aceptar `PRIVATE` únicamente cuando `isViewer` sea verdadero. Otras vistas `PRIVATE` siguen rechazadas. No usar este enum para inferir o prometer la detección del ajuste de privacidad de un perfil.

Verificar primero `x-oauth-scopes` en cada respuesta: debe estar presente y vacío o ser exactamente `public_repo`. Conservar el rechazo de `repo`, `read:user`, permisos adicionales y credenciales no verificables, incluidos tokens fine-grained. La excepción de propietario no relaja esta frontera.

Conservar los filtros de repositorios públicos propios no forks y de candidatos públicos no restringidos, además de la validación completa del snapshot. No trasladar `isViewer`, `userViewType` ni campos privados al contrato público. Mantener únicamente los recuentos anónimos restringidos que la persona haya hecho públicos.

La corrección no modifica `ActivitySnapshot`, `ProfileDocument`, rutas, dependencias, caché ni generación del README. `GITHUB_TOKEN` sigue siendo exclusivo del servidor y exportar tarjetas requiere el origen HTTPS público configurado en `APP_URL`.

## Alternativas consideradas

- Mantener el rechazo de toda vista `PRIVATE`: conserva el bloqueo al consultar al propietario, sin distinguir el alcance de datos de la vista autenticada.
- Aceptar cualquier vista `PRIVATE`: amplía la aceptación a casos que esta corrección no necesita y pierde la comprobación explícita de propietario.
- Agregar `read:user` o `repo`: contradice la política pública y permite acceso a información que este producto no debe publicar.
- Usar otro token o un proveedor externo: agrega configuración o dependencia para resolver un caso que el cliente actual puede validar.

## Consecuencias y límites

La misma credencial admitida sirve para consultar al propietario y a otras cuentas con vista pública. La garantía de datos públicos combina los scopes verificados, la semántica documentada de contribuciones y los filtros de cada elemento; no depende solo de `userViewType`.

Las respuestas incompletas, con otro usuario, `isViewer` inválido o una vista `PRIVATE` ajena fallan de forma cerrada. Los cambios de semántica de GitHub requerirán revisar esta política. La decisión no afirma una consulta autenticada, despliegue o pruebas ya ejecutadas; esa evidencia se registra en [desarrollo](../development.md).

## Fuentes

- [GitHub GraphQL: User, isViewer y UserViewType](https://docs.github.com/en/graphql/reference/users): identidad de la cuenta consultada y vista autenticada.
- [GitHub GraphQL: ContributionsCollection](https://docs.github.com/en/graphql/reference/users#contributionscollection): alcance de contribuciones privadas/internas y recuentos restringidos compartidos.
- [Scopes de GitHub](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps): alcance de permisos y encabezado de scopes.
