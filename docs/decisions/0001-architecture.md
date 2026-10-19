# ADR 0001: Una aplicación Next.js con límites por responsabilidad

- Estado: aceptada para la base inicial.
- Fecha: 2026-10-19.
- Producto: GitHub Profile Generator.

## Contexto

El producto compondrá README de perfiles mediante nueve módulos opcionales. Necesita una interfaz accesible y visual, guardado local inicial y exportación. A futuro puede consultar GitHub y asistir con IA, operaciones que pueden necesitar secretos, control de uso y ejecución del lado del servidor.

La entrega actual prepara el proyecto, el kit visual bilingüe y la documentación. El editor y el documento versionado del perfil todavía no están implementados.

## Decisión

Mantener un repositorio y una aplicación Next.js App Router con TypeScript estricto, Node.js 24 y pnpm. Las versiones exactas se fijan en el manifiesto y el lockfile. Usar Server Components por defecto y fronteras cliente pequeñas para interacción.

Organizar por responsabilidad: `app` compone rutas; `components/ui` ofrece primitivas; `features` coordina recorridos; `modules` presenta secciones; `core` contendrá contratos y generación pura; `server` albergará servicios exclusivos del servidor. Crear código cuando una necesidad concreta lo justifique, sin capas genéricas anticipadas.

Construir un kit con tokens, Tailwind CSS, primitivas Radix, componentes con enfoque shadcn, variantes CVA, Lucide y `next-themes`. Mantener inglés como idioma inicial y español como alternativa completa con `next-intl` y rutas localizadas.

La futura IA propondrá cambios sobre el documento del perfil y reutilizará el generador existente. La base no instala proveedores ni expone endpoints de IA. Las credenciales de cualquier integración permanecerán en código exclusivo del servidor.

## Alternativas consideradas

| Alternativa                                       | Ventaja                                             | Motivo de la decisión                                                                                                          |
| ------------------------------------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| SPA estática con backend incorporado después      | Editor inicial sencillo y despliegue estático.      | Next.js ya fue elegido para conservar interfaz e integraciones futuras en una aplicación.                                      |
| Frontend y API independientes                     | Despliegue y escalado separados.                    | La base actual no necesita esa operación adicional. Se reconsiderará ante requisitos reales.                                   |
| Monorepo con paquetes compartidos desde el inicio | Separación distribuible de contratos y componentes. | Un solo consumidor no requiere publicar ni administrar varios paquetes. Los límites internos permiten extraerlos más adelante. |
| Generación libre del README mediante IA           | Flexibilidad inmediata de redacción.                | El producto requiere edición estructurada, salida predecible y revisión de sugerencias; el generador será determinista.        |

## Consecuencias

- La UI y los servicios futuros pueden evolucionar dentro de una aplicación.
- Los límites cliente/servidor requieren atención explícita en imports y datos serializados.
- El modelo y el generador podrán probarse sin navegador ni proveedores.
- El kit bilingüe permite validar decisiones visuales antes del editor.
- La persistencia local inicial no proporciona sincronización entre dispositivos.
- Un perfil de GitHub sigue sujeto al formato que GitHub admite; la personalización del editor debe respetar esa salida.

## Revisión futura

Revisar la decisión si aparecen varios consumidores del modelo, ejecución asíncrona independiente, sincronización persistente o requisitos de despliegue separados. Documentar una nueva decisión que sustituya ésta y explique su evidencia; no cambiar estructura sólo por anticipar crecimiento.

Ver [arquitectura](../architecture.md).
