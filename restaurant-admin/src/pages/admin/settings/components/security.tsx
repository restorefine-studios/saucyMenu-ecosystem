import { Shield, Trash2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import Spinner from "@/components/Spinner";
import {
  usePasskeyStatus,
  useDeletePasskey,
  useRegisterPasskey,
  usePasskeySupported,
} from "@/hooks/usePasskey";

export function Security() {
  const supported = usePasskeySupported();
  const { data, isLoading } = usePasskeyStatus();
  const { mutate: addPasskey, isPending: adding } = useRegisterPasskey();
  const { mutate: removePasskey, isPending: removing } = useDeletePasskey();

  if (!supported) {
    return (
      <div className="mt-6 text-sm text-gray-500">
        Your browser or device does not support passkeys (Face ID / Touch ID).
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center mt-8">
        <Spinner />
      </div>
    );
  }

  const credentials = data?.credentials ?? [];

  return (
    <div className="mt-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Shield className="h-5 w-5 text-orange-400" />
        <h3 className="font-semibold text-gray-900">Face ID / Passkey</h3>
      </div>

      {credentials.length === 0 ? (
        <p className="text-sm text-gray-500">No passkeys registered on this account.</p>
      ) : (
        <ul className="space-y-3">
          {credentials.map((cred) => (
            <li
              key={cred.id}
              className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3"
            >
              <div>
                <p className="text-sm font-medium text-gray-800">{cred.deviceName}</p>
                <p className="text-xs text-gray-400">
                  Added {new Date(cred.createdAt).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => removePasskey(cred.id)}
                disabled={removing}
                className="text-red-400 hover:text-red-600 disabled:opacity-40"
                aria-label="Remove passkey"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button
        onClick={() => addPasskey()}
        disabled={adding}
        className="mt-2 flex items-center gap-2 bg-orange-400 hover:bg-orange-500 text-white rounded-xl px-4 py-2"
      >
        <Plus className="h-4 w-4" />
        {adding ? "Setting up…" : "Add passkey"}
      </Button>
    </div>
  );
}
