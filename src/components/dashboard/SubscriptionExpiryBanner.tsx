import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Clock, X } from "lucide-react";
import { useDashboardProfile } from "@/contexts/DashboardContext";
import { useState } from "react";

const SubscriptionExpiryBanner = () => {
  const { profile } = useDashboardProfile();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  const bannerState = useMemo(() => {
    if (!profile) return null;
    
    const plan = profile.subscription_plan?.toLowerCase();
    if (!plan || plan === "free") return null;
    
    const expiresAt = profile.subscription_expires_at;
    if (!expiresAt) return null;

    const expiryDate = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft <= 0) {
      return { type: "expired" as const, daysLeft: 0, plan };
    }
    if (daysLeft <= 3) {
      return { type: "urgent" as const, daysLeft, plan };
    }
    if (daysLeft <= 7) {
      return { type: "warning" as const, daysLeft, plan };
    }
    return null;
  }, [profile]);

  if (!bannerState || dismissed) return null;

  const planName = bannerState.plan.charAt(0).toUpperCase() + bannerState.plan.slice(1);

  if (bannerState.type === "expired") {
    return (
      <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0" />
          <p className="text-sm text-destructive font-medium">
            Your {planName} plan has expired. You're now on the Free plan.{" "}
            <button
              onClick={() => navigate("/dashboard/billing")}
              className="underline font-semibold hover:opacity-80"
            >
              Renew now
            </button>
          </p>
        </div>
        <button onClick={() => setDismissed(true)} className="text-destructive/60 hover:text-destructive">
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  const isUrgent = bannerState.type === "urgent";

  return (
    <div className={`${isUrgent ? "bg-orange-500/10 border-orange-500/30" : "bg-yellow-500/10 border-yellow-500/30"} border rounded-lg px-4 py-3 flex items-center justify-between gap-3`}>
      <div className="flex items-center gap-3">
        <Clock className={`w-5 h-5 flex-shrink-0 ${isUrgent ? "text-orange-500" : "text-yellow-600"}`} />
        <p className={`text-sm font-medium ${isUrgent ? "text-orange-700 dark:text-orange-400" : "text-yellow-700 dark:text-yellow-400"}`}>
          Your {planName} plan expires in {bannerState.daysLeft} day{bannerState.daysLeft !== 1 ? "s" : ""}.{" "}
          <button
            onClick={() => navigate("/dashboard/billing")}
            className="underline font-semibold hover:opacity-80"
          >
            Renew to continue posting
          </button>
        </p>
      </div>
      <button onClick={() => setDismissed(true)} className={`${isUrgent ? "text-orange-500/60 hover:text-orange-500" : "text-yellow-600/60 hover:text-yellow-600"}`}>
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default SubscriptionExpiryBanner;
