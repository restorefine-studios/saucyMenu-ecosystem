import { useCallback, useEffect, useRef, useState } from "react";
import { passkeyIsRegistered } from "./usePasskey";

const LOCKED_AT_KEY = "passkeyLockedAt";
const LOCK_TIMEOUT_MS = 60_000; // 1 minute

export type LockState = "unlocked" | "biometric" | "full-login";

function computeLockState(): LockState {
  if (!passkeyIsRegistered()) return "unlocked";
  const lockedAtStr = sessionStorage.getItem(LOCKED_AT_KEY);
  if (!lockedAtStr) return "unlocked";
  const elapsed = Date.now() - Number(lockedAtStr);
  if (elapsed < LOCK_TIMEOUT_MS) return "biometric";
  return "full-login";
}

export function useAppLock(): { lockState: LockState; unlock: () => void } {
  const [lockState, setLockState] = useState<LockState>(computeLockState);

  const onHide = useCallback(() => {
    if (passkeyIsRegistered()) {
      sessionStorage.setItem(LOCKED_AT_KEY, String(Date.now()));
    }
  }, []);

  const onShow = useCallback(() => {
    setLockState(computeLockState());
  }, []);

  const visibilityHandler = useRef<() => void>(() => {
    if (document.hidden) onHide();
    else onShow();
  });

  useEffect(() => {
    visibilityHandler.current = () => {
      if (document.hidden) onHide();
      else onShow();
    };
  }, [onHide, onShow]);

  useEffect(() => {
    const handler = () => visibilityHandler.current();
    document.addEventListener("visibilitychange", handler);
    window.addEventListener("pagehide", onHide);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      window.removeEventListener("pagehide", onHide);
    };
  }, [onHide]);

  const unlock = useCallback(() => {
    sessionStorage.removeItem(LOCKED_AT_KEY);
    setLockState("unlocked");
  }, []);

  return { lockState, unlock };
}
