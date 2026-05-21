// Pub/sub for chat messages.
//
// Backed by `sse-bus`. Same trade-offs as offer-events — Redis when
// `REDIS_URL` is set, in-process Map otherwise.

import { createBus } from "./sse-bus";

const bus = createBus("chats");

export const subscribe = bus.subscribe;
export const publish = bus.publish;

export type ChatEvent =
  | { type: "message"; messageId: string }
  | { type: "read"; readerId: string };
