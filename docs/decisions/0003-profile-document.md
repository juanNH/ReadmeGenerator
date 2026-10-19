# ADR 0003: Documento de perfil versionado y validación estricta

- Estado: aceptada.
- Fecha: 2026-10-19.
- Ámbito: contrato y operaciones puras de `src/core/`.

## Contexto

El perfil necesita borradores incompletos y módulos opcionales, independientes de la actividad pública. Las entradas externas requieren validación en ejecución además de tipos, sin incorporar framework, navegador, almacenamiento ni servicios al núcleo.

## Decisión

Usar Zod `4.6.7` como dependencia directa y tipos inferidos mediante `z.infer`, evitando duplicar interfaces y validadores. La documentación oficial explica [inferencia y resultados de `safeParse`](https://zod.dev/basics).

Definir `ProfileDocument` con `schemaVersion: 1`, `contentLocale`, `data`, `moduleOrder` y `visibility`. Todos los módulos están presentes: la opcionalidad se expresa con datos vacíos y visibilidad. El orden incluye cada módulo una vez, también si está oculto.

Mantener una forma JSON canónica: `""` para texto vacío, `[]` para colecciones y `null` para elecciones sin completar. El parser no agrega defaults ni coerción. El llamador suministra identificadores e idioma; no se generan valores por reloj o azar.

Rechazar claves desconocidas, también anidadas, mediante `z.strictObject`, documentado en la [API oficial](https://zod.dev/api). No descartar datos silenciosamente. Rechazar versiones incompatibles y no anticipar migraciones sin formatos reales que transformar.

Adaptar errores a códigos y rutas del dominio. Las operaciones reciben documentos ya válidos, validan argumentos y devuelven documentos nuevos compartiendo ramas no modificadas. La fábrica crea estructuras independientes.

## Alternativas

| Alternativa                         | Consecuencia                                                            |
| ----------------------------------- | ----------------------------------------------------------------------- |
| Tipos y validación manual separados | Evita la dependencia, pero duplica el contrato y facilita divergencias. |
| Descartar claves desconocidas       | Puede perder información aparentando una entrada correcta.              |
| Objetos abiertos                    | Admiten datos fuera del contrato versionado.                            |
| Omitir módulos o campos vacíos      | Introduce varias representaciones del mismo borrador.                   |
| Migraciones anticipadas             | Agrega reglas sin formatos anteriores ni evidencia de uso.              |

## Consecuencias y revisión

Zod es una dependencia explícita del núcleo. Las entradas ajenas al contrato requieren adaptadores explícitos. Los consumidores deben tratar los documentos como inmutables, sin asumir congelación profunda.

La validación estructural admite texto, fechas y enlaces incompletos; no garantiza exportación segura. Editor, persistencia, generador e integraciones siguen ausentes.

Revisar ante evolución real del esquema, formatos persistidos que necesiten migración o requisitos concretos de adaptación. Ver [modelo del perfil](../profile-model.md) y [arquitectura](../architecture.md).
