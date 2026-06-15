import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  browserSupportsWebAuthn,
  deletePasskey,
  fetchPasskeyStatus,
  loginWithPasskey,
  registerPasskey,
} from "@/lib/passkey";

const PASSKEY_REGISTERED_KEY = "passkeyRegistered";
const PASSKEY_DISMISSED_KEY = "passkeyPromptDismissed";

export function usePasskeySupported() {
  return browserSupportsWebAuthn();
}

export function passkeyIsRegistered() {
  return localStorage.getItem(PASSKEY_REGISTERED_KEY) === "true";
}

export function passkeyPromptDismissed() {
  return sessionStorage.getItem(PASSKEY_DISMISSED_KEY) === "true";
}

export function setPasskeyRegistered(value: boolean) {
  if (value) {
    localStorage.setItem(PASSKEY_REGISTERED_KEY, "true");
  } else {
    localStorage.removeItem(PASSKEY_REGISTERED_KEY);
  }
}

export function usePasskeyStatus() {
  return useQuery({
    queryKey: ["passkey-status"],
    queryFn: fetchPasskeyStatus,
    staleTime: 60_000,
    retry: false,
    throwOnError: false,
  });
}

export function useRegisterPasskey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: registerPasskey,
    onSuccess: (data) => {
      localStorage.setItem(PASSKEY_REGISTERED_KEY, "true");
      qc.invalidateQueries({ queryKey: ["passkey-status"] });
      toast.success(`Face ID enabled on ${data.deviceName}`);
    },
    onError: (err: Error) => {
      if (err.name === "NotAllowedError") {
        toast.error("Face ID cancelled");
      } else {
        toast.error(err.message ?? "Failed to enable Face ID");
      }
    },
  });
}

export function useLoginWithPasskey(onSuccess: () => void) {
  return useMutation({
    mutationFn: loginWithPasskey,
    onSuccess,
    onError: (err: Error) => {
      if (err.name === "NotAllowedError") {
        toast.error("Face ID cancelled");
      } else if (err.message?.includes("Security error")) {
        localStorage.removeItem(PASSKEY_REGISTERED_KEY);
        toast.error("Security error — please sign in again");
      } else {
        toast.error(err.message ?? "Could not connect. Try again.");
      }
    },
  });
}

export function useDismissPasskeyPrompt() {
  return () => {
    sessionStorage.setItem(PASSKEY_DISMISSED_KEY, "true");
  };
}

export function useDeletePasskey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: deletePasskey,
    onSuccess: () => {
      localStorage.removeItem(PASSKEY_REGISTERED_KEY);
      qc.invalidateQueries({ queryKey: ["passkey-status"] });
      toast.success("Passkey removed");
    },
    onError: () => toast.error("Failed to remove passkey"),
  });
}
