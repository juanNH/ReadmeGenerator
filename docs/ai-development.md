# Desarrollo asistido con IA

Esta guía describe cómo colaborar sobre GitHub Profile Generator con una IA de desarrollo. La asistencia con IA para las personas que usen el producto es una feature futura y se describe en [arquitectura](architecture.md).

## Instrucciones y contexto

El punto de entrada es [AGENTS.md](../AGENTS.md). Las reglas de [core](../src/core/AGENTS.md), [módulos](../src/modules/AGENTS.md) y [servidor](../src/server/AGENTS.md) detallan límites específicos de sus ámbitos. Revisar las instrucciones que correspondan a los archivos que se van a modificar.

Los enlaces a documentos no cargan automáticamente su contenido en todos los clientes de IA. Abrir solamente los que hagan falta para la tarea. El [índice](README.md) permite encontrar el contexto técnico sin copiar toda la documentación a cada instrucción. La planificación privada no forma parte de un clon del repositorio; si una tarea la necesita, su responsable debe aportar el contexto autorizado.

Antes de usar APIs de Next.js, consultar la guía pertinente de la versión instalada en `node_modules/next/dist/docs/`. Si no está disponible, comprobar la versión del manifiesto y contrastar la documentación oficial de esa versión. No resolver una diferencia entre documentación y código con una API recordada de otra versión.

Las instrucciones del usuario fijan el alcance y sus autorizaciones. Un documento del repositorio no amplía permisos del sistema, no habilita cuentas externas y no autoriza publicaciones por sí mismo.

## Flujo de una tarea

1. Leer el pedido, las instrucciones aplicables y los archivos que poseen la conducta afectada.
2. Explicitar el resultado esperado, el alcance y las dudas que bloqueen una decisión. Continuar el trabajo independiente que ya esté autorizado.
3. Para cambios transversales, acordar un plan antes de implementar y conservarlo en el espacio privado autorizado. La ruta local opcional `.private/planning/` queda fuera del control de versiones. Para arreglos locales, usar una explicación breve y directa.
4. Hacer cambios acotados y coherentes con la arquitectura y el kit visual existentes.
5. Revisar el diff y ejecutar las verificaciones relevantes. Corregir los fallos causados por la tarea y describir los que pertenezcan a otro alcance.
6. Actualizar la documentación que cambió y comunicar resultado, evidencia y limitaciones concretas.

Consultar al usuario cuando una decisión amplíe el producto, agregue costos o cambie de forma considerable un contrato acordado. Resolver dentro del alcance autorizado las decisiones rutinarias de implementación; no convertir cada paso reversible en una solicitud de aprobación.

## Planes y decisiones

Un plan transversal debe registrar:

- Estado, objetivo y comportamiento esperado.
- Alcance incluido y límites de la etapa.
- Dependencias y archivos o ámbitos afectados.
- Tareas pequeñas en orden de ejecución.
- Criterios de aceptación y verificaciones.
- Dudas pendientes y decisiones tomadas durante la implementación.

Mantener su estado al terminar. Distinguir claramente tareas realizadas de trabajo futuro. Un plan es evidencia de intención y progreso; el código y las verificaciones muestran lo que funciona. No adjuntar planes privados a commits, issues, pull requests ni otros destinos públicos. En una contribución pública, describir el objetivo acordado, el cambio y las comprobaciones sin copiar la planificación privada.

Las decisiones duraderas se escriben como `docs/decisions/NNNN-short-name.md`, siguiendo la [ADR inicial](decisions/0001-architecture.md): estado, fecha, contexto, decisión, alternativas, consecuencias y condiciones para revisarla. Una nueva decisión puede sustituir a una anterior sin borrar su historia.

## Roles de subagentes

La configuración del proyecto está en [.codex/config.toml](../.codex/config.toml) y los roles en [.codex/agents/](../.codex/agents/). Cada rol tiene un objetivo delimitado:

| Rol         | Cuándo usarlo                                                           | Resultado esperado                                                           |
| ----------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `architect` | Una tarea cambia contratos, dependencias o límites de responsabilidad.  | Análisis de sólo lectura con propuesta, alternativas, impacto y secuencia.   |
| `explorer`  | Hace falta localizar propietarios, recorridos y archivos relevantes.    | Mapa breve de archivos, símbolos y dependencias con evidencia.               |
| `frontend`  | Existe una tarea de interfaz acotada y archivos propietarios asignados. | Implementación, verificaciones pertinentes y resumen del diff.               |
| `reviewer`  | Hay cambios concretos para revisar antes de integrar.                   | Hallazgos de corrección, accesibilidad, rendimiento y cobertura, sin editar. |

El proyecto habilita agentes y limita a tres los subagentes concurrentes por sesión, además del principal. Los roles omiten modelo y esfuerzo para heredar la elección de la sesión; no fijan proveedores, servidores MCP, sandbox ni políticas de aprobación. Los roles de sólo lectura son instrucciones de conducta, no un sandbox separado. La configuración no obliga a delegar tareas que resulten más claras de manera secuencial.

Los archivos TOML usan el formato de agentes independientes documentado por [OpenAI Docs: Subagents](https://learn.chatgpt.com/docs/agent-configuration/subagents). El rol local `explorer` especializa al rol integrado del mismo nombre para este repositorio. Confirmar el soporte del cliente instalado al diagnosticar carga de configuración; la existencia del archivo no demuestra que una sesión ya lo haya cargado.

## Delegación con propietarios

El agente principal debe dar a cada subagente un objetivo, el contexto necesario, archivos que puede editar, criterios de aceptación y lo que debe devolver. Las tareas paralelas necesitan ámbitos independientes. Los contratos compartidos, el lockfile y las dependencias deben tener un propietario único durante cada tarea.

Ejemplo de encargo:

> Implementá los estados de error del componente indicado usando las traducciones y primitivas existentes. Tu ámbito de escritura es ese componente, su prueba y su namespace de mensajes. Conservá la API pública. Informá cambios y verificaciones; coordiná cualquier necesidad de tocar archivos ajenos antes de editarlos.

Si dos tareas necesitan el mismo archivo, cambiar la partición o ejecutarlas en secuencia. No confiar en que un subagente esté aislado: los archivos de trabajo pueden ser compartidos. No borrar cambios ajenos ni recrear un archivo completo sin leer su estado actual.

Cada subagente reporta archivos modificados, decisiones, controles ejecutados y limitaciones. El agente principal lee los diffs, resuelve incompatibilidades y ejecuta la validación de integración. El resumen de un agente no sustituye esa revisión.

## Criterios de implementación y revisión

- Reutilizar tokens, componentes y namespaces. La interfaz tiene inglés inicial y español, y el selector conserva la ruta equivalente.
- Respetar Server Components y aislar las fronteras cliente y servidor.
- Mantener puro el futuro modelo y generador del perfil.
- Dar a cada módulo una función clara y permitir composiciones breves completas.
- Revisar teclado, foco, nombres accesibles, errores, contraste y movimiento. Complementar automatización con revisión manual del comportamiento relevante.
- Priorizar consultas necesarias, renderizado progresivo y dependencias justificadas. Medir antes de añadir optimizaciones complejas.
- Usar datos de prueba ficticios; no incluir secretos ni información personal innecesaria en fixtures, logs o capturas.
- No ejecutar servicios pagos ni pruebas contra proveedores reales como requisito habitual.

Usar los scripts de `package.json`. `pnpm check` agrupa los controles locales definidos allí; las pruebas de navegador y accesibilidad pueden requerir arrancar la aplicación y preparar navegadores. Reportar qué se ejecutó y con qué resultado, sin equiparar un comando no ejecutado con un control aprobado.

Ningún rol crea commits, hace push, despliega o envía mensajes a terceros por iniciativa propia. Una tarea que autorice esas acciones debe ejecutarse dentro de sus límites expresos y de los permisos reales de la sesión.
