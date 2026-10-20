# ADR 0013: Secciones propias y documento v2 con orden mixto

- Estado: aceptada.
- Fecha: 2026-10-19.
- Actualiza el contrato y almacenamiento de [ADR 0003](0003-profile-document.md) y [ADR 0004](0004-local-readme-editor.md), y amplía la composición de [ADR 0006](0006-editor-navigation.md). Mantiene el retiro de módulos de [ADR 0008](0008-focused-profile.md), la actividad de GitHub y las reglas de salida segura.

## Contexto

El perfil breve necesita permitir contenido personal que no encaje en los cinco formularios fijos, sin recuperar la estructura de un CV ni habilitar un editor de HTML o Markdown libre. Las secciones propias deben poder repetirse, ordenarse entre las existentes y copiarse sin compartir datos con el original.

El documento v1 tiene nueve IDs fijos y `moduleOrder`; no representa instancias repetibles con bloques. Cambiar ese formato exige una versión nueva y una recuperación que conserve el borrador anterior, incluso ante errores de lectura o escritura.

## Decisión

### Documento actual

Usar `ProfileDocument` con `schemaVersion: 2`. Se mantienen `contentLocale`, `data` y `visibility` con las estructuras fijas heredadas. Se agrega `customSections` y `moduleOrder` se sustituye por un único `sectionOrder` mixto:

```ts
type SectionReference =
  { kind: "module"; moduleId: ModuleId } | { kind: "custom"; sectionId: string };
```

El orden incluye cada uno de los nueve IDs fijos y cada instancia personalizada exactamente una vez. Las referencias desconocidas, ausentes o repetidas se rechazan. Las identidades son strings opacos, independientes del título y de los IDs DOM.

El editor mantiene los cinco formularios fijos opcionales y permite crear varias instancias personalizadas. Conocimientos, formación y actualidad no vuelven a tener navegación o salida. Métricas sigue integrada en contribuciones y conserva su referencia interna sin salida independiente. Al reordenar referencias incluidas, las ocultas y retiradas permanecen en sus espacios; cancelar un arrastre conserva el documento anterior.

### Contenido propio

Una instancia contiene `{ id, title, visible, blocks }`. El título es opcional, admite repeticiones y solo produce un encabezado si existe cuerpo útil. Los bloques tienen sus propios IDs y son:

- `paragraph`: texto plano.
- `list`: estilo `unordered` u `ordered` e ítems `{ id, text }`.
- `link`: etiqueta opcional y URL web.

Agregar crea una instancia vacía y visible. Duplicar copia profundamente todos sus bloques e ítems, conserva textos, orden y visibilidad y obtiene IDs nuevos mediante una función recibida. La referencia de la copia queda junto al original. Un fallo al generar identidades no aplica cambios parciales. Editar una copia no afecta a otra instancia.

Ocultar cambia solo su inclusión y conserva datos y posición. Eliminar quita únicamente la instancia y su referencia; la UI pide confirmación cuando hay título o contenido, y conserva las demás secciones y copias. Las acciones de agregar, quitar, convertir y reordenar administran el foco y se anuncian en inglés y español.

Las listas estructuradas y sus ayudas pertenecen únicamente al formulario personalizado. Comenzar la primera línea de un bloque de texto con `- ` permite convertirlo en lista con viñetas; Enter agrega ítems y el último ítem vacío permite continuar como texto. Pegar varias líneas crea ítems. Convertir a texto conserva contenido y marcadores. Los campos de presentación, notas y módulos fijos no incorporan ese comportamiento ni interpretan Markdown libre.

### Recuperación y guardado

Mantener `profileDocumentV1Schema` estricto. `parseProfileDocument` valida v2 o valida v1 y devuelve una migración determinista: conserva sus datos, flags, idioma e IDs, convierte `moduleOrder` en referencias fijas y agrega `customSections: []`. No fusiona, traduce ni inventa contenido. Un v1 con campos adicionales de v2 no se acepta como documento heredado.

El adaptador de navegador lee primero `github-profile-generator.profile.v2`. Solo si falta consulta `github-profile-generator.profile.v1`. La recuperación y migración son de lectura: no escriben al abrir, cambiar idioma o abandonar sin editar. La primera edición guarda en v2 con el guardado diferido existente. La clave v1 se mantiene intacta como original local; ninguna escritura actual ni reinicio confirmado la elimina o sobrescribe.

Un v2 inválido, incompatible o inaccesible no activa un fallback a v1. Se conserva y se permite trabajar en memoria hasta una decisión explícita de iniciar otro borrador. Cancelar conserva ambos valores. Esto evita ocultar cambios recientes tras cargar una copia anterior y no equivale a sincronización o respaldo remoto.

### Generación y seguridad

El generador puro recorre `sectionOrder` y produce el mismo Markdown para vista previa, copia y descarga. Las instancias ocultas se omiten, incluidos sus enlaces inválidos. Los títulos sin cuerpo y los bloques vacíos no generan salida. El cuerpo sin título se exporta sin inventar un nombre.

Todo texto personal se escapa. Las listas omiten ítems vacíos, preservan el orden y sangran las continuaciones según la anchura del marcador, también en numeración de dos dígitos. Los marcadores Markdown equivalentes alternan entre listas emitidas (`+`/`*` y `.`/`)`) para conservar bloques independientes y reiniciar la numeración incluso entre secciones sin título. Las viñetas propias también se distinguen del `-` usado por módulos fijos. No se agrega HTML ni contenido invisible para separarlas. El texto que parezca Markdown o HTML no introduce bloques adicionales.

Los enlaces propios usan la política HTTP/HTTPS compartida, sin credenciales, espacios, controles o barras invertidas. No usan la excepción `mailto:` de Contacto. Un enlace visible inválido bloquea la salida completa y devuelve su ruta original `customSections/{índice}/blocks/{índice}/url`, aunque el orden visual sea distinto. Se mantienen las restricciones de tarjetas, catálogos permitidos, `skipHtml` y ausencia de imágenes arbitrarias o `rehypeRaw`.

## Alternativas consideradas

| Alternativa                                | Ventaja                                  | Motivo de la decisión                                                             |
| ------------------------------------------ | ---------------------------------------- | --------------------------------------------------------------------------------- |
| Repetir módulos fijos sin cambiar v1       | Reutiliza los formularios existentes.    | Los IDs únicos de v1 no representan instancias repetibles ni contenido propio.    |
| HTML o Markdown libre                      | Mayor libertad de formato.               | Amplía entradas y renderizado y no ofrece la edición estructurada solicitada.     |
| Mantener dos órdenes, fijo y personalizado | Reduce cambios en el orden anterior.     | No representa de forma única cómo intercalar las secciones en el README.          |
| Sobrescribir v1 al abrir                   | Simplifica el guardado posterior.        | Cambia el original sin edición y arriesga datos ante problemas de almacenamiento. |
| Usar v1 cuando v2 falla                    | Recupera una copia anterior con rapidez. | Puede ocultar cambios posteriores y aparentar una recuperación correcta.          |

## Consecuencias

- La compatibilidad del formato y la posibilidad de exportar siguen siendo comprobaciones distintas.
- El orden único permite mezclar secciones sin una segunda representación del README.
- Las copias requieren regenerar todas las identidades y separar objetos anidados.
- La conservación de v1 ocupa almacenamiento adicional y proporciona un original local, sin restauración automática sobre un v2 existente.
- Las rutas de errores deben distinguir instancias por índice almacenado y la UI por identidad, sin depender de títulos o posiciones visibles.

Ver [modelo del perfil](../profile-model.md), [editor](../editor.md) y [arquitectura](../architecture.md).
