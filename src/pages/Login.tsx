import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, ArrowLeft, Loader2, Mail, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const Login = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from('user_profiles_safe')
          .select('onboarding_completed')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profile?.onboarding_completed) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      }
      setCheckingAuth(false);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const { data: profile } = await supabase
          .from('user_profiles_safe')
          .select('onboarding_completed')
          .eq('user_id', session.user.id)
          .maybeSingle();

        if (profile?.onboarding_completed) {
          navigate("/dashboard");
        } else {
          navigate("/onboarding");
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast({
        title: "Missing fields",
        description: "Please enter your email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      // Initialize user in extension with access token
      if (data.session?.user && data.session.access_token) {
        initializeUserInExtension(data.session.user.id, data.session.user.email, data.session.access_token);
      }
    } catch (error) {
      console.error('Login error:', error);
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Invalid email or password",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const initializeUserInExtension = (userId: string, email: string | undefined, accessToken?: string) => {
    const windowWithBridge = window as any;
    if (typeof windowWithBridge.LinkedBotBridge !== 'undefined' && typeof windowWithBridge.LinkedBotBridge.setCurrentUser === 'function') {
      windowWithBridge.LinkedBotBridge.setCurrentUser(userId);
    }
    if (accessToken) {
      window.postMessage({ type: 'SET_AUTH', userId, accessToken }, '*');
    }
    window.postMessage({ type: 'INITIALIZE_USER', userId, email: email || null }, '*');
    window.postMessage({ type: 'SET_CURRENT_USER', userId }, '*');
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left side - Decorative */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero-bg" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.1)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.1)_1px,transparent_1px)] bg-[size:4rem_4rem]" />
        
        <motion.div
          className="absolute top-1/4 left-1/4 w-20 h-20 bg-primary-foreground/20 rounded-2xl backdrop-blur-sm"
          animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }}
          transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute bottom-1/3 right-1/4 w-16 h-16 bg-primary-foreground/20 rounded-full backdrop-blur-sm"
          animate={{ y: [0, 20, 0], rotate: [0, -5, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-1/2 right-1/3 w-12 h-12 bg-primary-foreground/20 rounded-lg backdrop-blur-sm"
          animate={{ y: [0, 15, 0], rotate: [0, 10, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <div className="relative z-10 flex flex-col justify-center items-center w-full px-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-primary-foreground/20 backdrop-blur-sm flex items-center justify-center mx-auto mb-8">
              <Bot className="w-12 h-12 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-primary-foreground mb-4">
              Welcome to LinkedBot
            </h1>
            <p className="text-xl text-primary-foreground/80 max-w-md">
              Your AI-powered LinkedIn automation tool. Create, schedule, and post engaging content effortlessly.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="w-full lg:w-1/2 flex flex-col">
        <div className="p-6">
          <Button variant="ghost" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Button>
        </div>

        <div className="flex-1 flex items-center justify-center px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-md"
          >
            {/* Mobile logo */}
            <div className="lg:hidden flex items-center gap-2 justify-center mb-8">
              <div className="w-12 h-12 rounded-xl gradient-bg flex items-center justify-center">
                <Bot className="w-7 h-7 text-primary-foreground" />
              </div>
              <span className="text-2xl font-bold">LinkedBot</span>
            </div>

            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Welcome back</h2>
              <p className="text-muted-foreground">Sign in to continue to LinkedBot</p>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="gradient"
                size="xl"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>

            {/* Sign up link — redirects to /signup with OTP flow */}
            <p className="text-center text-sm text-muted-foreground mt-6">
              Don't have an account?{" "}
              <button
                type="button"
                onClick={() => navigate("/signup")}
                className="text-primary hover:underline font-medium"
              >
                Sign up
              </button>
            </p>

            <p className="text-center text-xs text-muted-foreground mt-4">
              By continuing, you agree to LinkedBot's{" "}
              <a href="/terms" className="text-primary hover:underline">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="/privacy" className="text-primary hover:underline">
                Privacy Policy
              </a>
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default Login;
