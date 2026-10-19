# GitHub Profile Generator

GitHub Profile Generator es un generador visual de README para perfiles de GitHub. Permite crear una presentación personal breve, elegir tecnologías con sus iconos y compartir proyectos, aportes o contacto, aunque haya poca actividad pública.

El repositorio incluye un editor bilingüe de cinco secciones, navegación, configuración estable, vista previa, exportación, borrador local y kit visual. Las secciones incluidas se ordenan mediante arrastre, teclado o botones. Actividad y contribuciones reúne aportes manuales y tarjetas opcionales de GitHub: calendario, resumen y lenguajes. La consulta necesita configuración del servidor; el recorrido manual funciona sin credenciales. El contrato `ProfileDocument` versión 1 conserva sus nueve IDs sin migración. No hay asistencia con IA.

## Ejecutar el proyecto

Requisitos: Node.js `24.21.0` y pnpm `11.25.0`. La versión de Node está en `.nvmrc` y la de pnpm en `package.json`.

```sh
pnpm install
pnpm dev
```

- Aplicación en inglés: [http://127.0.0.1:3000/en](http://127.0.0.1:3000/en).
- Aplicación en español: [http://127.0.0.1:3000/es](http://127.0.0.1:3000/es).
- Editor: [inglés](http://127.0.0.1:3000/en/editor) y [español](http://127.0.0.1:3000/es/editor).
- Kit visual: [inglés](http://127.0.0.1:3000/en/design-system) y [español](http://127.0.0.1:3000/es/design-system).
- Comprobaciones locales: `pnpm check`.
- Compilación para producción: `pnpm build` y luego `pnpm start`.

Consultá la [guía operativa](docs/development.md) para conocer todos los comandos y el estado de la validación.

## La propuesta de producto

El editor ofrece presentación, tecnologías, proyectos, actividad y contribuciones, y contacto. Todas son opcionales. La introducción permite contar quién sos, qué te interesa o qué estás aprendiendo sin repetirlo en otras secciones. Conocimientos, formación y actualidad están retirados del producto, también para borradores anteriores. Sus datos v1 permanecen guardados internamente, sin edición ni exportación y sin fusionarlos con la presentación.

El recorrido funciona sin cuenta: elegir qué compartir, configurar una sección a la vez, revisar y copiar o descargar `README.md`. En pantallas amplias, las secciones están a la izquierda, la configuración en el centro y la vista previa a la derecha. En pantallas angostas, la navegación es plegable y se alterna Editar/Vista previa. Tecnologías ofrece búsqueda, autocompletado y chips con iconos sobre un catálogo local de 259 herramientas, además de texto propio. Incluye herramientas de IA como Claude, Codex y LangGraph, así como Kafka, RabbitMQ y otras herramientas de desarrollo. Su selección no integra esos servicios ni asigna un nivel de habilidad.

Los iconos de tecnologías se presentan en filas que se adaptan al ancho disponible. Contacto ofrece 13 servicios conocidos, como LinkedIn, LeetCode, HackerRank y YouTube, y permite agregar varias webs, portfolios o correos propios y repetir servicios. Cada enlace conserva su nombre y URL; la etiqueta es opcional y el icono corresponde al dominio de la URL. No hace falta empleo, proyecto ni actividad pública para crear un perfil útil.

La vista previa, la copia y la descarga parten del mismo Markdown. Los textos personales se escapan y los iconos exportados se generan exclusivamente desde los catálogos permitidos. El editor usa SVG locales; el README referencia originales de Devicon, Simple Icons y Lobe Icons fijados a commits. No admite HTML libre ni imágenes personalizadas por URL. Ver [recursos de terceros](THIRD_PARTY_NOTICES.md) y [decisión de iconos](docs/decisions/0009-profile-icons.md).

Actividad y contribuciones permite escribir aportes propios sin usuario de GitHub. El bloque opcional de GitHub consulta información pública tras una acción explícita y permite elegir las tarjetas y sugerencias que se quieren mostrar. El formulario no consulta al escribir ni recuperar; las imágenes de tarjetas ya elegidas sí se actualizan al mostrarse. Cero actividad y falta de datos son estados distintos; no se asignan rankings ni niveles de conocimiento. Los snapshots consultados no se guardan en el borrador: solo el usuario, las tarjetas y los aportes elegidos.

El borrador v1 se guarda en el navegador, sin sincronización entre dispositivos ni migración. Los antiguos flags de contribuciones y métricas se presentan como una única sección; ocultarla conserva ambos contenidos. La actividad de GitHub no se usa para medir conocimientos.

## Actividad de GitHub opcional

El editor manual no requiere variables de entorno. Para habilitar consultas, la persona que opera el servidor configura `GITHUB_TOKEN` con un PAT classic dedicado y únicamente **`public_repo`**, fuera de Git y del navegador. La política verifica `x-oauth-scopes` presente, vacío o exactamente `public_repo`; rechaza scopes adicionales, como `repo` y `read:user`, y credenciales no verificables, incluidos tokens fine-grained. El cliente solo ejecuta lecturas; el token público debe guardarse como secreto aunque permita otras operaciones. No hay un formulario para solicitar claves a quienes crean perfiles.

Para exportar tarjetas también se necesita `APP_URL`: el origen HTTPS público de este despliegue, que aloja sus SVG. Se lee en ejecución; cambiarlo requiere reiniciar el servicio, sin recompilar. Sin ese origen se pueden revisar tarjetas mediante rutas locales, pero copia y descarga permanecen deshabilitadas mientras haya tarjetas seleccionadas. Desmarcarlas permite exportar el contenido manual. No alcanza con un servidor en localhost para que GitHub pueda cargar imágenes.

Las tarjetas se actualizan desde la aplicación según caché; no dependen de un servicio externo de gráficos. La consulta usa GraphQL de GitHub, filtra datos públicos y distingue límites de uso, errores y último resultado válido. La integración está preparada; habilitar un servidor con credenciales y verificarlo contra GitHub son pasos operativos explícitos. Ver [.env.example](.env.example), [arquitectura](docs/architecture.md) y [ADR 0010](docs/decisions/0010-github-activity.md).

La base incluye inglés como idioma predeterminado y español, con un selector de idioma funcional. La ruta `/` redirige a `/en`. La dirección visual busca claridad, jerarquía, controles reconocibles y opciones avanzadas que se muestran cuando hacen falta, tomando como referencia la sobriedad de Linear y Vercel sin copiar sus interfaces.

## Documentación

- [Índice de documentación](docs/README.md).
- [Definición del producto y recorrido del usuario](docs/product.md).
- [Desarrollo, comandos y validación](docs/development.md).
- [Arquitectura y límites del código](docs/architecture.md).
- [Contrato del perfil y API del núcleo](docs/profile-model.md).
- [Uso y límites del editor](docs/editor.md).
- [Kit de diseño y criterios de accesibilidad](docs/design-system.md).
- [Guía de trabajo con IA y subagentes](docs/ai-development.md).
- [Cómo contribuir](CONTRIBUTING.md).
