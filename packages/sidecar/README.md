# @blazefw/sidecar

BlazeFW sidecar worker — offloads third-party scripts (analytics, tag managers, ad pixels) to a Web Worker so they run off the main thread. Intercepts DOM access via an async proxy, giving scripts access to `window` and `document` without blocking the UI. Inspired by [Partytown](https://partytown.builder.io/).

## Installation

```bash
npm install @blazefw/sidecar
```

No peer dependencies. Works in any browser environment.

## Quick start

```html
<!-- Mark scripts you want offloaded with type="text/blazefw" -->
<script type="text/blazefw" src="https://www.googletagmanager.com/gtm.js?id=GTM-XXXX"></script>
<script type="text/blazefw" src="https://cdn.example.com/analytics.js"></script>
```

```ts
import { initSidecar } from '@blazefw/sidecar';

// Call once after DOM is ready
initSidecar();
```

The sidecar worker picks up all `<script type="text/blazefw">` tags — including any injected after page load (e.g. by GTM) — and executes them in a Web Worker.

## API

### `initSidecar(options?)`

```ts
import { initSidecar, type SidecarOptions } from '@blazefw/sidecar';

const handle = initSidecar({
  // CSS selector for the script type attribute (default: 'text/blazefw')
  scriptType: 'text/blazefw',

  // Root element to scan for scripts (default: document.body)
  container: document.getElementById('app'),
});

// Destroy the sidecar and disconnect the MutationObserver
handle.destroy();
```

**Returns:** `SidecarHandle` — `{ worker: Worker, destroy: () => void }`

### `collectSidecarScripts(container, scriptType?)`

Finds all sidecar script elements inside a container. Useful for SSR or custom integrations.

```ts
import { collectSidecarScripts } from '@blazefw/sidecar';

const scripts = collectSidecarScripts(document.body, 'text/blazefw');
// returns: Array<{ src: string } | { inline: string }>
```

### `handleProxyRequest(window, message)`

Main-thread handler that resolves a DOM proxy request from the worker. Used internally — exposed for custom worker implementations.

```ts
import { handleProxyRequest } from '@blazefw/sidecar';

// In your main thread message handler:
worker.addEventListener('message', (event) => {
  const result = handleProxyRequest(window, event.data);
  if (result) worker.postMessage(result);
});
```

## How it works

1. `initSidecar()` scans `document.body` for `<script type="text/blazefw">` tags
2. Spawns a Web Worker
3. Sends script sources to the worker via `postMessage`
4. The worker executes each script with `new Function('window', 'document', ..., src)`, injecting a proxy `window`
5. When the script calls `window.dataLayer.push(...)` or reads `document.title`, the proxy sends a message to the main thread
6. The main thread executes the real DOM call and replies with the result
7. A `MutationObserver` watches for scripts injected after page load (e.g. GTM dynamically adding pixels)

## Protocol

```ts
import type { WorkerToMain, MainToWorker } from '@blazefw/sidecar';

// Worker → Main (requests)
type WorkerToMain =
  | { type: 'get';  id: number; path: string[] }
  | { type: 'set';  id: number; path: string[]; value: unknown }
  | { type: 'call'; id: number; path: string[]; args: unknown[] }

// Main → Worker (responses)
type MainToWorker =
  | { type: 'response'; id: number; value: unknown }
  | { type: 'error';    id: number; message: string }
  | { type: 'load';     src: string }
```

## Why async proxy (not SharedArrayBuffer)?

The proxy uses Promises (not `Atomics.wait` / SharedArrayBuffer) which means:
- No `Cross-Origin-Opener-Policy` / `Cross-Origin-Embedder-Policy` headers required
- Works on all hosting environments including Vercel, Netlify, and shared hosts
- Simpler mental model — DOM calls are async but scripts rarely depend on synchronous return values from analytics

## Limitations

- Scripts that depend on synchronous DOM reads (e.g. inline `document.write()`) may not work correctly
- `localStorage` and `sessionStorage` access is proxied asynchronously — write-heavy scripts may be slower
- Service Workers cannot be spawned from inside a Web Worker
