# @blazefw/vite-plugin

BlazeFW Vite plugin — intercepts `.ultimate.tsx` files and routes them through the Rust compiler binary via a `stdin → stdout` JSON bridge. Automatically splits each file into a **server bundle** (no browser APIs) and a **client bundle** (RPC stubs replace server functions). Results are cached per file and cleared on HMR.

## Installation

```bash
npm install -D @blazefw/vite-plugin
```

The plugin requires the `nexus-compiler` Rust binary. It resolves in this order:
1. `ULTIMATE_COMPILER_BIN` environment variable
2. `packages/compiler/target/release/nexus-compiler` (release build)
3. `packages/compiler/target/debug/nexus-compiler` (debug build)

To build the binary:

```bash
cd packages/compiler
cargo build --release
```

## Usage

```ts
// vite.config.ts
import { defineConfig } from 'vite';
import { ultimatePlugin } from '@blazefw/vite-plugin';

export default defineConfig({
  plugins: [ultimatePlugin()],
});
```

## Options

```ts
import { ultimatePlugin, type UltimatePluginOptions } from '@blazefw/vite-plugin';

ultimatePlugin({
  // Glob pattern for files to process.
  // Default: /.ultimate.tsx?$/  (matches .ultimate.tsx and .ultimate.ts)
  include: /\.ultimate\.tsx?$/,
})
```

## How it works

Given a single mixed `.ultimate.tsx` file:

```tsx
// components/UserDashboard.ultimate.tsx
import { db } from './db';                     // ← server trigger (DB import)

export async function getUser(id: string) {    // classified: ServerOnly
  return db.user.findUnique({ where: { id } });
}

export function UserCard({ userId }) {         // classified: ClientOnly
  window.analytics.track('view');              // ← client trigger (browser global)
  return <button onClick={() => getUser(userId)}>Load</button>;
}
```

The plugin produces two outputs automatically:

**Server bundle** — contains `getUser`, strips `UserCard`:
```js
// .ultimate/UserDashboard.server.js (auto-generated)
export async function getUser(id) {
  return db.user.findUnique({ where: { id } });
}
```

**Client bundle** — contains `UserCard`, replaces `getUser` with a type-safe RPC stub:
```js
// .ultimate/UserDashboard.client.js (auto-generated)
export async function getUser(id) {
  return __ultimate_rpc('/api/__ultimate/getUser', { id });
}
export function UserCard({ userId }) {
  window.analytics.track('view');
  return <button onClick={() => getUser(userId)}>Load</button>;
}
```

## Classification rules

| Classification | Trigger | Behaviour |
|---|---|---|
| `ServerOnly` | `process.env`, DB imports, `node:*` | Kept in server bundle only |
| `ClientOnly` | `window`, `document`, `localStorage` | Kept in client bundle only |
| `Shared` | Pure logic, no triggers | Included in both bundles |
| `BoundaryCrossing` | Server fn called from client code | Gets RPC stub in client bundle |
| `Mixed` | Both triggers in same function | **Compile error** — must be split manually |

## HMR

The plugin hooks into Vite's `handleHotUpdate` — when a `.ultimate.tsx` file changes, its cache entry is cleared and a full page reload is triggered automatically. No manual restart needed.

## Environment variable

```bash
# Point to a custom compiler binary location
ULTIMATE_COMPILER_BIN=/path/to/nexus-compiler vite dev
```
