// Websites from the input and businesses from a dataset (for example of the Google Maps Scraper).

// "example.com", "www.example.com/page", "http://example.com" → a URL to start from.
export function normalizeWebsite(value) {
  let text = String(value ?? '').trim();
  if (!text) return null;
  if (!/^https?:\/\//i.test(text)) text = `https://${text.replace(/^\/+/, '')}`;
  try {
    const url = new URL(text);
    if (!url.hostname.includes('.')) return null;
    url.hash = '';
    return url;
  } catch {
    return null;
  }
}

// A business from a Google Maps Scraper (or any) dataset: its website and what to carry over.
export function fromDatasetItem(item) {
  const isMapsUrl = (u) => /google\.[a-z.]+\/maps|maps\.app\.goo\.gl|goo\.gl\/maps/i.test(String(u ?? ''));
  const website = item.website ?? item.websiteUrl ?? item.domain ?? (!isMapsUrl(item.url) ? item.url : null) ?? null;
  return {
    website,
    lead: {
      businessName: item.title ?? item.name ?? item.businessName ?? null,
      category: item.categoryName ?? item.category ?? (Array.isArray(item.categories) ? item.categories[0] : null) ?? null,
      address: item.address ?? null,
      city: item.city ?? null,
      phone: item.phone ?? item.phoneUnformatted ?? null,
      rating: item.totalScore ?? item.rating ?? null,
      reviewsCount: item.reviewsCount ?? null,
      mapsUrl: isMapsUrl(item.url) ? item.url : null,
      placeId: item.placeId ?? null,
    },
  };
}

