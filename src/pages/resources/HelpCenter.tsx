import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import { Search, MessageCircle, Mail, FileQuestion, Copy, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { toast } from "sonner";

const faqs = [
  {
    question: "How do I connect my LinkedIn account?",
    answer: "Go to Dashboard → LinkedIn from the sidebar. Click 'Connect LinkedIn' and follow the OAuth authorization flow to securely link your account.",
  },
  {
    question: "Why is my automation not running?",
    answer: "Make sure your LinkedIn account is connected, the Chrome extension is installed and active, and you have scheduled posts in your queue. Check the Dashboard for any error alerts.",
  },
  {
    question: "How do I upgrade my subscription?",
    answer: "Navigate to Dashboard → Billing. Choose your preferred plan and complete the payment. Your new features will be available immediately.",
  },
  {
    question: "Why are analytics not updating?",
    answer: "Analytics sync every few hours via the Chrome extension. Make sure the extension is installed and you've visited LinkedIn recently. You can also manually refresh from the Analytics page.",
  },
  {
    question: "How do I install the Chrome extension?",
    answer: "Visit the Chrome Web Store, search for LinkedBot, and click 'Add to Chrome'. Then sign in with your LinkedBot account to link the extension.",
  },
  {
    question: "Is my LinkedIn account safe?",
    answer: "Yes! Our extension mimics human behavior and never stores your LinkedIn credentials. We use official LinkedIn OAuth for API access and prioritize your account safety.",
  },
  {
    question: "Can I cancel my subscription anytime?",
    answer: "Absolutely. You can cancel your subscription at any time from your billing settings. No questions asked.",
  },
  {
    question: "How does AI content generation work?",
    answer: "Our AI analyzes your profile, industry, Writing DNA, and preferences to generate personalized content that matches your voice and goals.",
  },
];

const SUPPORT_EMAIL = "contactlinkedbot@gmail.com";

const HelpCenter = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFaqs = searchQuery.trim()
    ? faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
          faq.answer.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : faqs;

  const copyEmail = () => {
    navigator.clipboard.writeText(SUPPORT_EMAIL);
    toast.success("Email copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-24 pb-16">
        <div className="container px-4 max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-2">Help & Support</h1>
          <p className="text-lg text-muted-foreground mb-2">Need assistance? We're here to help.</p>
          <p className="text-muted-foreground mb-8">
            If you're experiencing issues or have questions about LinkedBot, browse our FAQs or contact our support team.
          </p>

          <div className="relative mb-12">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              className="pl-12 h-14 text-lg"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <h2 className="text-2xl font-semibold mb-6">Frequently Asked Questions</h2>
          <div className="space-y-4 mb-12">
            {filteredFaqs.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No matching questions found. Try a different search or contact support below.</p>
            ) : (
              filteredFaqs.map((faq, index) => (
                <details
                  key={index}
                  className="p-6 rounded-2xl bg-card border border-border group"
                >
                  <summary className="font-semibold cursor-pointer flex items-center gap-3">
                    <FileQuestion className="w-5 h-5 text-primary flex-shrink-0" />
                    {faq.question}
                  </summary>
                  <p className="mt-4 text-muted-foreground pl-8">{faq.answer}</p>
                </details>
              ))
            )}
          </div>

          <h2 className="text-2xl font-semibold mb-6">Still need help?</h2>
          <p className="text-muted-foreground mb-6">Reach out to our support team and we'll get back to you as soon as possible.</p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <Mail className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Email Support</h3>
              <p className="text-muted-foreground mb-4">📧 {SUPPORT_EMAIL}</p>
              <div className="flex gap-2 justify-center">
                <Button variant="outline" size="sm" onClick={copyEmail} className="gap-2">
                  <Copy className="w-4 h-4" />
                  Copy Email
                </Button>
                <Button size="sm" asChild className="gap-2">
                  <a href={`mailto:${SUPPORT_EMAIL}`}>
                    <ExternalLink className="w-4 h-4" />
                    Send Email
                  </a>
                </Button>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-card border border-border text-center">
              <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">Live Chat</h3>
              <p className="text-muted-foreground">Chat with our support team in real-time during business hours.</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default HelpCenter;
