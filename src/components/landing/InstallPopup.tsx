import { useState, useEffect } from "react";
import { Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const InstallPopup = () => {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [dismissed, setDismissed] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  useEffect(() => {
    if (!installPrompt) return;

    const timer = window.setTimeout(() => setVisible(true), 1200);
    return () => window.clearTimeout(timer);
  }, [installPrompt]);

  const isStandalone =
    typeof window !== "undefined" &&
    window.matchMedia("(display-mode: standalone)").matches;

  const handleInstall = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const result = await installPrompt.userChoice;

    if (result.outcome === "accepted") {
      toast.success("App installed successfully!");
      setDismissed(true);
    }

    setInstallPrompt(null);
    setVisible(false);
  };

  if (dismissed || isStandalone || !visible || !installPrompt) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[90%] max-w-md -translate-x-1/2 animate-fade-up">
      <div className="relative flex items-center gap-4 rounded-2xl border border-border bg-card p-4 shadow-2xl">
        <button
          onClick={() => setDismissed(true)}
          className="absolute right-2 top-2 rounded-full p-1 transition-colors hover:bg-muted"
          aria-label="Close install popup"
        >
          <X className="h-4 w-4 text-muted-foreground" />
        </button>

        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl gradient-bg">
          <Download className="h-6 w-6 text-primary-foreground" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Install LinkedBot</p>
          <p className="mb-2 text-xs text-muted-foreground">Get quick access from your home screen</p>
          <Button variant="gradient" size="sm" className="w-full gap-1.5" onClick={handleInstall}>
            <Download className="h-3.5 w-3.5" />
            Install Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPopup;
