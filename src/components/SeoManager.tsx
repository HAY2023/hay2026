import { useEffect } from "react";
import { useLocation } from "react-router-dom";

type SeoEntry = {
  title: string;
  description: string;
  robots: string;
};

const DEFAULT_SEO: SeoEntry = {
  title: "Quiz AI Algeria | AI Exams for Algerian Curriculum",
  description: "Quiz AI is an educational platform that generates Arabic quizzes and exams based on Algerian curriculum standards.",
  robots: "index,follow",
};

const PRIVATE_ROBOTS = "noindex,nofollow";
const ENV_SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/+$/, "");

const getSeoForPath = (pathname: string): SeoEntry => {
  if (pathname === "/") return DEFAULT_SEO;

  if (pathname.startsWith("/curriculum")) {
    return {
      title: "Algerian Curriculum | Quiz AI",
      description: "Explore Algerian school levels and subjects with AI-generated quizzes and exams for each stage.",
      robots: "index,follow",
    };
  }

  if (pathname.startsWith("/library")) {
    return {
      title: "Books and Summaries Library | Quiz AI",
      description: "Educational library for books and study summaries aligned with Algerian curriculum.",
      robots: "index,follow",
    };
  }

  if (pathname.startsWith("/pro-exam")) {
    return {
      title: "PRO AI Exam Generator | Quiz AI",
      description: "Generate full exams in Algerian exam style with smart AI correction.",
      robots: "index,follow",
    };
  }

  if (
    pathname.startsWith("/auth") ||
    pathname.startsWith("/pending") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/support")
  ) {
    return {
      title: "User Workspace | Quiz AI",
      description: "Private user workspace page.",
      robots: PRIVATE_ROBOTS,
    };
  }

  return {
    title: "Quiz AI",
    description: DEFAULT_SEO.description,
    robots: PRIVATE_ROBOTS,
  };
};

const setMetaTag = (name: string, content: string) => {
  let tag = document.querySelector(`meta[name="${name}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const setPropertyTag = (property: string, content: string) => {
  let tag = document.querySelector(`meta[property="${property}"]`);
  if (!tag) {
    tag = document.createElement("meta");
    tag.setAttribute("property", property);
    document.head.appendChild(tag);
  }
  tag.setAttribute("content", content);
};

const setCanonical = (url: string) => {
  let tag = document.querySelector('link[rel="canonical"]');
  if (!tag) {
    tag = document.createElement("link");
    tag.setAttribute("rel", "canonical");
    document.head.appendChild(tag);
  }
  tag.setAttribute("href", url);
};

const SeoManager = () => {
  const location = useLocation();

  useEffect(() => {
    const pathname = location.pathname || "/";
    const seo = getSeoForPath(pathname);
    const baseUrl = ENV_SITE_URL || window.location.origin.replace(/\/+$/, "");
    const canonicalUrl = `${baseUrl}${pathname === "/" ? "/" : pathname}`;

    document.documentElement.lang = "ar-DZ";
    document.documentElement.dir = "rtl";

    document.title = seo.title;

    setMetaTag("description", seo.description);
    setMetaTag("robots", seo.robots);
    setMetaTag("twitter:card", "summary_large_image");
    setMetaTag("twitter:title", seo.title);
    setMetaTag("twitter:description", seo.description);

    setPropertyTag("og:title", seo.title);
    setPropertyTag("og:description", seo.description);
    setPropertyTag("og:type", "website");
    setPropertyTag("og:url", canonicalUrl);
    setPropertyTag("og:locale", "ar_DZ");

    setCanonical(canonicalUrl);
  }, [location.pathname]);

  return null;
};

export default SeoManager;
