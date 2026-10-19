# Cómo contribuir

Este repositorio está construyendo la base de GitHub Profile Generator. Antes de proponer cambios, revisá la [definición del producto](docs/product.md) y la [arquitectura](docs/architecture.md). La documentación pública describe la propuesta y el estado disponible; la planificación de desarrollo se mantiene privada.

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

Los contratos de perfil y las salidas generadas necesitan pruebas de comportamiento. Para cambios visuales o de interacción, revisá también el navegador, el teclado y los estados relevantes. Elegí comprobaciones que cubran el cambio sin duplicar pruebas que solo reproduzcan su implementación.

## Validación de una propuesta

```sh
pnpm check
pnpm build
```

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
