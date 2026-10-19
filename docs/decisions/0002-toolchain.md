# ADR 0002: Versiones reproducibles y compatibilidad del lint

- Estado: aceptada con una limitación conocida.
- Fecha: 2026-10-19.

## Decisión

Mantener Next.js 16.4.2 y React 19.3.1, versiones estables consultadas al iniciar la base. Usar Node.js 24.21.0 y pnpm 11.25.0, disponibles en el entorno del proyecto. Las dependencias directas se fijan a sus versiones instaladas; el lockfile fija las transitivas. CI instala con `--frozen-lockfile`.

La base usa ESLint 10.13.0 y ejecuta las reglas de Next.js, TypeScript y accesibilidad. ESLint 9, elegido originalmente por el scaffold, ya aparece deprecado en el registro. Se mantiene la versión 10 para conservar un núcleo mantenido.

## Limitación de compatibilidad

Tres plugins transitivos de `eslint-config-next` todavía declaran rangos de peer hasta ESLint 9: `eslint-plugin-import` 2.32.0, `eslint-plugin-jsx-a11y` 6.10.2 y `eslint-plugin-react` 7.37.5. pnpm informa esa advertencia. No se ignora ni se altera su declaración mediante overrides.

El lint del código entregado pasa, pero eso demuestra las reglas y entradas ejecutadas; no significa que los plugins anuncien soporte completo para ESLint 10. Ante una falla real de una regla, revisar el caso mínimo y la actualización oficial antes de desactivar controles. Revisar este punto al actualizar Next.js o esos plugins y registrar cuándo desaparece la advertencia.

## Controles

- Mantener formato, tipos, contratos de traducción y pruebas de navegador independientes del lint.
- Revisar actualizaciones agrupadas de Next/React/configuración mediante PR; Dependabot prepara esos cambios cuando el repositorio ejecute GitHub Actions.
- Las acciones de CI están fijadas a commits verificados, con permisos de lectura. La configuración local no activa reglas de protección de ramas ni publica el proyecto.
- Autorizar en pnpm solamente los scripts de compilación nativa usados por la cadena instalada; no habilitar todos los scripts de dependencias indiscriminadamente.

La evidencia ejecutada se registra en [desarrollo](../development.md).
