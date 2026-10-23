# README editor

The editor lets you create a short profile with five optional fixed sections: introduction, technologies, projects, activity and contributions, and contact. You can also add multiple custom sections containing text, lists, links, subheadings, dividers, quotes, public images, explicit HTML and literal code. The manual flow works without an account or a connection to GitHub. Activity offers ten card types with public data and validated appearance; GitHub queries require server configuration. Metrics do not have a separate section. The editor includes local README import with review and backup before replacement, as well as JSON project files for saving the complete profile and continuing later in another session or browser. There is no AI assistance.

## Save and open projects

**Export project (.json)** and **Import project (.json)** are visible in the editor header. On mobile they appear as **Export JSON** and **Import JSON** to leave room for the form. Export downloads the current profile as `github-profile.project.json` so you can continue editing it in another browser. The file preserves modules, order, IDs, categories, formatting, HTML/code source and hidden content, even if the README still needs corrections. JSON is a copy for continued editing; the file intended for GitHub is still `README.md`.

Import accepts only JSON files with this generator's project structure (v1 or v2). It does not import arbitrary JSON or exports from a GitHub profile or API. **Import project (.json)** opens a local dialog for selecting a file and reviewing its contents before replacing the profile.

1. Choose **Export project (.json)** to save the current state directly.
2. Choose **Import project (.json)** and select a local UTF-8 `.json` file, up to 4 MiB, with the compatible structure.
3. Review the README language and included/hidden sections. The summary keeps external content from the file inactive.
4. Continue to confirmation, check the box and confirm the full replacement. The editor first tries to save a backup of the active profile.
5. To undo the change, open **Import project (.json)** and use the previous-profile details to restore it after confirmation or download that copy.

Selecting a file, analyzing it or canceling does not replace the draft. Closing the dialog or changing the interface language discards the pending proposal; the profile keeps its content language and the interface keeps its current language. Opening supports v2 and strict v1 migrated in memory, without modifying the original file or writing the v1 key.

The project backup is separate from the previous profile and original Markdown saved by the README importer. It keeps one previous profile, not a history. If the browser cannot save or encounters protected data, it keeps the active profile and asks you to explicitly choose whether to continue in memory only. Autosave remains paused; download the project before closing or reloading. A backup may have been saved even if writing the new draft failed.

The format also limits depth to 32 and JSON values to 50,000. Downloads prefer a readable representation and use compact JSON near the size limit so the file can be reopened without truncating data. Future, corrupt or incompatible files are rejected without silently dropping properties. See [ADR 0021](decisions/0021-project-files-and-recovery.md).

The current profile must also fit the format so it can be backed up before opening another one. If it exceeds the limits, it is preserved and the editor explains that it must be reduced before replacement. During review, the section row stays in its normal position so it does not cover content while scrolling. Local drafts do not synchronize edits across tabs.

## Use the editor

1. Open the editor in [English](http://127.0.0.1:3000/en/editor) or [Spanish](http://127.0.0.1:3000/es/editor).
2. Choose what to share from the always-available section row at the top. Scroll it left or right when all sections do not fit. No fixed section is preselected or required. Choosing a section without including it adds it and opens its settings; focus stays on its button. For a space of your own, use **Add custom section** (the `+` button on mobile): it is included and its optional title receives focus.
3. Use each section's checkbox to include or hide it. The checkbox preserves focus and content; by itself, it does not change the form you are editing. The active section is marked. Available sections follow at the end of the row with a distinct state.
4. Reorder included sections from their handle in the same row, using a pointer, touch or keyboard. Space or Enter picks up and drops; the left/right arrows move, and Escape cancels without saving the provisional order. You can also select a section and use the bar's two ordering arrows. You can add and remove entries; adding focuses the new entry, and removing one focuses a neighbor or a stable action. Removing an entry deletes its data from the draft.
5. Choose the README language in the settings header, above the title and form. This changes generated labels such as “Contact” or “Projects”; it does not translate your text. The interface language selector is independent.
6. Review the preview and notices. On wide screens it is to the right of settings. If there is enough height, each column scrolls independently using the wheel, keyboard or its scrollbar; focusing a field brings it into view. Scrollbars use the editor's style and respect forced colors. On narrow or short screens, or with enlarged text, natural page scrolling is preserved; switch between Edit and Preview from the top bar. When there is valid visible content, copy the Markdown or download `README.md`. Both actions use the same content as the preview. See [ADR 0028](decisions/0028-independent-editor-scroll.md).
7. To publish it, follow the profile-repository instructions next to the export controls. The app does not publish to or modify GitHub for you.

A short profile can be ready with a single section. You do not need a name, job, project, repository or public activity to say something about yourself. The introduction can mention interests, learning and current activity without repeating them in different forms. Copy and download stay disabled when there is no exportable content.

The section row does not wrap as you add sections, and its controls have hit areas at least 44 px wide. Long titles are visually shortened; their accessible names remain complete. Local horizontal scrolling keeps focus and the active section in view. The top bar stays available while scrolling when there is enough room to edit; with very large text or little usable height it stops being fixed. The editor adapts its columns to the available space and text size. A custom section has a short heading; its full title remains in its field and the README, as well as in its accessible name and the help text for its row button.

**Add block** expands the ten options with previews. It starts open in an empty section and closed when reopening existing content; choosing an option closes it and focuses the new field. This lets you edit what you have already written without moving through every preview. Removing the last block opens the options and returns focus to the stable button.

## Insert emoji

On desktop, the visible **Insert emoji** button stays in the settings column and remains handy while scrolling. Its help explains that you must first focus a profile text field. Open the picker to search by name or choose a category. Selecting an emoji inserts it at the cursor or replaces selected text; this works in the introduction, technologies, projects, contributions, contact and custom-section text. It does not modify URLs, HTML or code blocks. If no text field is focused, the emoji is copied to the clipboard.

On touch devices, the button is hidden to keep the keyboard's picker accessible.

## Import an existing README

1. Select **Import README** in the editor bar; on mobile, use the file icon. Paste Markdown or open a UTF-8 `.md` file. Reading and analysis happen locally, without an account or sending the document to a server.
2. Analyze and review the detected sections. Each one shows how it will be represented, along with notices and issues. You can inspect the original and resulting Markdown as code; images, HTML and cards are not rendered during this review.
3. Keep the sections you want. If a section has a problem, correct its source and analyze it again, or explicitly exclude it. Confirmation reports exclusions; invalid content is never silently applied.
4. Review the confirmation and check that you understand the profile replacement. The complete previous profile and original Markdown are saved before applying it. Closing, going back, analyzing or changing a checkbox does not replace the draft.
5. The imported profile opens in the editor. Return to **Import README** and expand the backup to download `previous-profile.json` or `imported-original.md`, or restore the previous profile with a new confirmation. The backup remains available after restoration.

This version creates **custom sections** in their reading order. It does not automatically assign content to the introduction, technologies, projects or contact. The published README does not contain identities, hidden sections or all editor settings; importing it cannot reconstruct that information. Recover the previous configuration from the backup, not from the Markdown.

Paragraphs, lists and other simple content are converted to visual blocks when their content can be preserved. Fenced or indented code blocks are imported as literal code with their language when representable. Rich formatting, tables or nested lists may be converted to allowed HTML, with a notice. Global references are resolved before sections are split; an HTML container that crosses boundaries may keep the document grouped to preserve its context. Visual parity with GitHub is not guaranteed. Extra code metadata is omitted with a notice; task lists and other incompatible formats need correction or exclusion. Relative paths and anchors must be changed to accepted URLs; the source repository is not guessed.

For HTML-based READMEs, complete root-level headings are detected and used to name the review sections. A name followed by an opening phrase stays together even if they use different heading levels. H2 dividers define the hierarchy; when there are none, H3 headings may be used to split sections. Headings inside a table, disclosure or container remain within that content. If a split cannot be determined with confidence, the content is kept as one custom HTML section. External statistics images remain images where the author placed them; they do not activate cards or trigger queries. Unsupported attributes still produce notices.

The input limit is 100,000 UTF-16 code units and the file cannot exceed 400,000 bytes. There are also node and depth limits, in addition to the HTML limits. The file must be UTF-8; BOM and CRLF line endings are preserved in the original. Images and links follow the editor's policies: an invalid URL or missing alternative description must be reviewed before applying.

There is **one latest README-import backup** for this browser and origin. If storage fails or contains a protected value, the import is not applied automatically; an additional action lets you continue in memory only. This choice preserves stored data and disables autosaving the imported profile; download the backups and project before reloading or closing. There is no remote history. This importer processes Markdown; to open a JSON profile, use [Save and open projects](#save-and-open-projects). See the [import decision](decisions/0018-readme-import-with-backup.md).

## Content and composition

- **Introduction:** optional name, headline and free-form text. Share what you do, what interests you or what you are learning; each field includes writing ideas. Location stays visible next to your name and can appear on its own line or beside your name or headline.

- **Technologies:** search by name or alias across 358 tools, including frameworks, ORMs, databases, messaging, infrastructure and AI. Choose suggested categories or an existing destination; new selections appear as chips with an icon and name. You can also add custom text without an icon. Use arrow keys, Enter and Escape to navigate suggestions; already selected tools cannot be added again. Secondary details let you create, rename and reorder categories, move and reorder tools, and edit optional notes. Removing a category deletes its title but keeps the tools. Restoring a draft or changing the interface language does not reorganize data; **Organize by category** is an explicit action that confirms before replacing existing titles.
  **README layout** offers compact labels with an inline category or headings by category. New profiles use compact mode; older drafts keep their existing output until you choose another layout. Tools, notes and order are preserved. Icons add color, while the label background depends on the GitHub theme. See the [compact technologies decision](decisions/0035-compact-technologies.md).
- **Projects:** name, description, optional title URL and a preview image. Clicking the title opens the app or repository; social networks belong in Contact. In the description, explain what the project does, your contribution or role, and the technologies you used. The image appears below that description. Use a direct public HTTPS URL; a horizontal 16:9 image around 960 × 540 px is recommended for display up to 480 px wide, and under 1 MB for a static image. Short, subtle GIFs are supported; under 2–3 MB is a useful guideline. These are recommendations, not limits enforced by the editor. Files are not uploaded or resized. See the [projects decision](decisions/0037-project-description-and-links.md).
- **Activity and contributions:** manually describe contributions, reviews, documentation or community work, with optional title and link. The collapsible group lets you query a public user, choose from ten locally rendered card types, configure appearance and Extended options, and select contribution suggestions. No card is enabled initially, and a username is not required to describe a manual contribution.
- **Contact:** select **Add social network** to create an entry, then choose a service, portfolio/personal website or email and enter its URL. The selector receives focus after adding, and Tab advances to the URL. You can repeat services and personal websites, each with its own URL and name. The custom label remains in optional details. The catalog includes LinkedIn, LeetCode, HackerRank, YouTube, Facebook, Instagram, GitHub, X, Bluesky, DEV Community, Medium, Twitch and Stack Overflow. Changing the suggested service does not replace the URL or name. The icon follows the validated URL domain; personal websites and email keep a generic icon in the form and text links in the README.

After About you, Location lets you search for a country by its English or Spanish name or two-letter code. Choosing a suggestion fills in its name and adds its flag. The catalog includes 249 countries and territories with local images, avoiding reliance on the system's emoji support. Use the arrow keys and Enter, close with Escape, or enter a city or time zone as free-form text without choosing a country. Your location is not detected, and previously saved text is not changed. Changing the interface language preserves the selected name.

An empty visible section does not add a heading without content. A technology group with no exportable entries is omitted, even if it has a title. Useful partial content is shown without inventing missing data.

### Custom sections

You can add multiple custom sections and order them among the fixed sections. Each accepts an optional title and ten content types: text, bulleted list, numbered list (1., 2., 3.), web link, subheading, divider, quote, image/banner, HTML and code. The selector shows small decorative local previews of each layout, with accessible names and descriptions in both languages. Blocks are added without example text or images. List bullets and numbers are added automatically: each field contains only the text of one item. Repeated titles are valid; navigation identifies each instance without changing the text shown in the README. Without a title, only the body is exported; a title with no useful content does not create an empty heading.

Content buttons work with the keyboard and focus the new entry; the divider has no fields, so its heading receives focus. Arrow keys reorder blocks, and their remove actions delete only that content while preserving a focus target for the next action. Add, remove and move actions are announced in English and Spanish. Links accept `http://` and `https://` with an optional label; `mailto:` remains available only in Contact.

A subheading creates a lower-level heading within a titled section (`###`); if the section has no title, it uses `##` to avoid skipping that hierarchy. A divider generates a horizontal rule (`---`). A quote uses a Markdown block quote (`>`) and preserves the lines and paragraphs written inside it. HTML or Markdown typed in these fields is still escaped as text.

In a custom text block, starting the first line with `- ` turns it into a bulleted list. Enter adds an item; at the last empty item it ends the list and lets you continue with text. Pasting multiple lines creates multiple items. **Convert to text** preserves their content and markers. This assistance applies only to custom sections: the introduction, notes and fixed fields do not interpret lists or free-form Markdown.

**Duplicate section** creates an independent copy of its title, blocks, items, order and inclusion state, with new identities. Editing or deleting that copy does not change the original. Hiding a section preserves all its data and position; **Delete section** removes only that instance and its reference. If it contains a title or content, confirmation is required; an empty section can be removed directly. Focus then moves to a neighboring section or the panel so you can continue.

### Custom images and banners

Choose **Add image/banner** and fill in:

- **Public image URL:** a direct HTTPS address for an already hosted resource that is visible without signing in. Query strings and URLs without a file extension are accepted; the resource's actual format is not verified.
- **Image description:** alternative text describing what the image shows. It is required to export an image with a URL and is not interpreted as HTML or Markdown.

The policy accepts domains with public syntax and rejects IP addresses, known local or private hosts, credentials, fragments and nonstandard ports. Validation is syntactic: it does not query DNS, request the image to verify it or guarantee availability. An invalid URL or a description without a URL points to the URL field; a URL without a description points to the alternative-text field. A completely empty image is omitted. Errors in a hidden section do not block the README.

The app does not upload files or host custom images. A local path, `blob:`, `data:`, `assets/banner.png` or selecting a local file does not create an exportable address. To use an image from your repository, publish it first and get a direct HTTPS URL that meets the policy. The file must remain available for GitHub to display it; copying or downloading the README does not copy the resource.

The preview loads the image directly from its host in the browser, with lazy loading, asynchronous decoding and no referrer. It does not use a server proxy or optimizer. If loading fails, it shows the description and a link to open the address. This temporary state does not change the draft, Markdown or ability to export an accepted URL. It does not verify that the image is available to other people. See [ADR 0014](decisions/0014-custom-visual-blocks.md).

### Explicit HTML

Add an HTML block to a custom section to write or paste a profile fragment. For example, you can center an introduction, place linked images in a row, create a short table or add expandable details. The field preserves the original code exactly; the draft is not replaced with the filtered result.

The expandable guide explains the supported format and offers three examples: a centered heading, a table and expandable details. They are inserted only when selected; if the field already contains code, replacement is confirmed. Selector previews are local and decorative. No example is added when you create the block.

Analysis shows notices when it removes tags, attributes or comments, or repairs malformed HTML. Expand the exported HTML to inspect what will be copied or downloaded. It may represent line breaks with HTML entities to preserve them without activating Markdown; your original code keeps its line breaks. A filtering notice is not an error. An unsupported URL, image without an `alt` attribute, invalid structure or content over the limits points to the code field and prevents export of a visible section. Empty source is omitted; non-empty source that produces no useful content needs correction. Hiding a section preserves the code and excludes its errors from the README.

| Content                    | Supported format                                                                                                            |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Headings and simple layout | `h1`–`h6`, `p`, `div`, `span`, `br`, `hr`; `align="left"`, `"center"` or `"right"` on supported elements.                   |
| Text                       | Bold, emphasis, strikethrough, subscript, superscript, `kbd`, quotes and `pre`/`code`.                                      |
| Lists and tables           | `ul`/`ol`/`li` and tables with rows, cells, headers and captions; bounded cell spans.                                       |
| Expandable details         | `details` with a single `summary` at the start and text that identifies it; `open` can make it expanded initially.          |
| Links                      | `a` with an absolute HTTP/HTTPS destination and accessible name; `aria-label` can identify a link when its contents do not. |
| Images                     | `img` with a public HTTPS URL and an `alt` attribute. `alt=""` explicitly marks decorative images.                          |

Image dimensions range from 1 to 2,000 pixels; `width` also accepts percentages from 1 to 100%. There is no custom CSS, JavaScript, events, forms, iframes, classes or IDs; `srcset`, `picture` and inline SVG are also unsupported. Unsupported attributes are filtered. An SVG URL used through `img` remains an external image subject to the HTTPS policy; inline SVG is still not allowed.

Relative paths, local addresses and `#anchors` need explicit adaptation; they are never resolved against the editor's domain. `mailto:` remains reserved for Contact. Images are not uploaded or checked by the server: they use the same public-domain syntax policy and direct browser loading as the image block. For HTML, a missing `alt` is an error; explicitly leaving it empty has a different, decorative meaning.

Each block is limited to 30,000 UTF-16 code units of source, 1,500 nodes and depth 32. Visible sections together may contain up to 150,000 source code units of HTML. The counter uses JavaScript string length; some emojis take two code units. Limits apply to export analysis and do not truncate saved code.

The HTML block does not interpret Markdown: write `<strong>text</strong>` for bold, not `**text**`. It is not a complete HTML page, React or MDX, or a README importer. h1–h6 levels are preserved on export; the preview adapts their semantic level to the section heading so they fit the editor page. GitHub applies its own sanitization and styles, so the preview is approximate. See [ADR 0015](decisions/0015-explicit-profile-html.md).

### Understanding technology categories

**Organize new tools** lets you choose automatic categories, an existing category or none. In automatic mode, each tool gets a suggestion based on its role: React goes to Frontend and Docker to Cloud and DevOps; unrecognized custom names stay uncategorized. If you choose a custom category, all new tools go there. Help changes with your choice, and each search result shows its destination before you add it. The added-item announcement confirms that destination.

**View the 9 suggested categories** opens a guide with the catalog's names and examples: languages; frontend; backend; mobile and desktop; data and messaging; cloud and DevOps; testing and quality; AI and automation; tools and design. Opening it does not create groups or change the profile. These options apply only to new tools; saved tools keep their place. To reorganize existing tools, use the explicit **Organize by category** action in category details.

Navigation shows included sections first, in README order, followed by hidden sections. The form and language selector stay in the same panel when switching sections. Only the active form is mounted; there is no list of expanded forms. Navigation, the form heading and the preview indicator identify the section being edited. That indicator does not change or highlight a fragment of the exported Markdown.

**Configure** selects the form; **hide** excludes a section from the README and preserves its data; **remove an entry** deletes that entry. Checkboxes do not change the active form: if you hide the section you are editing, its data remains editable and the interface indicates that it is hidden. Adding or editing a hidden section explicitly changes its inclusion. Active selection, mobile-navigation expansion and the Edit/Preview view are interface state, outside the saved document.

Only included sections have a handle. Dragging lets you move a fixed or custom section above or below others; Move up/Move down changes its visible position. `sectionOrder` preserves the nine fixed references and one for each custom instance. When reordering included sections, hidden, retired and metrics references keep their slots. Hiding and showing a section again does not reset its position. The new order is saved when a valid move ends; canceling a drag preserves the previous order and does not write another document.

The handle is the only place that starts a drag. Section names, checkboxes and fields keep their own interactions. Touch gestures outside the handle continue to scroll the page. Instructions and position announcements are available in English and Spanish; Move up/Move down buttons offer an alternative to dragging and distinguish their limits.

Sections with invalid links, image URLs, alternative descriptions or HTML show a text notice. The review action selects the form, switches back to editing when needed and moves to the invalid field; the error does not rely on color alone. Edit/Preview buttons indicate which is active with `aria-pressed`.

## Activity and contributions

You can complete a manual contribution on its own. To add GitHub information, open the optional group, enter a username and request public activity. Typing a username, opening the group or restoring a draft does not trigger the form's query. Previously selected cards do reload their image when shown, just as they will on GitHub.

Each manual contribution has a title, description, and up to five links. You can add up to three public HTTPS images, each with alternative text, and an optional repository preview using a GitHub owner/repository URL and a description you write. The repository preview does not query GitHub. Use **Move up** and **Move down** to choose the order contributions appear in the README; adding links, images or a repository does not change that order. Older drafts keep their single URL unless you edit the links.

You can independently choose profile cards and query their public data:

- **Calendar:** daily contributions for the indicated period, up to 365 days, without streaks or a score.
- **Summary:** commits, pull requests, issues and reviews over the same period. Their total does not have to match the calendar, which can include other types.
- **Languages:** byte proportions in analyzed public repositories owned by the user, excluding forks. These reflect current code, are not limited to the calendar period and do not represent knowledge. Query scope and partial samples are explained when limits apply.
- **Activity overview:** combines calendar, summary and languages, with notes distinguishing the contribution period from the current-code sample.
- **Monthly activity:** sums daily contributions by UTC month; months that are incomplete for the period are marked as partial.
- **Extended activity summary:** choose and order from 18 public counters for activity, stars, followers, PRs, issues, discussions and contributed repositories. Values state their time scope and whether they are partial. Filter by repository, owner, role and exclusions; choose period/year/all-time commits; and include owned repositories in applicable counters.
- **Extended repository languages:** five layouts, 1 to 20 languages, hidden languages, bars or values, bytes or percentages, and weighting by bytes or repository count. A weighted percentage describes the selected formula; it is not a measure of knowledge.
- **Extended repository:** add up to twelve public `owner/name` destinations. Show the owner, limit description lines and query five public PR/issue counters for an explicitly selected user in that repository.
- **Extended Gist:** add up to twelve public Gist IDs. It shows metadata, stars, forks and available language. Any file contents included in the REST response are discarded; `raw_url` is not queried and that source is neither shown nor saved. Secret Gists are excluded even if you know their IDs.
- **Extended WakaTime:** enter a WakaTime username separate from GitHub, with publicly available activity and languages. It shows the last seven days, time or percentage, 1 to 20 languages, an optional bar and normal/compact layouts. It does not ask for WakaTime keys or send the GitHub token to that provider.

Appearance lets you choose a light/dark theme, three palettes, three custom layouts and compact/wide width, as well as 79 named Extended themes. Validated hex colors and gradients, title, border, icons, bold text and number formats let you customize cards without free-form CSS. Explicit width ranges from 700 to 1200, radius from 0 to 30, and line spacing from 22 to 50. Layout previews are local and decorative: they do not query GitHub or add data to the profile. Resetting removes only appearance settings and preserves usernames, destinations, cards, data options and contributions. Restoring a draft does not add default values. The card theme is independent of the editor and applies to every selected card.

Choose **One per row** or **Two per row** for README activity cards. Two-column rows keep the selected card order; an odd last card occupies its own row. New profiles start with two columns. Drafts that lack the setting retain the previous one-card-per-row output until you choose a layout. GitHub controls final table styling and may wrap rows on narrow screens. See [ADR 0040](decisions/0040-activity-card-columns.md).

Extended ranking starts disabled. When enabled, you can show a letter grade, the formula's percentage index or an icon; it uses commits, PRs, issues, reviews, stars and followers. It does not measure skill or an observed population percentile, and it is hidden if any input is missing or partial. Cards retain the MIT license and notices for adapted code and are generated on this server without calling Extended's hosted service. The [compatibility matrix](github-stats-extended.md) explains coverage, limits and differences from the source; see [ADR 0024](decisions/0024-extended-public-suite-and-mit.md) for the decision.

Enter a username and press **Search data**, just below the field, before choosing cards. This action is available even when no cards are selected. Choice thumbnails are decorative local outlines with no account data or queries. You can also select cards before searching. The optional search for contributions to highlight has a separate button and is not required to load cards.

The first search loads the basic snapshot, all 18 Extended counters and languages for the current period and filters, using two JSON requests, plus any missing resources for cards already selected. The five built-in cards share the basic source. These settings apply even when no cards are selected. Historical counters are included with their year and pagination limits; not every year/filter combination or unknown destination is preloaded. Progress and errors are shown even without cards; independent results appear without waiting for others, and errors are not converted to zeros. See [ADR 0030](decisions/0030-all-profile-counters-prefetch.md).

Data is kept temporarily in this browser's IndexedDB, fresh for up to 30 minutes from its original query. After searching, selecting cards or customizing covered options displays them without new SVG or JSON requests. Reload restores available data without querying; it does not reactivate network permission. If data is missing or expired, search again in the restored session. After an explicit search, new scopes can query missing data by batching changes for 300 ms. Valid applied and selected resources can also load after searching. Switching forms or unmounting preserves the cache; replacing, importing or restoring the profile, or clearing the README purges it and cancels earlier responses. Markdown keeps its public URLs and never stores snapshots. See [ADR 0029](decisions/0029-account-first-activity-search.md), [ADR 0030](decisions/0030-all-profile-counters-prefetch.md) and [ADR 0031](decisions/0031-browser-persistent-activity-cache.md).

Suggestions list public PRs and issues from the period. Choosing one adds an editable contribution with a title, link and space for a personal note. Suggestions are not added automatically, and a URL already selected is not duplicated. You can keep, edit or remove these contributions even if you later change the queried username.

An invalid user, missing profile, unconfigured server, exhausted quota and service outage each have distinct messages. Zero activity is a valid result, not an error. If an update for the same user fails, the last valid result may remain visible with its date and a notice; no zeros or examples are invented. Changing the user discards the previous result, and late responses cannot replace it.

The card cache uses a versioned format separate from the localStorage draft and profile document. On restore it validates public data, identity, filters, periods and dates; it does not save errors, permissions, credentials, SVGs or Blob URLs. Older data can be shown for up to 24 hours with a notice, without changing its timestamp. Cleanup happens when reading or saving. Status indicates reviewing, saving, saved or RAM-only use if IndexedDB is unavailable. The profile is not saved in that database and is not synchronized across browsers or devices. The optional suggestion search has its own form state. The profile saves public usernames and destinations, cards, appearance, Extended options, and selected or manually written contributions. Contributions preserve their manual order and can have multiple links, images, and an entered repository preview; descriptions are not published in a dynamic card or in URLs. You can uncheck cards from an older draft even if the server cannot query them. GitHub samples and history have stated limits; WakaTime shows the last seven days without inventing dates if the provider does not supply them.

The application hosts cards as its own passive SVGs. Exporting them requires a public HTTPS origin configured by the server operator; GitHub cannot reach a local server. Without that origin, search and preview work locally. A notice appears beside copy and download, which remain disabled while cards are selected. Excluding cards preserves their configuration and lets you export manual contributions. People creating a profile are not asked to enter tokens or configure services.

A card rendered in the editor does not prove that GitHub can load it: the preview uses temporary browser data. In Vercel Production, the server can resolve the project's stable domain when `APP_URL` is empty; local and Preview environments continue to require an explicit origin. The notice explains this difference and reminds you that the JSON project remains available to preserve everything. Manual contributions without cards do not require an origin or GitHub username. See [hosting configuration](vercel-deployment.md#3-environment-variables).

README images are updated according to the service cache; they are not snapshots stored in the document. The update date and period belong to the queried data; a failure does not turn an older graph into new activity. Public queries must be enabled by the deployment operator, as described in [ADR 0010](decisions/0010-github-activity.md).

The button limits queries while editing. Published cards keep dynamic public URLs and may use quota when refreshed. The [API, credentials and hosting guide](github-api-and-hosting.md) explains the shared PAT, caches and Vercel Hobby limits for server operators.

## Supported text and links

Ordinary fields are treated as **plain text**: typing Markdown or HTML does not enable free-form formatting. The generator escapes those characters. The exception is the explicit HTML block, which analyzes and filters its source before generating output. The preview renders the same Markdown with ReactMarkdown 10.1 and `remark-gfm` for tables, without global HTML parsing and with an explicit allowlist of elements. The editor's fonts, colors and layout are not embedded in the README; its final appearance depends on GitHub.

Recognized technologies are exported with a decorative 20 × 20 icon and escaped display name. The generator builds `img` tags exclusively from the curated catalog, using URLs pinned for Devicon, Simple Icons and Lobe Icons. Custom names remain text; notes are kept as escaped text. Category titles are exported when they contain entries. The preview respects order and permits line breaks; it continues to accept the earlier 32 × 32 tokens. No CSS is added to the README.

Recognized contacts include a 20 × 20 icon inside the link, built from the Simple Icons catalog. The icon has `alt=""` because the visible text already names the link; it does not duplicate its accessible name. The validated URL determines the service by explicit domains: a “LinkedIn” label on a custom website does not assign its brand. Custom icon URLs are not accepted.

Selecting a country adds a decorative 20 × 15 flag from the flag-icons catalog beside the readable country name. Only the exact generated markup and pinned URL are accepted; the preview resolves the equivalent local SVG. Free-form locations, including custom text with a flag emoji, remain text and are not turned into images.

The preview converts exact icon tokens into image nodes and verifies the allowed URL and empty alternative text for technology/contact tokens; earlier technology tokens also require the correct alternative name. It resolves only the equivalent local SVGs. It also accepts exact paths for app-generated activity cards when the origin is configured and the parameters are allowed; these resolve against the local server to preview the same Markdown. For image blocks, the URL and alternative text must exactly match `customImages` metadata from the same generator result, and the HTTPS policy is checked again. HTML units are recognized only through exact ranges and content in `customHtml` and rendered with allowed React elements. This metadata is not persisted, and images typed in other fields are not interpreted. `skipHtml` remains enabled for all other HTML; neither `rehypeRaw` nor `dangerouslySetInnerHTML` is used. Assets, MIT/CC0 licenses and attribution are included in [third-party notices](../THIRD_PARTY_NOTICES.md), with their sources pinned. Some tools use a documented family mark. Third-party icons depend on their original GitHub URLs; cards depend on this app's deployment; custom images depend on the chosen host.

Web links in projects, contributions, contact and custom sections accept absolute `http://` or `https://` URLs, without credentials, spaces, control characters or backslashes. Example: `https://example.com/portfolio`.

Only Contact additionally accepts `mailto:` with one ASCII mailbox and a domain with at least two parts; lists, parameters, fragments and encoded content are not allowed. Example: `mailto:alex@example.com`.

Relative paths, URLs beginning with `//`, `javascript:`, `data:`, links with usernames/passwords, and `mailto:` links with a subject or body are not accepted. An invalid link in any active, visible section, including custom sections, blocks export and shows the error next to its field. Data in hidden or retired sections is not exported and does not block output.

An empty optional link does not need to be completed. Completely empty contact rows or project links are omitted. If they have a label but no accepted URL, they need correction. A valid URL without a label uses the recognized contact service name, or the address in other cases. An invalid link blocks all output instead of silently producing a partial README.

## Saving and recovery

The draft is saved in this browser under the same origin, without sending the complete document to a server. Activity queries send the username and selected public options; card URLs include the type, public identifier, language and validated appearance/data options. They contain no tokens or manual contributions. Custom images are requested from their specified host by the browser when displayed; they are not uploaded or copied when saving the draft. Draft data is validated before autosave is enabled. After editing, saving waits 500 ms; it also attempts to save when the page is hidden or left. The visible status distinguishes a successful save from a saving problem.

If the draft is damaged, incompatible or unreadable, it is not automatically replaced. You can work in memory; starting a new draft requires confirmation to permit replacement. Canceling confirmation preserves the existing value. If a write fails because of quota or browser restrictions, the notice remains: you can continue editing and export a valid README, but the latest changes may be lost when you leave.

Work held in memory is preserved when changing the interface language within the same tab, including the README language and error state. This temporary recovery does not survive a full reload or closing the tab. If saving fails, download the README before reloading or closing.

There is no device synchronization, remote backup or history. The README importer provides one downloadable and restorable local backup. [Project files](#save-and-open-projects) let you download and open the complete JSON profile with a separate backup of its own, to continue editing in another browser or on another device. Changing host, port or protocol uses different storage; see the [operations guide](development.md). An abrupt shutdown may prevent the latest changes from being saved.

## Document compatibility

The current format is `ProfileDocument` v2, stored in `github-profile-generator.profile.v2`. It preserves hidden data, opaque IDs, language, metrics settings and inherited fixed structures. `sectionOrder` mixes fixed and custom references; `customSections` contains their blocks. Visual, HTML and code block types, as well as formatting options, extend v2 without changing keys or adding default properties to earlier blocks. A strict older reader may reject these types and must preserve the incompatible value. Technologies continue to be stored as names and contexts in their existing groups; newly added tools start with an empty context. Custom image URLs and HTML source belong to their blocks; icon URLs, `customImages`, `customHtml` and the analyzed tree are not stored. Original HTML source is preserved when duplicating, hiding, changing language or restoring.

If v2 is missing, the editor looks for `github-profile-generator.profile.v1`, validates it and migrates it in memory. Migration preserves content, flags and order; it does not add custom sections or change the original v1 value. Opening, restoring or changing the language does not save the migration: the first edit writes the v2 key and leaves v1 intact as the local original. This does not provide synchronization or remote backup.

If v2 exists but is invalid or unreadable, v1 is not used to replace it automatically. The problematic value is preserved and the in-memory flow remains available; starting another draft requires the existing confirmation. Canceling preserves both originals. Current writes and a confirmed reset affect v2 without removing the v1 key.

Skills, education and updates are retired. They have no navigation, form or output, even if the draft contains data or visibility settings for those IDs. Their internal structures remain untouched: they are not edited, deleted or merged into the introduction. An invalid link saved there does not prevent export of the five active sections. This internal preservation is not an option for re-enabling retired modules.

Contributions and metrics appear as one included section when either inherited flag is true. Flags are not changed on restore. The global checkbox turns both off when hiding and preserves data; showing the section again enables contributions and enables metrics only if cards are still selected. Manual contributions follow their flag; cards follow the metrics flag. The generator always uses the `contributions` reference, omits the separate `metrics` output and avoids duplicate headings. Reordering preserves the internal metrics reference and other hidden positions.

The contract and API are described in the [profile model](profile-model.md). Custom instances and migration are recorded in [ADR 0013](decisions/0013-custom-sections.md), extended by [ADR 0014](decisions/0014-custom-visual-blocks.md) for visual blocks and images and [ADR 0015](decisions/0015-explicit-profile-html.md) for explicit HTML. Retired modules are documented in [ADR 0008](decisions/0008-focused-profile.md), catalogs in [ADR 0009](decisions/0009-profile-icons.md), and unified activity in [ADR 0010](decisions/0010-github-activity.md). Earlier ADRs retain their historical context.

## Code and formatting in custom sections

**Add code** creates an empty block. Paste your source and choose a suggested language (such as TOML, JSON, JavaScript or Python), enter a custom identifier or leave it empty for plain text. The JSON sample is inserted only when selected; replacing existing code requires confirmation. Source is literal: typing tags, scripts, images or Markdown does not execute them or load their resources.

HTML and code share an editor with colors, line numbers and line wrapping. It loads on demand and offers **Plain text** as an alternative. Tab and Shift+Tab enter and leave the field; indent buttons and Ctrl+] / Ctrl+[ (Cmd on macOS) modify the selection. Examples and mode changes do not automatically format the source. All suggested languages have local highlighting, including C#, Java, PHP and Markdown. An unknown custom identifier remains editable as text and shows specific guidance. GraphQL has lexical highlighting. The editor does not validate program correctness or execute code.

Code allows up to 30,000 UTF-16 code units per block and 150,000 across visible blocks. An invalid language or limit violation shows an error beside the field and blocks copy/download until corrected or its section is hidden. Duplicating preserves source and options with independent identities. Markdown fences are chosen so backticks typed inside cannot close the block. The preview shows the literal source from the same generated Markdown, with optional highlighting and an action to copy only that snippet without controls in the README.

Under **Title format**, choose level 1, 2 or 3 and left, center or right alignment for a custom section title. Paragraphs and subheadings have collapsible formatting controls and can be converted between text and a heading while preserving identity and content. Alignment affects only the selected text; it does not center lists, images or code. The initial settings preserve previous output: no properties are added when restoring older documents.

Heading levels are exported with Markdown. Center and right alignment produce allowed HTML, escaping text and respecting existing HTML limits. HTML typed in a paragraph remains literal text. There is no free-form inline formatting, CSS, fonts or custom colors; final appearance depends on GitHub. The preview adapts heading hierarchy for the editor without changing output. See the [code and formatting decision](decisions/0019-code-and-formatting.md).

## Introduction formatting

Name and headline placeholders show complete writing ideas with emojis, such as “It's great to have you here — I'm Alex Rivera 🌱” and “⌨️ Full-stack developer & Linux enthusiast 🐧”. Help repeats these examples and suggests alternatives. They are writing prompts: an empty field remains empty; a greeting is never added automatically. Location appears after the Headline and About you fields.

**Text style** lets you independently choose GitHub's default style, italic or monospace for the name and headline. GitHub controls the exact font and weight of its headings and strips CSS from READMEs, so this control uses compatible HTML. Options are preserved when reloading or opening a JSON project and removed when resetting formatting.

A custom inline location appears as “📍 Currently based in 🇦🇷 Argentina” or “📍 Actualmente en 🇦🇷 Argentina”, depending on the README language. The flag is decorative and appears only after you choose a country from the catalog. The phrase does not insert breaks between text, flag and country; GitHub may wrap the line based on available width.

The name and headline are centered by default. Open **Visual formatting** below the Introduction fields to change the level or alignment of either one; the About you text and a custom inline location have independent alignment. These options do not require you to fill empty fields or turn your profile into a résumé.

The location field appears after About you. Enter a city or choose a country to save its name and flag. The selector lets you display that location on its own line, beside the name or beside the headline, with “based in” or “desde”; it does not guess or add countries on its own. Field help includes writing ideas but does not insert text. See [ADR 0034](decisions/0034-friendly-presentation.md).

Preview, copy and download use the same output. Selected flags keep their local icons in the preview; labels typed in text remain literal. **Reset introduction formatting** preserves the text. Opening an existing draft keeps its format and does not add default options. See the [Introduction formatting decision](decisions/0020-presentation-formatting.md).

## Clear the current README

**Clear README** is next to the save status; on mobile it uses a trash icon with that accessible name. Confirmation explains that all sections and data in the current profile will be cleared, including hidden sections and selected cards. Canceling preserves content and focus. Confirming starts an empty profile in the same README language and disables export until you add content.

Clearing preserves the original v1 key and the latest import backup. It does not purge storage or the importer's temporary text. Saving a healthy draft is confirmed before success is reported. If the browser fails or the saved value is protected, the profile is cleared only in memory and the editor explains that reloading may restore the previous profile. The action invalidates pending saves so they cannot write the cleared content back.
