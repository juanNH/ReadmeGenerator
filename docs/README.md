# Documentación

La [decisión de versiones y compatibilidad](decisions/0002-toolchain.md) registra las versiones fijadas y las advertencias conocidas de la cadena de herramientas.

La documentación de GitHub Profile Generator describe el producto, el estado disponible y las guías técnicas para contribuir. La planificación de desarrollo se mantiene privada y no es necesaria para preparar el entorno ni proponer una contribución.

| Documento                                                                                   | Propósito                                                                             |
| ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| [Producto](product.md)                                                                      | Perfil breve, cinco secciones fijas, secciones propias y recorrido de creación.       |
| [Desarrollo](development.md)                                                                | Preparación del entorno, comandos, rutas y registro de validación.                    |
| [Arquitectura](architecture.md)                                                             | Responsabilidades, límites y actividad pública opcional de GitHub.                    |
| [Modelo del perfil](profile-model.md)                                                       | Contrato v2, orden mixto, compatibilidad v1 y operaciones del núcleo.                 |
| [Editor](editor.md)                                                                         | Bloques visuales, HTML, código, formato, importación y respaldo del borrador.         |
| [Suite pública Extended](github-stats-extended.md)                                          | Familias, contadores, opciones, ranking voluntario y matriz de límites compatibles.   |
| [Open source](open-source.md)                                                               | MIT, atribuciones, contribuciones, inventario y preparación de distribuciones.        |
| [Kit de diseño](design-system.md)                                                           | Herramienta interna, tokens, componentes y criterios de accesibilidad.                |
| [Trabajo con IA](ai-development.md)                                                         | Contexto, delegación y revisión de cambios asistidos.                                 |
| [Decisión inicial](decisions/0001-architecture.md)                                          | Contexto y consecuencias de las decisiones de arquitectura de la base.                |
| [Decisión del perfil](decisions/0003-profile-document.md)                                   | Esquemas Zod, forma JSON del borrador y validación estricta.                          |
| [Decisión del editor](decisions/0004-local-readme-editor.md)                                | Texto plano, Markdown compartido y protección del borrador local.                     |
| [Composición manual](decisions/0005-manual-profile-composition.md)                          | Decisión histórica de composición; alcance actual en ADR 0008.                        |
| [Navegación del editor](decisions/0006-editor-navigation.md)                                | Configuración estable, selección, inclusión y orden mediante arrastre.                |
| [Perfil breve](decisions/0007-simple-profile.md)                                            | Catálogo e iconos; su selección de secciones fue sustituida por ADR 0008.             |
| [Cinco secciones](decisions/0008-focused-profile.md)                                        | Retiro de módulos de trayectoria y conservación interna compatible con v1.            |
| [Iconos del perfil](decisions/0009-profile-icons.md)                                        | Catálogos ampliados, contacto por dominio e imágenes generadas permitidas.            |
| [Actividad de GitHub](decisions/0010-github-activity.md)                                    | Cinco secciones, tarjetas propias, límites públicos y exportación configurada.        |
| [Países y contactos](decisions/0011-country-and-contact-inputs.md)                          | Países opcionales con bandera y redes sociales configuradas por entrada.              |
| [Categorías tecnológicas](decisions/0012-technology-categories.md)                          | Catálogo de 358 herramientas, categorías editables e iconos con nombre.               |
| [Secciones personalizadas](decisions/0013-custom-sections.md)                               | Bloques de texto/listas/enlaces, copias independientes y migración v1 a v2.           |
| [Bloques visuales propios](decisions/0014-custom-visual-blocks.md)                          | Ampliación aditiva de v2, imágenes HTTPS públicas y lista permitida de vista previa.  |
| [HTML explícito](decisions/0015-explicit-profile-html.md)                                   | Fuente conservada, HTML filtrado, límites y vista previa del mismo Markdown.          |
| [Navegación superior y herramientas](decisions/0016-top-navigation-and-internal-tools.md)   | Organización plegable, acceso móvil a campos y kit solo en desarrollo.                |
| [Fila horizontal de secciones](decisions/0017-horizontal-section-navigation.md)             | Secciones permanentes, orden horizontal y desplazamiento dentro de la fila.           |
| [Importación con respaldo](decisions/0018-readme-import-with-backup.md)                     | Análisis local, revisión, HTML compatible y reemplazo explícito recuperable.          |
| [Código y formato propios](decisions/0019-code-and-formatting.md)                           | Fuente literal, lenguajes, editor local y alineación con HTML derivado permitido.     |
| [Formato de Presentación](decisions/0020-presentation-formatting.md)                        | Niveles y alineación opcionales, compatibilidad v1/v2 y HTML derivado compartido.     |
| [Archivos de proyecto](decisions/0021-project-files-and-recovery.md)                        | Portabilidad JSON completa, revisión y respaldo independiente del perfil anterior.    |
| [Actividad del propietario](decisions/0022-token-owner-public-activity.md)                  | Consulta con token propio, identidad validada y filtros de datos públicos.            |
| [Tarjetas personalizables](decisions/0023-customizable-activity-cards.md)                   | Siete tarjetas locales, presets visuales y adaptaciones MIT de GitHub Stats Extended. |
| [Suite Extended y MIT](decisions/0024-extended-public-suite-and-mit.md)                     | Diez tipos de tarjeta, datos públicos, ranking opt-in y distribución con avisos.      |
| [Caché y agrupación de cambios](decisions/0025-activity-data-cache-and-preview-batching.md) | Cobertura incremental de datos públicos y solicitudes de imagen tras una pausa breve. |
| [Consulta explícita de tarjetas](decisions/0026-explicit-card-loading-and-local-samples.md) | Selección con muestras locales, aprobación efímera e idioma arriba del formulario.    |
| [Datos temporales en navegador](decisions/0027-browser-activity-data-cache.md)              | Búsqueda agrupada por cobertura, renderizado local y personalización sin consultas.   |
| [Scroll independiente](decisions/0028-independent-editor-scroll.md)                         | Dos paneles nativos en escritorio y flujo natural en pantallas pequeñas.              |
| [Buscar antes de elegir tarjetas](decisions/0029-account-first-activity-search.md)          | Precarga común explícita y faltantes automáticos para la cuenta buscada.              |
| [Precargar todos los contadores](decisions/0030-all-profile-counters-prefetch.md)           | Los 18 contadores del alcance actual preparados antes de personalizar.                |
| [Caché persistida en el navegador](decisions/0031-browser-persistent-activity-cache.md)     | IndexedDB temporal para reutilizar datos públicos al recargar sin consultas.          |
| [API y alojamiento](github-api-and-hosting.md)                                              | Cuota compartida del PAT, cachés y condiciones de Vercel Hobby ante tráfico público.  |
| [Despliegue en Vercel](vercel-deployment.md)                                                | Hobby con PAT, main/dev y comprobación anónima de las tarjetas del README.            |
| [Vercel anónimo con PAT](decisions/0032-vercel-hobby-anonymous-pat.md)                      | Decisión de despliegue inicial, duración de funciones y límites de validación.        |
| [Presentación de proyectos](decisions/0033-project-showcase.md)                             | Título enlazado, portada opcional v2 y composición con HTML derivado validado.        |
| [Presentación y ubicación](decisions/0034-friendly-presentation.md)                         | Ubicación visible, saludo editable y estilos compatibles.                             |
| [Origen estable de tarjetas](decisions/0036-production-card-origin.md)                      | APP_URL prioritario y fallback al dominio estable solo en Vercel Production.          |
| [Descripción breve de proyectos](decisions/0037-project-description-and-links.md)           | Aporte en la descripción, portada y una única URL para el título.                     |
| [Recursos de terceros](../THIRD_PARTY_NOTICES.md)                                           | Procedencia y licencias de iconos, banderas, editor de código y tarjetas Extended.    |
| [Contribuir](../CONTRIBUTING.md)                                                            | Flujo de trabajo, expectativas para cambios y pull requests.                          |

Para conocer la propuesta, empezá por producto. Para trabajar en el código, seguí desarrollo, revisá la arquitectura y acordá un objetivo de contribución concreto.
