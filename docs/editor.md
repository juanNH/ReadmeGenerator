# Editor de README

El editor disponible permite crear un README con presentación y contacto, sin cuenta ni conexión con GitHub. Los otros siete módulos existen en el contrato, pero todavía no tienen formularios ni generación de contenido. No hay asistencia con IA.

## Usarlo

1. Abrí el editor en [inglés](http://127.0.0.1:3000/en/editor) o [español](http://127.0.0.1:3000/es/editor).
2. Activá presentación, contacto o ambas. Ninguna sección es obligatoria; ocultarla conserva sus datos.
3. Completá nombre, rol, descripción o ubicación, y agregá los enlaces de contacto que quieras mostrar. Se puede eliminar cada enlace de forma explícita.
4. Elegí el idioma del README. Solo cambia etiquetas generadas como «Contacto» o «Ubicación»; no traduce tu texto. El selector de idioma de la interfaz es independiente.
5. Revisá la vista previa. Cuando exista contenido visible válido, copiá el Markdown o descargá `README.md`. Ambas acciones usan el mismo contenido que la vista previa.
6. Para publicarlo, seguí las instrucciones de repositorio de perfil que aparecen junto a la exportación. La aplicación no publica ni modifica GitHub por vos.

Una sección visible vacía no agrega títulos sin contenido. Una fila de contacto completamente vacía se omite. Si tiene etiqueta pero no una URL admitida, requiere corrección. Un perfil sin contenido exportable mantiene deshabilitadas copia y descarga.

## Texto y enlaces admitidos

Los campos se interpretan como **texto plano**: escribir Markdown o HTML no habilita formato libre. El generador escapa esos caracteres. La vista previa renderiza el Markdown generado mediante ReactMarkdown 10.1, sin HTML libre ni plugins GFM y con una lista explícita de elementos permitidos. Las fuentes, colores y distribución del editor no se incrustan en el README; su apariencia final depende de GitHub.

Los enlaces de contacto admiten:

- URLs absolutas `http://` o `https://`, sin credenciales, espacios, controles ni barras invertidas. Ejemplo: `https://example.com/portfolio`.
- `mailto:` con un solo buzón ASCII y dominio con al menos dos partes, sin listas, parámetros, fragmentos ni contenido codificado. Ejemplo: `mailto:alex@example.com`.

No se admiten rutas relativas, URLs que comienzan con `//`, `javascript:`, `data:`, enlaces con usuario/contraseña ni un `mailto:` con asunto o cuerpo. Un enlace visible inválido bloquea la exportación y muestra el error junto a su campo; los datos de secciones ocultas no se exportan ni bloquean la salida.

## Guardado y recuperación

El borrador se guarda en este navegador, bajo el mismo origen, sin enviar el perfil a un servidor. La lectura se valida antes de habilitar el guardado automático. Después de editar hay una espera de 500 ms; se intenta guardar también al ocultar o abandonar la página. El estado visible permite distinguir guardado correcto de una dificultad para guardar.

Si el borrador está dañado, es incompatible o no se puede leer, no se reemplaza automáticamente. Se puede trabajar en memoria; iniciar un borrador nuevo requiere confirmación para permitir el reemplazo. Cancelar esa confirmación conserva el valor existente. Si falla una escritura por cuota o restricciones del navegador, el aviso permanece: se puede seguir editando y exportando un README válido, pero los últimos cambios pueden perderse al salir.

El trabajo en memoria se conserva al cambiar el idioma de la interfaz dentro de la misma pestaña, incluido el idioma del README y el estado del error. Esta recuperación temporal no sobrevive a una recarga completa ni al cierre de la pestaña: si el guardado falla, descargá el README antes de recargar o cerrar.

No hay sincronización entre dispositivos, copia de seguridad remota, historial ni importación/exportación de configuración. Cambiar host, puerto o protocolo usa otro almacenamiento; ver [guía operativa](development.md). Un cierre abrupto puede impedir guardar los últimos cambios.

## Compatibilidad del documento

La recuperación conserva el documento completo, incluidos datos ocultos y los otros siete módulos. Si uno de esos módulos está visible, el generador devuelve `unsupported_module`, conserva el contenido y bloquea la exportación completa. No se presenta un README parcial como si incluyera todo el perfil. La interfaz actual no ofrece controles de edición para esos módulos.

El contrato y la API se describen en [modelo del perfil](profile-model.md). Las decisiones técnicas de este editor están en [ADR 0004](decisions/0004-local-readme-editor.md).
