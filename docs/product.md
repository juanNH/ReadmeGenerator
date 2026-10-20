# Producto

GitHub Profile Generator permite crear un README personal breve para GitHub: escribir una presentación, elegir tecnologías y compartir proyectos, aportes o enlaces. El recorrido acepta un perfil informal y corto, sin exigir una estructura de CV.

## Personas y principios

El mismo editor sirve a quienes tienen poca actividad pública, trabajan en repositorios privados o contribuyen de forma habitual. No asigna puntuaciones al perfil ni infiere habilidades a partir de commits, estrellas o lenguajes detectados.

Todas las secciones son opcionales. El recorrido manual funciona sin cuenta ni conexión a GitHub. Una introducción puede contar intereses, aprendizaje o actividad actual sin repetirlos en otros formularios. Agregar una tecnología no exige explicar su uso. Ocultar una sección conserva los datos; quitar una entrada los borra mediante una acción explícita.

Un perfil breve puede considerarse terminado. No se muestra un porcentaje de completitud ni se exige empleo, proyectos, métricas o contacto. La interfaz ofrece inglés inicial y español, controles reconocibles y alternativas de teclado al arrastre.

## Las cinco secciones fijas

| Sección                    | Contenido                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| Presentación               | Nombre opcional y texto libre; frase de encabezado y ubicación en detalles secundarios.               |
| Tecnologías                | Búsqueda por nombre o alias, selección con iconos, chips para quitar y texto propio como alternativa. |
| Proyectos                  | Nombre, descripción, participación personal, tecnologías y enlaces opcionales; no exige GitHub.       |
| Actividad y contribuciones | Aportes manuales con título/enlace opcionales; consulta pública y tarjetas de GitHub elegibles.       |
| Contacto                   | Proveedores conocidos con icono según URL, portfolio o web propia y correo; etiqueta opcional.        |

Además, «Agregar sección personalizada» permite crear varias secciones propias, con título opcional y bloques de texto, listas con puntos (•) o numeradas, enlaces web, subtítulos, separadores, frases destacadas, imágenes/banner y HTML explícito. El selector presenta nueve opciones con pequeñas muestras locales de su distribución; no agrega datos de ejemplo al perfil. Los puntos y números de listas se agregan automáticamente. Se pueden ordenar entre las secciones fijas, duplicar como copias independientes y ocultar conservando su contenido. Eliminar una instancia borra únicamente esa sección; si tiene contenido, requiere confirmación. Los títulos vacíos o repetidos son válidos y no se usan como identidad.

Las ayudas para escribir listas se limitan a las secciones personalizadas: comenzar la primera línea de un bloque de texto con `- ` lo convierte en lista; Enter permite agregar ítems y continuar como texto desde el último ítem vacío. Pegar varias líneas genera ítems y «Convertir a texto» conserva su contenido y marcadores. Los demás campos continúan siendo texto plano; no se agrega formato Markdown global.

El bloque de imagen acepta una dirección HTTPS pública ya alojada y una descripción accesible. Puede mostrar un banner, una captura o un GIF disponible en esa dirección. No sube archivos ni publica una imagen local por seleccionar o escribir una ruta. La comprobación de URL es sintáctica y no garantiza que el host responda o entregue una imagen. La vista previa solicita el recurso directamente desde el navegador, sin proxy del servidor; si no carga, muestra la descripción y un enlace para revisarlo. Ese fallo temporal no impide exportar una dirección admitida. Los subtítulos, separadores y frases destacadas agregan jerarquía sin pedir datos de trayectoria. Ver [ADR 0014](decisions/0014-custom-visual-blocks.md).

El bloque HTML ofrece otra forma opcional de componer contenido de perfil: un título centrado, una fila de imágenes enlazadas, una tabla breve o información plegable. Tiene un campo de código, guía, tres ejemplos que se insertan solo al elegirlos y una vista del HTML exportado. Reemplazar código existente con un ejemplo requiere confirmación. La fuente original se conserva aunque el análisis retire etiquetas o atributos; los avisos explican esos cambios y los problemas que impiden exportar. Los demás campos mantienen su comportamiento de texto plano.

El HTML admite un conjunto concreto de etiquetas, alineación y dimensiones acotadas; no páginas completas, CSS o JavaScript. Sus enlaces son HTTP/HTTPS absolutos y las imágenes usan HTTPS pública y un atributo `alt` explícito; `alt=""` indica una imagen decorativa. Las rutas relativas y anclas necesitan adaptación, sin resolverse contra la aplicación. El código no interpreta Markdown anidado ni importa automáticamente otras secciones de un README. La vista previa es aproximada porque GitHub aplica filtros y estilos propios. Ver [HTML en el editor](editor.md#html-explícito) y [ADR 0015](decisions/0015-explicit-profile-html.md).

El catálogo local contiene 358 tecnologías con iconos de Devicon, Simple Icons y Lobe Icons. Incluye lenguajes, frameworks, ORMs, bases de datos, mensajería, infraestructura, herramientas de desarrollo y de IA. No consulta servicios externos para buscar ni exige cuentas de esas herramientas. La vista previa muestra icono y nombre en filas que se adaptan al ancho; la exportación referencia originales fijados a commits y el editor usa sus copias SVG locales. Los nombres propios siguen disponibles como texto. La selección no representa un nivel de conocimiento ni un ranking del mercado.

Las nuevas herramientas pueden usar una de nueve categorías sugeridas, una categoría existente o «Sin categoría». Es posible crear y renombrar categorías, cambiar su orden, mover y ordenar herramientas, o quitar un título conservando el contenido. Estas acciones y las notas opcionales están en detalles secundarios. Los títulos se aplican al salir del campo o pulsar Enter. Recuperar un borrador o cambiar idioma conserva sus títulos y orden; «Organizar por categoría» aplica sugerencias solo por una acción explícita y confirma el reemplazo de títulos existentes. Ver [ADR 0012](decisions/0012-technology-categories.md).

El selector «Organizar nuevas herramientas» explica la asignación automática con ejemplos, o el destino elegido. Una guía plegable muestra las nueve categorías y herramientas representativas. Cada resultado de búsqueda anticipa dónde se agregará, incluidas las herramientas propias; el anuncio de alta confirma ese destino. La ayuda distingue estas nuevas incorporaciones de reorganizar contenido existente.

Contacto ofrece LinkedIn, LeetCode, HackerRank, YouTube, Facebook, Instagram, GitHub, X, Bluesky, DEV Community, Medium, Twitch y Stack Overflow, además de portfolio/web propia o correo. Elegir un servicio facilita agregar el enlace; el dominio validado de la URL determina el icono. Una dirección propia mantiene un icono genérico en el formulario y un enlace de texto en el README. La etiqueta es opcional y puede personalizarse sin cambiar la marca detectada.

La persona agrega primero una entrada de contacto y elige dentro su red, web o correo y URL; puede repetir servicios y agregar varias webs propias. En presentación, Ubicación ofrece autocompletado de países en inglés y español, con su bandera al elegir, y mantiene texto libre como alternativa. Ambos recorridos conservan datos anteriores y no requieren cuenta ni geolocalización.

Actividad y contribuciones puede usarse solo para contar un aporte de documentación, revisión o comunidad. El grupo de GitHub es plegable y opcional: ingresar usuario, pulsar la consulta pública y elegir qué mostrar. Sus tres tarjetas empiezan desactivadas: calendario del período, resumen de commits/PR/issues/revisiones y lenguajes por bytes de repositorios públicos propios analizados, excluyendo forks. Los lenguajes reflejan el código actual, sin limitarse al período del calendario ni medir conocimientos.

Las sugerencias públicas de PR e issues se agregan únicamente al seleccionarlas; después son aportes editables con una nota propia opcional. No hay mínimos de actividad, rachas, rankings ni mensajes que penalicen un resultado vacío. Cero actividad, usuario inexistente, servicio no configurado, cuota agotada e indisponibilidad se explican como situaciones distintas. Un fallo mantiene la edición manual disponible y puede mostrar el último resultado válido con su fecha.

Conocimientos, formación y actualidad están retirados de la navegación, los formularios y la salida, también en borradores anteriores. Sus estructuras heredadas de v1 permanecen guardadas sin borrarlas o fusionarlas. No reaparecen por tener contenido o visibilidad y sus enlaces no bloquean la exportación. Las secciones propias no reactivan módulos retirados ni importan sus datos automáticamente.

## Recorrido

1. Abrir el editor en inglés o español, sin crear cuenta.
2. Elegir qué compartir y configurar una sección por vez. Ninguna sección fija está preseleccionada; agregar una propia la incluye y permite empezar con título o contenido.
3. Incluir u ocultar con la casilla y ordenar las incluidas con el tirador, teclado o Subir/Bajar.
4. Elegir el idioma de las etiquetas del README, sin traducir el texto personal ni cambiar el idioma de interfaz.
5. Revisar la vista previa y los avisos, corregir las direcciones, descripciones de imagen o código HTML señalados y copiar o descargar `README.md`.

Si se eligieron tarjetas, su exportación requiere que la aplicación tenga un origen HTTPS público configurado para alojarlas. En un entorno local se revisan las mismas imágenes mediante rutas locales y se muestra el requisito antes de copiar o descargar; desmarcarlas permite terminar un perfil manual. No se solicitan tokens ni tareas de despliegue dentro del recorrido de creación del perfil.

La barra superior mantiene las secciones en una sola fila horizontal, con la activa identificada. La fila se desplaza lateralmente sin ensanchar la página. Sus casillas incluyen u ocultan; los tiradores y las flechas izquierda/derecha ordenan las incluidas. En pantallas amplias, configuración y vista previa ocupan dos paneles; en pantallas angostas se alterna Editar/Vista previa. Las muestras de bloques se despliegan desde «Agregar bloque» para conservar acceso directo al contenido existente. La aplicación muestra instrucciones para usar el archivo en GitHub; no publica por la persona. El kit de componentes y Playwright son herramientas internas de desarrollo, sin navegación pública al catálogo.

El borrador se guarda en el navegador. Si el almacenamiento falla, el aviso permite distinguir que se continúa en memoria y exportar un README válido. Los datos incompatibles no se reemplazan automáticamente. Ver [editor](editor.md).

## Alcance y límites

La aplicación incluye Next.js App Router, TypeScript, un kit visual bilingüe y `ProfileDocument` versión 2. El orden mixto `sectionOrder` conserva referencias a los nueve IDs fijos y a cada instancia de `customSections`. Los bloques visuales y HTML amplían v2 sin cambiar las claves de borrador ni las estructuras anteriores; un lector antiguo estricto puede rechazarlos y debe conservar su valor. Vista previa, copia y descarga consumen el mismo Markdown generado. Los textos ordinarios se escapan; las imágenes propias y el HTML requieren sus bloques explícitos validados y los iconos siguen procediendo de los catálogos permitidos.

La consulta opcional de GitHub requiere configuración del servidor con credenciales públicas verificables; un entorno sin ella conserva toda la creación manual. Las tarjetas SVG están alojadas por esta aplicación y se actualizan según caché; no se guarda una captura del gráfico en el borrador. No hay asistencia con IA: mostrar una herramienta de IA en el catálogo no incorpora una integración. Tampoco hay sincronización remota, importación de README, importación/exportación de configuración ni CSS propio para el diseño del README.

La única sección fija de actividad integra los campos heredados de contribuciones y métricas sin ofrecer métricas por separado. Ocultarla apaga ambos flags y conserva datos; volver a mostrarla incluye aportes y las tarjetas que sigan seleccionadas. Los snapshots remotos son efímeros; solo se guardan usuario, selección de tarjetas y aportes elegidos. La consulta del formulario es explícita y no ocurre al abrir o escribir; las imágenes ya seleccionadas pueden actualizarse al mostrarse.

El guardado actual usa una clave v2. Si no existe, un borrador v1 válido se migra en memoria y su original permanece intacto; no se escribe v2 hasta una edición. Si hay un v2 inválido, no se sustituye automáticamente desde v1. La migración conserva idioma, contenido, IDs, orden y visibilidad de las estructuras anteriores. Ver [ADR 0013](decisions/0013-custom-sections.md).

La validación estructural de un documento admite contenido incompleto y no demuestra que sea exportable. El generador revisa las secciones fijas activas y las personalizadas visibles. Un enlace o dirección de imagen inválidos, una imagen con URL pero sin descripción o un problema del bloque HTML bloquean toda la exportación y señalan el campo. Una imagen o fuente HTML completamente vacías se omiten; ocultar la sección conserva sus datos sin exigir corregirlos. HTML tiene límites de tamaño y complejidad para el análisis. Los campos retirados se conservan únicamente por compatibilidad interna, según [ADR 0008](decisions/0008-focused-profile.md). Las fuentes de iconos y la presentación de contacto se registran en [ADR 0009](decisions/0009-profile-icons.md); la consulta pública y el alojamiento de tarjetas, en [ADR 0010](decisions/0010-github-activity.md); los bloques visuales, en [ADR 0014](decisions/0014-custom-visual-blocks.md); el HTML explícito, en [ADR 0015](decisions/0015-explicit-profile-html.md).
