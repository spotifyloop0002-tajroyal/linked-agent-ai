import { forwardRef, useState, useEffect } from "react";
import { Bot, Linkedin, Twitter, Github, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const APP_URL = "https://linked-agent-ai.lovable.app";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const navigate = useNavigate();
  const [installPrompt, setInstallPrompt] = useState<any>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleGetApp = async () => {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") toast.success("App installed!");
      setInstallPrompt(null);
    } else {
      toast.info("On iPhone: tap Share ⬆️ → Add to Home Screen. On Android: open in Chrome and tap ⋮ → Install app.");
    }
  };

  const handleNavClick = (path: string) => {
    navigate(path);
    window.scrollTo(0, 0);
  };

  return (
    <footer ref={ref} className="bg-sidebar text-sidebar-foreground py-10 md:py-16">
      <div className="container px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12 mb-8 md:mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">LinkedBot</span>
            </div>
            <p className="text-sidebar-foreground/70 text-sm leading-relaxed mb-6">
              Your AI-powered LinkedIn automation tool. Create, schedule, and post engaging content effortlessly.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-accent/80 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-accent/80 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-sidebar-accent/80 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Product links */}
          <div>
            <h4 className="font-semibold mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li>
                <button onClick={() => handleNavClick("/features")} className="hover:text-sidebar-foreground transition-colors">
                  Features
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/pricing")} className="hover:text-sidebar-foreground transition-colors">
                  Pricing
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/how-it-works")} className="hover:text-sidebar-foreground transition-colors">
                  How It Works
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/about")} className="hover:text-sidebar-foreground transition-colors">
                  About
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/contact")} className="hover:text-sidebar-foreground transition-colors">
                  Contact
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/api")} className="hover:text-sidebar-foreground transition-colors">
                  API
                </button>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li>
                <button onClick={() => handleNavClick("/docs")} className="hover:text-sidebar-foreground transition-colors">
                  Documentation
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/blog")} className="hover:text-sidebar-foreground transition-colors">
                  Blog
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/help")} className="hover:text-sidebar-foreground transition-colors">
                  Help Center
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/community")} className="hover:text-sidebar-foreground transition-colors">
                  Community
                </button>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li>
                <button onClick={() => handleNavClick("/terms")} className="hover:text-sidebar-foreground transition-colors">
                  Terms & Conditions
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/privacy-policy")} className="hover:text-sidebar-foreground transition-colors">
                  Privacy Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/refund-policy")} className="hover:text-sidebar-foreground transition-colors">
                  Refund & Cancellation Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/cookie-policy")} className="hover:text-sidebar-foreground transition-colors">
                  Cookie Policy
                </button>
              </li>
              <li>
                <button onClick={() => handleNavClick("/affiliate-program")} className="hover:text-sidebar-foreground transition-colors">
                  Affiliate Program
                </button>
              </li>
            </ul>
          </div>
        </div>

        {/* Install App Banner */}
        <div className="py-8 border-t border-sidebar-border flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
              <Download className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <p className="font-semibold text-sm">Get LinkedBot on your phone</p>
              <p className="text-xs text-sidebar-foreground/60">Install the app for quick access anytime</p>
            </div>
          </div>
          <Button variant="gradient" size="lg" className="gap-2" onClick={handleGetApp}>
            <Download className="w-4 h-4" />
            Install App
          </Button>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-sidebar-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-sidebar-foreground/60">
            © {new Date().getFullYear()} Bhatnagar Digital Labs. All rights reserved.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-sidebar-foreground/50">
            <button onClick={() => handleNavClick("/terms")} className="hover:text-sidebar-foreground transition-colors">Terms & Conditions</button>
            <button onClick={() => handleNavClick("/privacy-policy")} className="hover:text-sidebar-foreground transition-colors">Privacy Policy</button>
            <button onClick={() => handleNavClick("/refund-policy")} className="hover:text-sidebar-foreground transition-colors">Refund & Cancellation Policy</button>
            <button onClick={() => handleNavClick("/cookie-policy")} className="hover:text-sidebar-foreground transition-colors">Cookie Policy</button>
            <button onClick={() => handleNavClick("/affiliate-program")} className="hover:text-sidebar-foreground transition-colors">Affiliate Program</button>
          </div>
        </div>

        {/* Fallback install dialog */}
        <Dialog open={showFallbackDialog} onOpenChange={setShowFallbackDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-primary" />
                Install LinkedBot
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">📱 Android (Chrome)</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Open the link below in Chrome</li>
                  <li>Tap <strong className="text-foreground">⋮ menu</strong> → <strong className="text-foreground">"Install app"</strong></li>
                </ol>
              </div>
              <div className="space-y-2">
                <h3 className="font-semibold text-foreground">🍎 iPhone (Safari)</h3>
                <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                  <li>Open the link below in Safari</li>
                  <li>Tap <strong className="text-foreground">Share ⬆️</strong> → <strong className="text-foreground">"Add to Home Screen"</strong></li>
                </ol>
              </div>
              <div className="rounded-lg bg-muted p-3 flex items-center justify-between gap-2">
                <code className="text-sm text-foreground break-all">{APP_URL}</code>
                <Button variant="secondary" size="sm" onClick={() => { navigator.clipboard.writeText(APP_URL); toast.success("Link copied!"); }}>
                  Copy
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
