# ADR 0016: Navegación superior y kit interno

- Estado: herramientas internas vigentes; selector y organizador sustituidos por ADR 0017.
- Fecha: 2026-10-19.
- Complementa ADR 0006; sustituye su disposición lateral y la muestra pública del kit.

## Contexto

La disposición de navegación de esta decisión fue revisada en [ADR 0017](0017-horizontal-section-navigation.md): las secciones ahora permanecen en una fila horizontal. Se conserva aquí el contexto de la iteración y la decisión de mantener las herramientas de desarrollo fuera del producto público.

En teléfonos, no alcanza con evitar desbordamiento horizontal. La cabecera, la organización de secciones y las nueve muestras de bloques podían ocupar varias pantallas antes de los campos. Los títulos personalizados largos se repetían encima de su entrada. La persona responsable también aclaró que el kit debía ser una herramienta de desarrollo, sin aparecer como función pública.

## Decisión

- Seleccionar secciones desde una barra superior compacta. El selector conserva el foco al recorrer opciones y diferencia las incluidas de las que se pueden agregar.
- Ofrecer inclusión, orden y arrastre en un organizador plegable con altura acotada. Abrirlo desde una edición larga lo lleva a pantalla; cerrar devuelve el foco al disparador. Elegir una sección desde el organizador cierra y enfoca su configuración. Escape durante un arrastre conserva la cancelación de la librería.
- Mantener la barra disponible al desplazarse cuando su alto deje suficiente área de edición. Medir también el viewport visual, para evitar fijar una barra demasiado grande cuando se amplía la letra o aparece el teclado en pantalla.
- Alternar edición/vista previa solo cuando se muestra un panel por vez; al cambiar, mostrar su inicio conservando el foco del botón. En escritorio amplio se muestran ambos paneles y se oculta ese conmutador.
- Mantener breve el encabezado de las instancias personalizadas; el título real permanece en el selector, su campo y el README. Mostrar las nueve muestras al abrir «Agregar bloque», inicialmente abierto solo para una sección vacía y cerrado después de elegir.
- Retirar enlaces públicos al kit y devolver 404 para `/design-system` en producción. Conservar la muestra local bajo `pnpm dev` y los tokens/primitivas existentes. Playwright y axe continúan como herramientas del repositorio. Storybook es una alternativa para un taller de componentes independiente, sin agregarlo ni presentar una integración inexistente.

## Alternativas

Una lista completa arriba conserva demasiada altura en móvil. Una tira de pestañas horizontales dificulta encontrar títulos largos o muchas instancias. La barra lateral reduce el ancho disponible y requiere un segundo patrón en teléfonos. Publicar el taller de componentes añade una ruta ajena a crear un README.

## Consecuencias

El organizador no modifica las reglas del documento ni la identidad de las secciones. Selección, vista, foco, expansión y medidas son estados efímeros. Se conservan guardado, generación y alternativas a arrastrar. Las pruebas deben cubrir alturas de teléfono, llegada al primer campo, uso desde una edición larga y teclado real, además de ancho, nombres accesibles y contraste automático. La emulación no reemplaza dispositivos físicos ni lectores de pantalla.
