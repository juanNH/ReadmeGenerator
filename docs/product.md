# Producto

GitHub Profile Generator es una herramienta visual para crear README de perfiles de GitHub. Permitirá elegir qué mostrar, completar información, ordenar módulos, personalizar su presentación y obtener un archivo listo para usar.

## Personas y necesidades

- Una persona con conocimientos y poca actividad pública necesita explicar qué sabe hacer, qué conoce y qué está aprendiendo.
- Una persona con experiencia en repositorios privados necesita presentar su trabajo y sus capacidades sin depender de estadísticas públicas.
- Una persona que participa activamente en GitHub necesita destacar proyectos, colaboraciones y actividad de forma seleccionada.

Todas comparten el mismo editor y catálogo de módulos. La composición inicial cambia según lo que quieran destacar; no se asignan categorías de valor ni puntuaciones al perfil.

## Principios

- Todos los módulos son opcionales, incluidas las métricas.
- El recorrido manual funciona sin crear una cuenta ni conectar GitHub.
- Ocultar un módulo conserva su contenido; eliminar datos requiere una acción distinta y explícita.
- Los campos sin completar no generan títulos, íconos ni espacios vacíos en el README.
- Los conocimientos declarados y la actividad pública se presentan con contexto propio.
- Los cambios se pueden revisar antes de exportar.
- La vista previa representa las posibilidades y límites del README de GitHub.
- La interfaz incluye inglés como idioma predeterminado y español, con un selector funcional desde la base.
- Los controles son reconocibles y las opciones avanzadas se muestran cuando hacen falta, manteniendo una interacción accesible.

## Módulos del MVP

Los identificadores de la tabla existen en el contrato y el registro de módulos. Presentación y contacto disponen de formularios, vista previa y exportación de README. Los otros siete módulos admiten datos en el contrato, sin formularios ni generación de contenido. La tabla describe la intención de producto; no implica que todo su comportamiento esté disponible.

| Módulo         | Identificador   | Contenido previsto                                                                   | Comportamiento del MVP                                                             |
| -------------- | --------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Presentación   | `presentation`  | Nombre, rol, descripción breve y ubicación opcional.                                 | Ayuda a abrir el perfil; ningún dato se publica por omisión.                       |
| Conocimientos  | `knowledge`     | Capacidades concretas, por ejemplo construir interfaces o diseñar una base de datos. | Texto manual; permite explicar qué puede hacer la persona.                         |
| Tecnologías    | `technologies`  | Lenguajes y herramientas agrupados por área, con contexto de uso opcional.           | Selección visual y etiquetas editables; no hay porcentajes automáticos de dominio. |
| Formación      | `education`     | Estudios, cursos y certificaciones seleccionados.                                    | Entradas manuales; institución, fechas y enlace opcionales.                        |
| Actualidad     | `current`       | Trabajo actual, aprendizaje, intereses y disposición a colaborar.                    | Cada elemento es opcional y se puede editar por separado.                          |
| Proyectos      | `projects`      | Nombre, descripción, participación personal, tecnologías y enlaces.                  | Admite proyectos manuales y trabajos que no estén alojados en GitHub.              |
| Contribuciones | `contributions` | Colaboraciones, revisiones y aportes seleccionados.                                  | Se puede explicar el aporte y agregar un enlace público de referencia.             |
| Métricas       | `metrics`       | Tres tarjetas elegibles con información pública de GitHub.                           | Se incorporan en una etapa posterior; cada tarjeta se activa por separado.         |
| Contacto       | `contact`       | Portfolio, redes y medios de contacto elegidos por la persona.                       | Permite seleccionar enlaces y ordenar cuáles aparecen.                             |

El contenido manual no requiere un repositorio público como prueba. Vincular un conocimiento o una tecnología con un proyecto será una forma opcional de aportar contexto.

## Recorrido del usuario

1. **Entrar y entender la propuesta.** Ver ejemplos breves con enfoques en conocimientos, proyectos y comunidad. El llamado principal invita a crear un perfil.
2. **Elegir qué destacar.** Seleccionar intereses como conocimientos, formación, proyectos o contribuciones. La herramienta propone módulos y permite cambiar la selección.
3. **Completar una base.** Cargar información manual sin cuenta. GitHub público será una ayuda opcional cuando se incorpore esa etapa.
4. **Editar módulos.** Completar una sección a la vez con ejemplos breves, agregar módulos, ocultarlos conservando sus datos y cambiar el orden.
5. **Personalizar.** Elegir una presentación visual coherente, densidad, alineación y estilo de íconos dentro de las opciones compatibles con el README.
6. **Revisar.** Ver la composición final, corregir enlaces o campos y comprobar que solo se exporta lo elegido. Los datos de ejemplo deben distinguirse de los propios.
7. **Generar y usar.** Copiar el contenido o descargar `README.md`, con instrucciones para ubicarlo en el repositorio de perfil de GitHub.
8. **Continuar después.** Exportar y recuperar la configuración del perfil mediante un documento versionado cuando se complete la etapa de portabilidad.

Una composición breve puede considerarse terminada. No se mostrará un porcentaje de completitud que presione a agregar proyectos, métricas o información de contacto.

## GitHub y métricas

La integración futura usará información pública por nombre de usuario. La selección de proyectos y contribuciones seguirá bajo control de la persona. Las métricas se obtendrán a través del backend de la aplicación Next.js y se ofrecerán como tres tarjetas públicas opcionales, cuya definición final se cerrará antes de implementar esa etapa.

La presentación de cada tarjeta explicará qué representa, el período cuando corresponda y su disponibilidad. Los lenguajes detectados en repositorios no equivalen a habilidades verificadas y los contadores de actividad no determinan el valor del perfil. Un dato que no se pueda obtener no debe reemplazarse por un cero que sugiera inactividad.

## Asistencia con IA posterior

Una etapa posterior podrá proponer mejoras de redacción o de organización. Las sugerencias deberán respetar un esquema definido, mostrar qué cambia y requerir revisión antes de aplicarse. No inventarán experiencia, conocimientos ni logros. El bootstrap no incluye un endpoint de IA ni respuestas simuladas que aparenten esa función.

## Alcance disponible hoy

La aplicación usa Next.js `16.4.2`, React `19.3.1`, TypeScript, Tailwind CSS 4 y un kit visual. Incluye interfaz en inglés y español. Las rutas de entrada son `/en` y `/es`, con páginas `/editor` y `/design-system`; `/` redirige a inglés.

El núcleo incluye [un documento de perfil versión 1](profile-model.md), el registro de los nueve módulos y funciones para crear y validar borradores, cambiar su visibilidad y ordenar las secciones. Todos los módulos pueden permanecer ocultos y vacíos. Los conocimientos no se condicionan a actividad pública, y ocultar una sección conserva sus datos.

El [editor](editor.md) permite completar presentación y contacto como texto plano, ocultarlos sin perder información, revisar la salida y copiar o descargar `README.md`. El idioma de la interfaz y el de las etiquetas del README se eligen por separado. El borrador se recupera y guarda localmente; los valores incompatibles no se reemplazan sin confirmación. Si el navegador impide guardar, se puede seguir editando en memoria y exportando un README válido.

No incluye formularios de los otros siete módulos, personalización del diseño del README, reordenamiento visual, portabilidad de configuración, consultas de GitHub, tarjetas de métricas ni asistencia con IA. La validación del documento admite contenido incompleto; el generador aplica por separado sus controles de salida. Un módulo visible sin soporte bloquea la exportación y conserva su contenido. Las capacidades descritas como futuras expresan la propuesta de producto; no constituyen funciones disponibles ni un calendario público de desarrollo.
