import { API_BASE_URL } from "./config";

const normalizeBaseUrl = (value?: string): string | undefined => {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.replace(/\/+$/, "");
};

const getBaseUrl = (): string => {
  const explicitBaseUrl = normalizeBaseUrl(API_BASE_URL);
  if (explicitBaseUrl) {
    return explicitBaseUrl.replace(/\/api$/, "");
  }

  if (typeof window !== "undefined" && window.location?.origin) {
    return normalizeBaseUrl(window.location.origin) as string;
  }

  return process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000";
};

const baseURL = `${getBaseUrl()}/api`;

type QueryValue = string | number | boolean | undefined | null;
type RequestOptions = {
  params?: Record<string, QueryValue>;
  headers?: HeadersInit;
  cache?: RequestCache;
};

function buildUrl(path: string, params?: Record<string, QueryValue>) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseURL}${normalizedPath}`);

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

async function request<T>(
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
  path: string,
  options: RequestOptions & { body?: unknown } = {},
): Promise<T> {
  const response = await fetch(buildUrl(path, options.params), {
    method,
    credentials: "include",
    cache: options.cache ?? "no-store",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (!response.ok) {
    let message = `Request error ${response.status}`;
    try {
      const payload = (await response.json()) as { error?: string };
      if (payload.error) {
        message = payload.error;
      }
    } catch {
      // keep default message
    }
    throw new Error(message);
  }

  if (response.status === 204) {
    return null as T;
  }

  return (await response.json()) as T;
}

export const api = {
  defaults: {
    baseURL,
  },
  get<T>(path: string, options?: RequestOptions) {
    return request<T>("GET", path, options);
  },
  post<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("POST", path, { ...options, body });
  },
  put<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("PUT", path, { ...options, body });
  },
  patch<T>(path: string, body?: unknown, options?: RequestOptions) {
    return request<T>("PATCH", path, { ...options, body });
  },
  delete<T>(path: string, options?: RequestOptions) {
    return request<T>("DELETE", path, options);
  },
};
