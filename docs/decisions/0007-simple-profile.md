# ADR 0007: Perfil breve y tecnologías con iconos

- Estado: aceptada.
- Fecha: 2026-10-19.
- Producto: GitHub Profile Generator.
- Amplía [ADR 0005](0005-manual-profile-composition.md) y [ADR 0006](0006-editor-navigation.md). Sustituye la elección anterior de tecnologías sin catálogo ni iconos; conserva el contrato v1, sus políticas de texto y los controles de composición.

## Contexto

El editor de ocho módulos manuales separaba presentación, conocimientos y actualidad, y pedía contexto de uso para tecnologías y varios datos de formación. La revisión del producto identificó repetición y una estructura demasiado cercana a un CV. El objetivo es una presentación personal breve, con libertad para compartir una frase, herramientas o aprendizajes sin completar una trayectoria.

Se revisaron las frases breves de presentación de [GitHub Profile README Generator](https://rahuldkjain.github.io/github-profile-readme-generator/), la selección visual de herramientas de [GPRM](https://gprm.itsvg.in/) y la composición por bloques con vista previa de [Profilinator](https://profilinator.rishav.dev/). Nuestra conclusión de diseño es priorizar una introducción libre, una búsqueda de tecnologías y pocos campos visibles. Las referencias orientan la interacción; no se copian su arquitectura ni sus catálogos completos.

Los borradores existentes ya usan `ProfileDocument` v1 con nueve IDs, datos ocultos, grupos tecnológicos y detalles de formación. Simplificar los formularios no debe borrar, trasladar o fusionar textos personales automáticamente ni exigir una migración.

## Decisión

### Secciones e introducción

Un perfil nuevo ofrece seis secciones: presentación, tecnologías, formación, proyectos, contribuciones y contacto. Conocimientos y actualidad aparecen cuando su visibilidad es verdadera o tienen alguna entrada, incluidas entradas incompletas. Conservan formulario y salida. El filtro pertenece al editor; el núcleo mantiene los nueve módulos, su orden y sus datos.

Presentación muestra nombre opcional y texto libre para describirse, compartir intereses o contar qué se está aprendiendo. La frase de encabezado y ubicación permanecen en detalles secundarios. No se exige repetir información en otras secciones y no se modifica contenido anterior para deduplicarlo.

### Tecnologías

El formulario ofrece un autocompletado por nombre o alias, selección mediante teclado y chips con iconos y acción de quitar. Evita duplicados de las selecciones reconocidas y admite nombres propios fuera del catálogo, con salida textual. Agregar una herramienta no solicita contexto de uso ni crear grupos.

`src/core/technologies` contiene metadatos puros e inmutables de 48 herramientas. Los SVG locales y las URLs públicas corresponden al mismo [commit de Devicon](https://github.com/devicons/devicon/commit/6a37858047b0e8d9c9c0e68f4a071fc410652e89). La licencia MIT se incluye con los archivos y su atribución está en [recursos de terceros](../../THIRD_PARTY_NOTICES.md). La búsqueda no depende de consultas externas y no se agrega una dependencia de paquetes para el catálogo.

El documento mantiene sus grupos, IDs, nombres y contextos v1. Una selección nueva guarda el nombre y contexto vacío; si necesita crear un grupo, lo hace sin nombre. Los grupos y contextos anteriores siguen editables en detalles secundarios y mantienen su salida. El catálogo no agrega URLs personalizables ni campos nuevos al borrador.

### Formación

Una entrada nueva prioriza nombre y tipo opcional: carrera, curso, certificación u otro. El tipo se puede dejar vacío o deseleccionar. Para una carrera se ofrece agregar institución opcional; un valor ya guardado de institución sigue editable aunque cambie el tipo.

Estado, fechas, descripción y enlace solo se muestran en detalles cuando ya existen en el borrador. Un error de URL abre esos detalles y mantiene el campo disponible para revisar y corregir. Los datos se conservan al cambiar el tipo. Las entradas mínimas se exportan en una línea con emoji de tipo, etiqueta traducida, título e institución cuando existan. Los detalles anteriores conservan su salida completa y las fechas siguen siendo texto libre.

### Salida y seguridad

Vista previa, copia y descarga continúan consumiendo el mismo Markdown. Los campos personales siguen siendo texto plano escapado; no se interpreta su HTML o Markdown.

Las tecnologías reconocidas y sin contexto se exportan como etiquetas `img` de 32 × 32. `src` y `alt` provienen exclusivamente del catálogo fijado; no se interpolan atributos desde texto o URLs del perfil. Entradas con contexto o nombres no reconocidos conservan su presentación textual escapada.

La vista previa usa `remarkTechnologyIcons` para reconocer únicamente filas completas que coinciden con ese marcado exacto y convertirlas en nodos de imagen. El componente comprueba la combinación de nombre y URL contra el catálogo y sirve su SVG local equivalente. Mantiene `skipHtml`, la lista de elementos permitidos y la ausencia de `rehypeRaw`. No se habilita HTML libre ni un recorrido para imágenes externas elegidas por la persona.

La navegación, selección, visibilidad y reordenamiento conservan el comportamiento de ADR 0006. No cambian las reglas de almacenamiento, recuperación, métricas visibles o enlaces.

## Alternativas consideradas

| Alternativa                                                                        | Ventaja                                | Motivo de la decisión                                                                         |
| ---------------------------------------------------------------------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------- |
| Mantener los ocho módulos y todos los campos visibles                              | Acceso directo a los datos existentes. | Añade repetición y trabajo para una presentación breve.                                       |
| Eliminar conocimientos y actualidad del documento o fusionarlos en la introducción | Reduce el modelo.                      | Modifica contenido personal y rompe compatibilidad sin necesidad.                             |
| Tecnologías como texto sin iconos                                                  | Generación simple.                     | No satisface la selección visual y con iconos solicitada.                                     |
| Consultar un catálogo remoto durante la búsqueda                                   | Catálogo amplio y actualizable.        | Agrega una dependencia de disponibilidad sin mejorar el recorrido básico.                     |
| Permitir URLs de imágenes o HTML propio                                            | Mayor libertad visual.                 | Amplía la superficie de contenido y validación; el catálogo cerrado cubre el objetivo actual. |

## Consecuencias

- Un perfil breve necesita menos campos y no depende de trayectoria, empleo ni actividad pública.
- La UI inicial y el contrato tienen alcances distintos: seis opciones iniciales y nueve IDs persistidos. Ambos deben describirse con precisión.
- Los borradores anteriores conservan datos y edición sin migración ni modificaciones automáticas de textos.
- El catálogo es finito y requiere mantener metadatos, copias SVG y atribución al actualizarlo. El texto propio permite herramientas no incluidas.
- El README usa URLs externas fijadas y su disponibilidad afecta a los iconos en GitHub; el autocompletado y la vista previa usan datos y SVG locales.
- La excepción de marcado generado exige conservar el reconocimiento exacto y la comprobación nombre/URL. No autoriza aceptar HTML del usuario.
- La comprobación del recorrido debe cubrir selección por teclado, duplicados, nombres propios, iconos permitidos, documentos anteriores, detalles recuperados y corrección de enlaces, además de navegación y orden.

Ver [editor](../editor.md), [arquitectura](../architecture.md) y [modelo del perfil](../profile-model.md).
