# Modelo del perfil

El núcleo implementa `ProfileDocument` versión 1, un registro de nueve IDs y operaciones puras de creación, validación, visibilidad y orden. El editor y el generador ofrecen cinco secciones: presentación, tecnologías, proyectos, actividad y contribuciones, y contacto. Los IDs retirados `knowledge`, `education` y `current` conservan únicamente su estructura interna v1, sin edición ni salida. Métricas aporta tarjetas a la sección de contribuciones, sin navegación separada. Ver [uso del editor](editor.md).

## Ubicación y contrato

- [module-ids.ts](../src/core/modules/module-ids.ts) y [module-registry.ts](../src/core/modules/module-registry.ts): identificadores, orden inicial y registro tipado de esquema, clave de etiqueta y fábrica de datos vacíos. La UI resuelve las etiquetas de secciones activas en el namespace `Modules` EN/ES; el registro no importa componentes.
- [module-content.ts](../src/core/profile/module-content.ts) y [profile-schema.ts](../src/core/profile/profile-schema.ts): esquemas Zod y tipos inferidos del contenido y documento.
- [profile-validation.ts](../src/core/profile/profile-validation.ts), [profile-result.ts](../src/core/profile/profile-result.ts) y [profile-operations.ts](../src/core/profile/profile-operations.ts): parser, errores y operaciones.
- [Catálogo de tecnologías](../src/core/technologies/index.ts) y [proveedores de contacto](../src/core/contact/index.ts): metadatos puros de presentación; no agregan propiedades al documento.
- [Actividad](../src/core/activity/index.ts), [snapshot público](../src/core/activity/activity-types.ts) y [SVG](../src/core/activity/render-card.ts): contratos serializables externos al documento, normalización y renderizado determinista; no consultan GitHub.

`schemaVersion` es el número `1`. `contentLocale` admite `en` o `es` y es independiente del idioma de navegación. `data` y `visibility` contienen los nueve módulos; `moduleOrder` los incluye exactamente una vez, también si están ocultos. Opcional significa que no es obligatorio mostrarlos ni completar su contenido, no que sus propiedades puedan omitirse.

La forma JSON usa `""` para texto vacío, `[]` para colecciones vacías y `null` para elecciones enumeradas sin completar. No usa `undefined` ni valores de reloj o azar. Ejemplo completo de `createEmptyProfile("en")`:

```json
{
  "schemaVersion": 1,
  "contentLocale": "en",
  "data": {
    "presentation": { "displayName": "", "headline": "", "bio": "", "location": "" },
    "knowledge": { "items": [] },
    "technologies": { "groups": [] },
    "education": { "items": [] },
    "current": { "items": [] },
    "projects": { "items": [] },
    "contributions": { "items": [] },
    "metrics": { "username": "", "cards": [] },
    "contact": { "links": [] }
  },
  "moduleOrder": [
    "presentation",
    "knowledge",
    "technologies",
    "education",
    "current",
    "projects",
    "contributions",
    "metrics",
    "contact"
  ],
  "visibility": {
    "presentation": false,
    "knowledge": false,
    "technologies": false,
    "education": false,
    "current": false,
    "projects": false,
    "contributions": false,
    "metrics": false,
    "contact": false
  }
}
```

## Estructuras del documento v1

Todos los campos están presentes en cada entrada; el texto puede estar vacío. La tabla describe el formato persistido, no opciones del editor. Los esquemas enlazados son la referencia exacta. `knowledge`, `education` y `current` son estructuras retiradas que se preservan internamente.

| Módulo          | Forma del contenido                                                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `presentation`  | `displayName`, `headline`, `bio`, `location`.                                                                             |
| `knowledge`     | `items`: `id`, `title`, `description`.                                                                                    |
| `technologies`  | `groups`: `id`, `name`, `items`; cada tecnología tiene `id`, `name`, `context`.                                           |
| `education`     | `items`: `id`, `kind`, `title`, `institution`, `status`, `startDate`, `endDate`, `description`, `url`.                    |
| `current`       | `items`: `id`, `kind`, `description`, `url`.                                                                              |
| `projects`      | `items`: `id`, `name`, `description`, `role`, `technologies` como array de texto y `links`.                               |
| `contributions` | `items`: `id`, `title`, `description`, `url`.                                                                             |
| `metrics`       | `username`, `cards`; selecciones `calendar`, `summary`, `languages`, sin repetición. Se compone dentro de contribuciones. |
| `contact`       | `links`.                                                                                                                  |

Los enlaces tienen `id`, `label`, `url`. Cada `id` necesita algún carácter distinto de espacios y debe ser único dentro de su colección. El núcleo no genera ni recorta identificadores; distintas colecciones pueden repetirlos.

Los IDs son strings opacos, no necesariamente UUID: conservarlos al editar o recuperar. Los formularios generan IDs nuevos fuera de `core` y no los usan para construir IDs DOM. `projects.technologies` sigue siendo un array de strings, sin IDs añadidos al formato persistido. Los grupos tecnológicos admiten nombre vacío y cada tecnología, nombre o contexto.

El autocompletado de tecnologías utiliza un catálogo puro de nombres y alias, sin agregar campos al documento. Una selección nueva guarda el nombre de la herramienta y `context: ""`, dentro de los grupos existentes; si no hay grupos, la UI crea uno sin nombre. El catálogo resuelve iconos al generar, pero el borrador no almacena URLs ni IDs de catálogo adicionales. Nombres propios no reconocidos siguen siendo válidos. Grupos y contextos anteriores conservan sus datos y salida.

El catálogo de contacto deriva el proveedor desde `url` después de normalizarla y comparar su hostname con dominios explícitos. No interpreta la etiqueta como proveedor ni agrega un campo persistido para guardar la selección sugerida del formulario. Cada contacto sigue teniendo únicamente `id`, `label` y `url`. Webs propias, portfolios y correos continúan siendo válidos sin pertenecer a un servicio conocido.

Ubicación conserva `presentation.location` como string libre. Una selección explícita del catálogo de países guarda, por ejemplo, `"🇦🇷 Argentina"`. Solo bandera y nombre exacto EN/ES del mismo país permiten generar un SVG decorativo fijo de 20 × 15 junto al nombre escapado; no se incorporan URLs ni campos nuevos al documento. El formulario muestra el nombre con la bandera local y buscar reconoce ambos idiomas y códigos ISO. Escribir otra ubicación quita el prefijo de la elección anterior. Los demás valores, como `"Argentina"`, `"Buenos Aires, Argentina"` o `"🇦🇷 Remote"`, siguen siendo texto íntegro y no se reescriben ni traducen automáticamente. Ver [ADR 0011](decisions/0011-country-and-contact-inputs.md).

La validación interna conserva las elecciones anulables v1: `education.kind` = `degree`, `course`, `certification`, `other` o `null`; `education.status` = `in-progress`, `completed`, `paused` o `null`; `current.kind` = `work`, `learning`, `interests`, `collaboration` o `null`. Los campos de fecha retirados siguen siendo strings, sin reinterpretarlos. No tienen formulario ni generación. Las cinco secciones activas usan el esquema existente y la clave `github-profile-generator.profile.v1`; no hay migración para recuperar borradores anteriores.

## API y resultados

| API                                                                                                                   | Contrato                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createEmptyProfile(contentLocale: ContentLocale): ProfileDocument`                                                   | Crea datos y arrays independientes en cada llamada, orden inicial y todas las secciones ocultas. Recibe un idioma tipado explícito; no consulta el navegador. |
| `parseProfileDocument(input: unknown): ProfileResult<ProfileDocument>`                                                | Valida un borrador completo. No convierte tipos, completa campos ni descarta propiedades desconocidas, tampoco anidadas.                                      |
| `setModuleVisibility(document: ProfileDocument, moduleId: unknown, visible: unknown): ProfileResult<ProfileDocument>` | Valida identificador y booleano. Conserva contenido y orden.                                                                                                  |
| `reorderModules(document: ProfileDocument, moduleOrder: unknown): ProfileResult<ProfileDocument>`                     | Valida una permutación completa y copia el array recibido. Conserva contenido y visibilidad.                                                                  |

```ts
type ProfileResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly errors: readonly ProfileIssue[] };

type ProfileIssue = {
  readonly code: ProfileIssueCode;
  readonly path: readonly (string | number)[];
};
```

Los errores exponen códigos estables y rutas, sin mensajes de Zod ni el valor rechazado. La UI resuelve sus textos. No depender del orden o número exacto de errores.

| Códigos                                        | Significado                                                                                                    |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `invalid_type`, `invalid_value`                | Tipo incorrecto/campo requerido ausente, o valor no admitido.                                                  |
| `unknown_property`                             | Propiedad no declarada; la ruta termina en esa clave.                                                          |
| `unsupported_version`                          | Propiedad propia `schemaVersion` presente con valor distinto del número `1`; si falta, es error de estructura. |
| `unknown_module`, `invalid_order`              | Identificador desconocido en orden/visibilidad, o composición incompleta/repetida del orden.                   |
| `invalid_id`, `duplicate_id`, `duplicate_card` | Identificador vacío, identificador repetido en su colección o tarjeta seleccionada más de una vez.             |

Ejemplos de rutas: `["data", "projects", "items", 0, "id"]`, `["moduleOrder", 2]`, `["schemaVersion"]`. Los argumentos de visibilidad usan `["moduleId"]` y `["visible"]`.

Las operaciones requieren un documento válido procedente de la fábrica o del parser; no lo revalidan completo. Una aserción de TypeScript sobre datos externos no cumple ese requisito. Devuelven documentos nuevos sin mutar el original, con ramas no modificadas compartidas: visibilidad conserva `data` y `moduleOrder`; orden conserva `data` y `visibility`. Tratar los documentos como inmutables; no hay congelación profunda. La fábrica produce estructuras independientes entre llamadas.

## Límites de validación

El parser recibe un valor de JavaScript: no interpreta cadenas JSON ni captura errores de `JSON.parse`. Esa frontera debe controlar fallos de lectura o sintaxis. No hay migraciones implícitas.

Un borrador vacío y totalmente oculto es válido. La validación del documento no comprueba protocolos de URL, formatos o relaciones de fechas ni seguridad del HTML. Un resultado correcto no autoriza renderizar o exportar sin controles específicos de salida.

[`generateReadme(document, { activityCardBaseUrl? }): ReadmeResult`](../src/core/readme/generate-readme.ts) requiere un documento ya válido y no consulta red ni almacenamiento. Devuelve `{ success: true, markdown, exportIssues? }` o `{ success: false, errors }`. Los errores de generación activos son `empty_profile`, `invalid_url` e `invalid_username`; `unsupported_module` permanece en el tipo por compatibilidad, pero métricas ya no lo genera. Vista previa, copia y descarga comparten el mismo Markdown. Un resultado `success: true` con `exportIssues` permite revisar, pero no autoriza copiar o descargar.

Las tarjetas visibles y seleccionadas necesitan un usuario normalizable de GitHub. Se admite `@` inicial y espacios exteriores al normalizar; se guarda el texto del borrador y el generador usa el login canónico en URLs. Un usuario inválido produce `invalid_username` en `["data", "metrics", "username"]`. Métricas visible sin tarjetas no exige usuario ni produce contenido.

`activityCardBaseUrl` recibe un origen HTTPS público explícito, sin puerto, credenciales, ruta, query, fragmento ni dirección local. Sin origen válido se generan rutas locales para revisar las tarjetas y `exportIssues: [{ code: "activity_not_configured", path: ["data", "metrics"] }]`. Los consumidores deben bloquear exportación, sin sustituir el Markdown por otra representación ni publicar URLs de localhost. Desmarcar tarjetas elimina ese requisito para los aportes manuales.

`knowledge`, `education` y `current` se omiten siempre, aunque su visibilidad sea verdadera. Su contenido y enlaces no generan salida, `invalid_url` ni `unsupported_module`. La lectura y escritura conservan esos datos y la validación estructural sigue comprobando su forma. Un documento con contenido únicamente en módulos retirados devuelve `empty_profile`: no habilita una salida heredada.

## Reglas de salida

- Respetar `moduleOrder` y el orden de cada colección, sin ordenar por nombre o actividad. La UI mueve las cinco secciones activas visibles manteniendo las posiciones de IDs ocultos, retirados y métricas dentro de los nueve elementos.
- Actividad y contribuciones tiene inclusión efectiva `visibility.contributions || visibility.metrics`. El generador compone ambas fuentes en el slot `contributions` y omite el slot `metrics`. Los aportes manuales solo participan con su flag; las tarjetas, con el de métricas y una selección no vacía. La casilla global apaga ambos flags al ocultar; al mostrar activa contribuciones y métricas si conserva tarjetas. Esta coordinación de UI no modifica los esquemas ni las operaciones puras de visibilidad de un único ID.
- Omitir entradas completamente vacías y encabezados sin contenido. Proyectos y contribuciones admiten contenido manual sin enlaces.
- Un grupo tecnológico solo aporta su encabezado si tiene alguna tecnología exportable. Las tecnologías aceptan nombre, contexto o ambos. Un nombre o alias reconocido sin contexto genera un icono desde el catálogo permitido; una entrada no reconocida o con contexto produce texto escapado. No hay puntuaciones de dominio.
- Omitir los tres IDs retirados antes de revisar su contenido, sin alterar sus datos o visibilidad.
- Escapar texto plano para Markdown y HTML. Traducir únicamente etiquetas generadas por `contentLocale`, sin traducir los textos del perfil.
- Compartir HTTP/HTTPS absoluto para enlaces de contenido, sin credenciales, espacios, controles ni barras invertidas. `mailto:` con un solo buzón ASCII sin parámetros solo se admite en contacto.
- Una URL opcional vacía es válida. Las filas de enlaces de contacto y proyectos se omiten si ambos campos están vacíos; una etiqueta sin URL válida produce un error. Una URL válida sin etiqueta muestra el nombre de un servicio reconocido de contacto o la dirección en los demás casos.
- Una URL proporcionada e inválida en una sección activa y visible bloquea toda la salida. Por ejemplo, `["data", "contributions", "items", 0, "url"]` o `["data", "projects", "items", 0, "links", 1, "url"]`. Los enlaces de módulos ocultos o retirados no participan. No generar un archivo parcial silenciosamente.

Los iconos tecnológicos exportados son etiquetas `img` de 32 × 32 con `src` y `alt` construidos exclusivamente desde los metadatos de [tecnologías](../src/core/technologies/index.ts). Sus 259 entradas referencian Devicon, Simple Icons y Lobe Icons fijados a commits. No hay URLs de imagen personalizadas ni niveles de habilidad; algunos productos comparten una marca de familia documentada.

Contacto agrega iconos decorativos de 20 × 20 con `alt=""` desde sus 13 proveedores de [contacto](../src/core/contact/index.ts). La marca depende de una URL admitida y un hostname explícito; no se asigna a dominios parecidos, subdominios arbitrarios o puertos no estándar. La etiqueta escapada conserva el nombre accesible del enlace. Una dirección propia o un correo sin proveedor se exporta como texto enlazado, sin imagen externa elegida por la persona.

Una ubicación que coincide con una selección del [catálogo de países](../src/core/location/index.ts) agrega una bandera decorativa de 20 × 15 con `alt=""` junto al nombre escapado. Su URL está fijada en el catálogo, sin atributos provenientes de campos personales. Cualquier otro valor conserva su salida de texto.

Los campos personales nunca se interpolan como atributos HTML. La vista previa reconoce únicamente tokens exactos del marcado generado y comprueba nombre/URL de tecnología o URL permitida/alternativa vacía de contacto para usar el SVG local equivalente. Las filas tecnológicas se adaptan al ancho disponible; ese estilo de interfaz no se incrusta en el README. El resto del HTML sigue descartado con `skipHtml`, sin `rehypeRaw`. Las licencias y procedencia están en [recursos de terceros](../THIRD_PARTY_NOTICES.md).

Las tarjetas son imágenes Markdown generadas desde `/cards/github/{username}/{card}.svg?locale={locale}` bajo el origen configurado. La vista previa reconoce exactamente esas rutas y sus parámetros y las resuelve localmente; no acepta un host de imagen arbitrario ni URLs personales. El SVG recibe `ActivitySnapshot`, tipo de tarjeta, idioma y estado stale explícitos. Usa fechas UTC del snapshot, escapa XML, limita texto y solo acepta colores hex; no ejecuta JavaScript ni carga recursos externos.

`ActivitySnapshot` contiene usuario, fecha de consulta, período, calendario, resumen, lenguajes y sugerencias públicas. Es un contrato validado de datos remotos, separado de `ProfileDocument`: no se almacena en el borrador. `ActivityResult` distingue éxito con `stale` de errores de usuario, configuración, inexistencia, cuota o indisponibilidad. Las sugerencias solo se convierten en datos persistidos cuando la persona las elige; se guardan como entradas manuales v1 con un ID nuevo. No hay migración ni segunda fuente de verdad del perfil.

El alcance activo y la conservación interna están definidos en [ADR 0008](decisions/0008-focused-profile.md). Las fuentes y los iconos de tecnologías/contacto están en [ADR 0009](decisions/0009-profile-icons.md); la unión de contribuciones/métricas y los contratos remotos, en [ADR 0010](decisions/0010-github-activity.md). [ADR 0005](decisions/0005-manual-profile-composition.md) y [ADR 0007](decisions/0007-simple-profile.md) conservan el contexto histórico.

Ver [ADR 0003](decisions/0003-profile-document.md). Referencias funcionales: [Zod: Basics](https://zod.dev/basics) para `safeParse` y `z.infer`; [Zod: API](https://zod.dev/api) para objetos estrictos y esquemas anulables.
