import { Button } from "@/components/ui/button";
import { Bot, Sparkles, Calendar, BarChart3, Linkedin } from "lucide-react";
import { useNavigate } from "react-router-dom";
const dashboardPreview = "/images/dashboard-preview.webp";

const Hero = () => {
  const navigate = useNavigate();

  return (
    <section className="relative min-h-[90vh] md:min-h-screen flex items-center justify-center overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      
      {/* Floating orbs - CSS animation instead of framer-motion */}
      <div
        className="absolute top-20 left-10 md:left-20 w-48 md:w-72 h-48 md:h-72 bg-primary/20 rounded-full blur-3xl animate-float-slow"
      />
      <div
        className="absolute bottom-20 right-10 md:right-20 w-64 md:w-96 h-64 md:h-96 bg-secondary/20 rounded-full blur-3xl animate-float-slow-reverse"
      />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_110%)]" />

      <div className="container relative z-10 px-4 py-16 md:py-20 pt-20 md:pt-20">
        <div className="max-w-5xl mx-auto text-center">
          {/* Badge */}
          <div className="animate-fade-up inline-flex items-center gap-2 px-3 md:px-4 py-1.5 md:py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 md:mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-primary">AI-Powered LinkedIn Automation</span>
          </div>

          {/* Main heading */}
          <h1 className="animate-fade-up [animation-delay:100ms] text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-bold mb-4 md:mb-6 leading-tight">
            Your AI LinkedIn Intern
            <br />
            <span className="gradient-text">Post Smarter, Not Harder</span>
          </h1>

          {/* Subtitle */}
          <p className="animate-fade-up [animation-delay:200ms] text-base md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8 md:mb-10 px-2">
            LinkedBot learns your brand voice and automatically creates, schedules, 
            and posts engaging LinkedIn content. Like having a dedicated social media team, 
            powered by AI.
          </p>

          {/* CTA buttons */}
          <div className="animate-fade-up [animation-delay:300ms] flex flex-col sm:flex-row gap-3 justify-center mb-10 md:mb-16 px-4 sm:px-0">
            <Button 
              variant="gradient" 
              size="xl" 
              onClick={() => navigate("/signup")}
              className="gap-3"
            >
              <Sparkles className="w-5 h-5" />
              Get Started Free
            </Button>
            <Button 
              variant="outline" 
              size="xl" 
              onClick={() => navigate("/login")}
              className="gap-3"
            >
              Log In
            </Button>
          </div>

          {/* Feature highlights */}
          <div className="animate-fade-up [animation-delay:400ms] grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 max-w-3xl mx-auto">
            {[
              { icon: Bot, label: "AI Content Generation" },
              { icon: Calendar, label: "Smart Scheduling" },
              { icon: BarChart3, label: "Analytics Dashboard" },
              { icon: Linkedin, label: "LinkedIn API Posting" },
            ].map((feature, index) => (
              <div
                key={index}
                className="flex flex-col items-center gap-1.5 md:gap-2 p-3 md:p-4 rounded-xl bg-card/50 backdrop-blur-sm border border-border/50"
              >
                <feature.icon className="w-6 h-6 text-primary" />
                <span className="text-sm font-medium text-muted-foreground">{feature.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Dashboard preview mockup */}
        <div className="animate-fade-up [animation-delay:500ms] mt-12 md:mt-20 max-w-5xl mx-auto">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-3xl blur-2xl" />
            
            {/* Mock dashboard */}
            <div className="relative bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
              {/* Browser bar */}
              <div className="flex items-center gap-2 px-4 py-3 bg-muted/50 border-b border-border">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-destructive/60" />
                  <div className="w-3 h-3 rounded-full bg-warning/60" />
                  <div className="w-3 h-3 rounded-full bg-success/60" />
                </div>
                <div className="flex-1 flex justify-center">
                  <div className="px-4 py-1 bg-background rounded-md text-xs text-muted-foreground">
                    linkedbot4.lovable.app/dashboard
                  </div>
                </div>
              </div>
              
              {/* Dashboard image */}
              <img 
                src={dashboardPreview} 
                alt="LinkedBot Dashboard Preview showing analytics, scheduled posts, and engagement metrics"
                className="w-full h-auto"
                width={1280}
                height={720}
                fetchPriority="high"
                decoding="async"
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
