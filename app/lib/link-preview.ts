import { getDomainFromUrl } from "./url";

const DEFAULT_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

export type LinkPreview = {
  domain: string;
  title: string;
  description: string;
  image: string;
};

type CacheEntry = {
  expiresAt: number;
  payload: LinkPreview;
};

export type LinkPreviewCache = {
  get(key: string): CacheEntry | undefined;
  set(key: string, value: CacheEntry): void;
};

export type LinkPreviewService = {
  resolve(url: string): Promise<LinkPreview>;
};

export function createLinkPreviewService(params?: {
  ttlMs?: number;
  cache?: LinkPreviewCache;
  userAgent?: string;
}): LinkPreviewService {
  const ttlMs = params?.ttlMs ?? 1000 * 60 * 30;
  const cache = params?.cache ?? new Map<string, CacheEntry>();
  const userAgent = params?.userAgent ?? DEFAULT_USER_AGENT;

  return {
    async resolve(url: string) {
      const domain = getDomainFromUrl(url, "");
      const cached = cache.get(url);

      if (cached && cached.expiresAt > Date.now()) {
        return cached.payload;
      }

      try {
        const response = await fetch(url, {
          headers: { "user-agent": userAgent },
          redirect: "follow",
          cache: "no-store",
        });

        if (!response.ok) {
          return { domain, title: "", description: "", image: "" };
        }

        const html = await response.text();
        const slice = html.slice(0, 400_000);
        const payload: LinkPreview = {
          domain,
          title:
            extractMeta(slice, ["og:title", "twitter:title"]) ||
            (slice.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ""),
          description: extractMeta(slice, ["og:description", "twitter:description"]),
          image: extractMeta(slice, ["og:image", "twitter:image", "twitter:image:src"]),
        };

        cache.set(url, { expiresAt: Date.now() + ttlMs, payload });
        return payload;
      } catch {
        return { domain, title: "", description: "", image: "" };
      }
    },
  };
}

function extractMeta(html: string, keys: string[]) {
  for (const key of keys) {
    const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(
      `<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']+)["']`,
      "i",
    );
    const match = html.match(regex);
    if (match?.[1]) {
      return match[1].trim();
    }
  }
  return "";
}
