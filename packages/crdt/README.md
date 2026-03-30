# @blazefw/crdt

Automerge CRDT document compiled to WebAssembly — the sync engine powering BlazeFW's Zero-Fetch Sync. Wraps an [Automerge](https://automerge.org) flat key-value document behind a simple `CrdtDoc` API via `wasm-bindgen`. Used internally by `@blazefw/core` (`useSync`) but fully usable standalone.

## Installation

```bash
npm install @blazefw/crdt
```

> This package ships a `.wasm` file. Bundlers (Vite, webpack, esbuild) handle WASM automatically. For Node.js, use `--experimental-wasm-modules` or a WASM loader.

## Quick start

```ts
import init, { CrdtDoc } from '@blazefw/crdt';

// Initialise the WASM module (once per app)
await init();

// Create a new document
const doc = new CrdtDoc();

doc.set('title', 'Hello BlazeFW');
doc.set('done', 'false');
doc.set_number('count', 42);
doc.set_bool('active', true);

console.log(doc.get('title'));   // 'Hello BlazeFW'
console.log(doc.keys());         // ['title', 'done', 'count', 'active']

doc.free(); // release WASM memory
```

## API

### Constructor

```ts
const doc = new CrdtDoc();
```

Creates a new, empty Automerge document.

### Reading values

```ts
doc.get(key: string): string | undefined
// Returns the value as a string, or undefined if the key doesn't exist

doc.get_json(key: string): string | undefined
// Returns the value as a JSON string (useful for complex values)

doc.keys(): string[]
// Returns all root-level keys in the document
```

### Writing values

```ts
doc.set(key: string, value: string): void
doc.set_number(key: string, value: number): void
doc.set_bool(key: string, value: boolean): void
doc.delete(key: string): void
```

### Serialisation

```ts
doc.save(): Uint8Array
// Serialises the full document to Automerge binary format

CrdtDoc.load(bytes: Uint8Array): CrdtDoc
// Deserialises a previously saved document

doc.merge(delta: Uint8Array): void
// Merges a remote delta into this document (CRDT-safe — concurrent writes resolve deterministically)
```

### Memory management

```ts
doc.free(): void
// Releases the WASM memory for this document.
// Always call free() when done (e.g. in useEffect cleanup).
```

## Sync example (manual)

```ts
import init, { CrdtDoc } from '@blazefw/crdt';

await init();

// Peer A
const a = new CrdtDoc();
a.set('name', 'Alice');
const bytesA = a.save();

// Peer B (receives A's document)
const b = CrdtDoc.load(bytesA);
b.set('name', 'Bob');            // concurrent write
const deltaB = b.save();

// Merge B's changes back into A — both names are preserved via CRDT
a.merge(deltaB);
console.log(a.get('name'));      // CRDT resolves deterministically (last-write-wins by default)
```

## Use with @blazefw/core

`@blazefw/core`'s `useSync` hook handles WASM initialisation, loading, merging, and memory management automatically. You rarely need to use `@blazefw/crdt` directly unless you are building a custom sync transport or server-side CRDT logic.

```ts
// Prefer this in React apps:
import { useSync } from '@blazefw/core';
const [state, update] = useSync('todos', id);
```
