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

  // Show popup after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, []);

  const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

  const handleInstall = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") {
        toast.success("App installed successfully!");
      }
      setInstallPrompt(null);
      setDismissed(true);
    } else {
      // iOS / unsupported — show toast with instructions
      toast.info("On iPhone: tap Share ⬆️ → Add to Home Screen. On Android: open in Chrome → tap ⋮ → Install app.", {
        duration: 8000,
      });
    }
  };

  if (dismissed || isStandalone || !visible) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-up w-[90%] max-w-md">
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl p-4 flex items-center gap-4">
        {/* Close button */}
        <button
          onClick={() => setDismissed(true)}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4 text-muted-foreground" />
        </button>

        {/* Icon */}
        <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center shrink-0">
          <Download className="w-6 h-6 text-primary-foreground" />
        </div>

        {/* Text + Button */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-foreground">Install LinkedBot</p>
          <p className="text-xs text-muted-foreground mb-2">Get quick access from your home screen</p>
          <Button variant="gradient" size="sm" className="gap-1.5 w-full" onClick={handleInstall}>
            <Download className="w-3.5 h-3.5" />
            Install Now
          </Button>
        </div>
      </div>
    </div>
  );
};

export default InstallPopup;
