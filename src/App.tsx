import { lazy, Suspense } from "react";
import { usePageViewTracker } from "@/hooks/usePageViewTracker";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
// analytics-cron moved to DashboardGuard to avoid running on every page
import { Loader2 } from "lucide-react";

// Eagerly load critical pages
import Landing from "./pages/Landing";
const Login = lazy(() => import("./pages/Login"));
const Signup = lazy(() => import("./pages/Signup"));

// Lazy load all other pages
const Onboarding = lazy(() => import("./pages/Onboarding"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Agents = lazy(() => import("./pages/Agents"));
const AgentChat = lazy(() => import("./pages/AgentChat"));
const CalendarPage = lazy(() => import("./pages/CalendarPage"));
const CampaignsPage = lazy(() => import("./pages/CampaignsPage"));
const WritingDNAPage = lazy(() => import("./pages/WritingDNAPage"));
const Analytics = lazy(() => import("./pages/Analytics"));
const LinkedInConnection = lazy(() => import("./pages/LinkedInConnection"));
const LinkedInCallback = lazy(() => import("./pages/LinkedInCallback"));
const LinkedInProfile = lazy(() => import("./pages/LinkedInProfile"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const Admin = lazy(() => import("./pages/Admin"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));
const AdminCoupons = lazy(() => import("./pages/admin/AdminCoupons"));
const AdminPayments = lazy(() => import("./pages/admin/AdminPayments"));
const AdminLogin = lazy(() => import("./pages/admin/AdminLogin"));
const AdminManagement = lazy(() => import("./pages/admin/AdminManagement"));
const AdminAPIKeys = lazy(() => import("./pages/admin/AdminAPIKeys"));
const AdminActivity = lazy(() => import("./pages/admin/AdminActivity"));
const AdminSupportChat = lazy(() => import("./pages/admin/AdminSupportChat"));
const AdminVisitors = lazy(() => import("./pages/admin/AdminVisitors"));
const NotFound = lazy(() => import("./pages/NotFound"));
const PaymentSuccess = lazy(() => import("./pages/PaymentSuccess"));
const FeaturesPage = lazy(() => import("./pages/FeaturesPage"));
const HowItWorks = lazy(() => import("./pages/HowItWorks"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const PrivacyPolicy = lazy(() => import("./pages/legal/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./pages/legal/TermsOfService"));
const CookiePolicy = lazy(() => import("./pages/legal/CookiePolicy"));
const GDPR = lazy(() => import("./pages/legal/GDPR"));
const Documentation = lazy(() => import("./pages/resources/Documentation"));
const Blog = lazy(() => import("./pages/resources/Blog"));
const HelpCenter = lazy(() => import("./pages/resources/HelpCenter"));
const Community = lazy(() => import("./pages/resources/Community"));
const API = lazy(() => import("./pages/product/API"));

// Lazy-loaded AdminRoute wrapper
const AdminRoute = lazy(() => import("./components/admin/AdminRoute"));
const DashboardGuard = lazy(() => import("./components/dashboard/DashboardGuard"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes — prevent refetches on page switch
      gcTime: 10 * 60 * 1000, // 10 minutes cache
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

// Page view tracker must be inside BrowserRouter
const PageViewTracker = () => {
  usePageViewTracker();
  return null;
};

// Inner component that uses hooks
const AppContent = () => {
  return (
    <>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <PageViewTracker />
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/onboarding" element={<Onboarding />} />
            
            {/* Dashboard routes: DashboardGuard runs ONCE as layout route */}
            <Route path="/dashboard" element={<DashboardGuard />}>
              <Route index element={<Dashboard />} />
              <Route path="agents" element={<Agents />} />
              <Route path="agents/chat" element={<AgentChat />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="campaigns" element={<CampaignsPage />} />
              <Route path="writing-dna" element={<WritingDNAPage />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="linkedin" element={<LinkedInConnection />} />
              <Route path="profile" element={<LinkedInProfile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="billing" element={<Billing />} />
            </Route>

            {/* LinkedIn OAuth callback */}
            <Route path="/auth/linkedin/callback" element={<LinkedInCallback />} />
            {/* Admin Login - public */}
            <Route path="/admin/login" element={<AdminLogin />} />
            {/* Protected Admin Routes */}
            <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
            <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
            <Route path="/admin/notifications" element={<AdminRoute><AdminNotifications /></AdminRoute>} />
            <Route path="/admin/analytics" element={<AdminRoute><AdminAnalytics /></AdminRoute>} />
            <Route path="/admin/coupons" element={<AdminRoute><AdminCoupons /></AdminRoute>} />
            <Route path="/admin/payments" element={<AdminRoute><AdminPayments /></AdminRoute>} />
            <Route path="/admin/settings" element={<AdminRoute><AdminSettings /></AdminRoute>} />
            <Route path="/admin/management" element={<AdminRoute requireSuperAdmin><AdminManagement /></AdminRoute>} />
            <Route path="/admin/api-keys" element={<AdminRoute requireSuperAdmin><AdminAPIKeys /></AdminRoute>} />
            <Route path="/admin/activity" element={<AdminRoute><AdminActivity /></AdminRoute>} />
            <Route path="/admin/support" element={<AdminRoute><AdminSupportChat /></AdminRoute>} />
            <Route path="/admin/visitors" element={<AdminRoute><AdminVisitors /></AdminRoute>} />
            {/* Public pages */}
            <Route path="/features" element={<FeaturesPage />} />
            <Route path="/how-it-works" element={<HowItWorks />} />
            <Route path="/pricing" element={<PricingPage />} />
            {/* Legal pages */}
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/cookies" element={<CookiePolicy />} />
            <Route path="/gdpr" element={<GDPR />} />
            {/* Resource pages */}
            <Route path="/docs" element={<Documentation />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/resources/help" element={<HelpCenter />} />
            <Route path="/community" element={<Community />} />
            {/* Product pages */}
            <Route path="/api" element={<API />} />
            <Route path="/payment-success" element={<PaymentSuccess />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AppContent />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
