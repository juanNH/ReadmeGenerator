# GitHub Profile Generator

GitHub Profile Generator es un generador visual de README para perfiles de GitHub. La propuesta es que cada persona elija cómo presentar sus conocimientos, experiencia, proyectos y participación, aunque tenga poca actividad pública.

El repositorio está en su etapa inicial: incluye la base de la aplicación y un kit de componentes visuales. El editor de perfiles, la generación de README, las métricas y la asistencia con IA están planificados; todavía no están implementados.

## Ejecutar el proyecto

Requisitos: Node.js `24.21.0` y pnpm `11.25.0`. La versión de Node está en `.nvmrc` y la de pnpm en `package.json`.

```sh
pnpm install
pnpm dev
```

- Aplicación en inglés: [http://localhost:3000/en](http://localhost:3000/en).
- Aplicación en español: [http://localhost:3000/es](http://localhost:3000/es).
- Kit visual: [inglés](http://localhost:3000/en/design-system) y [español](http://localhost:3000/es/design-system).
- Comprobaciones locales: `pnpm check`.
- Compilación para producción: `pnpm build` y luego `pnpm start`.

Consultá la [guía operativa](docs/development.md) para conocer todos los comandos y el estado de la validación.

## La propuesta de producto

El perfil se construirá con nueve módulos opcionales: presentación, conocimientos, tecnologías, formación, actualidad, proyectos, contribuciones, métricas y contacto. Ocultar un módulo conservará sus datos para poder recuperarlo después.

El recorrido previsto empieza sin cuenta, permite completar información manualmente y termina con una vista previa y la exportación del README. GitHub aportará información pública cuando la persona lo elija. Las métricas serán opcionales y no se usarán como medida de conocimiento.

La base incluye inglés como idioma predeterminado y español, con un selector de idioma funcional. La ruta `/` redirige a `/en`. La dirección visual busca claridad, jerarquía, controles reconocibles y opciones avanzadas que se muestran cuando hacen falta, tomando como referencia la sobriedad de Linear y Vercel sin copiar sus interfaces.

## Documentación

- [Índice de documentación](docs/README.md).
- [Definición del producto y recorrido del usuario](docs/product.md).
- [Desarrollo, comandos y validación](docs/development.md).
- [Arquitectura y límites del código](docs/architecture.md).
- [Kit de diseño y criterios de accesibilidad](docs/design-system.md).
- [Guía de trabajo con IA y subagentes](docs/ai-development.md).
- [Cómo contribuir](CONTRIBUTING.md).
