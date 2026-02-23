import { useState, useEffect, useCallback } from "react";
// framer-motion removed from layout for faster load
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  Bot,
  LayoutDashboard,
  Calendar,
  BarChart3,
  Linkedin,
  Settings,
  CreditCard,
  LogOut,
  Menu,
  X,
  ChevronDown,
  User,
} from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useDashboardProfile } from "@/contexts/DashboardContext";
import { supabase } from "@/integrations/supabase/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Calendar, label: "Calendar", path: "/dashboard/calendar" },
  { icon: Bot, label: "Agents", path: "/dashboard/agents" },
  { icon: BarChart3, label: "Analytics", path: "/dashboard/analytics" },
  { icon: Linkedin, label: "LinkedIn Connection", path: "/dashboard/linkedin" },
  { icon: Settings, label: "Settings", path: "/dashboard/settings" },
  { icon: CreditCard, label: "Billing", path: "/dashboard/billing" },
];

// Route-to-import map for prefetching on hover
const routeImports: Record<string, () => Promise<unknown>> = {
  "/dashboard": () => import("@/pages/Dashboard"),
  "/dashboard/calendar": () => import("@/pages/CalendarPage"),
  "/dashboard/agents": () => import("@/pages/Agents"),
  "/dashboard/analytics": () => import("@/pages/Analytics"),
  "/dashboard/linkedin": () => import("@/pages/LinkedInConnection"),
  "/dashboard/settings": () => import("@/pages/Settings"),
  "/dashboard/billing": () => import("@/pages/Billing"),
};

const prefetchedRoutes = new Set<string>();

const DashboardLayout = ({ children }: DashboardLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, isLoading } = useDashboardProfile();

  // Prefetch route chunk on hover so navigation is instant
  const prefetchRoute = useCallback((path: string) => {
    if (prefetchedRoutes.has(path) || location.pathname === path) return;
    prefetchedRoutes.add(path);
    const importFn = routeImports[path];
    if (importFn) {
      importFn().catch(() => {
        // Silent fail — will load normally on click
        prefetchedRoutes.delete(path);
      });
    }
  }, [location.pathname]);

  // Prefetch adjacent routes after idle to make navigation instant
  useEffect(() => {
    const timer = setTimeout(() => {
      Object.keys(routeImports).forEach(path => prefetchRoute(path));
    }, 2000); // Wait 2s after page load, then prefetch all dashboard routes
    return () => clearTimeout(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Session sync is now handled globally by useExtensionAuth in App.tsx

  // Get user initials for avatar
  const getInitials = (name: string | null | undefined) => {
    if (!name) return "U";
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  // Get plan display name
  const getPlanName = (plan: string | null | undefined) => {
    if (!plan) return "Free Plan";
    return `${plan.charAt(0).toUpperCase()}${plan.slice(1)} Plan`;
  };

  const handleLogout = async () => {
    console.log('🔒 Logout: starting');
    
    // Clear all auth data from storage first
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith('sb-') || key.includes('supabase') || key === 'token' || key === 'user')) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
    sessionStorage.clear();
    console.log('🔒 Logout: storage cleared');

    // Try Supabase signOut (non-blocking)
    try {
      await supabase.auth.signOut({ scope: 'local' });
      console.log('🔒 Logout: supabase signOut done');
    } catch (e) {
      console.error('🔒 Logout: signOut error (continuing):', e);
    }

    // Force redirect
    console.log('🔒 Logout: redirecting to /login');
    window.location.replace("/login");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-sm z-40 lg:hidden animate-in fade-in duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-sidebar text-sidebar-foreground transform transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--gradient-sidebar)" }}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-sidebar-border">
            <div 
              className="flex items-center gap-3 cursor-pointer"
              onClick={() => {
                if (location.pathname === '/dashboard') {
                  // Soft refresh - reload the page data
                  window.location.reload();
                } else {
                  window.location.href = '/dashboard';
                }
              }}
            >
              <div className="w-10 h-10 rounded-xl gradient-bg flex items-center justify-center">
                <Bot className="w-6 h-6 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold">LinkedBot</span>
            </div>
            <button
              className="ml-auto lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto scrollbar-hide">
            {navItems.map((item) => {
              const isActive = location.pathname === item.path;
              return (
              <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                  onMouseEnter={() => prefetchRoute(item.path)}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* User section */}
          <div className="p-4 border-t border-sidebar-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-3 rounded-xl hover:bg-sidebar-accent transition-colors">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src="" />
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {isLoading ? "..." : getInitials(profile?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">
                      {isLoading ? "Loading..." : (profile?.name || "User")}
                    </p>
                    <p className="text-xs text-sidebar-foreground/60">
                      {getPlanName(profile?.subscription_plan)}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-sidebar-foreground/60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/dashboard/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/dashboard/settings")}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Logout button outside dropdown to avoid Radix event issues */}
            <button
              type="button"
              onClick={handleLogout}
              className="flex items-center gap-2 w-full mt-2 px-4 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              Log out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-xl border-b border-border">
          <div className="flex items-center justify-between px-6 h-16">
            <button
              className="lg:hidden p-2 -ml-2"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="w-6 h-6" />
            </button>

            <div className="flex-1" />

            <div className="flex items-center gap-4">
              <NotificationBell />
              <div className="lg:hidden">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                    {getInitials(profile?.name)}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
