import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Mail, Loader2, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CustomPlanDialog = () => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.phone) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("custom_plan_requests" as any).insert([{
        name: form.name,
        email: form.email,
        phone: form.phone,
        company: form.company || null,
        message: form.message || null,
      }]);
      if (error) throw error;
      setSubmitted(true);
      toast({ title: "✅ Request submitted!", description: "Our team will contact you soon." });
    } catch (err: any) {
      toast({ title: "Submission failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset on close after brief delay
      setTimeout(() => {
        setSubmitted(false);
        setForm({ name: "", email: "", phone: "", company: "", message: "" });
      }, 300);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className="w-full">
          <Mail className="w-4 h-4 mr-2" />
          Contact Us
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{submitted ? "Request Sent!" : "Request Custom Plan"}</DialogTitle>
        </DialogHeader>
        {submitted ? (
          <div className="text-center py-6">
            <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center mx-auto mb-4">
              <Check className="w-7 h-7 text-success" />
            </div>
            <p className="text-muted-foreground mb-2">Your request has been sent.</p>
            <p className="text-sm text-muted-foreground">Our team will contact you soon.</p>
            <p className="text-xs text-muted-foreground mt-3">
              Email: <a href="mailto:Team@linkedbot.online" className="text-primary hover:underline">Team@linkedbot.online</a>
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3">
            <Input name="name" placeholder="Full Name *" value={form.name} onChange={handleChange} required />
            <Input name="email" type="email" placeholder="Email Address *" value={form.email} onChange={handleChange} required />
            <Input name="phone" type="tel" placeholder="Phone Number *" value={form.phone} onChange={handleChange} required />
            <Input name="company" placeholder="Company Name (optional)" value={form.company} onChange={handleChange} />
            <Textarea name="message" placeholder="Tell us your requirements" value={form.message} onChange={handleChange} rows={3} />
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Request Custom Plan
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Or email us at <a href="mailto:Team@linkedbot.online" className="text-primary hover:underline">Team@linkedbot.online</a>
            </p>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default CustomPlanDialog;
