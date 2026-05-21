/**
 * Generic SSE event bus.
 *
 * Two modes, picked by env at runtime:
 *
 *   1. `REDIS_URL` set — events go through Redis pub/sub on channels named
 *      `<prefix>:<id>`. Multiple app instances all see every event, so the
 *      live-offers and chat streams keep working when you scale horizontally.
 *
 *   2. `REDIS_URL` unset — fall back to an in-process Map. Fine for `next
 *      dev`, single-process Docker, or any single-instance VM deploy. This
 *      is the behaviour the codebase started with; keeping it as a fallback
 *      means dev doesn't need a Redis dependency.
 *
 * The public API is identical in both modes: `subscribe(id, listener)`
 * returns an unsubscribe function, and `publish(id, payload)` is
 * fire-and-forget. Listeners always receive a fully-formed SSE `data:`
 * frame string so the route handlers can write it straight through.
 *
 * Buses are stashed on globalThis so HMR doesn't pile up duplicate Redis
 * subscription handlers.
 */

import {
  getPublisher,
  getSubscriber,
  isRedisEnabled,
} from "./redis";

type Listener = (frame: string) => void;

export interface Bus {
  /** Subscribe to events for `id`. Returns an unsubscribe function. */
  subscribe(id: string, listener: Listener): () => void;
  /** Publish a JSON-serializable payload to all subscribers of `id`. */
  publish(id: string, payload: unknown): void;
}

declare global {
  // eslint-disable-next-line no-var
  var __qkaziBuses: Map<string, Bus> | undefined;
}

const buses: Map<string, Bus> =
  globalThis.__qkaziBuses ?? (globalThis.__qkaziBuses = new Map());

export function createBus(prefix: string): Bus {
  const existing = buses.get(prefix);
  if (existing) return existing;
  const created = isRedisEnabled() ? makeRedisBus(prefix) : makeLocalBus();
  buses.set(prefix, created);
  return created;
}

/* --------------------------- in-process bus --------------------------- */

function makeLocalBus(): Bus {
  const byId = new Map<string, Set<Listener>>();

  function dispatch(id: string, message: string): void {
    const set = byId.get(id);
    if (!set || set.size === 0) return;
    const frame = `data: ${message}\n\n`;
    for (const l of set) {
      try {
        l(frame);
      } catch {
        // ignore — never let one listener kill the others
      }
    }
  }

  return {
    subscribe(id, listener) {
      let set = byId.get(id);
      if (!set) {
        set = new Set();
        byId.set(id, set);
      }
      set.add(listener);
      return () => {
        const s = byId.get(id);
        if (!s) return;
        s.delete(listener);
        if (s.size === 0) byId.delete(id);
      };
    },
    publish(id, payload) {
      dispatch(id, JSON.stringify(payload));
    },
  };
}

/* ------------------------------ Redis bus ----------------------------- */

function makeRedisBus(prefix: string): Bus {
  const byId = new Map<string, Set<Listener>>();
  const channelFor = (id: string) => `${prefix}:${id}`;

  // One "message" handler per bus, registered on the shared subscriber.
  // We filter inbound messages by channel prefix so each bus only handles
  // its own. Adding more buses later just adds more filtered handlers.
  const subscriber = getSubscriber();
  const onMessage = (channel: string, message: string) => {
    if (!channel.startsWith(`${prefix}:`)) return;
    const id = channel.slice(prefix.length + 1);
    const set = byId.get(id);
    if (!set || set.size === 0) return;
    const frame = `data: ${message}\n\n`;
    for (const l of set) {
      try {
        l(frame);
      } catch {
        // ignore
      }
    }
  };
  subscriber.on("message", onMessage);

  return {
    subscribe(id, listener) {
      let set = byId.get(id);
      const fresh = !set;
      if (!set) {
        set = new Set();
        byId.set(id, set);
      }
      set.add(listener);

      // First local listener for this id → tell Redis we want this channel.
      if (fresh) {
        subscriber.subscribe(channelFor(id)).catch((err) => {
          console.error(`[sse-bus:${prefix}] subscribe failed:`, err);
        });
      }

      return () => {
        const s = byId.get(id);
        if (!s) return;
        s.delete(listener);
        if (s.size === 0) {
          byId.delete(id);
          subscriber.unsubscribe(channelFor(id)).catch((err) => {
            console.error(`[sse-bus:${prefix}] unsubscribe failed:`, err);
          });
        }
      };
    },
    publish(id, payload) {
      // Fire-and-forget. Errors are logged; the underlying business action
      // (saving a booking, sending a chat message) has already succeeded
      // by the time we get here, so we don't propagate up.
      getPublisher()
        .publish(channelFor(id), JSON.stringify(payload))
        .catch((err) => {
          console.error(`[sse-bus:${prefix}] publish failed:`, err);
        });
    },
  };
}
