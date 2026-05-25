# Voiden Type Generator — Plugin Reference

A Voiden community plugin that generates typed model code from HTTP API responses using [quicktype-core](https://github.com/quicktype/quicktype).

---

## What It Does

- Captures every HTTP response body that passes through the Voiden request pipeline
- Tracks the response **per open void file** — switching files automatically loads that file's last response
- Generates typed models in TypeScript, Dart, Go, Kotlin, Swift, Java, or Zod
- Live re-generation with a 300 ms debounce on any input change
- Persists language/class name/options in `localStorage` across sessions
- Accessible via a **{ }** icon in the top bar (right sidebar tab)

---

## Repository Layout

```
src/
  index.tsx                  # Plugin entry point — wires Voiden SDK hooks
  manifest.json              # Plugin metadata for Voiden
  sdk-extensions.d.ts        # TypeScript augmentation for undocumented ctx APIs

  types/
    pluginTypes.ts           # Shared types: CapturedResponse, GeneratorOptions, SupportedLanguage

  generator/
    languageConfig.ts        # Per-language quicktype renderer config and option mapping
    quicktypeRunner.ts       # Thin async wrapper around quicktype-core

  ui/
    GenerateTab.tsx          # Main sidebar panel React component

dist/                        # Built output (gitignored except manifest)
  main.js
  manifest.json
  voiden-type-generator.zip  # Install this in Voiden

esbuild.config.mjs           # Build config: ESM bundle, polyfillNode, externals
```

---

## Architecture

### Entry Point — `src/index.tsx`

Exports a default factory `(ctx: PluginContext) => { onload, onunload }`.

**State kept in closure (not React state):**

| Variable | Type | Purpose |
|---|---|---|
| `responsesMap` | `Map<string, CapturedResponse>` | Last response per void-file document tab ID |
| `pendingRequest` | `{ url, method, docTabId }` | Snapshot of the in-flight request, including which void file sent it |
| `responseListeners` | `Set<fn>` | Subscribers notified when a new response arrives |

**SDK hooks used:**

| Hook | What we do |
|---|---|
| `ctx.onBuildRequest(handler)` | Capture URL, method, and the active void file's document tab ID (`editor.storage.tabId`) at request time. **Must return the request object** or the pipeline breaks. |
| `ctx.onProcessResponse(handler)` | Store the captured response in `responsesMap` keyed by `docTabId`; notify all listeners. |
| `ctx.registerSidebarTab("right", { id, title, icon, component })` | Register the Types panel in the right sidebar. |
| `ctx.registerStatusBarItem({ ... })` | Register the **{ }** button (opens right panel + activates the tab). |
| `ctx.project.getActiveEditor("voiden")` | Returns the active TipTap editor instance. We read `editor.storage.tabId` to get the document tab ID of the currently focused void file. |

**How per-file tracking works:**

1. `onBuildRequest` fires → we call `ctx.project.getActiveEditor("voiden")` and read `.storage.tabId` to know which void file triggered this request. Saved into `pendingRequest.docTabId`.
2. `onProcessResponse` fires → response stored under `pendingRequest.docTabId`.
3. `GenerateTab` polls `getActiveTabId()` every 400 ms. If the result changes (user switched void files), it looks up the stored response for the new tab and replaces the JSON input automatically.
4. When a new response arrives via `subscribe`, `GenerateTab` immediately updates the JSON input if it belongs to the currently active tab.

**Key gotcha — `request.tabId` ≠ document tab ID:**  
The `tabId` field on the request object is the *response tab* ID (the tab Voiden opens to show response output). The *document tab* ID (which void file the request came from) lives in `editor.storage.tabId`.

---

### `src/types/pluginTypes.ts`

```ts
type SupportedLanguage = "typescript" | "dart" | "go" | "kotlin" | "swift" | "java" | "zod"

type CapturedResponse = {
  body: string      // raw JSON string
  status: number
  url: string
  method: string
  label: string     // __sectionLabel from Voiden (multi-request section name)
}

type GeneratorOptions = {
  language: SupportedLanguage
  className: string
  tsReadonly: boolean
  tsJustTypes: boolean
  dartNullSafety: boolean
  dartCopyWith: boolean
  kotlinSerializable: boolean
  swiftUseStructs: boolean
  javaGetters: boolean
  zodStrict: boolean
}
```

---

### `src/generator/languageConfig.ts`

Maps each `SupportedLanguage` to:
- `rendererName` — the string quicktype-core accepts (e.g. `"typescript"`, `"dart"`)
- `defaultOptions` — which checkboxes are on by default
- `buildRendererOptions(opts)` — translates `GeneratorOptions` flags into the `Record<string, string>` that quicktype's `RendererOptions` expects

Default option highlights:
| Language | Defaults |
|---|---|
| TypeScript | `just-types: true`, `readonly-properties: true` |
| Dart | `null-safety: true`, `copy-with: false` |
| Kotlin | `framework: kotlinx` (adds `@Serializable`) |
| Swift | `struct-or-class: struct`, `coding-keys: true`, `access-level: public` |
| Java | `just-types: false` (generates getters/setters) |

---

### `src/generator/quicktypeRunner.ts`

Thin async wrapper. Accepts `{ json, language, className, rendererOptions }`, feeds it into quicktype-core's `InputData` / `jsonInputForTargetLanguage` pipeline, and returns the generated source as a string.

---

### `src/ui/GenerateTab.tsx`

A React functional component. Props:

```ts
type Props = {
  subscribe: (fn: (r: CapturedResponse, tabId: string) => void) => () => void
  getResponseForTab: (tabId: string) => CapturedResponse | null
  getActiveTabId: () => string
}
```

**Key behaviours:**

| Behaviour | Implementation |
|---|---|
| Auto-fill on new response | `useEffect` subscribes to `subscribe()`; sets `jsonInput` when a response arrives |
| Auto-switch on file change | `setInterval` (400 ms) polls `getActiveTabId()`; on change, loads stored response for the new tab |
| Debounced generation | 300 ms `setTimeout` triggers `runQuicktype` whenever `jsonInput`, `language`, `className`, or `options` change |
| Persist prefs | `useEffect` on `language/className/options` writes to `localStorage` under `voiden:type-generator:prefs` |
| Per-language option panel | `optionDefs` map → collapsible checkbox panel below the top bar |
| Copy button | `navigator.clipboard.writeText(output)` with 1.5 s "Copied!" flash |

---

## Voiden SDK Notes

These APIs are not in the public `@voiden/sdk/ui` type definitions and are declared in `src/sdk-extensions.d.ts`:

| API | Notes |
|---|---|
| `ctx.onBuildRequest(handler)` | Handler receives `(request, editor)`. **Return the request** or the pipeline chain breaks. |
| `ctx.onProcessResponse(handler)` | Response object includes `__sectionLabel`, `__sectionIndex`, `__sectionColorIndex`. `body` may be a pre-parsed object — always coerce with `JSON.stringify` if not already a string. |
| `ctx.registerStatusBarItem(item)` | Undocumented. Adds an icon to the bottom status bar. `position: "right"` works. |
| `ctx.project.getActiveEditor("voiden")` | Returns the TipTap `Editor` instance for the active void file. `editor.storage.tabId` is the document tab ID. The editor object has circular references — never `JSON.stringify` it. |
| `ctx.ui.openRightPanel()` | Makes the right sidebar visible. |
| `ctx.ui.openRightSidebarTab(tabId)` | Switches to a sidebar tab by its registered ID. |

---

## Build

```bash
npm install
node esbuild.config.mjs
# → dist/main.js  +  dist/manifest.json
zip -j dist/voiden-type-generator.zip dist/main.js dist/manifest.json
```

**Bundle strategy:** ESM format, `polyfillNode` for Node built-ins (quicktype-core uses `path`, `crypto`, etc.), externals: `react`, `react-dom`, `react/jsx-runtime`, `@voiden/sdk`, `@voiden/sdk/ui`. Do **not** add `react-dom/client` as an external — Voiden's community plugin sandbox exposes it as `null`.

## Install

In Voiden → Settings → Plugins → Install from zip → select `dist/voiden-type-generator.zip`.

---

## Supported Languages & Options

| Language | Options |
|---|---|
| TypeScript | Readonly fields, Types only (no runtime) |
| Dart | Null safety, copyWith method |
| Go | *(none — always emits JSON tags)* |
| Kotlin | @Serializable (kotlinx) |
| Swift | Structs vs classes |
| Java | Getters / setters |
| Zod | Strict mode |

---

## Known Limitations

- **No response before first request:** The JSON panel is empty until a request is made in the active void file. There is no way to pre-populate from a previous session's response.
- **Zod strict mode:** quicktype-core's Zod renderer has limited option support; the `zodStrict` flag is captured but may not produce output differences in all quicktype versions.
- **Multi-section files:** In multi-request `.void` files, responses are tracked per file (not per section). The last response from any section in that file is shown.
- **react-dom/client unavailable:** Voiden's community plugin sandbox does not expose `createRoot`. The plugin must render as a sidebar tab component (Voiden mounts it), not as a standalone React root.
