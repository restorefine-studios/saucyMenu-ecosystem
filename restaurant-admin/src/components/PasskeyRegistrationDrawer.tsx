import { Drawer } from "vaul";
import { Fingerprint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRegisterPasskey, useDismissPasskeyPrompt } from "@/hooks/usePasskey";
import { useNavigate } from "react-router-dom";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function PasskeyRegistrationDrawer({ open, onClose }: Props) {
  const { mutate: register, isPending } = useRegisterPasskey();
  const dismiss = useDismissPasskeyPrompt();
  const navigate = useNavigate();

  const handleEnable = () => {
    register(undefined, {
      onSuccess: () => {
        onClose();
        navigate("/admin/dashboard", { replace: true });
      },
    });
  };

  const handleDismiss = () => {
    dismiss();
    onClose();
    navigate("/admin/dashboard", { replace: true });
  };

  return (
    <Drawer.Root open={open} dismissible={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/40 z-40" />
        <Drawer.Content className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl bg-white px-6 pb-10 pt-6 flex flex-col items-center gap-4 max-w-lg mx-auto">
          <div className="w-12 h-1 rounded-full bg-gray-200 mb-2" />

          <div className="w-16 h-16 rounded-full bg-orange-50 flex items-center justify-center">
            <Fingerprint className="h-8 w-8 text-orange-400" />
          </div>

          <h2 className="text-xl font-bold text-gray-900 text-center">
            Sign in faster with Face ID
          </h2>
          <p className="text-sm text-gray-500 text-center leading-relaxed">
            Use Face ID or Touch ID to unlock the app instantly. Your credentials are stored securely in your device's keychain.
          </p>

          <Button
            onClick={handleEnable}
            disabled={isPending}
            className="w-full py-6 bg-orange-400 hover:bg-orange-500 text-white rounded-xl mt-2"
          >
            {isPending ? "Setting up…" : "Enable Face ID"}
          </Button>

          <button
            onClick={handleDismiss}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            Not now
          </button>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
