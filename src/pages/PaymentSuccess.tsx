import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePageTitle } from "@/hooks/usePageTitle";

const PaymentSuccess = () => {
  usePageTitle("Payment Successful");
  const navigate = useNavigate();

  useEffect(() => {
    // Auto-redirect after 5 seconds
    const timer = setTimeout(() => navigate("/dashboard/billing"), 5000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="max-w-md w-full text-center space-y-6 animate-fade-up">
        <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
          <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold">Payment Successful! 🎉</h1>
        <p className="text-muted-foreground">
          Your subscription has been activated. You now have access to all premium features.
        </p>
        <Button onClick={() => navigate("/dashboard/billing")} className="gap-2">
          Go to Dashboard <ArrowRight className="w-4 h-4" />
        </Button>
        <p className="text-xs text-muted-foreground">Redirecting automatically in 5 seconds...</p>
      </div>
    </div>
  );
};

export default PaymentSuccess;
