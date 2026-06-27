/**
 * Normalize remote image URLs to request smaller, format-optimized variants.
 * Reduces payload massively for Unsplash, Wikimedia Commons and similar CDNs
 * without touching the image source itself.
 */
export function cdnImage(url: string | undefined | null, width = 600): string {
  if (!url || typeof url !== "string") return url || "";
  try {
    // Unsplash — supports w/q/auto via query string.
    if (url.includes("images.unsplash.com")) {
      const u = new URL(url);
      u.searchParams.set("w", String(width));
      u.searchParams.set("q", "70");
      u.searchParams.set("auto", "format");
      u.searchParams.set("fit", "crop");
      return u.toString();
    }
    // Wikimedia Commons "Special:FilePath" supports ?width=
    if (url.includes("commons.wikimedia.org") && url.includes("Special:FilePath")) {
      const u = new URL(url);
      u.searchParams.set("width", String(width));
      return u.toString();
    }
    // Wikipedia thumbnails: keep as is (already sized).
    return url;
  } catch {
    return url;
  }
}
