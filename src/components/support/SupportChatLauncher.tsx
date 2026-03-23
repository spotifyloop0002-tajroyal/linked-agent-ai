import { lazy, Suspense, useState } from "react";
import { MessageCircle } from "lucide-react";

const LiveChatWidget = lazy(() => import("@/components/support/LiveChatWidget"));

export const SupportChatLauncher = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      {!open && (
        <button
          type="button"
          aria-label="Open live support chat"
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-opacity hover:opacity-90"
        >
          <MessageCircle className="h-6 w-6" />
        </button>
      )}

      {open ? (
        <Suspense fallback={null}>
          <LiveChatWidget externalOpen={open} onExternalClose={() => setOpen(false)} />
        </Suspense>
      ) : null}
    </>
  );
};