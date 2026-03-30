# @blazefw/inspector

BlazeFW DevTools overlay — renders a colour-coded outline on every annotated DOM element showing whether it runs on the **server**, **client**, crosses the **boundary**, is **shared**, or is **mixed**. Shows a floating stats panel with component counts. Zero-dependency, browser-only, development tool.

## Installation

```bash
npm install -D @blazefw/inspector
```

## Quick start

```ts
import { initInspector } from '@blazefw/inspector';

// Enable in development only
if (process.env.NODE_ENV === 'development') {
  initInspector();
}
```

Press `Alt+I` to toggle the overlay on/off at any time.

## How to annotate components

The inspector reads `data-blazefw-kind` attributes set by `@blazefw/web` or the compiler. Add them manually for custom components:

```tsx
// Annotate a React component's root element
function UserCard({ userId }) {
  return (
    <div
      data-blazefw-kind="client"
      data-blazefw-name="UserCard"
    >
      ...
    </div>
  );
}
```

**`data-blazefw-kind` values:**

| Value | Colour | Meaning |
|---|---|---|
| `server` | Blue | Runs only on the server |
| `client` | Green | Runs only in the browser |
| `shared` | Purple | Runs on both |
| `boundary` | Yellow | Crosses server↔client boundary |
| `mixed` | Red | Uses both server + client APIs (error state) |

`@blazefw/web` sets these attributes automatically based on compiler output.

## API

### `initInspector(options?)`

```ts
import { initInspector, type InspectorOptions } from '@blazefw/inspector';

const inspector = initInspector({
  // Start enabled (default: true)
  enabled: true,

  // Keyboard shortcut to toggle (default: 'Alt+I')
  toggleKey: 'Alt+I',

  // Attribute to read for component kind (default: 'data-blazefw-kind')
  dataAttr: 'data-blazefw-kind',
});
```

**Returns:** `InspectorHandle`

```ts
inspector.enable();    // show overlay
inspector.disable();   // hide overlay
inspector.toggle();    // flip enabled state
inspector.refresh();   // re-scan DOM (call after dynamic renders)
inspector.destroy();   // remove all overlay elements and observers
inspector.isEnabled(); // boolean
inspector.getStats();  // InspectorStats — component counts per kind
```

### `scanComponents(root, dataAttr?)`

Scans a DOM subtree and returns all annotated component info. Useful for custom tooling.

```ts
import { scanComponents } from '@blazefw/inspector';

const components = scanComponents(document.body);
// returns: ComponentInfo[]
// [{ kind: 'client', name: 'UserCard', element: HTMLElement }, ...]
```

### `buildStylesheet(dataAttr?)`

Returns the CSS string that drives the outlines. Useful if you want to inject the styles yourself:

```ts
import { buildStylesheet } from '@blazefw/inspector';

const css = buildStylesheet('data-blazefw-kind');
// Inject however you like
document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);
```

### Stats

```ts
import { type InspectorStats } from '@blazefw/inspector';

// InspectorStats shape:
{
  server: number;
  client: number;
  shared: number;
  boundary: number;
  mixed: number;
  total: number;
}
```

## How the overlay works

- Injects a single `<style>` tag with `outline` CSS rules — zero JS per-element, always correctly positioned regardless of scroll or resize
- `::after` pseudo-elements render coloured kind badges in the top-left corner of each annotated element
- `position: relative !important` is added to annotated elements to anchor the badge (acceptable dev-tool tradeoff)
- A `MutationObserver` auto-refreshes the stats panel whenever the DOM changes — no manual refresh needed during development
