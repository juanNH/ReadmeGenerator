# Cómo contribuir

GitHub Profile Generator es un editor visual de README para perfiles de GitHub, con vista previa, exportación e importación local y archivos de proyecto para continuar editando. Antes de proponer cambios, revisá la [definición del producto](docs/product.md) y la [arquitectura](docs/architecture.md). La documentación pública describe las funciones disponibles y sus límites; la planificación de desarrollo se mantiene privada.

## Preparación

Usá Node.js `24.21.0` y pnpm `11.25.0`. Los pasos de instalación, los comandos y el alcance de cada comprobación están en la [guía de desarrollo](docs/development.md).

Creá una rama para el cambio y mantené cada propuesta enfocada en un objetivo. Las ampliaciones de alcance o decisiones que cambien el producto deben discutirse antes de desarrollarlas.

## Criterios para los cambios

- Documentación en español y nombres de código en inglés.
- Interfaz en inglés por omisión y traducción al español, con mensajes separados y un selector funcional. Los cambios de texto deben contemplar ambos idiomas.
- Usar el kit visual y sus patrones antes de incorporar variantes nuevas.
- Permitir navegación con teclado, foco visible, etiquetas claras y estados comprensibles.
- Mantener todos los módulos de perfil opcionales. Ocultar una sección debe conservar sus datos.
- Conservar el recorrido manual sin cuenta y distinguir los conocimientos declarados de las métricas públicas.
- Documentar como planificada cualquier función que todavía no esté disponible.
- Incorporar dependencias y adaptaciones de proyectos con mantenimiento activo verificado en sus fuentes oficiales. Fijar la revisión de los recursos copiados y conservar su procedencia, licencias y avisos.

Los contratos de perfil y las salidas generadas necesitan pruebas de comportamiento. Para cambios visuales o de interacción, revisá también el navegador, el teclado y los estados relevantes. Elegí comprobaciones que cubran el cambio sin duplicar pruebas que solo reproduzcan su implementación.

## Licencia de las contribuciones

El código propio de este proyecto se publica bajo [MIT](LICENSE), con el aviso de copyright de Juan Nicolas Herrera. Al enviar una contribución de código propio, ofrecela bajo esa misma licencia y asegurate de tener autorización para aportarla. Cada persona conserva la titularidad de su contribución; no se solicita una cesión de derechos.

Cuando reutilices código, fuentes, iconos, datos u otros recursos, conservá sus avisos originales y documentá la fuente, versión o commit, licencia y modificaciones en [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). La licencia MIT del proyecto no sustituye la licencia de esos materiales ni concede derechos sobre marcas. No copies código con condiciones desconocidas ni sustituyas avisos ajenos por el copyright del proyecto.

Para cambios de dependencias o recursos de terceros, seguí el [procedimiento de licencias y distribución](docs/open-source.md), regenerá los avisos y revisá el diff. No hace falta una cuenta adicional ni firmar un acuerdo separado para contribuir.

## Validación de una propuesta

```sh
pnpm check
pnpm build
```

Si cambiaste dependencias o recursos distribuidos, ejecutá también `pnpm licenses:generate` y `pnpm licenses:check`; revisá las advertencias del inventario y los avisos incluidos en el artefacto de destino.

Cuando el cambio afecta pantallas o componentes, agregá las comprobaciones que correspondan:

```sh
pnpm test:e2e
pnpm test:a11y
```

Indicá qué ejecutaste y cuál fue el resultado. Si una comprobación no se pudo completar, explicá el motivo. No describas como aprobado un comando que no se ejecutó.

## Pull requests

Usá la plantilla del repositorio para explicar:

- El problema y el resultado observable.
- El alcance del cambio y el objetivo acordado, sin adjuntar planificación privada.
- Las comprobaciones ejecutadas y su resultado.
- El efecto en accesibilidad y, cuando corresponda, evidencia visual.
- Los riesgos, limitaciones o decisiones pendientes que afecten la revisión.

Los commits convencionales, por ejemplo `feat:`, `fix:` o `docs:`, son recomendados para mantener un historial legible. No se exige un formato mediante hooks restrictivos.

## Issues

Usá la plantilla de error para informar pasos reproducibles, resultado esperado y resultado actual. Para una propuesta, describí la necesidad de la persona y un criterio observable de éxito. Evitá incluir datos personales, credenciales o información de repositorios privados en los ejemplos.
