import { useEffect, useRef, useState } from "react";
import { X, Share } from "lucide-react";

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
    <div className="fixed bottom-4 left-4 right-4 z-40 bg-white border border-gray-200 rounded-2xl shadow-lg p-4 flex items-start gap-3 max-w-sm mx-auto">
      <img src="/saucymenu.svg" alt="" className="h-10 w-10 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm text-gray-900">Add to Home Screen</p>
        {isIOS ? (
          <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
            Tap <Share className="inline h-3 w-3 mx-0.5" /> then "Add to Home Screen"
          </p>
        ) : (
          <button onClick={install} className="text-xs text-orange-500 underline mt-1">
            Install app
          </button>
        )}
      </div>
      <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
