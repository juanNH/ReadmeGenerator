# ADR 0014: Bloques visuales propios e imágenes HTTPS explícitas

- Estado: aceptada.
- Fecha: 2026-10-19.
- Amplía los bloques de [ADR 0013](0013-custom-sections.md) y sustituye su restricción general de imágenes personales únicamente para el bloque explícito `image`. Mantiene el documento v2, sus claves, la migración v1, el retiro de módulos de [ADR 0008](0008-focused-profile.md), los catálogos permitidos y las reglas de salida sin HTML libre.

## Contexto

Las secciones propias permiten escribir contenido breve fuera de los cinco formularios fijos. La composición necesita opciones visuales reconocibles para separar ideas, destacar una frase y mostrar una imagen ya publicada, sin pedir una trayectoria ni convertir el editor en un documento de HTML o Markdown libre.

GitHub admite imágenes del repositorio o de direcciones externas y describe el texto alternativo como equivalente textual de la imagen. Su guía de README de perfil incluye citas y separadores. Esto permite generar formatos concretos desde campos estructurados, manteniendo el mismo Markdown para vista previa, copia y descarga. Ver [imágenes en GitHub](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#images) y [citas y separadores en un perfil](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/quickstart-for-writing-on-github#adding-a-quote).

Seleccionar un archivo del equipo no lo publica. La aplicación no tiene un servicio de carga de imágenes ni modifica el repositorio de la persona. La exportación debe referenciar un recurso HTTPS alojado por separado y conservar una distinción clara entre dirección admitida y recurso disponible.

## Decisión

### Ampliación aditiva de v2

Agregar cuatro variantes a la unión estricta de bloques de `customSections`:

```ts
type CustomVisualBlock =
  | { id: string; type: "heading"; text: string }
  | { id: string; type: "divider" }
  | { id: string; type: "quote"; text: string }
  | { id: string; type: "image"; url: string; alt: string };
```

Las variantes `paragraph`, `list` y `link` conservan su forma. No se agregan propiedades por defecto a los bloques anteriores ni se cambian las estructuras heredadas, `sectionOrder`, visibilidad, versión o claves de almacenamiento. El formato actual sigue siendo `schemaVersion: 2` y usa `github-profile-generator.profile.v2`. La lectura estricta de v1 y su migración en memoria permanecen iguales; no se reescribe ni elimina el original v1.

Un lector anterior con una unión estricta puede rechazar las variantes nuevas aunque reconozca el número de versión. Esta ampliación no garantiza compatibilidad con ese lector. Ante un valor incompatible se conserva el original y no se sustituye automáticamente con v1. Los documentos anteriores que no usan bloques nuevos conservan estructura y salida.

Las operaciones existentes mantienen identidades opacas y orden. Duplicar copia todos los bloques con IDs nuevos y objetos independientes; las URL y descripciones se conservan como texto. Ocultar conserva el árbol y eliminar quita únicamente la instancia y su referencia.

### Selector y edición

Ofrecer ocho opciones: texto, lista con puntos, lista numerada, enlace, subtítulo, separador, frase destacada e imagen/banner. Las dos listas comparten el tipo `list`. Cada opción tiene una muestra pequeña local decorativa y nombre y descripción accesibles en inglés y español. Las muestras no solicitan recursos externos ni se insertan como contenido personal.

Los campos de un bloque nuevo empiezan vacíos. Un separador no necesita campos adicionales. Agregar enfoca el campo correspondiente o el encabezado del separador; quitar y reordenar conservan un destino estable y las acciones se anuncian en ambos idiomas. Las ayudas de listas siguen limitadas a párrafos y listas del formulario personalizado, sin convertir otros campos en editores de Markdown.

### Markdown generado

- `heading` genera texto escapado en `###` si la sección tiene título, o en `##` si no lo tiene. Se normaliza en una línea y se omite cuando está vacío.
- `divider` genera `---` y cuenta como contenido explícito.
- `quote` escapa el texto y antepone `>` a todas sus líneas, incluidas las separaciones entre párrafos. Una cita vacía se omite.
- `image` genera una imagen Markdown con alternativa escapada y URL delimitada por `<` y `>`, después de validar sus dos campos. No genera HTML ni interpreta etiquetas de la persona.

El título de sección conserva su comportamiento: solo aparece si hay cuerpo útil. Se mantienen el orden de bloques, la sangría de listas y la alternancia de marcadores que separa listas independientes. Los campos de texto siguen escapados; escribir sintaxis de imagen o HTML dentro de ellos no crea contenido visual.

### Política de imágenes y errores

`normalizePublicImageUrl` admite URLs HTTPS con un nombre de dominio de sintaxis pública. Rechaza direcciones IP, hosts locales y sufijos privados conocidos, credenciales, fragmentos, puertos no estándar y caracteres prohibidos por la política web compartida. Admite query, el puerto HTTPS predeterminado y rutas sin extensión de archivo. Rechaza HTTP, rutas locales o relativas y protocolos como `file:`, `blob:` y `data:`.

La validación es únicamente sintáctica: no resuelve DNS, solicita el recurso, comprueba tipo de archivo, garantiza acceso público ni confirma su permanencia. La ayuda pide una dirección directa a una imagen ya publicada que pueda abrirse sin iniciar sesión. Puede ser un banner, una captura o un GIF disponible en esa dirección. Copiar o descargar `README.md` no copia ni publica el recurso.

Una imagen completamente vacía se omite. Si tiene alternativa pero no URL admitida, genera `invalid_url`; una URL sin alternativa normalizada genera `missing_image_alt`. Si ambos campos requieren corrección, se reportan ambos. Las rutas señalan el almacenamiento original:

- `customSections/{índice}/blocks/{índice}/url`.
- `customSections/{índice}/blocks/{índice}/alt`.

Los errores de una sección visible bloquean toda la generación, sin producir un README parcial. Una sección oculta no genera errores ni metadatos de imágenes. La validación estructural admite borradores incompletos y no sustituye esta validación de exportación.

### Metadatos derivados y vista previa

El resultado correcto de `generateReadme` incluye `customImages` solo cuando hay imágenes propias válidas. Es una colección de `CustomImageSource` con `src` canónico y `alt` plano normalizado, exactamente iguales a los valores del nodo del Markdown generado. Mantiene orden y repeticiones. No contiene iconos de catálogo ni tarjetas, no aparece en resultados con errores y no se guarda dentro de `ProfileDocument`.

La vista previa exige coincidencia exacta de `src` y `alt` con esos metadatos del mismo resultado y vuelve a comprobar la política HTTPS. Los iconos, banderas y tarjetas conservan sus excepciones cerradas existentes. Todo otro HTML se omite con `skipHtml`, sin `rehypeRaw`, estilos libres ni scripts. GitHub también sanea el HTML de sus documentos y elimina scripts y estilos en línea; ver [pipeline oficial de marcado](https://github.com/github/markup#github-markup).

Las imágenes personales usan un `img` directo del navegador, con `loading="lazy"`, `decoding="async"` y `referrerPolicy="no-referrer"`. No pasan por proxy, comprobación de red u optimizador del servidor. El navegador contacta al host indicado al mostrarlas; la aplicación no descarga ni aloja esos archivos en su servidor.

Un fallo de carga presenta la descripción, un aviso y un enlace para abrir la dirección. Es estado efímero del componente y no modifica el borrador, el Markdown ni la validez de una URL admitida. Así, un problema temporal del host no convierte una dirección válida en un error persistido ni impide copiar o descargar el README.

## Alternativas consideradas

| Alternativa                                                      | Ventaja                                             | Motivo de la decisión                                                                                                                              |
| ---------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Permitir HTML o Markdown libre                                   | Más libertad de composición.                        | Amplía la entrada y el renderizado fuera de los bloques y controles acordados.                                                                     |
| Aceptar archivos locales sin publicarlos                         | Facilita una vista previa inmediata.                | El archivo no queda accesible desde el README exportado; aparentaría una exportación completa.                                                     |
| Descargar o validar imágenes desde el servidor                   | Centraliza la carga y permite comprobar respuestas. | Introduce solicitudes a hosts elegidos por la persona y operación innecesaria para referenciar una imagen ya publicada.                            |
| Usar el optimizador de imágenes para estos hosts                 | Ofrece transformación de recursos.                  | Requiere que el servidor solicite imágenes personales; se elige carga directa del navegador.                                                       |
| Cambiar a v3 o añadir campos opcionales a los bloques anteriores | Distingue otro formato o concentra variaciones.     | El alcance acordado agrega variantes independientes de v2; se conserva la forma anterior y se documenta el rechazo de lectores antiguos estrictos. |
| Bloquear exportación por un error de carga de vista previa       | Señala un recurso que no respondió en ese momento.  | Confunde disponibilidad temporal con la política de URL y requeriría convertir estado efímero en una regla de exportación.                         |

## Consecuencias

- El perfil puede incorporar formato visual sin pedir datos adicionales de trayectoria.
- El contenido visual conserva edición, duplicación, visibilidad y orden de las secciones existentes.
- La descripción alternativa es un requisito de exportación de imágenes, no contenido inferido.
- Una URL admitida depende del host elegido y puede dejar de funcionar; no se ofrece alojamiento ni comprobación remota.
- Los metadatos de vista previa se derivan del mismo generador y no crean otra fuente persistida del perfil.
- La seguridad de la salida sigue separada de la validación estructural y de los errores de carga del navegador.
- Los lectores antiguos estrictos deben preservar documentos que no reconocen; usar el mismo número de versión no habilita descartar variantes nuevas.

Ver [modelo del perfil](../profile-model.md), [editor](../editor.md) y [arquitectura](../architecture.md). [ADR 0013](0013-custom-sections.md) conserva la decisión histórica de secciones propias y migración.
