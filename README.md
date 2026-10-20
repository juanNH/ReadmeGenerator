# GitHub Profile Generator

GitHub Profile Generator es un generador visual de README para perfiles de GitHub. Permite crear una presentación personal breve, elegir tecnologías con sus iconos y compartir proyectos, aportes o contacto, aunque haya poca actividad pública.

El repositorio incluye un editor bilingüe con cinco secciones fijas y secciones personalizadas repetibles, navegación, configuración estable, vista previa, exportación, borrador local y kit visual. Las secciones incluidas se ordenan mediante arrastre, teclado o botones. Actividad y contribuciones reúne aportes manuales y tarjetas opcionales de GitHub: calendario, resumen y lenguajes. La consulta necesita configuración del servidor; el recorrido manual funciona sin credenciales. `ProfileDocument` versión 2 conserva las estructuras heredadas y usa un orden mixto de secciones. No hay asistencia con IA.

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

El editor ofrece presentación, tecnologías, proyectos, actividad y contribuciones, y contacto. Todas son opcionales. También podés agregar varias secciones propias con título opcional, párrafos, listas con viñetas o numeradas, enlaces web, subtítulos, separadores, frases destacadas e imágenes o banners. Un selector con ocho muestras pequeñas permite elegir el contenido; los bloques nuevos empiezan sin datos de ejemplo. Se pueden duplicar como copias independientes, ocultar sin perder contenido o eliminar. Las listas y sus ayudas de teclado pertenecen a estas secciones; los demás campos siguen siendo texto plano.

La introducción permite contar quién sos, qué te interesa o qué estás aprendiendo sin repetirlo en otras secciones. Conocimientos, formación y actualidad están retirados del producto, también para borradores anteriores. Sus datos heredados de v1 permanecen guardados internamente, sin edición ni exportación y sin fusionarlos con la presentación.

El recorrido funciona sin cuenta: elegir qué compartir, configurar una sección a la vez, revisar y copiar o descargar `README.md`. En pantallas amplias, las secciones están a la izquierda, la configuración en el centro y la vista previa a la derecha. En pantallas angostas, la navegación es plegable y se alterna Editar/Vista previa. Tecnologías ofrece búsqueda y autocompletado sobre un catálogo local de 358 herramientas, además de texto propio. Incluye frameworks, ORMs, bases de datos, mensajería, infraestructura e IA, como Drizzle, TypeORM, Hono, TanStack, Claude, Codex y LangGraph. Su selección no integra esos servicios ni asigna un nivel de habilidad.

Las tecnologías muestran icono y nombre en filas adaptables, con categorías sugeridas que se pueden renombrar, crear, ordenar o dejar sin título. También se pueden mover y ordenar las herramientas. Los borradores anteriores conservan su organización hasta que la persona decide cambiarla. Contacto ofrece 13 servicios conocidos, como LinkedIn, LeetCode, HackerRank y YouTube, y permite agregar varias webs, portfolios o correos propios y repetir servicios. Cada enlace conserva su nombre y URL; la etiqueta es opcional y el icono corresponde al dominio de la URL. No hace falta empleo, proyecto ni actividad pública para crear un perfil útil.

Ubicación permite autocompletar países por nombre en inglés o español y agregar su bandera, o escribir otro lugar libremente. Contacto comienza con «Agregar red social» y cada entrada permite elegir su servicio o web y completar la dirección; la etiqueta personalizada sigue siendo opcional.

La vista previa, la copia y la descarga parten del mismo Markdown. Los textos personales se escapan y los iconos exportados se generan exclusivamente desde los catálogos permitidos. El editor usa SVG locales; el README referencia originales de Devicon, Simple Icons y Lobe Icons fijados a commits. No admite HTML libre. Ver [recursos de terceros](THIRD_PARTY_NOTICES.md) y [decisión de iconos](docs/decisions/0009-profile-icons.md).

Las imágenes propias se agregan mediante su bloque, con una URL HTTPS pública ya alojada y una descripción alternativa necesaria para exportar. La aplicación no sube archivos: una imagen local o una ruta de repositorio por sí sola no queda publicada. La validación de la dirección es sintáctica, sin comprobar DNS, disponibilidad ni tipo de archivo. La vista previa carga la imagen directamente desde el navegador, sin proxy del servidor; si falla, muestra la descripción y un enlace sin invalidar una dirección admitida. Ver [bloques visuales e imágenes](docs/decisions/0014-custom-visual-blocks.md).

Actividad y contribuciones permite escribir aportes propios sin usuario de GitHub. El bloque opcional de GitHub consulta información pública tras una acción explícita y permite elegir las tarjetas y sugerencias que se quieren mostrar. El formulario no consulta al escribir ni recuperar; las imágenes de tarjetas ya elegidas sí se actualizan al mostrarse. Cero actividad y falta de datos son estados distintos; no se asignan rankings ni niveles de conocimiento. Los snapshots consultados no se guardan en el borrador: solo el usuario, las tarjetas y los aportes elegidos.

El borrador actual se guarda bajo `github-profile-generator.profile.v2` en el navegador, sin sincronización entre dispositivos. Si falta esa clave, un borrador v1 válido se migra en memoria, sin escribir hasta editar y conservando intacto su original. Un v2 inválido no se sustituye con v1 automáticamente. Los flags heredados de contribuciones y métricas se presentan como una única sección; ocultarla conserva ambos contenidos. Ver [secciones personalizadas y migración](docs/decisions/0013-custom-sections.md). La actividad de GitHub no se usa para medir conocimientos.

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
