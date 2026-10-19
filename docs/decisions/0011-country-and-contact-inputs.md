# ADR 0011: Países opcionales y contactos configurados por entrada

- Estado: aceptada.
- Fecha: 2026-10-19.

## Contexto

Ubicación necesita sugerir países y agregar su bandera. El sistema debe mostrarla también cuando la plataforma no soporte el emoji. Contacto requiere crear primero una entrada y configurar dentro su servicio y dirección, conservando nombres personalizados, múltiples webs y proveedores repetidos.

## Decisión

- Conservar el contrato v1: ubicación es texto y cada enlace contiene `id`, `label` y `url`.
- Elegir un país guarda su bandera Unicode y nombre dentro de `location`. Un catálogo estático de 249 países y territorios aporta nombres EN/ES y SVG de flag-icons fijados a un commit. Solo una bandera seguida del nombre exacto EN/ES del mismo país se convierte a imagen decorativa de 20 × 15, junto al nombre escapado. Los demás valores, incluso ubicaciones propias con emoji, siguen siendo texto libre para conservar su significado accesible.
- El autocompletado busca nombres de ambos idiomas y códigos, permite teclado y texto propio. No usa geolocalización. Cambiar el idioma de interfaz conserva el valor guardado.
- Contacto crea una entrada con selector enfocado. La persona elige servicio, web o correo y pasa a URL con Tab, sin cambios de foco al recorrer opciones. El selector es una sugerencia efímera que no sustituye datos; al recuperar se deriva de la URL. El icono siempre se resuelve desde el dominio validado. La etiqueta personalizada sigue en detalles opcionales.

## Alternativas y consecuencias

Usar solo emoji reduce assets, pero depende del sistema para mostrar la bandera. Agregar un campo de país o proveedor requeriría versionar y migrar un contrato que ya representa la elección; mantenerla como texto y derivar la marca evita esa migración. La vista previa reconoce únicamente el marcado exacto del catálogo y resuelve los SVG locales, conservando el mismo Markdown que copia y descarga.

Los recursos de banderas agregan aproximadamente 1,64 MB al repositorio y se solicitan solo al mostrarse; el README referencia su fuente fijada. Requieren mantener catálogo y licencia MIT. Las ubicaciones anteriores no adquieren un país por coincidencia de nombre ni se reescriben. No se infiere nacionalidad, habilidad o actividad a partir de estas elecciones. Ver [recursos de terceros](../../THIRD_PARTY_NOTICES.md).
