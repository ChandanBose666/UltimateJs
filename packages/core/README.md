# @blazefw/core

BlazeFW runtime core — the `useSync` hook that connects React components to a CRDT document synced across all peers via a binary WebSocket. This is the **Zero-Fetch Sync** pillar of BlazeFW: no `fetch()`, no REST endpoints, no manual state synchronisation.

## Installation

```bash
npm install @blazefw/core @blazefw/crdt
# peer dependency
npm install react
```

You also need a running sync server (`@blazefw/sync-server`) or a compatible WebSocket endpoint.

## Quick start

```tsx
import { useSync } from '@blazefw/core';

function TodoItem({ id }: { id: string }) {
  const [state, update] = useSync('todos', id);

  return (
    <div>
      <input
        value={state.title ?? ''}
        onChange={(e) => update('title', e.target.value)}
      />
      <span>{state.done === 'true' ? '✓' : '○'}</span>
      <button onClick={() => update('done', 'true')}>Complete</button>
    </div>
  );
}
```

Every tab, device, or user connected to the same `('todos', id)` pair sees updates in real time — no polling, no REST calls.

## API

### `useSync(collection, id, options?)`

```ts
import { useSync } from '@blazefw/core';

const [state, update] = useSync(
  'todos',       // collection name — groups documents by type
  todoId,        // document ID — unique within the collection
  {
    // Optional: override the WebSocket server URL
    // Default: ws://<window.location.host>/sync
    serverUrl: 'ws://localhost:3001',

    // Optional: called when a local optimistic update is rolled back
    onRollback: (rejectedKeys: string[]) => {
      console.warn('Rolled back:', rejectedKeys);
    },
  }
);
```

**Returns:** `[state, update]`

- `state` — `Record<string, string>` — snapshot of all root CRDT keys, updated on every incoming frame
- `update(key, value)` — applies the change locally (optimistic), then broadcasts the delta to all peers

### URL scheme

The hook connects to:

```
ws[s]://<host>/sync/<collection>/<id>
```

On HTTPS pages it automatically uses `wss://`. Override with `options.serverUrl`.

### Optimistic updates and rollbacks

`update()` writes immediately to the local CRDT document and dispatches a React state update — no waiting for the server. If the server rejects the delta (sends a `0xFF` rejection frame), the hook automatically:

1. Reloads the document from the last server-confirmed snapshot
2. Clears all pending optimistic keys
3. Calls `options.onRollback(rejectedKeys)` so you can show a UI error

```tsx
const [state, update] = useSync('accounts', userId, {
  onRollback: (keys) => toast.error(`Update to ${keys.join(', ')} was rejected`),
});
```

### REJECTION_FRAME constant

```ts
import { REJECTION_FRAME } from '@blazefw/core';

// REJECTION_FRAME === 0xFF
// Used by @blazefw/sync-server to signal a rejected delta
```

## How sync works

1. Hook mounts → lazily loads `@blazefw/crdt` WASM (once per app, deduplicated)
2. Opens WebSocket to `ws://<host>/sync/<collection>/<id>`
3. Server sends full document snapshot as binary frame → loaded via `CrdtDoc.load()`
4. Subsequent binary frames = CRDT deltas → merged via `CrdtDoc.merge()`
5. Empty binary frame (0 bytes) = server signals empty doc → hook initialises with empty state
6. `update(key, value)` → applies change to local doc → sends `doc.save()` bytes to server
7. Hook unmount → `doc.free()` releases WASM memory

## Multiple components, same document

Multiple `useSync` calls for the same `(collection, id)` each open their own WebSocket connection. For a shared connection, lift the hook to a common ancestor and pass state down via props or context.

## TypeScript

`state` is typed as `Record<string, string>`. All CRDT values are stored and returned as strings — convert to your domain types at the call site:

```ts
const [state, update] = useSync('settings', userId);

const fontSize = Number(state.fontSize ?? '14');
const darkMode = state.darkMode === 'true';
const tags = state.tags ? JSON.parse(state.tags) : [];
```
