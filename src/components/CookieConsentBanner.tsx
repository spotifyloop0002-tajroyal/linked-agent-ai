import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Cookie, X } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";

const CookieConsentBanner = () => {
  const [visible, setVisible] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Only show on public pages, not dashboard or admin
  const isProtectedRoute = location.pathname.startsWith("/dashboard") || location.pathname.startsWith("/admin");

  useEffect(() => {
    if (isProtectedRoute) return;
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [isProtectedRoute]);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookie-consent", "rejected");
    setVisible(false);
  };

  const handleManage = () => {
    navigate("/cookie-policy");
    setVisible(false);
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          transition={{ type: "spring", damping: 25, stiffness: 200 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-5 md:p-6">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Cookie className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">We use cookies</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We use cookies to improve your experience and analyze traffic. By continuing to use Linkedbot, you agree to our{" "}
                  <button onClick={handleManage} className="text-primary hover:underline font-medium">Cookie Policy</button>.
                </p>
              </div>
              <button onClick={handleReject} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-wrap gap-3 mt-4 ml-14">
              <Button onClick={handleAccept} size="sm" variant="gradient">Accept</Button>
              <Button onClick={handleReject} size="sm" variant="outline">Reject</Button>
              <Button onClick={handleManage} size="sm" variant="ghost">Manage Preferences</Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CookieConsentBanner;
