/**
 * Pesapal v3 HTTP client.
 *
 * Pesapal API quick reference:
 *   - Sandbox  base: https://cybqa.pesapal.com/pesapalv3
 *   - Production base: https://pay.pesapal.com/v3
 *
 * Flow:
 *   1. Auth: POST /api/Auth/RequestToken with consumer_key + consumer_secret
 *      → { token, expiryDate }
 *   2. Register IPN: POST /api/URLSetup/RegisterIPN { url, ipn_notification_type }
 *      → { ipn_id }   (do once; cache the id)
 *   3. Submit order: POST /api/Transactions/SubmitOrderRequest
 *      → { order_tracking_id, redirect_url, merchant_reference }
 *   4. Pesapal hits our IPN with OrderTrackingId once status changes.
 *   5. Status: GET /api/Transactions/GetTransactionStatus?orderTrackingId=...
 *
 * All Pesapal HTTP calls go through `pesapalFetch` which transparently
 * grabs/refreshes a bearer token and adds the Authorization header.
 */

import { prisma } from "./prisma";
import { centsToDecimal } from "./money";

export type PesapalEnv = "sandbox" | "production";

export function pesapalEnv(): PesapalEnv {
  return (process.env.PESAPAL_ENV as PesapalEnv) === "production"
    ? "production"
    : "sandbox";
}

export function pesapalBaseUrl(): string {
  return pesapalEnv() === "production"
    ? "https://pay.pesapal.com/v3"
    : "https://cybqa.pesapal.com/pesapalv3";
}

export function isPesapalConfigured(): boolean {
  return Boolean(
    process.env.PESAPAL_CONSUMER_KEY && process.env.PESAPAL_CONSUMER_SECRET,
  );
}

/* ----------------------------- Token cache ----------------------------- */

let cached: { token: string; expiresAt: number } | null = null;

async function fetchToken(): Promise<string> {
  const key = process.env.PESAPAL_CONSUMER_KEY;
  const secret = process.env.PESAPAL_CONSUMER_SECRET;
  if (!key || !secret) {
    throw new Error(
      "Pesapal not configured — set PESAPAL_CONSUMER_KEY and PESAPAL_CONSUMER_SECRET.",
    );
  }
  const res = await fetch(`${pesapalBaseUrl()}/api/Auth/RequestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ consumer_key: key, consumer_secret: secret }),
    cache: "no-store",
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Pesapal auth failed: ${res.status} ${body}`);
  }
  const data = (await res.json()) as {
    token?: string;
    expiryDate?: string;
    error?: { code?: string; message?: string };
  };
  if (!data.token) {
    throw new Error(
      `Pesapal auth returned no token: ${data.error?.message ?? "unknown"}`,
    );
  }
  // Token lifetime is ~5 min; refresh 30 s early.
  const expiresAt = data.expiryDate
    ? new Date(data.expiryDate).getTime() - 30_000
    : Date.now() + 4 * 60 * 1000;
  cached = { token: data.token, expiresAt };
  return data.token;
}

async function getToken(): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  return fetchToken();
}

/* ------------------------------- Fetch ------------------------------- */

async function pesapalFetch<T>(
  path: string,
  init: RequestInit & { json?: unknown } = {},
): Promise<T> {
  const token = await getToken();
  const { json, headers, ...rest } = init;
  const res = await fetch(`${pesapalBaseUrl()}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(headers ?? {}),
    },
    body: json !== undefined ? JSON.stringify(json) : rest.body,
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    throw new Error(
      `Pesapal ${path} failed: ${res.status} ${typeof data === "object" ? JSON.stringify(data) : text}`,
    );
  }
  return data as T;
}

/* ------------------------------- IPN -------------------------------- */

interface RegisterIpnResponse {
  url: string;
  created_date: string;
  ipn_id: string;
  notification_type: number;
  ipn_notification_type_description: string;
  ipn_status: number;
  ipn_status_description: string;
}

/**
 * Returns a Pesapal IPN id. Resolution order:
 *   1. PESAPAL_IPN_ID env var (cheapest, host-managed)
 *   2. Cached row in PesapalIpn table
 *   3. Register a new IPN with `${APP_URL}/api/webhooks/pesapal` and cache it
 */
export async function ensureIpnId(): Promise<string> {
  const fromEnv = process.env.PESAPAL_IPN_ID?.trim();
  if (fromEnv) return fromEnv;

  const existing = await prisma.pesapalIpn.findFirst();
  if (existing) return existing.ipnId;

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const url = `${appUrl}/api/webhooks/pesapal`;
  const registered = await pesapalFetch<RegisterIpnResponse>(
    "/api/URLSetup/RegisterIPN",
    {
      method: "POST",
      json: { url, ipn_notification_type: "POST" },
    },
  );
  const row = await prisma.pesapalIpn.create({
    data: { ipnId: registered.ipn_id, url },
  });
  return row.ipnId;
}

/* ------------------------- Submit order ----------------------------- */

export interface BillingAddress {
  email_address?: string;
  phone_number?: string;
  country_code?: string;
  first_name?: string;
  last_name?: string;
}

export interface SubmitOrderInput {
  merchantReference: string; // our payment id
  amountCents: number;
  currency: string;
  description: string;
  callbackUrl: string;
  billing: BillingAddress;
}

interface SubmitOrderResponse {
  order_tracking_id: string;
  merchant_reference: string;
  redirect_url: string;
}

export async function submitOrder(
  input: SubmitOrderInput,
): Promise<SubmitOrderResponse> {
  const ipnId = await ensureIpnId();
  return pesapalFetch<SubmitOrderResponse>(
    "/api/Transactions/SubmitOrderRequest",
    {
      method: "POST",
      json: {
        id: input.merchantReference,
        currency: input.currency,
        amount: centsToDecimal(input.amountCents),
        description: input.description.slice(0, 100),
        callback_url: input.callbackUrl,
        notification_id: ipnId,
        billing_address: input.billing,
      },
    },
  );
}

/* ------------------------- Transaction status -------------------------- */

export interface PesapalTransactionStatus {
  status_code: number; // 0 invalid, 1 completed, 2 failed, 3 reversed
  payment_method?: string;
  payment_account?: string;
  payment_status_description?: string;
  description?: string;
  message?: string;
  payment_status_code?: string;
  confirmation_code?: string;
  amount?: number;
  currency?: string;
  merchant_reference?: string;
  order_tracking_id?: string;
}

export async function getTransactionStatus(
  orderTrackingId: string,
): Promise<PesapalTransactionStatus> {
  return pesapalFetch<PesapalTransactionStatus>(
    `/api/Transactions/GetTransactionStatus?orderTrackingId=${encodeURIComponent(orderTrackingId)}`,
    { method: "GET" },
  );
}

/* ---------------------------- Disbursement --------------------------- */

/**
 * Stub for the disbursement (payout) call. Pesapal's payouts product is a
 * separate agreement and not enabled on every account, so this throws by
 * default. When/if you enable it, replace this body with the real API call:
 *
 *   POST /api/v3/Disbursement/RequestPayment
 *   body: { Currency, Amount, Description, AccountReference,
 *           DestinationMobileNumber, ... }
 *
 * Returning the provider's tracking id lets us write it back to Payout.
 */
export async function submitDisbursement(_input: {
  amountCents: number;
  currency: string;
  destination: string;
  description: string;
  reference: string;
}): Promise<{ providerPayoutId: string }> {
  throw new Error(
    "Pesapal disbursement API not enabled — process payouts manually for now.",
  );
}
