# Editor de README

El editor permite crear un perfil breve con cinco secciones opcionales: presentación, tecnologías, proyectos, actividad y contribuciones, y contacto. El recorrido manual funciona sin cuenta ni conexión con GitHub. Actividad permite consultar información pública y elegir tres tarjetas si el servidor está configurado; métricas no aparece como una sexta sección. No hay asistencia con IA.

## Usarlo

1. Abrí el editor en [inglés](http://127.0.0.1:3000/en/editor) o [español](http://127.0.0.1:3000/es/editor).
2. Elegí qué compartir desde la navegación de secciones. Ninguna está preseleccionada ni es obligatoria. La casilla incluye u oculta la sección y conserva el foco; no cambia por sí sola el formulario que estás configurando.
3. Elegí el nombre de una sección incluida para configurarla. La acción de una sección oculta dice agregar y editar: la incluye y selecciona su formulario. El foco pasa al encabezado del panel de configuración, que indica qué sección estás editando. Completá solo los campos útiles; podés agregar y quitar entradas. Al agregar se enfoca la entrada nueva y al quitar, una vecina o el botón para agregar. Quitar una entrada borra esos datos del borrador.
4. Ordená las secciones incluidas desde su tirador o con Subir/Bajar. Podés usar puntero, tacto o teclado; las instrucciones junto al control explican cómo iniciar, mover, soltar y cancelar. Ocultar una sección conserva sus datos.
5. Elegí el idioma del README. Solo cambia etiquetas generadas, como «Contacto» o «Proyectos»; no traduce tu texto. El selector de idioma de la interfaz es independiente.
6. Revisá la vista previa y los avisos. En pantallas amplias está a la derecha, junto a la configuración. En pantallas angostas, desplegá Secciones cuando necesites elegir otra y alterná Editar/Vista previa. Cuando exista contenido visible válido, copiá el Markdown o descargá `README.md`. Ambas acciones usan el mismo contenido que la vista previa.
7. Para publicarlo, seguí las instrucciones de repositorio de perfil que aparecen junto a la exportación. La aplicación no publica ni modifica GitHub por vos.

Un perfil breve puede estar listo con una sola sección. No necesitás nombre, empleo, proyecto, repositorio ni actividad pública para contar algo sobre vos. La introducción permite incluir intereses, aprendizaje y actualidad sin repetirlos en formularios distintos. Un perfil sin contenido exportable mantiene deshabilitadas copia y descarga.

## Contenido y composición

- **Presentación:** nombre opcional y texto libre. Podés contar qué hacés, qué te interesa o qué estás aprendiendo. La frase de encabezado y la ubicación quedan en detalles secundarios y conservan los valores anteriores.
- **Tecnologías:** buscá por nombre o alias y elegí una sugerencia del catálogo local de 259 herramientas. Incluye lenguajes, frameworks, bases de datos, mensajería, infraestructura, desarrollo e IA. Aparecen como chips con su icono y botón para quitar; la vista previa agrupa los iconos en filas adaptables al ancho disponible. También podés agregar texto propio sin icono. Flechas, Enter y Escape permiten operar las sugerencias con teclado; las herramientas ya elegidas no se agregan otra vez. No se pide contexto de uso ni crear grupos. Los nombres de grupo y contextos de borradores anteriores siguen editables en detalles secundarios.
- **Proyectos:** nombre, descripción, participación, tecnologías y enlaces opcionales. Las tecnologías se agregan como campos de texto, sin exigir un repositorio.
- **Actividad y contribuciones:** descripción manual de aportes, revisiones, documentación o comunidad, con título y enlace opcionales. El bloque plegable de GitHub permite consultar un usuario público, elegir calendario, resumen o lenguajes y seleccionar sugerencias de aportes. Ninguna tarjeta está activada al empezar y no hace falta usuario para contar un aporte manual.
- **Contacto:** elegí un servicio conocido, portfolio/web propia o correo y agregá el enlace. Podés repetir servicios y agregar varias webs propias, cada una con URL y nombre independientes. La acción «Agregar otra web» al final de la lista facilita sumar portfolios, blogs u otros sitios. Se enfoca la URL; la etiqueta personalizada está en detalles opcionales. El catálogo incluye LinkedIn, LeetCode, HackerRank, YouTube, Facebook, Instagram, GitHub, X, Bluesky, DEV Community, Medium, Twitch y Stack Overflow. El icono sigue al dominio validado de la URL, aunque el servicio sugerido o la etiqueta sean distintos. Las webs propias y el correo conservan un icono genérico en el formulario y enlaces de texto en el README.

Una sección visible vacía no agrega títulos sin contenido. Un grupo tecnológico sin entradas exportables se omite, aunque tenga nombre. El contenido parcial útil se muestra sin inventar los datos que faltan.

La navegación muestra primero las secciones incluidas, en el orden del README, y luego las ocultas. El formulario y el selector de idioma permanecen en el mismo panel al cambiar de sección. Solo el formulario activo está montado; no hay una lista de formularios desplegables. La navegación, el encabezado del formulario y el indicador de la vista previa identifican la sección en edición. Ese indicador no modifica ni resalta un fragmento del Markdown exportado.

**Configurar** selecciona el formulario; **ocultar** excluye la sección del README y conserva sus datos; **quitar una entrada** borra esa entrada. Las casillas no cambian el formulario activo: si ocultás la sección que estás configurando, sus datos siguen editables y la interfaz indica que está oculta. Agregar y editar una sección oculta cambia explícitamente su inclusión. La selección activa, el despliegue de navegación móvil y la vista Editar/Vista previa son estado de interfaz, fuera del documento guardado.

Solo las secciones incluidas tienen tirador. Arrastrar permite mover una sección por encima o debajo de otras; Subir/Bajar mueve una posición visible. El orden del documento conserva sus nueve posiciones: los módulos ocultos, retirados y métricas permanecen en sus espacios mientras se reordena la secuencia incluida. Ocultar y volver a mostrar una sección no reinicia su posición. El cambio de orden se guarda al terminar un movimiento válido; cancelar el arrastre conserva el orden anterior y no escribe otro documento.

El tirador es el único punto que inicia el arrastre. Los nombres de sección, las casillas y los campos mantienen su interacción propia. El gesto táctil fuera del tirador conserva el desplazamiento de la página. Las instrucciones y los anuncios de posición están disponibles en inglés y español; los botones Subir/Bajar ofrecen una alternativa al arrastre y distinguen sus extremos.

Las secciones con enlaces inválidos muestran un aviso textual. Su acción de revisión selecciona el formulario, vuelve a la vista de edición cuando corresponda y lleva al campo inválido; el error no depende solo del color. Los botones Editar/Vista previa comunican cuál está activo mediante `aria-pressed`.

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

Las tecnologías reconocidas y sin contexto adicional se exportan como iconos de 32 × 32 con nombre alternativo. El generador construye esas etiquetas `img` exclusivamente desde el catálogo curado, con URLs fijadas de Devicon, Simple Icons y Lobe Icons; los nombres propios o entradas con contexto conservan salida textual escapada. La vista previa los dispone en filas flexibles con espacio y salto de línea, en lugar de una columna de imágenes de bloque.

Los contactos reconocidos agregan dentro del enlace un icono de 20 × 20, construido desde su catálogo de Simple Icons. El icono tiene `alt=""` porque el texto visible ya nombra el enlace; no duplica su nombre accesible. La URL validada determina el servicio por dominios explícitos: una etiqueta «LinkedIn» en una web propia no le asigna su marca. No se admiten URLs de iconos personalizadas.

La vista previa convierte únicamente tokens exactos del marcado generado en nodos de imagen y comprueba nombre/URL de tecnología o URL permitida/alternativa vacía de contacto antes de resolver el SVG local equivalente. Admite además las rutas exactas de tarjetas de actividad generadas por la aplicación, con origen configurado y parámetros permitidos; las resuelve contra el servidor local para revisar el mismo Markdown. `skipHtml` sigue activo para cualquier otro HTML; no se usa `rehypeRaw` ni se aceptan imágenes por URL escrita por la persona. Los assets, licencias MIT/CC0 y atribución se incluyen en [recursos de terceros](../THIRD_PARTY_NOTICES.md), con sus fuentes fijadas. Algunas herramientas usan una marca de familia documentada. Los iconos de terceros dependen de sus URLs originales en GitHub; las tarjetas dependen del despliegue de esta aplicación.

Los enlaces web de proyectos, contribuciones y contacto admiten URLs absolutas `http://` o `https://`, sin credenciales, espacios, controles ni barras invertidas. Ejemplo: `https://example.com/portfolio`.

Solo contacto admite además `mailto:` con un solo buzón ASCII y dominio con al menos dos partes, sin listas, parámetros, fragmentos ni contenido codificado. Ejemplo: `mailto:alex@example.com`.

No se admiten rutas relativas, URLs que comienzan con `//`, `javascript:`, `data:`, enlaces con usuario/contraseña ni un `mailto:` con asunto o cuerpo. Un enlace inválido en una de las cinco secciones activas y visibles bloquea la exportación y muestra el error junto a su campo. Los datos de secciones ocultas o retiradas no se exportan ni bloquean la salida.

Un enlace opcional vacío no exige completarlo. Las filas de contacto o enlaces de proyectos completamente vacías se omiten. Si tienen etiqueta pero no una URL admitida, requieren corrección. Una URL válida sin etiqueta usa el nombre del servicio reconocido en contacto, o la dirección en los demás casos. Un enlace inválido bloquea toda la salida, sin producir un README parcial silenciosamente.

## Guardado y recuperación

El borrador se guarda en este navegador, bajo el mismo origen, sin enviar el documento a un servidor. La consulta opcional de GitHub envía únicamente el usuario; las tarjetas solicitan ese usuario, tipo de tarjeta e idioma mediante su URL. La lectura del borrador se valida antes de habilitar el guardado automático. Después de editar hay una espera de 500 ms; se intenta guardar también al ocultar o abandonar la página. El estado visible permite distinguir guardado correcto de una dificultad para guardar.

Si el borrador está dañado, es incompatible o no se puede leer, no se reemplaza automáticamente. Se puede trabajar en memoria; iniciar un borrador nuevo requiere confirmación para permitir el reemplazo. Cancelar esa confirmación conserva el valor existente. Si falla una escritura por cuota o restricciones del navegador, el aviso permanece: se puede seguir editando y exportando un README válido, pero los últimos cambios pueden perderse al salir.

El trabajo en memoria se conserva al cambiar el idioma de la interfaz dentro de la misma pestaña, incluido el idioma del README y el estado del error. Esta recuperación temporal no sobrevive a una recarga completa ni al cierre de la pestaña: si el guardado falla, descargá el README antes de recargar o cerrar.

No hay sincronización entre dispositivos, copia de seguridad remota, historial ni importación/exportación de configuración. Cambiar host, puerto o protocolo usa otro almacenamiento; ver [guía operativa](development.md). Un cierre abrupto puede impedir guardar los últimos cambios.

## Compatibilidad del documento

La recuperación conserva el documento completo, incluidos datos ocultos, IDs opacos, idioma, orden y configuración de métricas. Los formularios usan campos ya presentes en `ProfileDocument` versión 1 y la clave `github-profile-generator.profile.v1`: recuperar borradores anteriores no requiere migración. Las nuevas tecnologías se guardan como nombres con contexto vacío en grupos del formato existente, sin URLs de iconos ni un contrato paralelo.

Conocimientos, formación y actualidad están retirados. No tienen navegación, formulario ni salida, aunque el borrador tenga contenido o visibilidad en esos IDs. Sus estructuras internas se conservan sin editarlas, borrarlas ni fusionarlas con presentación. Un enlace inválido guardado allí no impide exportar las cinco secciones activas. Esta conservación interna no es una opción para habilitar los módulos retirados.

Contribuciones y métricas se presentan como una única sección incluida cuando cualquiera de sus flags v1 es verdadero. No se cambian los flags al recuperar. La casilla global al ocultar apaga ambos y conserva datos; al volver a mostrar activa contribuciones y métricas solo si quedan tarjetas seleccionadas. Los aportes manuales respetan su flag; las tarjetas respetan el de métricas. El generador usa siempre la posición de `contributions`, omite el slot independiente de `metrics` y evita encabezados duplicados. Reordenar conserva la posición interna del ID métricas y los otros ocho IDs.

El contrato y la API se describen en [modelo del perfil](profile-model.md). El alcance se registra en [ADR 0008](decisions/0008-focused-profile.md), los catálogos en [ADR 0009](decisions/0009-profile-icons.md) y la sección unificada de actividad en [ADR 0010](decisions/0010-github-activity.md). Las decisiones anteriores de [editor](decisions/0004-local-readme-editor.md), [composición](decisions/0005-manual-profile-composition.md), [navegación](decisions/0006-editor-navigation.md) y [catálogo](decisions/0007-simple-profile.md) conservan el contexto histórico.
