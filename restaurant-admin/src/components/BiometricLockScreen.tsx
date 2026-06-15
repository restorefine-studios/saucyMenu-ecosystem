import { useEffect, useState } from "react";
import { Fingerprint, Loader2 } from "lucide-react";
import { useLoginWithPasskey } from "@/hooks/usePasskey";
import { authClient } from "@/lib/auth-client";

interface Props {
  onUnlock: () => void;
  onSignInDifferently: () => void;
}

export function BiometricLockScreen({ onUnlock, onSignInDifferently }: Props) {
  const [userName, setUserName] = useState("");
  const { mutate: login, isPending } = useLoginWithPasskey(onUnlock);

  useEffect(() => {
    authClient.getSession().then(({ data }) => {
      if (data?.user?.name) setUserName(data.user.name);
    });
    login();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col items-center justify-center gap-6 px-8">
      <img src="/saucymenu.svg" alt="Saucy Menu" className="h-12 mb-4" />

      {userName && (
        <p className="text-lg font-semibold text-gray-800">
          Welcome back, {userName.split(" ")[0]}
        </p>
      )}

      <button
        onClick={() => login()}
        disabled={isPending}
        className="w-24 h-24 rounded-full bg-orange-50 border-2 border-orange-400 flex items-center justify-center hover:bg-orange-100 transition-colors disabled:opacity-50"
        aria-label="Authenticate with Face ID"
      >
        {isPending ? (
          <Loader2 className="h-10 w-10 text-orange-400 animate-spin" />
        ) : (
          <Fingerprint className="h-10 w-10 text-orange-400" />
        )}
      </button>

      {isPending && (
        <p className="text-sm text-gray-500">Verifying…</p>
      )}

      <button
        onClick={onSignInDifferently}
        className="text-sm text-gray-400 underline hover:text-gray-600"
      >
        Sign in differently
      </button>
    </div>
  );
}
