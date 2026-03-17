import { useEffect } from "react";

interface SEOHeadProps {
  title: string;
  description: string;
  canonical?: string;
  ogImage?: string;
}

/**
 * Sets document <title>, meta description, canonical, and OG tags per page.
 * Call once at the top of each public page component.
 */
const SEOHead = ({ title, description, canonical, ogImage }: SEOHeadProps) => {
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
    setMeta("og:title", title, "property");
    setMeta("og:description", description, "property");
    if (ogImage) setMeta("og:image", ogImage, "property");
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

    return () => {
      // Reset on unmount
      document.title = `${base} – AI LinkedIn Automation`;
    };
  }, [title, description, canonical, ogImage]);

  return null;
};

export default SEOHead;
