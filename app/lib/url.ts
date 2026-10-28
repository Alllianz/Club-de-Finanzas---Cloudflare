export function getDomainFromUrl(value: string, fallback = "") {
  try {
    const url = new URL(value);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return fallback;
  }
}

export function isHttpUrl(value: URL) {
  return value.protocol === "http:" || value.protocol === "https:";
}
