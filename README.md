# GitHub Profile Generator

GitHub Profile Generator es un generador visual de README para perfiles de GitHub. La propuesta es que cada persona elija cómo presentar sus conocimientos, experiencia, proyectos y participación, aunque tenga poca actividad pública.

El repositorio incluye un editor bilingüe para presentación y contacto, vista previa y exportación de README, guardado local y un kit visual. El contrato `ProfileDocument` versión 1 contempla nueve módulos; los otros siete todavía no tienen formularios ni generación de contenido. Las consultas a GitHub y la asistencia con IA no están integradas.

## Ejecutar el proyecto

Requisitos: Node.js `24.21.0` y pnpm `11.25.0`. La versión de Node está en `.nvmrc` y la de pnpm en `package.json`.

```sh
pnpm install
pnpm dev
```

- Aplicación en inglés: [http://127.0.0.1:3000/en](http://127.0.0.1:3000/en).
- Aplicación en español: [http://127.0.0.1:3000/es](http://127.0.0.1:3000/es).
- Editor: [inglés](http://127.0.0.1:3000/en/editor) y [español](http://127.0.0.1:3000/es/editor).
- Kit visual: [inglés](http://127.0.0.1:3000/en/design-system) y [español](http://127.0.0.1:3000/es/design-system).
- Comprobaciones locales: `pnpm check`.
- Compilación para producción: `pnpm build` y luego `pnpm start`.

Consultá la [guía operativa](docs/development.md) para conocer todos los comandos y el estado de la validación.

## La propuesta de producto

El modelo contempla nueve módulos opcionales: presentación, conocimientos, tecnologías, formación, actualidad, proyectos, contribuciones, métricas y contacto. El editor permite completar y ocultar presentación y contacto, conservando sus datos. La vista previa, la copia y la descarga usan el mismo Markdown generado a partir de texto plano y enlaces admitidos.

El recorrido disponible funciona sin cuenta: completar las dos secciones, revisar el resultado y copiarlo o descargar `README.md`. El borrador se guarda en el navegador, sin sincronización entre dispositivos. GitHub aportará información pública cuando exista esa integración y la persona lo elija. Las métricas serán opcionales y no se usarán como medida de conocimiento.

La base incluye inglés como idioma predeterminado y español, con un selector de idioma funcional. La ruta `/` redirige a `/en`. La dirección visual busca claridad, jerarquía, controles reconocibles y opciones avanzadas que se muestran cuando hacen falta, tomando como referencia la sobriedad de Linear y Vercel sin copiar sus interfaces.

## Documentación

- [Índice de documentación](docs/README.md).
- [Definición del producto y recorrido del usuario](docs/product.md).
- [Desarrollo, comandos y validación](docs/development.md).
- [Arquitectura y límites del código](docs/architecture.md).
- [Contrato del perfil y API del núcleo](docs/profile-model.md).
- [Uso y límites del editor](docs/editor.md).
- [Kit de diseño y criterios de accesibilidad](docs/design-system.md).
- [Guía de trabajo con IA y subagentes](docs/ai-development.md).
- [Cómo contribuir](CONTRIBUTING.md).
