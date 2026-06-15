import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppLock } from "@/hooks/useAppLock";
import { usePasskeyStatus, passkeyPromptDismissed, usePasskeySupported } from "@/hooks/usePasskey";
import { BiometricLockScreen } from "./BiometricLockScreen";
import { PasskeyRegistrationDrawer } from "./PasskeyRegistrationDrawer";
import { authClient } from "@/lib/auth-client";

interface Props {
  children: React.ReactNode;
}

export function AppShell({ children }: Props) {
  const navigate = useNavigate();
  const { lockState, unlock } = useAppLock();
  const supported = usePasskeySupported();
  const { data: passkeyStatus } = usePasskeyStatus();
  const [showRegistration, setShowRegistration] = useState(false);

  // Redirect to login if the 1-minute window expired
  useEffect(() => {
    if (lockState === "full-login") {
      navigate("/");
    }
  }, [lockState, navigate]);

  // Offer passkey registration after first login on a supported device.
  // Navigate to dashboard first so the drawer always appears over the dashboard
  // (not over whatever page the browser last restored, e.g. Settings).
  useEffect(() => {
    if (!supported) return;
    if (passkeyStatus === undefined) return;
    if (!passkeyStatus.registered && !passkeyPromptDismissed()) {
      navigate("/admin/dashboard", { replace: true });
      setShowRegistration(true);
    }
  }, [supported, passkeyStatus, navigate]);

  // Show biometric lock screen when returning within 1 minute
  if (lockState === "biometric") {
    return (
      <BiometricLockScreen
        onUnlock={unlock}
        onSignInDifferently={() => {
          authClient.signOut().then(() => navigate("/"));
        }}
      />
    );
  }

  return (
    <>
      {children}
      <PasskeyRegistrationDrawer
        open={showRegistration}
        onClose={() => setShowRegistration(false)}
      />
    </>
  );
}
