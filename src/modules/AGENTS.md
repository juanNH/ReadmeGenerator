# Reglas de `src/modules`

Este ámbito agrupa los módulos opcionales del perfil. La base actual documenta el límite; consultar [arquitectura](../../docs/architecture.md) y el alcance autorizado antes de incorporar módulos funcionales.

- Los módulos previstos son presentación, capacidades, tecnologías, formación, actualidad, proyectos, contribuciones, métricas y contacto.
- Mantener nombres de carpetas y símbolos en inglés. Resolver textos de interfaz mediante namespaces de `next-intl`, con inglés inicial y español completo; los contenidos personales del perfil conservan el idioma que el usuario escribió.
- Cada módulo controla su formulario y su presentación específica. Reutilizar el modelo y las reglas de `src/core/`; no definir un segundo formato del perfil dentro de un componente.
- Mantener visible, oculto y eliminado como acciones distintas cuando se incorporen. Ocultar preserva contenido; eliminar requiere una interacción que explique su efecto.
- Todos los módulos son opcionales. Un bloque no puede exigir que el usuario complete otro sin una dependencia de datos real y documentada.
- Separar estado efímero del formulario, información persistida del perfil y datos remotos. No copiar datos derivados a múltiples fuentes de verdad.
- Formularios con etiquetas, instrucciones, errores asociados y operación por teclado. Ofrecer alternativas accesibles a arrastrar elementos.
- Reutilizar `src/components/ui/` y tokens. No introducir un sistema visual separado por módulo.
- Mantener lógica de formato exportable en el generador puro; no construir un README diferente dentro de la vista previa.
- Consultar servicios por la frontera acordada. No importar `src/server/` desde Client Components ni incorporar secretos en el navegador.
- Evitar dependencias directas entre módulos. Compartir reglas en `core` y coordinación del recorrido en `features` cuando exista una necesidad concreta.
- Agregar evidencia contextual sobre capacidades es opcional. No convertir métricas o proyectos públicos en requisito para declarar conocimientos o formación.

Leer [arquitectura](../../docs/architecture.md) y el plan de la feature antes de cambiar contratos compartidos.
