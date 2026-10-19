# Reglas de `src/core`

Este ámbito contiene el modelo versionado del perfil, sus validaciones, operaciones puras y generación de README para presentación y contacto. Los límites están definidos en [arquitectura](../../docs/architecture.md) y [editor](../../docs/editor.md); ampliar sus funciones requiere una tarea autorizada.

- Mantener TypeScript puro: sin React, Next.js, DOM, `window`, `localStorage`, `fetch`, variables de entorno ni SDKs de proveedores.
- Recibir datos explícitos y devolver resultados deterministas. Recibir también fechas o valores variables cuando afecten la salida.
- Modelar la información como datos serializables. Las funciones de UI y los clientes de servicios no pertenecen al documento guardado.
- Hacer explícita la versión del documento. Definir validación y compatibilidad de importación antes de cambiar formatos persistidos.
- Conservar datos al ocultar módulos; excluir su salida del README. No introducir requisitos globales para activar secciones independientes.
- No derivar conocimientos o niveles de habilidad de commits, estrellas, lenguajes detectados o contribuciones.
- Tratar texto y enlaces del perfil como entradas no confiables. Escapar contenido según el contexto de salida y restringir protocolos; no aceptar HTML arbitrario como atajo.
- El generador actual recibe texto plano y produce Markdown escapado; no interpreta Markdown ni HTML de los campos. Mantener la política explícita de enlaces de contacto y devolver errores para módulos visibles sin soporte, conservando sus datos.
- Generar únicamente salida admitida por el objetivo GitHub. El estilo del editor no autoriza CSS o JavaScript en el README. La vista previa, copia y descarga deben consumir el mismo resultado del generador.
- Ubicar aquí las reglas y contratos compartidos, no formularios ni un registro que importe componentes. La composición de UI pertenece a `src/modules/` o a la feature del editor.
- Proteger invariantes con casos pequeños y relevantes: campos vacíos, módulos ocultos, orden, caracteres especiales y documentos incompatibles. Evitar snapshots enormes como única evidencia.

Consultar [arquitectura](../../docs/architecture.md) para cambios que afecten otros ámbitos.
