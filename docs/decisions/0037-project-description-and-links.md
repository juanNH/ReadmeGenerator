# ADR 0037: Descripción, portada y enlace único de proyectos

- Estado: aceptada.
- Fecha: 2026-10-21.

## Contexto

Los campos separados de participación y tecnologías repetían información que cabe en una descripción corta y alargaban cada tarjeta en el editor. Los proyectos deben seguir siendo fáciles de compartir incluso sin repositorio público. Mostrar varios enlaces secundarios agrega controles y contenido que la persona no quiere incluir en la tarjeta.

## Decisión

El formulario presenta nombre, descripción, una URL opcional para el título e imagen opcional. La ayuda de descripción invita a explicar qué hace el proyecto, cuál fue el aporte o rol y qué tecnologías se usaron. Se retiran los controles independientes de rol y tecnologías para nuevas ediciones, pero se conservan ambos campos en el modelo v2 para no perder información en archivos JSON existentes. El generador incorpora esos valores heredados al texto de descripción.

El modelo v2 agrega `titleUrl?: string` para guardar el único destino que se aplica al título; v1 permanece cerrado. Los perfiles v2 antiguos mantienen su colección `links` sin cambios. Si todavía no tienen `titleUrl`, la app toma el primer enlace útil como destino al generar y lo materializa en `titleUrl` cuando se modifica ese proyecto. Los enlaces secundarios heredados se conservan en JSON, pero no se incluyen en el README. Las redes sociales se agregan en Contacto.

La salida de cada proyecto sigue el orden: título, descripción e imagen de vista previa. El título se enlaza a la única URL configurada. La imagen usa el contrato HTTPS público y accesible de ADR 0033, debajo de la descripción.

La ayuda de imagen recomienda una URL HTTPS pública directa, formato horizontal 16:9 de aproximadamente 960 × 540 px para una visualización de hasta 480 px, menos de 1 MB para imágenes estáticas y GIFs breves y sutiles por debajo de unos 2–3 MB. Estos son consejos para el usuario, no límites que el editor pueda verificar. El editor no sube, redimensiona, comprime ni inspecciona archivos remotos.

El formulario ofrece un único campo de URL para el destino del título. No presenta filas de enlaces secundarios; las redes sociales se agregan en Contacto. Los detalles de ayuda y los controles conservan etiquetas, errores y navegación por teclado.

## Alternativas consideradas

- Eliminar `links` al guardar en el nuevo formato: descartado porque borraría datos de perfiles JSON v2 existentes y haría incompatible la recuperación.
- Subir o comprimir archivos de imagen desde el editor: descartado porque requiere almacenamiento, más dependencias y una política de privacidad adicional.

## Consecuencias

Los perfiles anteriores conservan sus arrays `links` al importarse y descargarse en JSON; el README usa solo el destino principal y omite las demás URLs. Al editar el proyecto, su destino se guarda en `titleUrl`. Los nuevos proyectos tienen una URL única para el título. Las imágenes externas siguen dependiendo de su servidor y la apariencia final la decide GitHub.

Ver [modelo del perfil](../profile-model.md), [editor](../editor.md) y [ADR 0033](0033-project-showcase.md).
