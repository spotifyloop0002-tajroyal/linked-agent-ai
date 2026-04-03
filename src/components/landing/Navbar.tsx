import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Menu, X, Download, Smartphone } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

interface NavbarProps {
  isLoggedIn?: boolean;
}

const APP_URL = "https://linked-agent-ai.lovable.app";

const Navbar = ({ isLoggedIn: isLoggedInProp }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(isLoggedInProp !== undefined);
  const [localLoggedIn, setLocalLoggedIn] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showFallbackDialog, setShowFallbackDialog] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Capture the native install prompt
  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  // Auth check
  useEffect(() => {
    if (isLoggedInProp !== undefined) return;
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setLocalLoggedIn(!!session);
      setAuthChecked(true);
    };
    checkSession();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setLocalLoggedIn(!!session);
    });
    return () => subscription.unsubscribe();
  }, [isLoggedInProp]);

  const isLoggedIn = isLoggedInProp !== undefined ? isLoggedInProp : localLoggedIn;

  const handleGetApp = async () => {
    if (installPrompt) {
      // Native install prompt available — use it directly
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") {
        toast.success("App installed successfully!");
      }
      setInstallPrompt(null);
    } else {
      // Fallback: show manual instructions
      setShowFallbackDialog(true);
    }
  };

  const navLinks = [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "How It Works", href: "/how-it-works" },
    { label: "About", href: "/about" },
    { label: "Contact", href: "/contact" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = (href: string) => {
    navigate(href);
    setMobileMenuOpen(false);
  };

  const isStandalone = typeof window !== "undefined" && window.matchMedia("(display-mode: standalone)").matches;

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-xl border-b border-border/50">
        <div className="container px-4">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div 
              className="flex items-center gap-2 cursor-pointer" 
              onClick={() => navigate("/")}
            >
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">LinkedBot</span>
            </div>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-8">
              {navLinks.map((link) => (
                <button
                  key={link.label}
                  onClick={() => handleNavClick(link.href)}
                  className={`font-medium transition-colors ${
                    isActive(link.href) 
                      ? "text-primary" 
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Desktop CTA */}
            <div className="hidden md:flex items-center gap-3">
              {isLoggedIn ? (
                <Button variant="gradient" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate("/login")}>
                    Log In
                  </Button>
                  <Button variant="gradient" onClick={() => navigate("/signup")}>
                    Get Started
                  </Button>
                </>
              )}
            </div>

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        <div
          className={`md:hidden bg-background border-b border-border overflow-hidden transition-all duration-300 ease-in-out ${
            mobileMenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          <div className="container px-4 py-4 space-y-4">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => handleNavClick(link.href)}
                className={`block w-full text-left py-2 font-medium transition-colors ${
                  isActive(link.href) 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {link.label}
              </button>
            ))}
            <div className="flex flex-col gap-2 pt-4 border-t border-border">
              {!isStandalone && (
                <Button variant="outline" className="gap-2 w-full" onClick={handleGetApp}>
                  <Download className="w-4 h-4" />
                  Get App
                </Button>
              )}
              {isLoggedIn ? (
                <Button variant="gradient" onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
              ) : (
                <>
                  <Button variant="ghost" onClick={() => navigate("/login")}>
                    Log In
                  </Button>
                  <Button variant="gradient" onClick={() => navigate("/signup")}>
                    Get Started
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Fallback dialog for browsers without native install (Safari/iOS) */}
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
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  navigator.clipboard.writeText(APP_URL);
                  toast.success("Link copied!");
                }}
              >
                Copy
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default Navbar;
