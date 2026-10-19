# Producto

GitHub Profile Generator permite crear un README personal breve para GitHub: escribir una presentación, elegir tecnologías y compartir proyectos, aportes o enlaces. El recorrido acepta un perfil informal y corto, sin exigir una estructura de CV.

## Personas y principios

El mismo editor sirve a quienes tienen poca actividad pública, trabajan en repositorios privados o contribuyen de forma habitual. No asigna puntuaciones al perfil ni infiere habilidades a partir de commits, estrellas o lenguajes detectados.

Todas las secciones son opcionales. El recorrido manual funciona sin cuenta ni conexión a GitHub. Una introducción puede contar intereses, aprendizaje o actividad actual sin repetirlos en otros formularios. Agregar una tecnología no exige explicar su uso. Ocultar una sección conserva los datos; quitar una entrada los borra mediante una acción explícita.

Un perfil breve puede considerarse terminado. No se muestra un porcentaje de completitud ni se exige empleo, proyectos, métricas o contacto. La interfaz ofrece inglés inicial y español, controles reconocibles y alternativas de teclado al arrastre.

## Las cinco secciones

| Sección                    | Contenido                                                                                             |
| -------------------------- | ----------------------------------------------------------------------------------------------------- |
| Presentación               | Nombre opcional y texto libre; frase de encabezado y ubicación en detalles secundarios.               |
| Tecnologías                | Búsqueda por nombre o alias, selección con iconos, chips para quitar y texto propio como alternativa. |
| Proyectos                  | Nombre, descripción, participación personal, tecnologías y enlaces opcionales; no exige GitHub.       |
| Actividad y contribuciones | Aportes manuales con título/enlace opcionales; consulta pública y tarjetas de GitHub elegibles.       |
| Contacto                   | Proveedores conocidos con icono según URL, portfolio o web propia y correo; etiqueta opcional.        |

El catálogo local contiene 259 tecnologías con iconos de Devicon, Simple Icons y Lobe Icons. Incluye lenguajes, frameworks, bases de datos, mensajería, infraestructura, herramientas de desarrollo y de IA. No consulta servicios externos para buscar ni exige cuentas de esas herramientas. La vista previa dispone los iconos en filas que se adaptan al ancho; la exportación referencia originales fijados a commits y el editor usa sus copias SVG locales. Los nombres propios siguen disponibles como texto. Grupos y contextos tecnológicos de borradores anteriores permanecen editables como detalles secundarios. La selección no representa un nivel de conocimiento ni un ranking del mercado.

Contacto ofrece LinkedIn, LeetCode, HackerRank, YouTube, Facebook, Instagram, GitHub, X, Bluesky, DEV Community, Medium, Twitch y Stack Overflow, además de portfolio/web propia o correo. Elegir un servicio facilita agregar el enlace; el dominio validado de la URL determina el icono. Una dirección propia mantiene un icono genérico en el formulario y un enlace de texto en el README. La etiqueta es opcional y puede personalizarse sin cambiar la marca detectada.

Actividad y contribuciones puede usarse solo para contar un aporte de documentación, revisión o comunidad. El grupo de GitHub es plegable y opcional: ingresar usuario, pulsar la consulta pública y elegir qué mostrar. Sus tres tarjetas empiezan desactivadas: calendario del período, resumen de commits/PR/issues/revisiones y lenguajes por bytes de repositorios públicos propios analizados, excluyendo forks. Los lenguajes reflejan el código actual, sin limitarse al período del calendario ni medir conocimientos.

Las sugerencias públicas de PR e issues se agregan únicamente al seleccionarlas; después son aportes editables con una nota propia opcional. No hay mínimos de actividad, rachas, rankings ni mensajes que penalicen un resultado vacío. Cero actividad, usuario inexistente, servicio no configurado, cuota agotada e indisponibilidad se explican como situaciones distintas. Un fallo mantiene la edición manual disponible y puede mostrar el último resultado válido con su fecha.

Conocimientos, formación y actualidad están retirados de la navegación, los formularios y la salida, también en borradores anteriores. Sus estructuras internas v1 permanecen guardadas sin borrarlas o fusionarlas. No reaparecen por tener contenido o visibilidad y sus enlaces no bloquean la exportación. La [compatibilidad del documento](profile-model.md) no amplía las cinco secciones del producto.

## Recorrido

1. Abrir el editor en inglés o español, sin crear cuenta.
2. Elegir qué compartir y configurar una sección por vez. Ninguna está preseleccionada.
3. Incluir u ocultar con la casilla y ordenar las incluidas con el tirador, teclado o Subir/Bajar.
4. Elegir el idioma de las etiquetas del README, sin traducir el texto personal ni cambiar el idioma de interfaz.
5. Revisar la vista previa, corregir los enlaces señalados y copiar o descargar `README.md`.

Si se eligieron tarjetas, su exportación requiere que la aplicación tenga un origen HTTPS público configurado para alojarlas. En un entorno local se revisan las mismas imágenes mediante rutas locales y se muestra el requisito antes de copiar o descargar; desmarcarlas permite terminar un perfil manual. No se solicitan tokens ni tareas de despliegue dentro del recorrido de creación del perfil.

En pantallas amplias, navegación, configuración y vista previa ocupan tres paneles. En pantallas angostas se despliega la navegación y se alterna Editar/Vista previa. La sección en edición está identificada. La aplicación muestra instrucciones para usar el archivo en GitHub; no publica por la persona.

El borrador se guarda en el navegador. Si el almacenamiento falla, el aviso permite distinguir que se continúa en memoria y exportar un README válido. Los datos incompatibles no se reemplazan automáticamente. Ver [editor](editor.md).

## Alcance y límites

La aplicación incluye Next.js App Router, TypeScript, un kit visual bilingüe y `ProfileDocument` versión 1. Vista previa, copia y descarga consumen el mismo Markdown generado. Los textos personales se escapan y solo el catálogo permitido genera iconos; no hay HTML libre.

La consulta opcional de GitHub requiere configuración del servidor con credenciales públicas verificables; un entorno sin ella conserva toda la creación manual. Las tarjetas SVG están alojadas por esta aplicación y se actualizan según caché; no se guarda una captura del gráfico en el borrador. No hay asistencia con IA: mostrar una herramienta de IA en el catálogo no incorpora una integración. Tampoco hay sincronización remota, importación/exportación de configuración ni personalización libre del diseño del README.

La única sección de actividad integra los antiguos campos de contribuciones y métricas sin agregar una sexta opción ni migrar v1. Ocultarla apaga ambos flags y conserva datos; volver a mostrarla incluye aportes y las tarjetas que sigan seleccionadas. Los snapshots remotos son efímeros; solo se guardan usuario, selección de tarjetas y aportes elegidos. La consulta del formulario es explícita y no ocurre al abrir o escribir; las imágenes ya seleccionadas pueden actualizarse al mostrarse.

La validación estructural de un documento admite contenido incompleto y no demuestra que sea exportable. El generador aplica sus controles sobre las cinco secciones activas. Los campos retirados se conservan únicamente por compatibilidad interna, según [ADR 0008](decisions/0008-focused-profile.md). Las fuentes de iconos y la presentación de contacto se registran en [ADR 0009](decisions/0009-profile-icons.md); la consulta pública y el alojamiento de tarjetas, en [ADR 0010](decisions/0010-github-activity.md).
