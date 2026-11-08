import type { Metadata } from "next";
import { siteOrigin } from "@/lib/config";

export const SITE_NAME = "Night Crew";
export const SITE_DESCRIPTION = "Holders sign to vote for a feature. At 22:00 UTC the crew builds the winner, tests it and ships it as a new floor of a public tower, with a receipt on Base.";
export const SOCIAL_IMAGE = {
  path: "/social/card.png",
  width: 1200,
  height: 630,
  alt: "Night Crew: AI dev crew that token holders command. Holders vote for a feature, and every night at 22:00 UTC the crew builds, checks and ships it as a new floor.",
} as const;

/** An absolute URL on this site, built from NEXT_PUBLIC_SITE_ORIGIN. */
export function absoluteUrl(path: string): string {
  return new URL(path, siteOrigin()).toString();
}

/** One route's title, description, canonical URL, Open Graph tags and Twitter card. Every URL is absolute. */
export function pageMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const url = absoluteUrl(path);
  const image = { url: absoluteUrl(SOCIAL_IMAGE.path), width: SOCIAL_IMAGE.width, height: SOCIAL_IMAGE.height, alt: SOCIAL_IMAGE.alt, type: "image/png" };
  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url, title, description, images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [{ url: image.url, alt: image.alt }] },
  };
}
