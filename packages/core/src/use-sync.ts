/**
 * useSync — Zero-Fetch Sync hook for Nexus.js
 *
 * Connects a React component to a CRDT document that is kept in sync with
 * all peers via a binary WebSocket. The hook:
 *
 *  1. Lazily loads the @nexus/crdt WASM module on first call.
 *  2. Opens a WebSocket to `ws[s]://<host>/sync/<collection>/<id>`.
 *  3. On connect, the server sends the current document snapshot as a
 *     binary frame — the hook loads it via CrdtDoc.load().
 *  4. Subsequent binary frames are CRDT deltas — merged via CrdtDoc.merge().
 *  5. Returns `[state, update]` where:
 *     - `state` is a plain Record<string, string> snapshot of all root keys.
 *     - `update(key, value)` applies a local change, saves the full doc,
 *       and sends the bytes to the server over the WebSocket.
 *
 * Usage:
 *   const [state, update] = useSync("todos", todoId);
 *   update("title", "Buy milk");   // optimistic + synced
 */

import { useCallback, useEffect, useReducer, useRef } from "react";
import { createDoc, loadDoc } from "./crdt-loader.js";
import type { CrdtDoc } from "@nexus/crdt";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SyncState = Record<string, string>;

export type UpdateFn = (key: string, value: string) => void;

export type UseSyncResult = [state: SyncState, update: UpdateFn];

export interface UseSyncOptions {
  /**
   * WebSocket server URL.
   * Defaults to `ws://<window.location.host>/sync`.
   * Override in tests or when the sync server runs on a different host.
   */
  serverUrl?: string;
  /**
   * Called when the WebSocket encounters a non-fatal error (e.g. a bad
   * frame). Does not close the connection.
   */
  onError?: (err: Error) => void;
  /**
   * Called when the WebSocket connection closes unexpectedly.
   * Reconnect logic (if any) lives in the calling component.
   */
  onClose?: (event: CloseEvent) => void;
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Read all root keys from a CrdtDoc into a plain object. */
function docToState(doc: CrdtDoc): SyncState {
  const keysJson = doc.keys();
  const keys: string[] = JSON.parse(keysJson);
  const state: SyncState = {};
  for (const key of keys) {
    const value = doc.get(key);
    if (value !== undefined) {
      state[key] = value;
    }
  }
  return state;
}

/** Build the WebSocket URL for a given collection + document id. */
function buildWsUrl(
  base: string | undefined,
  collection: string,
  id: string
): string {
  if (base) {
    return `${base.replace(/\/$/, "")}/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
  }
  // Browser default: same host, ws(s) mirrors http(s)
  const proto =
    typeof window !== "undefined" && window.location.protocol === "https:"
      ? "wss"
      : "ws";
  const host =
    typeof window !== "undefined" ? window.location.host : "localhost:3000";
  return `${proto}://${host}/sync/${encodeURIComponent(collection)}/${encodeURIComponent(id)}`;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

type HookState =
  | { status: "loading" }
  | { status: "ready"; state: SyncState }
  | { status: "error"; error: Error };

type HookAction =
  | { type: "ready"; state: SyncState }
  | { type: "update"; state: SyncState }
  | { type: "error"; error: Error };

function reducer(_prev: HookState, action: HookAction): HookState {
  switch (action.type) {
    case "ready":
    case "update":
      return { status: "ready", state: action.state };
    case "error":
      return { status: "error", error: action.error };
  }
}

/**
 * useSync(collection, id, options?)
 *
 * @param collection  Logical namespace for the document (e.g. "todos")
 * @param id          Unique document identifier within the collection
 * @param options     Optional configuration (serverUrl, onError, onClose)
 * @returns           [state, update] — current snapshot and setter
 */
export function useSync(
  collection: string,
  id: string,
  options: UseSyncOptions = {}
): UseSyncResult {
  const { serverUrl, onError, onClose } = options;

  // Reducer drives re-renders; only updates when state actually changes.
  const [hookState, dispatch] = useReducer(reducer, { status: "loading" });

  // Stable refs so callbacks don't need to be recreated on every render.
  const docRef = useRef<CrdtDoc | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const onErrorRef = useRef(onError);
  const onCloseRef = useRef(onClose);
  onErrorRef.current = onError;
  onCloseRef.current = onClose;

  useEffect(() => {
    let cancelled = false;

    const wsUrl = buildWsUrl(serverUrl, collection, id);
    let ws: WebSocket | null = null;

    async function connect() {
      // --- 1. Load WASM + create local doc ---
      let doc: CrdtDoc;
      try {
        doc = await createDoc();
      } catch (err) {
        if (cancelled) return;
        dispatch({ type: "error", error: err as Error });
        return;
      }
      if (cancelled) {
        doc.free();
        return;
      }
      docRef.current = doc;

      // --- 2. Open WebSocket ---
      ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;

      ws.onopen = () => {
        // Server will immediately send the current snapshot as the first
        // binary frame — we wait for that before dispatching "ready".
      };

      ws.onmessage = async (event: MessageEvent) => {
        if (cancelled) return;
        const currentDoc = docRef.current;
        if (!currentDoc) return;

        try {
          if (event.data instanceof ArrayBuffer) {
            const bytes = new Uint8Array(event.data);

            if (bytes.length === 0) {
              // Empty frame = server signals an empty document; we already
              // have a fresh doc, just mark as ready.
              dispatch({ type: "ready", state: docToState(currentDoc) });
              return;
            }

            if (hookState.status === "loading") {
              // First frame: full snapshot — load it
              const loaded = await loadDoc(bytes);
              if (cancelled) {
                loaded.free();
                return;
              }
              // Swap out the empty doc we created for the one from the server
              currentDoc.free();
              docRef.current = loaded;
              dispatch({ type: "ready", state: docToState(loaded) });
            } else {
              // Subsequent frames: CRDT delta — merge in place
              currentDoc.merge(bytes);
              dispatch({ type: "update", state: docToState(currentDoc) });
            }
          }
        } catch (err) {
          onErrorRef.current?.(err as Error);
        }
      };

      ws.onerror = () => {
        if (cancelled) return;
        onErrorRef.current?.(new Error(`WebSocket error on ${wsUrl}`));
      };

      ws.onclose = (event: CloseEvent) => {
        if (cancelled) return;
        onCloseRef.current?.(event);
      };
    }

    connect();

    return () => {
      cancelled = true;
      ws?.close();
      wsRef.current = null;
      docRef.current?.free();
      docRef.current = null;
    };
    // Re-run only when the document identity changes, not on option callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collection, id, serverUrl]);

  // ---------------------------------------------------------------------------
  // update() — applies a local change and sends the full doc to the server
  // ---------------------------------------------------------------------------
  const update = useCallback(
    (key: string, value: string) => {
      const doc = docRef.current;
      const ws = wsRef.current;
      if (!doc) return; // WASM not ready yet — drop silently

      doc.set(key, value);

      // Optimistically push new state to React
      dispatch({ type: "update", state: docToState(doc) });

      // Send serialised doc to server so it can broadcast the delta to peers
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(doc.save());
      }
    },
    [] // docRef/wsRef are stable refs — no deps needed
  );

  const state =
    hookState.status === "ready" ? hookState.state : ({} as SyncState);

  return [state, update];
}
