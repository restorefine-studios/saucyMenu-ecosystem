import { useEffect, useRef, useState } from "react";
import { Share } from "lucide-react";

const DISMISSED_KEY = "pwaInstallDismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
}

export function InstallPrompt() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const standalone = window.matchMedia("(display-mode: standalone)").matches;
    if (standalone) return;

    setIsIOS(ios);

    if (ios) {
      setShow(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    setShow(false);
  };

  const install = async () => {
    if (deferredPrompt.current) {
      await deferredPrompt.current.prompt();
    }
    dismiss();
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-6">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-8 text-center">
        <img
          src="/icons/icon-192.png"
          alt=""
          className="h-20 w-20 mx-auto rounded-2xl shadow-md"
        />
        <h2 className="mt-5 text-xl font-bold text-gray-900">Install Saucy Super Admin</h2>
        <p className="mt-2 text-sm text-gray-500">
          Add it to your home screen for quick access and a faster, app-like experience.
        </p>

        {isIOS ? (
          <div className="mt-6 bg-orange-50 rounded-xl p-4 text-sm text-gray-700 flex items-center justify-center gap-2">
            Tap <Share className="h-4 w-4 text-orange-500" /> then "Add to Home Screen"
          </div>
        ) : (
          <button
            onClick={install}
            className="mt-6 w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl py-3 transition-colors"
          >
            Add to Home Screen
          </button>
        )}

        <button
          onClick={dismiss}
          className="mt-4 text-sm text-gray-400 hover:text-gray-600"
        >
          Maybe later
        </button>
      </div>
    </div>
  );
}
