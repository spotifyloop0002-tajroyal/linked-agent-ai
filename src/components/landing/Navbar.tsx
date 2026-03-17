import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Menu, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface NavbarProps {
  isLoggedIn?: boolean;
}

const Navbar = ({ isLoggedIn: isLoggedInProp }: NavbarProps) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [authChecked, setAuthChecked] = useState(isLoggedInProp !== undefined);
  const [localLoggedIn, setLocalLoggedIn] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Only run auth check if prop not provided (standalone usage)
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

  const navLinks = [
    { label: "Features", href: "/features" },
    { label: "Pricing", href: "/pricing" },
    { label: "How It Works", href: "/how-it-works" },
  ];

  const isActive = (path: string) => location.pathname === path;

  const handleNavClick = (href: string) => {
    navigate(href);
    setMobileMenuOpen(false);
  };

  return (
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

          {/* Desktop CTA — session-aware */}
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
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden bg-background border-b border-border overflow-hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
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
  );
};

export default Navbar;
