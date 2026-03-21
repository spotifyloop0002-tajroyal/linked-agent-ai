import { motion } from "framer-motion";
import { Target, Users, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";

const AboutPage = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="About LinkedBot – AI LinkedIn Automation Platform"
        description="Learn about LinkedBot, the AI-powered LinkedIn automation tool that helps professionals create, schedule, and publish engaging content effortlessly."
        canonical="https://www.linkedbot.online/about"
        keywords="about LinkedBot, LinkedIn automation platform, AI LinkedIn tool, LinkedIn content automation company, LinkedIn growth platform"
      />
      <Navbar />

      <main className="pt-24">
        {/* Hero */}
        <section className="py-16 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
          <div className="container relative z-10 px-4 text-center max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                About Us
              </span>
              <h1 className="text-4xl md:text-6xl font-bold mt-4 mb-6">
                We're Building the Future of{" "}
                <span className="gradient-text">LinkedIn Growth</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed">
                LinkedBot is an AI-powered SaaS platform that helps professionals and
                businesses automate their LinkedIn content creation, scheduling, and
                publishing — saving hours every week while growing engagement.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Mission Cards */}
        <section className="py-16">
          <div className="container px-4">
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {[
                {
                  icon: Target,
                  title: "Our Mission",
                  text: "Empower every professional to build a powerful LinkedIn presence without spending hours on content creation.",
                },
                {
                  icon: Users,
                  title: "Who We Serve",
                  text: "Founders, creators, marketers, students, and professionals who want consistent, high-quality LinkedIn content on autopilot.",
                },
                {
                  icon: Zap,
                  title: "How It Works",
                  text: "Our AI agents research trending topics, generate posts matching your voice, and publish them at the optimal time.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: i * 0.1 }}
                  className="p-6 rounded-2xl bg-card border border-border shadow-lg text-center"
                >
                  <div className="w-14 h-14 rounded-xl gradient-bg flex items-center justify-center mx-auto mb-5">
                    <item.icon className="w-7 h-7 text-primary-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold mb-3">{item.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{item.text}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* Our Story */}
        <section className="py-20 bg-muted/30">
          <div className="container px-4 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <div className="text-center mb-12">
                <span className="text-primary font-semibold text-sm uppercase tracking-wider">
                  Our Story
                </span>
                <h2 className="text-3xl md:text-4xl font-bold mt-3">
                  Why We Built LinkedBot
                </h2>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {/* Left column - The Problem */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-lg space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 text-destructive text-sm font-medium">
                    😩 The Problem
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    It started with a frustration most professionals know too well.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    You know LinkedIn matters. You know posting consistently can change your
                    career, attract clients, and build real authority. But every time you sit
                    down to write — <span className="text-foreground font-medium">nothing comes out.</span>
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Or worse, you spend an hour crafting the "perfect post" and it gets 12 views.
                    Staring at a blank screen, overthinking every word, posting once a month,
                    and wondering why nothing was working.
                  </p>
                </div>

                {/* Right column - The Solution */}
                <div className="p-6 rounded-2xl bg-card border border-border shadow-lg space-y-4">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                    💡 The Solution
                  </div>
                  <p className="text-muted-foreground leading-relaxed">
                    So we asked a simple question:{" "}
                    <span className="text-foreground font-medium">
                      What if AI could handle the hard part — and you could just show up as yourself?
                    </span>
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    That question became LinkedBot. We built an AI engine that learns{" "}
                    <em>your</em> voice, studies trending topics in <em>your</em> industry,
                    writes posts that sound like <em>you</em> — not a robot — then schedules
                    and publishes them at the best possible time.
                  </p>
                  <p className="text-muted-foreground leading-relaxed">
                    Today, LinkedBot helps founders, creators, students, and professionals
                    save <span className="text-foreground font-semibold">10+ hours every week</span> while
                    growing engagement by up to <span className="text-foreground font-semibold">3×</span>.
                  </p>
                </div>
              </div>

              {/* Mission statement */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.2 }}
                className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 border border-primary/20 text-center"
              >
                <p className="text-lg text-foreground font-medium leading-relaxed">
                  🎯 Our mission is simple: make personal branding effortless — so you can
                  focus on doing great work while your LinkedIn grows on autopilot.
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Meet the Founder */}
        <section className="py-16">
          <div className="container px-4 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-8 text-center">Meet the Founder</h2>
              <div className="p-8 rounded-2xl bg-card border border-border shadow-lg">
                <div className="space-y-5 text-muted-foreground leading-relaxed text-[1.05rem]">
                  <p className="text-foreground text-xl font-bold">
                    Hi, I'm Aryan Bhatnagar 👋
                  </p>
                  <p className="text-primary font-medium text-sm">
                    Founder of LinkedBot
                  </p>
                  <p>
                    I built LinkedBot because I lived the exact problem it solves.
                  </p>
                  <p>
                    I wanted to grow on LinkedIn — share my ideas, connect with people,
                    build a personal brand. But I kept falling into the same trap: I'd post
                    for a week, get busy, disappear for a month, and start over. Every.
                    Single. Time.
                  </p>
                  <p>
                    I tried schedulers, templates, even ghostwriters. Nothing felt like
                    <em> me</em>. The content was either too generic or took too long to
                    create. I knew there had to be a better way.
                  </p>
                  <p>
                    So I started building. What began as a simple AI writing tool turned
                    into a full platform — one that learns your voice, researches what's
                    trending, writes posts that actually sound human, and publishes them
                    while you sleep.
                  </p>
                  <p>
                    LinkedBot isn't just another AI tool. It's the assistant I wish I had
                    when I was struggling to stay consistent on LinkedIn.
                  </p>
                  <p className="text-foreground font-medium">
                    We're just getting started — and I'm building this in public, one
                    feature at a time. If you believe in the vision, I'd love for you to
                    join the ride. 🚀
                  </p>
                  <p className="text-sm text-muted-foreground/70 pt-2">
                    — Aryan Bhatnagar, Founder of LinkedBot
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="container px-4 text-center max-w-2xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl md:text-4xl font-bold mb-6">
                Ready to Grow Your LinkedIn?
              </h2>
              <p className="text-muted-foreground mb-8">
                Join thousands of professionals already using LinkedBot to automate
                their LinkedIn presence.
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Button variant="gradient" size="lg" onClick={() => navigate("/signup")} className="gap-2">
                  Get Started Free <ArrowRight className="w-4 h-4" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate("/features")}>
                  Explore Features
                </Button>
              </div>
            </motion.div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default AboutPage;
