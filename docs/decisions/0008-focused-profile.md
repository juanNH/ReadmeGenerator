# ADR 0008: Cinco secciones y retiro de módulos de trayectoria

- Estado: aceptada.
- Fecha: 2026-10-19.
- Producto: GitHub Profile Generator.
- Sustituye el alcance de secciones de [ADR 0005](0005-manual-profile-composition.md) y [ADR 0007](0007-simple-profile.md). Conserva las reglas de catálogo e iconos, seguridad, almacenamiento y [navegación](0006-editor-navigation.md) que no contradicen esta decisión.

## Contexto

La revisión del producto confirmó que simplificar campos y conservar formularios anteriores seguía acercando el recorrido a un CV. La petición es retirar conocimientos, estudios y actualidad del producto, también al recuperar borradores. La introducción libre permite contar intereses o actividad personal sin secciones adicionales.

`ProfileDocument` v1 ya contiene nueve IDs y puede tener datos en los módulos retirados. Borrar esos campos al recuperar o guardar destruiría información del navegador y exigiría una migración que no es necesaria para reducir el producto.

## Decisión

El editor y el README ofrecen exactamente cinco secciones opcionales: presentación, tecnologías, proyectos, contribuciones y contacto. No existe una condición de contenido o visibilidad que reactive conocimientos, formación o actualidad. Se retiran sus formularios, opciones de navegación y referencias como funciones disponibles en la interfaz y documentación vigente.

El contrato v1 conserva internamente `knowledge`, `education` y `current`, sus estructuras, visibilidad y posiciones. La lectura sigue validando el documento completo y el guardado conserva esos valores sin editarlos, borrarlos o fusionarlos con presentación. Esta conservación interna no constituye una función de edición heredada.

El generador omite los tres IDs retirados antes de revisar su contenido o enlaces, aunque estén visibles. No producen texto, encabezados, errores `invalid_url` ni `unsupported_module`. Si solo hay contenido retirado, el resultado es `empty_profile`. Las cinco secciones activas conservan sus controles de salida; métricas visible mantiene su error y la acción explícita para ocultarla.

La composición y el arrastre actúan sobre las cinco secciones activas incluidas. Reconstruyen su orden dentro de las nueve posiciones, conservando los espacios de IDs ocultos, retirados y métricas. Se mantiene la separación entre selección, visibilidad y eliminación.

Los documentos ADR anteriores conservan su contexto histórico; sus listas de secciones no describen el alcance actual. La documentación de uso, producto y arquitectura apunta a esta decisión. No se reescribe el historial Git para eliminar decisiones anteriores.

## Alternativas consideradas

| Alternativa                                               | Ventaja                                  | Motivo de la decisión                                                                      |
| --------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------------------------------------------------ |
| Mantener formularios si un borrador ya tiene datos        | Permite editar cualquier campo v1.       | Reintroduce las secciones que se pidió retirar y deja dos recorridos de producto.          |
| Fusionar automáticamente datos retirados con presentación | Reutiliza el contenido visible anterior. | Modifica textos personales sin una decisión de su autor y puede introducir repeticiones.   |
| Eliminar los tres IDs del documento                       | Reduce el esquema.                       | Destruye datos o requiere una migración sin aportar valor al recorrido de cinco secciones. |
| Omitir salida pero validar enlaces retirados              | Reutiliza validación previa.             | Bloquea la exportación por campos que ya no tienen edición ni participación en el README.  |

## Consecuencias

- El producto presenta siempre las mismas cinco secciones, con una introducción libre y tecnologías visuales.
- Un borrador anterior puede generar un README distinto: los módulos retirados dejan de exportarse, pero sus datos permanecen internamente.
- La validación estructural del documento y la validación de salida tienen alcances distintos. El parser conserva los invariantes v1; el generador revisa únicamente las secciones activas y el límite de métricas.
- Mantener compatibilidad interna exige conservar datos retirados al guardar y reordenar, sin activar interfaces o renderers para ellos.
- La verificación debe cubrir borradores con módulos retirados visibles, enlaces inválidos allí, ausencia de salida y conservación de datos y posiciones.

Ver [producto](../product.md), [editor](../editor.md) y [modelo del perfil](../profile-model.md).
