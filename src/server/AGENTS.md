# Reglas de `src/server`

Este ámbito reserva las integraciones con GitHub y la asistencia con IA para etapas posteriores. No crear endpoints ficticios ni proveedores vacíos para aparentar una integración terminada.

- Marcar las implementaciones exclusivas del servidor con `import "server-only"`. No importar este ámbito desde componentes o utilidades que llegan al navegador.
- Mantener secretos en variables de entorno del servidor, fuera de Git y de `NEXT_PUBLIC_`. No registrar tokens, documentos personales completos ni respuestas sensibles.
- Validar y limitar entradas al llegar desde una ruta, acción o servicio externo. Los tipos TypeScript no validan solicitudes en ejecución.
- Mantener Route Handlers y Server Actions pequeños. Concentrar en este ámbito el acceso externo y la traducción de sus respuestas al contrato interno.
- Tratar como públicas las rutas públicas aunque sus consumidores previstos sean componentes propios. Definir límites de uso, tamaño, tiempo de espera y manejo de errores antes de exponer operaciones costosas.
- Para GitHub, definir permisos mínimos, caché, límites y datos públicos permitidos antes de habilitar credenciales. No filtrar datos privados accesibles al token del servicio.
- Distinguir datos capturados al generar de recursos que se actualizan posteriormente. Documentar quién hospeda y actualiza cada tarjeta.
- Para futura IA, enviar únicamente los datos necesarios para la acción solicitada y validar las sugerencias contra el contrato del perfil. Su aplicación necesita una revisión explícita de los cambios por parte del usuario.
- La asistencia propondrá cambios sobre datos existentes; el generador de `core` seguirá produciendo el README. No inventar formación, experiencia, proyectos o niveles de conocimiento.
- Separar contratos serializables de las implementaciones del proveedor. No instalar SDKs ni agregar credenciales hasta que exista una feature aprobada que los use.
- Verificar integraciones con respuestas controladas y errores relevantes. Las pruebas habituales no realizan llamadas facturables ni requieren secretos reales.

Ver [arquitectura](../../docs/architecture.md) y [trabajo con IA](../../docs/ai-development.md).
