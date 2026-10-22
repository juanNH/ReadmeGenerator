# Modelo del perfil

El núcleo implementa `ProfileDocument` versión 2, un registro de nueve IDs fijos y operaciones puras de creación, validación, visibilidad, orden y secciones personalizadas. El editor ofrece cinco secciones fijas —presentación, tecnologías, proyectos, actividad y contribuciones, y contacto— y varias instancias propias con bloques. Los IDs retirados `knowledge`, `education` y `current` conservan su estructura heredada de v1, sin edición ni salida. Métricas aporta tarjetas a contribuciones, sin navegación separada. Ver [uso del editor](editor.md).

## Ubicación y contrato

- [module-ids.ts](../src/core/modules/module-ids.ts) y [module-registry.ts](../src/core/modules/module-registry.ts): identificadores, orden inicial y registro tipado de esquema, clave de etiqueta y fábrica de datos vacíos. La UI resuelve las etiquetas de secciones activas en el namespace `Modules` EN/ES; el registro no importa componentes.
- [module-content.ts](../src/core/profile/module-content.ts) y [profile-schema.ts](../src/core/profile/profile-schema.ts): esquemas Zod y tipos inferidos del contenido y documento.
- [profile-validation.ts](../src/core/profile/profile-validation.ts), [profile-result.ts](../src/core/profile/profile-result.ts) y [profile-operations.ts](../src/core/profile/profile-operations.ts): parser, errores y operaciones.
- [custom-content.ts](../src/core/profile/custom-content.ts) y [custom-section-operations.ts](../src/core/profile/custom-section-operations.ts): esquemas de bloques y operaciones de instancias personalizadas.
- [render-custom.ts](../src/core/readme/render-custom.ts), [public-image.ts](../src/core/readme/public-image.ts) y [readme-result.ts](../src/core/readme/readme-result.ts): salida de bloques, política sintáctica de imágenes públicas y metadatos derivados de vista previa.
- [render-presentation.ts](../src/core/readme/render-presentation.ts) y [derived-profile-html.ts](../src/core/readme/derived-profile-html.ts): presentación y helper puro que comparte HTML derivado, análisis y presupuesto con las secciones personalizadas.
- [profile-html.ts](../src/core/readme/profile-html.ts): análisis puro de HTML explícito, límites, etiquetas, atributos y políticas de salida.
- [Código literal](../src/core/code/index.ts): catálogo de lenguajes, alias, tokens seguros, límites y delimitadores de código.
- [Catálogo de tecnologías](../src/core/technologies/index.ts) y [proveedores de contacto](../src/core/contact/index.ts): metadatos puros de presentación; no agregan propiedades al documento.
- [Actividad](../src/core/activity/index.ts), [snapshot público](../src/core/activity/activity-types.ts) y [SVG](../src/core/activity/render-card.ts): contratos serializables externos al documento, normalización y renderizado determinista; no consultan GitHub.

`schemaVersion` es el número `2`. `contentLocale` admite `en` o `es` y es independiente del idioma de navegación. `data` y `visibility` conservan los nueve módulos. `customSections` contiene las instancias propias y `sectionOrder` mezcla `{ kind: "module", moduleId }` y `{ kind: "custom", sectionId }`. Cada módulo fijo y cada instancia personalizada deben tener una referencia exactamente una vez, también ocultos o retirados. No existe `moduleOrder` en documentos v2. Opcional significa que no es obligatorio mostrarlos ni completar su contenido, no que sus propiedades puedan omitirse.

La forma JSON usa `""` para texto vacío, `[]` para colecciones vacías y `null` para elecciones enumeradas sin completar. No usa `undefined` ni valores de reloj o azar. Ejemplo completo de `createEmptyProfile("en")`:

```json
{
  "schemaVersion": 2,
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
  "sectionOrder": [
    { "kind": "module", "moduleId": "presentation" },
    { "kind": "module", "moduleId": "knowledge" },
    { "kind": "module", "moduleId": "technologies" },
    { "kind": "module", "moduleId": "education" },
    { "kind": "module", "moduleId": "current" },
    { "kind": "module", "moduleId": "projects" },
    { "kind": "module", "moduleId": "contributions" },
    { "kind": "module", "moduleId": "metrics" },
    { "kind": "module", "moduleId": "contact" }
  ],
  "customSections": [],
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

## Contenido fijo conservado desde v1

Todos los campos están presentes en cada entrada; el texto puede estar vacío. La tabla describe el formato persistido, no opciones del editor. Los esquemas enlazados son la referencia exacta. `knowledge`, `education` y `current` son estructuras retiradas que se preservan internamente.

| Módulo          | Forma del contenido                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `presentation`  | `displayName`, `headline`, `bio`, `location`; solo v2 admite `format` opcional.                                                                   |
| `knowledge`     | `items`: `id`, `title`, `description`.                                                                                                            |
| `technologies`  | `groups`: `id`, `name`, `items`; cada tecnología tiene `id`, `name`, `context`.                                                                   |
| `education`     | `items`: `id`, `kind`, `title`, `institution`, `status`, `startDate`, `endDate`, `description`, `url`.                                            |
| `current`       | `items`: `id`, `kind`, `description`, `url`.                                                                                                      |
| `projects`      | `items`: `id`, `name`, `description`, `role`, `technologies` como array de texto y `links`; v2 agrega `titleUrl?` y `cover?: { url, alt }`.       |
| `contributions` | `items`: `id`, `title`, `description`, `url`.                                                                                                     |
| `metrics`       | `username`, `cards`, `appearance?` y `extended?`; diez tipos sin repetición, apariencia y opciones públicas. Se compone dentro de contribuciones. |
| `contact`       | `links`.                                                                                                                                          |

Los enlaces tienen `id`, `label`, `url`. Cada `id` necesita algún carácter distinto de espacios y debe ser único dentro de su colección; distintas colecciones pueden repetirlos. No se recortan IDs recuperados. Las operaciones que necesitan nuevas identidades reciben una función explícita, sin usar azar propio dentro del núcleo.

Los IDs son strings opacos, no necesariamente UUID: conservarlos al editar o recuperar. Los formularios generan IDs nuevos fuera de `core` y no los usan para construir IDs DOM. `projects.technologies` sigue siendo un array de strings, sin IDs añadidos al formato persistido. Los grupos tecnológicos admiten nombre vacío y cada tecnología, nombre o contexto.

Proyectos genera títulos de nivel tres enlazados a `titleUrl` cuando existe. Los documentos v2 anteriores usan como destino el primer enlace útil de `links`; esa colección se conserva en JSON, pero sus enlaces secundarios no se editan ni se incluyen en el README. Al modificar un proyecto anterior, el formulario conserva su destino principal en `titleUrl`. `role` y `technologies` heredados también se conservan e incorporan a la descripción generada. `titleUrl?` es aditivo solo en v2 y no se inserta al recuperar; v1 mantiene su esquema cerrado. `cover` guarda URL y alternativa exactas, sin valores por defecto al recuperar ni cambios en v1. Su salida exige HTTPS público y descripción alternativa, y deriva una imagen de ancho 480 después de la descripción mediante la política, presupuesto y rangos de `customHtml`; no amplía `customImages`. Ocultar proyectos conserva la portada y excluye su validación de exportación. Ver [ADR 0033](decisions/0033-project-showcase.md) y [ADR 0037](decisions/0037-project-description-and-links.md).

El autocompletado de tecnologías utiliza un catálogo puro de nombres, alias y categorías sugeridas, sin agregar campos al documento. Una selección nueva guarda el nombre y `context: ""` en el grupo elegido o sugerido; una herramienta propia puede usar un grupo sin título. La UI crea IDs nuevos fuera de core. Las operaciones puras reciben una función de IDs, conservan el contenido y resuelven colisiones de IDs de items entre grupos. Quitar categoría solo vacía su nombre; los grupos vacíos sin nombre se conservan internamente. El catálogo resuelve iconos al generar, sin almacenar URLs ni IDs de catálogo. Recuperar o cambiar idioma no reorganiza el documento; organizar es una operación explícita que conserva herramientas, notas y duplicados recuperados.

El catálogo de contacto deriva el proveedor desde `url` después de normalizarla y comparar su hostname con dominios explícitos. No interpreta la etiqueta como proveedor ni agrega un campo persistido para guardar la selección sugerida del formulario. Cada contacto sigue teniendo únicamente `id`, `label` y `url`. Webs propias, portfolios y correos continúan siendo válidos sin pertenecer a un servicio conocido.

Ubicación conserva `presentation.location` como string libre. Una selección explícita del catálogo de países guarda, por ejemplo, `"🇦🇷 Argentina"`. Solo bandera y nombre exacto EN/ES del mismo país permiten generar un SVG decorativo fijo de 20 × 15 junto al nombre escapado; no se incorporan URLs ni campos nuevos al documento. El formulario muestra el nombre con la bandera local y buscar reconoce ambos idiomas y códigos ISO. Escribir otra ubicación quita el prefijo de la elección anterior. Los demás valores, como `"Argentina"`, `"Buenos Aires, Argentina"` o `"🇦🇷 Remote"`, siguen siendo texto íntegro y no se reescriben ni traducen automáticamente. Ver [ADR 0011](decisions/0011-country-and-contact-inputs.md).

### Tarjetas y apariencia opcional en v2

`data.metrics.cards` admite `calendar`, `summary`, `languages`, `panorama`, `monthly`, `extended-stats`, `extended-languages`, `extended-repository`, `extended-gist` y `extended-wakatime`, sin repeticiones. Las tres selecciones de recursos generan una tarjeta por destino configurado, sin requerir `metrics.username`; las siete tarjetas de perfil sí requieren ese usuario válido.

`appearance?` es estricto y conserva `theme?: "light" | "dark"`, `palette?: "forest" | "ocean" | "violet"`, `design?: "classic" | "panels" | "minimal"` y `size?: "compact" | "wide"`. Agrega `preset?` de 79 temas nombrados; `titleColor/textColor/iconColor/borderColor/backgroundColor?` hexadecimales `#RRGGBB`; `backgroundGradient?` con ángulo 0–360 y de 2 a 10 colores; `borderRadius?` 0–30; ancho entero `width?` 700–1200; interlínea entera `lineHeight?` 22–50; `customTitle?` hasta 100 unidades; booleanos `hideTitle/hideBorder/showIcons/textBold?`; `numberFormat?: "short" | "long"` y precisión entera `numberPrecision?` 0–2. No admite CSS, hosts, URLs ni opciones libres.

`extended?` contiene las propiedades opcionales estrictas `stats`, `languages`, `repositories` (hasta doce `owner/name`), `gists` (hasta doce IDs), `wakatimeUsername` y `resourceOptions`. `stats` conserva selección ordenada de 18 IDs, período de commits, año, filtros, inclusión de repositorios propios y ranking opt-in con presentación `letter/percentile/github`. `languages` admite cinco diseños, de 1 a 20 lenguajes, formato bytes/porcentajes, ocultamiento y pesos 0–2 con al menos uno positivo. Los filtros comparten listas acotadas y roles cerrados. `resourceOptions` admite propietario, descripción 1–3 líneas, usuario explícito y cinco contadores de aportes a repositorio; para WakaTime, tiempo/porcentaje, lenguajes ocultos, cantidad 1–20, barra y diseño `default/compact`. Ver los [esquemas exactos](../src/core/activity/extended-options.ts) y [matriz de funciones](github-stats-extended.md).

Ausencia conserva la salida anterior de las tarjetas originales y no se agregan defaults al recuperar, migrar, duplicar o abrir un proyecto. Restablecer apariencia elimina únicamente esa propiedad opcional. V1 conserva exactamente `username/cards` con los tres IDs originales y rechaza las selecciones nuevas, `appearance` y `extended`; su migración no añade esos campos. La ampliación sigue en v2 y en su misma clave de almacenamiento: un lector antiguo estricto puede rechazar un documento nuevo y debe conservar el valor incompatible. Ver [ADR 0023](decisions/0023-customizable-activity-cards.md) y [ADR 0024](decisions/0024-extended-public-suite-and-mit.md).

### Formato opcional de presentación en v2

`data.presentation.format?` es un objeto estricto con seis propiedades opcionales: `displayNameLevel?: 1 | 2 | 3`, `displayNameAlignment?: "left" | "center" | "right"`, `headlineLevel?: 1 | 2 | 3`, `headlineAlignment?`, `bioAlignment?` y `locationAlignment?`, con las mismas tres alineaciones. No incorpora contenido nuevo ni cambia los cuatro strings anteriores. El esquema v1 conserva exactamente su forma original y rechaza `format`; su migración a v2 no agrega esta propiedad.

La ausencia conserva la salida anterior, incluso al recuperar un borrador. Sin una elección, el nombre usa `#`, la frase `##` y la bio y ubicación siguen como texto escapado. Los niveles elegidos producen encabezados Markdown cuando la alineación es izquierda; centro y derecha construyen HTML permitido con texto escapado, sin interpretar el contenido como HTML o Markdown. La ubicación alineada conserva el icono de país de catálogo con su alternativa vacía y dimensiones fijas. La vista previa usa su copia local.

El HTML derivado de presentación comparte la política, los límites y el presupuesto de las secciones personalizadas y HTML explícito. Sus metadatos usan el mismo `customHtml`, con rangos UTF-16 exactos en el Markdown final y `headingLevel: 3`; no se persisten. Los errores `invalid_html` señalan el campo original en `["data", "presentation", "displayName" | "headline" | "bio" | "location"]`. Ocultar la presentación omite su salida y validación de exportación, conservando el contenido y formato. Restablecer formato elimina únicamente el objeto opcional. Ver [ADR 0020](decisions/0020-presentation-formatting.md).

La validación interna conserva las elecciones anulables v1: `education.kind` = `degree`, `course`, `certification`, `other` o `null`; `education.status` = `in-progress`, `completed`, `paused` o `null`; `current.kind` = `work`, `learning`, `interests`, `collaboration` o `null`. Los campos de fecha retirados siguen siendo strings, sin reinterpretarlos. No tienen formulario ni generación. Estas estructuras se conservan al migrar a v2.

## Secciones personalizadas

Cada instancia contiene `id`, `title`, `visible` y `blocks`. El título es texto opcional y no determina su identidad; títulos repetidos son válidos. Admite también `titleLevel?: 1 | 2 | 3` y `titleAlignment?: "left" | "center" | "right"`. Ausencia de esas propiedades conserva el formato anterior, sin agregarlas al recuperar. La visibilidad pertenece a la instancia, fuera del objeto de flags fijos.

| Bloque    | Forma                                                                           |
| --------- | ------------------------------------------------------------------------------- |
| Párrafo   | `{ id, type: "paragraph", text, alignment? }`.                                  |
| Lista     | `{ id, type: "list", style: "unordered" \| "ordered", items: [{ id, text }] }`. |
| Enlace    | `{ id, type: "link", label, url }`.                                             |
| Subtítulo | `{ id, type: "heading", text, level?, alignment? }`.                            |
| Separador | `{ id, type: "divider" }`.                                                      |
| Cita      | `{ id, type: "quote", text }`.                                                  |
| Imagen    | `{ id, type: "image", url, alt }`.                                              |
| HTML      | `{ id, type: "html", source }`.                                                 |
| Código    | `{ id, type: "code", source, language }`.                                       |

La validación es estricta y exige IDs no vacíos y únicos en cada colección: secciones en el documento, bloques en una sección e ítems en una lista. Un `sectionId` desconocido o una instancia sin referencia produce `invalid_reference`; referencias repetidas producen `invalid_order`. La parte discriminada de una referencia permite distinguir una instancia de un módulo aunque sus strings coincidan.

`heading`, `divider`, `quote`, `image`, `html`, `code` y las opciones de formato son ampliaciones aditivas de v2. No cambian las estructuras heredadas ni las claves de almacenamiento; el parser no agrega valores por defecto. `alignment` admite `left`, `center` o `right` y `level`, 1/2/3; no existen en listas, enlaces, citas, imágenes, código ni HTML explícito. La URL y alternativa de una imagen y las fuentes HTML/código son strings que pueden estar incompletos o no ser exportables en un borrador estructuralmente válido. La exportación aplica controles separados. El selector ofrece diez opciones porque `list` tiene dos estilos. Las muestras del selector no forman parte del documento.

`html.source` conserva exactamente el código escrito; no guarda el árbol, los avisos, los problemas ni el HTML filtrado. Los límites del análisis no recortan ese string al leer o guardar. Duplicar conserva la fuente y obtiene un ID de bloque nuevo, como en las demás variantes. El título de la sección y los campos de texto de los otros bloques mantienen su salida escapada. Ver [ADR 0015](decisions/0015-explicit-profile-html.md).

`code.source` también conserva exactamente su escritura, pero nunca se interpreta como HTML ni Markdown. `language: ""` representa texto simple; el catálogo local normaliza alias y acepta un token desconocido seguro de hasta 64 unidades UTF-16. Un lenguaje inválido o un exceso de fuente bloquea exportación con `invalid_code` en `language` o `source`. Se permiten 30.000 unidades por bloque y 150.000 de código visible agregado; ocultos no consumen presupuesto. Fuente vacía exacta se omite, espacios deliberados no. El delimitador exportado tiene más backticks que cualquier racha en la fuente, conservada entre saltos delimitadores.

Sin formato explícito, el título usa `##` y un subtítulo usa `###` con título de sección o `##` sin él. Un nivel elegido produce `#`, `##` o `###`. Izquierda conserva Markdown escapado. Centro/derecha construyen HTML con texto literal escapado, lo validan bajo la política vigente y producen metadatos `customHtml` con rangos exactos, sin guardar etiquetas en los campos de texto. El formato derivado comparte los presupuestos de HTML y reporta `invalid_html` en `title` o `text`. Código y listas mantienen su propia distribución. Ver [ADR 0019](decisions/0019-code-and-formatting.md).

Agregar inserta una instancia vacía y visible después de una referencia explícita o al final. Duplicar copia todo el árbol, conserva textos, orden y visibilidad, genera IDs nuevos para sección, bloques e ítems y coloca la referencia junto al original. No hay objetos anidados compartidos con la copia. Ocultar cambia solo `visible`; eliminar quita esa instancia y su referencia, conservando el orden relativo de las demás.

Las operaciones reciben `createId` desde la UI. Rechazan IDs vacíos o ya usados y limitan los intentos; un fallo devuelve `id_generation_failed` sin cambios parciales. El núcleo no consulta reloj, azar, navegador ni almacenamiento.

## Compatibilidad y migración

`profileDocumentV1Schema` describe el formato antiguo de forma estricta. `migrateProfileV1` conserva contenido, idioma, IDs y visibilidad; convierte cada entrada de `moduleOrder` en una referencia fija, agrega `customSections: []` y devuelve v2. No traduce, deduplica, fusiona ni inventa contenido. Un v1 con propiedades extra de v2 no se acepta como formato heredado.

`parseProfileDocument` valida v2 o valida v1 y devuelve su migración. El adaptador local usa `github-profile-generator.profile.v2` y solo consulta `github-profile-generator.profile.v1` si no existe v2. Recuperar o migrar no escribe: la primera edición guarda v2 y deja la clave v1 intacta como original local. Si v2 está dañado, es incompatible o no se puede leer, no se sustituye por v1 automáticamente. Ver [ADR 0013](decisions/0013-custom-sections.md).

Un lector anterior con una unión estricta de bloques puede rechazar las variantes visuales, HTML, código o propiedades de formato nuevas aunque `schemaVersion` siga siendo `2`; esa ampliación no implica compatibilidad hacia atrás del lector. El comportamiento de recuperación conserva el valor rechazado y no lo reescribe ni sustituye por v1. Los documentos previos sin esas opciones mantienen su forma y salida. Ver [ADR 0014](decisions/0014-custom-visual-blocks.md), [ADR 0015](decisions/0015-explicit-profile-html.md) y [ADR 0019](decisions/0019-code-and-formatting.md).

## API y resultados

| API                                                                                                                   | Contrato                                                                                                                                                      |
| --------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createEmptyProfile(contentLocale: ContentLocale): ProfileDocument`                                                   | Crea datos y arrays independientes en cada llamada, orden inicial y todas las secciones ocultas. Recibe un idioma tipado explícito; no consulta el navegador. |
| `parseProfileDocument(input: unknown): ProfileResult<ProfileDocument>`                                                | Valida v2 o valida v1 y migra a v2. No convierte tipos de contenido ni descarta propiedades desconocidas.                                                     |
| `setModuleVisibility(document: ProfileDocument, moduleId: unknown, visible: unknown): ProfileResult<ProfileDocument>` | Valida identificador y booleano. Conserva contenido y orden.                                                                                                  |
| `reorderSections(document: ProfileDocument, sectionOrder: unknown): ProfileResult<ProfileDocument>`                   | Valida el orden mixto completo y sus referencias; conserva contenido y visibilidad.                                                                           |
| `reorderModules(document: ProfileDocument, moduleOrder: unknown): ProfileResult<ProfileDocument>`                     | Compatibilidad: reordena solo las nueve referencias fijas, conservando las posiciones personalizadas.                                                         |
| `addCustomSection(document, createId, after?)`                                                                        | Agrega una instancia y su referencia.                                                                                                                         |
| `updateCustomSection(document, sectionId, value)`                                                                     | Valida y reemplaza una instancia sin permitir cambiar su identidad.                                                                                           |
| `setCustomSectionVisibility(document, sectionId, visible)`                                                            | Cambia solo su inclusión.                                                                                                                                     |
| `duplicateCustomSection(document, sectionId, createId)`                                                               | Copia completa con IDs nuevos y referencia junto al original.                                                                                                 |
| `removeCustomSection(document, sectionId)`                                                                            | Elimina solo la instancia y su referencia.                                                                                                                    |

Las operaciones de instancias también devuelven `ProfileResult<ProfileDocument>`. `createEmptyProfileV1` permanece como fábrica de compatibilidad; los nuevos borradores usan `createEmptyProfile` y v2.

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

| Códigos                                        | Significado                                                                                           |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `invalid_type`, `invalid_value`                | Tipo incorrecto/campo requerido ausente, o valor no admitido.                                         |
| `unknown_property`                             | Propiedad no declarada; la ruta termina en esa clave.                                                 |
| `unsupported_version`                          | Propiedad propia `schemaVersion` distinta de los números `1` y `2`; si falta, es error de estructura. |
| `unknown_module`, `invalid_order`              | Identificador desconocido en orden/visibilidad, o composición incompleta/repetida del orden.          |
| `invalid_id`, `duplicate_id`, `duplicate_card` | Identificador vacío, identificador repetido en su colección o tarjeta seleccionada más de una vez.    |
| `unknown_section`, `invalid_reference`         | Instancia inexistente o referencias personalizadas que no corresponden al documento.                  |
| `id_generation_failed`                         | No se pudieron generar identidades nuevas válidas; no se aplicó una operación parcial.                |

Ejemplos de rutas: `["data", "projects", "items", 0, "id"]`, `["sectionOrder", 2]`, `["customSections", 0, "blocks", 1, "id"]`, `["schemaVersion"]`. Los argumentos de visibilidad usan `["moduleId"]` o `["sectionId"]` y `["visible"]`.

Las operaciones requieren un documento válido procedente de la fábrica o del parser y validan sus argumentos; `reorderSections` comprueba el documento candidato con su orden mixto. Una aserción de TypeScript sobre datos externos no cumple ese requisito. No mutan el original; pueden compartir ramas no modificadas, por lo que se deben tratar como inmutables. La fábrica produce estructuras independientes y duplicar una instancia copia sus objetos anidados.

## Importación desde Markdown

El importador no modifica el esquema v2. `analyzeReadmeImport(source, contentLocale)` analiza Markdown completo y devuelve secciones candidatas, rangos UTF-16 de la fuente exacta y diagnósticos. `buildImportedProfile(analysis, selectedSectionIds)` acepta identidades válidas de esa propuesta, conserva el orden original y produce un documento validado y generado, o errores sin reemplazo parcial. Sus secciones son personalizadas; las referencias fijas permanecen presentes y ocultas. Los datos ocultos del perfil anterior no se mezclan con el contenido importado.

Los bloques reutilizan `paragraph`, `list`, `link`, `heading`, `divider`, `quote`, `image`, `html` y `code`, sin un bloque de Markdown crudo. El código delimitado o indentado independiente conserva fuente del AST y lenguaje normalizado; metadatos no representables producen aviso. En un contexto HTML abierto o una estructura anidada que requiere conservar HTML unido, prevalece esa estructura y se informa la pérdida de metadatos de lenguaje. El HTML convertido se somete a la política existente. El análisis permite 100.000 unidades UTF-16, 6.000 nodos y profundidad 32; HTML y código mantienen sus propios límites. Referencias, anclas, rutas relativas y construcciones incompatibles se revisan antes de aplicar. El respaldo conserva el original exacto aunque el parser normalice saltos de un bloque de código.

El registro de respaldo del adaptador está fuera de `ProfileDocument`: `{ schemaVersion: 1, previousDocument, originalSource }`. Su lectura estricta no escribe ni migra registros incompatibles. Conserva un único perfil anterior completo y el original independiente de la selección. Las descargas no implican una API general de importación de configuración JSON. Ver [ADR 0018](decisions/0018-readme-import-with-backup.md).

## Límites de validación

El parser recibe un valor de JavaScript: no interpreta cadenas JSON ni captura errores de `JSON.parse`. Esa frontera debe controlar fallos de lectura o sintaxis. La única migración implementada es v1 validado a v2; no corrige estructuras incompatibles.

Un borrador vacío y totalmente oculto es válido. La validación del documento no comprueba protocolos de URL, formatos o relaciones de fechas ni seguridad del HTML. Un resultado correcto no autoriza renderizar o exportar sin controles específicos de salida.

[`generateReadme(document, { activityCardBaseUrl? }): ReadmeResult`](../src/core/readme/generate-readme.ts) requiere un documento ya válido y no consulta red ni almacenamiento. Devuelve `{ success: true, markdown, exportIssues?, customImages?, customHtml? }` o `{ success: false, errors }`. Los errores de generación activos son `empty_profile`, `invalid_url`, `missing_image_alt`, `invalid_html`, `invalid_code`, `invalid_username` e `invalid_activity_options`; `unsupported_module` permanece en el tipo por compatibilidad, pero métricas ya no lo genera. Vista previa, copia y descarga comparten el mismo Markdown. Un resultado `success: true` con `exportIssues` permite revisar, pero no autoriza copiar o descargar.

`customImages` solo está presente cuando el resultado correcto contiene bloques `image` válidos. Es `readonly CustomImageSource[]`, con elementos `{ readonly src: string; readonly alt: string }`: URL canónica y texto alternativo plano normalizado que coinciden exactamente con el nodo del Markdown generado. Conserva orden de salida y repeticiones. No incluye imágenes dentro de HTML, iconos de catálogo, tarjetas ni imágenes de secciones ocultas; no se persiste ni se devuelve en errores. La vista previa usa estos pares para permitir exclusivamente las imágenes Markdown explícitas del mismo resultado.

`customHtml` solo está presente cuando el resultado correcto contiene HTML exportable. Es `readonly CustomHtmlFragment[]`, con elementos `{ readonly html: string; readonly tree: Root; readonly start: number; readonly end: number; readonly headingLevel: 3 | 4 }`. `html` es una unidad canónica completa dentro de un `div`; `markdown.slice(start, end)` debe coincidir exactamente con ella. `tree` es el árbol HAST permitido equivalente en estructura y contenido, reutilizado por la vista previa sin volver a parsear HTML. La serialización codifica LF/CR como entidades `&#10;`/`&#13;` para impedir que líneas vacías reactiven Markdown; el árbol conserva los saltos reales, por lo que `toHtml(tree)` no necesita coincidir byte a byte con `html`. Los índices son desplazamientos UTF-16 en el Markdown final, con intervalo `[start, end)`, y conservan orden y repeticiones. `headingLevel` vale `4` para el cuerpo personalizado si hay título de sección o `3` si no lo hay; el título alineado y las unidades de presentación usan `3`. Esto adapta la semántica de la vista previa; no cambia h1–h6 del HTML exportado. No hay árbol o metadatos persistidos ni fragmentos de secciones ocultas o resultados con errores.

Las tarjetas visibles y seleccionadas necesitan un usuario normalizable de GitHub. Se admite `@` inicial y espacios exteriores al normalizar; se guarda el texto del borrador y el generador usa el login canónico en URLs. Un usuario inválido produce `invalid_username` en `["data", "metrics", "username"]`. Métricas visible sin tarjetas no exige usuario ni produce contenido.

`activityCardBaseUrl` recibe un origen HTTPS público explícito, sin puerto, credenciales, ruta, query, fragmento ni dirección local. Sin origen válido se generan rutas locales para revisar las tarjetas y `exportIssues: [{ code: "activity_not_configured", path: ["data", "metrics"] }]`. Los consumidores deben bloquear exportación, sin sustituir el Markdown por otra representación ni publicar URLs de localhost. Desmarcar tarjetas elimina ese requisito para los aportes manuales.

`knowledge`, `education` y `current` se omiten siempre, aunque su visibilidad sea verdadera. Su contenido y enlaces no generan salida, `invalid_url` ni `unsupported_module`. La lectura y escritura conservan esos datos y la validación estructural sigue comprobando su forma. Un documento con contenido únicamente en módulos retirados devuelve `empty_profile`: no habilita una salida heredada.

## Reglas de salida

- Respetar `sectionOrder` y el orden de cada colección, sin ordenar por nombre o actividad. La UI reordena referencias incluidas, fijas o personalizadas, manteniendo las posiciones ocultas, retiradas y de métricas.
- Actividad y contribuciones tiene inclusión efectiva `visibility.contributions || visibility.metrics`. El generador compone ambas fuentes en el slot `contributions` y omite el slot `metrics`. Los aportes manuales solo participan con su flag; las tarjetas, con el de métricas y una selección no vacía. La casilla global apaga ambos flags al ocultar; al mostrar activa contribuciones y métricas si conserva tarjetas. Esta coordinación de UI no modifica los esquemas ni las operaciones puras de visibilidad de un único ID.
- Omitir entradas completamente vacías y encabezados sin contenido. Proyectos y contribuciones admiten contenido manual sin enlaces.
- Las instancias personalizadas solo salen cuando `visible` es verdadero. Un título sin bloques útiles no produce un encabezado; un cuerpo útil sin título sale sin inventar nombre. Los párrafos conservan sus separaciones; las listas omiten ítems vacíos, numeran los exportables y sangran las continuaciones según su marcador. Las listas estructuradas solo pertenecen a las instancias personalizadas, no al texto de módulos fijos.
- Sin formato explícito, un subtítulo propio no vacío genera `###` si la sección tiene título o `##` si no lo tiene; un nivel elegido usa 1/2/3. El texto se normaliza en una línea y se escapa; centro/derecha producen una unidad HTML derivada permitida. Un separador genera `---` y cuenta como contenido explícito. La cita escapa su texto y antepone `>` a todas sus líneas, incluidas las separaciones entre párrafos. Los bloques de texto vacíos se omiten.
- Una imagen completamente vacía se omite. Si hay descripción pero no una URL admitida, devuelve `invalid_url` en `["customSections", índice, "blocks", índice, "url"]`; una URL sin alternativa normalizada devuelve `missing_image_alt` en la ruta terminada en `alt`. Puede devolver ambos errores cuando ambos campos requieren corrección. No devuelve un README parcial. Una instancia oculta no aporta errores ni `customImages`.
- Un bloque HTML vacío se omite. Una fuente no vacía con problemas de URL, alternativa ausente, estructura, contenido útil o límites produce `invalid_html` en `["customSections", índice, "blocks", índice, "source"]`, sin resultado parcial. Los avisos por filtrado o reparación no son por sí mismos errores. La fuente original permanece en el documento y las secciones ocultas no se analizan ni aportan fragmentos.
- Un grupo tecnológico solo aporta su encabezado si tiene alguna tecnología exportable. Las tecnologías aceptan nombre, contexto o ambos. Un nombre o alias reconocido genera un icono decorativo y nombre visible desde el catálogo permitido; las entradas propias y los contextos producen texto escapado. No hay puntuaciones de dominio ni organización automática al generar.
- Omitir los tres IDs retirados antes de revisar su contenido, sin alterar sus datos o visibilidad.
- Escapar texto plano para Markdown y HTML. Traducir únicamente etiquetas generadas por `contentLocale`, sin traducir los textos del perfil.
- Compartir HTTP/HTTPS absoluto para enlaces de contenido, sin credenciales, espacios, controles ni barras invertidas. `mailto:` con un solo buzón ASCII sin parámetros solo se admite en contacto.
- Una URL opcional vacía es válida. Las filas de enlaces de contacto y proyectos se omiten si ambos campos están vacíos; una etiqueta sin URL válida produce un error. Una URL válida sin etiqueta muestra el nombre de un servicio reconocido de contacto o la dirección en los demás casos.
- Una URL proporcionada e inválida en una sección activa y visible bloquea toda la salida. Por ejemplo, `["data", "contributions", "items", 0, "url"]`, `["data", "projects", "items", 0, "links", 1, "url"]` o `["customSections", 1, "blocks", 2, "url"]`. Los índices de secciones propias corresponden a su almacenamiento, aunque el orden visual sea diferente. Sus enlaces usan la misma política web, sin `mailto:`. Los datos ocultos o retirados no participan. No generar un archivo parcial silenciosamente.

Los iconos tecnológicos exportados son etiquetas `img` decorativas de 20 × 20, con `alt=""` y `src` construido exclusivamente desde los metadatos de [tecnologías](../src/core/technologies/index.ts), seguidas del nombre visible escapado. Sus 358 entradas referencian Devicon, Simple Icons y Lobe Icons fijados a commits. La vista previa conserva compatibilidad con los tokens anteriores de 32 × 32. No hay URLs de iconos personalizados ni niveles de habilidad; algunos productos comparten una marca de familia documentada. Ver [ADR 0012](decisions/0012-technology-categories.md).

Contacto agrega iconos decorativos de 20 × 20 con `alt=""` desde sus 13 proveedores de [contacto](../src/core/contact/index.ts). La marca depende de una URL admitida y un hostname explícito; no se asigna a dominios parecidos, subdominios arbitrarios o puertos no estándar. La etiqueta escapada conserva el nombre accesible del enlace. Una dirección propia o un correo sin proveedor se exporta como texto enlazado, sin imagen externa elegida por la persona.

Una ubicación que coincide con una selección del [catálogo de países](../src/core/location/index.ts) agrega una bandera decorativa de 20 × 15 con `alt=""` junto al nombre escapado. Su URL está fijada en el catálogo, sin atributos provenientes de campos personales. Cualquier otro valor conserva su salida de texto.

Los campos personales ordinarios nunca se interpolan como atributos HTML. La vista previa reconoce tokens exactos del marcado generado y verifica URL permitida y alternativa vacía para iconos decorativos de tecnología/contacto; comprueba también el nombre alternativo en los tokens tecnológicos anteriores. Solo usa los SVG locales equivalentes. Las filas tecnológicas se adaptan al ancho disponible; ese estilo de interfaz no se incrusta en el README. Los fragmentos explícitos de `customHtml` tienen su propia validación de rangos y árbol. El HTML restante sigue descartado con `skipHtml`, sin `rehypeRaw` ni `dangerouslySetInnerHTML`. Las licencias y procedencia están en [recursos de terceros](../THIRD_PARTY_NOTICES.md).

Los bloques `image` generan imágenes Markdown con alternativa escapada y destino delimitado por `<` y `>`. [`normalizePublicImageUrl`](../src/core/readme/public-image.ts) admite HTTPS con nombre de dominio de sintaxis pública, sin direcciones IP, hosts locales o sufijos privados conocidos, credenciales, fragmentos ni puerto no estándar. Se admiten query, puerto HTTPS predeterminado y rutas sin extensión. No se aceptan direcciones HTTP, relativas, `file:`, `blob:` o `data:`. La misma política se aplica a `img` dentro de HTML explícito. Es una validación sintáctica: no resuelve DNS ni verifica contenido, disponibilidad o duración del enlace. El recurso debe estar alojado por separado; exportar el README no lo publica ni lo copia.

La vista previa exige coincidencia exacta de `src` y `alt` con `customImages` y vuelve a verificar la política HTTPS. Su carga ocurre mediante un `img` directo en el navegador con `loading="lazy"`, `decoding="async"` y `referrerPolicy="no-referrer"`, sin proxy ni optimizador del servidor. Un fallo de carga produce una alternativa visual temporal con descripción y enlace; no modifica el borrador ni cambia la validez de exportación. Escribir sintaxis de imagen en un párrafo, cita, título o enlace sigue produciendo texto escapado.

Las tarjetas son imágenes Markdown desde `/cards/github/{username}/{card}.svg?locale={locale}` o `/cards/extended/{repository|gist|wakatime}.svg`, bajo el origen configurado. Las queries contienen idioma, apariencia validada, opciones Extended serializadas y destino público cuando corresponde. La construcción comparte orden y validación exactos: no acepta parámetros duplicados, desconocidos o valores fuera de límites. La vista previa reconoce esas mismas rutas y las resuelve localmente, sin aceptar hosts arbitrarios. Una selección de recursos sin destino o una URL de configuración no representable devuelve `invalid_activity_options` con ruta de campo; no exige el usuario GitHub para un recurso independiente. Los SVG reciben snapshots y opciones explícitos, escapan XML y no ejecutan scripts ni cargan recursos externos.

`panorama` compone calendario, resumen y lenguajes con notas de alcance; `monthly` suma días UTC sin extrapolar meses parciales. Las adaptaciones Extended conservan atribución MIT y usan snapshots propios obtenidos mediante clientes públicos de esta aplicación. El ranking opcional usa seis contadores completos; se omite ante parcialidad o ausencia y no se interpreta como habilidad ni percentil de población observado. Los porcentajes de lenguajes reflejan la fórmula de pesos elegida sobre la muestra; por defecto usa bytes, con restantes agrupados en Otros.

`ExtendedProfileSnapshot` separa 18 métricas `{ value: number | null, scope: "period" | "lifetime" | "snapshot", partial: boolean }` y lenguajes con bytes, cantidad de repositorios y truncamiento. `ResourceSnapshot` es una unión discriminada de metadatos públicos de repositorio, Gist o WakaTime; WakaTime conserva `range: "last_7_days"` y fechas opcionales, sin inventarlas. Son contratos remotos validados y efímeros, sin metadatos de autenticación. El histórico público excluye los recuentos privados anónimos; la actividad básica conserva su política previa de explicarlos cuando se comparten públicamente.

`ActivitySnapshot` contiene usuario, fecha de consulta, período, calendario, resumen, lenguajes y sugerencias públicas. Es un contrato validado de datos remotos, separado de `ProfileDocument`: no se almacena en el borrador. `ActivityResult` distingue éxito con `stale` de errores de usuario, configuración, inexistencia, cuota o indisponibilidad. Las sugerencias solo se convierten en datos persistidos cuando la persona las elige; se guardan en la estructura heredada de aportes manuales con un ID nuevo. No hay una segunda fuente de verdad del perfil.

## Análisis de HTML explícito

`analyzeProfileHtml(source: string): ProfileHtmlAnalysis` recibe la fuente exacta y devuelve `html`, `tree`, `notices` y `errors`. Es una función pura de AST, sin navegador, React, red o almacenamiento. Usa `hast-util-from-html` 2.0.3, `hast-util-sanitize` 5.0.2 con esquema explícito y `hast-util-to-html` 9.0.5. El resultado analizado es derivado; no modifica el string de entrada ni se guarda en el perfil.

Admite encabezados h1–h6, párrafos y contenedores, formato inline, listas, citas, código, separadores, enlaces, imágenes, tablas y `details`/`summary`. Conserva alineación izquierda/centro/derecha en elementos permitidos; imágenes aceptan dimensiones de 1 a 2.000 píxeles y ancho de 1 a 100 %. No admite páginas completas, CSS, JavaScript, eventos, `id`, `name`, clases, `srcset`, `picture`, SVG o MathML inline. Los elementos y atributos fuera de la política se filtran con avisos; elementos activos como scripts se eliminan con su contenido.

Los enlaces HTML usan la política HTTP/HTTPS absoluta y necesitan nombre accesible o `aria-label`; `mailto:` sigue reservado a contacto. Las imágenes requieren URL pública HTTPS admitida y atributo `alt` presente, aunque `alt=""` puede indicar una elección decorativa explícita. Las rutas relativas y `#anclas` son errores: no se resuelven contra la aplicación. Un `details` requiere un único `summary` primero y con nombre; listas y celdas deben pertenecer a la estructura admitida. La validación comprueba estas reglas concretas sin certificar accesibilidad completa.

Los límites son 30.000 unidades UTF-16 por bloque, 1.500 nodos y profundidad 32. El generador comprueba además un presupuesto de 150.000 unidades de fuente HTML de secciones visibles antes de analizarlas todas. Excederlos produce `invalid_html` en `source`, sin truncar el borrador. El formato visual derivado comparte estos límites y presupuesto; sus rutas terminan en `title` o `text` y cada unidad se suma antes de analizarla. Los problemas del análisis distinguen tamaño, complejidad, URL, alternativa, estructura y fuente no vacía que queda sin contenido útil. La interfaz explica esos problemas y los avisos de etiquetas, atributos, comentarios y reparaciones; el contrato de generación conserva su código estable `invalid_html`.

El Markdown conserva h1–h6 del HTML permitido y no interpreta Markdown escrito dentro de `source`. La vista previa verifica cada unidad de `customHtml` contra el Markdown completo y crea elementos React de una lista cerrada desde su árbol permitido. No habilita un parser global de HTML ni vuelve a parsear todas las fuentes para mostrar el resultado. GitHub puede aplicar filtros y estilos distintos; no hay garantía de paridad visual. Ver [ADR 0015](decisions/0015-explicit-profile-html.md).

El retiro de módulos se define en [ADR 0008](decisions/0008-focused-profile.md). Las fuentes e iconos están en [ADR 0009](decisions/0009-profile-icons.md); la unión de contribuciones/métricas, en [ADR 0010](decisions/0010-github-activity.md); el contrato actual, las instancias y la migración, en [ADR 0013](decisions/0013-custom-sections.md), ampliado con las variantes visuales e imágenes en [ADR 0014](decisions/0014-custom-visual-blocks.md), HTML explícito en [ADR 0015](decisions/0015-explicit-profile-html.md) y código/formato en [ADR 0019](decisions/0019-code-and-formatting.md). Los ADR anteriores conservan el contexto histórico.

Ver [ADR 0003](decisions/0003-profile-document.md). Referencias funcionales: [Zod: Basics](https://zod.dev/basics) para `safeParse` y `z.infer`; [Zod: API](https://zod.dev/api) para objetos estrictos y esquemas anulables.

## Archivos de proyecto

El archivo de proyecto contiene directamente `ProfileDocument` v2, sin envolverlo en un formato nuevo ni añadir campos derivados. `parseProjectFile` admite v1 estricto y v2 mediante `parseProfileDocument`, y aplica límites de archivo y complejidad antes de aceptar el resultado, incluida la migración. `serializeProjectFile` comprueba estructura y reapertura; no usa el generador del README ni exige contenido exportable. Conserva contenido oculto y heredado, fuentes y opciones ausentes.

El respaldo de apertura de proyecto es un registro del adaptador, fuera del documento: `{ schemaVersion: 1, previousDocument }` en `github-profile-generator.project-backup.v1`. Requiere perfil previo v2 que pueda descargarse y mantiene intacto el respaldo independiente de Markdown y la clave heredada del borrador. Ver [ADR 0021](decisions/0021-project-files-and-recovery.md).
