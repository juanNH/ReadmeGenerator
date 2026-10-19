# Modelo del perfil

El núcleo implementa `ProfileDocument` versión 1, un registro de nueve módulos y operaciones puras de creación, validación, visibilidad y orden. El editor y su persistencia local usan este contrato. El generador puro admite presentación y contacto; los otros siete módulos no tienen generación. Ver [uso del editor](editor.md).

## Ubicación y contrato

- [module-ids.ts](../src/core/modules/module-ids.ts) y [module-registry.ts](../src/core/modules/module-registry.ts): identificadores, orden inicial y registro tipado de esquema, clave de etiqueta y fábrica de datos vacíos. La UI resuelve `labelKey` en el namespace `Modules` EN/ES; el registro no importa componentes.
- [module-content.ts](../src/core/profile/module-content.ts) y [profile-schema.ts](../src/core/profile/profile-schema.ts): esquemas Zod y tipos inferidos del contenido y documento.
- [profile-validation.ts](../src/core/profile/profile-validation.ts), [profile-result.ts](../src/core/profile/profile-result.ts) y [profile-operations.ts](../src/core/profile/profile-operations.ts): parser, errores y operaciones.

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

## Contenido de cada módulo

Todos los campos están presentes en cada entrada; el texto puede estar vacío. Los esquemas enlazados son la referencia exacta.

| Módulo          | Forma del contenido                                                                                                  |
| --------------- | -------------------------------------------------------------------------------------------------------------------- |
| `presentation`  | `displayName`, `headline`, `bio`, `location`.                                                                        |
| `knowledge`     | `items`: `id`, `title`, `description`.                                                                               |
| `technologies`  | `groups`: `id`, `name`, `items`; cada tecnología tiene `id`, `name`, `context`.                                      |
| `education`     | `items`: `id`, `kind`, `title`, `institution`, `status`, `startDate`, `endDate`, `description`, `url`.               |
| `current`       | `items`: `id`, `kind`, `description`, `url`.                                                                         |
| `projects`      | `items`: `id`, `name`, `description`, `role`, `technologies` como array de texto y `links`.                          |
| `contributions` | `items`: `id`, `title`, `description`, `url`.                                                                        |
| `metrics`       | `username`, `cards`; selecciones `calendar`, `summary`, `languages`, sin repetición. No consulta ni genera tarjetas. |
| `contact`       | `links`.                                                                                                             |

Los enlaces tienen `id`, `label`, `url`. Cada `id` necesita algún carácter distinto de espacios y debe ser único dentro de su colección. El núcleo no genera ni recorta identificadores; distintas colecciones pueden repetirlos.

Las elecciones anulables admiten: `education.kind` = `degree`, `course`, `certification`, `other` o `null`; `education.status` = `in-progress`, `completed`, `paused` o `null`; `current.kind` = `work`, `learning`, `interests`, `collaboration` o `null`. Ejemplo de borrador de formación:

```json
{
  "id": "education-1",
  "kind": null,
  "title": "",
  "institution": "",
  "status": null,
  "startDate": "",
  "endDate": "",
  "description": "",
  "url": ""
}
```

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

Ejemplos de rutas: `["data", "education", "items", 0, "id"]`, `["moduleOrder", 2]`, `["schemaVersion"]`. Los argumentos de visibilidad usan `["moduleId"]` y `["visible"]`.

Las operaciones requieren un documento válido procedente de la fábrica o del parser; no lo revalidan completo. Una aserción de TypeScript sobre datos externos no cumple ese requisito. Devuelven documentos nuevos sin mutar el original, con ramas no modificadas compartidas: visibilidad conserva `data` y `moduleOrder`; orden conserva `data` y `visibility`. Tratar los documentos como inmutables; no hay congelación profunda. La fábrica produce estructuras independientes entre llamadas.

## Límites de validación

El parser recibe un valor de JavaScript: no interpreta cadenas JSON ni captura errores de `JSON.parse`. Esa frontera debe controlar fallos de lectura o sintaxis. No hay migraciones implícitas.

Un borrador vacío y totalmente oculto es válido. La validación del documento no comprueba protocolos de URL, formatos o relaciones de fechas ni seguridad del HTML. Un resultado correcto no autoriza renderizar o exportar sin controles específicos de salida.

[`generateReadme(document): ReadmeResult`](../src/core/readme/generate-readme.ts) requiere un documento ya válido. Devuelve `{ success: true, markdown }` o `{ success: false, errors }`, con códigos `empty_profile`, `unsupported_module` o `invalid_url` y rutas de campo. Solo genera presentación y contacto visibles; escapa texto plano y aplica su política de enlaces. Los módulos visibles sin soporte bloquean la salida; los ocultos conservan datos y no participan. Vista previa, copia y descarga comparten ese Markdown. La validación estructural y la posibilidad de exportar son contratos separados.

Ver [ADR 0003](decisions/0003-profile-document.md). Referencias funcionales: [Zod: Basics](https://zod.dev/basics) para `safeParse` y `z.infer`; [Zod: API](https://zod.dev/api) para objetos estrictos y esquemas anulables.
