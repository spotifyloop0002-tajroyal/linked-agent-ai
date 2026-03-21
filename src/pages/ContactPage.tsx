import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, MapPin, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import SEOHead from "@/components/SEOHead";

const ContactPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    // Simulate send — swap for real edge function later
    await new Promise((r) => setTimeout(r, 1200));
    setLoading(false);
    toast.success("Message sent! We'll get back to you within 24 hours.");
    (e.target as HTMLFormElement).reset();
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        title="Contact LinkedBot – Get in Touch"
        description="Have questions about LinkedBot? Contact our team for support, partnerships, or general inquiries. We typically respond within 24 hours."
        canonical="https://www.linkedbot.online/contact"
        keywords="contact LinkedBot, LinkedBot support, LinkedIn automation help, LinkedBot customer service"
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
                Contact Us
              </span>
              <h1 className="text-4xl md:text-6xl font-bold mt-4 mb-6">
                We'd Love to{" "}
                <span className="gradient-text">Hear From You</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Whether you have a question about features, pricing, or anything
                else — our team is ready to answer.
              </p>
            </motion.div>
          </div>
        </section>

        {/* Info cards + form */}
        <section className="py-16">
          <div className="container px-4">
            <div className="grid lg:grid-cols-5 gap-12 max-w-6xl mx-auto">
              {/* Info cards */}
              <div className="lg:col-span-2 space-y-6">
                {[
                  {
                    icon: Mail,
                    title: "Email Us",
                    text: "team@linkedbot.online",
                    sub: "We respond within 24 hours",
                  },
                  {
                    icon: MessageSquare,
                    title: "Live Chat",
                    text: "Available inside your dashboard",
                    sub: "Mon–Sat, 10 AM – 7 PM IST",
                  },
                  {
                    icon: MapPin,
                    title: "Office",
                    text: "Bhatnagar Digital Labs",
                    sub: "India",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.4, delay: i * 0.1 }}
                    className="flex gap-4 p-5 rounded-2xl bg-card border border-border shadow-lg"
                  >
                    <div className="w-12 h-12 shrink-0 rounded-xl gradient-bg flex items-center justify-center">
                      <item.icon className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      <p className="text-sm text-foreground">{item.text}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>
                    </div>
                  </motion.div>
                ))}

                <div className="pt-4">
                  <Button variant="outline" className="gap-2" onClick={() => navigate("/help")}>
                    Visit Help Center <ArrowRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Form */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="lg:col-span-3"
              >
                <form
                  onSubmit={handleSubmit}
                  className="space-y-5 p-6 md:p-8 rounded-2xl bg-card border border-border shadow-lg"
                >
                  <h2 className="text-2xl font-bold mb-2">Send a Message</h2>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" placeholder="Your name" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" placeholder="you@example.com" required />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" placeholder="How can we help?" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" rows={5} placeholder="Tell us more…" required />
                  </div>
                  <Button type="submit" variant="gradient" size="lg" disabled={loading} className="w-full">
                    {loading ? "Sending…" : "Send Message"}
                  </Button>
                </form>
              </motion.div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ContactPage;
