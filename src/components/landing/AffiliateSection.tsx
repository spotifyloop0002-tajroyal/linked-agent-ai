import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Rocket, Users, DollarSign, Megaphone, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const benefits = [
  { icon: DollarSign, text: "Earn commission on every successful referral" },
  { icon: Megaphone, text: "Promote a powerful AI LinkedIn automation tool" },
  { icon: Check, text: "No upfront cost to join" },
  { icon: Users, text: "Perfect for creators, marketers, and agencies" },
];

const AffiliateSection = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    city: "",
    country: "",
    instagram_url: "",
    linkedin_url: "",
    reason: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone || !form.city || !form.country) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("affiliate_applications" as any).insert([{
        name: form.name,
        email: form.email,
        phone: form.phone,
        city: form.city,
        country: form.country,
        instagram_url: form.instagram_url || null,
        linkedin_url: form.linkedin_url || null,
        reason: form.reason || null,
      }]);
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "✅ Application submitted!", description: "Our team will review it and contact you soon." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section id="affiliate" className="py-16 md:py-24 relative overflow-hidden">
        <div className="container px-4 max-w-3xl mx-auto text-center">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-6">
            <Check className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-2xl md:text-3xl font-bold mb-4">Application Submitted! 🎉</h2>
          <p className="text-muted-foreground">Our team will review your application and contact you soon.</p>
          <p className="text-sm text-muted-foreground mt-2">
            Questions? Email us at{" "}
            <a href="mailto:Team@linkedbot.online" className="text-primary hover:underline">Team@linkedbot.online</a>
          </p>
        </div>
      </section>
    );
  }

  return (
    <section id="affiliate" className="py-16 md:py-24 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/30 to-background" />
      <div className="container relative z-10 px-4">
        <div className="text-center max-w-3xl mx-auto mb-10 md:mb-14">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">
            Partner With Us
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-5xl font-bold mt-3 mb-4">
            Join the LinkedBot Affiliate Program 🚀
          </h2>
          <p className="text-lg text-muted-foreground">
            Help creators and professionals automate their LinkedIn posting with LinkedBot and earn commission for every customer you bring.
            Anyone can join — creators, marketers, founders, or LinkedIn influencers.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
          {benefits.map((b, i) => (
            <Card key={i} className="border-border">
              <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                <b.icon className="w-8 h-8 text-primary" />
                <span className="text-sm font-medium">{b.text}</span>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="max-w-2xl mx-auto">
          <CardContent className="p-6 md:p-8">
            <h3 className="text-xl font-semibold mb-6 text-center">Apply for Affiliate Program</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input name="name" placeholder="Full Name *" value={form.name} onChange={handleChange} required />
                <Input name="email" type="email" placeholder="Email Address *" value={form.email} onChange={handleChange} required />
                <Input name="phone" type="tel" placeholder="Phone Number *" value={form.phone} onChange={handleChange} required />
                <Input name="city" placeholder="City *" value={form.city} onChange={handleChange} required />
                <Input name="country" placeholder="Country *" value={form.country} onChange={handleChange} required />
                <Input name="instagram_url" type="url" placeholder="Instagram Profile Link" value={form.instagram_url} onChange={handleChange} />
              </div>
              <Input name="linkedin_url" type="url" placeholder="LinkedIn Profile Link" value={form.linkedin_url} onChange={handleChange} />
              <Textarea name="reason" placeholder="Why do you want to join the LinkedBot Affiliate Program?" value={form.reason} onChange={handleChange} rows={3} />
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Rocket className="w-4 h-4 mr-2" />}
                Apply for Affiliate Program
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                By applying, you agree to the{" "}
                <a href="/affiliate-program" className="text-primary hover:underline">Affiliate Partner Agreement</a>.
                Contact: <a href="mailto:Team@linkedbot.online" className="text-primary hover:underline">Team@linkedbot.online</a>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default AffiliateSection;
