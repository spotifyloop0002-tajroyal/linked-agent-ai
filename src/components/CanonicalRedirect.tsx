import { useEffect } from "react";

/**
 * Redirects non-www to www.linkedbot.online in production.
 * Also ensures https. This runs client-side as a fallback;
 * server-level redirects (Netlify/Vercel) handle crawlers.
 */
const CanonicalRedirect = () => {
  useEffect(() => {
    const { hostname, protocol, pathname, search, hash } = window.location;
    
    // Only redirect on the production domain
    if (hostname === "linkedbot.online") {
      const newUrl = `https://www.linkedbot.online${pathname}${search}${hash}`;
      window.location.replace(newUrl);
    }
    
    // Also redirect http to https on www
    if (hostname === "www.linkedbot.online" && protocol === "http:") {
      const newUrl = `https://www.linkedbot.online${pathname}${search}${hash}`;
      window.location.replace(newUrl);
    }
  }, []);

  return null;
};

export default CanonicalRedirect;
