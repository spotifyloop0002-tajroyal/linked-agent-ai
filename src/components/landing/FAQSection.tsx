import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "What is LinkedBot and how does it work?",
    a: "LinkedBot is an AI-powered LinkedIn automation tool that creates, schedules, and publishes engaging LinkedIn posts on your behalf. Simply connect your LinkedIn account, tell our AI agent what topics you want to post about, and it handles the rest — from content creation to optimal-time publishing.",
  },
  {
    q: "Is LinkedBot safe to use with my LinkedIn account?",
    a: "Yes. LinkedBot uses the official LinkedIn API for posting, which means your account stays fully compliant with LinkedIn's terms of service. We never store your LinkedIn password, and all connections are secured via OAuth 2.0.",
  },
  {
    q: "Can LinkedBot write posts in my own voice and style?",
    a: "Absolutely. LinkedBot analyzes your existing LinkedIn content to learn your writing DNA — tone, vocabulary, emoji usage, and formatting preferences. Every post it generates matches your unique personal brand voice.",
  },
  {
    q: "How much time can I save using LinkedBot?",
    a: "Most users save 10+ hours per week on LinkedIn content creation. LinkedBot handles research, writing, image generation, and scheduling — so you can focus on running your business while still maintaining a consistent LinkedIn presence.",
  },
  {
    q: "Does LinkedBot support scheduling posts in advance?",
    a: "Yes. LinkedBot includes a smart scheduling system that analyzes the best times to post based on your industry and audience timezone. You can schedule individual posts or run entire automated campaigns.",
  },
  {
    q: "What kind of content can LinkedBot create?",
    a: "LinkedBot generates a variety of LinkedIn content formats including thought leadership posts, industry insights, storytelling posts, listicles, how-to guides, and engagement-driving questions. You can also generate AI images to accompany your posts.",
  },
  {
    q: "Is there a free plan available?",
    a: "Yes! LinkedBot offers a free trial so you can experience the platform before committing. Our paid plans start at affordable prices with features like unlimited AI post generation, smart scheduling, and analytics.",
  },
  {
    q: "How is LinkedBot different from other LinkedIn tools?",
    a: "Unlike basic schedulers, LinkedBot is an end-to-end AI content engine. It researches trending topics, generates posts matching your voice, creates images, schedules at optimal times, and tracks performance analytics — all from one platform.",
  },
];

export const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: faq.a,
    },
  })),
};

const FAQSection = () => {
  return (
    <section className="py-20" id="faq">
      <div className="container px-4 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <span className="text-primary font-semibold text-sm uppercase tracking-wider">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-bold mt-3 mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground">
            Everything you need to know about LinkedBot and LinkedIn automation.
          </p>
        </div>

        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((faq, i) => (
            <AccordionItem
              key={i}
              value={`faq-${i}`}
              className="rounded-xl border border-border bg-card px-5 shadow-sm"
            >
              <AccordionTrigger className="text-left font-semibold text-base hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQSection;
