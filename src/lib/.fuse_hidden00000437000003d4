/**
 * Redis client singletons.
 *
 * We keep two connections because Redis pub/sub blocks the connection it
 * runs on: a subscribed client can't issue arbitrary commands. Splitting
 * publisher / subscriber is the standard pattern.
 *
 * If `REDIS_URL` isn't set, callers should fall back to an in-process
 * implementation (see `sse-bus.ts`). This module never throws lazily —
 * `isRedisEnabled()` is the gate that consumers check first.
 *
 * Both clients are stashed on `globalThis` to survive HMR in `next dev`,
 * matching the pattern used elsewhere in the app (e.g. Prisma).
 */

import Redis, { type RedisOptions } from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __qkaziRedis:
    | {
        publisher: Redis | null;
        subscriber: Redis | null;
      }
    | undefined;
}

const slot =
  globalThis.__qkaziRedis ??
  (globalThis.__qkaziRedis = { publisher: null, subscriber: null });

export function isRedisEnabled(): boolean {
  return Boolean(process.env.REDIS_URL);
}

function makeClient(label: string, extra: RedisOptions = {}): Redis {
  const url = process.env.REDIS_URL!;
  const client = new Redis(url, {
    // ioredis defaults to lazy connect = false; keep it that way. We also
    // want resilient reconnects rather than crashing on transient drops.
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(1000 * 2 ** Math.min(times, 5), 15_000),
    ...extra,
  });
  client.on("error", (err) => {
    console.error(`[redis:${label}]`, err.message);
  });
  return client;
}

/** Connection used for `PUBLISH` calls. */
export function getPublisher(): Redis {
  if (!isRedisEnabled()) {
    throw new Error("REDIS_URL not set — publisher unavailable");
  }
  if (!slot.publisher) {
    slot.publisher = makeClient("publisher");
  }
  return slot.publisher;
}

/** Connection used for `SUBSCRIBE`/`UNSUBSCRIBE`. Don't issue other
 *  commands on this client — Redis won't let you. */
export function getSubscriber(): Redis {
  if (!isRedisEnabled()) {
    throw new Error("REDIS_URL not set — subscriber unavailable");
  }
  if (!slot.subscriber) {
    slot.subscriber = makeClient("subscriber", {
      // Pub/sub commands have no per-request timeout; null is the idiomatic
      // ioredis setting for long-lived subscriber connections.
      maxRetriesPerRequest: null,
    });
  }
  return slot.subscriber;
}
