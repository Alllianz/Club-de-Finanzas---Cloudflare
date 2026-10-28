"use client";

import { useEffect, useMemo, useState } from "react";
import { getDomain, isImageUrl } from "../article-utils";

type Props = {
  url: string;
};

export function LinkPreview({ url }: Props) {
  const domain = useMemo(() => getDomain(url), [url]);
  const imageLike = useMemo(() => isImageUrl(url), [url]);
  const faviconUrl = useMemo(() => {
    if (domain === "link invalido") return "";
    return `https://www.google.com/s2/favicons?sz=128&domain_url=${domain}`;
  }, [domain]);

  const [imageFailed, setImageFailed] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);
  const [metaImage, setMetaImage] = useState<string | null>(null);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaLoading, setMetaLoading] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setFaviconFailed(false);
    setMetaImage(null);
    setMetaTitle("");

    if (!url || domain === "link invalido" || imageLike) return;

    const controller = new AbortController();
    setMetaLoading(true);

    void fetch(`/api/link-preview?url=${encodeURIComponent(url)}`, {
      signal: controller.signal,
      cache: "no-store",
    })
      .then(async (response) => {
        if (!response.ok) return null;
        return (await response.json()) as { image?: string; title?: string };
      })
      .then((data) => {
        if (!data) return;
        setMetaImage(data.image ?? null);
        setMetaTitle(data.title ?? "");
      })
      .catch(() => null)
      .finally(() => setMetaLoading(false));

    return () => controller.abort();
  }, [url, domain, imageLike]);

  return (
    <div className="mt-3 rounded-xl border border-white/12 bg-black/30 p-3">
      <p className="text-[11px] uppercase tracking-[0.16em] text-white/45">Preview de enlace</p>
      <div className="mt-2 flex items-center gap-3">
        {imageLike && !imageFailed ? (
          <img
            src={url}
            alt="Preview"
            className="h-10 w-10 rounded-md border border-white/15 object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImageFailed(true)}
          />
        ) : metaImage ? (
          <img
            src={metaImage}
            alt={metaTitle || domain}
            className="h-10 w-10 rounded-md border border-white/15 object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setMetaImage(null)}
          />
        ) : faviconUrl && !faviconFailed ? (
          <img
            src={faviconUrl}
            alt={domain}
            className="h-10 w-10 rounded-md border border-white/15 bg-white object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setFaviconFailed(true)}
          />
        ) : (
          <div className="grid h-10 w-10 place-items-center rounded-md border border-white/15 bg-white/10 text-xs text-white/70">
            {domain === "link invalido" ? "--" : domain.slice(0, 2).toUpperCase()}
          </div>
        )}

        <div className="min-w-0">
          <p className="truncate text-sm text-white">
            {metaLoading ? "Cargando preview..." : metaTitle || domain}
          </p>
          <p className="truncate text-xs text-white/55">{url}</p>
        </div>
      </div>
    </div>
  );
}
