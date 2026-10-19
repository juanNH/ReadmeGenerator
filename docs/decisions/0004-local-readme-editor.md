# ADR 0004: Editor local y Markdown compartido

- Estado: aceptada.
- Fecha: 2026-10-19.
- Ámbito: presentación, contacto, generación, vista previa y borrador local.

## Contexto

El editor necesita convertir entradas de la persona en una salida reproducible, con vista previa y exportación coherentes, sin requerir cuenta ni servicios externos. El contrato del perfil contiene nueve módulos; el editor y generador actuales admiten presentación y contacto.

## Decisión

Recibir texto plano y generar Markdown escapado en `src/core/readme/`. El generador recibe un documento estructuralmente válido y comprueba por separado los límites de salida. Devuelve Markdown o errores con código y ruta: `empty_profile`, `invalid_url` y `unsupported_module`. No producir una exportación parcial silenciosa ante módulos visibles sin soporte.

Admitir HTTP/HTTPS absolutos sin credenciales, espacios, controles ni barras invertidas, y `mailto:` con un solo buzón ASCII sin parámetros. Los datos ocultos permanecen en el documento y no intervienen en la salida.

Usar el mismo Markdown para vista previa, portapapeles y descarga. Renderizar la vista previa con ReactMarkdown 10.1, sin HTML libre ni plugins GFM, con elementos permitidos explícitos. El diseño del editor no es un formato exportable. `contentLocale` gobierna las etiquetas del README y permanece separado del idioma de interfaz y del texto escrito.

Mantener el borrador en `localStorage` a través de un adaptador de la feature del editor. Recuperarlo y validarlo antes de habilitar escrituras. Guardar tras 500 ms y efectuar un intento de vaciado al abandonar, ocultar o desmontar la página. Proteger valores inválidos o inaccesibles: el reemplazo requiere confirmar un borrador nuevo. Ante un fallo de escritura, conservar edición en memoria, aviso persistente y exportación válida disponible.

Conservar temporalmente ese estado en el módulo cliente cuando no se puede guardar: la navegación entre idiomas remonta el editor y debe recuperar el documento completo sin depender del almacenamiento fallido. Leerlo después de hidratar y escribirlo solo desde efectos cliente. Un guardado correcto elimina ese respaldo efímero; no sobrevive a recargar ni cerrar la pestaña.

## Alternativas

| Alternativa                                          | Consecuencia                                                                                                  |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Editar HTML o Markdown libre                         | Amplía la interpretación de entrada y dificulta mantener una vista previa y controles de salida consistentes. |
| Renderizar una vista previa desde los formularios    | Duplica reglas y permite diferencias con el archivo exportado.                                                |
| Guardar en un servidor                               | Requiere identidad, operación y política de datos adicionales para este recorrido sin cuenta.                 |
| Reemplazar una lectura fallida por valores iniciales | Puede destruir información incompatible o temporalmente inaccesible.                                          |

## Consecuencias y revisión

El recorrido funciona sin red ni credenciales para generar el README. El borrador depende del origen y navegador: no tiene sincronización, respaldo remoto ni garantía de persistencia ante un cierre abrupto. Un fallo de almacenamiento no impide editar ni exportar, pero puede perder cambios al salir.

El modelo conserva los otros siete módulos sin prometer formularios o generadores. La exportación requiere resolver cualquier módulo visible sin soporte; no se eliminan sus datos. No hay personalización libre del formato ni portabilidad de configuración mediante archivos.

Revisar ante formatos adicionales de salida, nuevas políticas de enlaces o requisitos concretos de persistencia y compatibilidad. Las decisiones anteriores describen el estado de sus entregas y conservan su valor histórico. Ver [editor](../editor.md), [modelo](../profile-model.md) y [arquitectura](../architecture.md).
