# Editor de README

El editor permite crear un perfil breve con cinco secciones fijas opcionales: presentación, tecnologías, proyectos, actividad y contribuciones, y contacto. También permite agregar varias secciones personalizadas con texto, listas, enlaces, subtítulos, separadores, frases destacadas e imágenes públicas. El recorrido manual funciona sin cuenta ni conexión con GitHub. Actividad permite consultar información pública y elegir tres tarjetas si el servidor está configurado; métricas no tiene sección aparte. No hay asistencia con IA.

## Usarlo

1. Abrí el editor en [inglés](http://127.0.0.1:3000/en/editor) o [español](http://127.0.0.1:3000/es/editor).
2. Elegí qué compartir desde la navegación. Ninguna sección fija está preseleccionada ni es obligatoria. Para un espacio propio, usá «Agregar sección personalizada»: la nueva instancia queda incluida y se enfoca su título opcional. La casilla incluye u oculta y conserva el foco; no cambia por sí sola el formulario que estás configurando.
3. Elegí el nombre de una sección incluida para configurarla. La acción de una sección oculta dice agregar y editar: la incluye y selecciona su formulario. El foco pasa al encabezado del panel de configuración, que indica qué sección estás editando. Completá solo los campos útiles; podés agregar y quitar entradas. Al agregar se enfoca la entrada nueva y al quitar, una vecina o el botón para agregar. Quitar una entrada borra esos datos del borrador.
4. Ordená las secciones incluidas desde su tirador o con Subir/Bajar. Podés usar puntero, tacto o teclado; las instrucciones junto al control explican cómo iniciar, mover, soltar y cancelar. Ocultar una sección conserva sus datos.
5. Elegí el idioma del README. Solo cambia etiquetas generadas, como «Contacto» o «Proyectos»; no traduce tu texto. El selector de idioma de la interfaz es independiente.
6. Revisá la vista previa y los avisos. En pantallas amplias está a la derecha, junto a la configuración. En pantallas angostas, desplegá Secciones cuando necesites elegir otra y alterná Editar/Vista previa. Cuando exista contenido visible válido, copiá el Markdown o descargá `README.md`. Ambas acciones usan el mismo contenido que la vista previa.
7. Para publicarlo, seguí las instrucciones de repositorio de perfil que aparecen junto a la exportación. La aplicación no publica ni modifica GitHub por vos.

Un perfil breve puede estar listo con una sola sección. No necesitás nombre, empleo, proyecto, repositorio ni actividad pública para contar algo sobre vos. La introducción permite incluir intereses, aprendizaje y actualidad sin repetirlos en formularios distintos. Un perfil sin contenido exportable mantiene deshabilitadas copia y descarga.

## Contenido y composición

- **Presentación:** nombre opcional y texto libre. Podés contar qué hacés, qué te interesa o qué estás aprendiendo. La frase de encabezado y la ubicación quedan en detalles secundarios y conservan los valores anteriores.
- **Tecnologías:** buscá por nombre o alias entre 358 herramientas, incluidos frameworks, ORMs, bases de datos, mensajería, infraestructura e IA. Elegí categorías sugeridas o un destino existente; las nuevas selecciones aparecen como chips con icono y nombre. También podés agregar texto propio sin icono. Flechas, Enter y Escape permiten operar las sugerencias con teclado; las herramientas ya elegidas no se agregan otra vez. Los detalles secundarios permiten crear, renombrar y ordenar categorías, mover y ordenar herramientas y editar notas opcionales. Quitar una categoría elimina su título y conserva las herramientas. Recuperar un borrador o cambiar idioma no reorganiza datos; «Organizar por categoría» es una acción explícita que confirma el reemplazo de títulos existentes.
- **Proyectos:** nombre, descripción, participación, tecnologías y enlaces opcionales. Las tecnologías se agregan como campos de texto, sin exigir un repositorio.
- **Actividad y contribuciones:** descripción manual de aportes, revisiones, documentación o comunidad, con título y enlace opcionales. El bloque plegable de GitHub permite consultar un usuario público, elegir calendario, resumen o lenguajes y seleccionar sugerencias de aportes. Ninguna tarjeta está activada al empezar y no hace falta usuario para contar un aporte manual.
- **Contacto:** pulsá «Agregar red social» para crear una entrada y elegí dentro el servicio, portfolio/web propia o correo; luego completá su URL. El selector recibe el foco al agregar y Tab permite avanzar a la dirección. Podés repetir servicios y webs propias, cada uno con URL y nombre independientes. La etiqueta personalizada sigue en detalles opcionales. El catálogo incluye LinkedIn, LeetCode, HackerRank, YouTube, Facebook, Instagram, GitHub, X, Bluesky, DEV Community, Medium, Twitch y Stack Overflow. Cambiar el servicio sugerido no reemplaza la dirección ni el nombre. El icono sigue al dominio validado de la URL; las webs propias y el correo conservan un icono genérico en el formulario y enlaces de texto en el README.

En los detalles opcionales de presentación, Ubicación permite buscar un país por nombre en inglés, español o código de dos letras. Elegir una sugerencia completa el nombre y agrega su bandera. El catálogo incluye 249 países y territorios, con imágenes locales para evitar depender del soporte de emoji del sistema. Podés usar flechas y Enter, cerrar con Escape, o escribir libremente una ciudad o zona horaria sin elegir país. No se detecta tu ubicación ni se modifica texto guardado anteriormente. Cambiar de idioma de interfaz conserva el nombre elegido.

Una sección visible vacía no agrega títulos sin contenido. Un grupo tecnológico sin entradas exportables se omite, aunque tenga nombre. El contenido parcial útil se muestra sin inventar los datos que faltan.

### Secciones personalizadas

Podés agregar varias secciones propias y ordenarlas entre las fijas. Cada una acepta un título opcional y ocho opciones para agregar contenido: texto, lista con puntos (•), lista numerada (1., 2., 3.), enlace web, subtítulo, separador, frase destacada e imagen/banner. El selector muestra pequeñas muestras locales decorativas para anticipar su distribución, con nombre y descripción accesibles en ambos idiomas. Los bloques se agregan sin texto ni imágenes de ejemplo. Los puntos y números de listas se agregan automáticamente: cada campo recibe solo el texto de un elemento. Los títulos repetidos son válidos; la navegación identifica cada instancia sin modificar el texto que aparece en el README. Sin título se exporta el cuerpo; un título sin contenido útil no genera un encabezado vacío.

Los botones de agregar contenido se operan con teclado y enfocan la nueva entrada; el separador, que no tiene campos, enfoca su encabezado. Las flechas permiten ordenar los bloques y sus acciones de quitar borran únicamente ese contenido, conservando un destino de foco para continuar. Agregar, quitar y mover se anuncian en inglés y español. Los enlaces aceptan `http://` y `https://`, con etiqueta opcional; `mailto:` sigue disponible únicamente en Contacto.

El subtítulo crea un encabezado menor dentro de una sección con título (`###`); si no hay título de sección, usa `##` para no saltar esa jerarquía. El separador genera una línea horizontal (`---`). La frase destacada usa una cita Markdown (`>`) y conserva dentro de ella las líneas y párrafos escritos. Escribir HTML o Markdown en esos campos sigue produciendo texto escapado.

En un bloque de texto propio, comenzar la primera línea con `- ` lo convierte en una lista con puntos (•). Enter agrega un ítem; en el último ítem vacío termina la lista y permite seguir con texto. Pegar varias líneas crea varios ítems. «Convertir a texto» conserva el contenido y sus marcadores. Estas ayudas se aplican solo a secciones personalizadas: presentación, notas y campos fijos no interpretan listas ni Markdown libre.

«Duplicar sección» crea una copia independiente de título, bloques, ítems, orden e inclusión, con identidades nuevas. Editar o eliminar esa copia no modifica el original. Ocultar una sección conserva todos sus datos y su posición; «Eliminar sección» borra solo esa instancia y su referencia. Si contiene título o contenido, se pide confirmación; una sección vacía puede quitarse directamente. Después se enfoca una sección vecina o el panel para continuar.

### Imágenes y banners propios

Elegí «Agregar imagen / banner» y completá:

- **URL pública de la imagen:** una dirección HTTPS directa a un recurso ya alojado, visible sin iniciar sesión. Se admiten query y direcciones sin extensión de archivo; no se verifica el formato real del recurso.
- **Descripción de la imagen:** texto alternativo que cuenta qué muestra. Es necesario para exportar una imagen con URL y no se interpreta como HTML o Markdown.

La política acepta dominios con sintaxis pública y rechaza direcciones IP, hosts locales o privados conocidos, credenciales, fragmentos y puertos no estándar. La validación es sintáctica: no consulta DNS, no solicita la imagen para comprobarla y no garantiza disponibilidad. Una URL inválida o una descripción sin URL señala el campo de dirección; una URL sin descripción señala el texto alternativo. Una imagen completamente vacía se omite. Los errores de una sección oculta no bloquean el README.

La aplicación no sube archivos ni aloja las imágenes propias. Una ruta del equipo, `blob:`, `data:`, `assets/banner.png` o elegir un archivo local no genera una dirección exportable. Para usar una imagen del repositorio, primero publicala y obtené una URL HTTPS directa que cumpla la política. El archivo debe seguir disponible para que GitHub lo muestre; copiar o descargar el README no copia el recurso.

La vista previa carga la imagen directamente desde su host en el navegador, con carga diferida, decodificación asíncrona y sin enviar referrer. No usa proxy ni optimizador del servidor. Si falla la carga, muestra la descripción y un enlace para abrir la dirección. Ese estado es temporal y no modifica el borrador, el Markdown ni la posibilidad de exportar una dirección admitida. No equivale a comprobar que la imagen esté disponible para otras personas. Ver [ADR 0014](decisions/0014-custom-visual-blocks.md).

### Entender las categorías de tecnologías

«Organizar nuevas herramientas» permite elegir categorías automáticas, una categoría existente o ninguna. En automático, cada herramienta usa una sugerencia según su función: React va a Frontend y Docker a Cloud y DevOps; los nombres propios no reconocidos van sin categoría. Si elegís una categoría propia, todas las nuevas herramientas van allí. La ayuda cambia con la elección y cada resultado de búsqueda indica el destino real antes de agregarlo. El anuncio de alta confirma ese destino.

«Ver las 9 categorías sugeridas» abre una guía con los nombres y ejemplos del catálogo: lenguajes; frontend; backend; móvil y escritorio; datos y mensajería; cloud y DevOps; testing y calidad; IA y automatización; herramientas y diseño. Abrirla no crea grupos ni modifica el perfil. Estas opciones afectan solo a nuevas herramientas; las guardadas conservan su lugar. Para reorganizar las existentes, usá la acción explícita «Organizar por categoría» en los detalles de categorías.

La navegación muestra primero las secciones incluidas, en el orden del README, y luego las ocultas. El formulario y el selector de idioma permanecen en el mismo panel al cambiar de sección. Solo el formulario activo está montado; no hay una lista de formularios desplegables. La navegación, el encabezado del formulario y el indicador de la vista previa identifican la sección en edición. Ese indicador no modifica ni resalta un fragmento del Markdown exportado.

**Configurar** selecciona el formulario; **ocultar** excluye la sección del README y conserva sus datos; **quitar una entrada** borra esa entrada. Las casillas no cambian el formulario activo: si ocultás la sección que estás configurando, sus datos siguen editables y la interfaz indica que está oculta. Agregar y editar una sección oculta cambia explícitamente su inclusión. La selección activa, el despliegue de navegación móvil y la vista Editar/Vista previa son estado de interfaz, fuera del documento guardado.

Solo las secciones incluidas tienen tirador. Arrastrar permite mover una sección fija o personalizada por encima o debajo de otras; Subir/Bajar mueve una posición visible. `sectionOrder` conserva las nueve referencias fijas y una por cada instancia propia. Al reordenar las incluidas, las referencias ocultas, retiradas y de métricas permanecen en sus espacios. Ocultar y volver a mostrar una sección no reinicia su posición. El cambio de orden se guarda al terminar un movimiento válido; cancelar el arrastre conserva el orden anterior y no escribe otro documento.

El tirador es el único punto que inicia el arrastre. Los nombres de sección, las casillas y los campos mantienen su interacción propia. El gesto táctil fuera del tirador conserva el desplazamiento de la página. Las instrucciones y los anuncios de posición están disponibles en inglés y español; los botones Subir/Bajar ofrecen una alternativa al arrastre y distinguen sus extremos.

Las secciones con enlaces, direcciones de imagen o descripciones alternativas inválidas muestran un aviso textual. Su acción de revisión selecciona el formulario, vuelve a la vista de edición cuando corresponda y lleva al campo inválido; el error no depende solo del color. Los botones Editar/Vista previa comunican cuál está activo mediante `aria-pressed`.

## Actividad y contribuciones

Podés completar únicamente un aporte manual. Si querés sumar información de GitHub, abrí el bloque opcional, ingresá el usuario y pulsá la consulta de actividad pública. Escribir un usuario, abrir el bloque o recuperar el borrador no dispara la consulta del formulario. Las tarjetas previamente seleccionadas sí vuelven a cargar su imagen cuando se muestran, como también ocurrirá en GitHub.

Después de una consulta correcta podés elegir independientemente:

- **Calendario:** contribuciones diarias del período indicado, hasta 365 días, sin rachas ni calificación.
- **Resumen:** commits, pull requests, issues y revisiones del mismo período. Su suma no tiene por qué coincidir con el calendario, que puede incluir otros tipos.
- **Lenguajes:** proporción de bytes en los repositorios públicos propios analizados, excluyendo forks. Son datos de código actual, sin limitarse al período del calendario ni representar conocimientos. Se aclaran alcance y muestra parcial cuando hay límites de consulta.

La lista de sugerencias contiene PR e issues públicos del período. Elegir uno agrega un aporte editable con título, enlace y espacio para una nota propia. No se agregan automáticamente; una URL ya elegida no se duplica. Podés mantener, editar o quitar esos aportes aunque después cambies el usuario de consulta.

Usuario inválido, perfil no encontrado, servidor no configurado, cuota agotada e indisponibilidad tienen mensajes distintos. Cero actividad es un resultado válido y no un error. Si falla una actualización del mismo usuario, el último resultado válido puede seguir visible con fecha y aviso; no se inventan ceros ni ejemplos. Cambiar usuario descarta el resultado anterior y las respuestas tardías no pueden reemplazarlo.

Los snapshots son temporales: no se guardan en localStorage ni se recuperan al cambiar de sección o recargar. Solo se guardan el usuario, las tarjetas elegidas y los aportes seleccionados o escritos. Las selecciones de tarjetas de un borrador anterior pueden desmarcarse aunque el servidor no pueda consultarlas.

La aplicación aloja las tarjetas como SVG propios y pasivos. Para exportarlas necesita un origen público HTTPS configurado por quien opera el servidor; GitHub no puede acceder a un servidor local. Sin ese origen, la vista previa usa el mismo Markdown con rutas locales y muestra un aviso; copia y descarga quedan deshabilitadas mientras haya tarjetas seleccionadas. Desmarcarlas permite exportar los aportes manuales. No se pide a quien crea un perfil que ingrese tokens ni configure servicios.

Las imágenes del README se actualizan según la caché del servicio, no son capturas almacenadas en el documento. La fecha de actualización y el período pertenecen a los datos consultados; un fallo no convierte un gráfico anterior en actividad nueva. La consulta pública debe ser habilitada por la persona que administra el despliegue, según [ADR 0010](decisions/0010-github-activity.md).

## Texto y enlaces admitidos

Los campos se interpretan como **texto plano**: escribir Markdown o HTML no habilita formato libre. El generador escapa esos caracteres. La vista previa renderiza el Markdown generado mediante ReactMarkdown 10.1, sin HTML libre ni plugins GFM y con una lista explícita de elementos permitidos. Las fuentes, colores y distribución del editor no se incrustan en el README; su apariencia final depende de GitHub.

Las tecnologías reconocidas se exportan con un icono decorativo de 20 × 20 y su nombre visible escapado. El generador construye las etiquetas `img` exclusivamente desde el catálogo curado, con URLs fijadas de Devicon, Simple Icons y Lobe Icons. Los nombres propios siguen como texto; las notas se conservan como texto escapado. Los títulos de categoría se exportan cuando tienen contenido. La vista previa respeta el orden y permite saltos de línea; sigue aceptando los tokens anteriores de 32 × 32. No se agrega CSS al README.

Los contactos reconocidos agregan dentro del enlace un icono de 20 × 20, construido desde su catálogo de Simple Icons. El icono tiene `alt=""` porque el texto visible ya nombra el enlace; no duplica su nombre accesible. La URL validada determina el servicio por dominios explícitos: una etiqueta «LinkedIn» en una web propia no le asigna su marca. No se admiten URLs de iconos personalizadas.

Una selección de país agrega una bandera decorativa de 20 × 15 desde el catálogo de flag-icons, junto al nombre legible del país. Se admite únicamente su marcado generado exacto y URL fijada; la vista previa resuelve el SVG local equivalente. Las ubicaciones libres, incluso texto propio con emoji de bandera, conservan su texto y no se convierten en imágenes.

La vista previa convierte únicamente tokens exactos del marcado generado en nodos de imagen y verifica URL permitida y alternativa vacía para iconos decorativos de tecnología/contacto; los tokens tecnológicos anteriores requieren además el nombre alternativo correcto. Resuelve solo los SVG locales equivalentes. Admite también las rutas exactas de tarjetas de actividad generadas por la aplicación, con origen configurado y parámetros permitidos; las resuelve contra el servidor local para revisar el mismo Markdown. Para imágenes propias exige coincidencia exacta de URL y alternativa con `customImages`, los metadatos derivados del mismo resultado del generador, y vuelve a comprobar la política HTTPS. No persiste esos metadatos ni interpreta imágenes escritas en otros campos. `skipHtml` sigue activo para cualquier otro HTML y no se usa `rehypeRaw`. Los assets, licencias MIT/CC0 y atribución se incluyen en [recursos de terceros](../THIRD_PARTY_NOTICES.md), con sus fuentes fijadas. Algunas herramientas usan una marca de familia documentada. Los iconos de terceros dependen de sus URLs originales en GitHub; las tarjetas dependen del despliegue de esta aplicación; las imágenes propias, del host elegido.

Los enlaces web de proyectos, contribuciones, contacto y secciones personalizadas admiten URLs absolutas `http://` o `https://`, sin credenciales, espacios, controles ni barras invertidas. Ejemplo: `https://example.com/portfolio`.

Solo contacto admite además `mailto:` con un solo buzón ASCII y dominio con al menos dos partes, sin listas, parámetros, fragmentos ni contenido codificado. Ejemplo: `mailto:alex@example.com`.

No se admiten rutas relativas, URLs que comienzan con `//`, `javascript:`, `data:`, enlaces con usuario/contraseña ni un `mailto:` con asunto o cuerpo. Un enlace inválido en cualquier sección activa y visible, incluidas las propias, bloquea la exportación y muestra el error junto a su campo. Los datos de secciones ocultas o retiradas no se exportan ni bloquean la salida.

Un enlace opcional vacío no exige completarlo. Las filas de contacto o enlaces de proyectos completamente vacías se omiten. Si tienen etiqueta pero no una URL admitida, requieren corrección. Una URL válida sin etiqueta usa el nombre del servicio reconocido en contacto, o la dirección en los demás casos. Un enlace inválido bloquea toda la salida, sin producir un README parcial silenciosamente.

## Guardado y recuperación

El borrador se guarda en este navegador, bajo el mismo origen, sin enviar el documento a un servidor. La consulta opcional de GitHub envía únicamente el usuario; las tarjetas solicitan ese usuario, tipo de tarjeta e idioma mediante su URL. Las imágenes propias se solicitan al host indicado desde el navegador al mostrarse; no se suben ni copian al guardar el borrador. La lectura del borrador se valida antes de habilitar el guardado automático. Después de editar hay una espera de 500 ms; se intenta guardar también al ocultar o abandonar la página. El estado visible permite distinguir guardado correcto de una dificultad para guardar.

Si el borrador está dañado, es incompatible o no se puede leer, no se reemplaza automáticamente. Se puede trabajar en memoria; iniciar un borrador nuevo requiere confirmación para permitir el reemplazo. Cancelar esa confirmación conserva el valor existente. Si falla una escritura por cuota o restricciones del navegador, el aviso permanece: se puede seguir editando y exportando un README válido, pero los últimos cambios pueden perderse al salir.

El trabajo en memoria se conserva al cambiar el idioma de la interfaz dentro de la misma pestaña, incluido el idioma del README y el estado del error. Esta recuperación temporal no sobrevive a una recarga completa ni al cierre de la pestaña: si el guardado falla, descargá el README antes de recargar o cerrar.

No hay sincronización entre dispositivos, copia de seguridad remota, historial ni importación/exportación de configuración. Cambiar host, puerto o protocolo usa otro almacenamiento; ver [guía operativa](development.md). Un cierre abrupto puede impedir guardar los últimos cambios.

## Compatibilidad del documento

El formato actual es `ProfileDocument` v2, guardado en `github-profile-generator.profile.v2`. Conserva datos ocultos, IDs opacos, idioma, configuración de métricas y las estructuras fijas heredadas. `sectionOrder` mezcla referencias fijas y propias; `customSections` contiene sus bloques. Los cuatro tipos visuales amplían v2 sin cambiar claves ni agregar propiedades por defecto a los bloques anteriores. Un lector antiguo estricto puede rechazar esos tipos y debe conservar el valor incompatible. Las tecnologías siguen guardándose como nombres y contextos en sus grupos existentes; las nuevas altas comienzan con contexto vacío. Las URLs de imágenes propias pertenecen solo a sus bloques; no se guardan URLs de iconos, `customImages` ni un contrato paralelo.

Si falta v2, se busca `github-profile-generator.profile.v1`, se valida y se migra en memoria. La migración conserva contenido, flags y orden, no agrega secciones propias ni modifica el original v1. Abrir, recuperar o cambiar el idioma no guarda la migración: la primera edición escribe la clave v2 y deja v1 intacta como original local. Esto no proporciona sincronización ni una copia remota de seguridad.

Si v2 existe pero es inválido o no se puede leer, no se usa v1 para sustituirlo automáticamente. Se conserva el valor problemático y continúa disponible el recorrido en memoria; iniciar otro borrador requiere la confirmación existente. Cancelar mantiene ambos originales. Las escrituras actuales y el reinicio confirmado afectan a v2, sin eliminar la clave v1.

Conocimientos, formación y actualidad están retirados. No tienen navegación, formulario ni salida, aunque el borrador tenga contenido o visibilidad en esos IDs. Sus estructuras internas se conservan sin editarlas, borrarlas ni fusionarlas con presentación. Un enlace inválido guardado allí no impide exportar las cinco secciones activas. Esta conservación interna no es una opción para habilitar los módulos retirados.

Contribuciones y métricas se presentan como una única sección incluida cuando cualquiera de sus flags heredados es verdadero. No se cambian los flags al recuperar. La casilla global al ocultar apaga ambos y conserva datos; al volver a mostrar activa contribuciones y métricas solo si quedan tarjetas seleccionadas. Los aportes manuales respetan su flag; las tarjetas respetan el de métricas. El generador usa siempre la referencia `contributions`, omite la salida independiente de `metrics` y evita encabezados duplicados. Reordenar conserva la referencia interna de métricas y las demás posiciones ocultas.

El contrato y la API se describen en [modelo del perfil](profile-model.md). Las instancias propias y la migración se registran en [ADR 0013](decisions/0013-custom-sections.md), ampliado por [ADR 0014](decisions/0014-custom-visual-blocks.md) para los bloques visuales e imágenes explícitas; el retiro de módulos, en [ADR 0008](decisions/0008-focused-profile.md); los catálogos, en [ADR 0009](decisions/0009-profile-icons.md); la actividad unificada, en [ADR 0010](decisions/0010-github-activity.md). Los ADR anteriores conservan su contexto histórico.
