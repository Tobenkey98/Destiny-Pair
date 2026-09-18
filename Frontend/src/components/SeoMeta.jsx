import { useEffect, useState } from "react";
import { api } from "../lib/api";

/**
 * Reads the live SEO settings (edited in the admin SEO page) and applies them
 * to <head>: title, meta description/keywords/robots/verification, Open Graph
 * tags, canonical URL, and injects the Google Analytics script when an ID is
 * configured. Mounted once at the app root.
 */
export default function SeoMeta() {
  const [seo, setSeo] = useState(null);

  useEffect(() => {
    let alive = true;
    api.publicSeo()
      .then((data) => { if (alive) setSeo(data || {}); })
      .catch(() => {});
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!seo) return;
    const existing = ["meta[name='description']", "meta[name='keywords']", "meta[name='robots']", "meta[name='google-site-verification']", "link[rel='canonical']", "meta[property^='og:']", "meta[name^='twitter:']"];
    for (const sel of existing) {
      document.querySelectorAll(sel).forEach((el) => el.remove());
    }

    const setMeta = (attr, name, content) => {
      if (!content) return;
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, name);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const title = seo.site_title || "Destiny Pair";
    document.title = title;
    setMeta("name", "description", seo.description);
    setMeta("name", "keywords", seo.keywords);
    setMeta("name", "robots", seo.robots || "index, follow");
    setMeta("name", "google-site-verification", seo.google_site_verification);
    setMeta("property", "og:site_name", title);
    setMeta("property", "og:title", seo.og_title || title);
    setMeta("property", "og:description", seo.og_description || seo.description);
    setMeta("property", "og:type", "website");
    setMeta("property", "og:url", seo.canonical_url || window.location.href);
    if (seo.og_image) setMeta("property", "og:image", seo.og_image);
    setMeta("name", "twitter:card", "summary_large_image");
    setMeta("name", "twitter:title", seo.og_title || title);
    setMeta("name", "twitter:description", seo.og_description || seo.description);
    if (seo.og_image) setMeta("name", "twitter:image", seo.og_image);

    if (seo.canonical_url) {
      let link = document.querySelector("link[rel='canonical']");
      if (!link) {
        link = document.createElement("link");
        link.rel = "canonical";
        document.head.appendChild(link);
      }
      link.href = seo.canonical_url;
    }
  }, [seo]);

  useEffect(() => {
    if (!seo?.google_analytics_id) return;
    const id = seo.google_analytics_id;
    if (document.getElementById("ga-script") || !/^G-|UA-/.test(id || "")) return;
    const s = document.createElement("script");
    s.id = "ga-script";
    s.async = true;
    s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { window.dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag("js", new Date());
    gtag("config", id);
  }, [seo]);

  return null;
}