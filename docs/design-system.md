# Design System

## Status and purpose

The GitHub Profile Generator UI kit is an internal development tool that defines the generator's reusable tokens and components. The showcase is available at `/en/design-system` and `/es/design-system` only when running `pnpm dev`. In a production build, both routes return 404 and no links to them appear in navigation or on the home page. The showcase includes a directive that keeps it out of search indexes; it has no authentication and a development server must not be hosted as a public service.

It includes local demonstration interactions; it does not create profiles, query GitHub, or publish content. Playwright is used from the repository to review flows, viewport sizes, and automated accessibility checks; it is not part of the product. The kit and its tests remain separate from the experience of people creating a README.

The visual direction aims for a calm, approachable creation tool: light surfaces, charcoal text, a green accent, crisp borders, and an equivalent dark theme. Short profiles receive the same care as profiles with many sections. Public activity is not a measure of skill.

## Foundations and tokens

The source of truth is `src/styles/tokens.css`, imported by `src/app/globals.css`. `:root` contains the light theme and `.dark` the dark theme. `@theme inline` exposes Tailwind utilities, and `@custom-variant dark` connects its variants to the class managed by `next-themes`.

| Token                                         | Purpose                                                           |
| --------------------------------------------- | ----------------------------------------------------------------- |
| `background`                                  | Page background and contextual areas.                             |
| `surface`                                     | Cards and controls.                                               |
| `surface-raised`                              | Secondary surfaces and loading indicators.                        |
| `foreground`                                  | Primary text.                                                     |
| `muted-foreground`                            | Descriptions and context. It does not indicate a disabled option. |
| `border`                                      | Visual separation between surfaces.                               |
| `border-strong`                               | Field and control boundaries that need clear recognition.         |
| `accent`, `accent-hover`, `accent-foreground` | Primary actions and active selections.                            |
| `accent-soft`, `accent-soft-foreground`       | Context and lower-emphasis confirmations.                         |
| `destructive`, `destructive-soft`             | Errors and removal actions.                                       |
| `warning`, `warning-soft`                     | Situations that need review.                                      |
| `ring`                                        | Keyboard focus.                                                   |

Use semantic classes such as `bg-surface`, `text-muted-foreground`, and `border-border`. Avoid literal colors in product components. A token keeps its meaning when the theme changes. The palette aims for WCAG AA; review every new combination of background, transparency, text, and state in its actual context.

Spacing follows a 4 px grid. The most common scale is 4, 8, 12, 16, 20, 24, 32, 48, 64, and 80 px. Internal groups use 8–16 px; blocks, 20–32 px; sections, 64–80 px. Interactive controls have a target area of at least 44 px. The visible checkbox and switch marks are smaller, but their buttons reserve the full target area.

Corner radii are 6 px for tags, 10 px for controls, 16 px for cards, and 24 px for larger compositions. The internal `--ds-radius-*` values are exposed as `rounded-sm`, `rounded-md`, `rounded-lg`, and `rounded-xl`. `shadow-soft` adds minimal separation, and `shadow-panel` is available for panels. Borders and spacing provide the main visual hierarchy.

Geist Sans is used for content and controls; Geist Mono, for numbers and small technical details. The `--font-geist-sans` and `--font-geist-mono` variables are defined through the layout's local fonts. Common sizes are 12 px for context, 14 px for controls and compact body text, 16 px for reading, 20–24 px for section headings, and 36–60 px for display text. Fields use 16 px on small screens to prevent input zoom in some browsers.

Text inherits `overflow-wrap: anywhere` so URLs or unspaced strings can wrap when they do not fit; words remain whole whenever there is room. `Button` is constrained to its container and allows labels to wrap onto multiple lines. Group actions in wrapping rows without shrinking icons or overlapping states. The editor uses container queries in `em` to adapt its columns when text is enlarged as well; content selectors respond to the width of their own panel. Code regions keep their explicit scrolling or line-wrapping behavior.

## Components and contracts

Primitives live in `src/components/ui/`, are exported by name, and combine classes with `cn` from `src/lib/cn.ts`. They do not contain profile rules or hard-coded translations.

| Component                         | API and usage criteria                                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Button`                          | `variant="primary\|secondary\|outline\|ghost\|destructive"`, `size="sm\|default\|lg\|icon"`. CVA types the variants. Defaults to `type="button"`; specify `submit` explicitly.                                           |
| `Badge`                           | `variant="neutral\|accent\|success\|warning\|outline"`. Describes technologies, context, or state; it is not a button.                                                                                                   |
| `Button` / `Badge` with `asChild` | Radix Slot applies the style to a single child element. Link attributes belong on that child. Preserve semantics and a touch target appropriate to the content.                                                          |
| `Input`                           | Native `input` props; text by default. Requires a visible label and can receive `aria-invalid`.                                                                                                                          |
| `Textarea`                        | Native `textarea` props; starts with four rows and can be resized vertically.                                                                                                                                            |
| `Field`                           | Accepts `htmlFor`, `label`, `description?`, `error?`, `required?`, and one control. Automatically connects the id, help text, error, and invalid state through `cloneElement`. Preserves an existing `aria-describedby`. |
| `Label`                           | Native label exported from `field.tsx`. Use `htmlFor` with compound controls.                                                                                                                                            |
| `Card`                            | Visual container with `CardHeader`, `CardTitle`, `CardDescription`, `CardContent`, and `CardFooter`. `CardTitle` renders an `h3`; check heading hierarchy in context when composing.                                     |
| `Checkbox`                        | Radix Checkbox props, including `checked`, `defaultChecked`, `onCheckedChange`, `disabled`, and the `indeterminate` state. Compose the label outside it.                                                                 |
| `Switch`                          | Radix Switch props. Use for a setting that takes effect immediately; place its label and description outside it.                                                                                                         |
| `Separator`                       | `orientation="horizontal\|vertical"`; decorative by default. `decorative={false}` exposes separator semantics.                                                                                                           |
| `Skeleton`                        | Decorative placeholder with `aria-hidden`. Its container must describe the actual loading state when one exists. The showcase identifies it as a static demonstration.                                                   |

Example of an associated field:

```tsx
<Field
  htmlFor="display-name"
  label={t("displayName")}
  description={t("displayNameHelp")}
  error={validationError}
  required
>
  <Input value={name} onChange={(event) => setName(event.target.value)} />
</Field>
```

`Field` marks required fields with a decorative asterisk and the native `required` attribute; the page must explain the asterisk in translated text. An error combines a description and an icon. For dynamic errors, the flow must decide when to announce changes and where to move focus, without announcing messages before a person can act.

Disabled buttons keep a visible reason nearby and connected through `aria-describedby`. `asChild` does not automatically disable a link: use a native button for an unavailable action. Icon-only buttons need `aria-label`. Icons that accompany text are decorative.

## Composition, states, and languages

The showcase includes actions with local responses, fields with help and an intentional error, tags, cards, Radix controls, and a profile composition. Checkboxes show or hide technologies and activity; a switch changes spacing. Activity data is identified as illustrative. Hiding all optional blocks still leaves a complete presentation.

The supported states are idle, hover, visible focus, selected, error, and disabled. Errors and selections are expressed through text, semantics, or markers in addition to color. No block requires a minimum number of projects or contributions. Control and anchor focus stays visible, and effects respect `prefers-reduced-motion`.

Text belongs in `src/messages/en/design-system.json` and `src/messages/es/design-system.json`, in the `DesignSystem` namespace. The page resolves messages on the server. Only this route passes that namespace to a `NextIntlClientProvider` for the demonstrations. The shared header retains the navigation and controls provider from the layout. Internal links use `Link` from `src/i18n/navigation`.

Static page content remains in Server Components. Interactive examples and Radix controls form client boundaries. Local icons and fonts are used; the showcase does not download screenshots or full visual libraries. Add animations, loading states, or abstractions only when they solve a concrete product need.

## Recommended review

Playwright is already installed as a repository tool. `pnpm test:e2e:ui` opens its test UI to inspect flows, results, and traces outside product navigation. The terminal mode remains available through `pnpm test:e2e`. For a standalone component workshop, [Storybook](https://storybook.js.org/docs) can develop states in isolation; it is not installed in this release.

Review both routes and themes, full keyboard navigation, visible focus, 200% zoom, 320 px width, long labels, and the reduced-motion preference. Verify field associations, change announcements, disabled states, and the difference between a checkbox and a switch. Confirm that the options change only the demonstration composition and that changing language preserves the route. Automated accessibility tests complement manual review; they do not certify full accessibility.

Integrated verification should include linting, types, formatting, compilation, and navigation. This document describes contracts and review criteria; it does not claim test results.

## Directional references

Official references reviewed on October 19, 2026. They are starting points for our own decisions; product assets and compositions are not copied.

- [Linear](https://linear.app/): editorial reference for a calm hierarchy and a work-tool presentation.
- [Vercel Geist](https://vercel.com/geist/introduction): visual-system reference for developer tools.
- [Radix Primitives accessibility](https://www.radix-ui.com/primitives/docs/overview/accessibility): behavior, semantics, and accessibility responsibilities of the primitives.

See also [architecture](architecture.md) and the [initial decision](decisions/0001-architecture.md).

## Source editing

`CodeEditor` is a reusable client boundary for HTML and literal code. Its shell provides plain text while CodeMirror 6 and the required language grammars load. Modes, indentation, and line wrapping have EN/ES labels; the field retains its label, help, and error. Tab can leave the editor. Source is not formatted when recovered or highlighted. The `--syntax-keyword`, `--syntax-string`, `--syntax-number`, `--syntax-comment`, and `--syntax-variable` tones are defined in both themes and shared with the preview. Color is decorative: content remains readable without syntax highlighting.

Height and overflow belong to the editor or code block and must not widen the page. Controls wrap onto multiple rows when space is limited and retain the kit's touch target. The code block in the preview is focusable so its content can be scrolled with a keyboard. Do not mistake this internal editing tool for an IDE or code execution.
