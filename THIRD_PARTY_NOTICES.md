# Recursos de terceros

## Banderas de países y territorios · flag-icons

Los 249 SVG de `public/country-flags/` proceden de [flag-icons 7.3.2](https://github.com/lipis/flag-icons/tree/fe15c16e7463d0c66d6c5730e9d0e832438d98e1), fijado al commit `fe15c16e7463d0c66d6c5730e9d0e832438d98e1`. Se copian sin modificaciones desde `flags/4x3/{code}.svg`, para las entradas de dos letras con `iso: true` del [catálogo de origen](https://github.com/lipis/flag-icons/blob/fe15c16e7463d0c66d6c5730e9d0e832438d98e1/country.json). Los códigos representan países y territorios; la selección no infiere nacionalidad ni ubicación y no usa geolocalización.

La colección se distribuye bajo licencia MIT, copyright (c) 2013 Panayiotis Lipiridis. La licencia íntegra se conserva en [public/country-flags/LICENSE.txt](public/country-flags/LICENSE.txt).

Los nombres en inglés y español se generaron una sola vez mediante `Intl.DisplayNames` de Node.js 24.21.0, ICU 78.3 y CLDR 48.0. Se guardan como datos estáticos en `src/core/location/country-names.ts`; el editor no descarga catálogos ni depende de los nombres regionales del navegador durante el uso. El README utiliza únicamente las URLs de banderas fijadas al mismo commit; la vista previa usa sus equivalentes locales. Las banderas se muestran como imágenes para que su presentación no dependa del soporte de emoji del sistema.

## Iconos de contacto · Simple Icons

Los 13 SVG de `public/contact-icons/` proceden de [Simple Icons 11.15.0](https://github.com/simple-icons/simple-icons/tree/0af835e2949a9222965522780e5e0810d3c53382), fijados al commit `0af835e2949a9222965522780e5e0810d3c53382`. Se conserva su licencia CC0-1.0 en [public/contact-icons/LICENSE.txt](public/contact-icons/LICENSE.txt). Los nombres y las marcas pertenecen a sus respectivos titulares; la inclusión permite identificarlos y no implica respaldo.

## Devicon

248 SVG de `public/technology-icons/` proceden de [Devicon](https://github.com/devicons/devicon), fijado al [commit 6a37858047b0e8d9c9c0e68f4a071fc410652e89](https://github.com/devicons/devicon/commit/6a37858047b0e8d9c9c0e68f4a071fc410652e89). React y React Native comparten el original de React; SvelteKit utiliza la marca de su familia Svelte. Los nombres locales cambian, pero los contenidos SVG se conservan.

El catálogo de `src/core/technologies/index.ts` relaciona cada archivo local con su URL pública fijada al mismo commit. No se consulta Devicon para buscar o seleccionar herramientas durante el uso del editor.

Devicon se distribuye bajo licencia MIT. La copia completa se conserva en [public/technology-icons/LICENSE.txt](public/technology-icons/LICENSE.txt).

Los nombres, logotipos y marcas pertenecen a sus respectivos titulares y se utilizan para identificación. Su inclusión no implica respaldo; se aplican las políticas de marca de cada titular, tal como indica el proyecto original.

### Licencia MIT de Devicon

```text
The MIT License (MIT)

Copyright (c) 2015 konpa

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Simple Icons: tecnologías y herramientas de IA

82 SVG del catálogo de tecnologías proceden de [Simple Icons](https://github.com/simple-icons/simple-icons), fijado al [commit c71c69e3a27e4436936b831c72643e6513b9f49b](https://github.com/simple-icons/simple-icons/commit/c71c69e3a27e4436936b831c72643e6513b9f49b). Incluyen herramientas de IA, ORMs, interfaces, autenticación, datos, infraestructura, calidad y diseño. Las entradas de TanStack Query, Router, Table, Form y Start comparten la marca TanStack; no se presentan como logotipos exclusivos de cada biblioteca. Actix Web utiliza la marca Actix y los alias Oxlint/Oxfmt remiten a la familia Oxc.

Los contenidos se copian sin modificaciones desde `icons/{slug}.svg`; los nombres locales se relacionan con los originales mediante `src/core/technologies/index.ts`. JetBrains AI utiliza la marca de su familia JetBrains; no se presenta como un logotipo exclusivo del asistente. Los SVG monocromos conservan el color original de la colección y se muestran sobre un fondo claro en el editor.

Simple Icons publica la colección bajo CC0 1.0 Universal. La copia completa se conserva en [public/technology-icons/LICENSE-SIMPLE-ICONS.txt](public/technology-icons/LICENSE-SIMPLE-ICONS.txt). Los logotipos siguen siendo marcas de sus titulares; la licencia del catálogo no sustituye sus directrices. Consultar el [aviso legal de la colección fijada](https://github.com/simple-icons/simple-icons/blob/c71c69e3a27e4436936b831c72643e6513b9f49b/DISCLAIMER.md).

## Lobe Icons: herramientas de IA

28 SVG del catálogo de tecnologías proceden de [Lobe Icons](https://github.com/lobehub/lobe-icons), fijado al [commit 8a1b2821bb768c484fe8da20c5e1838b6bf551a9](https://github.com/lobehub/lobe-icons/commit/8a1b2821bb768c484fe8da20c5e1838b6bf551a9). Son `antigravity`, `cerebras`, `chatgpt`, `cline`, `codex`, `cohere`, `crewai`, `deepseek`, `dify`, `firecrawl`, `fireworks`, `gemini-cli`, `groq`, `junie`, `langfuse`, `langsmith`, `llamaindex`, `lm-studio`, `mastra`, `mcp`, `openai`, `openrouter`, `qwen`, `replicate`, `roo-code`, `v0`, `vllm` y `windsurf`.

Los contenidos se copian sin modificaciones desde `packages/static-svg/icons/{asset}.svg`. ChatGPT y OpenAI comparten la marca de OpenAI; Codex utiliza su propio SVG de Codex. Las correspondencias y URLs fijadas están en `src/core/technologies/index.ts`. Los nombres de productos, marcas y logotipos pertenecen a sus titulares; su presencia identifica una herramienta y no implica respaldo ni integración con ella.

Lobe Icons se distribuye bajo licencia MIT, copyright (c) 2023 LobeHub. La copia completa con el aviso de copyright se conserva en [public/technology-icons/LICENSE-LOBE-ICONS.txt](public/technology-icons/LICENSE-LOBE-ICONS.txt).

En total, el catálogo de tecnologías incluye 358 entradas y 358 SVG locales. Buscar y seleccionar herramientas no consulta a estos proveedores ni carga un paquete de iconos remoto. El README exportado referencia únicamente las URLs fijadas de esas entradas.

### Criterio de ampliación del catálogo

La ampliación incorpora frameworks, bibliotecas, ORMs, autenticación, plataformas de datos, infraestructura y herramientas de IA con identidades verificables en las colecciones fijadas. La clasificación es una sugerencia editorial modificable; no representa un ranking de uso, una recomendación técnica ni un nivel de habilidad.

Las familias y funciones se contrastaron con documentación primaria, entre ellas [Drizzle ORM](https://orm.drizzle.team/docs/overview), [TypeORM](https://typeorm.io/docs/getting-started/), [Knex.js](https://knexjs.org/), [TanStack](https://tanstack.com/), [Hono](https://hono.dev/), [Pydantic](https://docs.pydantic.dev/latest/), [Better Auth](https://better-auth.com/docs/introduction), [Qdrant](https://qdrant.tech/documentation/) y [Temporal](https://docs.temporal.io/). El catálogo mantiene las rutas y contenidos de los iconos existentes. No se inventan logotipos para herramientas ausentes de las fuentes admitidas; siguen disponibles como texto propio.

## CodeMirror y Lezer: edición y resaltado de código

La aplicación utiliza [CodeMirror 6](https://github.com/codemirror/dev) para la edición de fuentes y [Lezer](https://github.com/lezer-parser/highlight) para análisis y resaltado local. Los paquetes directos y versiones exactas constan en `package.json`; el árbol completo está fijado en `pnpm-lock.yaml`. Incluye state, view, language, commands, gramáticas HTML/JavaScript/JSON/Python/Markdown/PHP, modos heredados seleccionados y highlight. Se cargan en el navegador bajo demanda; no envían la fuente a un servicio.

Estos paquetes se distribuyen bajo licencia MIT por Marijn Haverbeke y otros colaboradores. Cada paquete instalado conserva su archivo `LICENSE` con los avisos y condiciones completos; las licencias también se publican en sus repositorios oficiales. La instalación no altera el período mínimo de antigüedad de paquetes del repositorio. El resaltado no modifica la licencia del contenido que escribe una persona ni la política del HTML admitido.

### Avisos MIT conservados

CodeMirror (`@codemirror/*`), copiado del paquete fijado:

```text
MIT License

Copyright (C) 2018-2021 by Marijn Haverbeke <marijn@haverbeke.berlin> and others

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```

Lezer (`@lezer/highlight`), copiado del paquete fijado:

```text
MIT License

Copyright (C) 2018 by Marijn Haverbeke <marijn@haverbeke.berlin> and others

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
