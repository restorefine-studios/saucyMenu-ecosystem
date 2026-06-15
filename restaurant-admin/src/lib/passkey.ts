import {
  startRegistration,
  startAuthentication,
  browserSupportsWebAuthn,
} from "@simplewebauthn/browser";

export { browserSupportsWebAuthn };

const rawBase = (import.meta.env.VITE_APP_SERVER_URL as string || "").trim();
const BASE = rawBase.endsWith("/") ? rawBase : `${rawBase}/`;

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  const body = await res.json();
  if (!res.ok) throw new Error(body.message ?? "Request failed");
  return body.data as T;
}

export async function registerPasskey(): Promise<{ deviceName: string }> {
  const options = await apiFetch<Record<string, unknown>>(
    "auth/passkey/register/begin",
    { method: "POST" }
  );
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const attResp = await startRegistration({ optionsJSON: options as any });
  return apiFetch("auth/passkey/register/finish", {
    method: "POST",
    body: JSON.stringify(attResp),
  });
}

export async function loginWithPasskey(): Promise<void> {
  const beginData = await apiFetch<{
    challengeId: string;
    options: Record<string, unknown>;
  }>("auth/passkey/login/begin", { method: "POST" });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const assertResp = await startAuthentication({ optionsJSON: beginData.options as any });

  await apiFetch("auth/passkey/login/finish", {
    method: "POST",
    body: JSON.stringify({ challengeId: beginData.challengeId, credential: assertResp }),
  });
}

export async function fetchPasskeyStatus(): Promise<{
  registered: boolean;
  credentials: { id: string; deviceName: string; createdAt: string }[];
}> {
  return apiFetch("auth/passkey/status");
}

export async function deletePasskey(credentialId: string): Promise<void> {
  await apiFetch(`auth/passkey/${encodeURIComponent(credentialId)}`, {
    method: "DELETE",
  });
}
