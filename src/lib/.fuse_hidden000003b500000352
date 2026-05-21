// Pub/sub for live task-bidding updates.
//
// Backed by `sse-bus`, which picks Redis (multi-instance safe) when
// `REDIS_URL` is set, and an in-process Map otherwise. The public API
// is unchanged — every caller still imports `subscribe` / `publish` /
// `OfferEvent` from this file.

import { createBus } from "./sse-bus";

const bus = createBus("offers");

export const subscribe = bus.subscribe;
export const publish = bus.publish;

export type OfferEvent =
  | {
      type: "new-offer";
      bookingId: string;
      taskerId: string;
      priceCents: number | null;
      estimatedMinutes: number | null;
      message: string | null;
      createdAt: string;
    }
  | {
      type: "offer-update";
      bookingId: string;
      status: string;
      taskerId: string;
    };
