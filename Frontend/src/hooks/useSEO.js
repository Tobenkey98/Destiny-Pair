import { useEffect } from "react";

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function setLink(href) {
  let el = document.head.querySelector('link[rel="canonical"]');
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Lightweight per-page SEO: title, meta description, canonical and
 * Open Graph tags. Cleans up after itself on unmount.
 */
export function useSEO({ title, description, canonical = null, og = {} }) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const prevDesc = document.head.querySelector('meta[name="description"]')?.getAttribute("content") || "";
    const prevCanonical = document.head.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";

    const descriptionTag = document.head.querySelector('meta[name="description"]');
    if (description) {
      setMeta("name", "description", description);
      setMeta("property", "og:description", description);
    }
    setMeta("property", "og:title", title);
    setMeta("property", "og:type", "website");
    if (og.image) setMeta("property", "og:image", og.image);
    if (canonical) setLink(canonical);

    return () => {
      document.title = prevTitle;
      if (prevDesc) {
        const el = document.head.querySelector('meta[name="description"]');
        if (el) el.setAttribute("content", prevDesc);
      }
      if (prevCanonical) setLink(prevCanonical);
    };
  }, [title, description, canonical, og.image]);
}
