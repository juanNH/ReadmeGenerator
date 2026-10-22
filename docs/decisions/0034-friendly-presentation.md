# ADR 0034: Presentación y ubicación

## Estado

Aceptada el 21 de octubre de 2026; revisada el 22 de octubre de 2026 tras la iteración de producto. Complementa y actualiza la salida por defecto de [ADR 0020](0020-presentation-formatting.md).

## Contexto

La presentación debe ser breve y fácil de adaptar a distintas personas. La ubicación o el país sigue siendo un dato útil, y puede formar parte del nombre visible o del titular. Las ayudas de escritura deben orientar sin modificar el contenido de la persona. El nombre y el titular centrados dan una composición inicial más clara, con controles para quienes prefieran otra alineación.

## Decisión

Agregar en `data.presentation.format` de v2 propiedades opcionales y estrictas:

- `locationPlacement?: "displayName" | "headline"` permite colocar la ubicación elegida junto al nombre o al titular con «from» o «desde». Sin esta opción, la ubicación aparece en su propia línea. Si el campo seleccionado está vacío, se muestra en una línea propia; no se emite un conector cuando la ubicación está vacía.

El saludo se escribe como parte del título completo. El placeholder y la ayuda ofrecen una idea editable, pero no anteponen texto automáticamente ni cambian el formato del titular. No se incorpora una propiedad de saludo automático al esquema v2.

El campo de país/ubicación permanece visible en el formulario. La persona puede elegir un país del catálogo —con su bandera local— o mantener una ubicación escrita. El generador no infiere ni agrega un país.

Nombre y titular se centran por defecto, también en el estilo clásico. La sección plegable de formato permite cambiar su nivel y alineación; la elección explícita prevalece sobre el valor inicial. Bio y ubicación independiente mantienen sus alineaciones existentes. No se guardan valores por defecto en el documento.

Las ayudas de redacción aparecen como texto asociado a los campos de nombre, titular y bio. No hay botones que inserten sugerencias ni diálogos para reemplazar texto. La escritura sigue siendo literal y solo cambia cuando la persona edita el campo.

Los placeholders y las ayudas muestran ejemplos completos: «It's great to have you here — I'm Alex Rivera 🌱» y «⌨️ Full-stack developer & Linux enthusiast 🐧», con alternativas en español. Estos ejemplos orientan y nunca se guardan automáticamente.

La ubicación en su propia línea se presenta como «📍 Currently based in 🇦🇷 Argentina» o «📍 Actualmente en 🇦🇷 Argentina». Se conserva también cuando el destino de una ubicación integrada está vacío. La bandera sigue siendo el recurso fijo del país elegido y el texto libre no se transforma en una elección de país.

`displayNameTypography?: "italic" | "monospace"` y `headlineTypography?: "italic" | "monospace"` son elecciones independientes de v2. Ausencia usa el estilo de GitHub y no agrega defaults. Se derivan mediante `em` o `code` con texto escapado, junto con el nivel y la alineación elegidos. La ubicación integrada conserva su propia representación y no se convierte en código. La vista previa, el presupuesto HTML y el JSON de proyecto usan el mismo contrato.

GitHub elimina estilos CSS del HTML de los README, como documenta [GitHub Markup](https://github.com/github/markup). No se ofrecen familias tipográficas arbitrarias, `font-family`, fuentes descargables ni conversiones Unicode que sustituyan el texto. La alternativa de títulos como imágenes exige otro flujo y queda fuera de esta decisión. Los ejemplos de titular toman como referencia recorridos de [GitHub Profile README Generator](https://github.com/rahuldkjain/github-profile-readme-generator) y la colección [Awesome GitHub Profile README](https://github.com/abhisheknaiidu/awesome-github-profile-readme), sin incorporar código ni recursos de esos proyectos.

Los cuatro strings de contenido siguen siendo la fuente de verdad y se conservan exactamente al elegir ubicación o formato, cambiar el idioma, restablecer formato o recuperar un proyecto. No se modifica v1: su esquema continúa rechazando `format`. Lectores v2 anteriores estrictos pueden rechazar las opciones nuevas y deben preservar la fuente protegida. El JSON de proyecto conserva las opciones de formato admitidas.

Los títulos centrados o estilizados y los campos que combinan ubicación se construyen con nodos HAST de texto escapado y, cuando corresponde, la bandera local exacta del catálogo. Se validan con el helper HTML existente y comparten política, presupuesto, árboles y rangos UTF-16 de `customHtml`. No interpretan Markdown, HTML escrito, URLs ni iconos arbitrarios. Si un fragmento combinado supera el límite, `invalid_html` identifica los campos que lo componen. No se truncan datos.

## Alternativas y consecuencias

Agregar el saludo al renderizar puede duplicar un saludo que la persona ya escribió; pedir el título completo conserva el control en un único campo. Las ayudas orientan sin alterar el borrador. La ubicación aparece después de About you en el formulario y se puede colocar junto al nombre, al titular o en una línea separada. Inferir un país desde texto libre podría atribuir una ubicación incorrecta, por lo que la selección del catálogo es explícita.

La salida centrada cambia el aspecto por defecto respecto de documentos anteriores. La persona puede elegir alineación izquierda para recuperar la salida Markdown sencilla o seleccionar derecha. El país es una decisión explícita y no modifica los datos escritos. No se agregan servicios, dependencias ni redacción con IA. GitHub controla el estilo final de los encabezados; la vista previa local sigue siendo aproximada.
