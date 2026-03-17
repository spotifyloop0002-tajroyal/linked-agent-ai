import { motion } from "framer-motion";
import { Bot, Users, Target, Zap, ArrowRight } from "lucide-react";
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
        canonical="https://linkedbot.online/about"
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

        {/* Mission */}
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
                  text: "Entrepreneurs, marketers, agencies, and professionals who want consistent, high-quality LinkedIn content on autopilot.",
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

        {/* Story */}
        <section className="py-16 bg-muted/30">
          <div className="container px-4 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  LinkedBot was born from a simple frustration: creating consistent,
                  high-quality LinkedIn content is time-consuming and difficult to
                  sustain. We built an AI-powered solution that handles the heavy
                  lifting — research, writing, image generation, and publishing — so
                  you can focus on what matters most: growing your business.
                </p>
                <p>
                  Today, LinkedBot helps professionals across industries save over 10
                  hours per week on content creation while seeing up to 3× more
                  engagement on their posts. Our platform combines cutting-edge AI
                  models with smart scheduling and analytics to deliver real results.
                </p>
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
