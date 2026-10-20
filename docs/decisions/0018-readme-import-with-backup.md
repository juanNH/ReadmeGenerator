# ADR 0018: Importar README mediante revisión y respaldo

- Estado: aceptada para el primer incremento de importación.
- Fecha: 2026-10-20.
- Complementa ADR 0004, 0013, 0015 y 0017.

## Contexto

Una persona con un README existente necesita continuar editando su contenido. El Markdown publicado omite información del documento del editor, como secciones ocultas e identidades, por lo que no tiene una inversa exacta. También puede combinar texto, referencias, tablas y HTML que no caben en los campos visuales planos. El guardado diferido del borrador no ofrece por sí mismo respaldo antes de reemplazar.

## Decisión

- Pegar texto o abrir un `.md` UTF-8 local. Analizar sin red ni escritura del borrador; imponer límites antes y durante el análisis.
- Analizar Markdown estructuralmente y revisar referencias y contenedores antes de dividirlo en secciones. Mantener el documento unido cuando dividir HTML rompa su contexto, con aviso explícito.
- Reconocer encabezados HTML raíz completos sobre el árbol original y sus rangos, manteniendo contexto entre bloques e inline. La cabecera inicial puede reunir nombre y frase con niveles distintos; un H2 que acompaña a un H1 sin cuerpo entre ellos puede ser una frase, mientras que un H2 inicial independiente sigue definiendo jerarquía. Usar separadores H2, o H3 cuando no hay separadores H2, sin cortar encabezados dentro de tablas, desplegables u otros contenedores. Una estructura incierta conserva HTML unido. Los títulos detectados nombran la revisión y permanecen en el HTML con su nivel y atributos admitidos, sin duplicarlos como títulos generados.
- Proponer secciones personalizadas en el orden detectado. Convertir contenido compatible a bloques existentes; representar estructuras complejas mediante HTML admitido y revisable. No inferir módulos fijos, tecnologías ni trayectoria por un título o icono.
- Conservar el original entero y sus rangos. Mostrar original y resultado como código durante revisión, sin montar imágenes, tarjetas ni HTML remoto. Seleccionar secciones es una decisión explícita; los errores impiden aplicar la sección afectada y las exclusiones se informan antes de confirmar.
- Reutilizar `ProfileDocument` v2, el analizador HTML y el generador. No introducir Markdown crudo, ampliar etiquetas o URLs ni habilitar interpretación global de HTML. Copia, descarga y vista previa del perfil aplicado siguen usando la misma salida.
- Guardar el perfil anterior completo y el Markdown original en un registro lateral versionado de último respaldo. Guardar ese registro antes de escribir el candidato. Ofrecer descarga independiente de ambos y restauración confirmada, conservando el respaldo.
- Cuando no hay almacenamiento utilizable o existe un valor protegido, requerir una elección explícita para continuar solo en memoria. Conservar los valores guardados inválidos y v1; esa elección no rehabilita escrituras automáticas. Invalidar debounce y flush anteriores al reemplazo para que no sobrescriban el resultado.
- Hacer el recorrido bilingüe, con panel accesible desde la barra horizontal. Cerrar o revisar no reemplaza el perfil; confirmar devuelve al formulario importado.

## Alternativas

Reconstruir los módulos automáticamente a partir de títulos puede asignar contenido incorrecto. Pegar todo como texto escapado pierde formato. Un bloque genérico de Markdown original ampliaría el contrato de persistencia, exportación y seguridad; queda para una necesidad posterior. Usar IA para el parsing agrega incertidumbre y servicios sin ser necesario para este alcance.

## Consecuencias

El README importado conserva lo que se puede representar y expone diferencias, sin prometer identidad visual o textual con GitHub. Los formatos incompatibles necesitan corrección o exclusión consciente. El respaldo conserva el perfil anterior, incluidos ocultos; no recupera configuración que el README de entrada nunca tuvo. Las rutas relativas y anclas requieren corrección según la política actual. Se mantiene un único último respaldo; no es un historial ni una sincronización entre dispositivos.

Las dependencias de parsing se declaran directamente y con versiones fijadas; se reutiliza el ecosistema presente en el renderizador. Las pruebas protegen ausencia de escritura/cargas durante análisis, entradas hostiles y límites, conversión y orden, confirmación, fallos de almacenamiento, recuperación y escrituras pendientes. Accesibilidad automática y emulación no sustituyen dispositivos físicos o lectores de pantalla.
