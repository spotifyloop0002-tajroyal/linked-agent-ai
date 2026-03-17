import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  keywords?: string;
}

/**
 * Sets document <title>, meta description, canonical, OG tags, keywords, and JSON-LD per page.
 */
const SEOHead = ({ title, description, canonical, ogImage, jsonLd, keywords }: SEOHeadProps) => {
  useEffect(() => {
    const base = "LinkedBot";
    document.title = title ? `${title} | ${base}` : `${base} – AI LinkedIn Automation`;

    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    setMeta("description", description);
    if (keywords) setMeta("keywords", keywords);
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    if (ogImage) setMeta("og:image", ogImage, "property");
    if (canonical) setMeta("og:url", canonical, "property");
    setMeta("twitter:title", title, "name");
    setMeta("twitter:description", description, "name");

    // Canonical
    if (canonical) {
      let link = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
      if (!link) {
        link = document.createElement("link");
        link.setAttribute("rel", "canonical");
        document.head.appendChild(link);
      }
      link.setAttribute("href", canonical);
    }

    // JSON-LD structured data
    const existingScripts = document.querySelectorAll('script[data-seo-jsonld]');
    existingScripts.forEach((s) => s.remove());

    if (jsonLd) {
      const items = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      items.forEach((item) => {
        const script = document.createElement("script");
        script.type = "application/ld+json";
        script.setAttribute("data-seo-jsonld", "true");
        script.textContent = JSON.stringify(item);
        document.head.appendChild(script);
      });
    }

    return () => {
      document.title = `${base} – AI LinkedIn Automation`;
      const ldScripts = document.querySelectorAll('script[data-seo-jsonld]');
      ldScripts.forEach((s) => s.remove());
    };
  }, [title, description, canonical, ogImage, jsonLd, keywords]);

  return null;
};

export default SEOHead;
