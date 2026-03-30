# @blazefw/snapshot

BlazeFW Snapshot Boundary — a React Error Boundary that automatically recovers from render errors by rewinding state through a ring buffer of previously-good snapshots. Time-travel error recovery with zero configuration.

## Installation

```bash
npm install @blazefw/snapshot
# peer dependencies
npm install react react-dom
```

## Quick start

```tsx
import { SnapshotBoundary, useSnapshot } from '@blazefw/snapshot';

function Editor() {
  const { value, setValue, boundaryProps } = useSnapshot({ text: '', version: 0 });

  return (
    <SnapshotBoundary
      {...boundaryProps}
      onRestore={(data, meta) => {
        console.log(`Restored to snapshot. ${meta.remaining} snapshots left.`);
        console.log('Error that triggered restore:', meta.error);
      }}
    >
      <RichEditor
        content={value.text}
        onChange={(text) => setValue({ text, version: value.version + 1 })}
      />
    </SnapshotBoundary>
  );
}
```

If `<RichEditor>` throws during render, the boundary automatically pops the most recent good snapshot, restores state, and re-renders — no crash screen, no manual recovery.

## API

### `useSnapshot<T>(initial, options?)`

The recommended way to use snapshot boundaries. Manages the snapshot value and wires up `SnapshotBoundary` props in one call.

```ts
import { useSnapshot } from '@blazefw/snapshot';

const { value, setValue, boundaryProps } = useSnapshot(
  { count: 0, text: '' },   // initial state
  {
    capacity: 10,            // max snapshots to keep (default: 10)
    onRestore: (data, meta) => console.log('Restored:', data, meta),
  }
);

// value     — current state (T)
// setValue  — update state, records a new snapshot
// boundaryProps — spread onto <SnapshotBoundary>
```

### `<SnapshotBoundary>` props

```tsx
<SnapshotBoundary
  snapshot={data}                   // T — current snapshot to record
  onRestore={(data, meta) => {}}    // called when restore occurs
  fallback={<p>All snapshots exhausted</p>}  // shown when buffer is empty
  capacity={10}                     // ring buffer size (default: 10)
>
  {children}
</SnapshotBoundary>
```

**`RestoreMeta`** passed to `onRestore`:

```ts
{
  timestamp: number;    // Date.now() when restore was triggered
  remaining: number;    // snapshots still available after this restore
  error: Error;         // the error that triggered the restore
}
```

### `SnapshotBuffer<T>` — standalone ring buffer

Use the buffer independently for any time-travel use case (undo history, draft recovery, etc.):

```ts
import { SnapshotBuffer } from '@blazefw/snapshot';

const buffer = new SnapshotBuffer<string>(5); // capacity 5

buffer.push({ data: 'v1', timestamp: Date.now() });
buffer.push({ data: 'v2', timestamp: Date.now() });
buffer.push({ data: 'v3', timestamp: Date.now() });

buffer.pop();     // { data: 'v3', ... }  — newest first
buffer.pop();     // { data: 'v2', ... }
buffer.getAll();  // [...] — non-mutating copy, newest first
buffer.size;      // current count
buffer.capacity;  // max entries
```

## Behaviour when buffer is exhausted

When `pop()` returns `undefined` (all snapshots tried), the boundary stays in error state and renders the `fallback` prop (or a built-in `DefaultFallback` message). It does **not** loop or retry the same snapshot.

```tsx
<SnapshotBoundary
  snapshot={value}
  onRestore={handleRestore}
  fallback={
    <div>
      <p>Something went wrong and we ran out of snapshots.</p>
      <button onClick={() => window.location.reload()}>Reload</button>
    </div>
  }
>
  <ComplexComponent />
</SnapshotBoundary>
```

## When to use this

- Rich text editors, canvas editors, or any complex component that can throw on bad input
- Streaming/real-time data that may occasionally produce invalid render state
- Third-party component libraries you don't control
- Anywhere you want automatic graceful degradation instead of a crash screen

## React version compatibility

Works with React 18 and React 19. Uses a class component internally (hooks cannot catch errors).
