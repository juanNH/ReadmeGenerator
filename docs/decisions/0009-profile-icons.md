# ADR 0009: Catálogos ampliados e iconos de contacto según URL

- Estado: aceptada.
- Fecha: 2026-10-19.
- Producto: GitHub Profile Generator.
- Actualiza las fuentes y la presentación de iconos de [ADR 0007](0007-simple-profile.md), conservadas por [ADR 0008](0008-focused-profile.md). Sustituye su restricción a Devicon; mantiene las cinco secciones, el retiro de conocimientos/formación/actualidad y la compatibilidad v1.

## Contexto

El catálogo inicial cubría 48 herramientas y la vista previa podía presentar los iconos en una columna de imágenes de bloque. La revisión solicita filas compactas y adaptables, más herramientas de uso habitual y de IA, y contactos reconocibles mediante iconos sin impedir compartir un portfolio propio.

El generador debe seguir siendo determinista y producir el mismo Markdown para vista previa, copia y descarga. Ampliar el catálogo no exige nuevas propiedades del documento, consultas remotas durante la búsqueda ni aceptar imágenes escritas por la persona.

## Decisión

### Tecnologías

Mantener el autocompletado por nombre y alias, los chips con acción de quitar y el texto propio como alternativa. El catálogo local se amplía a 259 entradas de lenguajes, frameworks, datos, mensajería, infraestructura, herramientas de desarrollo y de IA. La presencia de una herramienta no representa un ranking del mercado ni un nivel de habilidad. Mostrar Claude, Codex o LangGraph no integra esos servicios con la aplicación.

Las tecnologías reconocidas y sin contexto adicional generan iconos de 32 × 32 con nombre alternativo desde metadatos permitidos. La vista previa los dispone en filas flexibles con espacio y salto de línea según el ancho disponible. El README conserva etiquetas de imagen en línea con dimensiones explícitas; el estilo CSS del editor no se exporta.

Los nombres propios o las entradas con contexto conservan su salida textual escapada. Grupos, nombres, contextos e IDs v1 se preservan; agregar una herramienta sigue guardando su nombre y un contexto vacío, sin URLs o IDs de catálogo nuevos.

### Fuentes fijadas y marcas

Los SVG locales se copian sin modificaciones desde fuentes oficiales y sus URLs exportadas se fijan a los mismos commits:

| Uso         | Fuente y commit                                                                                                                                                  | Licencia |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Tecnologías | [Devicon, `6a37858047b0e8d9c9c0e68f4a071fc410652e89`](https://github.com/devicons/devicon/commit/6a37858047b0e8d9c9c0e68f4a071fc410652e89)                       | MIT      |
| Tecnologías | [Simple Icons, `c71c69e3a27e4436936b831c72643e6513b9f49b`](https://github.com/simple-icons/simple-icons/commit/c71c69e3a27e4436936b831c72643e6513b9f49b)         | CC0 1.0  |
| Tecnologías | [Lobe Icons, `8a1b2821bb768c484fe8da20c5e1838b6bf551a9`](https://github.com/lobehub/lobe-icons/commit/8a1b2821bb768c484fe8da20c5e1838b6bf551a9)                  | MIT      |
| Contacto    | [Simple Icons 11.15.0, `0af835e2949a9222965522780e5e0810d3c53382`](https://github.com/simple-icons/simple-icons/commit/0af835e2949a9222965522780e5e0810d3c53382) | CC0 1.0  |

La procedencia por archivo y las licencias completas se registran en [recursos de terceros](../../THIRD_PARTY_NOTICES.md). Los iconos identifican marcas de sus titulares y no implican respaldo. Algunas entradas comparten una marca de familia: React Native usa React; JetBrains AI usa JetBrains; ChatGPT y OpenAI comparten OpenAI. No se presenta esa correspondencia como un logotipo exclusivo del producto. Codex usa su SVG específico.

### Contacto

Ofrecer un selector sugerido con LinkedIn, LeetCode, HackerRank, YouTube, Facebook, Instagram, GitHub, X, Bluesky, DEV Community, Medium, Twitch y Stack Overflow, además de portfolio/web propia y correo. Al agregar se enfoca la URL. La etiqueta personalizada es opcional y queda en detalles secundarios.

El proveedor se deriva únicamente de la URL normalizada y de dominios explícitos en `core/contact`. La etiqueta y la selección efímera del formulario no pueden asignar un icono a otra dirección. No se usan coincidencias parciales de hostname, subdominios arbitrarios, credenciales o puertos no estándar para reconocer una marca. Las URLs desconocidas que cumplen la política de enlaces siguen siendo válidas y no se bloquean por no estar en el catálogo.

Un contacto reconocido se exporta como enlace de Markdown que contiene un icono de 20 × 20 y su etiqueta escapada. El icono es decorativo, con `alt=""`, porque el texto visible ya nombra el enlace. Una etiqueta vacía usa el nombre del servicio reconocido; webs propias o correos sin proveedor usan la dirección y no reciben una imagen exportada. El formulario puede mostrar un icono genérico de web o correo.

El documento conserva `links` con `id`, `label` y `url`, sin campos nuevos ni migración. Se preservan los IDs opacos y los errores de URL incluyen su índice original.

### Reconocimiento cerrado en la vista previa

`remarkProfileIcons` convierte únicamente tokens exactos emitidos por los generadores de los catálogos en nodos de imagen, tanto en filas tecnológicas como dentro de enlaces de contacto. El componente comprueba nombre/URL para tecnologías o URL permitida y alternativa vacía para contacto antes de servir el SVG local correspondiente.

Se mantienen `skipHtml`, la lista de elementos admitidos y la ausencia de `rehypeRaw`. No se acepta HTML libre, atributos de imagen personales ni URLs arbitrarias de imágenes. Los textos del perfil siguen siendo texto plano escapado y las políticas HTTP/HTTPS y `mailto:` permanecen vigentes.

## Alternativas consideradas

| Alternativa                                        | Ventaja                                             | Motivo de la decisión                                                                        |
| -------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Mantener solo Devicon                              | Una fuente y una licencia.                          | No cubre todas las herramientas de IA y contacto solicitadas.                                |
| Consultar iconos o proveedores durante la búsqueda | Catálogo actualizable sin cambiar archivos locales. | Agrega dependencia de red y resultados variables al recorrido básico.                        |
| Permitir imágenes propias por URL                  | Más libertad visual.                                | Amplía la superficie de entrada y renderizado sin ser necesaria para los iconos solicitados. |
| Guardar proveedor y URL de icono en cada contacto  | Resolución directa en el documento.                 | Duplica datos derivados y exige modificar v1 sin una necesidad real.                         |
| Usar la etiqueta para identificar el proveedor     | No necesita analizar el destino.                    | Puede mostrar una marca en un dominio diferente y confundir a quien abre el enlace.          |

## Consecuencias

- El catálogo necesita mantener metadatos, copias SVG, URLs fijadas y licencias coordinados al ampliarse.
- Las búsquedas y la vista previa usan datos locales; los iconos del README dependen de la disponibilidad externa de sus URLs fijadas y de cómo GitHub las presenta.
- El reconocimiento exacto y la comprobación de las imágenes deben cubrir tokens alterados, atributos inesperados, dominios impostores, etiquetas personalizadas y herramientas desconocidas.
- Los iconos decorativos de contacto evitan repetir el nombre accesible del enlace; las tecnologías conservan nombres alternativos legibles.
- Se mantienen las cinco secciones y los nueve IDs internos. Contribuciones sigue siendo manual; gráficas de GitHub, tarjetas autogeneradas y asistencia con IA no están implementadas por esta decisión.

Ver [editor](../editor.md), [arquitectura](../architecture.md) y [modelo del perfil](../profile-model.md).
