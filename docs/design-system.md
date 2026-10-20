# Sistema de diseño

## Estado y propósito

El kit de GitHub Profile Generator es una herramienta interna de desarrollo: define los tokens y componentes reutilizables del generador. La muestra está disponible en `/en/design-system` y `/es/design-system` solo al ejecutar `pnpm dev`. En una compilación de producción ambas rutas devuelven 404 y no se muestran enlaces en la navegación ni en la portada. La muestra lleva una directiva para no indexarla; no incluye autenticación y no debe alojarse un servidor de desarrollo como servicio público.

Incluye interacciones locales de demostración; no crea perfiles, no consulta GitHub y no publica contenido. Playwright se usa desde el repositorio para revisar recorridos, tamaños de pantalla y accesibilidad automática; no es una sección del producto. El kit y las pruebas se mantienen separados del recorrido de las personas que crean un README.

La dirección busca una herramienta de creación sobria y cercana: superficies claras, texto carbón, acento verde, bordes precisos y una alternativa oscura equivalente. Los bloques breves reciben el mismo cuidado que los perfiles con muchas secciones. La actividad pública no representa un nivel de habilidad.

## Fundamentos y tokens

La fuente de verdad es `src/styles/tokens.css`, importada desde `src/app/globals.css`. `:root` contiene el tema claro y `.dark` el oscuro. `@theme inline` expone utilidades de Tailwind y `@custom-variant dark` conecta sus variantes con la clase de `next-themes`.

| Token                                         | Uso                                                               |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `background`                                  | Fondo de página y áreas de contexto.                              |
| `surface`                                     | Tarjetas y controles.                                             |
| `surface-raised`                              | Superficies secundarias y marcadores de carga.                    |
| `foreground`                                  | Texto principal.                                                  |
| `muted-foreground`                            | Descripciones y contexto. No expresa una opción deshabilitada.    |
| `border`                                      | Separación visual de superficies.                                 |
| `border-strong`                               | Límites de campos y controles que necesitan reconocimiento claro. |
| `accent`, `accent-hover`, `accent-foreground` | Acciones principales y selecciones activas.                       |
| `accent-soft`, `accent-soft-foreground`       | Contexto y confirmaciones de menor énfasis.                       |
| `destructive`, `destructive-soft`             | Errores y acciones de eliminación.                                |
| `warning`, `warning-soft`                     | Situaciones que requieren revisión.                               |
| `ring`                                        | Foco de teclado.                                                  |

Usar clases semánticas, por ejemplo `bg-surface`, `text-muted-foreground` y `border-border`. Evitar colores literales en componentes de producto. El nombre del token conserva su significado al cambiar de tema. La paleta apunta a WCAG AA; cada nueva combinación de fondo, transparencia, texto y estado necesita revisión en su contexto real.

El espaciado parte de una grilla de 4 px. La escala más usada es 4, 8, 12, 16, 20, 24, 32, 48, 64 y 80 px. Los grupos internos usan 8–16 px; los bloques, 20–32 px; las secciones, 64–80 px. Los controles interactivos tienen un área de al menos 44 px. En checkbox y switch el dibujo es menor, pero el botón reserva toda esa superficie.

Los radios son 6 px para etiquetas, 10 px para controles, 16 px para tarjetas y 24 px para composiciones amplias. Los valores internos `--ds-radius-*` se exponen como `rounded-sm`, `rounded-md`, `rounded-lg` y `rounded-xl`. `shadow-soft` aporta una separación mínima y `shadow-panel` queda disponible para paneles. El borde y el espaciado sostienen la jerarquía principal.

Geist Sans se usa para contenido y controles; Geist Mono, para números y pequeños detalles técnicos. Las variables `--font-geist-sans` y `--font-geist-mono` se definen mediante las fuentes locales del layout. Escala habitual: 12 px para contexto, 14 px para controles y cuerpo compacto, 16 px para lectura, 20–24 px para títulos de sección y 36–60 px para presentación. Los campos usan 16 px en pantallas pequeñas para evitar el zoom de entrada de algunos navegadores.

El texto hereda `overflow-wrap: anywhere` para ajustar URLs o cadenas sin espacios cuando no entren; las palabras se conservan completas siempre que haya lugar. `Button` limita su ancho al contenedor y permite etiquetas en varias líneas. Agrupar acciones con ajuste de filas, sin encoger iconos ni superponer estados. El editor usa consultas de contenedor en `em` para adaptar sus columnas también al ampliar la letra; los selectores de contenido responden al ancho de su propio panel. Las regiones de código conservan su política explícita de desplazamiento o salto de línea.

## Componentes y contratos

Las primitivas viven en `src/components/ui/`, se exportan por nombre y combinan clases con `cn` de `src/lib/cn.ts`. No contienen reglas del perfil ni traducciones fijas.

| Componente                       | API y criterio de uso                                                                                                                                                                                                      |
| -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Button`                         | `variant="primary\|secondary\|outline\|ghost\|destructive"`, `size="sm\|default\|lg\|icon"`. CVA tipa las variantes. `type="button"` por defecto; indicar `submit` de forma explícita.                                     |
| `Badge`                          | `variant="neutral\|accent\|success\|warning\|outline"`. Describe tecnologías, contexto o estado; no es un botón.                                                                                                           |
| `Button` / `Badge` con `asChild` | Radix Slot aplica el estilo a un único elemento hijo. Los atributos de enlace pertenecen a ese hijo. Mantener la semántica y el área de toque adecuadas al contenido.                                                      |
| `Input`                          | Props nativas de `input`; tipo texto por defecto. Requiere etiqueta visible y puede recibir `aria-invalid`.                                                                                                                |
| `Textarea`                       | Props nativas de `textarea`; cuatro filas iniciales y redimensionamiento vertical.                                                                                                                                         |
| `Field`                          | Recibe `htmlFor`, `label`, `description?`, `error?`, `required?` y un único control. Asocia automáticamente el id, la ayuda, el error y el estado inválido mediante `cloneElement`. Conserva un `aria-describedby` previo. |
| `Label`                          | Etiqueta nativa exportada desde `field.tsx`. Usar `htmlFor` con controles compuestos.                                                                                                                                      |
| `Card`                           | Contenedor visual con `CardHeader`, `CardTitle`, `CardDescription`, `CardContent` y `CardFooter`. `CardTitle` emite un `h3`; revisar la jerarquía del contexto al componer.                                                |
| `Checkbox`                       | Props de Radix Checkbox, incluido `checked`, `defaultChecked`, `onCheckedChange`, `disabled` y estado `indeterminate`. La etiqueta se compone por fuera.                                                                   |
| `Switch`                         | Props de Radix Switch. Usar para un ajuste que se aplica inmediatamente; etiqueta y descripción externas.                                                                                                                  |
| `Separator`                      | `orientation="horizontal\|vertical"`; decorativo por defecto. `decorative={false}` expone la semántica de separador.                                                                                                       |
| `Skeleton`                       | Marcador decorativo con `aria-hidden`. El contenedor debe describir la carga real cuando exista. La muestra se identifica como demostración estática.                                                                      |

Ejemplo de campo asociado:

```tsx
<Field
  htmlFor="display-name"
  label={t("displayName")}
  description={t("displayNameHelp")}
  error={validationError}
  required
>
  <Input value={name} onChange={(event) => setName(event.target.value)} />
</Field>
```

`Field` marca los campos obligatorios con un asterisco decorativo y el atributo nativo `required`; la pantalla debe explicar el asterisco con texto traducido. Un error combina descripción e icono. En errores dinámicos, el recorrido debe decidir cuándo anunciar cambios y dónde mover el foco, sin anunciar mensajes antes de que la persona pueda actuar.

Los botones deshabilitados conservan un motivo visible cerca y conectado con `aria-describedby`. `asChild` no convierte automáticamente un enlace en deshabilitado: usar un botón nativo para una acción no disponible. Los botones con solo icono necesitan `aria-label`. Los iconos que acompañan texto son decorativos.

## Composición, estados e idiomas

La muestra incluye acciones con respuesta local, campos con ayuda y error intencional, etiquetas, tarjetas, controles Radix y una composición de perfil. Los checkboxes permiten mostrar tecnologías y actividad; un switch cambia el espaciado. Los datos de actividad se identifican como ilustrativos. Ocultar todos los bloques opcionales mantiene una presentación completa.

Los estados previstos son reposo, hover, foco visible, selección, error y deshabilitado. Los errores y selecciones se expresan con texto, semántica o marcas además del color. Ningún bloque exige una cantidad mínima de proyectos o contribuciones. El foco de controles y anclas permanece visible y los efectos respetan `prefers-reduced-motion`.

Los textos pertenecen a `src/messages/en/design-system.json` y `src/messages/es/design-system.json`, en el namespace `DesignSystem`. La página resuelve mensajes en el servidor. Solo esta ruta entrega ese namespace a un `NextIntlClientProvider` para las demostraciones. El encabezado compartido conserva el provider de navegación y controles del layout. Los enlaces internos utilizan `Link` de `src/i18n/navigation`.

El contenido estático de la página permanece en Server Components. Los ejemplos interactivos y controles Radix forman fronteras cliente. Se usan iconos locales y fuentes locales; no se descargan capturas ni bibliotecas visuales completas para la muestra. Incorporar animaciones, estados de carga o nuevas abstracciones cuando resuelvan una necesidad de producto concreta.

## Revisión recomendada

Playwright ya está instalado como herramienta del repositorio. `pnpm test:e2e:ui` abre su interfaz de pruebas para revisar recorridos, resultados y trazas fuera de la navegación del producto. El modo de terminal sigue disponible mediante `pnpm test:e2e`. Para un taller independiente de componentes, [Storybook](https://storybook.js.org/docs) permite desarrollar sus estados de forma aislada; no está instalado en esta entrega.

Revisar ambas rutas y ambos temas, teclado completo, foco visible, zoom al 200 %, ancho de 320 px, etiquetas extensas y preferencia de movimiento reducido. Verificar asociaciones de campos, anuncios de cambios, estados deshabilitados y la diferencia entre checkbox y switch. Comprobar que las opciones alteren solo la composición de demostración y que el cambio de idioma conserve la ruta. Las pruebas automáticas de accesibilidad complementan la revisión manual; no certifican accesibilidad completa.

La verificación integrada debe incluir lint, tipos, formato, compilación y navegación. Este documento describe los contratos y criterios; no afirma resultados de pruebas.

## Referencias de dirección

Referencias oficiales consultadas el 19 de octubre de 2026. Son puntos de partida para decisiones propias, sin copiar activos ni composiciones de producto.

- [Linear](https://linear.app/): referencia editorial para jerarquía sobria y presentación de una herramienta de trabajo.
- [Geist de Vercel](https://vercel.com/geist/introduction): referencia de sistema visual para herramientas de desarrollo.
- [Accesibilidad de Radix Primitives](https://www.radix-ui.com/primitives/docs/overview/accessibility): comportamiento, semántica y responsabilidades de accesibilidad de las primitivas.

Ver también [arquitectura](architecture.md) y [decisión inicial](decisions/0001-architecture.md).
